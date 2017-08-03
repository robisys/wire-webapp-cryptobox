import Cache from './store/Cache';
import IndexedDB from './store/IndexedDB';
import CryptoboxCRUDStore from './store/CryptoboxCRUDStore';
import {CryptoboxSession} from './CryptoboxSession';
import {Cryptobox} from './Cryptobox';
import {DecryptionError} from './DecryptionError';
import {InvalidPreKeyFormatError} from './InvalidPreKeyFormatError';
import {ReadOnlyStore} from './store/ReadOnlyStore';
import {RecordAlreadyExistsError, RecordNotFoundError, RecordTypeError} from './store/error';

export default {
  Cryptobox: Cryptobox,
  CryptoboxSession: CryptoboxSession,
  DecryptionError: DecryptionError,
  InvalidPreKeyFormatError: InvalidPreKeyFormatError,
  store: {
    error: {
      RecordAlreadyExistsError,
      RecordNotFoundError,
      RecordTypeError,
    },
    Cache,
    CryptoboxCRUDStore,
    IndexedDB,
    ReadOnlyStore,
    RecordAlreadyExistsError,
    RecordNotFoundError
  }
}
