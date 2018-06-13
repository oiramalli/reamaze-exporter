const _ = require('lodash');
const defaultConfig = require('./default');

let local;
try {
  local = require('./local');
} catch (e) {
  local = {};
}

const mergedConfig = _.merge({}, defaultConfig, local);
module.exports = mergedConfig;

