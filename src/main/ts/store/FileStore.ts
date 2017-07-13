import * as fs from 'fs-extra';
import Logdown = require('logdown');
import path = require('path');
import {CryptoboxCRUDStore} from './CryptoboxCRUDStore';
import {RecordNotFoundError} from './error';
import {SerialisedRecord} from './SerialisedRecord';
import {SerialisedUpdate} from './SerialisedUpdate';

export default class FileStore extends CryptoboxCRUDStore {
  private logger: Logdown;
  private storagePath: string;

  constructor(storagePath: string) {
    super();
    this.storagePath = path.normalize(storagePath);
    this.logger = new Logdown({alignOutput: true, markdown: false, prefix: "cryptobox.store.FileStore"});
    this.logger.log(`Initialized Cryptobox storage in directory "${this.storagePath}"...`);
  }

  /**
   * @override
   */
  create(storeName: string, primaryKey: string, record: SerialisedRecord): Promise<string> {
    this.logger.log(`Creating record "${primaryKey}" in directory "${storeName}"...`, record);

    const file: string = path.normalize(`${this.storagePath}/${storeName}/${primaryKey}.txt`);
    const base64EncodedData: string = new Buffer(record.serialised).toString("base64");

    return fs.outputFile(file, base64EncodedData)
      .then(() => {
        return file;
      });
  }

  /**
   * @override
   */
  update(store_name: string, primary_key: string, changes: SerialisedUpdate): Promise<string> {
    const updatedRecord = new SerialisedRecord(changes.serialised, primary_key);
    return this.create(store_name, primary_key, updatedRecord);
  }

  /**
   * @override
   */
  read(store_name: string, primary_key: string): Promise<SerialisedRecord> {
    this.logger.log(`Reading record with primary key "${primary_key}" from directory "${store_name}"...`);
    const file: string = path.normalize(`${this.storagePath}/${store_name}/${primary_key}.txt`);

    return new Promise((resolve, reject) => {
      fs.readFile(file, {encoding: 'utf8', flag: 'r'}, function (error, data: any) {
        if (error) {
          if (error.code === 'ENOENT') {
            const message: string = `Record "${primary_key}" from file "${file}" could not be found.`;
            reject(new RecordNotFoundError(message));
          } else {
            reject(error);
          }
        } else {
          const decodedData: Buffer = Buffer.from(data, "base64");
          const serialised: ArrayBuffer = new Uint8Array(decodedData).buffer;
          const record: SerialisedRecord = new SerialisedRecord(serialised, CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY);
          resolve(record);
        }
      });
    });
  }

  /**
   * @override
   */
  read_all(store_name: string): Promise<SerialisedRecord[]> {
    const directory: string = path.normalize(`${this.storagePath}/${store_name}`);

    return new Promise((resolve) => {
      fs.readdir(directory, (error, files) => {
        const recordNames = files.map((file) => {
          return path.basename(file, path.extname(file));
        });

        const promises = recordNames.map((primary_key) => {
          return this.read(store_name, primary_key);
        });

        Promise.all(promises)
          .then((records: SerialisedRecord[]) => {
            resolve(records);
          });
      });
    });
  }

  /**
   * @override
   */
  delete(store_name: string, primary_key: string): Promise<string> {
    this.logger.log(`Deleting record with primary key "${primary_key}" in directory "${store_name}"...`);
    const file: string = path.normalize(`${this.storagePath}/${store_name}/${primary_key}.json`);

    return fs.remove(file)
      .then(() => {
        return primary_key;
      });
  }

  /**
   * @override
   */
  delete_all(): Promise<boolean> {
    return fs.remove(this.storagePath)
      .then(() => {
        return true;
      });
  }
}
