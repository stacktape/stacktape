/** Async domain operations whose public result must reject when the current command fails or is interrupted. */
class PendingOperations {
  #operations = new Map<symbol, (reason: unknown) => void>();

  get size() {
    return this.#operations.size;
  }

  track<Result>(operation: PromiseLike<Result>): Promise<Result> {
    const id = Symbol();
    return new Promise<Result>((resolve, reject) => {
      this.#operations.set(id, reject);
      Promise.resolve(operation).then(
        (result) => {
          this.#operations.delete(id);
          resolve(result);
        },
        (error: unknown) => {
          this.#operations.delete(id);
          reject(error);
        }
      );
    });
  }

  cancelAll(reason: unknown) {
    const operations = [...this.#operations.values()];
    this.#operations.clear();
    for (const reject of operations) reject(reason);
  }
}

export const pendingOperations = new PendingOperations();
