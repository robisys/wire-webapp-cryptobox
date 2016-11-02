import * as Proteus from "wire-webapp-proteus";
import Logdown from "logdown";
import {CryptoboxSession} from "./CryptoboxSession";
import {CryptoboxStore} from "./store/CryptoboxStore";
import {ReadOnlyStore} from "./store/ReadOnlyStore";
import LRUCache from "lru-ts";
import postal = require("postal");

export class Cryptobox {
  // TODO: Limit the amount of items in cache
  public EVENT = {
    NEW_PREKEYS: "new-prekeys"
  };

  private cachedPreKeys: LRUCache = new LRUCache(1000);
  private cachedSessions: LRUCache = new LRUCache(1000);
  private channel = postal.channel("cryptobox");

  private logger: Logdown;
  private minimumAmountOfPreKeys: number;
  private pk_store: ReadOnlyStore;
  private store: CryptoboxStore;

  public identity: Proteus.keys.IdentityKeyPair;

  constructor(cryptoBoxStore: CryptoboxStore, minimumAmountOfPreKeys: number = 1) {
    if (!cryptoBoxStore) {
      throw new Error(`You cannot initialize Cryptobox without a storage component.`);
    }

    this.logger = new Logdown({prefix: 'cryptobox.Cryptobox', alignOuput: true});
    this.logger.log(`Constructed Cryptobox.`);
    this.minimumAmountOfPreKeys = minimumAmountOfPreKeys;
    this.pk_store = new ReadOnlyStore(this.store);
    this.store = cryptoBoxStore;
  }

  public save_prekey_in_cache(preKey: Proteus.keys.PreKey): Proteus.keys.PreKey {
    this.logger.log(`Saving PreKey with ID "${preKey.key_id}" in cache.`);
    this.cachedPreKeys.put(preKey.key_id, preKey);
    return preKey;
  }

  public load_prekey_from_cache(preKeyId: number): Proteus.keys.PreKey {
    this.logger.log(`Loading PreKey with ID "${preKeyId}" from cache.`);
    return this.cachedPreKeys.get(preKeyId);
  }

  public save_session_in_cache(session: CryptoboxSession): CryptoboxSession {
    this.logger.log(`Saving Session with ID "${session.id}" in cache.`);
    this.cachedSessions.put(session.id, session);
    return session;
  }

  public load_session_from_cache(session_id: string): CryptoboxSession {
    this.logger.log(`Loading Session with ID "${session_id}" from cache.`);
    return this.cachedSessions.get(session_id);
  }

  public remove_session_from_cache(session_id: string): void {
    this.logger.log(`Removing Session with ID "${session_id}" from cache.`);
    this.cachedSessions.put(session_id, undefined);
  }

  public init(): Promise<Cryptobox> {
    return Promise.resolve().then(() => {
      this.logger.log(`Loading local identity...`);
      return this.store.load_identity()
        .catch(() => {
          let identity: Proteus.keys.IdentityKeyPair = Proteus.keys.IdentityKeyPair.new();
          this.logger.warn(`No existing identity found. Created new identity with fingerprint "${identity.public_key.fingerprint()}".`, identity);
          return this.store.save_identity(identity);
        })
        .then((identity) => {
          this.identity = identity;
          this.logger.log(`Initialized Cryptobox with an identity which has the following fingerprint "${this.identity.public_key.fingerprint()}".`, this.identity);
          this.logger.log(`Loading last resort PreKey...`);
          return Promise.resolve().then(() => {
            return this.load_prekey_from_cache(Proteus.keys.PreKey.MAX_PREKEY_ID);
          }).then((prekey) => {
            if (prekey === undefined) {
              return this.store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID)
            } else {
              return prekey;
            }
          }).then((prekey) => {
            return this.save_prekey_in_cache(prekey);
          });
        })
        .catch(() => {
          let id: number = Proteus.keys.PreKey.MAX_PREKEY_ID;
          let lastResortPreKey: Proteus.keys.PreKey = Proteus.keys.PreKey.new(id);
          this.logger.warn(`No last resort PreKey found. Created last resort PreKey with ID "${id}".`);
          return this.store.save_prekey(lastResortPreKey).then((prekey) => {
            return this.save_prekey_in_cache(prekey);
          });
        })
        .then((lastResortPreKey: Proteus.keys.PreKey) => {
          this.logger.log(`Loaded last resort PreKey (ID ${lastResortPreKey.key_id}).`);
          this.logger.log(`Loading standard PreKeys... ${this.minimumAmountOfPreKeys - 1} left...`);
          return this.get_initial_prekeys();
        })
        .then((newPreKeys: Array<Proteus.keys.PreKey>) => {
          // TODO: Insert total amount of PreKeys (from cache) into "xx"
          this.logger.log(`Initialized Cryptobox with "${newPreKeys.length}" PreKeys (${newPreKeys.length} of them are new).`);
          return this;
        });
    });
  }

  private get_initial_prekeys(): Promise<Array<Proteus.keys.PreKey>> {
    return Promise.resolve().then(() => {
      return this.store.load_prekeys()
        .then((currentPreKeys: Array<Proteus.keys.PreKey>) => {
          let missingAmount: number = 0;
          let highestId: number = 0;

          if (currentPreKeys.length < this.minimumAmountOfPreKeys) {
            missingAmount = this.minimumAmountOfPreKeys - currentPreKeys.length;
            highestId = -1;

            currentPreKeys.forEach((preKey: Proteus.keys.PreKey) => {
              if (preKey.key_id > highestId && preKey.key_id !== Proteus.keys.PreKey.MAX_PREKEY_ID) {
                highestId = preKey.key_id;
              }
            });

            highestId += 1;

            this.logger.warn(`There are not enough PreKeys in the storage. Generating "${missingAmount}" new PreKeys, starting from ID "${highestId}"...`)
          }

          return this.new_prekeys(highestId, missingAmount);
        })
        .then((newPreKeys: Array<Proteus.keys.PreKey>) => {
          if (newPreKeys.length > 0) {
            this.channel.publish(this.EVENT.NEW_PREKEYS, newPreKeys);
            this.logger.log(`Published event '${this.EVENT.NEW_PREKEYS}'.`, newPreKeys);
          }
          return newPreKeys;
        });
    });
  }

  public session_from_prekey(client_id: string, pre_key_bundle: ArrayBuffer): Promise<CryptoboxSession> {
    return Promise.resolve().then(() => {
      let bundle: Proteus.keys.PreKeyBundle = Proteus.keys.PreKeyBundle.deserialise(pre_key_bundle);
      return Proteus.session.Session.init_from_prekey(this.identity, bundle).then((session: Proteus.session.Session) => {
        return new CryptoboxSession(client_id, this.pk_store, session);
      });
    });
  }

  public session_from_message(session_id: string, envelope: ArrayBuffer): Promise<(CryptoboxSession | Uint8Array)[]> {
    return Promise.resolve().then(() => {
      let env: Proteus.message.Envelope;
      env = Proteus.message.Envelope.deserialise(envelope);

      return Proteus.session.Session.init_from_message(this.identity, this.pk_store, env)
        .then((tuple: Proteus.session.SessionFromMessageTuple) => {
          let session: Proteus.session.Session = tuple[0];
          let decrypted: Uint8Array = tuple[1];
          let cryptoBoxSession: CryptoboxSession = new CryptoboxSession(session_id, this.pk_store, session);
          return [cryptoBoxSession, decrypted];
        })
    });
  }

  public session_load(session_id: string): Promise<CryptoboxSession> {
    return Promise.resolve().then(() => {
      let cachedSession = this.load_session_from_cache(session_id);
      if (cachedSession) {
        return cachedSession;
      } else {
        return this.store.load_session(this.identity, session_id)
          .then((session: Proteus.session.Session) => {
            if (session) {
              let pk_store: ReadOnlyStore = new ReadOnlyStore(this.store);
              let cryptoBoxSession: CryptoboxSession = new CryptoboxSession(session_id, pk_store, session);
              return cryptoBoxSession;
            } else {
              throw new Error(`Session with ID '${session}' not found.`);
            }
          })
          .then(function (session) {
            return this.save_session_in_cache(session);
          })
      }
    });
  }

  public session_save(session: CryptoboxSession): Promise<String> {
    return this.store.save_session(session.id, session.session).then(() => {

      let prekey_deletions = [];
      session.pk_store.removed_prekeys.forEach((pk_id: number) => {
        prekey_deletions.push(this.store.delete_prekey(pk_id));
      });

      return Promise.all(prekey_deletions);
    }).then(() => {
      return this.get_initial_prekeys();
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

  public new_prekey(prekey_id: number): Promise<ArrayBuffer> {
    return Promise.resolve().then(() => {
      let pk: Proteus.keys.PreKey = Proteus.keys.PreKey.new(prekey_id);
      return this.store.save_prekey(pk).then(() => {
        let serialisedPreKeyBundle: ArrayBuffer = Proteus.keys.PreKeyBundle.new(this.identity.public_key, pk).serialise();
        return serialisedPreKeyBundle;
      });
    });
  }

  public new_prekeys(start: number, size: number = 0): Promise<Array<Proteus.keys.PreKey>> {
    return Promise.resolve().then(() => {
      if (size === 0) {
        return new Array<Proteus.keys.PreKey>();
      }
      let newPreKeys: Array<Proteus.keys.PreKey> = Proteus.keys.PreKey.generate_prekeys(start, size);
      return this.store.save_prekeys(newPreKeys);
    });
  }

  public encrypt(session: CryptoboxSession|string, payload: string|Uint8Array): Promise<ArrayBuffer> {
    let encryptedBuffer: ArrayBuffer;
    let loadedSession: CryptoboxSession;

    return Promise.resolve().then(() => {
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
        return message;
      });
  }
}
