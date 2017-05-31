/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

const cryptobox = require('../../../dist/commonjs/wire-webapp-cryptobox');
const fs = require('fs');
const path = require('path');
const Proteus = require('wire-webapp-proteus');

// gulp test_node --file "node/store/FileSpec.js"
describe('cryptobox.store.FileStore', () => {
  const storagePath = path.normalize(`${__dirname}/test`);
  let fileStore = undefined;

  beforeEach(() => {
    fileStore = new cryptobox.store.FileStore(storagePath);
  });

  afterEach((done) => {
    fileStore.delete_all().then(done).catch(done.fail);
  });

  describe('constructor', () => {
    it('constructs a file storage with a given storage path', () => {
      expect(fileStore.storagePath).toBeDefined();
    });

    it('can reload an identity when supplying the same storage path on a new storage instance', (done) => {
      const storagePath = fs.mkdtempSync(path.normalize(`${__dirname}/test`));
      let box = new cryptobox.Cryptobox(new cryptobox.store.FileStore(storagePath), 1);

      let firstFingerprint = undefined;
      let secondFingerprint = undefined;

      box.init()
        .then(() => {
          firstFingerprint = box.identity.public_key.fingerprint();
          box = new cryptobox.Cryptobox(new cryptobox.store.FileStore(storagePath), 1);
          return box.init();
        })
        .then(() => {
          secondFingerprint = box.identity.public_key.fingerprint();
          return box.store.delete_all();
        })
        .then(() => {
          expect(firstFingerprint).toBe(secondFingerprint);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('Identity', () => {
    describe('Save & Load', () => {
      it('serializes an identity which can be deserialized', (done) => {
        const identity = Proteus.keys.IdentityKeyPair.new();
        const fingerprint = identity.public_key.fingerprint();

        fileStore.save_identity(identity)
          .then((local_identity) => {
            expect(local_identity).toBeDefined();
            return fileStore.load_identity();
          })
          .then((loaded_identity) => {
            expect(loaded_identity.public_key.fingerprint()).toBe(fingerprint);
            done();
          })
          .catch(done.fail);
      })
    });
  });

  describe('PreKey', () => {
    describe('Save & Load', () => {
      it('saves and loads a single PreKey', (done) => {
        const preKeyId = 0;
        const preKey = Proteus.keys.PreKey.new(preKeyId);
        fileStore.save_prekey(preKey)
          .then((savedPreKey) => {
            expect(savedPreKey.key_id).toBe(preKeyId);
            return fileStore.load_prekey(preKeyId)
          })
          .then((loadedPreKey) => {
            expect(loadedPreKey.key_id).toBe(preKeyId);
            done();
          })
          .catch(done.fail);
      });

      it('saves and loads multiple PreKeys', (done) => {
        const preKeys = [
          Proteus.keys.PreKey.new(0),
          Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID)
        ];

        fileStore.save_prekeys(preKeys)
          .then(function(savedPreKeys) {
            expect(savedPreKeys.length).toBe(preKeys.length);
            done();
          })
          .catch(done.fail);
      });
    });
  });

  describe('Session', () => {
    describe('save_session', () => {
      it('saves and loads a session', (done) => {
        const alice = new cryptobox.Cryptobox(fileStore, 1);
        const sessionId = 'session_with_bob';

        const bob = Proteus.keys.IdentityKeyPair.new();
        const preKey = Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
        const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bob.public_key, preKey);

        alice.init()
          .then(function(allPreKeys) {
            expect(allPreKeys.length).toBe(1);
            done();
          })
          .catch(done.fail);
      })
    });
  });
});
