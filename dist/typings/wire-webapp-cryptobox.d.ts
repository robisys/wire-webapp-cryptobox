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
import * as Proteus from "wire-webapp-proteus";
export declare module store {
    interface CryptoboxStore {
        delete_all(): Promise<boolean>;
        delete_prekey(prekey_id: number): Promise<string>;
        delete_session(session_id: string): Promise<string>;
        load_identity(): Promise<Proteus.keys.IdentityKeyPair>;
        load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;
        load_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session>;
        save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<string>;
        save_prekey(key: Proteus.keys.PreKey): Promise<string>;
        save_session(session_id: string, session: Proteus.session.Session): Promise<string>;
    }
    class Cache implements CryptoboxStore {
        private identity;
        private preKeyStore;
        private sessionStore;
        constructor();
        delete_all(): Promise<boolean>;
        delete_prekey(prekey_id: number): Promise<string>;
        delete_session(session_id: string): Promise<string>;
        load_identity(): Promise<Proteus.keys.IdentityKeyPair>;
        load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;
        load_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session>;
        save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<string>;
        save_prekey(key: Proteus.keys.PreKey): Promise<string>;
        save_session(session_id: string, session: Proteus.session.Session): Promise<string>;
    }
    class IndexedDB implements CryptoboxStore {
        private db;
        private prekeys;
        identity: Proteus.keys.IdentityKeyPair;
        private TABLE;
        constructor(identifier: string | Dexie);
        init(): Dexie.Promise<Dexie>;
        private delete(store_name, primary_key);
        private load(store_name, primary_key);
        private save(store_name, primary_key, entity);
        private validate_store(store_name);
        delete_all(): Promise<boolean>;
        delete_prekey(prekey_id: number): Promise<string>;
        delete_session(session_id: string): Promise<string>;
        load_identity(): Promise<Proteus.keys.IdentityKeyPair>;
        load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;
        load_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session>;
        save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<string>;
        save_prekey(prekey: Proteus.keys.PreKey): Promise<string>;
        save_session(session_id: string, session: Proteus.session.Session): Promise<string>;
    }
    class LocalStorage implements CryptoboxStore {
        private localIdentityStore;
        private preKeyStore;
        private sessionStore;
        private storage;
        constructor(identifier?: string);
        private delete(store_name, primary_key);
        private load(store_name, primary_key);
        private save(store_name, primary_key, entity);
        delete_all(): Promise<boolean>;
        delete_prekey(prekey_id: number): Promise<string>;
        delete_session(session_id: string): Promise<string>;
        load_identity(): Promise<Proteus.keys.IdentityKeyPair>;
        load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;
        load_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session>;
        save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<string>;
        save_prekey(prekey: Proteus.keys.PreKey): Promise<string>;
        save_session(session_id: string, session: Proteus.session.Session): Promise<string>;
    }
    class ReadOnlyStore extends Proteus.session.PreKeyStore {
        private store;
        removed_prekeys: Array<number>;
        constructor(store: store.CryptoboxStore);
        get_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;
        remove(prekey_id: number): Promise<number>;
    }
}
export declare class CryptoboxSession {
    id: string;
    pk_store: store.ReadOnlyStore;
    session: Proteus.session.Session;
    constructor(id: string, pk_store: store.ReadOnlyStore, session: Proteus.session.Session);
    decrypt(ciphertext: ArrayBuffer): Promise<Uint8Array>;
    encrypt(plaintext: string): Promise<ArrayBuffer>;
    fingerprint_local(): string;
    fingerprint_remote(): string;
}
export declare class Cryptobox {
    private identity;
    private pk_store;
    private store;
    constructor(cryptoBoxStore: store.CryptoboxStore);
    init(): Promise<Cryptobox>;
    session_from_prekey(client_id: string, pre_key_bundle: ArrayBuffer): Promise<CryptoboxSession>;
    session_from_message(session_id: string, envelope: ArrayBuffer): Promise<Array<any>>;
    session_load(session_id: string): Promise<CryptoboxSession>;
    session_save(session: CryptoboxSession): Promise<String>;
    session_delete(session_id: string): Promise<string>;
    new_prekey(prekey_id: number): Promise<ArrayBuffer>;
}
