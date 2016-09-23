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

System.register(["dexie", "bazinga64", "wire-webapp-proteus"], function(exports_1, context_1) {
    "use strict";
    var __moduleName = context_1 && context_1.id;
    var __extends = (this && this.__extends) || function (d, b) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
    var dexie_1, bazinga64, Proteus;
    var store, CryptoboxSession, Cryptobox;
    return {
        setters:[
            function (dexie_1_1) {
                dexie_1 = dexie_1_1;
            },
            function (bazinga64_1) {
                bazinga64 = bazinga64_1;
            },
            function (Proteus_1) {
                Proteus = Proteus_1;
            }],
        execute: function() {
            (function (store_1) {
                var Cache = (function () {
                    function Cache() {
                        this.preKeyStore = {};
                        this.sessionStore = {};
                    }
                    Cache.prototype.delete_all = function () {
                        var _this = this;
                        return new Promise(function (resolve) {
                            _this.identity = undefined;
                            _this.preKeyStore = {};
                            _this.sessionStore = {};
                            resolve(true);
                        });
                    };
                    Cache.prototype.delete_prekey = function (prekey_id) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            delete _this.preKeyStore[prekey_id];
                            resolve(prekey_id);
                        });
                    };
                    Cache.prototype.delete_session = function (session_id) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            delete _this.sessionStore[session_id];
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
                            var serialised = _this.preKeyStore[prekey_id];
                            if (serialised) {
                                resolve(Proteus.keys.PreKey.deserialise(serialised));
                            }
                            else {
                                reject(new Error("Didn't find pre-key with ID '" + prekey_id + "'."));
                            }
                        });
                    };
                    Cache.prototype.load_session = function (identity, session_id) {
                        var _this = this;
                        return new Promise(function (resolve, reject) {
                            var serialised = _this.sessionStore[session_id];
                            if (serialised) {
                                resolve(Proteus.session.Session.deserialise(identity, serialised));
                            }
                            else {
                                reject(new Error("Didn't find pre-key with ID '" + session_id + "'."));
                            }
                        });
                    };
                    Cache.prototype.save_identity = function (identity) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            _this.identity = identity;
                            resolve(_this.identity.public_key.fingerprint());
                        });
                    };
                    Cache.prototype.save_prekey = function (key) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            _this.preKeyStore[key.key_id] = key.serialise();
                            resolve(key);
                        });
                    };
                    Cache.prototype.save_session = function (session_id, session) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            _this.sessionStore[session_id] = session.serialise();
                            resolve(session_id);
                        });
                    };
                    return Cache;
                }());
                store_1.Cache = Cache;
                var IndexedDB = (function () {
                    function IndexedDB(identifier) {
                        var _this = this;
                        this.prekeys = {};
                        this.identity = undefined;
                        this.TABLE = {
                            LOCAL_IDENTITY: "keys",
                            PRE_KEYS: "prekeys",
                            SESSIONS: "sessions"
                        };
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
                            console.warn("Database access to '" + _this.db.name + "' got blocked.", event);
                            _this.db.close();
                        });
                    }
                    IndexedDB.prototype.init = function () {
                        console.info("Connecting to '" + this.db.name + "'.");
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
                        return new dexie_1.default.Promise(function (resolve) {
                            _this.validate_store(store_name).then(function (store) {
                                return store.get(primary_key);
                            }).then(function (record) {
                                resolve(record);
                            });
                        });
                    };
                    IndexedDB.prototype.save = function (store_name, primary_key, entity) {
                        var _this = this;
                        return new dexie_1.default.Promise(function (resolve) {
                            _this.validate_store(store_name).then(function (store) {
                                return store.put(entity, primary_key);
                            }).then(function (key) {
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
                                reject(new Error("Data store '" + store_name + "' not found."));
                            }
                        });
                    };
                    IndexedDB.prototype.delete_all = function () {
                        var _this = this;
                        return new Promise(function (resolve, reject) {
                            console.info("Deleting '" + _this.db.name + "'.");
                            _this.db.delete()
                                .then(function () {
                                resolve(true);
                            })
                                .catch(function (error) {
                                reject(error);
                            });
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
                            _this.load(_this.TABLE.LOCAL_IDENTITY, 'local_identity').then(function (payload) {
                                if (payload) {
                                    var bytes = bazinga64.Decoder.fromBase64(payload.serialised).asBytes;
                                    var identity = Proteus.keys.IdentityKeyPair.deserialise(bytes.buffer);
                                    resolve(identity);
                                }
                                else {
                                    reject(new Error("No local identity present."));
                                }
                            });
                        });
                    };
                    IndexedDB.prototype.load_prekey = function (prekey_id) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            _this.load(_this.TABLE.PRE_KEYS, prekey_id.toString()).then(function (payload) {
                                var bytes = bazinga64.Decoder.fromBase64(payload.serialised).asBytes;
                                resolve(Proteus.keys.PreKey.deserialise(bytes.buffer));
                            });
                        });
                    };
                    IndexedDB.prototype.load_session = function (identity, session_id) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            _this.load(_this.TABLE.SESSIONS, session_id).then(function (payload) {
                                var bytes = bazinga64.Decoder.fromBase64(payload.serialised).asBytes;
                                resolve(Proteus.session.Session.deserialise(identity, bytes.buffer));
                            });
                        });
                    };
                    IndexedDB.prototype.save_identity = function (identity) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            _this.identity = identity;
                            var serialised = bazinga64.Encoder.toBase64(identity.serialise()).asString;
                            var payload = new SerialisedRecord(serialised, 'local_identity');
                            _this.save(_this.TABLE.LOCAL_IDENTITY, payload.id, payload).then(function (primaryKey) {
                                var fingerprint = identity.public_key.fingerprint();
                                var message = ("Saved local identity '" + fingerprint + "'")
                                    + (" with key '" + primaryKey + "' into storage '" + _this.TABLE.LOCAL_IDENTITY + "'");
                                resolve(fingerprint);
                            });
                        });
                    };
                    IndexedDB.prototype.save_prekey = function (prekey) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            _this.prekeys[prekey.key_id] = prekey;
                            var serialised = bazinga64.Encoder.toBase64(prekey.serialise()).asString;
                            var payload = new SerialisedRecord(serialised, prekey.key_id.toString());
                            _this.save(_this.TABLE.PRE_KEYS, payload.id, payload).then(function (primaryKey) {
                                var message = "Saved pre-key with ID '" + prekey.key_id + "' into storage '" + _this.TABLE.PRE_KEYS + "'";
                                resolve(primaryKey);
                            });
                        });
                    };
                    IndexedDB.prototype.save_session = function (session_id, session) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            var serialised = bazinga64.Encoder.toBase64(session.serialise()).asString;
                            var payload = new SerialisedRecord(serialised, session_id);
                            _this.save(_this.TABLE.SESSIONS, payload.id, payload).then(function (primaryKey) {
                                var message = "Saved session with key '" + session_id + "' into storage '" + _this.TABLE.SESSIONS + "'";
                                resolve(primaryKey);
                            });
                        });
                    };
                    return IndexedDB;
                }());
                store_1.IndexedDB = IndexedDB;
                var LocalStorage = (function () {
                    function LocalStorage(identifier) {
                        if (identifier === void 0) { identifier = "temp"; }
                        if (typeof localStorage === "undefined") {
                            var warning = "Local Storage isn't supported on your system.";
                        }
                        else {
                            this.localIdentityStore = "cryptobox-identity-" + identifier;
                            this.preKeyStore = "cryptobox-prekey-" + identifier;
                            this.sessionStore = "cryptobox-session-" + identifier;
                            this.storage = localStorage;
                        }
                    }
                    LocalStorage.prototype.delete = function (store_name, primary_key) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            var key = store_name + "-" + primary_key;
                            _this.storage.removeItem(key);
                            resolve(key);
                        });
                    };
                    LocalStorage.prototype.load = function (store_name, primary_key) {
                        var _this = this;
                        return new Promise(function (resolve, reject) {
                            var item = _this.storage.getItem(store_name + "-" + primary_key);
                            if (item) {
                                resolve(item);
                            }
                            else {
                                reject(new Error("Item '" + primary_key + "' not found in '" + store_name + "'."));
                            }
                        });
                    };
                    ;
                    LocalStorage.prototype.save = function (store_name, primary_key, entity) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            var key = store_name + "-" + primary_key;
                            _this.storage.setItem(key, entity);
                            resolve(key);
                        });
                    };
                    LocalStorage.prototype.delete_all = function () {
                        return new Promise(function (resolve) {
                            localStorage.clear();
                            resolve(true);
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
                            _this.load(_this.localIdentityStore, 'local').then(function (payload) {
                                if (payload) {
                                    var bytes = bazinga64.Decoder.fromBase64(payload).asBytes;
                                    var ikp = Proteus.keys.IdentityKeyPair.deserialise(bytes.buffer);
                                    resolve(ikp);
                                }
                                else {
                                    reject(new Error("No local identity present."));
                                }
                            });
                        });
                    };
                    LocalStorage.prototype.load_prekey = function (prekey_id) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            _this.load(_this.preKeyStore, prekey_id.toString()).then(function (serialised) {
                                var bytes = bazinga64.Decoder.fromBase64(serialised).asBytes;
                                resolve(Proteus.keys.PreKey.deserialise(bytes.buffer));
                            });
                        });
                    };
                    LocalStorage.prototype.load_session = function (identity, session_id) {
                        var _this = this;
                        return new Promise(function (resolve) {
                            _this.load(_this.sessionStore, session_id).then(function (serialised) {
                                var bytes = bazinga64.Decoder.fromBase64(serialised).asBytes;
                                resolve(Proteus.session.Session.deserialise(identity, bytes.buffer));
                            });
                        });
                    };
                    LocalStorage.prototype.save_identity = function (identity) {
                        var _this = this;
                        var fingerprint = identity.public_key.fingerprint();
                        var serialised = bazinga64.Encoder.toBase64(identity.serialise()).asString;
                        var payload = new SerialisedRecord(serialised, 'local');
                        return new Promise(function (resolve) {
                            _this.save(_this.localIdentityStore, payload.id, payload.serialised).then(function (key) {
                                var message = "Saved local identity '" + fingerprint + "' with key '" + key + "'.";
                                resolve(fingerprint);
                            });
                        });
                    };
                    LocalStorage.prototype.save_prekey = function (prekey) {
                        var serialised = bazinga64.Encoder.toBase64(prekey.serialise()).asString;
                        var payload = new SerialisedRecord(serialised, prekey.key_id.toString());
                        return this.save(this.preKeyStore, payload.id, payload.serialised);
                    };
                    LocalStorage.prototype.save_session = function (session_id, session) {
                        var serialised = bazinga64.Encoder.toBase64(session.serialise()).asString;
                        var payload = new SerialisedRecord(serialised, session_id);
                        return this.save(this.sessionStore, payload.id, payload.serialised);
                    };
                    return LocalStorage;
                }());
                store_1.LocalStorage = LocalStorage;
                var ReadOnlyStore = (function (_super) {
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
                                reject(new Error("PreKey '" + prekey_id + "' not found."));
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
                store_1.ReadOnlyStore = ReadOnlyStore;
                var SerialisedRecord = (function () {
                    function SerialisedRecord(serialised, id) {
                        this.id = id;
                        this.serialised = serialised;
                    }
                    return SerialisedRecord;
                }());
            })(store = store || (store = {}));
            exports_1("store", store);
            CryptoboxSession = (function () {
                function CryptoboxSession(id, pk_store, session) {
                    this.id = id;
                    this.pk_store = pk_store;
                    this.session = session;
                    Object.freeze(this);
                }
                CryptoboxSession.prototype.decrypt = function (ciphertext) {
                    var _this = this;
                    return new Promise(function (resolve) {
                        var envelope = Proteus.message.Envelope.deserialise(ciphertext);
                        _this.session.decrypt(_this.pk_store, envelope).then(function (plaintext) {
                            resolve(plaintext);
                        });
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
            exports_1("CryptoboxSession", CryptoboxSession);
            Cryptobox = (function () {
                function Cryptobox(cryptoBoxStore) {
                    this.store = cryptoBoxStore;
                    this.pk_store = new store.ReadOnlyStore(this.store);
                }
                Cryptobox.prototype.init = function () {
                    var _this = this;
                    return new Promise(function (resolve) {
                        _this.store.load_identity().catch(function () {
                            return Proteus.keys.IdentityKeyPair.new();
                        }).then(function (identity) {
                            _this.identity = identity;
                            Object.freeze(_this);
                            resolve(_this);
                        });
                    });
                };
                Cryptobox.prototype.session_from_prekey = function (client_id, pre_key_bundle) {
                    var _this = this;
                    return new Promise(function (resolve) {
                        var bundle = Proteus.keys.PreKeyBundle.deserialise(pre_key_bundle);
                        Proteus.session.Session.init_from_prekey(_this.identity, bundle).then(function (session) {
                            return resolve(new CryptoboxSession(client_id, _this.pk_store, session));
                        });
                    });
                };
                Cryptobox.prototype.session_from_message = function (session_id, envelope) {
                    var _this = this;
                    return new Promise(function (resolve) {
                        var env = Proteus.message.Envelope.deserialise(envelope);
                        Proteus.session.Session.init_from_message(_this.identity, _this.pk_store, env)
                            .then(function (tuple) {
                            var session = tuple[0];
                            var decrypted = tuple[1];
                            var cryptoBoxSession = new CryptoboxSession(session_id, _this.pk_store, session);
                            resolve([cryptoBoxSession, decrypted]);
                        });
                    });
                };
                Cryptobox.prototype.session_load = function (session_id) {
                    var _this = this;
                    return new Promise(function (resolve) {
                        _this.store.load_session(_this.identity, session_id).then(function (session) {
                            if (session) {
                                var pk_store = new store.ReadOnlyStore(_this.store);
                                var cryptoBoxSession = new CryptoboxSession(session_id, pk_store, session);
                                resolve(cryptoBoxSession);
                            }
                            else {
                                resolve(null);
                            }
                        });
                    });
                };
                Cryptobox.prototype.session_save = function (session) {
                    var _this = this;
                    return new Promise(function (resolve) {
                        _this.store.save_session(session.id, session.session).then(function () {
                            return Promise.all(session.pk_store.removed_prekeys.map(function (pk_id) { return _this.store.delete_prekey(pk_id); }));
                        }).then(function () {
                            resolve(session.id);
                        });
                    });
                };
                Cryptobox.prototype.session_delete = function (session_id) {
                    return this.store.delete_session(session_id);
                };
                Cryptobox.prototype.new_prekey = function (prekey_id) {
                    var _this = this;
                    return new Promise(function (resolve) {
                        var pk = Proteus.keys.PreKey.new(prekey_id);
                        _this.store.save_prekey(pk).then(function () {
                            var serialisedPreKeyBundle = Proteus.keys.PreKeyBundle.new(_this.identity.public_key, pk).serialise();
                            resolve(serialisedPreKeyBundle);
                        });
                    });
                };
                return Cryptobox;
            }());
            exports_1("Cryptobox", Cryptobox);
        }
    }
});
