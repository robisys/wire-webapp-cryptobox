"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = require("wire-webapp-proteus");
var dexie_1 = require("dexie");
var Logdown = require("logdown");
var error_1 = require("./error");
var SerialisedRecord_1 = require("./SerialisedRecord");
var IndexedDB = (function () {
    function IndexedDB(identifier) {
        var _this = this;
        this.prekeys = {};
        this.TABLE = {
            LOCAL_IDENTITY: "keys",
            PRE_KEYS: "prekeys",
            SESSIONS: "sessions"
        };
        this.localIdentityKey = 'local_identity';
        this.logger = new Logdown({ alignOutput: true, markdown: false, prefix: 'cryptobox.store.IndexedDB' });
        if (typeof indexedDB === "undefined") {
            var warning = "IndexedDB isn't supported by your platform.";
            throw new Error(warning);
        }
        if (typeof identifier === 'string') {
            var schema = {};
            schema[this.TABLE.LOCAL_IDENTITY] = '';
            schema[this.TABLE.PRE_KEYS] = '';
            schema[this.TABLE.SESSIONS] = '';
            this.db = new dexie_1.default("cryptobox@" + identifier);
            this.db.version(1).stores(schema);
        }
        else {
            this.db = identifier;
            this.logger.log("Using cryptobox with existing database \"" + this.db.name + "\".");
        }
        this.db.on('blocked', function (event) {
            _this.logger.warn("Database access to \"" + _this.db.name + "\" got blocked.", event);
            _this.db.close();
        });
    }
    IndexedDB.prototype.create = function (store_name, primary_key, entity) {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            if (entity) {
                _this.logger.log("Add record \"" + primary_key + "\" in object store \"" + store_name + "\"...", entity);
                return _this.db[store_name].add(entity, primary_key);
            }
            throw new error_1.RecordTypeError("Entity is \"undefined\" or \"null\". Store name \"" + store_name + "\", Primary Key \"" + primary_key + "\".");
        });
    };
    IndexedDB.prototype.read = function (store_name, primary_key) {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            _this.logger.log("Trying to load record \"" + primary_key + "\" from object store \"" + store_name + "\".");
            return _this.db[store_name].get(primary_key);
        })
            .then(function (record) {
            if (record) {
                _this.logger.log("Loaded record \"" + primary_key + "\" from object store \"" + store_name + "\".", record);
                return record;
            }
            var message = "Record \"" + primary_key + "\" from object store \"" + store_name + "\" could not be found.";
            _this.logger.warn(message);
            throw new error_1.RecordNotFoundError(message);
        });
    };
    IndexedDB.prototype.update = function (store_name, primary_key, changes) {
        this.logger.log("Changing record \"" + primary_key + "\" in object store \"" + store_name + "\"...", changes);
        return this.db[store_name].update(primary_key, changes);
    };
    IndexedDB.prototype.delete = function (store_name, primary_key) {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            return _this.db[store_name].delete(primary_key);
        })
            .then(function () {
            _this.logger.log("Deleted record with primary key \"" + primary_key + "\" from object store \"" + store_name + "\".");
            return primary_key;
        });
    };
    IndexedDB.prototype.delete_all = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            return _this.db[_this.TABLE.LOCAL_IDENTITY].clear();
        })
            .then(function () {
            _this.logger.log("Deleted all records in object store \"" + _this.TABLE.LOCAL_IDENTITY + "\".");
            return _this.db[_this.TABLE.PRE_KEYS].clear();
        })
            .then(function () {
            _this.logger.log("Deleted all records in object store \"" + _this.TABLE.PRE_KEYS + "\".");
            return _this.db[_this.TABLE.SESSIONS].clear();
        })
            .then(function () {
            _this.logger.log("Deleted all records in object store \"" + _this.TABLE.SESSIONS + "\".");
            return true;
        });
    };
    IndexedDB.prototype.delete_prekey = function (prekey_id) {
        return this.delete(this.TABLE.PRE_KEYS, prekey_id.toString())
            .then(function () {
            return prekey_id;
        });
    };
    IndexedDB.prototype.delete_session = function (session_id) {
        return this.delete(this.TABLE.SESSIONS, session_id)
            .then(function (primary_key) {
            return primary_key;
        });
    };
    IndexedDB.prototype.load_identity = function () {
        return this.read(this.TABLE.LOCAL_IDENTITY, this.localIdentityKey)
            .then(function (record) {
            return Proteus.keys.IdentityKeyPair.deserialise(record.serialised);
        })
            .catch(function (error) {
            if (error instanceof error_1.RecordNotFoundError) {
                return undefined;
            }
            throw error;
        });
    };
    IndexedDB.prototype.load_prekey = function (prekey_id) {
        return this.read(this.TABLE.PRE_KEYS, prekey_id.toString())
            .then(function (record) {
            return Proteus.keys.PreKey.deserialise(record.serialised);
        })
            .catch(function (error) {
            if (error instanceof error_1.RecordNotFoundError) {
                return undefined;
            }
            throw error;
        });
    };
    IndexedDB.prototype.load_prekeys = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            return _this.db[_this.TABLE.PRE_KEYS].toArray();
        })
            .then(function (records) {
            return records.map(function (record) {
                return Proteus.keys.PreKey.deserialise(record.serialised);
            });
        });
    };
    IndexedDB.prototype.read_session = function (identity, session_id) {
        return this.read(this.TABLE.SESSIONS, session_id)
            .then(function (payload) {
            return Proteus.session.Session.deserialise(identity, payload.serialised);
        });
    };
    IndexedDB.prototype.save_identity = function (identity) {
        var _this = this;
        var payload = new SerialisedRecord_1.SerialisedRecord(identity.serialise(), this.localIdentityKey);
        this.identity = identity;
        return this.create(this.TABLE.LOCAL_IDENTITY, payload.id, payload)
            .then(function (primaryKey) {
            var fingerprint = identity.public_key.fingerprint();
            var message = "Saved local identity \"" + fingerprint + "\""
                + (" with key \"" + primaryKey + "\" in object store \"" + _this.TABLE.LOCAL_IDENTITY + "\".");
            _this.logger.log(message);
            return identity;
        });
    };
    IndexedDB.prototype.save_prekey = function (prekey) {
        var _this = this;
        var payload = new SerialisedRecord_1.SerialisedRecord(prekey.serialise(), prekey.key_id.toString());
        this.prekeys[prekey.key_id] = prekey;
        return this.create(this.TABLE.PRE_KEYS, payload.id, payload)
            .then(function (primaryKey) {
            var message = "Saved PreKey (ID \"" + prekey.key_id + "\") with key \"" + primaryKey + "\" in object store \"" + _this.TABLE.PRE_KEYS + "\".";
            _this.logger.log(message);
            return prekey;
        });
    };
    IndexedDB.prototype.save_prekeys = function (prekeys) {
        var _this = this;
        if (prekeys.length === 0) {
            return Promise.resolve(prekeys);
        }
        var items = [];
        var keys = prekeys.map(function (preKey) {
            var key = preKey.key_id.toString();
            var payload = new SerialisedRecord_1.SerialisedRecord(preKey.serialise(), key);
            items.push(payload);
            return key;
        });
        this.logger.log("Saving a batch of \"" + items.length + "\" PreKeys (" + keys.join(', ') + ") in object store \"" + this.TABLE.PRE_KEYS + "\"...", prekeys);
        return Promise.resolve()
            .then(function () {
            return _this.db[_this.TABLE.PRE_KEYS].bulkPut(items, keys);
        })
            .then(function () {
            _this.logger.log("Saved a batch of \"" + items.length + "\" PreKeys (" + keys.join(', ') + ").", items);
            return prekeys;
        });
    };
    IndexedDB.prototype.create_session = function (session_id, session) {
        var _this = this;
        var payload = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
        return this.create(this.TABLE.SESSIONS, payload.id, payload)
            .then(function (primaryKey) {
            var message = "Added session ID \"" + session_id + "\" in object store \"" + _this.TABLE.SESSIONS + "\" with key \"" + primaryKey + "\".";
            _this.logger.log(message);
            return session;
        })
            .catch(function (error) {
            if (error instanceof dexie_1.default.ConstraintError) {
                var message = "Session with ID '" + session_id + "' already exists and cannot get overwritten. You need to delete the session first if you want to do it.";
                throw new error_1.RecordAlreadyExistsError(message);
            }
            throw error;
        });
    };
    IndexedDB.prototype.update_session = function (session_id, session) {
        var _this = this;
        var payload = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
        return this.update(this.TABLE.SESSIONS, payload.id, { serialised: payload.serialised })
            .then(function (primaryKey) {
            var message = "Updated session ID \"" + session_id + "\" in object store \"" + _this.TABLE.SESSIONS + "\" with key \"" + primaryKey + "\".";
            _this.logger.log(message);
            return session;
        });
    };
    return IndexedDB;
}());
exports.default = IndexedDB;
