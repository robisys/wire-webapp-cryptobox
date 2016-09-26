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

  var bazinga64 = undefined;
  var cryptobox = undefined;
  var Proteus = undefined;

  var boxInstance = undefined;
  var store = undefined;

  beforeAll(function(done) {
    if (typeof window === 'object') {
      SystemJS.import('wire-webapp-cryptobox').then(function(module) {
        cryptobox = module;
        return SystemJS.import('wire-webapp-proteus');
      }).then(function(module) {
        Proteus = module;
        return SystemJS.import('bazinga64');
      }).then(function(module) {
        bazinga64 = module;
        done();
      });
    } else {
      bazinga64 = require('bazinga64');
      cryptobox = require('../../../dist/commonjs/wire-webapp-cryptobox');
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
        box.init().then(function(instance) {
          expect(instance.identity.public_key.fingerprint()).toBe(initialFingerPrint);
          done();
        });
      });
    });

    it('initializes a Cryptobox with a new identity (if none is given)', function(done) {
      var box = new cryptobox.Cryptobox(store);
      expect(box.identity).not.toBeDefined();
      box.init().then(function(instance) {
        expect(instance.identity).toBeDefined();
        done();
      });
    });
  });

  describe('Sessions', function() {

    var sessionId = 'unique_identifier';

    beforeEach(function(done) {
      var box = new cryptobox.Cryptobox(store);
      box.init().then(function(instance) {
        boxInstance = instance;

        var bob = {
          identity: Proteus.keys.IdentityKeyPair.new(),
          prekey: Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID)
        };
        bob.bundle = Proteus.keys.PreKeyBundle.new(bob.identity.public_key, bob.prekey);

        return Proteus.session.Session.init_from_prekey(instance.identity, bob.bundle);
      }).then(function(session) {
        var cryptoBoxSession = new cryptobox.CryptoboxSession(sessionId, boxInstance.pk_store, session);
        return boxInstance.session_save(cryptoBoxSession);
      }).then(function() {
        done();
      });
    });

    describe('session_load', function() {
      it('it loads a session from the storage only once (then loads it from memory)', function(done) {
        spyOn(boxInstance.store, 'load_session').and.callThrough();
        boxInstance.session_load(sessionId).then(function(session) {
          expect(session.id).toBe(sessionId);
          expect(boxInstance.store.load_session.calls.count()).toBe(1);
          return boxInstance.session_load(sessionId);
        }).then(function(session) {
          expect(session.id).toBe(sessionId);
          expect(boxInstance.store.load_session.calls.count()).toBe(1);
          done();
        }).catch(done.fail);
      });
    });

    describe('encrypt', function() {
      it('saves the session after successful encryption', function(done) {
        spyOn(boxInstance.store, 'save_session').and.callThrough();
        boxInstance.encrypt(sessionId, 'Hello World.').then(function(encryptedBuffer) {
          expect(encryptedBuffer).toBeDefined();
          expect(boxInstance.store.save_session.calls.count()).toBe(1);
          done();
        });
      });

      xit('works with session IDs', function(done) {
      });

      xit('works with session objects', function(done) {
      });
    });

  });

});
