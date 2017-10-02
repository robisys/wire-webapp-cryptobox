"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = require("wire-webapp-proteus");
var EventEmitter = require("events");
var Logdown = require("logdown");
var LRUCache = require("wire-webapp-lru-cache");
var error_1 = require("./error");
var CryptoboxSession_1 = require("./CryptoboxSession");
var DecryptionError_1 = require("./DecryptionError");
var InvalidPreKeyFormatError_1 = require("./InvalidPreKeyFormatError");
var ReadOnlyStore_1 = require("./store/ReadOnlyStore");
var error_2 = require("./store/error");
var Cryptobox = (function (_super) {
    __extends(Cryptobox, _super);
    function Cryptobox(cryptoBoxStore, minimumAmountOfPreKeys) {
        if (minimumAmountOfPreKeys === void 0) { minimumAmountOfPreKeys = 1; }
        var _this = _super.call(this) || this;
        if (!cryptoBoxStore) {
            throw new Error("You cannot initialize Cryptobox without a storage component.");
        }
        if (minimumAmountOfPreKeys > Proteus.keys.PreKey.MAX_PREKEY_ID) {
            minimumAmountOfPreKeys = Proteus.keys.PreKey.MAX_PREKEY_ID;
        }
        _this.logger = new Logdown({ alignOutput: true, markdown: false, prefix: 'cryptobox.Cryptobox' });
        _this.cachedPreKeys = [];
        _this.cachedSessions = new LRUCache(1000);
        _this.minimumAmountOfPreKeys = minimumAmountOfPreKeys;
        _this.store = cryptoBoxStore;
        _this.pk_store = new ReadOnlyStore_1.ReadOnlyStore(_this.store);
        var storageEngine = cryptoBoxStore.constructor.name;
        _this.logger.log("Constructed Cryptobox. Minimum amount of PreKeys is \"" + minimumAmountOfPreKeys + "\". Storage engine is \"" + storageEngine + "\".");
        return _this;
    }
    Cryptobox.prototype.save_session_in_cache = function (session) {
        this.logger.log("Saving Session with ID \"" + session.id + "\" in cache...");
        this.cachedSessions.set(session.id, session);
        return session;
    };
    Cryptobox.prototype.load_session_from_cache = function (session_id) {
        this.logger.log("Trying to load Session with ID \"" + session_id + "\" from cache...");
        return this.cachedSessions.get(session_id);
    };
    Cryptobox.prototype.remove_session_from_cache = function (session_id) {
        this.logger.log("Removing Session with ID \"" + session_id + "\" from cache...");
        this.cachedSessions.delete(session_id);
    };
    Cryptobox.prototype.create = function () {
        var _this = this;
        this.logger.log("Initializing Cryptobox. Creating local identity...");
        return this.create_new_identity()
            .then(function (identity) {
            _this.identity = identity;
            _this.logger.log("Initialized Cryptobox with new local identity. Fingerprint is \"" + identity.public_key.fingerprint() + "\".", _this.identity);
            return _this.create_last_resort_prekey();
        })
            .then(function (lastResortPreKey) {
            _this.cachedPreKeys = [lastResortPreKey];
            _this.logger.log("Created Last Resort PreKey with ID \"" + lastResortPreKey.key_id + "\".", lastResortPreKey);
            return _this.init();
        });
    };
    Cryptobox.prototype.load = function () {
        var _this = this;
        this.logger.log("Initializing Cryptobox. Loading local identity...");
        return this.store.load_identity()
            .then(function (identity) {
            if (identity) {
                _this.logger.log("Initialized Cryptobox with existing local identity. Fingerprint is \"" + identity.public_key.fingerprint() + "\".", _this.identity);
                _this.identity = identity;
                _this.logger.log("Loading PreKeys...");
                return _this.store.load_prekeys();
            }
            throw new error_1.CryptoboxError('Failed to load local identity');
        })
            .then(function (preKeysFromStorage) {
            var lastResortPreKey = preKeysFromStorage.find(function (preKey) { return preKey.key_id === Proteus.keys.PreKey.MAX_PREKEY_ID; });
            if (lastResortPreKey) {
                _this.logger.log("Loaded Last Resort PreKey with ID \"" + lastResortPreKey.key_id + "\".", lastResortPreKey);
                _this.lastResortPreKey = lastResortPreKey;
                _this.logger.log("Loaded \"" + (_this.minimumAmountOfPreKeys - 1) + "\" standard PreKeys...");
                _this.cachedPreKeys = preKeysFromStorage;
                return _this.init();
            }
            throw new error_1.CryptoboxError('Failed to load last resort PreKey');
        });
    };
    Cryptobox.prototype.init = function () {
        var _this = this;
        return this.refill_prekeys()
            .then(function () {
            var ids = _this.cachedPreKeys.map(function (preKey) { return preKey.key_id.toString(); });
            _this.logger.log("Initialized Cryptobox with a total amount of \"" + _this.cachedPreKeys.length + "\" PreKeys (" + ids.join(', ') + ").", _this.cachedPreKeys);
            return _this.cachedPreKeys.sort(function (a, b) { return a.key_id - b.key_id; });
        });
    };
    Cryptobox.prototype.get_serialized_last_resort_prekey = function () {
        return Promise.resolve(this.serialize_prekey(this.lastResortPreKey));
    };
    Cryptobox.prototype.get_serialized_standard_prekeys = function () {
        var _this = this;
        var standardPreKeys = this.cachedPreKeys
            .map(function (preKey) {
            var isLastResortPreKey = preKey.key_id === Proteus.keys.PreKey.MAX_PREKEY_ID;
            return isLastResortPreKey ? undefined : _this.serialize_prekey(preKey);
        })
            .filter(function (preKeyJson) { return preKeyJson; });
        return Promise.resolve(standardPreKeys);
    };
    Cryptobox.prototype.publish_event = function (topic, event) {
        this.emit(topic, event);
        this.logger.log("Published event \"" + topic + "\".", event);
    };
    Cryptobox.prototype.publish_prekeys = function (newPreKeys) {
        if (newPreKeys.length > 0) {
            this.publish_event(Cryptobox.TOPIC.NEW_PREKEYS, newPreKeys);
        }
    };
    Cryptobox.prototype.publish_session_id = function (session) {
        this.publish_event(Cryptobox.TOPIC.NEW_SESSION, session.id);
    };
    Cryptobox.prototype.refill_prekeys = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            var missingAmount = Math.max(0, _this.minimumAmountOfPreKeys - _this.cachedPreKeys.length);
            if (missingAmount > 0) {
                var startId = _this.cachedPreKeys
                    .reduce(function (currentHighestValue, currentPreKey) {
                    var isLastResortPreKey = currentPreKey.key_id === Proteus.keys.PreKey.MAX_PREKEY_ID;
                    return isLastResortPreKey ? currentHighestValue : Math.max(currentPreKey.key_id + 1, currentHighestValue);
                }, 0);
                _this.logger.warn("There are not enough PreKeys in the storage. Generating \"" + missingAmount + "\" new PreKey(s), starting from ID \"" + startId + "\"...");
                return _this.new_prekeys(startId, missingAmount);
            }
            return [];
        })
            .then(function (newPreKeys) {
            if (newPreKeys.length > 0) {
                _this.logger.log("Generated PreKeys from ID \"" + newPreKeys[0].key_id + "\" to ID \"" + newPreKeys[newPreKeys.length - 1].key_id + "\".");
                _this.cachedPreKeys = _this.cachedPreKeys.concat(newPreKeys);
            }
            return newPreKeys;
        });
    };
    Cryptobox.prototype.create_new_identity = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () { return _this.store.delete_all(); })
            .then(function () {
            var identity = Proteus.keys.IdentityKeyPair.new();
            _this.logger.warn("Cleaned cryptographic items prior to saving a new local identity.", identity);
            return _this.store.save_identity(identity);
        });
    };
    Cryptobox.prototype.session_from_prekey = function (session_id, pre_key_bundle) {
        var _this = this;
        var cachedSession = this.load_session_from_cache(session_id);
        if (cachedSession) {
            return Promise.resolve(cachedSession);
        }
        return Promise.resolve()
            .then(function () {
            var bundle;
            try {
                bundle = Proteus.keys.PreKeyBundle.deserialise(pre_key_bundle);
            }
            catch (error) {
                throw new InvalidPreKeyFormatError_1.InvalidPreKeyFormatError("PreKey bundle for session \"" + session_id + "\" has an unsupported format.");
            }
            return Proteus.session.Session.init_from_prekey(_this.identity, bundle)
                .then(function (session) {
                var cryptobox_session = new CryptoboxSession_1.CryptoboxSession(session_id, _this.pk_store, session);
                return _this.session_save(cryptobox_session);
            })
                .catch(function (error) {
                if (error instanceof error_2.RecordAlreadyExistsError) {
                    _this.logger.warn(error.message, error);
                    return _this.session_load(session_id);
                }
                throw error;
            });
        });
    };
    Cryptobox.prototype.session_from_message = function (session_id, envelope) {
        var _this = this;
        var env = Proteus.message.Envelope.deserialise(envelope);
        return Proteus.session.Session.init_from_message(this.identity, this.pk_store, env)
            .then(function (tuple) {
            var session = tuple[0], decrypted = tuple[1];
            var cryptoBoxSession = new CryptoboxSession_1.CryptoboxSession(session_id, _this.pk_store, session);
            return [cryptoBoxSession, decrypted];
        });
    };
    Cryptobox.prototype.session_load = function (session_id) {
        var _this = this;
        this.logger.log("Trying to load Session with ID \"" + session_id + "\"...");
        var cachedSession = this.load_session_from_cache(session_id);
        if (cachedSession) {
            return Promise.resolve(cachedSession);
        }
        return this.store.read_session(this.identity, session_id)
            .then(function (session) {
            var cryptobox_session = new CryptoboxSession_1.CryptoboxSession(session_id, _this.pk_store, session);
            return _this.save_session_in_cache(cryptobox_session);
        });
    };
    Cryptobox.prototype.session_cleanup = function (session) {
        var _this = this;
        var preKeyDeletionPromises = this.pk_store.prekeys.map(function (preKeyId) { return _this.store.delete_prekey(preKeyId); });
        return Promise.all(preKeyDeletionPromises)
            .then(function (deletedPreKeyIds) {
            _this.cachedPreKeys = _this.cachedPreKeys.filter(function (preKey) { return !deletedPreKeyIds.includes(preKey.key_id); });
            _this.pk_store.release_prekeys(deletedPreKeyIds);
            return _this.refill_prekeys();
        })
            .then(function (newPreKeys) {
            _this.publish_prekeys(newPreKeys);
            return _this.save_session_in_cache(session);
        })
            .then(function () { return session; });
    };
    Cryptobox.prototype.session_save = function (session) {
        var _this = this;
        return this.store.create_session(session.id, session.session)
            .then(function () { return _this.session_cleanup(session); });
    };
    Cryptobox.prototype.session_update = function (session) {
        var _this = this;
        return this.store.update_session(session.id, session.session)
            .then(function () { return _this.session_cleanup(session); });
    };
    Cryptobox.prototype.session_delete = function (session_id) {
        this.remove_session_from_cache(session_id);
        return this.store.delete_session(session_id);
    };
    Cryptobox.prototype.create_last_resort_prekey = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            _this.logger.log("Creating Last Resort PreKey with ID \"" + Proteus.keys.PreKey.MAX_PREKEY_ID + "\"...");
            _this.lastResortPreKey = Proteus.keys.PreKey.last_resort();
            return _this.store.save_prekeys([_this.lastResortPreKey]);
        })
            .then(function (preKeys) { return preKeys[0]; });
    };
    Cryptobox.prototype.serialize_prekey = function (prekey) {
        return Proteus.keys.PreKeyBundle.new(this.identity.public_key, prekey).serialised_json();
    };
    Cryptobox.prototype.new_prekeys = function (start, size) {
        var _this = this;
        if (size === void 0) { size = 0; }
        if (size === 0) {
            return Promise.resolve([]);
        }
        return Promise.resolve()
            .then(function () { return Proteus.keys.PreKey.generate_prekeys(start, size); })
            .then(function (newPreKeys) { return _this.store.save_prekeys(newPreKeys); });
    };
    Cryptobox.prototype.encrypt = function (session_id, payload, pre_key_bundle) {
        var _this = this;
        var encryptedBuffer;
        var loadedSession;
        return Promise.resolve()
            .then(function () {
            if (pre_key_bundle) {
                return _this.session_from_prekey(session_id, pre_key_bundle);
            }
            return _this.session_load(session_id);
        })
            .then(function (session) {
            loadedSession = session;
            return loadedSession.encrypt(payload);
        })
            .then(function (encrypted) {
            encryptedBuffer = encrypted;
            return _this.session_update(loadedSession);
        })
            .then(function () { return encryptedBuffer; });
    };
    Cryptobox.prototype.decrypt = function (session_id, ciphertext) {
        var _this = this;
        var is_new_session = false;
        var message;
        var session;
        if (ciphertext.byteLength === 0) {
            return Promise.reject(new DecryptionError_1.DecryptionError('Cannot decrypt an empty ArrayBuffer.'));
        }
        return this.session_load(session_id)
            .catch(function () { return _this.session_from_message(session_id, ciphertext); })
            .then(function (value) {
            var decrypted_message;
            if (value[0] !== undefined) {
                session = value[0], decrypted_message = value[1];
                _this.publish_session_id(session);
                is_new_session = true;
                return decrypted_message;
            }
            session = value;
            return session.decrypt(ciphertext);
        })
            .then(function (decrypted_message) {
            message = decrypted_message;
            if (is_new_session) {
                return _this.session_save(session);
            }
            return _this.session_update(session);
        })
            .then(function () { return message; });
    };
    Cryptobox.TOPIC = {
        NEW_PREKEYS: "new-prekeys",
        NEW_SESSION: "new-session"
    };
    return Cryptobox;
}(EventEmitter));
exports.Cryptobox = Cryptobox;
Cryptobox.prototype.VERSION = require('../../package.json').version;
