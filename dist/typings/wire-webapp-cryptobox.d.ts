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

import Dexie from "dexie";
import * as Proteus from "wire-webapp-proteus";
export declare module store {
  class Cache implements CryptoboxStore {
    private identity;
    private logger;
    private prekeys;
    private sessions;
    constructor();
    delete_all(): Promise<boolean>;
    delete_prekey(prekey_id: number): Promise<number>;
    delete_session(session_id: string): Promise<string>;
    load_identity(): Promise<Proteus.keys.IdentityKeyPair>;
    load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;
    load_prekeys(): Promise<Array<Proteus.keys.PreKey>>;
    read_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session>;
    save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair>;
    save_prekey(preKey: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey>;
    save_prekeys(preKeys: Array<Proteus.keys.PreKey>): Promise<Array<Proteus.keys.PreKey>>;
    create_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session>;
    update_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session>;
  }
  abstract class CryptoboxCRUDStore implements CryptoboxStore {
    static readonly KEYS: {
      LOCAL_IDENTITY: string;
    };
    static readonly STORES: {
      LOCAL_IDENTITY: string;
      PRE_KEYS: string;
      SESSIONS: string;
    };
    abstract create(store_name: string, primary_key: string, entity: SerialisedRecord): Promise<string>;
    abstract delete(store_name: string, primary_key: string): Promise<string>;
    abstract delete_all(): Promise<boolean>;
    abstract init(identifier: string): Promise<CryptoboxCRUDStore>;
    abstract read(store_name: string, primary_key: string): Promise<SerialisedRecord>;
    abstract read_all(store_name: string): Promise<SerialisedRecord[]>;
    abstract update(store_name: string, primary_key: string, changes: SerialisedUpdate): Promise<string>;
    delete_prekey(prekey_id: number): Promise<number>;
    load_identity(): Promise<Proteus.keys.IdentityKeyPair>;
    load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;
    load_prekeys(): Promise<Proteus.keys.PreKey[]>;
    save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair>;
    save_prekey(pre_key: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey>;
    save_prekeys(pre_keys: Proteus.keys.PreKey[]): Promise<Proteus.keys.PreKey[]>;
    create_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session>;
    read_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session>;
    update_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session>;
    delete_session(session_id: string): Promise<string>;
  }
  interface CryptoboxStore {
    delete_all(): Promise<boolean>;
    delete_prekey(prekey_id: number): Promise<number>;
    load_identity(): Promise<Proteus.keys.IdentityKeyPair>;
    load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;
    load_prekeys(): Promise<Array<Proteus.keys.PreKey>>;
    save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair>;
    save_prekey(pre_key: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey>;
    save_prekeys(pre_keys: Array<Proteus.keys.PreKey>): Promise<Array<Proteus.keys.PreKey>>;
    create_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session>;
    read_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session>;
    update_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session>;
    delete_session(session_id: string): Promise<string>;
  }
  class FileStore extends CryptoboxCRUDStore {
    private logger;
    private storagePath;
    constructor();
    create(storeName: string, primaryKey: string, record: SerialisedRecord): Promise<string>;
    update(store_name: string, primary_key: string, changes: SerialisedUpdate): Promise<string>;
    init(storagePath: string): Promise<CryptoboxCRUDStore>;
    read(store_name: string, primary_key: string): Promise<SerialisedRecord>;
    read_all(store_name: string): Promise<SerialisedRecord[]>;
    delete(store_name: string, primary_key: string): Promise<string>;
    delete_all(): Promise<boolean>;
  }
  class IndexedDB implements CryptoboxStore {
    identity: Proteus.keys.IdentityKeyPair;
    private db;
    private prekeys;
    private TABLE;
    private logger;
    private localIdentityKey;
    constructor(identifier: string | Dexie);
    private create(store_name, primary_key, entity);
    private read(store_name, primary_key);
    private update(store_name, primary_key, changes);
    private delete(store_name, primary_key);
    delete_all(): Promise<boolean>;
    delete_prekey(prekey_id: number): Promise<number>;
    delete_session(session_id: string): Promise<string>;
    load_identity(): Promise<Proteus.keys.IdentityKeyPair>;
    load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;
    load_prekeys(): Promise<Array<Proteus.keys.PreKey>>;
    read_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session>;
    save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair>;
    save_prekey(prekey: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey>;
    save_prekeys(prekeys: Array<Proteus.keys.PreKey>): Promise<Array<Proteus.keys.PreKey>>;
    create_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session>;
    update_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session>;
  }
  class ReadOnlyStore extends Proteus.session.PreKeyStore {
    private store;
    prekeys: Array<number>;
    constructor(store: CryptoboxStore);
    release_prekeys(deletedPreKeyIds: Array<number>): void;
    get_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;
    remove(prekey_id: number): Promise<number>;
  }
  class RecordAlreadyExistsError extends Error {
    message: string;
    constructor(message: string);
  }
  class RecordNotFoundError extends Error {
    message: string;
    constructor(message: string);
  }
  class SerialisedRecord {
    created: number;
    id: string;
    serialised: ArrayBuffer;
    version: string;
    constructor(serialised: ArrayBuffer, id: string);
  }
  class SerialisedUpdate {
    serialised: ArrayBuffer;
  }
}
export declare class Cryptobox {
  EVENT: {
    NEW_PREKEYS: string;
  };
  private cachedSessions;
  private channel;
  private logger;
  private minimumAmountOfPreKeys;
  private pk_store;
  private store;
  identity: Proteus.keys.IdentityKeyPair;
  constructor(cryptoBoxStore: store.CryptoboxStore, minimumAmountOfPreKeys?: number);
  init(): Promise<Cryptobox>;
  private generate_required_prekeys();
  session_from_prekey(client_id: string, pre_key_bundle: ArrayBuffer): Promise<CryptoboxSession>;
  session_from_message(session_id: string, envelope: ArrayBuffer): Promise<Proteus.session.SessionFromMessageTuple>;
  session_load(session_id: string): Promise<CryptoboxSession>;
  session_save(session: CryptoboxSession): Promise<String>;
  session_delete(session_id: string): Promise<string>;
  new_prekey(prekey_id: number): Promise<ArrayBuffer>;
  new_prekeys(start: number, size?: number): Promise<Array<Proteus.keys.PreKey>>;
  encrypt(session: CryptoboxSession | string, payload: string | Uint8Array): Promise<ArrayBuffer>;
  decrypt(session_id: string, ciphertext: ArrayBuffer): Promise<Uint8Array>;
}
export declare class CryptoboxSession {
  id: string;
  pk_store: store.ReadOnlyStore;
  session: Proteus.session.Session;
  constructor(id: string, pk_store: store.ReadOnlyStore, session: Proteus.session.Session);
  decrypt(ciphertext: ArrayBuffer): Promise<Uint8Array>;
  encrypt(plaintext: string | Uint8Array): Promise<ArrayBuffer>;
  fingerprint_local(): string;
  fingerprint_remote(): string;
}
export declare class DecryptionError extends Error {
  message: string;
  constructor(message: string);
}
export declare class InvalidPreKeyFormatError extends Error {
  message: string;
  constructor(message: string);
}
