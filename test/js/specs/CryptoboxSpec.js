/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

describe('cryptobox.Cryptobox', function() {

  var cryptobox = undefined;
  var Proteus = undefined;

  var box = undefined;
  var store = undefined;

  beforeAll(function(done) {
    if (typeof window === 'object') {
      cryptobox = window.cryptobox;
      Proteus = window.Proteus;
      bazinga64 = window.bazinga64;
      done();
    } else {
      bazinga64 = require('bazinga64');
      cryptobox = require('../../../dist/commonjs/wire-webapp-cryptobox').default;
      Proteus = require('wire-webapp-proteus');
      done();
    }
  });

  beforeEach(function() {
    store = new cryptobox.store.Cache();
  });

  describe('init', function() {
    it('initializes a Cryptobox with a given identity', function(done) {
      var initialIdentity = Proteus.keys.IdentityKeyPair.new();
      var initialFingerPrint = initialIdentity.public_key.fingerprint();

      store.save_identity(initialIdentity).then(function() {
        var box = new cryptobox.Cryptobox(store);
        expect(box.identity).not.toBeDefined();
        box.init().then(function() {
          expect(box.identity.public_key.fingerprint()).toBe(initialFingerPrint);
          done();
        }).catch(done.fail);
      }).catch(done.fail);
    });

    it('creates a new identity (if none is given) plus the last resort PreKey and saves these', function(done) {
      var box = new cryptobox.Cryptobox(store);
      expect(box.identity).not.toBeDefined();
      box.init().then(function() {
        expect(box.identity).toBeDefined();
        return store.load_identity();
      }).then(function(identity) {
        expect(identity.public_key.fingerprint()).toBeDefined();
        return store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID);
      }).then(function(preKey) {
        expect(preKey.key_id).toBe(Proteus.keys.PreKey.MAX_PREKEY_ID);
        done();
      }).catch(done.fail);
    });

    it('returns the current version', function() {
      expect(cryptobox.version).toBeDefined();
    });
  });

  describe('Sessions', function() {

    var box = undefined;
    var sessionId = 'unique_identifier';

    beforeEach(function(done) {
      box = new cryptobox.Cryptobox(store);
      box.init().then(function() {
        var bob = {
          identity: Proteus.keys.IdentityKeyPair.new(),
          prekey: Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID)
        };
        bob.bundle = Proteus.keys.PreKeyBundle.new(bob.identity.public_key, bob.prekey);

        return Proteus.session.Session.init_from_prekey(box.identity, bob.bundle);
      }).then(function(session) {
        var cryptoBoxSession = new cryptobox.CryptoboxSession(sessionId, box.pk_store, session);
        return box.session_save(cryptoBoxSession);
      }).then(function() {
        done();
      }).catch(done.fail);
    });

    describe('session_load', function() {
      it('it loads a session from the cache', function(done) {
        spyOn(box.store, 'load_session').and.callThrough();
        box.session_load(sessionId).then(function(session) {
          expect(session.id).toBe(sessionId);
          expect(box.store.load_session.calls.count()).toBe(0);
          return box.session_load(sessionId);
        }).then(function(session) {
          expect(session.id).toBe(sessionId);
          expect(box.store.load_session.calls.count()).toBe(0);
          done();
        }).catch(done.fail);
      });
    });

    describe('encrypt', function() {
      it('saves the session after successful encryption', function(done) {
        spyOn(box.store, 'save_session').and.callThrough();
        box.encrypt(sessionId, 'Hello World.').then(function(encryptedBuffer) {
          expect(encryptedBuffer).toBeDefined();
          expect(box.store.save_session.calls.count()).toBe(1);
          done();
        }).catch(done.fail);
      });

      xit('works with session IDs', function(done) {
      });

      xit('works with session objects', function(done) {
      });
    });

  });

});
