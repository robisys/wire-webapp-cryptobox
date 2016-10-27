import * as Proteus from "wire-webapp-proteus";
import {ReadOnlyStore} from "./store/ReadOnlyStore";

export class CryptoboxSession {
  public id: string;
  public pk_store: ReadOnlyStore;
  public session: Proteus.session.Session;

  constructor(id: string, pk_store: ReadOnlyStore, session: Proteus.session.Session) {
    this.id = id;
    this.pk_store = pk_store;
    this.session = session;
    Object.freeze(this);
  }

  public decrypt(ciphertext: ArrayBuffer): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      let envelope: Proteus.message.Envelope = Proteus.message.Envelope.deserialise(ciphertext);
      this.session.decrypt(this.pk_store, envelope).then(function (plaintext: Uint8Array) {
        resolve(plaintext);
      }).catch(reject);
    });
  }

  public encrypt(plaintext: string|Uint8Array): Promise<ArrayBuffer> {
    return new Promise((resolve) => {
      this.session.encrypt(plaintext).then(function (ciphertext: Proteus.message.Envelope) {
        resolve(ciphertext.serialise());
      });
    });
  }

  public fingerprint_local(): string {
    return this.session.local_identity.public_key.fingerprint();
  }

  public fingerprint_remote(): string {
    return this.session.remote_identity.fingerprint();
  }
}
