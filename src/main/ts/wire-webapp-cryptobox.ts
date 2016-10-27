/// <reference path="../../../typings/index.d.ts" />

import Cache from "./store/Cache";
import IndexedDB from "./store/IndexedDB";
import LocalStorage from "./store/LocalStorage";
import {Cryptobox} from "./Cryptobox";
import {ReadOnlyStore} from "./store/ReadOnlyStore";
import {CryptoboxSession} from "./CryptoboxSession";

export default {
  Cryptobox: Cryptobox,
  CryptoboxSession: CryptoboxSession,
  store: {
    Cache,
    IndexedDB,
    LocalStorage,
    ReadOnlyStore
  }
}
