// TODO: move this to a utility function
// Check that all required args are present and not null
// required is an arry of required keys for args
// args is an object
module.exports = {
  checkRequiredArgs: function (required,args) {
    let missing = [];
    for ( let key of required ) {
      if ( !args[key] ) missing.push(key);
    }
    return missing;
  }
};