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

});
