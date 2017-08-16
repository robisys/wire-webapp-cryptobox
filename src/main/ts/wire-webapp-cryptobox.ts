import Cache from './store/Cache';
import FileStore from './store/FileStore';
import IndexedDB from './store/IndexedDB';
import {Cryptobox} from './Cryptobox';
import {CryptoboxError} from './error';
import {CryptoboxSession} from './CryptoboxSession';
import {DecryptionError} from './DecryptionError';
import {InvalidPreKeyFormatError} from './InvalidPreKeyFormatError';
import {ReadOnlyStore} from './store/ReadOnlyStore';
import {RecordAlreadyExistsError, RecordNotFoundError, RecordTypeError} from './store/error';

export default {
  Cryptobox,
  CryptoboxSession,
  DecryptionError,
  error: {
    CryptoboxError,
  },
  InvalidPreKeyFormatError,
  store: {
    Cache,
    error: {
      RecordAlreadyExistsError,
      RecordNotFoundError,
      RecordTypeError,
    },
    FileStore,
    IndexedDB,
    ReadOnlyStore,
  }
}
