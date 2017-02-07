import Cache from "./store/Cache";
import IndexedDB from "./store/IndexedDB";
import LocalStorage from "./store/LocalStorage";
import {Cryptobox} from "./Cryptobox";
import {ReadOnlyStore} from "./store/ReadOnlyStore";
import {CryptoboxSession} from "./CryptoboxSession";
import {RecordNotFoundError} from "./store/RecordNotFoundError";

export default {
  Cryptobox: Cryptobox,
  CryptoboxSession: CryptoboxSession,
  store: {
    Cache,
    IndexedDB,
    LocalStorage,
    ReadOnlyStore,
    RecordNotFoundError,
  },
  // Note: Path to "package.json" must be relative to the "commonjs" dist files
  version: require('../../package.json').version
}
