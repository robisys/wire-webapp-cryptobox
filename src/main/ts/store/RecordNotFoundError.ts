export class RecordNotFoundError extends Error {
  constructor(public message: string) {
    super(message);
    Object.setPrototypeOf(this, RecordNotFoundError.prototype);
    this.name = (<any>this).constructor.name;
    this.message = message;
    this.stack = new Error().stack;
  }
}
