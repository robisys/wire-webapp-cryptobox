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

describe('Store Compatibility', function() {

  var cryptobox = undefined;
  var Proteus = undefined;

  beforeAll(function(done) {
    if (typeof window === 'object') {
      cryptobox = window.cryptobox;
      Proteus = window.Proteus;
      done();
    } else {
      cryptobox = require('../../../../dist/commonjs/wire-webapp-cryptobox');
      Proteus = require('wire-webapp-proteus');
      done();
    }
  });

  describe('local identity', function() {
    it('saves the same identity', function(done) {
      var identity = Proteus.keys.IdentityKeyPair.new();
      var fingerprint = identity.public_key.fingerprint();

      var identifier = 'compatibility-test';
      var storeCache = new cryptobox.store.Cache();
      var storeIndexedDB = new cryptobox.store.IndexedDB(identifier);
      var storeLocalStorage = new cryptobox.store.LocalStorage(identifier);

      var identityFromCache = undefined;
      var identityFromIndexedDB = undefined;
      var identityFromLocalStorage = undefined;

      storeIndexedDB.init().then(function() {
        return storeCache.save_identity(identity);
      }).then(function() {
        return storeIndexedDB.save_identity(identity);
      }).then(function() {
        return storeLocalStorage.save_identity(identity);
      }).then(function() {
        return storeCache.load_identity();
      }).then(function(identity) {
        identityFromCache = identity;
        return storeIndexedDB.load_identity();
      }).then(function(identity) {
        identityFromIndexedDB = identity;
        return storeLocalStorage.load_identity();
      }).then(function(identity) {
        identityFromLocalStorage = identity;

        expect(identityFromCache.public_key.fingerprint()).toBe(fingerprint);
        expect(identityFromIndexedDB.public_key.fingerprint()).toBe(fingerprint);
        expect(identityFromLocalStorage.public_key.fingerprint()).toBe(fingerprint);

        done();
      }).catch(done.fail);
    });
  });
});
