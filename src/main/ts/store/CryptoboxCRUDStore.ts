import * as Proteus from 'wire-webapp-proteus';
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine';
import {CryptoboxStore} from './CryptoboxStore';
import {RecordNotFoundError} from './error';
import {SerialisedRecord} from './SerialisedRecord';

export default class CryptoboxCRUDStore implements CryptoboxStore {

  constructor(private engine: CRUDEngine) {
  }

  static get KEYS() {
    return {
      LOCAL_IDENTITY: 'local_identity'
    };
  }

  static get STORES() {
    return {
      LOCAL_IDENTITY: 'keys',
      PRE_KEYS: 'prekeys',
      SESSIONS: 'sessions'
    };
  }

  delete_all(): Promise<boolean> {
    return Promise.resolve()
      .then(() => this.engine.deleteAll(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY))
      .then(() => this.engine.deleteAll(CryptoboxCRUDStore.STORES.PRE_KEYS))
      .then(() => this.engine.deleteAll(CryptoboxCRUDStore.STORES.SESSIONS))
      .then(() => true);
  }

  delete_prekey(prekey_id: number): Promise<number> {
    return this.engine.delete(CryptoboxCRUDStore.STORES.PRE_KEYS, prekey_id.toString())
      .then(() => prekey_id);
  }

  load_identity(): Promise<Error | Proteus.keys.IdentityKeyPair> {
    return this.engine.read(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY, CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY)
      .then((record: SerialisedRecord) => {
        const identity: Proteus.keys.IdentityKeyPair = Proteus.keys.IdentityKeyPair.deserialise(record.serialised);
        return identity;
      })
      .catch(function (error: Error) {
        if (error instanceof RecordNotFoundError) {
          return undefined;
        } else {
          return error;
        }
      });
  }

  load_prekey(prekey_id: number): Promise<Error | Proteus.keys.PreKey> {
    return this.engine.read(CryptoboxCRUDStore.STORES.PRE_KEYS, prekey_id.toString())
      .then((record: SerialisedRecord) => {
        return Proteus.keys.PreKey.deserialise(record.serialised);
      })
      .catch(function (error: Error) {
        if (error instanceof RecordNotFoundError) {
          return undefined;
        } else {
          return error;
        }
      });
  }

  load_prekeys(): Promise<Proteus.keys.PreKey[]> {
    return this.engine.readAll(CryptoboxCRUDStore.STORES.PRE_KEYS)
      .then((records: SerialisedRecord[]) => {
        const preKeys: Proteus.keys.PreKey[] = [];

        records.forEach((record: SerialisedRecord) => {
          let preKey: Proteus.keys.PreKey = Proteus.keys.PreKey.deserialise(record.serialised);
          preKeys.push(preKey);
        });

        return preKeys;
      });
  }

  save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair> {
    const payload: SerialisedRecord = new SerialisedRecord(identity.serialise(), CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY);

    return this.engine.create(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY, payload.id, payload)
      .then(() => identity);
  }

  save_prekey(pre_key: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey> {
    const payload: SerialisedRecord = new SerialisedRecord(pre_key.serialise(), pre_key.key_id.toString());

    return this.engine.create(CryptoboxCRUDStore.STORES.PRE_KEYS, payload.id, payload)
      .then(() => pre_key);
  }

  save_prekeys(pre_keys: Proteus.keys.PreKey[]): Promise<Proteus.keys.PreKey[]> {
    const promises = pre_keys.map((pre_key) => {
      return this.save_prekey(pre_key);
    });

    return Promise.all(promises)
      .then(() => pre_keys);
  }

  create_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session> {
    const payload: SerialisedRecord = new SerialisedRecord(session.serialise(), session_id);

    return this.engine.create(CryptoboxCRUDStore.STORES.SESSIONS, payload.id, payload)
      .then(() => session);
  }

  read_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session> {
    return this.engine.read(CryptoboxCRUDStore.STORES.SESSIONS, session_id)
      .then((payload: SerialisedRecord) => {
        return Proteus.session.Session.deserialise(identity, payload.serialised);
      });
  }

  update_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session> {
    const payload: SerialisedRecord = new SerialisedRecord(session.serialise(), session_id);

    return this.engine.update(CryptoboxCRUDStore.STORES.SESSIONS, payload.id, {serialised: payload.serialised})
      .then(() => session);
  }

  delete_session(session_id: string): Promise<string> {
    return this.engine.delete(CryptoboxCRUDStore.STORES.SESSIONS, session_id)
      .then((primary_key: string) => primary_key);
  }
}
