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
      // Use a real byte as the flush marker. Bun may acknowledge a zero-length write immediately,
      // before an earlier large record has drained. A blank line is harmless in both human output
      // and JSONL (consumers already ignore empty lines), and its callback is ordered after all
      // preceding writes to the underlying stream.
      stream.write('\n', (error) => finish(error === undefined || error === null));
    } catch {
      finish(false);
    }
  });
};
