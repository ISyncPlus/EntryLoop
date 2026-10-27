export class BatchRejectedError extends Error {
  constructor(
    message: string,
    readonly recordCount: number,
  ) {
    super(message);
    this.name = 'BatchRejectedError';
  }
}
