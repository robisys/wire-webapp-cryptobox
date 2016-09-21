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

describe('cryptobox.store.LocalStorage', function() {

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
        store = new cryptobox.store.LocalStorage();
        done();
      });
    }
  });

  beforeEach(function() {
    store.delete_all();
  });

  describe('save_identity', function() {
    it('saves a local identity', function(done) {
      var ikp = Proteus.keys.IdentityKeyPair.new();
      var expectedFingerprint = ikp.public_key.fingerprint();

      store.save_identity(ikp).then(function(actualFingerprint) {
        expect(actualFingerprint).toBe(expectedFingerprint);
        done();
      });
    });
  });

  describe('load_identity', function() {
    it('loads a saved identity', function(done) {
      var ikp = Proteus.keys.IdentityKeyPair.new();
      var expectedFingerprint = ikp.public_key.fingerprint();

      store.save_identity(ikp).then(function() {
        return store.load_identity();
      }).then(function(identity) {
        var actualFingerprint = identity.public_key.fingerprint();
        expect(actualFingerprint).toBe(expectedFingerprint);
        done();
      });
    });
  });
});
