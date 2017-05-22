import * as Proteus from "wire-webapp-proteus";
import Dexie from "dexie";
import Logdown = require('logdown');
import {CryptoboxStore} from "./CryptoboxStore";
import {RecordAlreadyExistsError} from "./RecordAlreadyExistsError";
import {RecordNotFoundError} from "./RecordNotFoundError";
import {SerialisedRecord} from "./SerialisedRecord";

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
    this.logger = new Logdown({alignOutput: true, markdown: false, prefix: 'cryptobox.store.IndexedDB'});

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

  private create(store_name: string, primary_key: string, entity: SerialisedRecord): Dexie.Promise<string> {
    this.logger.log(`Add record "${primary_key}" in object store "${store_name}"...`, entity);
    return this.db[store_name].add(entity, primary_key);
  }

  private read(store_name: string, primary_key: string): Promise<Object> {
    return Promise.resolve()
      .then(() => {
        this.logger.log(`Trying to load record "${primary_key}" from object store "${store_name}".`);
        return this.db[store_name].get(primary_key);
      })
      .then((record: any) => {
        if (record) {
          this.logger.log(`Loaded record "${primary_key}" from object store "${store_name}".`, record);
          return record;
        } else {
          let message: string = `Record "${primary_key}" from object store "${store_name}" could not be found.`;
          this.logger.warn(message);
          throw new RecordNotFoundError(message);
        }
      });
  }

  private update(store_name: string, primary_key: string, changes: Object): Dexie.Promise<string> {
    this.logger.log(`Changing record "${primary_key}" in object store "${store_name}"...`, changes);
    return this.db[store_name].update(primary_key, changes);
  }

  private delete(store_name: string, primary_key: string): Promise<string> {
    return Promise.resolve()
      .then(() => {
        return this.db[store_name].delete(primary_key);
      })
      .then(() => {
        this.logger.log(`Deleted record with primary key "${primary_key}" from object store "${store_name}".`);
        return primary_key;
      });
  }

  public delete_all(): Promise<boolean> {
    return Promise.resolve()
      .then(() => {
        return this.db[this.TABLE.LOCAL_IDENTITY].clear();
      })
      .then(() => {
        this.logger.log(`Deleted all records in object store "${this.TABLE.LOCAL_IDENTITY}".`);
        return this.db[this.TABLE.PRE_KEYS].clear();
      })
      .then(() => {
        this.logger.log(`Deleted all records in object store "${this.TABLE.PRE_KEYS}".`);
        return this.db[this.TABLE.SESSIONS].clear();
      })
      .then(() => {
        this.logger.log(`Deleted all records in object store "${this.TABLE.SESSIONS}".`);
        return true;
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
      this.read(this.TABLE.LOCAL_IDENTITY, this.localIdentityKey)
        .then((record: SerialisedRecord) => {
          let identity: Proteus.keys.IdentityKeyPair = Proteus.keys.IdentityKeyPair.deserialise(record.serialised);
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
      this.read(this.TABLE.PRE_KEYS, prekey_id.toString())
        .then((record: SerialisedRecord) => {
          resolve(Proteus.keys.PreKey.deserialise(record.serialised));
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

  public load_prekeys(): Promise<Array<Proteus.keys.PreKey>> {
    return Promise.resolve()
      .then(() => {
        return this.db[this.TABLE.PRE_KEYS].toArray();
      })
      .then((records: any) => {
        const preKeys: any = [];

        records.forEach((record: SerialisedRecord) => {
          let preKey: Proteus.keys.PreKey = Proteus.keys.PreKey.deserialise(record.serialised);
          preKeys.push(preKey);
        });

        return preKeys;
      });
  }

  public read_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session> {
    return this.read(this.TABLE.SESSIONS, session_id)
      .then((payload: SerialisedRecord) => {
        return Proteus.session.Session.deserialise(identity, payload.serialised);
      });
  }

  public save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair> {
    return new Promise((resolve, reject) => {
      this.identity = identity;

      let payload: SerialisedRecord = new SerialisedRecord(identity.serialise(), this.localIdentityKey);

      this.create(this.TABLE.LOCAL_IDENTITY, payload.id, payload)
        .then((primaryKey: string) => {
          let fingerprint: string = identity.public_key.fingerprint();
          let message = `Saved local identity "${fingerprint}"`
            + ` with key "${primaryKey}" in object store "${this.TABLE.LOCAL_IDENTITY}".`;
          this.logger.log(message);
          resolve(identity);
        })
        .catch(reject);
    });
  }

  public save_prekey(prekey: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey> {
    return new Promise((resolve, reject) => {
      this.prekeys[prekey.key_id] = prekey;

      let payload: SerialisedRecord = new SerialisedRecord(prekey.serialise(), prekey.key_id.toString());

      this.create(this.TABLE.PRE_KEYS, payload.id, payload)
        .then((primaryKey: string) => {
          let message = `Saved PreKey (ID "${prekey.key_id}") with key "${primaryKey}" in object store "${this.TABLE.PRE_KEYS}".`;
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
        let key: string = preKey.key_id.toString();
        let payload: SerialisedRecord = new SerialisedRecord(preKey.serialise(), key);
        items.push(payload);
        keys.push(key);
      });

      this.logger.log(`Saving a batch of "${items.length}" PreKeys (${keys.join(', ')}) in object store "${this.TABLE.PRE_KEYS}"...`, prekeys);

      this.db[this.TABLE.PRE_KEYS].bulkPut(items, keys)
        .then(() => {
          this.logger.log(`Saved a batch of "${items.length}" PreKeys (${keys.join(', ')}).`, items);
          resolve(prekeys);
        })
        .catch(reject);
    });
  }

  public create_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session> {
    return new Promise((resolve, reject) => {
      let payload: SerialisedRecord = new SerialisedRecord(session.serialise(), session_id);

      this.create(this.TABLE.SESSIONS, payload.id, payload)
        .then((primaryKey: string) => {
          let message = `Added session ID "${session_id}" in object store "${this.TABLE.SESSIONS}" with key "${primaryKey}".`;
          this.logger.log(message);
          resolve(session);
        })
        .catch((error: Error) => {
          if (error instanceof Dexie.ConstraintError) {
            let message: string = `Session with ID '${session_id}' already exists and cannot get overwritten. You need to delete the session first if you want to do it.`;
            reject(new RecordAlreadyExistsError(message));
          } else {
            reject(error);
          }
        });
    });
  }

  public update_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session> {
    return new Promise((resolve, reject) => {
      let payload: SerialisedRecord = new SerialisedRecord(session.serialise(), session_id);

      this.update(this.TABLE.SESSIONS, payload.id, {serialised: payload.serialised})
        .then((primaryKey: string) => {
          let message = `Updated session ID "${session_id}" in object store "${this.TABLE.SESSIONS}" with key "${primaryKey}".`;
          this.logger.log(message);
          resolve(session);
        })
        .catch(reject);
    });
  }
}
