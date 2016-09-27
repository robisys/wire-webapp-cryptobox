//
// Wire
// Copyright (C) 2016 Wire Swiss GmbH
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see http://www.gnu.org/licenses/.
//

/// <reference path="../../../typings/index.d.ts" />

import Dexie from "dexie";
import * as bazinga64 from "bazinga64";
import * as Proteus from "wire-webapp-proteus";

export module store {
  export interface CryptoboxStore {
    delete_all(): Promise<boolean>;

    /**
     * Deletes a specified pre-key.
     * @param prekey_id
     * @return Promise<string> Resolves with the "ID" from the record, which has been deleted.
     */
    delete_prekey(prekey_id: number): Promise<string>;

    /**
     * Deletes a specified session.
     * @param session_id
     * @return Promise<string> Resolves with the "ID" from the record, which has been deleted.
     */
    delete_session(session_id: string): Promise<string>;

    /**
     * Loads the local identity.
     * @return Promise<Proteus.keys.IdentityKeyPair> Resolves with the "key pair" from the local identity.
     */
    load_identity(): Promise<Proteus.keys.IdentityKeyPair>;

    /**
     * Loads a specified pre-key.
     * @param prekey_id
     * @return Promise<Proteus.keys.PreKey> Resolves with the the specified "pre-key".
     */
    load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;

    /**
     * Loads a specified session.
     * @param identity
     * @param session_id
     * @return Promise<Proteus.session.Session> Resolves with the the specified "session".
     */
    load_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session>;

    /**
     * Saves the local identity.
     * @param identity
     * @return Promise<string> Resolves with the "fingerprint" from the saved local identity.
     */
    save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<string>;

    /**
     * Saves a specified pre-key.
     * @param key
     * @return Promise<string> Resolves with the "ID" from the saved pre-key record.
     */
    save_prekey(key: Proteus.keys.PreKey): Promise<string>;

    /**
     * Saves a specified session.
     * @param session_id
     * @param session
     * @return Promise<string> Resolves with the "ID" from the saved session record.
     */
    save_session(session_id: string, session: Proteus.session.Session): Promise<string>;
  }

  export class Cache implements CryptoboxStore {
    private identity: Proteus.keys.IdentityKeyPair;
    private prekeys: Object = {};
    private sessions: Object = {};

    constructor() {
    }

    public delete_all(): Promise<boolean> {
      return new Promise((resolve) => {
        this.identity = undefined;
        this.prekeys = {};
        this.sessions = {};
        resolve(true);
      });
    }

    public delete_prekey(prekey_id: number): Promise<string> {
      return new Promise((resolve) => {
        delete this.prekeys[prekey_id];
        resolve(prekey_id);
      });
    }

    public delete_session(session_id: string): Promise<string> {
      return new Promise((resolve) => {
        delete this.sessions[session_id];
        resolve(session_id);
      });
    }

    public load_identity(): Promise<Proteus.keys.IdentityKeyPair> {
      return new Promise((resolve, reject) => {
        if (this.identity) {
          resolve(this.identity);
        } else {
          reject(new Error(`No local identity present.`));
        }
      });
    }

    public load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey> {
      return new Promise((resolve, reject) => {
        let serialised: ArrayBuffer = this.prekeys[prekey_id];
        if (serialised) {
          resolve(Proteus.keys.PreKey.deserialise(serialised));
        } else {
          reject(new Error(`PreKey with ID '${prekey_id}' not found.`));
        }
      });
    }

    public load_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session> {
      return new Promise((resolve, reject) => {
        let serialised: ArrayBuffer = this.sessions[session_id];
        if (serialised) {
          resolve(Proteus.session.Session.deserialise(identity, serialised));
        } else {
          reject(new Error(`Session with ID '${session_id}' not found.`));
        }
      });
    }

    public save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<string> {
      return new Promise((resolve) => {
        this.identity = identity;
        resolve(this.identity.public_key.fingerprint());
      });
    }

    public save_prekey(key: Proteus.keys.PreKey): Promise<string> {
      return new Promise((resolve, reject) => {

        try {
          this.prekeys[key.key_id] = key.serialise();
        } catch (error) {
          return reject(`PreKey serialization problem: '${error.message}'`);
        }

        resolve(key);
      });
    }

    public save_session(session_id: string, session: Proteus.session.Session): Promise<string> {
      return new Promise((resolve, reject) => {

        try {
          this.sessions[session_id] = session.serialise();
        } catch (error) {
          return reject(`Session serialization problem: '${error.message}'`);
        }

        resolve(session_id);
      });
    }
  }

  export class IndexedDB implements CryptoboxStore {

    public identity: Proteus.keys.IdentityKeyPair;

    private db: Dexie;
    private prekeys: Object = {};
    private TABLE = {
      LOCAL_IDENTITY: "keys",
      PRE_KEYS: "prekeys",
      SESSIONS: "sessions"
    };

    constructor(identifier: string | Dexie) {
      if (typeof indexedDB === "undefined") {
        let warning = `IndexedDB isn't supported by your platform.`;
        throw new Error(warning);
      }

      if (typeof identifier === 'string') {
        let schema: { [key: string]: string; } = {};
        schema[this.TABLE.LOCAL_IDENTITY] = '';
        schema[this.TABLE.PRE_KEYS] = '';
        schema[this.TABLE.SESSIONS] = '';

        this.db = new Dexie(`cryptobox@${identifier}`);
        this.db.version(1).stores(schema);
      } else {
        this.db = identifier;
      }

      this.db.on('blocked', (event) => {
        console.warn(`Database access to '${this.db.name}' got blocked.`, event);
        this.db.close();
      });
    }

    public init(): Dexie.Promise<Dexie> {
      console.info(`Connecting to '${this.db.name}'.`);
      return this.db.open();
    }

    private delete(store_name: string, primary_key: string|any): Dexie.Promise<string> {
      return new Dexie.Promise((resolve) => {
        this.validate_store(store_name).then((store: Dexie.Table<any, any>) => {
          return store.delete(primary_key);
        }).then(() => {
          resolve(primary_key);
        });
      });
    }

    private load(store_name: string, primary_key: string): Dexie.Promise<Object> {
      return new Dexie.Promise((resolve) => {
        this.validate_store(store_name).then((store: Dexie.Table<any, any>) => {
          return store.get(primary_key)
        }).then((record: any) => {
          resolve(record);
        });
      });
    }

    // TODO: Add return type to method signature
    private save(store_name: string, primary_key: string, entity: Object) {
      return new Dexie.Promise((resolve) => {
        this.validate_store(store_name).then((store: Dexie.Table<any, any>) => {
          return store.put(entity, primary_key);
        }).then((key: any) => {
          resolve(key);
        });
      });
    }

    private validate_store(store_name: string): Dexie.Promise<any> {
      return new Dexie.Promise((resolve, reject) => {
        if (this.db[store_name]) {
          resolve(this.db[store_name]);
        } else {
          reject(new Error(`Data store '${store_name}' not found.`));
        }
      });
    }

    public delete_all(): Promise<boolean> {
      return new Promise((resolve, reject) => {
        console.info(`Deleting '${this.db.name}'.`);
        this.db.delete()
          .then(function () {
            resolve(true);
          })
          .catch(reject);
      });
    }

    public delete_prekey(prekey_id: number): Promise<string> {
      return new Promise((resolve) => {
        this.delete(this.TABLE.PRE_KEYS, prekey_id.toString()).then((primary_key: string) => {
          resolve(primary_key);
        });
      });
    }

    public delete_session(session_id: string): Promise<string> {
      return new Promise((resolve) => {
        this.delete(this.TABLE.SESSIONS, session_id).then((primary_key: string) => {
          resolve(primary_key);
        });
      });
    }

    public load_identity(): Promise<Proteus.keys.IdentityKeyPair> {
      return new Promise((resolve, reject) => {
        this.load(this.TABLE.LOCAL_IDENTITY, 'local_identity').then((payload: SerialisedRecord) => {
          if (payload) {
            let bytes: Uint8Array = bazinga64.Decoder.fromBase64(payload.serialised).asBytes;
            let identity: Proteus.keys.IdentityKeyPair = Proteus.keys.IdentityKeyPair.deserialise(bytes.buffer);
            resolve(identity);
          } else {
            reject(new Error(`No local identity present.`));
          }
        });
      });
    }

    public load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey> {
      return new Promise((resolve) => {
        this.load(this.TABLE.PRE_KEYS, prekey_id.toString()).then((payload: SerialisedRecord) => {
          let bytes = bazinga64.Decoder.fromBase64(payload.serialised).asBytes;
          resolve(Proteus.keys.PreKey.deserialise(bytes.buffer));
        });
      });
    }

    public load_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session> {
      return new Promise((resolve) => {
        this.load(this.TABLE.SESSIONS, session_id).then((payload: SerialisedRecord) => {
          let bytes = bazinga64.Decoder.fromBase64(payload.serialised).asBytes;
          resolve(Proteus.session.Session.deserialise(identity, bytes.buffer));
        });
      });
    }

    public save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<string> {
      return new Promise((resolve) => {
        this.identity = identity;

        let serialised: string = bazinga64.Encoder.toBase64(identity.serialise()).asString;
        let payload: SerialisedRecord = new SerialisedRecord(serialised, 'local_identity');

        this.save(this.TABLE.LOCAL_IDENTITY, payload.id, payload).then((primaryKey: string) => {
          let fingerprint: string = identity.public_key.fingerprint();
          let message = `Saved local identity '${fingerprint}'`
            + ` with key '${primaryKey}' into storage '${this.TABLE.LOCAL_IDENTITY}'`;
          resolve(fingerprint);
        })
      });
    }

    public save_prekey(prekey: Proteus.keys.PreKey): Promise<string> {
      return new Promise((resolve) => {
        this.prekeys[prekey.key_id] = prekey;

        let serialised: string = bazinga64.Encoder.toBase64(prekey.serialise()).asString;
        let payload: SerialisedRecord = new SerialisedRecord(serialised, prekey.key_id.toString());

        this.save(this.TABLE.PRE_KEYS, payload.id, payload).then((primaryKey: string) => {
          let message = `Saved pre-key with ID '${prekey.key_id}' into storage '${this.TABLE.PRE_KEYS}'`;
          resolve(primaryKey);
        });
      });
    }

    public save_session(session_id: string, session: Proteus.session.Session): Promise<string> {
      return new Promise((resolve) => {
        let serialised: string = bazinga64.Encoder.toBase64(session.serialise()).asString;
        let payload: SerialisedRecord = new SerialisedRecord(serialised, session_id);

        this.save(this.TABLE.SESSIONS, payload.id, payload).then((primaryKey: string) => {
          let message = `Saved session with key '${session_id}' into storage '${this.TABLE.SESSIONS}'`;
          resolve(primaryKey);
        });
      });
    }
  }

  export class LocalStorage implements CryptoboxStore {
    private localIdentityStore: string;
    private preKeyStore: string;
    private sessionStore: string;
    private storage: Storage;

    constructor(identifier: string = "temp") {
      if (typeof localStorage === "undefined") {
        let warning = `Local Storage isn't supported by your platform.`;
        throw new Error(warning);
      } else {
        this.localIdentityStore = `cryptobox-identity-${identifier}`;
        this.preKeyStore = `cryptobox-prekey-${identifier}`;
        this.sessionStore = `cryptobox-session-${identifier}`;
        this.storage = localStorage;
      }
    }

    private delete(store_name: string, primary_key: string): Promise<string> {
      return new Promise((resolve) => {
        let key: string = `${store_name}-${primary_key}`;
        this.storage.removeItem(key);
        resolve(key);
      });
    }

    private load(store_name: string, primary_key: string): Promise<string> {
      return new Promise((resolve, reject) => {
        let item: string = this.storage.getItem(`${store_name}-${primary_key}`);
        if (item) {
          resolve(item);
        } else {
          reject(new Error(`Item '${primary_key}' not found in '${store_name}'.`));
        }
      });
    };

    private save(store_name: string, primary_key: string, entity: string): Promise<string> {
      return new Promise((resolve) => {
        let key: string = `${store_name}-${primary_key}`;
        this.storage.setItem(key, entity);
        resolve(key);
      });
    }

    public delete_all(): Promise<boolean> {
      return new Promise((resolve) => {
        // TODO: Don't clear the whole localStorage, only the keys necessary
        localStorage.clear();
        resolve(true);
      });
    }

    public delete_prekey(prekey_id: number): Promise<string> {
      return this.delete(this.preKeyStore, prekey_id.toString());
    }

    public delete_session(session_id: string): Promise<string> {
      return this.delete(this.sessionStore, session_id);
    }

    public load_identity(): Promise<Proteus.keys.IdentityKeyPair> {
      return new Promise((resolve, reject) => {
        this.load(this.localIdentityStore, 'local').then(function (payload: string) {
          if (payload) {
            let bytes = bazinga64.Decoder.fromBase64(payload).asBytes;
            let ikp: Proteus.keys.IdentityKeyPair = Proteus.keys.IdentityKeyPair.deserialise(bytes.buffer);
            resolve(ikp);
          } else {
            reject(new Error(`No local identity present.`));
          }
        });
      });
    }

    public load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey> {
      return new Promise((resolve) => {
        this.load(this.preKeyStore, prekey_id.toString()).then((serialised: string) => {
          let bytes = bazinga64.Decoder.fromBase64(serialised).asBytes;
          resolve(Proteus.keys.PreKey.deserialise(bytes.buffer));
        });
      });
    }

    public load_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session> {
      return new Promise((resolve) => {
        this.load(this.sessionStore, session_id).then((serialised: string) => {
          let bytes = bazinga64.Decoder.fromBase64(serialised).asBytes;
          resolve(Proteus.session.Session.deserialise(identity, bytes.buffer));
        });
      });
    }

    public save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<string> {
      let fingerprint: String = identity.public_key.fingerprint();
      let serialised: string = bazinga64.Encoder.toBase64(identity.serialise()).asString;
      let payload: SerialisedRecord = new SerialisedRecord(serialised, 'local');

      return new Promise((resolve) => {
        this.save(this.localIdentityStore, payload.id, payload.serialised).then(function (key: string) {
          let message = `Saved local identity '${fingerprint}' with key '${key}'.`;
          resolve(fingerprint);
        });
      });
    }

    public save_prekey(prekey: Proteus.keys.PreKey): Promise<string> {
      let serialised: string = bazinga64.Encoder.toBase64(prekey.serialise()).asString;
      let payload: SerialisedRecord = new SerialisedRecord(serialised, prekey.key_id.toString());
      return this.save(this.preKeyStore, payload.id, payload.serialised);
    }

    public save_session(session_id: string, session: Proteus.session.Session): Promise<string> {
      let serialised: string = bazinga64.Encoder.toBase64(session.serialise()).asString;
      let payload: SerialisedRecord = new SerialisedRecord(serialised, session_id);
      return this.save(this.sessionStore, payload.id, payload.serialised);
    }
  }

  export class ReadOnlyStore extends Proteus.session.PreKeyStore {
    public removed_prekeys: Array<number> = [];

    constructor(private store: store.CryptoboxStore) {
      super();
    }

    get_prekey(prekey_id: number): Promise<Proteus.keys.PreKey> {
      return new Promise((resolve, reject) => {
        if (this.removed_prekeys.indexOf(prekey_id) !== -1) {
          reject(new Error(`PreKey '${prekey_id}' not found.`));
        } else {
          this.store.load_prekey(prekey_id).then(function (pk: Proteus.keys.PreKey) {
            resolve(pk);
          });
        }
      });
    }

    remove(prekey_id: number): Promise<number> {
      this.removed_prekeys.push(prekey_id);
      return Promise.resolve(prekey_id);
    }
  }

  class SerialisedRecord {
    public id: string;
    public serialised: string;

    constructor(serialised: string, id: string) {
      this.id = id;
      this.serialised = serialised;
    }
  }
}

export class CryptoboxSession {
  public id: string;
  public pk_store: store.ReadOnlyStore;
  public session: Proteus.session.Session;

  constructor(id: string, pk_store: store.ReadOnlyStore, session: Proteus.session.Session) {
    this.id = id;
    this.pk_store = pk_store;
    this.session = session;
    Object.freeze(this);
  }

  // TODO: Make sure to save the session after decryption. To realize that, decryption & encryption should be
  // accessed via "Cryptobox" and not via "CryptoboxSession".
  public decrypt(ciphertext: ArrayBuffer): Promise<Uint8Array> {
    return new Promise((resolve) => {
      let envelope: Proteus.message.Envelope = Proteus.message.Envelope.deserialise(ciphertext);
      this.session.decrypt(this.pk_store, envelope).then(function (plaintext: Uint8Array) {
        resolve(plaintext);
      });
    });
  }

  // TODO: Make sure to save the session after encryption.
  public encrypt(plaintext: string|Uint8Array): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
      this.session.encrypt(plaintext).then(function (ciphertext: Proteus.message.Envelope) {
        resolve(ciphertext.serialise());
      });
    });
  }

  public fingerprint_local(): string {
    return this.session.local_identity.public_key.fingerprint();
  }

  public fingerprint_remote(): string {
    return this.session.remote_identity.fingerprint();
  }
}

export class Cryptobox {
  private cachedSessions: Object = {};
  private pk_store: store.ReadOnlyStore;
  private store: store.CryptoboxStore;

  public identity: Proteus.keys.IdentityKeyPair;

  constructor(cryptoBoxStore: store.CryptoboxStore) {
    this.store = cryptoBoxStore;
    this.pk_store = new store.ReadOnlyStore(this.store);
  }

  public init(): Promise<Cryptobox> {
    return new Promise((resolve) => {
      this.store.load_identity()
        .catch(function () {
          return Proteus.keys.IdentityKeyPair.new();
        })
        .then((identity) => {
          this.identity = identity;
        })
        .then(() => {
          Object.freeze(this);
          resolve(this);
        });
    });
  }

  public session_from_prekey(client_id: string, pre_key_bundle: ArrayBuffer): Promise<CryptoboxSession> {
    return new Promise((resolve) => {
      let bundle: Proteus.keys.PreKeyBundle = Proteus.keys.PreKeyBundle.deserialise(pre_key_bundle);
      Proteus.session.Session.init_from_prekey(this.identity, bundle).then((session: Proteus.session.Session) => {
        return resolve(new CryptoboxSession(client_id, this.pk_store, session));
      });
    });
  }

  // TODO: Turn "any" into a tuple
  public session_from_message(session_id: string, envelope: ArrayBuffer): Promise<Proteus.session.SessionFromMessageTuple> {
    return new Promise((resolve, reject) => {
      let env: Proteus.message.Envelope;

      try {
        env = Proteus.message.Envelope.deserialise(envelope);
      } catch (error) {
        return reject(error);
      }

      Proteus.session.Session.init_from_message(this.identity, this.pk_store, env)
        .then((tuple: Proteus.session.SessionFromMessageTuple) => {
          let session: Proteus.session.Session = tuple[0];
          let decrypted: Uint8Array = tuple[1];
          let cryptoBoxSession: CryptoboxSession = new CryptoboxSession(session_id, this.pk_store, session);
          resolve([cryptoBoxSession, decrypted]);
        })
        .catch(reject)
    });
  }

  public session_load(session_id: string): Promise<CryptoboxSession> {
    return new Promise((resolve, reject) => {
      if (this.cachedSessions[session_id]) {
        resolve(this.cachedSessions[session_id]);
      } else {
        this.store.load_session(this.identity, session_id)
          .then((session: Proteus.session.Session) => {
            if (session) {
              let pk_store: store.ReadOnlyStore = new store.ReadOnlyStore(this.store);
              let cryptoBoxSession: CryptoboxSession = new CryptoboxSession(session_id, pk_store, session);
              this.cachedSessions[session_id] = cryptoBoxSession;
              resolve(cryptoBoxSession);
            } else {
              reject(new Error(`Session with ID '${session}' not found.`));
            }
          })
          .catch(reject);
      }
    });
  }

  public session_save(session: CryptoboxSession): Promise<String> {
    return new Promise((resolve) => {
      this.store.save_session(session.id, session.session).then(() => {

        let prekey_deletions = [];
        session.pk_store.removed_prekeys.forEach((pk_id: number) => {
          prekey_deletions.push(this.store.delete_prekey(pk_id));
        });

        return Promise.all(prekey_deletions);
      }).then(() => {
        resolve(session.id);
      });
    });
  }

  public session_delete(session_id: string): Promise<string> {
    delete this.cachedSessions[session_id];
    return this.store.delete_session(session_id);
  }

  public new_prekey(prekey_id: number): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
      let pk: Proteus.keys.PreKey = Proteus.keys.PreKey.new(prekey_id);
      this.store.save_prekey(pk).then(() => {
        let serialisedPreKeyBundle: ArrayBuffer = Proteus.keys.PreKeyBundle.new(this.identity.public_key, pk).serialise();
        resolve(serialisedPreKeyBundle);
      });
    });
  }

  public encrypt(session: CryptoboxSession|string, payload: string|Uint8Array): Promise<ArrayBuffer> {
    return new Promise((resolve) => {

      let encryptedBuffer: ArrayBuffer;
      let loadedSession: CryptoboxSession;

      Promise.resolve().then(() => {
        if (typeof session === 'string') {
          return this.session_load(session);
        } else {
          return session;
        }
      }).then((session: CryptoboxSession) => {
        loadedSession = session;
        return loadedSession.encrypt(payload);
      }).then((encrypted: ArrayBuffer) => {
        encryptedBuffer = encrypted;
        return this.session_save(loadedSession);
      }).then(function () {
        resolve(encryptedBuffer);
      });

    });
  }

  public decrypt(session_id: string, ciphertext: ArrayBuffer): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      let message: Uint8Array;
      let session: CryptoboxSession;

      this.session_load(session_id)
        .catch(() => {
          return this.session_from_message(session_id, ciphertext);
        })
        // TODO: "value" can be of type CryptoboxSession|Proteus.session.SessionFromMessageTuple
        .then(function (value: any) {
          let decrypted_message: Uint8Array;

          if (value[0] !== undefined) {
            session = value[0];
            decrypted_message = value[1];
            return decrypted_message;
          } else {
            session = value;
            return value.decrypt(ciphertext);
          }
        })
        .then((decrypted_message) => {
          message = decrypted_message;
          return this.session_save(session);
        })
        .then(() => {
          resolve(message);
        })
        .catch(reject);
    });
  }
}
