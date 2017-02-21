var cryptobox = require('./commonjs/wire-webapp-cryptobox');
var Logdown = require('logdown');

var logger = new Logdown({prefix: 'Demo', alignOutput: true});
logger.log(`Testing Cryptobox v${cryptobox.Cryptobox.prototype.VERSION}`);

var store = new cryptobox.store.Cache();
var box = new cryptobox.Cryptobox(store, 5);

box.init()
  .then(function() {
    var fingerprint = box.identity.public_key.fingerprint();
    console.log('Public Fingerprint', fingerprint);
    process.exit(0);
  })
  .catch(function(error) {
    console.log('Self test broken: ' + error.message + ' (' + error.stack + ')');
    process.exit(1);
  });
