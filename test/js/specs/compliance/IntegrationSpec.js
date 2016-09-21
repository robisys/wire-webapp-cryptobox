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

describe('Integration', function() {

  var Proteus = undefined;

  beforeAll(function(done) {
    if (typeof window === 'object') {
      SystemJS.import('wire-webapp-proteus').then(function(module) {
        Proteus = module;
        done();
      });
    } else {
      Proteus = require('wire-webapp-proteus');
      done();
    }
  });

  describe('IdentityKeyPair', function() {
    describe('constructor', function() {
      it('creates an instance', function() {
        var ikp = Proteus.keys.IdentityKeyPair.new();
        expect(ikp).toBeDefined();
      });
    });

    describe('fingerprint', function() {
      it('generates a readable fingerprint', function() {
        var ikp = Proteus.keys.IdentityKeyPair.new();
        var fingerprint = ikp.public_key.fingerprint();
        expect(fingerprint).toEqual(jasmine.any(String));
      });
    });

    describe('serialise', function() {
      it('creates serialised format', function() {
        var ikp = Proteus.keys.IdentityKeyPair.new();
        // TODO: "RangeError: Wrong length!" on Node.js
        var buffer = ikp.serialise();
        var view = new Uint8Array(buffer);
        expect(view.length).toBe(111);
      });
    });
  });

});
