import * as bazinga64 from "bazinga64";
import * as Proteus from "wire-webapp-proteus";
import Dexie from "dexie";
import Logdown = require('logdown');
import {CryptoboxStore} from "./CryptoboxStore";
import {SerialisedRecord} from "./SerialisedRecord";
import {RecordNotFoundError} from "./RecordNotFoundError";

export default class IndexedDB implements CryptoboxStore {

  public identity: Proteus.keys.IdentityKeyPair;

  private db: Dexie;
  private prekeys: Object = {};
  private TABLE = {
    LOCAL_IDENTITY: "keys",
    PRE_KEYS: "prekeys",
    SESSIONS: "sessions"
  };
  private logger: Logdown;

  private localIdentityKey: string = 'local_identity';

  constructor(identifier: string | Dexie) {
    this.logger = new Logdown({prefix: 'cryptobox.store.IndexedDB', alignOutput: true});

    if (typeof indexedDB === "undefined") {
      let warning = `IndexedDB isn't supported by your platform.`;
      throw new Error(warning);
    }

    if (typeof identifier === 'string') {
      let schema: {[key: string]: string;} = {};
      schema[this.TABLE.LOCAL_IDENTITY] = '';
      schema[this.TABLE.PRE_KEYS] = '';
      schema[this.TABLE.SESSIONS] = '';

      this.db = new Dexie(`cryptobox@${identifier}`);
      this.db.version(1).stores(schema);
    } else {
      this.db = identifier;
      this.logger.log(`Using cryptobox with existing database "${this.db.name}".`);
    }

    this.db.on('blocked', (event) => {
      this.logger.warn(`Database access to "${this.db.name}" got blocked.`, event);
      this.db.close();
    });
  }

  public init(): Dexie.Promise<Dexie> {
    this.logger.log(`Connecting to IndexedDB database "${this.db.name}"...`);
    return this.db.open();
  }

  private delete(store_name: string, primary_key: string|any): Dexie.Promise<string> {
    return new Dexie.Promise((resolve) => {
      this.validate_store(store_name)
        .then((store: Dexie.Table<any, any>) => {
          return store.delete(primary_key);
        })
        .then(() => {
          resolve(primary_key);
        });
    });
  }

  private load(store_name: string, primary_key: string): Promise<Object> {
    return new Promise((resolve, reject) => {
      this.validate_store(store_name)
        .then((store: Dexie.Table<any, any>) => {
          this.logger.log(`Trying to load record "${primary_key}" from object store "${store_name}".`);
          return store.get(primary_key);
        })
        .then((record: any) => {
          if (record) {
            this.logger.log(`Loaded record "${primary_key}" from object store "${store_name}".`, record);
            resolve(record);
          } else {
            let message: string = `Record "${primary_key}" from object store "${store_name}" could not be found.`;
            this.logger.warn(message);
            reject(new RecordNotFoundError(message));
          }
        })
        .catch(reject);
    });
  }

  private save(store_name: string, primary_key: string, entity: Object): Dexie.Promise<string> {
    return new Dexie.Promise((resolve) => {
      this.validate_store(store_name)
        .then((store: Dexie.Table<any, any>) => {
          return store.put(entity, primary_key);
        })
        .then((key: any) => {
          this.logger.log(`Put record "${primary_key}" into object store "${store_name}".`, entity);
          resolve(key);
        });
    });
  }

  private save_once(store_name: string, primary_key: string, entity: Object): Dexie.Promise<string> {
    return new Dexie.Promise((resolve) => {
      this.validate_store(store_name)
        .then((store: Dexie.Table<any, any>) => {
          return store.add(entity, primary_key);
        })
        .then((key: any) => {
          this.logger.log(`Added record "${primary_key}" into object store "${store_name}".`, entity);
          resolve(key);
        });
    });
  }

  private validate_store(store_name: string): Dexie.Promise<Dexie.Table<any, any>> {
    return new Dexie.Promise((resolve, reject) => {
      if (this.db[store_name]) {
        resolve(this.db[store_name]);
      } else {
        reject(new Error(`Object store "${store_name}" not found.`));
      }
    });
  }

  public delete_all(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.logger.info(`Deleting "${this.db.name}".`);
      this.db.delete()
        .then(function () {
          resolve(true);
        })
        .catch(reject);
    });
  }

  public delete_prekey(prekey_id: number): Promise<number> {
    return new Promise((resolve) => {
      this.delete(this.TABLE.PRE_KEYS, prekey_id.toString())
        .then(function () {
          resolve(prekey_id);
        });
    });
  }

  public delete_session(session_id: string): Promise<string> {
    return new Promise((resolve) => {
      this.delete(this.TABLE.SESSIONS, session_id)
        .then((primary_key: string) => {
          resolve(primary_key);
        });
    });
  }

  public load_identity(): Promise<Proteus.keys.IdentityKeyPair> {
    return new Promise((resolve, reject) => {
      this.load(this.TABLE.LOCAL_IDENTITY, this.localIdentityKey)
        .then((record: SerialisedRecord) => {
          let bytes: Uint8Array = bazinga64.Decoder.fromBase64(record.serialised).asBytes;
          let identity: Proteus.keys.IdentityKeyPair = Proteus.keys.IdentityKeyPair.deserialise(bytes.buffer);
          resolve(identity);
        })
        .catch(function (error: Error) {
          if (error instanceof RecordNotFoundError) {
            resolve(undefined);
          } else {
            reject(error);
          }
        });
    });
  }

  public load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey> {
    return new Promise((resolve, reject) => {
      this.load(this.TABLE.PRE_KEYS, prekey_id.toString())
        .then((record: SerialisedRecord) => {
          let bytes: Uint8Array = bazinga64.Decoder.fromBase64(record.serialised).asBytes;
          resolve(Proteus.keys.PreKey.deserialise(bytes.buffer));
        })
        .catch(function (error: Error) {
          if (error instanceof RecordNotFoundError) {
            resolve(undefined);
          } else {
            reject(error);
          }
        });
    });
  }

  // TODO: Option to keep PreKeys in memory
  public load_prekeys(): Promise<Array<Proteus.keys.PreKey>> {
    return new Promise((resolve, reject) => {
      this.validate_store(this.TABLE.PRE_KEYS)
        .then((store: Dexie.Table<any, any>) => {
          return store.toArray();
        })
        // TODO: Make records an "Array<SerialisedRecord>"
        .then((records: any) => {
          let preKeys: any = [];

          records.forEach((record: SerialisedRecord) => {
            let bytes: Uint8Array = bazinga64.Decoder.fromBase64(record.serialised).asBytes;
            let preKey: Proteus.keys.PreKey = Proteus.keys.PreKey.deserialise(bytes.buffer);
            preKeys.push(preKey);
          });

          resolve(preKeys);
        })
        .catch(reject);
    });
  }

  public load_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session> {
    return new Promise((resolve, reject) => {
      this.load(this.TABLE.SESSIONS, session_id)
        .then((payload: SerialisedRecord) => {
          let bytes = bazinga64.Decoder.fromBase64(payload.serialised).asBytes;
          resolve(Proteus.session.Session.deserialise(identity, bytes.buffer));
        })
        .catch(reject);
    });
  }

  public save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair> {
    return new Promise((resolve, reject) => {
      this.identity = identity;

      let serialised: string = bazinga64.Encoder.toBase64(identity.serialise()).asString;
      let payload: SerialisedRecord = new SerialisedRecord(serialised, this.localIdentityKey);

      this.save_once(this.TABLE.LOCAL_IDENTITY, payload.id, payload)
        .then((primaryKey: string) => {
          let fingerprint: string = identity.public_key.fingerprint();
          let message = `Saved local identity "${fingerprint}"`
            + ` with key "${primaryKey}" into object store "${this.TABLE.LOCAL_IDENTITY}".`;
          this.logger.log(message);
          resolve(identity);
        })
        .catch(reject);
    });
  }

  public save_prekey(prekey: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey> {
    return new Promise((resolve, reject) => {
      this.prekeys[prekey.key_id] = prekey;

      let serialised: string = bazinga64.Encoder.toBase64(prekey.serialise()).asString;
      let payload: SerialisedRecord = new SerialisedRecord(serialised, prekey.key_id.toString());

      this.save(this.TABLE.PRE_KEYS, payload.id, payload)
        .then((primaryKey: string) => {
          let message = `Saved PreKey (ID "${prekey.key_id}") with key "${primaryKey}" into object store "${this.TABLE.PRE_KEYS}".`;
          this.logger.log(message);
          resolve(prekey);
        })
        .catch(reject);
    });
  }

  public save_prekeys(prekeys: Array<Proteus.keys.PreKey>): Promise<Array<Proteus.keys.PreKey>> {
    return new Promise((resolve, reject) => {
      if (prekeys.length === 0) {
        resolve(prekeys);
      }

      let items: Array<SerialisedRecord> = [];
      let keys: Array<string> = [];

      prekeys.forEach(function (preKey: Proteus.keys.PreKey) {
        let serialised: string = bazinga64.Encoder.toBase64(preKey.serialise()).asString;
        let key: string = preKey.key_id.toString();
        let payload: SerialisedRecord = new SerialisedRecord(serialised, key);
        items.push(payload);
        keys.push(key);
      });

      this.validate_store(this.TABLE.PRE_KEYS)
        .then((store: Dexie.Table<any, any>) => {
          this.logger.log(`Saving a batch of "${items.length}" PreKeys (${keys.join(', ')}) into object store "${store.name}"...`, prekeys);
          return store.bulkPut(items, keys);
        })
        .then(() => {
          this.logger.log(`Saved a batch of "${items.length}" PreKeys (${keys.join(', ')}).`, items);
          resolve(prekeys);
        })
        .catch(reject);
    });
  }

  public save_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session> {
    return new Promise((resolve, reject) => {
      let serialised: string = bazinga64.Encoder.toBase64(session.serialise()).asString;
      let payload: SerialisedRecord = new SerialisedRecord(serialised, session_id);

      this.save(this.TABLE.SESSIONS, payload.id, payload)
        .then((primaryKey: string) => {
          let message = `Saved session ID "${session_id}" into storage "${this.TABLE.SESSIONS}" with key "${primaryKey}".`;
          this.logger.log(message);
          resolve(session);
        })
        .catch(reject);
    });
  }
}
