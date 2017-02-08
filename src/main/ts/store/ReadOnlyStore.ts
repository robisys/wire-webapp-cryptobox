import * as Proteus from "wire-webapp-proteus";
import {CryptoboxStore} from "./CryptoboxStore";

export class ReadOnlyStore extends Proteus.session.PreKeyStore {
  public prekeys: Array<number> = [];

  constructor(private store: CryptoboxStore) {
    super();
  }

  get_prekey(prekey_id: number): Promise<Proteus.keys.PreKey> {
    return new Promise((resolve, reject) => {
      if (this.prekeys.indexOf(prekey_id) !== -1) {
        reject(new Error(`PreKey "${prekey_id}" not found.`));
      } else {
        this.store.load_prekey(prekey_id).then(function (pk: Proteus.keys.PreKey) {
          resolve(pk);
        });
      }
    });
  }

  remove(prekey_id: number): Promise<number> {
    this.prekeys.push(prekey_id);
    return Promise.resolve(prekey_id);
  }
}
