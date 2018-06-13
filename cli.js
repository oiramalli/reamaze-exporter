// External dependencies
const program = require('commander');
const util = require('util');


// local dependencies
const pjson = require('./package.json');
const fetcher = require('./lib/fetcher');

main();

function bootstrap() {
  process.on('SIGTERM', () => {
    global.shutdown = true;
    console('SIGTERM received.  Shutting down...');
  });
}

function main() {
  bootstrap();
  program.version(pjson.version);
  program.command('collect')
  .description('Collect all data from reamaze eg. "collect --brand MyBrand')
  // .option('-i, --contact-id [id]', 'ID for contact to pull from - if none presented will retrieve all the contacts info')
  .option('-p, --page [number]', 'The page number to begin with')
  .option('-b, --brand [name]', 'Name for brand to retreive the info')
  .action( options => {
    console.log('Starting to collect data');
    const fetchArgs = {
      brand    : options.brand,
      page     : parseInt(options.page),
      // contactId: options.contactId,
    };

    fetcher.fetch(fetchArgs);
  });

  program.parse(process.argv);
}