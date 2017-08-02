import Logdown = require('logdown');
import path = require('path');
import {CryptoboxCRUDStore} from './CryptoboxCRUDStore';
import {FileEngine} from '@wireapp/store-engine/dist/commonjs/engine';

export default class FileStore extends CryptoboxCRUDStore {
  private logger: Logdown;

  constructor(storagePath: string) {
    super();
    super.engine = new FileEngine(path.normalize(storagePath));
    this.logger = new Logdown({alignOutput: true, markdown: false, prefix: "cryptobox.store.FileStore"});
    this.logger.log(`Initialized Cryptobox storage in directory "${this.storagePath}"...`);
  }
}
