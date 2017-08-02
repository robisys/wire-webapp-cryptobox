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
const fs = require('fs-extra');
const path = require('path');
const Proteus = require('wire-webapp-proteus');
const {FileEngine} = require('@wireapp/store-engine/dist/commonjs/engine');

// gulp test_node --file "node/store/CryptoboxCRUDStoreSpec.js"
describe('cryptobox.store.CryptoboxCRUDStore', () => {
  let storagePath = undefined;
  let fileStore = undefined;

  beforeEach(() => {
    storagePath = fs.mkdtempSync(path.normalize(`${__dirname}/test`));
    const engine = new FileEngine(storagePath);
    fileStore = new cryptobox.store.CryptoboxCRUDStore(engine);
  });

  afterEach((done) => fs.remove(storagePath).then(done).catch(done.fail));

  describe('"load_prekey"', () => {
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
  });

  describe('"load_prekeys"', () => {
    it('loads multiple PreKeys', (done) => {
      Promise.all([
        fileStore.save_prekey(Proteus.keys.PreKey.new(1)),
        fileStore.save_prekey(Proteus.keys.PreKey.new(2)),
        fileStore.save_prekey(Proteus.keys.PreKey.new(3)),
      ]).then(() => fileStore.load_prekeys())
        .then((preKeys) => {
          expect(preKeys.length).toBe(3);
          done();
        });
    });
  });

  describe('"save_prekeys"', () => {
    it('saves multiple PreKeys', (done) => {
      const preKeys = [
        Proteus.keys.PreKey.new(0),
        Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID)
      ];

      fileStore.save_prekeys(preKeys)
        .then((savedPreKeys) => {
          expect(savedPreKeys.length).toBe(preKeys.length);
          done();
        })
        .catch(done.fail);
    });
  });
});
