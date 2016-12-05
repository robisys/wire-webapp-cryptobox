var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
System.register("store/CryptoboxStore", [], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    return {
        setters:[],
        execute: function() {
        }
    }
});
System.register("store/ReadOnlyStore", ["wire-webapp-proteus"], function(exports_2, context_2) {
    "use strict";
    var __moduleName = context_2 && context_2.id;
    var Proteus;
    var ReadOnlyStore;
    return {
        setters:[
            function (Proteus_1) {
                Proteus = Proteus_1;
            }],
        execute: function() {
            ReadOnlyStore = (function (_super) {
                __extends(ReadOnlyStore, _super);
                function ReadOnlyStore(store) {
                    _super.call(this);
                    this.store = store;
                    this.removed_prekeys = [];
                }
                ReadOnlyStore.prototype.get_prekey = function (prekey_id) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        if (_this.removed_prekeys.indexOf(prekey_id) !== -1) {
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
                    this.removed_prekeys.push(prekey_id);
                    return Promise.resolve(prekey_id);
                };
                return ReadOnlyStore;
            }(Proteus.session.PreKeyStore));
            exports_2("ReadOnlyStore", ReadOnlyStore);
        }
    }
});
System.register("CryptoboxSession", ["wire-webapp-proteus"], function(exports_3, context_3) {
    "use strict";
    var __moduleName = context_3 && context_3.id;
    var Proteus;
    var CryptoboxSession;
    return {
        setters:[
            function (Proteus_2) {
                Proteus = Proteus_2;
            }],
        execute: function() {
            CryptoboxSession = (function () {
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
            exports_3("CryptoboxSession", CryptoboxSession);
        }
    }
});
System.register("Cryptobox", ["wire-webapp-proteus", "wire-webapp-lru-cache", "CryptoboxSession", "store/ReadOnlyStore", "logdown", "postal"], function(exports_4, context_4) {
    "use strict";
    var __moduleName = context_4 && context_4.id;
    var Proteus, wire_webapp_lru_cache_1, CryptoboxSession_1, ReadOnlyStore_1, Logdown, postal;
    var Cryptobox;
    return {
        setters:[
            function (Proteus_3) {
                Proteus = Proteus_3;
            },
            function (wire_webapp_lru_cache_1_1) {
                wire_webapp_lru_cache_1 = wire_webapp_lru_cache_1_1;
            },
            function (CryptoboxSession_1_1) {
                CryptoboxSession_1 = CryptoboxSession_1_1;
            },
            function (ReadOnlyStore_1_1) {
                ReadOnlyStore_1 = ReadOnlyStore_1_1;
            },
            function (Logdown_1) {
                Logdown = Logdown_1;
            },
            function (postal_1) {
                postal = postal_1;
            }],
        execute: function() {
            Cryptobox = (function () {
                function Cryptobox(cryptoBoxStore, minimumAmountOfPreKeys) {
                    if (minimumAmountOfPreKeys === void 0) { minimumAmountOfPreKeys = 1; }
                    if (!cryptoBoxStore) {
                        throw new Error("You cannot initialize Cryptobox without a storage component.");
                    }
                    this.logger = new Logdown.default({ prefix: 'cryptobox.Cryptobox', alignOuput: true });
                    this.cachedPreKeys = new wire_webapp_lru_cache_1.LRUCache(1);
                    this.cachedSessions = new wire_webapp_lru_cache_1.LRUCache(1000);
                    this.channel = postal.channel(this.CHANNEL_CRYPTOBOX);
                    this.logger.log("Prepared event channel \"" + this.CHANNEL_CRYPTOBOX + "\".");
                    this.minimumAmountOfPreKeys = minimumAmountOfPreKeys;
                    this.store = cryptoBoxStore;
                    this.pk_store = new ReadOnlyStore_1.ReadOnlyStore(this.store);
                    var storageEngine = cryptoBoxStore.constructor.name;
                    this.logger.log("Constructed Cryptobox. Minimum amount of PreKeys is \"" + minimumAmountOfPreKeys + "\". Storage engine is \"" + storageEngine + "\".");
                }
                Cryptobox.prototype.save_prekey_in_cache = function (preKey) {
                    this.logger.log("Saving PreKey with ID \"" + preKey.key_id + "\" in cache.");
                    this.cachedPreKeys.set(preKey.key_id, preKey);
                    return preKey;
                };
                Cryptobox.prototype.load_prekey_from_cache = function (preKeyId) {
                    this.logger.log("Loading PreKey with ID: \"" + preKeyId + "\" from cache...");
                    return this.cachedPreKeys.get(preKeyId);
                };
                Cryptobox.prototype.save_session_in_cache = function (session) {
                    this.logger.log("Saving Session with ID \"" + session.id + "\" in cache.");
                    this.cachedSessions.set(session.id, session);
                    return session;
                };
                Cryptobox.prototype.load_session_from_cache = function (session_id) {
                    this.logger.log("Loading Session with ID \"" + session_id + "\" from cache.");
                    return this.cachedSessions.get(session_id);
                };
                Cryptobox.prototype.remove_session_from_cache = function (session_id) {
                    this.logger.log("Removing Session with ID \"" + session_id + "\" from cache.");
                    this.cachedSessions.set(session_id, undefined);
                };
                Cryptobox.prototype.init = function () {
                    var _this = this;
                    return Promise.resolve().then(function () {
                        _this.logger.log("Loading local identity...");
                        return _this.store.load_identity()
                            .catch(function () {
                            var identity = Proteus.keys.IdentityKeyPair.new();
                            _this.logger.warn("No existing identity found. Created new identity with fingerprint \"" + identity.public_key.fingerprint() + "\".", identity);
                            return _this.store.save_identity(identity);
                        })
                            .then(function (identity) {
                            _this.identity = identity;
                            _this.logger.log("Loaded local identity. Fingerprint is \"" + _this.identity.public_key.fingerprint() + "\".", _this.identity);
                            _this.logger.log("Loading Last Resort PreKey with ID \"" + Proteus.keys.PreKey.MAX_PREKEY_ID + "\"...");
                            return Promise.resolve().then(function () {
                                return _this.load_prekey_from_cache(Proteus.keys.PreKey.MAX_PREKEY_ID);
                            }).then(function (prekey) {
                                return prekey || _this.store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID);
                            }).then(function (prekey) {
                                return _this.save_prekey_in_cache(prekey);
                            });
                        })
                            .catch(function () {
                            var lastResort = Proteus.keys.PreKey.MAX_PREKEY_ID;
                            _this.logger.warn("No last resort PreKey found. Created last resort PreKey with ID \"" + lastResort + "\".");
                            return _this.new_prekey(lastResort);
                        })
                            .then(function () {
                            _this.logger.log("Loaded Last Resort PreKey with ID \"" + Proteus.keys.PreKey.MAX_PREKEY_ID + "\".");
                            _this.logger.log("Loading \"" + (_this.minimumAmountOfPreKeys - 1) + "\" Standard PreKeys...");
                            return _this.get_initial_prekeys();
                        })
                            .then(function (initialPreKeys) {
                            _this.logger.log("Initialized Cryptobox with an amount of \"" + initialPreKeys.length + "\" PreKeys.");
                            return _this;
                        });
                    });
                };
                Cryptobox.prototype.get_initial_prekeys = function () {
                    var _this = this;
                    return Promise.resolve().then(function () {
                        var preKeys = [];
                        return _this.store.load_prekeys()
                            .then(function (currentPreKeys) {
                            preKeys = currentPreKeys;
                            var missingAmount = 0;
                            var highestId = 0;
                            if (currentPreKeys.length < _this.minimumAmountOfPreKeys) {
                                missingAmount = _this.minimumAmountOfPreKeys - currentPreKeys.length;
                                highestId = -1;
                                currentPreKeys.forEach(function (preKey) {
                                    if (preKey.key_id > highestId && preKey.key_id !== Proteus.keys.PreKey.MAX_PREKEY_ID) {
                                        highestId = preKey.key_id;
                                    }
                                });
                                highestId += 1;
                                _this.logger.warn("There are not enough PreKeys in the storage. Generating \"" + missingAmount + "\" new PreKey(s), starting from ID \"" + highestId + "\"...");
                            }
                            return _this.new_prekeys(highestId, missingAmount);
                        })
                            .then(function (newPreKeys) {
                            preKeys = preKeys.concat(newPreKeys);
                            if (newPreKeys.length > 0) {
                                _this.channel.publish(_this.TOPIC_NEW_PREKEYS, newPreKeys);
                                _this.logger.log("Published event \"" + _this.CHANNEL_CRYPTOBOX + ":" + _this.TOPIC_NEW_PREKEYS + "\".", newPreKeys);
                            }
                            return preKeys;
                        });
                    });
                };
                Cryptobox.prototype.session_from_prekey = function (client_id, pre_key_bundle) {
                    var _this = this;
                    return Promise.resolve().then(function () {
                        var bundle = Proteus.keys.PreKeyBundle.deserialise(pre_key_bundle);
                        return Proteus.session.Session.init_from_prekey(_this.identity, bundle).then(function (session) {
                            return new CryptoboxSession_1.CryptoboxSession(client_id, _this.pk_store, session);
                        });
                    });
                };
                Cryptobox.prototype.session_from_message = function (session_id, envelope) {
                    var _this = this;
                    return Promise.resolve().then(function () {
                        var env;
                        env = Proteus.message.Envelope.deserialise(envelope);
                        return Proteus.session.Session.init_from_message(_this.identity, _this.pk_store, env)
                            .then(function (tuple) {
                            var session = tuple[0];
                            var decrypted = tuple[1];
                            var cryptoBoxSession = new CryptoboxSession_1.CryptoboxSession(session_id, _this.pk_store, session);
                            return [cryptoBoxSession, decrypted];
                        });
                    });
                };
                Cryptobox.prototype.session_load = function (session_id) {
                    var _this = this;
                    return Promise.resolve().then(function () {
                        var cachedSession = _this.load_session_from_cache(session_id);
                        if (cachedSession) {
                            return cachedSession;
                        }
                        return _this.store.load_session(_this.identity, session_id)
                            .then(function (session) {
                            if (session) {
                                return new CryptoboxSession_1.CryptoboxSession(session_id, _this.pk_store, session);
                            }
                            else {
                                throw new Error("Session with ID \"" + session + "\" not found.");
                            }
                        })
                            .then(function (session) {
                            return this.save_session_in_cache(session);
                        });
                    });
                };
                Cryptobox.prototype.session_save = function (session) {
                    var _this = this;
                    return this.store.save_session(session.id, session.session).then(function () {
                        var prekey_deletions = _this.pk_store.removed_prekeys.map(function (preKeyId) {
                            return _this.store.delete_prekey(preKeyId);
                        });
                        return Promise.all(prekey_deletions);
                    }).then(function () {
                        return _this.get_initial_prekeys();
                    }).then(function () {
                        return _this.save_session_in_cache(session);
                    }).then(function () {
                        return session.id;
                    });
                };
                Cryptobox.prototype.session_delete = function (session_id) {
                    this.remove_session_from_cache(session_id);
                    return this.store.delete_session(session_id);
                };
                Cryptobox.prototype.new_prekey = function (prekey_id) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        var pk = Proteus.keys.PreKey.new(prekey_id);
                        _this.store.save_prekey(pk)
                            .then(function () {
                            var serialisedPreKeyBundle = Proteus.keys.PreKeyBundle.new(_this.identity.public_key, pk).serialise();
                            resolve(serialisedPreKeyBundle);
                        })
                            .catch(reject);
                    });
                };
                Cryptobox.prototype.new_prekeys = function (start, size) {
                    var _this = this;
                    if (size === void 0) { size = 0; }
                    return Promise.resolve().then(function () {
                        if (size === 0) {
                            return new Array();
                        }
                        var newPreKeys = Proteus.keys.PreKey.generate_prekeys(start, size);
                        return _this.store.save_prekeys(newPreKeys);
                    });
                };
                Cryptobox.prototype.encrypt = function (session, payload) {
                    var _this = this;
                    var encryptedBuffer;
                    var loadedSession;
                    return Promise.resolve().then(function () {
                        if (typeof session === 'string') {
                            return _this.session_load(session);
                        }
                        return session;
                    }).then(function (session) {
                        loadedSession = session;
                        return loadedSession.encrypt(payload);
                    }).then(function (encrypted) {
                        encryptedBuffer = encrypted;
                        return _this.session_save(loadedSession);
                    }).then(function () {
                        return encryptedBuffer;
                    });
                };
                Cryptobox.prototype.decrypt = function (session_id, ciphertext) {
                    var _this = this;
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
                            return decrypted_message;
                        }
                        else {
                            session = value;
                            return value.decrypt(ciphertext);
                        }
                    })
                        .then(function (decrypted_message) {
                        message = decrypted_message;
                        return _this.session_save(session);
                    })
                        .then(function () {
                        return message;
                    });
                };
                return Cryptobox;
            }());
            exports_4("Cryptobox", Cryptobox);
            Cryptobox.prototype.CHANNEL_CRYPTOBOX = "cryptobox";
            Cryptobox.prototype.TOPIC_NEW_PREKEYS = "new-prekeys";
        }
    }
});
System.register("store/Cache", ["wire-webapp-proteus"], function(exports_5, context_5) {
    "use strict";
    var __moduleName = context_5 && context_5.id;
    var Proteus;
    var Cache;
    return {
        setters:[
            function (Proteus_4) {
                Proteus = Proteus_4;
            }],
        execute: function() {
            Cache = (function () {
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
                    return new Promise(function (resolve, reject) {
                        if (_this.identity) {
                            resolve(_this.identity);
                        }
                        else {
                            reject(new Error("No local identity present."));
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
                            reject(new Error("PreKey with ID \"" + prekey_id + "\" not found."));
                        }
                    });
                };
                Cache.prototype.load_prekeys = function () {
                    var _this = this;
                    return new Promise(function (resolve) {
                        var all_prekeys = Object.keys(_this.prekeys).map(function (key) {
                            return _this.prekeys[key];
                        });
                        resolve(all_prekeys);
                    });
                };
                Cache.prototype.load_session = function (identity, session_id) {
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
                        Promise.all(savePromises).then(function () {
                            resolve(preKeys);
                        }).catch(reject);
                    });
                };
                Cache.prototype.save_session = function (session_id, session) {
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
                return Cache;
            }());
            exports_5("default", Cache);
        }
    }
});
System.register("store/SerialisedRecord", [], function(exports_6, context_6) {
    "use strict";
    var __moduleName = context_6 && context_6.id;
    var SerialisedRecord;
    return {
        setters:[],
        execute: function() {
            SerialisedRecord = (function () {
                function SerialisedRecord(serialised, id) {
                    this.id = id;
                    this.serialised = serialised;
                }
                return SerialisedRecord;
            }());
            exports_6("SerialisedRecord", SerialisedRecord);
        }
    }
});
System.register("store/IndexedDB", ["bazinga64", "wire-webapp-proteus", "dexie", 'logdown', "store/SerialisedRecord"], function(exports_7, context_7) {
    "use strict";
    var __moduleName = context_7 && context_7.id;
    var bazinga64, Proteus, dexie_1, Logdown, SerialisedRecord_1;
    var IndexedDB;
    return {
        setters:[
            function (bazinga64_1) {
                bazinga64 = bazinga64_1;
            },
            function (Proteus_5) {
                Proteus = Proteus_5;
            },
            function (dexie_1_1) {
                dexie_1 = dexie_1_1;
            },
            function (Logdown_2) {
                Logdown = Logdown_2;
            },
            function (SerialisedRecord_1_1) {
                SerialisedRecord_1 = SerialisedRecord_1_1;
            }],
        execute: function() {
            IndexedDB = (function () {
                function IndexedDB(identifier) {
                    var _this = this;
                    this.prekeys = {};
                    this.TABLE = {
                        LOCAL_IDENTITY: "keys",
                        PRE_KEYS: "prekeys",
                        SESSIONS: "sessions"
                    };
                    this.localIdentityKey = 'local_identity';
                    this.logger = new Logdown.default({ prefix: 'cryptobox.store.IndexedDB', alignOuput: true });
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
                        _this.logger.warn("Database access to \"" + _this.db.name + "\" got blocked.", event);
                        _this.db.close();
                    });
                }
                IndexedDB.prototype.init = function () {
                    this.logger.log("Connecting to IndexedDB database \"" + this.db.name + "\"...");
                    return this.db.open();
                };
                IndexedDB.prototype.delete = function (store_name, primary_key) {
                    var _this = this;
                    return new dexie_1.default.Promise(function (resolve) {
                        _this.validate_store(store_name).then(function (store) {
                            return store.delete(primary_key);
                        }).then(function () {
                            resolve(primary_key);
                        });
                    });
                };
                IndexedDB.prototype.load = function (store_name, primary_key) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        _this.validate_store(store_name)
                            .then(function (store) {
                            return store.get(primary_key);
                        }).then(function (record) {
                            if (record) {
                                _this.logger.log("Loaded record \"" + primary_key + "\" from store \"" + store_name + "\".", record);
                                resolve(record);
                            }
                            else {
                                reject(new Error("Record \"" + primary_key + "\" not found in store \"" + store_name + "\"."));
                            }
                        }).catch(reject);
                    });
                };
                IndexedDB.prototype.save = function (store_name, primary_key, entity) {
                    var _this = this;
                    return new dexie_1.default.Promise(function (resolve) {
                        _this.validate_store(store_name).then(function (store) {
                            return store.put(entity, primary_key);
                        }).then(function (key) {
                            _this.logger.log("Saved record \"" + primary_key + "\" into store \"" + store_name + "\".", entity);
                            resolve(key);
                        });
                    });
                };
                IndexedDB.prototype.validate_store = function (store_name) {
                    var _this = this;
                    return new dexie_1.default.Promise(function (resolve, reject) {
                        if (_this.db[store_name]) {
                            resolve(_this.db[store_name]);
                        }
                        else {
                            reject(new Error("Data store \"" + store_name + "\" not found."));
                        }
                    });
                };
                IndexedDB.prototype.delete_all = function () {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        _this.logger.info("Deleting \"" + _this.db.name + "\".");
                        _this.db.delete()
                            .then(function () {
                            resolve(true);
                        })
                            .catch(reject);
                    });
                };
                IndexedDB.prototype.delete_prekey = function (prekey_id) {
                    var _this = this;
                    return new Promise(function (resolve) {
                        _this.delete(_this.TABLE.PRE_KEYS, prekey_id.toString()).then(function (primary_key) {
                            resolve(primary_key);
                        });
                    });
                };
                IndexedDB.prototype.delete_session = function (session_id) {
                    var _this = this;
                    return new Promise(function (resolve) {
                        _this.delete(_this.TABLE.SESSIONS, session_id).then(function (primary_key) {
                            resolve(primary_key);
                        });
                    });
                };
                IndexedDB.prototype.load_identity = function () {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        _this.load(_this.TABLE.LOCAL_IDENTITY, _this.localIdentityKey).then(function (payload) {
                            if (payload) {
                                var bytes = bazinga64.Decoder.fromBase64(payload.serialised).asBytes;
                                var identity = Proteus.keys.IdentityKeyPair.deserialise(bytes.buffer);
                                resolve(identity);
                            }
                            else {
                                reject(new Error("No local identity present."));
                            }
                        }).catch(reject);
                    });
                };
                IndexedDB.prototype.load_prekey = function (prekey_id) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        _this.load(_this.TABLE.PRE_KEYS, prekey_id.toString()).then(function (record) {
                            var bytes = bazinga64.Decoder.fromBase64(record.serialised).asBytes;
                            resolve(Proteus.keys.PreKey.deserialise(bytes.buffer));
                        }).catch(reject);
                    });
                };
                IndexedDB.prototype.load_prekeys = function () {
                    var _this = this;
                    return new dexie_1.default.Promise(function (resolve, reject) {
                        _this.validate_store(_this.TABLE.PRE_KEYS).then(function (store) {
                            return store.toArray();
                        }).then(function (records) {
                            var preKeys = [];
                            records.forEach(function (record) {
                                var bytes = bazinga64.Decoder.fromBase64(record.serialised).asBytes;
                                var preKey = Proteus.keys.PreKey.deserialise(bytes.buffer);
                                preKeys.push(preKey);
                            });
                            resolve(preKeys);
                        }).catch(reject);
                    });
                };
                IndexedDB.prototype.load_session = function (identity, session_id) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        _this.load(_this.TABLE.SESSIONS, session_id).then(function (payload) {
                            var bytes = bazinga64.Decoder.fromBase64(payload.serialised).asBytes;
                            resolve(Proteus.session.Session.deserialise(identity, bytes.buffer));
                        }).catch(reject);
                    });
                };
                IndexedDB.prototype.save_identity = function (identity) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        _this.identity = identity;
                        var serialised = bazinga64.Encoder.toBase64(identity.serialise()).asString;
                        var payload = new SerialisedRecord_1.SerialisedRecord(serialised, _this.localIdentityKey);
                        _this.save(_this.TABLE.LOCAL_IDENTITY, payload.id, payload).then(function (primaryKey) {
                            var fingerprint = identity.public_key.fingerprint();
                            var message = ("Saved local identity \"" + fingerprint + "\"")
                                + (" with key \"" + primaryKey + "\" into storage \"" + _this.TABLE.LOCAL_IDENTITY + "\"");
                            _this.logger.log(message);
                            resolve(identity);
                        }).catch(reject);
                    });
                };
                IndexedDB.prototype.save_prekey = function (prekey) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        _this.prekeys[prekey.key_id] = prekey;
                        var serialised = bazinga64.Encoder.toBase64(prekey.serialise()).asString;
                        var payload = new SerialisedRecord_1.SerialisedRecord(serialised, prekey.key_id.toString());
                        _this.save(_this.TABLE.PRE_KEYS, payload.id, payload).then(function (primaryKey) {
                            var message = "Saved PreKey with ID \"" + prekey.key_id + "\" into storage \"" + _this.TABLE.PRE_KEYS + "\"";
                            _this.logger.log(message);
                            resolve(prekey);
                        }).catch(reject);
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
                            var serialised = bazinga64.Encoder.toBase64(preKey.serialise()).asString;
                            var key = preKey.key_id.toString();
                            var payload = new SerialisedRecord_1.SerialisedRecord(serialised, key);
                            items.push(payload);
                            keys.push(key);
                        });
                        _this.validate_store(_this.TABLE.PRE_KEYS).then(function (store) {
                            return store.bulkAdd(items, keys);
                        }).then(function () {
                            _this.logger.log("Saved a batch of \"" + items.length + "\" PreKeys. From ID \"" + items[0].id + "\" to ID \"" + items[items.length - 1].id + "\".", items);
                            resolve(prekeys);
                        }).catch(reject);
                    });
                };
                IndexedDB.prototype.save_session = function (session_id, session) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        var serialised = bazinga64.Encoder.toBase64(session.serialise()).asString;
                        var payload = new SerialisedRecord_1.SerialisedRecord(serialised, session_id);
                        _this.save(_this.TABLE.SESSIONS, payload.id, payload).then(function (primaryKey) {
                            var message = "Saved session ID \"" + session_id + "\" into storage \"" + _this.TABLE.SESSIONS + "\" with key \"" + primaryKey + "\".";
                            _this.logger.log(message);
                            resolve(session);
                        }).catch(reject);
                    });
                };
                return IndexedDB;
            }());
            exports_7("default", IndexedDB);
        }
    }
});
System.register("store/LocalStorage", ["bazinga64", "wire-webapp-proteus", "store/SerialisedRecord"], function(exports_8, context_8) {
    "use strict";
    var __moduleName = context_8 && context_8.id;
    var bazinga64, Proteus, SerialisedRecord_2;
    var LocalStorage;
    return {
        setters:[
            function (bazinga64_2) {
                bazinga64 = bazinga64_2;
            },
            function (Proteus_6) {
                Proteus = Proteus_6;
            },
            function (SerialisedRecord_2_1) {
                SerialisedRecord_2 = SerialisedRecord_2_1;
            }],
        execute: function() {
            LocalStorage = (function () {
                function LocalStorage(identifier) {
                    if (identifier === void 0) { identifier = "temp"; }
                    this.localIdentityKey = 'local_identity';
                    if (typeof localStorage === "undefined") {
                        var warning = "Local Storage isn't supported by your platform.";
                        throw new Error(warning);
                    }
                    else {
                        this.localIdentityStore = "cryptobox@" + identifier + "@identity";
                        this.preKeyStore = "cryptobox@" + identifier + "@prekey";
                        this.sessionStore = "cryptobox@" + identifier + "@session";
                        this.storage = localStorage;
                    }
                }
                LocalStorage.prototype.delete = function (store_name, primary_key) {
                    var _this = this;
                    return new Promise(function (resolve) {
                        var key = store_name + "@" + primary_key;
                        _this.storage.removeItem(key);
                        resolve(key);
                    });
                };
                LocalStorage.prototype.load = function (store_name, primary_key) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        var item = _this.storage.getItem(store_name + "@" + primary_key);
                        if (item) {
                            resolve(item);
                        }
                        else {
                            reject(new Error("Item \"" + primary_key + "\" not found in \"" + store_name + "\"."));
                        }
                    });
                };
                ;
                LocalStorage.prototype.save = function (store_name, primary_key, entity) {
                    var _this = this;
                    return new Promise(function (resolve) {
                        var key = store_name + "@" + primary_key;
                        _this.storage.setItem(key, entity);
                        resolve(key);
                    });
                };
                LocalStorage.prototype.delete_all = function () {
                    var _this = this;
                    return new Promise(function (resolve) {
                        var removed_items = false;
                        Object.keys(localStorage).forEach(function (key) {
                            if (key.indexOf(_this.localIdentityStore) > -1 ||
                                key.indexOf(_this.preKeyStore) > -1 ||
                                key.indexOf(_this.sessionStore) > -1) {
                                removed_items = true;
                                localStorage.removeItem(key);
                            }
                        });
                        resolve(removed_items);
                    });
                };
                LocalStorage.prototype.delete_prekey = function (prekey_id) {
                    return this.delete(this.preKeyStore, prekey_id.toString());
                };
                LocalStorage.prototype.delete_session = function (session_id) {
                    return this.delete(this.sessionStore, session_id);
                };
                LocalStorage.prototype.load_identity = function () {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        _this.load(_this.localIdentityStore, _this.localIdentityKey).then(function (payload) {
                            if (payload) {
                                var bytes = bazinga64.Decoder.fromBase64(payload).asBytes;
                                var ikp = Proteus.keys.IdentityKeyPair.deserialise(bytes.buffer);
                                resolve(ikp);
                            }
                            else {
                                reject(new Error("No local identity present."));
                            }
                        }).catch(reject);
                    });
                };
                LocalStorage.prototype.load_prekey = function (prekey_id) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        _this.load(_this.preKeyStore, prekey_id.toString()).then(function (serialised) {
                            var bytes = bazinga64.Decoder.fromBase64(serialised).asBytes;
                            resolve(Proteus.keys.PreKey.deserialise(bytes.buffer));
                        }).catch(reject);
                    });
                };
                LocalStorage.prototype.load_prekeys = function () {
                    var _this = this;
                    var prekey_promises = [];
                    Object.keys(localStorage).forEach(function (key) {
                        if (key.indexOf(_this.preKeyStore) > -1) {
                            var separator = '@';
                            var prekey_id = key.substr(key.lastIndexOf(separator) + separator.length);
                            var promise = _this.load_prekey(parseInt(prekey_id));
                            prekey_promises.push(promise);
                        }
                    });
                    return Promise.all(prekey_promises);
                };
                LocalStorage.prototype.load_session = function (identity, session_id) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        _this.load(_this.sessionStore, session_id).then(function (serialised) {
                            var bytes = bazinga64.Decoder.fromBase64(serialised).asBytes;
                            resolve(Proteus.session.Session.deserialise(identity, bytes.buffer));
                        }).catch(reject);
                    });
                };
                LocalStorage.prototype.save_identity = function (identity) {
                    var _this = this;
                    var fingerprint = identity.public_key.fingerprint();
                    var serialised = bazinga64.Encoder.toBase64(identity.serialise()).asString;
                    var payload = new SerialisedRecord_2.SerialisedRecord(serialised, this.localIdentityKey);
                    return new Promise(function (resolve, reject) {
                        _this.save(_this.localIdentityStore, payload.id, payload.serialised).then(function (key) {
                            var message = "Saved local identity \"" + fingerprint + "\" with key \"" + key + "\".";
                            resolve(identity);
                        }).catch(reject);
                    });
                };
                LocalStorage.prototype.save_prekey = function (preKey) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        var serialised = bazinga64.Encoder.toBase64(preKey.serialise()).asString;
                        var payload = new SerialisedRecord_2.SerialisedRecord(serialised, preKey.key_id.toString());
                        _this.save(_this.preKeyStore, payload.id, payload.serialised).then(function () {
                            resolve(preKey);
                        }).catch(reject);
                    });
                };
                LocalStorage.prototype.save_prekeys = function (preKeys) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        var savePromises = [];
                        preKeys.forEach(function (preKey) {
                            savePromises.push(_this.save_prekey(preKey));
                        });
                        Promise.all(savePromises).then(function () {
                            resolve(preKeys);
                        }).catch(reject);
                    });
                };
                LocalStorage.prototype.save_session = function (session_id, session) {
                    var _this = this;
                    return new Promise(function (resolve, reject) {
                        var serialised = bazinga64.Encoder.toBase64(session.serialise()).asString;
                        var payload = new SerialisedRecord_2.SerialisedRecord(serialised, session_id);
                        _this.save(_this.sessionStore, payload.id, payload.serialised).then(function () {
                            resolve(session);
                        }).catch(reject);
                    });
                };
                return LocalStorage;
            }());
            exports_8("default", LocalStorage);
        }
    }
});
System.register("wire-webapp-cryptobox", ["store/Cache", "store/IndexedDB", "store/LocalStorage", "Cryptobox", "store/ReadOnlyStore", "CryptoboxSession"], function(exports_9, context_9) {
    "use strict";
    var __moduleName = context_9 && context_9.id;
    var Cache_1, IndexedDB_1, LocalStorage_1, Cryptobox_1, ReadOnlyStore_2, CryptoboxSession_2;
    return {
        setters:[
            function (Cache_1_1) {
                Cache_1 = Cache_1_1;
            },
            function (IndexedDB_1_1) {
                IndexedDB_1 = IndexedDB_1_1;
            },
            function (LocalStorage_1_1) {
                LocalStorage_1 = LocalStorage_1_1;
            },
            function (Cryptobox_1_1) {
                Cryptobox_1 = Cryptobox_1_1;
            },
            function (ReadOnlyStore_2_1) {
                ReadOnlyStore_2 = ReadOnlyStore_2_1;
            },
            function (CryptoboxSession_2_1) {
                CryptoboxSession_2 = CryptoboxSession_2_1;
            }],
        execute: function() {
            exports_9("default",{
                Cryptobox: Cryptobox_1.Cryptobox,
                CryptoboxSession: CryptoboxSession_2.CryptoboxSession,
                store: {
                    Cache: Cache_1.default,
                    IndexedDB: IndexedDB_1.default,
                    LocalStorage: LocalStorage_1.default,
                    ReadOnlyStore: ReadOnlyStore_2.ReadOnlyStore
                }
            });
        }
    }
});
