import * as Proteus from "wire-webapp-proteus";
import {CryptoboxSession} from "./CryptoboxSession";
import {CryptoboxStore} from "./store/CryptoboxStore";
import {ReadOnlyStore} from "./store/ReadOnlyStore";
import EventEmitter = require("events");
import Logdown = require("logdown");
import LRUCache = require("wire-webapp-lru-cache");

export class Cryptobox extends EventEmitter {
  public static TOPIC = {
    NEW_PREKEYS: "new-prekeys",
    NEW_SESSION: "new-session"
  };

  private lastResortPreKey: Proteus.keys.PreKey;
  private cachedSessions: LRUCache;

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

    this.logger = new Logdown({prefix: 'cryptobox.Cryptobox', alignOutput: true});

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

  public remove_session_from_cache(session_id: string): void {
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
          let lastResortID: number = Proteus.keys.PreKey.MAX_PREKEY_ID;
          return this.new_last_resort_prekey(lastResortID);
        }
      })
      .then((lastResortPreKey: Proteus.keys.PreKey) => {
        this.lastResortPreKey = lastResortPreKey;
        this.logger.log(`Loaded Last Resort PreKey with ID "${lastResortPreKey.key_id}".`, lastResortPreKey);
        this.logger.log(`Loading "${this.minimumAmountOfPreKeys - 1}" Standard PreKeys...`);
        return this.refill_prekeys(false);
      })
      .then((allPreKeys: Array<Proteus.keys.PreKey>) => {
        let ids: Array<string> = allPreKeys.map(function (preKey: Proteus.keys.PreKey) {
          return preKey.key_id.toString();
        });
        this.logger.log(`Initialized Cryptobox with a total amount of "${allPreKeys.length}" PreKeys (${ids.join(', ')}).`, allPreKeys);
        return allPreKeys;
      });
  }

  public get_serialized_last_resort_prekey(): Promise<Object> {
    return Promise.resolve().then(() => {
      return this.serialize_prekey(this.lastResortPreKey);
    });
  }

  public get_serialized_standard_prekeys(): Promise<Array<Object>> {
    return this.store.load_prekeys()
      .then((preKeysFromStorage: Array<Proteus.keys.PreKey>) => {
        let serializedPreKeys = [];

        preKeysFromStorage.forEach((preKey: Proteus.keys.PreKey) => {
          let preKeyJson: any = this.serialize_prekey(preKey);
          if (preKeyJson.id !== 65535) {
            serializedPreKeys.push(preKeyJson);
          }
        });

        return serializedPreKeys;
      });
  }

  /**
   * This method returns all PreKeys available, respecting the minimum required amount of PreKeys.
   * If all available PreKeys don't meet the minimum PreKey amount, new PreKeys will be created.
   */
  private refill_prekeys(publish_new_prekeys: boolean = true): Promise<Array<Proteus.keys.PreKey>> {
    return Promise.resolve().then(() => {
      let allPreKeys: Array<Proteus.keys.PreKey> = [];

      return this.store.load_prekeys()
        .then((preKeysFromStorage: Array<Proteus.keys.PreKey>) => {
          allPreKeys = preKeysFromStorage;

          let missingAmount: number = 0;
          let highestId: number = 0;

          if (preKeysFromStorage.length < this.minimumAmountOfPreKeys) {
            missingAmount = this.minimumAmountOfPreKeys - preKeysFromStorage.length;
            highestId = -1;

            preKeysFromStorage.forEach((preKey: Proteus.keys.PreKey) => {
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
          allPreKeys = allPreKeys.concat(newPreKeys);

          if (newPreKeys.length > 0) {
            this.logger.log(`Generated PreKeys from ID "${newPreKeys[0].key_id}" to ID "${newPreKeys[newPreKeys.length - 1].key_id}".`);
            if (publish_new_prekeys) {
              this.emit(Cryptobox.TOPIC.NEW_PREKEYS, newPreKeys);
              this.logger.log(`Published event "${Cryptobox.TOPIC.NEW_PREKEYS}".`, newPreKeys);
            }
          }

          return allPreKeys;
        });
    });
  }

  public save_new_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair> {
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
    return Promise.resolve().then(() => {
      let bundle: Proteus.keys.PreKeyBundle = Proteus.keys.PreKeyBundle.deserialise(pre_key_bundle);
      return Proteus.session.Session.init_from_prekey(this.identity, bundle)
        .then((session: Proteus.session.Session) => {
          let cryptobox_session = new CryptoboxSession(session_id, this.pk_store, session);
          return this.save_session_in_cache(cryptobox_session);
        });
    });
  }

  /**
   * Uses a cipher message to create a new session and to decrypt to message which the given cipher message contains.
   * Saving the newly created session is not needed as it's done during the inbuilt decryption phase.
   */
  public session_from_message(session_id: string, envelope: ArrayBuffer): Promise<any> {
    let env: Proteus.message.Envelope = Proteus.message.Envelope.deserialise(envelope);
    let returnTuple: any;

    return Proteus.session.Session.init_from_message(this.identity, this.pk_store, env)
      .then((tuple: Proteus.session.SessionFromMessageTuple) => {
        let session: Proteus.session.Session = tuple[0];
        let decrypted: Uint8Array = tuple[1];
        let cryptoBoxSession: CryptoboxSession = new CryptoboxSession(session_id, this.pk_store, session);
        returnTuple = [cryptoBoxSession, decrypted];
        return this.session_save(cryptoBoxSession);
      })
      .then(function () {
        return returnTuple;
      });
  }

  public session_load(session_id: string): Promise<CryptoboxSession> {
    return Promise.resolve().then(() => {
      this.logger.log(`Trying to load Session with ID "${session_id}"...`);

      let cachedSession = this.load_session_from_cache(session_id);
      if (cachedSession) {
        return cachedSession;
      }

      return this.store.load_session(this.identity, session_id)
        .then((session: Proteus.session.Session) => {
          return new CryptoboxSession(session_id, this.pk_store, session);
        })
        .then((session) => {
          return this.save_session_in_cache(session);
        });
    });
  }

  public session_save(session: CryptoboxSession): Promise<String> {
    return this.store.save_session(session.id, session.session).then(() => {
      let prekey_deletions = this.pk_store.prekeys.map((preKeyId: number) => {
        return this.store.delete_prekey(preKeyId);
      });

      return Promise.all(prekey_deletions);
    }).then((deletedPreKeyIds) => {
      // Delete PreKeys from "ReadOnlyStore" cache
      deletedPreKeyIds.forEach((id: number) => {
        let index: number = this.pk_store.prekeys.indexOf(id);
        if (index > -1) {
          deletedPreKeyIds.splice(index, 1);
        }
      });

      // Create new PreKeys (to respect the minimum amount of required PreKeys)
      return this.refill_prekeys();
    }).then(() => {
      return this.save_session_in_cache(session);
    }).then(() => {
      return session.id;
    });
  }

  public session_delete(session_id: string): Promise<string> {
    this.remove_session_from_cache(session_id);
    return this.store.delete_session(session_id);
  }

  private new_last_resort_prekey(prekey_id: number): Promise<Proteus.keys.PreKey> {
    return Promise.resolve()
      .then(() => {
        this.lastResortPreKey = Proteus.keys.PreKey.last_resort();
        return this.store.save_prekeys([this.lastResortPreKey]);
      }).then((preKeys: Array<Proteus.keys.PreKey>) => {
        return preKeys[0];
      });
  }

  public serialize_prekey(prekey: Proteus.keys.PreKey): Object {
    return Proteus.keys.PreKeyBundle.new(this.identity.public_key, prekey).serialised_json();
  }

  /**
   * Creates new PreKeys and saves them into the storage.
   */
  public new_prekeys(start: number, size: number = 0): Promise<Array<Proteus.keys.PreKey>> {
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

  public encrypt(session: CryptoboxSession|string, payload: string|Uint8Array): Promise<ArrayBuffer> {
    let encryptedBuffer: ArrayBuffer;
    let loadedSession: CryptoboxSession;

    return Promise.resolve().then(() => {
      if (typeof session === 'string') {
        return this.session_load(session);
      }
      return session;
    }).then((session: CryptoboxSession) => {
      loadedSession = session;
      return loadedSession.encrypt(payload);
    }).then((encrypted: ArrayBuffer) => {
      encryptedBuffer = encrypted;
      return this.session_save(loadedSession);
    }).then(function () {
      return encryptedBuffer;
    });
  }

  public decrypt(session_id: string, ciphertext: ArrayBuffer): Promise<Uint8Array> {
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
          this.emit(Cryptobox.TOPIC.NEW_SESSION, session.id);
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
        return message;
      });
  }
}
