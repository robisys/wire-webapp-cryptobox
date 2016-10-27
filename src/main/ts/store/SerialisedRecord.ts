export class SerialisedRecord {
  public id: string;
  public serialised: string;

  constructor(serialised: string, id: string) {
    this.id = id;
    this.serialised = serialised;
  }
}
