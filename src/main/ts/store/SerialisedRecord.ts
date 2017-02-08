export class SerialisedRecord {
  public id: string;
  public serialised: ArrayBuffer;

  constructor(serialised: ArrayBuffer, id: string) {
    this.id = id;
    this.serialised = serialised;
  }
}
