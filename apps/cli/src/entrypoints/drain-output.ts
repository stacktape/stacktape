/** Wait until every write already queued on a CLI output stream has reached the underlying pipe. */
export const drainOutputStream = async (stream: NodeJS.WriteStream, timeoutMs = 30_000): Promise<boolean> => {
  if (stream.destroyed || stream.writableEnded) return true;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (drained: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(drained);
    };
    const timeout = setTimeout(() => finish(false), timeoutMs);

    try {
      // The callback for this queued write runs only after all earlier output has reached the
      // underlying stream. A fixed delay can truncate large JSONL result records on slow pipes.
      stream.write('', (error) => finish(error === undefined || error === null));
    } catch {
      finish(false);
    }
  });
};
