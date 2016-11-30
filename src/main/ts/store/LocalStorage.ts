import * as bazinga64 from "bazinga64";
import * as Proteus from "wire-webapp-proteus";
import {CryptoboxStore} from "./CryptoboxStore";
import {SerialisedRecord} from "./SerialisedRecord";

export default class LocalStorage implements CryptoboxStore {
  private localIdentityKey: string = 'local_identity';
  private localIdentityStore: string;
  private preKeyStore: string;
  private sessionStore: string;
  private storage: Storage;

  constructor(identifier: string = "temp") {
    if (typeof localStorage === "undefined") {
      let warning = `Local Storage isn't supported by your platform.`;
      throw new Error(warning);
    } else {
      this.localIdentityStore = `cryptobox@${identifier}@identity`;
      this.preKeyStore = `cryptobox@${identifier}@prekey`;
      this.sessionStore = `cryptobox@${identifier}@session`;
      this.storage = localStorage;
    }
  }

  private delete(store_name: string, primary_key: string): Promise<string> {
    return new Promise((resolve) => {
      let key: string = `${store_name}@${primary_key}`;
      this.storage.removeItem(key);
      resolve(key);
    });
  }

  private load(store_name: string, primary_key: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let item: string = this.storage.getItem(`${store_name}@${primary_key}`);
      if (item) {
        resolve(item);
      } else {
        reject(new Error(`Item "${primary_key}" not found in "${store_name}".`));
      }
    });
  };

  private save(store_name: string, primary_key: string, entity: string): Promise<string> {
    return new Promise((resolve) => {
      let key: string = `${store_name}@${primary_key}`;
      this.storage.setItem(key, entity);
      resolve(key);
    });
  }

  public delete_all(): Promise<boolean> {
    return new Promise((resolve) => {

      var removed_items = false;
      Object.keys(localStorage).forEach((key: string) => {
        if (
          key.indexOf(this.localIdentityStore) > -1 ||
          key.indexOf(this.preKeyStore) > -1 ||
          key.indexOf(this.sessionStore) > -1
        ) {
          removed_items = true;
          localStorage.removeItem(key);
        }
      });

      resolve(removed_items);
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
      this.load(this.localIdentityStore, this.localIdentityKey).then(function (payload: string) {
        if (payload) {
          let bytes = bazinga64.Decoder.fromBase64(payload).asBytes;
          let ikp: Proteus.keys.IdentityKeyPair = Proteus.keys.IdentityKeyPair.deserialise(bytes.buffer);
          resolve(ikp);
        } else {
          reject(new Error(`No local identity present.`));
        }
      }).catch(reject);
    });
  }

  public load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey> {
    return new Promise((resolve, reject) => {
      this.load(this.preKeyStore, prekey_id.toString()).then((serialised: string) => {
        let bytes = bazinga64.Decoder.fromBase64(serialised).asBytes;
        resolve(Proteus.keys.PreKey.deserialise(bytes.buffer));
      }).catch(reject);
    });
  }

  public load_prekeys(): Promise<Array<Proteus.keys.PreKey>> {
    let prekey_promises: Array<Promise<Proteus.keys.PreKey>> = [];

    Object.keys(localStorage).forEach((key: string) => {
      if (key.indexOf(this.preKeyStore) > -1) {
        let separator: string = '@';
        let prekey_id = key.substr(key.lastIndexOf(separator) + separator.length);
        let promise: Promise<Proteus.keys.PreKey> = this.load_prekey(parseInt(prekey_id));
        prekey_promises.push(promise);
      }
    });

    return Promise.all(prekey_promises);
  }


  public load_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session> {
    return new Promise((resolve, reject) => {
      this.load(this.sessionStore, session_id).then((serialised: string) => {
        let bytes = bazinga64.Decoder.fromBase64(serialised).asBytes;
        resolve(Proteus.session.Session.deserialise(identity, bytes.buffer));
      }).catch(reject);
    });
  }

  public save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair> {
    let fingerprint: String = identity.public_key.fingerprint();
    let serialised: string = bazinga64.Encoder.toBase64(identity.serialise()).asString;
    let payload: SerialisedRecord = new SerialisedRecord(serialised, this.localIdentityKey);

    return new Promise((resolve, reject) => {
      this.save(this.localIdentityStore, payload.id, payload.serialised).then(function (key: string) {
        let message = `Saved local identity "${fingerprint}" with key "${key}".`;
        resolve(identity);
      }).catch(reject);
    });
  }

  public save_prekey(preKey: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey> {
    return new Promise((resolve, reject) => {
      let serialised: string = bazinga64.Encoder.toBase64(preKey.serialise()).asString;
      let payload: SerialisedRecord = new SerialisedRecord(serialised, preKey.key_id.toString());
      this.save(this.preKeyStore, payload.id, payload.serialised).then(function () {
        resolve(preKey);
      }).catch(reject);
    });
  }

  save_prekeys(preKeys: Array<Proteus.keys.PreKey>): Promise<Array<Proteus.keys.PreKey>> {
    return new Promise((resolve, reject) => {
      let savePromises: Array<Promise<Proteus.keys.PreKey>> = [];

      preKeys.forEach((preKey: Proteus.keys.PreKey) => {
        savePromises.push(this.save_prekey(preKey));
      });

      Promise.all(savePromises).then(() => {
        resolve(preKeys);
      }).catch(reject);
    });
  }

  public save_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session> {
    return new Promise((resolve, reject) => {
      let serialised: string = bazinga64.Encoder.toBase64(session.serialise()).asString;
      let payload: SerialisedRecord = new SerialisedRecord(serialised, session_id);
      this.save(this.sessionStore, payload.id, payload.serialised).then(function () {
        resolve(session);
      }).catch(reject);
    });
  }
}
