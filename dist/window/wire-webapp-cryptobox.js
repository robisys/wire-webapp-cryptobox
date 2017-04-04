/*! wire-webapp-cryptobox v5.0.3 */
var cryptobox =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 10);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = Proteus;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

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
var RecordAlreadyExistsError = (function (_super) {
    __extends(RecordAlreadyExistsError, _super);
    function RecordAlreadyExistsError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Object.setPrototypeOf(_this, RecordAlreadyExistsError.prototype);
        _this.name = _this.constructor.name;
        _this.message = message;
        _this.stack = new Error().stack;
        return _this;
    }
    return RecordAlreadyExistsError;
}(Error));
exports.RecordAlreadyExistsError = RecordAlreadyExistsError;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

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
var Proteus = __webpack_require__(0);
var EventEmitter = __webpack_require__(11);

var LRUCache = __webpack_require__(14);
var CryptoboxSession_1 = __webpack_require__(3);
var InvalidPreKeyFormatError_1 = __webpack_require__(4);
var ReadOnlyStore_1 = __webpack_require__(5);
var RecordAlreadyExistsError_1 = __webpack_require__(1);
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
        
        _this.cachedPreKeys = [];
        _this.cachedSessions = new LRUCache(1000);
        _this.minimumAmountOfPreKeys = minimumAmountOfPreKeys;
        _this.store = cryptoBoxStore;
        _this.pk_store = new ReadOnlyStore_1.ReadOnlyStore(_this.store);
        var storageEngine = cryptoBoxStore.constructor.name;
        
        return _this;
    }
    Cryptobox.prototype.save_session_in_cache = function (session) {
        
        this.cachedSessions.set(session.id, session);
        return session;
    };
    Cryptobox.prototype.load_session_from_cache = function (session_id) {
        
        return this.cachedSessions.get(session_id);
    };
    Cryptobox.prototype.remove_session_from_cache = function (session_id) {
        
        this.cachedSessions.delete(session_id);
    };
    Cryptobox.prototype.init = function () {
        var _this = this;
        
        return this.store.load_identity()
            .then(function (identity) {
            if (identity) {
                
                return identity;
            }
            else {
                identity = Proteus.keys.IdentityKeyPair.new();
                
                return _this.save_new_identity(identity);
            }
        })
            .then(function (identity) {
            _this.identity = identity;
            
            
            return _this.store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID);
        })
            .then(function (lastResortPreKey) {
            if (lastResortPreKey) {
                
                return lastResortPreKey;
            }
            else {
                
                return _this.new_last_resort_prekey();
            }
        })
            .then(function (lastResortPreKey) {
            _this.lastResortPreKey = lastResortPreKey;
            
            
            return _this.store.load_prekeys();
        })
            .then(function (preKeysFromStorage) {
            _this.cachedPreKeys = preKeysFromStorage;
            return _this.refill_prekeys();
        })
            .then(function () {
            var allPreKeys = _this.cachedPreKeys;
            var ids = allPreKeys.map(function (preKey) { return preKey.key_id.toString(); });
            
            return allPreKeys;
        });
    };
    Cryptobox.prototype.get_serialized_last_resort_prekey = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            return _this.serialize_prekey(_this.lastResortPreKey);
        });
    };
    Cryptobox.prototype.get_serialized_standard_prekeys = function () {
        var _this = this;
        return this.store.load_prekeys()
            .then(function (preKeysFromStorage) {
            var serializedPreKeys = [];
            preKeysFromStorage.forEach(function (preKey) {
                var preKeyJson = _this.serialize_prekey(preKey);
                if (preKeyJson.id !== Proteus.keys.PreKey.MAX_PREKEY_ID) {
                    serializedPreKeys.push(preKeyJson);
                }
            });
            return serializedPreKeys;
        });
    };
    Cryptobox.prototype.publish_event = function (topic, event) {
        this.emit(topic, event);
        
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
            var missingAmount = 0;
            var highestId = 0;
            if (_this.cachedPreKeys.length < _this.minimumAmountOfPreKeys) {
                missingAmount = _this.minimumAmountOfPreKeys - _this.cachedPreKeys.length;
                highestId = -1;
                _this.cachedPreKeys.forEach(function (preKey) {
                    if (preKey.key_id > highestId && preKey.key_id !== Proteus.keys.PreKey.MAX_PREKEY_ID) {
                        highestId = preKey.key_id;
                    }
                });
                highestId += 1;
                
            }
            return _this.new_prekeys(highestId, missingAmount);
        })
            .then(function (newPreKeys) {
            if (newPreKeys.length > 0) {
                
                _this.cachedPreKeys = _this.cachedPreKeys.concat(newPreKeys);
            }
            return newPreKeys;
        });
    };
    Cryptobox.prototype.save_new_identity = function (identity) {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            return _this.store.delete_all();
        })
            .then(function () {
            
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
                if (error instanceof RecordAlreadyExistsError_1.RecordAlreadyExistsError) {
                    
                    return _this.session_load(session_id);
                }
                else {
                    throw error;
                }
            });
        });
    };
    Cryptobox.prototype.session_from_message = function (session_id, envelope) {
        var _this = this;
        var env = Proteus.message.Envelope.deserialise(envelope);
        var returnTuple;
        return Proteus.session.Session.init_from_message(this.identity, this.pk_store, env)
            .then(function (tuple) {
            var session = tuple[0];
            var decrypted = tuple[1];
            var cryptoBoxSession = new CryptoboxSession_1.CryptoboxSession(session_id, _this.pk_store, session);
            returnTuple = [cryptoBoxSession, decrypted];
            return returnTuple;
        });
    };
    Cryptobox.prototype.session_load = function (session_id) {
        var _this = this;
        
        var cachedSession = this.load_session_from_cache(session_id);
        if (cachedSession) {
            return Promise.resolve(cachedSession);
        }
        return Promise.resolve()
            .then(function () {
            return _this.store.read_session(_this.identity, session_id);
        })
            .then(function (session) {
            return new CryptoboxSession_1.CryptoboxSession(session_id, _this.pk_store, session);
        })
            .then(function (session) {
            return _this.save_session_in_cache(session);
        });
    };
    Cryptobox.prototype.session_cleanup = function (session) {
        var _this = this;
        var prekey_deletions = this.pk_store.prekeys.map(function (preKeyId) {
            return _this.store.delete_prekey(preKeyId);
        });
        return Promise.all(prekey_deletions)
            .then(function (deletedPreKeyIds) {
            deletedPreKeyIds.forEach(function (id) {
                _this.cachedPreKeys = _this.cachedPreKeys.filter(function (preKey) { return preKey.key_id !== id; });
            });
            _this.pk_store.release_prekeys(deletedPreKeyIds);
            return _this.refill_prekeys();
        })
            .then(function (newPreKeys) {
            _this.publish_prekeys(newPreKeys);
            return _this.save_session_in_cache(session);
        })
            .then(function () {
            return session;
        });
    };
    Cryptobox.prototype.session_save = function (session) {
        var _this = this;
        return this.store.create_session(session.id, session.session)
            .then(function () {
            return _this.session_cleanup(session);
        });
    };
    Cryptobox.prototype.session_update = function (session) {
        var _this = this;
        return this.store.update_session(session.id, session.session)
            .then(function () {
            return _this.session_cleanup(session);
        });
    };
    Cryptobox.prototype.session_delete = function (session_id) {
        this.remove_session_from_cache(session_id);
        return this.store.delete_session(session_id);
    };
    Cryptobox.prototype.new_last_resort_prekey = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            _this.lastResortPreKey = Proteus.keys.PreKey.last_resort();
            return _this.store.save_prekeys([_this.lastResortPreKey]);
        })
            .then(function (preKeys) {
            return preKeys[0];
        });
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
            .then(function () {
            return Proteus.keys.PreKey.generate_prekeys(start, size);
        })
            .then(function (newPreKeys) {
            return _this.store.save_prekeys(newPreKeys);
        });
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
            else {
                return _this.session_load(session_id);
            }
        })
            .then(function (session) {
            loadedSession = session;
            return loadedSession.encrypt(payload);
        })
            .then(function (encrypted) {
            encryptedBuffer = encrypted;
            return _this.session_update(loadedSession);
        })
            .then(function () {
            return encryptedBuffer;
        });
    };
    Cryptobox.prototype.decrypt = function (session_id, ciphertext) {
        var _this = this;
        var is_new_session = false;
        var message;
        var session;
        return this.session_load(session_id)
            .catch(function () {
            return _this.session_from_message(session_id, ciphertext);
        })
            .then(function (value) {
            var decrypted_message;
            if (value[0] !== undefined) {
                session = value[0], decrypted_message = value[1];
                _this.publish_session_id(session);
                is_new_session = true;
                return decrypted_message;
            }
            else {
                session = value;
                return session.decrypt(ciphertext);
            }
        })
            .then(function (decrypted_message) {
            message = decrypted_message;
            if (is_new_session) {
                return _this.session_save(session);
            }
            else {
                return _this.session_update(session);
            }
        })
            .then(function () {
            return message;
        });
    };
    return Cryptobox;
}(EventEmitter));
Cryptobox.TOPIC = {
    NEW_PREKEYS: "new-prekeys",
    NEW_SESSION: "new-session"
};
exports.Cryptobox = Cryptobox;
Cryptobox.prototype.VERSION = __webpack_require__(12).version;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = __webpack_require__(0);
var CryptoboxSession = (function () {
    function CryptoboxSession(id, pk_store, session) {
        this.id = id;
        this.pk_store = pk_store;
        this.session = session;
        Object.freeze(this);
    }
    CryptoboxSession.prototype.decrypt = function (ciphertext) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var envelope = Proteus.message.Envelope.deserialise(ciphertext);
            _this.session.decrypt(_this.pk_store, envelope).then(function (plaintext) {
                resolve(plaintext);
            }).catch(reject);
        });
    };
    CryptoboxSession.prototype.encrypt = function (plaintext) {
        var _this = this;
        return new Promise(function (resolve) {
            _this.session.encrypt(plaintext).then(function (ciphertext) {
                resolve(ciphertext.serialise());
            });
        });
    };
    CryptoboxSession.prototype.fingerprint_local = function () {
        return this.session.local_identity.public_key.fingerprint();
    };
    CryptoboxSession.prototype.fingerprint_remote = function () {
        return this.session.remote_identity.fingerprint();
    };
    return CryptoboxSession;
}());
exports.CryptoboxSession = CryptoboxSession;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

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
var InvalidPreKeyFormatError = (function (_super) {
    __extends(InvalidPreKeyFormatError, _super);
    function InvalidPreKeyFormatError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Object.setPrototypeOf(_this, InvalidPreKeyFormatError.prototype);
        _this.name = _this.constructor.name;
        _this.message = message;
        _this.stack = new Error().stack;
        return _this;
    }
    return InvalidPreKeyFormatError;
}(Error));
exports.InvalidPreKeyFormatError = InvalidPreKeyFormatError;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

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
var Proteus = __webpack_require__(0);
var ReadOnlyStore = (function (_super) {
    __extends(ReadOnlyStore, _super);
    function ReadOnlyStore(store) {
        var _this = _super.call(this) || this;
        _this.store = store;
        _this.prekeys = [];
        return _this;
    }
    ReadOnlyStore.prototype.release_prekeys = function (deletedPreKeyIds) {
        var _this = this;
        deletedPreKeyIds.forEach(function (id) {
            var index = _this.prekeys.indexOf(id);
            if (index > -1) {
                _this.prekeys.splice(index, 1);
            }
        });
    };
    ReadOnlyStore.prototype.get_prekey = function (prekey_id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.prekeys.indexOf(prekey_id) !== -1) {
                reject(new Error("PreKey \"" + prekey_id + "\" not found."));
            }
            else {
                _this.store.load_prekey(prekey_id).then(function (pk) {
                    resolve(pk);
                });
            }
        });
    };
    ReadOnlyStore.prototype.remove = function (prekey_id) {
        this.prekeys.push(prekey_id);
        return Promise.resolve(prekey_id);
    };
    return ReadOnlyStore;
}(Proteus.session.PreKeyStore));
exports.ReadOnlyStore = ReadOnlyStore;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

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
var RecordNotFoundError = (function (_super) {
    __extends(RecordNotFoundError, _super);
    function RecordNotFoundError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Object.setPrototypeOf(_this, RecordNotFoundError.prototype);
        _this.name = _this.constructor.name;
        _this.message = message;
        _this.stack = new Error().stack;
        return _this;
    }
    return RecordNotFoundError;
}(Error));
exports.RecordNotFoundError = RecordNotFoundError;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = __webpack_require__(0);

var Cache = (function () {
    function Cache() {
        this.prekeys = {};
        this.sessions = {};
        
    }
    Cache.prototype.delete_all = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.identity = undefined;
            _this.prekeys = {};
            _this.sessions = {};
            resolve(true);
        });
    };
    Cache.prototype.delete_prekey = function (prekey_id) {
        var _this = this;
        return new Promise(function (resolve) {
            delete _this.prekeys[prekey_id];
            
            resolve(prekey_id);
        });
    };
    Cache.prototype.delete_session = function (session_id) {
        var _this = this;
        return new Promise(function (resolve) {
            delete _this.sessions[session_id];
            resolve(session_id);
        });
    };
    Cache.prototype.load_identity = function () {
        var _this = this;
        return new Promise(function (resolve) {
            if (_this.identity) {
                resolve(_this.identity);
            }
            else {
                resolve(undefined);
            }
        });
    };
    Cache.prototype.load_prekey = function (prekey_id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var serialised = _this.prekeys[prekey_id];
            if (serialised) {
                resolve(Proteus.keys.PreKey.deserialise(serialised));
            }
            else {
                resolve(undefined);
            }
        });
    };
    Cache.prototype.load_prekeys = function () {
        var _this = this;
        var prekey_promises = [];
        Object.keys(this.prekeys).forEach(function (key) {
            var prekey_id = parseInt(key, 10);
            var promise = _this.load_prekey(prekey_id);
            prekey_promises.push(promise);
        });
        return Promise.all(prekey_promises);
    };
    Cache.prototype.read_session = function (identity, session_id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var serialised = _this.sessions[session_id];
            if (serialised) {
                resolve(Proteus.session.Session.deserialise(identity, serialised));
            }
            else {
                reject(new Error("Session with ID \"" + session_id + "\" not found."));
            }
        });
    };
    Cache.prototype.save_identity = function (identity) {
        var _this = this;
        return new Promise(function (resolve) {
            _this.identity = identity;
            resolve(_this.identity);
        });
    };
    Cache.prototype.save_prekey = function (preKey) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                _this.prekeys[preKey.key_id] = preKey.serialise();
                
            }
            catch (error) {
                return reject(new Error("PreKey (no. " + preKey.key_id + ") serialization problem \"" + error.message + "\" at \"" + error.stack + "\"."));
            }
            resolve(preKey);
        });
    };
    Cache.prototype.save_prekeys = function (preKeys) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var savePromises = [];
            preKeys.forEach(function (preKey) {
                savePromises.push(_this.save_prekey(preKey));
            });
            Promise.all(savePromises)
                .then(function () {
                resolve(preKeys);
            })
                .catch(reject);
        });
    };
    Cache.prototype.create_session = function (session_id, session) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                _this.sessions[session_id] = session.serialise();
            }
            catch (error) {
                return reject(new Error("Session serialization problem: \"" + error.message + "\""));
            }
            resolve(session);
        });
    };
    Cache.prototype.update_session = function (session_id, session) {
        return this.create_session(session_id, session);
    };
    return Cache;
}());
exports.default = Cache;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = __webpack_require__(0);
var dexie_1 = __webpack_require__(13);

var RecordAlreadyExistsError_1 = __webpack_require__(1);
var RecordNotFoundError_1 = __webpack_require__(6);
var SerialisedRecord_1 = __webpack_require__(9);
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
            
        }
        this.db.on('blocked', function (event) {
            
            _this.db.close();
        });
    }
    IndexedDB.prototype.create = function (store_name, primary_key, entity) {
        
        return this.db[store_name].add(entity, primary_key);
    };
    IndexedDB.prototype.read = function (store_name, primary_key) {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            
            return _this.db[store_name].get(primary_key);
        })
            .then(function (record) {
            if (record) {
                
                return record;
            }
            else {
                var message = "Record \"" + primary_key + "\" from object store \"" + store_name + "\" could not be found.";
                
                throw new RecordNotFoundError_1.RecordNotFoundError(message);
            }
        });
    };
    IndexedDB.prototype.update = function (store_name, primary_key, changes) {
        
        return this.db[store_name].update(primary_key, changes);
    };
    IndexedDB.prototype.delete = function (store_name, primary_key) {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            return _this.db[store_name].delete(primary_key);
        })
            .then(function () {
            
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
            
            return _this.db[_this.TABLE.PRE_KEYS].clear();
        })
            .then(function () {
            
            return _this.db[_this.TABLE.SESSIONS].clear();
        })
            .then(function () {
            
            return true;
        });
    };
    IndexedDB.prototype.delete_prekey = function (prekey_id) {
        var _this = this;
        return new Promise(function (resolve) {
            _this.delete(_this.TABLE.PRE_KEYS, prekey_id.toString())
                .then(function () {
                resolve(prekey_id);
            });
        });
    };
    IndexedDB.prototype.delete_session = function (session_id) {
        var _this = this;
        return new Promise(function (resolve) {
            _this.delete(_this.TABLE.SESSIONS, session_id)
                .then(function (primary_key) {
                resolve(primary_key);
            });
        });
    };
    IndexedDB.prototype.load_identity = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.read(_this.TABLE.LOCAL_IDENTITY, _this.localIdentityKey)
                .then(function (record) {
                var identity = Proteus.keys.IdentityKeyPair.deserialise(record.serialised);
                resolve(identity);
            })
                .catch(function (error) {
                if (error instanceof RecordNotFoundError_1.RecordNotFoundError) {
                    resolve(undefined);
                }
                else {
                    reject(error);
                }
            });
        });
    };
    IndexedDB.prototype.load_prekey = function (prekey_id) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.read(_this.TABLE.PRE_KEYS, prekey_id.toString())
                .then(function (record) {
                resolve(Proteus.keys.PreKey.deserialise(record.serialised));
            })
                .catch(function (error) {
                if (error instanceof RecordNotFoundError_1.RecordNotFoundError) {
                    resolve(undefined);
                }
                else {
                    reject(error);
                }
            });
        });
    };
    IndexedDB.prototype.load_prekeys = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            return _this.db[_this.TABLE.PRE_KEYS].toArray();
        })
            .then(function (records) {
            var preKeys = [];
            records.forEach(function (record) {
                var preKey = Proteus.keys.PreKey.deserialise(record.serialised);
                preKeys.push(preKey);
            });
            return preKeys;
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
        return new Promise(function (resolve, reject) {
            _this.identity = identity;
            var payload = new SerialisedRecord_1.SerialisedRecord(identity.serialise(), _this.localIdentityKey);
            _this.create(_this.TABLE.LOCAL_IDENTITY, payload.id, payload)
                .then(function (primaryKey) {
                var fingerprint = identity.public_key.fingerprint();
                var message = "Saved local identity \"" + fingerprint + "\""
                    + (" with key \"" + primaryKey + "\" in object store \"" + _this.TABLE.LOCAL_IDENTITY + "\".");
                
                resolve(identity);
            })
                .catch(reject);
        });
    };
    IndexedDB.prototype.save_prekey = function (prekey) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.prekeys[prekey.key_id] = prekey;
            var payload = new SerialisedRecord_1.SerialisedRecord(prekey.serialise(), prekey.key_id.toString());
            _this.create(_this.TABLE.PRE_KEYS, payload.id, payload)
                .then(function (primaryKey) {
                var message = "Saved PreKey (ID \"" + prekey.key_id + "\") with key \"" + primaryKey + "\" in object store \"" + _this.TABLE.PRE_KEYS + "\".";
                
                resolve(prekey);
            })
                .catch(reject);
        });
    };
    IndexedDB.prototype.save_prekeys = function (prekeys) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (prekeys.length === 0) {
                resolve(prekeys);
            }
            var items = [];
            var keys = [];
            prekeys.forEach(function (preKey) {
                var key = preKey.key_id.toString();
                var payload = new SerialisedRecord_1.SerialisedRecord(preKey.serialise(), key);
                items.push(payload);
                keys.push(key);
            });
            
            _this.db[_this.TABLE.PRE_KEYS].bulkPut(items, keys)
                .then(function () {
                
                resolve(prekeys);
            })
                .catch(reject);
        });
    };
    IndexedDB.prototype.create_session = function (session_id, session) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var payload = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
            _this.create(_this.TABLE.SESSIONS, payload.id, payload)
                .then(function (primaryKey) {
                var message = "Added session ID \"" + session_id + "\" in object store \"" + _this.TABLE.SESSIONS + "\" with key \"" + primaryKey + "\".";
                
                resolve(session);
            })
                .catch(function (error) {
                if (error instanceof dexie_1.default.ConstraintError) {
                    var message = "Session with ID '" + session_id + "' already exists and cannot get overwritten. You need to delete the session first if you want to do it.";
                    reject(new RecordAlreadyExistsError_1.RecordAlreadyExistsError(message));
                }
                else {
                    reject(error);
                }
            });
        });
    };
    IndexedDB.prototype.update_session = function (session_id, session) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var payload = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
            _this.update(_this.TABLE.SESSIONS, payload.id, { serialised: payload.serialised })
                .then(function (primaryKey) {
                var message = "Updated session ID \"" + session_id + "\" in object store \"" + _this.TABLE.SESSIONS + "\" with key \"" + primaryKey + "\".";
                
                resolve(session);
            })
                .catch(reject);
        });
    };
    return IndexedDB;
}());
exports.default = IndexedDB;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Cryptobox_1 = __webpack_require__(2);
var SerialisedRecord = (function () {
    function SerialisedRecord(serialised, id) {
        this.created = Date.now();
        this.id = id;
        this.serialised = serialised;
        this.version = Cryptobox_1.Cryptobox.prototype.VERSION;
    }
    return SerialisedRecord;
}());
exports.SerialisedRecord = SerialisedRecord;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Cache_1 = __webpack_require__(7);
var IndexedDB_1 = __webpack_require__(8);
var CryptoboxSession_1 = __webpack_require__(3);
var Cryptobox_1 = __webpack_require__(2);
var InvalidPreKeyFormatError_1 = __webpack_require__(4);
var ReadOnlyStore_1 = __webpack_require__(5);
var RecordAlreadyExistsError_1 = __webpack_require__(1);
var RecordNotFoundError_1 = __webpack_require__(6);
module.exports = {
    Cryptobox: Cryptobox_1.Cryptobox,
    CryptoboxSession: CryptoboxSession_1.CryptoboxSession,
    InvalidPreKeyFormatError: InvalidPreKeyFormatError_1.InvalidPreKeyFormatError,
    store: {
        Cache: Cache_1.default,
        IndexedDB: IndexedDB_1.default,
        ReadOnlyStore: ReadOnlyStore_1.ReadOnlyStore,
        RecordAlreadyExistsError: RecordAlreadyExistsError_1.RecordAlreadyExistsError,
        RecordNotFoundError: RecordNotFoundError_1.RecordNotFoundError
    }
};


/***/ }),
/* 11 */
/***/ (function(module, exports) {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}


/***/ }),
/* 12 */
/***/ (function(module, exports) {

module.exports = {
	"dependencies": {
		"dexie": "1.5.1",
		"wire-webapp-lru-cache": "2.0.0",
		"wire-webapp-proteus": "5.0.2"
	},
	"description": "High-level API with persistent storage for Proteus.",
	"devDependencies": {
		"browser-sync": "^2.14.0",
		"gulp": "^3.9.1",
		"gulp-babel": "^6.1.2",
		"gulp-bower": "0.0.13",
		"gulp-bower-assets": "0.0.3",
		"gulp-clean": "^0.3.2",
		"gulp-concat": "^2.6.0",
		"gulp-eslint": "^3.0.1",
		"gulp-if": "^2.0.2",
		"gulp-jasmine": "^2.4.1",
		"gulp-replace": "^0.5.4",
		"gulp-typescript": "3.1.6",
		"gulp-typings": "^2.0.4",
		"gulp-util": "^3.0.7",
		"gutil": "^1.6.4",
		"karma": "~1.5.0",
		"karma-chrome-launcher": "~2.0.0",
		"karma-jasmine": "~1.1.0",
		"logdown": "2.2.0",
		"merge2": "^1.0.2",
		"run-sequence": "^1.2.2",
		"typescript": "^2.1.4",
		"webpack": "2.3.0",
		"yargs": "^6.6.0"
	},
	"license": "GPL-3.0",
	"main": "dist/commonjs/wire-webapp-cryptobox.js",
	"name": "wire-webapp-cryptobox",
	"repository": {
		"type": "git",
		"url": "git://github.com/wireapp/wire-webapp-cryptobox.git"
	},
	"scripts": {
		"build": "npm run prepublish",
		"prepublish": "gulp dist --env production && npm test",
		"self_test_node": "node dist/index.js",
		"start": "gulp",
		"test": "npm run self_test_node && gulp test"
	},
	"types": "dist/typings/wire-webapp-cryptobox.d.ts",
	"version": "5.0.3"
};

/***/ }),
/* 13 */
/***/ (function(module, exports) {

module.exports = Dexie;

/***/ }),
/* 14 */
/***/ (function(module, exports) {

module.exports = LRUCache;

/***/ })
/******/ ]);
//# sourceMappingURL=wire-webapp-cryptobox.js.map