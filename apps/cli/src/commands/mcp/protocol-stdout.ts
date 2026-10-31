import { Writable } from 'node:stream';

let protocolStdout: Writable | undefined;

/**
 * Reserves stdout for MCP protocol frames and returns the only stream that still writes there.
 *
 * A stdio MCP client parses every stdout line as JSON-RPC, so a stray human line (the CLI's completion line, an exit
 * summary, a notice written through `console.info`) breaks or pollutes the session. After the first call, writes to
 * `process.stdout` and `console.log`/`info`/`debug` go to stderr, which clients show as server logs. Bun's console
 * writes to the file descriptor directly, so redirecting `process.stdout.write` alone would not catch it. The redirect
 * lasts for the life of the process, so output the CLI writes after the server closes also stays off stdout.
 *
 * Call it before anything else configures output, so later console wrappers capture the redirected methods.
 */
export const reserveStdoutForProtocol = (): Writable => {
  if (protocolStdout) return protocolStdout;
  const writeToStdout = process.stdout.write.bind(process.stdout);
  process.stdout.write = process.stderr.write.bind(process.stderr) as typeof process.stdout.write;
  const writeLineToStderr = console.error.bind(console);
  console.log = writeLineToStderr;
  console.info = writeLineToStderr;
  console.debug = writeLineToStderr;
  const stream = new Writable({
    write(chunk: Buffer | string, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
      writeToStdout(chunk, encoding, callback);
    }
  });
  // A client that went away makes stdout fail (EPIPE). The transport sees the error on this stream instead of an
  // unhandled stdout error ending the process.
  process.stdout.on('error', (error) => stream.destroy(error));
  protocolStdout = stream;
  return stream;
};
