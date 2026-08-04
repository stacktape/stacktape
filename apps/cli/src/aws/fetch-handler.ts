import { FetchHttpHandler } from '@smithy/fetch-http-handler';
import { Readable } from 'node:stream';

// Workaround for Bun >= 1.3.0 bug where HTTPS requests through node:http/node:https
// hang indefinitely after ~400-500 requests. FetchHttpHandler uses native fetch() which
// is not affected. See: https://github.com/oven-sh/bun/issues/26066
//
// FetchHttpHandler returns Web ReadableStream bodies, but the SDK's Node.js streamCollector
// expects .pipe(). Readable.fromWeb() bridges this but leaks resources (hangs after ~200 reqs).
// Instead, we eagerly drain the Web ReadableStream into a Buffer, then wrap in Readable.from()
// so the connection is released immediately.
export const createFetchHandler = ({ requestTimeout = 30_000 }: { requestTimeout?: number } = {}) => {
  const handler = new FetchHttpHandler({ requestTimeout });
  const originalHandle = handler.handle.bind(handler);

  handler.handle = async (request, options) => {
    const result = await originalHandle(request, options);
    const body = result.response.body;
    if (body && typeof (body as ReadableStream).getReader === 'function' && typeof (body as any).pipe !== 'function') {
      const reader = (body as ReadableStream<Uint8Array>).getReader();
      const chunks: Uint8Array[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      result.response.body = Readable.from(Buffer.concat(chunks));
    }
    return result;
  };

  return handler;
};
