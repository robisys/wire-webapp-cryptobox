/*! wire-webapp-cryptobox v5.0.0 */
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

Object.defineProperty(exports, "__esModule", { value: true });
class RecordAlreadyExistsError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        Object.setPrototypeOf(this, RecordAlreadyExistsError.prototype);
        this.name = this.constructor.name;
        this.message = message;
        this.stack = new Error().stack;
    }
}
exports.RecordAlreadyExistsError = RecordAlreadyExistsError;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Proteus = __webpack_require__(0);
const EventEmitter = __webpack_require__(11);

const LRUCache = __webpack_require__(14);
const CryptoboxSession_1 = __webpack_require__(3);
const InvalidPreKeyFormatError_1 = __webpack_require__(4);
const ReadOnlyStore_1 = __webpack_require__(5);
const RecordAlreadyExistsError_1 = __webpack_require__(1);
class Cryptobox extends EventEmitter {
    constructor(cryptoBoxStore, minimumAmountOfPreKeys = 1) {
        super();
        if (!cryptoBoxStore) {
            throw new Error(`You cannot initialize Cryptobox without a storage component.`);
        }
        if (minimumAmountOfPreKeys > Proteus.keys.PreKey.MAX_PREKEY_ID) {
            minimumAmountOfPreKeys = Proteus.keys.PreKey.MAX_PREKEY_ID;
        }
        
        this.cachedPreKeys = [];
        this.cachedSessions = new LRUCache(1000);
        this.minimumAmountOfPreKeys = minimumAmountOfPreKeys;
        this.store = cryptoBoxStore;
        this.pk_store = new ReadOnlyStore_1.ReadOnlyStore(this.store);
        let storageEngine = cryptoBoxStore.constructor.name;
        
    }
    save_session_in_cache(session) {
        
        this.cachedSessions.set(session.id, session);
        return session;
    }
    load_session_from_cache(session_id) {
        
        return this.cachedSessions.get(session_id);
    }
    remove_session_from_cache(session_id) {
        
        this.cachedSessions.delete(session_id);
    }
    init() {
        
        return this.store.load_identity()
            .then((identity) => {
            if (identity) {
                
                return identity;
            }
            else {
                identity = Proteus.keys.IdentityKeyPair.new();
                
                return this.save_new_identity(identity);
            }
        })
            .then((identity) => {
            this.identity = identity;
            
            
            return this.store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID);
        })
            .then((lastResortPreKey) => {
            if (lastResortPreKey) {
                
                return lastResortPreKey;
            }
            else {
                
                return this.new_last_resort_prekey();
            }
        })
            .then((lastResortPreKey) => {
            this.lastResortPreKey = lastResortPreKey;
            
            
            return this.store.load_prekeys();
        })
            .then((preKeysFromStorage) => {
            this.cachedPreKeys = preKeysFromStorage;
            return this.refill_prekeys();
        })
            .then(() => {
            let allPreKeys = this.cachedPreKeys;
            let ids = allPreKeys.map(preKey => preKey.key_id.toString());
            
            return allPreKeys;
        });
    }
    get_serialized_last_resort_prekey() {
        return Promise.resolve()
            .then(() => {
            return this.serialize_prekey(this.lastResortPreKey);
        });
    }
    get_serialized_standard_prekeys() {
        return this.store.load_prekeys()
            .then((preKeysFromStorage) => {
            let serializedPreKeys = [];
            preKeysFromStorage.forEach((preKey) => {
                let preKeyJson = this.serialize_prekey(preKey);
                if (preKeyJson.id !== Proteus.keys.PreKey.MAX_PREKEY_ID) {
                    serializedPreKeys.push(preKeyJson);
                }
            });
            return serializedPreKeys;
        });
    }
    publish_event(topic, event) {
        this.emit(topic, event);
        
    }
    publish_prekeys(newPreKeys) {
        if (newPreKeys.length > 0) {
            this.publish_event(Cryptobox.TOPIC.NEW_PREKEYS, newPreKeys);
        }
    }
    publish_session_id(session) {
        this.publish_event(Cryptobox.TOPIC.NEW_SESSION, session.id);
    }
    refill_prekeys() {
        return Promise.resolve()
            .then(() => {
            let missingAmount = 0;
            let highestId = 0;
            if (this.cachedPreKeys.length < this.minimumAmountOfPreKeys) {
                missingAmount = this.minimumAmountOfPreKeys - this.cachedPreKeys.length;
                highestId = -1;
                this.cachedPreKeys.forEach((preKey) => {
                    if (preKey.key_id > highestId && preKey.key_id !== Proteus.keys.PreKey.MAX_PREKEY_ID) {
                        highestId = preKey.key_id;
                    }
                });
                highestId += 1;
                
            }
            return this.new_prekeys(highestId, missingAmount);
        })
            .then((newPreKeys) => {
            if (newPreKeys.length > 0) {
                
                this.cachedPreKeys = this.cachedPreKeys.concat(newPreKeys);
            }
            return newPreKeys;
        });
    }
    save_new_identity(identity) {
        return Promise.resolve()
            .then(() => {
            return this.store.delete_all();
        })
            .then(() => {
            
            return this.store.save_identity(identity);
        });
    }
    session_from_prekey(session_id, pre_key_bundle) {
        let cachedSession = this.load_session_from_cache(session_id);
        if (cachedSession) {
            return Promise.resolve(cachedSession);
        }
        return Promise.resolve()
            .then(() => {
            let bundle;
            try {
                bundle = Proteus.keys.PreKeyBundle.deserialise(pre_key_bundle);
            }
            catch (error) {
                throw new InvalidPreKeyFormatError_1.InvalidPreKeyFormatError(`PreKey bundle for session "${session_id}" has an unsupported format.`);
            }
            return Proteus.session.Session.init_from_prekey(this.identity, bundle)
                .then((session) => {
                let cryptobox_session = new CryptoboxSession_1.CryptoboxSession(session_id, this.pk_store, session);
                return this.session_save(cryptobox_session);
            })
                .catch((error) => {
                if (error instanceof RecordAlreadyExistsError_1.RecordAlreadyExistsError) {
                    
                    return this.session_load(session_id);
                }
                else {
                    throw error;
                }
            });
        });
    }
    session_from_message(session_id, envelope) {
        let env = Proteus.message.Envelope.deserialise(envelope);
        let returnTuple;
        return Proteus.session.Session.init_from_message(this.identity, this.pk_store, env)
            .then((tuple) => {
            let session = tuple[0];
            let decrypted = tuple[1];
            let cryptoBoxSession = new CryptoboxSession_1.CryptoboxSession(session_id, this.pk_store, session);
            returnTuple = [cryptoBoxSession, decrypted];
            return returnTuple;
        });
    }
    session_load(session_id) {
        
        let cachedSession = this.load_session_from_cache(session_id);
        if (cachedSession) {
            return Promise.resolve(cachedSession);
        }
        return Promise.resolve()
            .then(() => {
            return this.store.read_session(this.identity, session_id);
        })
            .then((session) => {
            return new CryptoboxSession_1.CryptoboxSession(session_id, this.pk_store, session);
        })
            .then((session) => {
            return this.save_session_in_cache(session);
        });
    }
    session_cleanup(session) {
        let prekey_deletions = this.pk_store.prekeys.map((preKeyId) => {
            return this.store.delete_prekey(preKeyId);
        });
        return Promise.all(prekey_deletions)
            .then((deletedPreKeyIds) => {
            deletedPreKeyIds.forEach((id) => {
                this.cachedPreKeys = this.cachedPreKeys.filter((preKey) => preKey.key_id !== id);
            });
            this.pk_store.release_prekeys(deletedPreKeyIds);
            return this.refill_prekeys();
        })
            .then((newPreKeys) => {
            this.publish_prekeys(newPreKeys);
            return this.save_session_in_cache(session);
        })
            .then(() => {
            return session;
        });
    }
    session_save(session) {
        return this.store.create_session(session.id, session.session)
            .then(() => {
            return this.session_cleanup(session);
        });
    }
    session_update(session) {
        return this.store.update_session(session.id, session.session)
            .then(() => {
            return this.session_cleanup(session);
        });
    }
    session_delete(session_id) {
        this.remove_session_from_cache(session_id);
        return this.store.delete_session(session_id);
    }
    new_last_resort_prekey() {
        return Promise.resolve()
            .then(() => {
            this.lastResortPreKey = Proteus.keys.PreKey.last_resort();
            return this.store.save_prekeys([this.lastResortPreKey]);
        })
            .then((preKeys) => {
            return preKeys[0];
        });
    }
    serialize_prekey(prekey) {
        return Proteus.keys.PreKeyBundle.new(this.identity.public_key, prekey).serialised_json();
    }
    new_prekeys(start, size = 0) {
        if (size === 0) {
            return Promise.resolve([]);
        }
        return Promise.resolve()
            .then(() => {
            return Proteus.keys.PreKey.generate_prekeys(start, size);
        })
            .then((newPreKeys) => {
            return this.store.save_prekeys(newPreKeys);
        });
    }
    encrypt(session_id, payload, pre_key_bundle) {
        let encryptedBuffer;
        let loadedSession;
        return Promise.resolve()
            .then(() => {
            if (pre_key_bundle) {
                return this.session_from_prekey(session_id, pre_key_bundle);
            }
            else {
                return this.session_load(session_id);
            }
        })
            .then((session) => {
            loadedSession = session;
            return loadedSession.encrypt(payload);
        })
            .then((encrypted) => {
            encryptedBuffer = encrypted;
            return this.session_update(loadedSession);
        })
            .then(function () {
            return encryptedBuffer;
        });
    }
    decrypt(session_id, ciphertext) {
        let is_new_session = false;
        let message;
        let session;
        return this.session_load(session_id)
            .catch(() => {
            return this.session_from_message(session_id, ciphertext);
        })
            .then((value) => {
            let decrypted_message;
            if (value[0] !== undefined) {
                [session, decrypted_message] = value;
                this.publish_session_id(session);
                is_new_session = true;
                return decrypted_message;
            }
            else {
                session = value;
                return session.decrypt(ciphertext);
            }
        })
            .then((decrypted_message) => {
            message = decrypted_message;
            if (is_new_session) {
                return this.session_save(session);
            }
            else {
                return this.session_update(session);
            }
        })
            .then(() => {
            return message;
        });
    }
}
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
const Proteus = __webpack_require__(0);
class CryptoboxSession {
    constructor(id, pk_store, session) {
        this.id = id;
        this.pk_store = pk_store;
        this.session = session;
        Object.freeze(this);
    }
    decrypt(ciphertext) {
        return new Promise((resolve, reject) => {
            let envelope = Proteus.message.Envelope.deserialise(ciphertext);
            this.session.decrypt(this.pk_store, envelope).then(function (plaintext) {
                resolve(plaintext);
            }).catch(reject);
        });
    }
    encrypt(plaintext) {
        return new Promise((resolve) => {
            this.session.encrypt(plaintext).then(function (ciphertext) {
                resolve(ciphertext.serialise());
            });
        });
    }
    fingerprint_local() {
        return this.session.local_identity.public_key.fingerprint();
    }
    fingerprint_remote() {
        return this.session.remote_identity.fingerprint();
    }
}
exports.CryptoboxSession = CryptoboxSession;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class InvalidPreKeyFormatError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        Object.setPrototypeOf(this, InvalidPreKeyFormatError.prototype);
        this.name = this.constructor.name;
        this.message = message;
        this.stack = new Error().stack;
    }
}
exports.InvalidPreKeyFormatError = InvalidPreKeyFormatError;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Proteus = __webpack_require__(0);
class ReadOnlyStore extends Proteus.session.PreKeyStore {
    constructor(store) {
        super();
        this.store = store;
        this.prekeys = [];
    }
    release_prekeys(deletedPreKeyIds) {
        deletedPreKeyIds.forEach((id) => {
            let index = this.prekeys.indexOf(id);
            if (index > -1) {
                this.prekeys.splice(index, 1);
            }
        });
    }
    get_prekey(prekey_id) {
        return new Promise((resolve, reject) => {
            if (this.prekeys.indexOf(prekey_id) !== -1) {
                reject(new Error(`PreKey "${prekey_id}" not found.`));
            }
            else {
                this.store.load_prekey(prekey_id).then(function (pk) {
                    resolve(pk);
                });
            }
        });
    }
    remove(prekey_id) {
        this.prekeys.push(prekey_id);
        return Promise.resolve(prekey_id);
    }
}
exports.ReadOnlyStore = ReadOnlyStore;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class RecordNotFoundError extends Error {
    constructor(message) {
        super(message);
        this.message = message;
        Object.setPrototypeOf(this, RecordNotFoundError.prototype);
        this.name = this.constructor.name;
        this.message = message;
        this.stack = new Error().stack;
    }
}
exports.RecordNotFoundError = RecordNotFoundError;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Proteus = __webpack_require__(0);

class Cache {
    constructor() {
        this.prekeys = {};
        this.sessions = {};
        
    }
    delete_all() {
        return new Promise((resolve) => {
            this.identity = undefined;
            this.prekeys = {};
            this.sessions = {};
            resolve(true);
        });
    }
    delete_prekey(prekey_id) {
        return new Promise((resolve) => {
            delete this.prekeys[prekey_id];
            
            resolve(prekey_id);
        });
    }
    delete_session(session_id) {
        return new Promise((resolve) => {
            delete this.sessions[session_id];
            resolve(session_id);
        });
    }
    load_identity() {
        return new Promise((resolve) => {
            if (this.identity) {
                resolve(this.identity);
            }
            else {
                resolve(undefined);
            }
        });
    }
    load_prekey(prekey_id) {
        return new Promise((resolve, reject) => {
            let serialised = this.prekeys[prekey_id];
            if (serialised) {
                resolve(Proteus.keys.PreKey.deserialise(serialised));
            }
            else {
                resolve(undefined);
            }
        });
    }
    load_prekeys() {
        let prekey_promises = [];
        Object.keys(this.prekeys).forEach((key) => {
            let prekey_id = parseInt(key, 10);
            let promise = this.load_prekey(prekey_id);
            prekey_promises.push(promise);
        });
        return Promise.all(prekey_promises);
    }
    read_session(identity, session_id) {
        return new Promise((resolve, reject) => {
            let serialised = this.sessions[session_id];
            if (serialised) {
                resolve(Proteus.session.Session.deserialise(identity, serialised));
            }
            else {
                reject(new Error(`Session with ID "${session_id}" not found.`));
            }
        });
    }
    save_identity(identity) {
        return new Promise((resolve) => {
            this.identity = identity;
            resolve(this.identity);
        });
    }
    save_prekey(preKey) {
        return new Promise((resolve, reject) => {
            try {
                this.prekeys[preKey.key_id] = preKey.serialise();
                
            }
            catch (error) {
                return reject(new Error(`PreKey (no. ${preKey.key_id}) serialization problem "${error.message}" at "${error.stack}".`));
            }
            resolve(preKey);
        });
    }
    save_prekeys(preKeys) {
        return new Promise((resolve, reject) => {
            let savePromises = [];
            preKeys.forEach((preKey) => {
                savePromises.push(this.save_prekey(preKey));
            });
            Promise.all(savePromises)
                .then(() => {
                resolve(preKeys);
            })
                .catch(reject);
        });
    }
    create_session(session_id, session) {
        return new Promise((resolve, reject) => {
            try {
                this.sessions[session_id] = session.serialise();
            }
            catch (error) {
                return reject(new Error(`Session serialization problem: "${error.message}"`));
            }
            resolve(session);
        });
    }
    update_session(session_id, session) {
        return this.create_session(session_id, session);
    }
}
exports.default = Cache;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Proteus = __webpack_require__(0);
const dexie_1 = __webpack_require__(13);

const RecordAlreadyExistsError_1 = __webpack_require__(1);
const RecordNotFoundError_1 = __webpack_require__(6);
const SerialisedRecord_1 = __webpack_require__(9);
class IndexedDB {
    constructor(identifier) {
        this.prekeys = {};
        this.TABLE = {
            LOCAL_IDENTITY: "keys",
            PRE_KEYS: "prekeys",
            SESSIONS: "sessions"
        };
        this.localIdentityKey = 'local_identity';
        
        if (typeof indexedDB === "undefined") {
            let warning = `IndexedDB isn't supported by your platform.`;
            throw new Error(warning);
        }
        if (typeof identifier === 'string') {
            let schema = {};
            schema[this.TABLE.LOCAL_IDENTITY] = '';
            schema[this.TABLE.PRE_KEYS] = '';
            schema[this.TABLE.SESSIONS] = '';
            this.db = new dexie_1.default(`cryptobox@${identifier}`);
            this.db.version(1).stores(schema);
        }
        else {
            this.db = identifier;
            
        }
        this.db.on('blocked', (event) => {
            
            this.db.close();
        });
    }
    create(store_name, primary_key, entity) {
        
        return this.db[store_name].add(entity, primary_key);
    }
    read(store_name, primary_key) {
        return Promise.resolve()
            .then(() => {
            
            return this.db[store_name].get(primary_key);
        })
            .then((record) => {
            if (record) {
                
                return record;
            }
            else {
                let message = `Record "${primary_key}" from object store "${store_name}" could not be found.`;
                
                throw new RecordNotFoundError_1.RecordNotFoundError(message);
            }
        });
    }
    update(store_name, primary_key, changes) {
        
        return this.db[store_name].update(primary_key, changes);
    }
    delete(store_name, primary_key) {
        return Promise.resolve()
            .then(() => {
            return this.db[store_name].delete(primary_key);
        })
            .then(() => {
            
            return primary_key;
        });
    }
    delete_all() {
        return Promise.resolve()
            .then(() => {
            return this.db[this.TABLE.LOCAL_IDENTITY].clear();
        })
            .then(() => {
            
            return this.db[this.TABLE.PRE_KEYS].clear();
        })
            .then(() => {
            
            return this.db[this.TABLE.SESSIONS].clear();
        })
            .then(() => {
            
            return true;
        });
    }
    delete_prekey(prekey_id) {
        return new Promise((resolve) => {
            this.delete(this.TABLE.PRE_KEYS, prekey_id.toString())
                .then(function () {
                resolve(prekey_id);
            });
        });
    }
    delete_session(session_id) {
        return new Promise((resolve) => {
            this.delete(this.TABLE.SESSIONS, session_id)
                .then((primary_key) => {
                resolve(primary_key);
            });
        });
    }
    load_identity() {
        return new Promise((resolve, reject) => {
            this.read(this.TABLE.LOCAL_IDENTITY, this.localIdentityKey)
                .then((record) => {
                let identity = Proteus.keys.IdentityKeyPair.deserialise(record.serialised);
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
    }
    load_prekey(prekey_id) {
        return new Promise((resolve, reject) => {
            this.read(this.TABLE.PRE_KEYS, prekey_id.toString())
                .then((record) => {
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
    }
    load_prekeys() {
        return Promise.resolve()
            .then(() => {
            return this.db[this.TABLE.PRE_KEYS].toArray();
        })
            .then((records) => {
            let preKeys = [];
            records.forEach((record) => {
                let preKey = Proteus.keys.PreKey.deserialise(record.serialised);
                preKeys.push(preKey);
            });
            return preKeys;
        });
    }
    read_session(identity, session_id) {
        return this.read(this.TABLE.SESSIONS, session_id)
            .then((payload) => {
            return Proteus.session.Session.deserialise(identity, payload.serialised);
        });
    }
    save_identity(identity) {
        return new Promise((resolve, reject) => {
            this.identity = identity;
            let payload = new SerialisedRecord_1.SerialisedRecord(identity.serialise(), this.localIdentityKey);
            this.create(this.TABLE.LOCAL_IDENTITY, payload.id, payload)
                .then((primaryKey) => {
                let fingerprint = identity.public_key.fingerprint();
                let message = `Saved local identity "${fingerprint}"`
                    + ` with key "${primaryKey}" in object store "${this.TABLE.LOCAL_IDENTITY}".`;
                
                resolve(identity);
            })
                .catch(reject);
        });
    }
    save_prekey(prekey) {
        return new Promise((resolve, reject) => {
            this.prekeys[prekey.key_id] = prekey;
            let payload = new SerialisedRecord_1.SerialisedRecord(prekey.serialise(), prekey.key_id.toString());
            this.create(this.TABLE.PRE_KEYS, payload.id, payload)
                .then((primaryKey) => {
                let message = `Saved PreKey (ID "${prekey.key_id}") with key "${primaryKey}" in object store "${this.TABLE.PRE_KEYS}".`;
                
                resolve(prekey);
            })
                .catch(reject);
        });
    }
    save_prekeys(prekeys) {
        return new Promise((resolve, reject) => {
            if (prekeys.length === 0) {
                resolve(prekeys);
            }
            let items = [];
            let keys = [];
            prekeys.forEach(function (preKey) {
                let key = preKey.key_id.toString();
                let payload = new SerialisedRecord_1.SerialisedRecord(preKey.serialise(), key);
                items.push(payload);
                keys.push(key);
            });
            
            this.db[this.TABLE.PRE_KEYS].bulkPut(items, keys)
                .then(() => {
                
                resolve(prekeys);
            })
                .catch(reject);
        });
    }
    create_session(session_id, session) {
        return new Promise((resolve, reject) => {
            let payload = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
            this.create(this.TABLE.SESSIONS, payload.id, payload)
                .then((primaryKey) => {
                let message = `Added session ID "${session_id}" in object store "${this.TABLE.SESSIONS}" with key "${primaryKey}".`;
                
                resolve(session);
            })
                .catch((error) => {
                if (error instanceof dexie_1.default.ConstraintError) {
                    let message = `Session with ID '${session_id}' already exists and cannot get overwritten. You need to delete the session first if you want to do it.`;
                    reject(new RecordAlreadyExistsError_1.RecordAlreadyExistsError(message));
                }
                else {
                    reject(error);
                }
            });
        });
    }
    update_session(session_id, session) {
        return new Promise((resolve, reject) => {
            let payload = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
            this.update(this.TABLE.SESSIONS, payload.id, { serialised: payload.serialised })
                .then((primaryKey) => {
                let message = `Updated session ID "${session_id}" in object store "${this.TABLE.SESSIONS}" with key "${primaryKey}".`;
                
                resolve(session);
            })
                .catch(reject);
        });
    }
}
exports.default = IndexedDB;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Cryptobox_1 = __webpack_require__(2);
class SerialisedRecord {
    constructor(serialised, id) {
        this.created = Date.now();
        this.id = id;
        this.serialised = serialised;
        this.version = Cryptobox_1.Cryptobox.prototype.VERSION;
    }
}
exports.SerialisedRecord = SerialisedRecord;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const Cache_1 = __webpack_require__(7);
const IndexedDB_1 = __webpack_require__(8);
const CryptoboxSession_1 = __webpack_require__(3);
const Cryptobox_1 = __webpack_require__(2);
const InvalidPreKeyFormatError_1 = __webpack_require__(4);
const ReadOnlyStore_1 = __webpack_require__(5);
const RecordAlreadyExistsError_1 = __webpack_require__(1);
const RecordNotFoundError_1 = __webpack_require__(6);
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
		"wire-webapp-proteus": "5.0.1"
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
	"version": "5.0.0"
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