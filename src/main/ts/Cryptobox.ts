import * as Proteus from "wire-webapp-proteus";
import Logdown from "logdown";
import {CryptoboxSession} from "./CryptoboxSession";
import {CryptoboxStore} from "./store/CryptoboxStore";
import {ReadOnlyStore} from "./store/ReadOnlyStore";
import postal = require("postal");

export class Cryptobox {
  // TODO: Limit the amount of items in cache
  public EVENT = {
    NEW_PREKEYS: 'new-prekeys'
  };
  private cachedSessions: Object = {};
  private channel = postal.channel("cryptobox");

  private logger: Logdown;
  private minimumAmountOfPreKeys: number;
  private pk_store: ReadOnlyStore;
  private store: CryptoboxStore;

  public identity: Proteus.keys.IdentityKeyPair;

  constructor(cryptoBoxStore: CryptoboxStore, minimumAmountOfPreKeys: number = 1) {
    if(!cryptoBoxStore) {
      throw new Error(`You cannot initialize Cryptobox without a storage component.`);
    }

    this.logger = new Logdown({prefix: 'cryptobox.Cryptobox', minLength: 26});
    this.logger.log(`Constructed Cryptobox. Minimum limit of PreKeys '${minimumAmountOfPreKeys}' (1 Last Resort PreKey and ${minimumAmountOfPreKeys - 1} others).`);
    this.minimumAmountOfPreKeys = minimumAmountOfPreKeys;
    this.pk_store = new ReadOnlyStore(this.store);
    this.store = cryptoBoxStore;
  }

  public init(): Promise<Cryptobox> {
    return new Promise((resolve, reject) => {
      this.store.load_identity()
        .catch(() => {
          let identity: Proteus.keys.IdentityKeyPair = Proteus.keys.IdentityKeyPair.new();
          this.logger.info(`Created new identity ${identity.public_key.fingerprint()}.`);
          return this.store.save_identity(identity);
        })
        .then((identity) => {
          this.identity = identity;
          return this.store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID);
        })
        .catch(() => {
          let lastResortPreKey: Proteus.keys.PreKey = Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
          return this.store.save_prekey(lastResortPreKey);
        })
        .then(() => {
          return this.generate_required_prekeys();
        })
        .then(() => {
          // TODO: Insert total amount of PreKeys (from cache) into "xx"
          this.logger.log(`Initialized Cryptobox with 'xx' PreKeys.`);
          resolve(this);
        }).catch(reject);
    });
  }

  private generate_required_prekeys(): Promise<Array<Proteus.keys.PreKey>> {
    return new Promise((resolve, reject) => {
      this.store.load_prekeys().then((currentPreKeys: Array<Proteus.keys.PreKey>) => {
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

          this.logger.log(`There are not enough available PreKeys. Generating '${missingAmount}' new PreKeys, starting from ID '${highestId}'...`)
        }

        return this.new_prekeys(highestId, missingAmount);
      }).then((newPreKeys: Array<Proteus.keys.PreKey>) => {
        if (newPreKeys.length > 0) {
          this.channel.publish(this.EVENT.NEW_PREKEYS, newPreKeys);
          this.logger.log(`Published event '${this.EVENT.NEW_PREKEYS}'.`, newPreKeys);
        }
        resolve(newPreKeys);
      }).catch(reject);
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
              let pk_store: ReadOnlyStore = new ReadOnlyStore(this.store);
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
        return this.generate_required_prekeys();
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
    return new Promise((resolve, reject) => {
      let pk: Proteus.keys.PreKey = Proteus.keys.PreKey.new(prekey_id);
      this.store.save_prekey(pk).then(() => {
        let serialisedPreKeyBundle: ArrayBuffer = Proteus.keys.PreKeyBundle.new(this.identity.public_key, pk).serialise();
        resolve(serialisedPreKeyBundle);
      }).catch(reject);
    });
  }

  public new_prekeys(start: number, size: number = 0): Promise<Array<Proteus.keys.PreKey>> {
    return new Promise((resolve, reject) => {
      if (size === 0) {
        resolve([]);
      }

      let newPreKeys: Array<Proteus.keys.PreKey> = Proteus.keys.PreKey.generate_prekeys(start, size);
      this.store.save_prekeys(newPreKeys).then(resolve).catch(reject);
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
