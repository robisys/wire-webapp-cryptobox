// Proteus
var Proteus = require('wire-webapp-proteus');
var lastResort = Proteus.keys.PreKey.MAX_PREKEY_ID;
var preKey = Proteus.keys.PreKey.new(lastResort);
var serializedPreKey = preKey.serialise();

// Cryptobox
var cryptobox = require('./commonjs/wire-webapp-cryptobox');
var store = new cryptobox.store.Cache();
var box = new cryptobox.Cryptobox(store);
box.init()
.then(function(instance) {
  var fingerprint = instance.identity.public_key.fingerprint();
  console.log('Public Fingerprint', fingerprint);
  return instance.new_prekey(65535);
})
.then(function(serialisedPreKeyBundle) {
  var buffer = new Buffer(serialisedPreKeyBundle, 'utf8');
  console.log('Last Resort PreKey', buffer.toString('hex'));
});
