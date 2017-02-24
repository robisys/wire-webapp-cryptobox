import * as Proteus from "wire-webapp-proteus";
import EventEmitter = require("events");
import Logdown = require("logdown");
import LRUCache = require("wire-webapp-lru-cache");
import {CryptoboxSession} from "./CryptoboxSession";
import {CryptoboxStore} from "./store/CryptoboxStore";
import {InvalidPreKeyFormatError} from "./InvalidPreKeyFormatError";
import {ReadOnlyStore} from "./store/ReadOnlyStore";
import {RecordAlreadyExistsError} from "./store/RecordAlreadyExistsError";

export class Cryptobox extends EventEmitter {
  public static TOPIC = {
    NEW_PREKEYS: "new-prekeys",
    NEW_SESSION: "new-session"
  };
  public VERSION: string;

  private cachedPreKeys: Array<Proteus.keys.PreKey>;
  private cachedSessions: LRUCache;
  private lastResortPreKey: Proteus.keys.PreKey;

  private logger: Logdown;
  private minimumAmountOfPreKeys: number;
  private pk_store: ReadOnlyStore;
  private store: CryptoboxStore;

  public identity: Proteus.keys.IdentityKeyPair;

  constructor(cryptoBoxStore: CryptoboxStore, minimumAmountOfPreKeys: number = 1) {
    super();

    if (!cryptoBoxStore) {
      throw new Error(`You cannot initialize Cryptobox without a storage component.`);
    }

    if (minimumAmountOfPreKeys > Proteus.keys.PreKey.MAX_PREKEY_ID) {
      minimumAmountOfPreKeys = Proteus.keys.PreKey.MAX_PREKEY_ID;
    }

    this.logger = new Logdown({alignOutput: true, markdown: false, prefix: 'cryptobox.Cryptobox'});

    this.cachedPreKeys = [];
    this.cachedSessions = new LRUCache(1000);
    this.minimumAmountOfPreKeys = minimumAmountOfPreKeys;

    this.store = cryptoBoxStore;
    this.pk_store = new ReadOnlyStore(this.store);

    let storageEngine: string = (<any>cryptoBoxStore).constructor.name;
    this.logger.log(`Constructed Cryptobox. Minimum amount of PreKeys is "${minimumAmountOfPreKeys}". Storage engine is "${storageEngine}".`);
  }

  private save_session_in_cache(session: CryptoboxSession): CryptoboxSession {
    this.logger.log(`Saving Session with ID "${session.id}" in cache...`);
    this.cachedSessions.set(session.id, session);
    return session;
  }

  private load_session_from_cache(session_id: string): CryptoboxSession {
    this.logger.log(`Trying to load Session with ID "${session_id}" from cache...`);
    return this.cachedSessions.get(session_id);
  }

  private remove_session_from_cache(session_id: string): void {
    this.logger.log(`Removing Session with ID "${session_id}" from cache...`);
    this.cachedSessions.delete(session_id);
  }

  public init(): Promise<Array<Proteus.keys.PreKey>> {
    this.logger.log(`Initializing Cryptobox. Loading local identity...`);
    return this.store.load_identity()
      .then((identity: Proteus.keys.IdentityKeyPair) => {
        if (identity) {
          this.logger.log(`Found existing local identity.`, identity);
          return identity;
        } else {
          identity = Proteus.keys.IdentityKeyPair.new();
          this.logger.warn(`No existing local identity found. Created new local identity.`, identity);
          return this.save_new_identity(identity);
        }
      })
      .then((identity: Proteus.keys.IdentityKeyPair) => {
        this.identity = identity;
        this.logger.log(`Initialized Cryptobox with local identity. Fingerprint is "${identity.public_key.fingerprint()}".`, this.identity);
        this.logger.log(`Loading Last Resort PreKey with ID "${Proteus.keys.PreKey.MAX_PREKEY_ID}"...`);
        return this.store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID);
      })
      .then((lastResortPreKey: Proteus.keys.PreKey) => {
        if (lastResortPreKey) {
          this.logger.log(`Found existing Last Resort PreKey.`, lastResortPreKey);
          return lastResortPreKey;
        } else {
          this.logger.warn(`No Last Resort PreKey found. Creating new one...`);
          return this.new_last_resort_prekey();
        }
      })
      .then((lastResortPreKey: Proteus.keys.PreKey) => {
        this.lastResortPreKey = lastResortPreKey;
        this.logger.log(`Loaded Last Resort PreKey with ID "${lastResortPreKey.key_id}".`, lastResortPreKey);
        this.logger.log(`Loading "${this.minimumAmountOfPreKeys - 1}" Standard PreKeys...`);
        return this.store.load_prekeys();
      })
      .then((preKeysFromStorage: Array<Proteus.keys.PreKey>) => {
        this.cachedPreKeys = preKeysFromStorage;
        return this.refill_prekeys();
      })
      .then(() => {
        let allPreKeys: Array<Proteus.keys.PreKey> = this.cachedPreKeys;
        let ids: Array<string> = allPreKeys.map(preKey => preKey.key_id.toString());
        this.logger.log(`Initialized Cryptobox with a total amount of "${allPreKeys.length}" PreKeys (${ids.join(', ')}).`, allPreKeys);
        return allPreKeys;
      });
  }

  public get_serialized_last_resort_prekey(): Promise<Object> {
    return Promise.resolve()
      .then(() => {
        return this.serialize_prekey(this.lastResortPreKey);
      });
  }

  public get_serialized_standard_prekeys(): Promise<Array<Object>> {
    return this.store.load_prekeys()
      .then((preKeysFromStorage: Array<Proteus.keys.PreKey>) => {
        let serializedPreKeys = [];

        preKeysFromStorage.forEach((preKey: Proteus.keys.PreKey) => {
          let preKeyJson: any = this.serialize_prekey(preKey);
          if (preKeyJson.id !== Proteus.keys.PreKey.MAX_PREKEY_ID) {
            serializedPreKeys.push(preKeyJson);
          }
        });

        return serializedPreKeys;
      });
  }

  private publish_event(topic: string, event: any): void {
    this.emit(topic, event);
    this.logger.log(`Published event "${topic}".`, event);
  }

  private publish_prekeys(newPreKeys: Array<Proteus.keys.PreKey>): void {
    if (newPreKeys.length > 0) {
      this.publish_event(Cryptobox.TOPIC.NEW_PREKEYS, newPreKeys);
    }
  }

  private publish_session_id(session: CryptoboxSession): void {
    this.publish_event(Cryptobox.TOPIC.NEW_SESSION, session.id);
  }

  /**
   * This method returns all PreKeys available, respecting the minimum required amount of PreKeys.
   * If all available PreKeys don't meet the minimum PreKey amount, new PreKeys will be created.
   */
  private refill_prekeys(): Promise<Array<Proteus.keys.PreKey>> {
    return Promise.resolve()
      .then(() => {
        let missingAmount: number = 0;
        let highestId: number = 0;

        if (this.cachedPreKeys.length < this.minimumAmountOfPreKeys) {
          missingAmount = this.minimumAmountOfPreKeys - this.cachedPreKeys.length;
          highestId = -1;

          this.cachedPreKeys.forEach((preKey: Proteus.keys.PreKey) => {
            if (preKey.key_id > highestId && preKey.key_id !== Proteus.keys.PreKey.MAX_PREKEY_ID) {
              highestId = preKey.key_id;
            }
          });

          highestId += 1;

          this.logger.warn(`There are not enough PreKeys in the storage. Generating "${missingAmount}" new PreKey(s), starting from ID "${highestId}"...`)
        }

        return this.new_prekeys(highestId, missingAmount);
      })
      .then((newPreKeys: Array<Proteus.keys.PreKey>) => {
        if (newPreKeys.length > 0) {
          this.logger.log(`Generated PreKeys from ID "${newPreKeys[0].key_id}" to ID "${newPreKeys[newPreKeys.length - 1].key_id}".`);
          this.cachedPreKeys = this.cachedPreKeys.concat(newPreKeys);
        }
        return newPreKeys;
      });
  }

  private save_new_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair> {
    return Promise.resolve()
      .then(() => {
        return this.store.delete_all();
      })
      .then(() => {
        this.logger.warn(`Cleaned cryptographic items to save a new local identity.`, identity);
        return this.store.save_identity(identity);
      });
  }

  /**
   * Creates a new session which can be used for cryptographic operations (encryption & decryption) from a remote PreKey bundle.
   * Saving the session takes automatically place when the session is used to encrypt or decrypt a message.
   */
  public session_from_prekey(session_id: string, pre_key_bundle: ArrayBuffer): Promise<CryptoboxSession> {
    let cachedSession: CryptoboxSession = this.load_session_from_cache(session_id);
    if (cachedSession) {
      return Promise.resolve(cachedSession);
    }

    return Promise.resolve()
      .then(() => {
        let bundle: Proteus.keys.PreKeyBundle;

        try {
          bundle = Proteus.keys.PreKeyBundle.deserialise(pre_key_bundle);
        } catch (error) {
          throw new InvalidPreKeyFormatError(`PreKey bundle for session "${session_id}" has an unsupported format.`);
        }

        return Proteus.session.Session.init_from_prekey(this.identity, bundle)
          .then((session: Proteus.session.Session) => {
            let cryptobox_session = new CryptoboxSession(session_id, this.pk_store, session);
            return this.session_save(cryptobox_session);
          })
          .catch((error: Error) => {
            if (error instanceof RecordAlreadyExistsError) {
              this.logger.warn(error.message, error);
              return this.session_load(session_id);
            } else {
              throw error;
            }
          });
      });
  }

  /**
   * Uses a cipher message to create a new session and to decrypt to message which the given cipher message contains.
   * Saving the newly created session is not needed as it's done during the inbuilt decryption phase.
   */
  private session_from_message(session_id: string, envelope: ArrayBuffer): Promise<any> {
    let env: Proteus.message.Envelope = Proteus.message.Envelope.deserialise(envelope);
    let returnTuple: any;

    return Proteus.session.Session.init_from_message(this.identity, this.pk_store, env)
      .then((tuple: Proteus.session.SessionFromMessageTuple) => {
        let session: Proteus.session.Session = tuple[0];
        let decrypted: Uint8Array = tuple[1];
        let cryptoBoxSession: CryptoboxSession = new CryptoboxSession(session_id, this.pk_store, session);
        returnTuple = [cryptoBoxSession, decrypted];
        return returnTuple;
      });
  }

  public session_load(session_id: string): Promise<CryptoboxSession> {
    this.logger.log(`Trying to load Session with ID "${session_id}"...`);

    let cachedSession: CryptoboxSession = this.load_session_from_cache(session_id);
    if (cachedSession) {
      return Promise.resolve(cachedSession);
    }

    return Promise.resolve()
      .then(() => {
        return this.store.read_session(this.identity, session_id)
      })
      .then((session: Proteus.session.Session) => {
        return new CryptoboxSession(session_id, this.pk_store, session);
      })
      .then((session: CryptoboxSession) => {
        return this.save_session_in_cache(session);
      });
  }

  private session_cleanup(session: CryptoboxSession): Promise<CryptoboxSession> {
    let prekey_deletions = this.pk_store.prekeys.map((preKeyId: number) => {
      return this.store.delete_prekey(preKeyId);
    });

    return Promise.all(prekey_deletions)
      .then((deletedPreKeyIds: Array<number>) => {
        // Remove PreKey from cache
        deletedPreKeyIds.forEach((id: number) => {
          this.cachedPreKeys = this.cachedPreKeys.filter((preKey: Proteus.keys.PreKey) => preKey.key_id !== id);
        });
        // Remove PreKey from removal list
        this.pk_store.release_prekeys(deletedPreKeyIds);
        return this.refill_prekeys();
      })
      .then((newPreKeys: Array<Proteus.keys.PreKey>) => {
        this.publish_prekeys(newPreKeys);
        return this.save_session_in_cache(session);
      })
      .then(() => {
        return session;
      });
  }

  private session_save(session: CryptoboxSession): Promise<CryptoboxSession> {
    return this.store.create_session(session.id, session.session)
      .then(() => {
        return this.session_cleanup(session);
      });
  }

  private session_update(session: CryptoboxSession): Promise<CryptoboxSession> {
    return this.store.update_session(session.id, session.session)
      .then(() => {
        return this.session_cleanup(session);
      });
  }

  public session_delete(session_id: string): Promise<string> {
    this.remove_session_from_cache(session_id);
    return this.store.delete_session(session_id);
  }

  private new_last_resort_prekey(): Promise<Proteus.keys.PreKey> {
    return Promise.resolve()
      .then(() => {
        this.lastResortPreKey = Proteus.keys.PreKey.last_resort();
        return this.store.save_prekeys([this.lastResortPreKey]);
      })
      .then((preKeys: Array<Proteus.keys.PreKey>) => {
        return preKeys[0];
      });
  }

  public serialize_prekey(prekey: Proteus.keys.PreKey): Object {
    return Proteus.keys.PreKeyBundle.new(this.identity.public_key, prekey).serialised_json();
  }

  /**
   * Creates new PreKeys and saves them into the storage.
   */
  private new_prekeys(start: number, size: number = 0): Promise<Array<Proteus.keys.PreKey>> {
    if (size === 0) {
      return Promise.resolve([]);
    }

    return Promise.resolve()
      .then(() => {
        return Proteus.keys.PreKey.generate_prekeys(start, size);
      })
      .then((newPreKeys: Array<Proteus.keys.PreKey>) => {
        return this.store.save_prekeys(newPreKeys);
      });
  }

  public encrypt(session_id: string, payload: string|Uint8Array, pre_key_bundle: ArrayBuffer): Promise<ArrayBuffer> {
    let encryptedBuffer: ArrayBuffer;
    let loadedSession: CryptoboxSession;

    return Promise.resolve()
      .then(() => {
        if (pre_key_bundle) {
          return this.session_from_prekey(session_id, pre_key_bundle)
        } else {
          return this.session_load(session_id);
        }
      })
      .then((session: CryptoboxSession) => {
        loadedSession = session;
        return loadedSession.encrypt(payload);
      })
      .then((encrypted: ArrayBuffer) => {
        encryptedBuffer = encrypted;
        // TODO: This should be "update_session"
        return this.session_update(loadedSession);
      })
      .then(function () {
        return encryptedBuffer;
      });
  }

  public decrypt(session_id: string, ciphertext: ArrayBuffer): Promise<Uint8Array> {
    let is_new_session = false;
    let message: Uint8Array;
    let session: CryptoboxSession;

    return this.session_load(session_id)
      .catch(() => {
        return this.session_from_message(session_id, ciphertext);
      })
      // TODO: "value" can be of type CryptoboxSession | Array[CryptoboxSession, Uint8Array]
      .then((value: any) => {
        let decrypted_message: Uint8Array;

        if (value[0] !== undefined) {
          [session, decrypted_message] = value;
          this.publish_session_id(session);
          is_new_session = true;
          return decrypted_message;
        } else {
          session = value;
          return session.decrypt(ciphertext);
        }
      })
      .then((decrypted_message) => {
        message = decrypted_message;
        if (is_new_session) {
          return this.session_save(session);
        } else {
          return this.session_update(session);
        }
      })
      .then(() => {
        return message;
      });
  }
}

// Note: Path to "package.json" must be relative to the "commonjs" dist files
Cryptobox.prototype.VERSION = require('../../package.json').version;
