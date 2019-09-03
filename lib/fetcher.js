const request = require('request');
const _ = require('lodash');
const jsonfile = require('jsonfile');
const co = require('co');
const fs = require('fs');
const path = require('path');
const async = require('async');
const http = require('http');
const https = require('https');
const url = require('url');

const config = require('../config/config');
const utils = require('./utils');
let buffer = [];

function fetchSinglePage(args, cb) {
  // TODO - check that all required arguments are present in the args
  // const missingArgs = utils.checkRequiredArgs(['contactId', 'tags'], args);
  // if(missingArgs.length > 0) {
  //   return cb(new Error(`fetch: Missing arguments: ${missingArgs}`));
  // }
  const protocol = config[args.brand] ? config[args.brand].protocol
    : config.default.protocol;
  const hostname = config[args.brand] ? config[args.brand].hostname
    : config.default.hostname;
  const username = config[args.brand] ? config[args.brand].username
    : config.default.username;
  const authToken = config[args.brand] ? config[args.brand].authToken
    : config.default.authToken;
  const path = args.path || config.paths.conversations;
  const page = args.page || 1;
  const url = `${protocol}${username}:${authToken}@${hostname}${path}`;

  const reqOpts = {
    url,
    method : 'GET',
    qs:{
      page,
    },
    headers: {
      'Accept': 'application/json',
    },
  };
  return new Promise(function(resolve, reject) {
    request(reqOpts, (err, response, body) => {
      if(err) {
        if(cb) return cb(err);
        return reject(err);
      }
      let data=[];
      if(response.statusCode != 200) {
        if(cb) return cb(new Error(`Expected http status 200, got ${response.statusCode} - ${response.statusMessage}`));
        return reject(new Error(`Expected http status 200, got ${response.statusCode} - ${response.statusMessage}`));
      }
      try {
        const result = JSON.parse(body);
        if(cb) return cb(null, {page, result});
        return resolve({page, result});
      } catch(err) {
        if(cb) return cb(err);
        return reject(err);
      }
    });
  });
}

function fetchAllPages(args1, cb) {
  // TODO - check that all required arguments are present in the args
  let args2 = args1;
  return new Promise(function(resolve, reject) {
    return fetchSinglePage(args2).then( (results) => {
      return co(function*(){
        let res = results.result;
        console.log(`Page ${args1.page}/${res.page_count || '?'}`);
        let args3 = args2;
        args3.count += res[args3.type].length
        if(args3.count != res.total_count && args3.page < res.page_count) {
          args3.page = results.page + 1;
          
          // res.page=results.page;
          res = _.merge({}, {page:results.page},res);
          buffer.push(res)
          if(cb) return fetchAllPages(args3,cb)
          return resolve(fetchAllPages(args3));
        }else{
          // res.page=results.page;
          res = _.merge({}, {page:results.page},res);
          buffer.push(res)
          yield writeFile(args3.type, buffer);
          if(cb) return cb(null, buffer);
          return resolve({type:args3.type,buffer});
        }
      }());
    }).catch(err=>{
      console.log(err);
      if(cb) return cb(err);
      return reject(err);
    });
  });
}

function writeFile(type , object) {
  return new Promise(function(resolve, reject){
    const file = `.${path.sep}out${path.sep}${type}-${new Date().toISOString().replace(/T/, '_').replace(/\:/g, '').replace(/\..+/, '')}.json`;
    jsonfile.writeFile(file, {object}, {spaces: 2}, function(err) {
      if(err) {
        console.error(err);
        reject(err);
      }
      console.log(`Done! saving ${type} file on: `, file,'\n');
      return resolve();
    });
  });
}

function downloadAttachments(){
  return new Promise(function(resolve,reject) {
    // Return only base file name without dir
    function getMostRecentFileName(dir) {
      const files = _.filter(fs.readdirSync(dir), f => {
        return f.includes('messages');
      });
      return _.maxBy(files, (f) => {
        const fullpath = path.join(dir, f);
        return fs.statSync(fullpath).ctime;
      });
    }
    const recent = getMostRecentFileName('./out/');
    fs.readFile(`./out/${recent}`,'utf8', function(err, data) {
      if (err) return reject(err);
      data = JSON.parse(data);
      data = _.uniq(_.map(_.reduce(_.map(data.object, d => {
        return _.reduce(_.map(d.messages, m => {
          return m.attachments;
        }), function(flattened, other) {
          return flattened.concat(other);
        }, []);
      }), function(flattened, other) {
        return flattened.concat(other);
      }, []), o=>{
        return o.url
      }));
      let counterStart = 0;
      let counterEnd = 0;
      async.eachLimit(data, 15, (myUrl, cb) => {
        const parsedUrl = url.parse(myUrl);
        const urlProtocol = parsedUrl.protocol;
        const protocol = urlProtocol == 'https:' ? https : http;
        const filepath = (`.${path.sep}out${path.sep}attachments${path.sep}` + parsedUrl.hostname + parsedUrl.pathname).replace(/\//g, path.sep);

        let justTheDir = filepath.split(path.sep);
        justTheDir.pop();
        justTheDir = justTheDir.join(path.sep);
        mkDirByPathSync(justTheDir);
        if (fs.existsSync(filepath)) {
          counterStart ++;
          counterEnd ++;
          console.log(`\tFile ${filepath} already exists!`);
          console.log(`\t${data.length-counterEnd} file(s) remaining\n`);
          return cb();
        }
        const file = fs.createWriteStream(filepath);
        console.log('\tBegin downloading ', myUrl);
        console.log(`\tBegin downloading ${++counterStart}/${data.length} files`);
        protocol.get(myUrl, function(response) {
          response.pipe(file);
          file.on('finish', function() {
            console.log('\tFinished downloading ', myUrl);
            console.log(`\tFinished downloading ${++counterEnd}/${data.length} files\n`);
            file.close(cb);
          });
        });
        function mkDirByPathSync(targetDir, {isRelativeToScript = false} = {}) {
          const sep = path.sep;
          const initDir = path.isAbsolute(targetDir) ? sep : '';
          const baseDir = isRelativeToScript ? __dirname : '.';
          
          targetDir.split(sep).reduce((parentDir, childDir) => {
            const curDir = path.resolve(baseDir, parentDir, childDir);
            try {
              fs.mkdirSync(curDir);
              // console.log(`Directory ${curDir} created!`);
            } catch (err) {
              if (err.code !== 'EEXIST') {
                throw err;
              }
              // console.log(`Directory ${curDir} already exists!`);
            }
        
            return curDir;
          }, initDir);
        }
        
      }, err => {
        if (err) {
          console.log(err);
          return reject(err);
        }
        return resolve({status:'ok', data, data_length:data.length});
      });
    });
  });
}

function fetch(args,cb) {
  return co(function*(){
    if( args.contactId )
    return fetchContacts(args,cb)
    else{
      buffer = [];
      let type = 'contacts';
      console.log('\nSaving: ', type);
      let test = yield fetchAllPages(_.merge({}, args, {
        type,
        count: 0,
        page: args.page && !isNaN(args.page)?args.page:1,
        path: `/api/v1/${type}`,
      }));

      buffer = [];
      type = 'articles';
      console.log('\nSaving: ', type);
      test = yield fetchAllPages(_.merge({}, args, {
        type,
        count: 0,
        page: args.page && !isNaN(args.page)?args.page:1,
        path: `/api/v1/${type}`,
      }));

      buffer = [];
      type = 'conversations';
      console.log('\nSaving: ', type);
      test = yield fetchAllPages(_.merge({}, args, {
        type,
        count: 0,
        page: args.page && !isNaN(args.page)?args.page:1,
        path: `/api/v1/${type}`,
      }));

      buffer = [];
      type = 'channels';
      console.log('\nSaving: ', type);
      test = yield fetchAllPages(_.merge({}, args, {
        type,
        count: 0,
        page: args.page && !isNaN(args.page)?args.page:1,
        path: `/api/v1/${type}`,
      }));

      buffer = [];
      type = 'messages';
      console.log('\nSaving: ', type);
      test = yield fetchAllPages(_.merge({}, args, {
        type,
        count: 0,
        page: args.page && !isNaN(args.page)?args.page:1,
        path: `/api/v1/${type}`,
      }));

      buffer = [];
      type = 'attachments';
      console.log('\nSaving: ', type);
      const downloads = yield downloadAttachments();
      if(downloads.status && downloads.status == 'ok') console.log( downloads.data_length, ' attachments saved!');
      else console.log('An error ocurred while downloading the files.')

      // buffer = [];
      // type = 'reports/volume';
      // console.log('\nSaving: ', type);
      // // test = yield fetchReport(_.merge({}, args, {
      // //   type,
      // //   count: 0,
      // //   page: args.page && !isNaN(args.page)?args.page:1,
      // //   path: `/api/v1/${type}`,
      // // }));

      // buffer = [];
      // type = 'reports/response_time';
      // console.log('\nSaving: ', type);
      // // test = yield fetchReport(_.merge({}, args, {
      // //   type,
      // //   count: 0,
      // //   page: args.page && !isNaN(args.page)?args.page:1,
      // //   path: `/api/v1/${type}`,
      // // }));

      // buffer = [];
      // type = 'reports/staff';
      // console.log('\nSaving: ', type);
      // // test = yield fetchReport(_.merge({}, args, {
      // //   type,
      // //   count: 0,
      // //   page: args.page && !isNaN(args.page)?args.page:1,
      // //   path: `/api/v1/${type}`,
      // // }));

      // buffer = [];
      // type = 'reports/tags';
      // console.log('\nSaving: ', type);
      // // test = yield fetchReport(_.merge({}, args, {
      // //   type,
      // //   count: 0,
      // //   page: args.page && !isNaN(args.page)?args.page:1,
      // //   path: `/api/v1/${type}`,
      // // }));
    }
  }).catch(err=>{
    console.log(err);
  });
}

module.exports = {
  fetch,
  downloadAttachments,
}