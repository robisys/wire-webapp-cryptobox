describe('cryptobox.store.Cache', () => {
  let cryptobox = undefined;
  let Proteus = undefined;
  let store = undefined;

  beforeAll((done) => {
    if (typeof window === 'object') {
      cryptobox = window.cryptobox;
      Proteus = window.Proteus;
      done();
    } else {
      cryptobox = require('../../dist/commonjs/wire-webapp-cryptobox');
      Proteus = require('wire-webapp-proteus');
      done();
    }
  });

  beforeEach(() => {
    store = new cryptobox.store.Cache();
  });

  describe('constructor', () => {
    it('creates an instance', () => {
      const store = new cryptobox.store.Cache();
      expect(store).toBeDefined();
    });
  });

  describe('save_identity', () => {
    it('saves the local identity', (done) => {
      const ikp = Proteus.keys.IdentityKeyPair.new();
      store.save_identity(ikp).then(identity => {
        expect(identity.public_key.fingerprint()).toEqual(ikp.public_key.fingerprint());
        done();
      }).catch(done.fail);
    });
  });
});
