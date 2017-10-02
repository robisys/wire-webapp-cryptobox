"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = require("wire-webapp-proteus");
var Logdown = require("logdown");
var Cache = (function () {
    function Cache() {
        this.prekeys = {};
        this.sessions = {};
        this.logger = new Logdown({ alignOutput: true, markdown: false, prefix: 'cryptobox.store.Cache' });
    }
    Cache.prototype.delete_all = function () {
        this.identity = undefined;
        this.prekeys = {};
        this.sessions = {};
        return Promise.resolve(true);
    };
    Cache.prototype.delete_prekey = function (prekey_id) {
        delete this.prekeys[prekey_id];
        this.logger.log("Deleted PreKey ID \"" + prekey_id + "\".");
        return Promise.resolve(prekey_id);
    };
    Cache.prototype.delete_session = function (session_id) {
        delete this.sessions[session_id];
        return Promise.resolve(session_id);
    };
    Cache.prototype.load_identity = function () {
        return Promise.resolve(this.identity);
    };
    Cache.prototype.load_prekey = function (prekey_id) {
        var serialised = this.prekeys[prekey_id];
        if (serialised) {
            return Promise.resolve(Proteus.keys.PreKey.deserialise(serialised));
        }
        return Promise.resolve(undefined);
    };
    Cache.prototype.load_prekeys = function () {
        var _this = this;
        var prekey_promises = Object
            .keys(this.prekeys)
            .map(function (key) {
            var prekey_id = parseInt(key, 10);
            return _this.load_prekey(prekey_id);
        });
        return Promise.all(prekey_promises);
    };
    Cache.prototype.read_session = function (identity, session_id) {
        var serialised = this.sessions[session_id];
        if (serialised) {
            return Promise.resolve(Proteus.session.Session.deserialise(identity, serialised));
        }
        return Promise.reject(new Error("Session with ID \"" + session_id + "\" not found."));
    };
    Cache.prototype.save_identity = function (identity) {
        this.identity = identity;
        return Promise.resolve(this.identity);
    };
    Cache.prototype.save_prekey = function (preKey) {
        try {
            this.prekeys[preKey.key_id] = preKey.serialise();
            this.logger.log("Saved PreKey ID \"" + preKey.key_id + "\".");
        }
        catch (error) {
            return Promise.reject(new Error("PreKey (no. " + preKey.key_id + ") serialization problem \"" + error.message + "\" at \"" + error.stack + "\"."));
        }
        return Promise.resolve(preKey);
    };
    Cache.prototype.save_prekeys = function (preKeys) {
        var _this = this;
        var savePromises = preKeys
            .map(function (preKey) {
            return _this.save_prekey(preKey);
        });
        return Promise.all(savePromises)
            .then(function () {
            return preKeys;
        });
    };
    Cache.prototype.create_session = function (session_id, session) {
        try {
            this.sessions[session_id] = session.serialise();
        }
        catch (error) {
            return Promise.reject(new Error("Session serialization problem: \"" + error.message + "\""));
        }
        return Promise.resolve(session);
    };
    Cache.prototype.update_session = function (session_id, session) {
        return this.create_session(session_id, session);
    };
    return Cache;
}());
exports.default = Cache;
