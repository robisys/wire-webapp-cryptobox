import Cache from './store/Cache';
import FileStore from './store/FileStore';
import IndexedDB from './store/IndexedDB';
import {CryptoboxSession} from './CryptoboxSession';
import {Cryptobox} from './Cryptobox';
import {DecryptionError} from './DecryptionError';
import {InvalidPreKeyFormatError} from './InvalidPreKeyFormatError';
import {ReadOnlyStore} from './store/ReadOnlyStore';
import {RecordAlreadyExistsError, RecordNotFoundError} from './store/error';

export default {
  Cryptobox: Cryptobox,
  CryptoboxSession: CryptoboxSession,
  DecryptionError: DecryptionError,
  InvalidPreKeyFormatError: InvalidPreKeyFormatError,
  store: {
    Cache,
    FileStore,
    IndexedDB,
    ReadOnlyStore,
    RecordAlreadyExistsError,
    RecordNotFoundError
  }
}
