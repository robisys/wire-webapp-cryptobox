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

describe('cryptobox.store.Cache', function() {

  var cryptobox = undefined;
  var Proteus = undefined;
  var store = undefined;

  beforeAll(function(done) {
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

  beforeEach(function() {
    store = new cryptobox.store.Cache();
  });

  describe('constructor', function() {
    it('creates an instance', function() {
      var store = new cryptobox.store.Cache();
      expect(store).toBeDefined();
    });
  });

  describe('save_identity', function() {
    it('saves the local identity', function(done) {
      var ikp = new Proteus.keys.IdentityKeyPair();
      store.save_identity(ikp).then(function(identity) {
        expect(identity.public_key.fingerprint()).toEqual(ikp.public_key.fingerprint());
        done();
      }).catch(done.fail);
    });
  });
});
