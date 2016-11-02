import * as Proteus from "wire-webapp-proteus";

export interface CryptoboxStore {
  delete_all(): Promise<boolean>;

  /**
   * Deletes a specified PreKey.
   * @param prekey_id
   * @return Promise<string> Resolves with the "ID" from the record, which has been deleted.
   */
  delete_prekey(prekey_id: number): Promise<string>;

  /**
   * Deletes a specified session.
   * @param session_id
   * @return Promise<string> Resolves with the "ID" from the record, which has been deleted.
   */
  delete_session(session_id: string): Promise<string>;

  /**
   * Loads the local identity.
   * @return Promise<Proteus.keys.IdentityKeyPair> Resolves with the "key pair" from the local identity.
   */
  load_identity(): Promise<Proteus.keys.IdentityKeyPair>;

  /**
   * Loads a specified PreKey.
   * @param prekey_id
   * @return Promise<Proteus.keys.PreKey> Resolves with the the specified "PreKey".
   */
  load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey>;

  /**
   * Loads all available PreKeys.
   */
  load_prekeys(): Promise<Array<Proteus.keys.PreKey>>;

  /**
   * Loads a specified session.
   * @param identity
   * @param session_id
   * @return Promise<Proteus.session.Session> Resolves with the the specified "session".
   */
  load_session(identity: Proteus.keys.IdentityKeyPair, session_id: string): Promise<Proteus.session.Session>;

  /**
   * Saves the local identity.
   * @param identity
   * @return Promise<string> Resolves with the "fingerprint" from the saved local identity.
   */
  save_identity(identity: Proteus.keys.IdentityKeyPair): Promise<Proteus.keys.IdentityKeyPair>;

  /**
   * Saves a specified PreKey.
   * @param key
   * @return Promise<string> Resolves with the "ID" from the saved PreKey record.
   */
  save_prekey(key: Proteus.keys.PreKey): Promise<Proteus.keys.PreKey>;

  save_prekeys(preKeys: Array<Proteus.keys.PreKey>): Promise<Array<Proteus.keys.PreKey>>;

  /**
   * Saves a specified session.
   * @param session_id
   * @param session
   * @return Promise<string> Resolves with the "ID" from the saved session record.
   */
  save_session(session_id: string, session: Proteus.session.Session): Promise<Proteus.session.Session>;
}
