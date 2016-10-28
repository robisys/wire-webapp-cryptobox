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

describe('cryptobox.store.IndexedDB', function() {

  var cryptobox = undefined;
  var Dexie = undefined;

  beforeAll(function(done) {
    if (typeof window === 'object') {
      SystemJS.import('wire-webapp-cryptobox').then(function(module) {
        cryptobox = module.default;
        return SystemJS.import('dexie');
      }).then(function(module) {
        Dexie = module;
        done();
      });
    }
  });

  describe('constructor', function() {
    var store = undefined;

    afterEach(function(done) {
      if (store) {
        // TODO: Check why this get's blocked!
        // @see https://github.com/dfahlander/Dexie.js/issues/17#issuecomment-53684633
        store.delete_all().then(done).catch(done.fail);
      }
    });

    it('constructs a new IndexedDB', function(done) {
      var identifier = 'IndexedDBSpec';
      store = new cryptobox.store.IndexedDB(identifier);
      store.init().then(function(db) {
        expect(db.name).toEqual(jasmine.any(String));
        done();
      }).catch(done.fail);
    });

    it('works with a given Dexie instance', function(done) {
      var schema = {
        "amplify": '',
        "clients": ', meta.primary_key',
        "conversation_events": ', conversation, time, type',
        "conversations": ', id, last_event_timestamp',
        "keys": '',
        "prekeys": '',
        "sessions": ''
      };

      var name = 'wire@production@532af01e-1e24-4366-aacf-33b67d4ee376@temporary';
      var db = new Dexie(name);
      var dbVersion = db.version(7).stores(schema);
      dbVersion.upgrade(function(transaction) {
        transaction['conversation_events'].toCollection().modify(function(event) {
          var mapped_event;
          mapped_event = event.mapped || event.raw;
          delete event.mapped;
          delete event.raw;
          delete event.meta;
          return Object.assign({}, event, mapped_event);
        });
      });

      store = new cryptobox.store.IndexedDB(db);
      store.init().then(function(db) {
        expect(db.name).toEqual(name);
        done();
      }).catch(done.fail);
    });


    xit('creates the specified amount of PreKeys', function(done) {
    });

    xit('creates new PreKeys if only the half of the minimum PreKey threshold was initially available', function(done) {
    });

    xit('automatically creates new PreKeys if all PreKeys have been used', function(done) {
    });
  });

  describe('get_initial_prekeys', function() {
    xit('publishes an event with newly generated PreKeys', function(done) {
    });

    xit('doesn\'t publish an event when there are no new PreKeys', function(done) {
    });
  });

});
