"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = require("wire-webapp-proteus");
var error_1 = require("./error");
var SerialisedRecord_1 = require("./SerialisedRecord");
var CryptoboxCRUDStore = (function () {
    function CryptoboxCRUDStore(engine) {
        this.engine = engine;
    }
    Object.defineProperty(CryptoboxCRUDStore, "KEYS", {
        get: function () {
            return {
                LOCAL_IDENTITY: 'local_identity'
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CryptoboxCRUDStore, "STORES", {
        get: function () {
            return {
                LOCAL_IDENTITY: 'keys',
                PRE_KEYS: 'prekeys',
                SESSIONS: 'sessions'
            };
        },
        enumerable: true,
        configurable: true
    });
    CryptoboxCRUDStore.prototype.from_store = function (record) {
        var decodedData = Buffer.from(record.serialised, 'base64');
        return {
            created: record.created,
            id: record.id,
            serialised: new Uint8Array(decodedData).buffer,
            version: record.version,
        };
    };
    CryptoboxCRUDStore.prototype.to_store = function (record) {
        return {
            created: record.created,
            id: record.id,
            serialised: new Buffer(record.serialised).toString('base64'),
            version: record.version,
        };
    };
    CryptoboxCRUDStore.prototype.delete_all = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () { return _this.engine.deleteAll(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY); })
            .then(function () { return _this.engine.deleteAll(CryptoboxCRUDStore.STORES.PRE_KEYS); })
            .then(function () { return _this.engine.deleteAll(CryptoboxCRUDStore.STORES.SESSIONS); })
            .then(function () { return true; });
    };
    CryptoboxCRUDStore.prototype.delete_prekey = function (prekey_id) {
        return this.engine.delete(CryptoboxCRUDStore.STORES.PRE_KEYS, prekey_id.toString())
            .then(function () { return prekey_id; });
    };
    CryptoboxCRUDStore.prototype.load_identity = function () {
        var _this = this;
        return this.engine.read(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY, CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY)
            .then(function (payload) {
            var record = _this.from_store(payload);
            var identity = Proteus.keys.IdentityKeyPair.deserialise(record.serialised);
            return identity;
        })
            .catch(function (error) {
            if (error instanceof error_1.RecordNotFoundError) {
                return undefined;
            }
            throw error;
        });
    };
    CryptoboxCRUDStore.prototype.load_prekey = function (prekey_id) {
        var _this = this;
        return this.engine.read(CryptoboxCRUDStore.STORES.PRE_KEYS, prekey_id.toString())
            .then(function (payload) {
            var record = _this.from_store(payload);
            return Proteus.keys.PreKey.deserialise(record.serialised);
        })
            .catch(function (error) {
            if (error instanceof error_1.RecordNotFoundError) {
                return undefined;
            }
            throw error;
        });
    };
    CryptoboxCRUDStore.prototype.load_prekeys = function () {
        var _this = this;
        return this.engine.readAll(CryptoboxCRUDStore.STORES.PRE_KEYS)
            .then(function (records) {
            var preKeys = [];
            records.forEach(function (payload) {
                var record = _this.from_store(payload);
                var preKey = Proteus.keys.PreKey.deserialise(record.serialised);
                preKeys.push(preKey);
            });
            return preKeys;
        });
    };
    CryptoboxCRUDStore.prototype.save_identity = function (identity) {
        var record = new SerialisedRecord_1.SerialisedRecord(identity.serialise(), CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY);
        var payload = this.to_store(record);
        return this.engine.create(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY, record.id, payload)
            .then(function () { return identity; });
    };
    CryptoboxCRUDStore.prototype.save_prekey = function (pre_key) {
        var record = new SerialisedRecord_1.SerialisedRecord(pre_key.serialise(), pre_key.key_id.toString());
        var payload = this.to_store(record);
        return this.engine.create(CryptoboxCRUDStore.STORES.PRE_KEYS, record.id, payload)
            .then(function () { return pre_key; });
    };
    CryptoboxCRUDStore.prototype.save_prekeys = function (pre_keys) {
        var _this = this;
        var promises = pre_keys.map(function (pre_key) { return _this.save_prekey(pre_key); });
        return Promise.all(promises).then(function () { return pre_keys; });
    };
    CryptoboxCRUDStore.prototype.create_session = function (session_id, session) {
        var record = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
        var payload = this.to_store(record);
        return this.engine.create(CryptoboxCRUDStore.STORES.SESSIONS, record.id, payload)
            .then(function () { return session; });
    };
    CryptoboxCRUDStore.prototype.read_session = function (identity, session_id) {
        var _this = this;
        return this.engine.read(CryptoboxCRUDStore.STORES.SESSIONS, session_id)
            .then(function (payload) {
            var record = _this.from_store(payload);
            return Proteus.session.Session.deserialise(identity, record.serialised);
        });
    };
    CryptoboxCRUDStore.prototype.update_session = function (session_id, session) {
        var record = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
        var payload = this.to_store(record);
        return this.engine.update(CryptoboxCRUDStore.STORES.SESSIONS, record.id, { serialised: payload.serialised })
            .then(function () { return session; });
    };
    CryptoboxCRUDStore.prototype.delete_session = function (session_id) {
        return this.engine.delete(CryptoboxCRUDStore.STORES.SESSIONS, session_id)
            .then(function (primary_key) { return primary_key; });
    };
    return CryptoboxCRUDStore;
}());
exports.default = CryptoboxCRUDStore;
