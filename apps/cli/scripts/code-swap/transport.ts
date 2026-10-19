// Benchmark-only transport experiment. Never log headers, full URLs, bodies, credential IDs or error messages.
import { Agent as HttpAgent, request as httpRequest, type ClientRequest } from 'node:http';
import { Agent as HttpsAgent, request as httpsRequest } from 'node:https';
import type { TLSSocket } from 'node:tls';
import { Readable } from 'node:stream';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { HttpRequest, HttpResponse } from '@smithy/protocol-http';
import { trace, hostClockMs } from './trace';

const httpAgent = new HttpAgent({ keepAlive: true });
const httpsAgent = new HttpsAgent({ keepAlive: true });
let sequence = 0;

class ConnectionTimeoutError extends Error {
  constructor() {
    super('Connection did not become ready before HTTP dispatch');
    this.name = 'TimeoutError';
  }
}
export const createMeasuredHandler = ({
  requestTimeout = 30_000,
  connectionTimeout = 1500
}: { requestTimeout?: number; connectionTimeout?: number } = {}) => {
  const handler = new NodeHttpHandler({ httpAgent, httpsAgent });
  // Agents belong to the benchmark invocation, not to individual service clients.
  handler.destroy = () => {};
  handler.handle = async (request, options = {}) => {
    const startedHostMs = hostClockMs();
    const id = ++sequence;
    const marks: Record<string, number | string | undefined> = {};
    const mark = (name: string) => {
      marks[name] = hostClockMs() - startedHostMs;
    };
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(request.query ?? {})) {
      for (const item of Array.isArray(value) ? value : [value]) query.append(key, item ?? '');
    }
    const action = typeof request.body === 'string' ? new URLSearchParams(request.body).get('Action') : undefined;
    const operation = request.headers['x-amz-target'] ?? action ?? request.method;
    const safeOperation = /^[a-zA-Z0-9_.-]+$/.test(operation) ? operation : request.method;
    let outgoing: ClientRequest | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let connectionTimer: ReturnType<typeof setTimeout> | undefined;
    let connectionTimedOut = false;
    const controller = new AbortController();
    const signal = options.abortSignal
      ? AbortSignal.any([options.abortSignal as AbortSignal, controller.signal])
      : controller.signal;
    const timeoutMs = options.requestTimeout ?? requestTimeout;
    let timedOut = false;
    if (timeoutMs > 0)
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs);
    if (connectionTimeout > 0 && !(request.body instanceof Readable))
      connectionTimer = setTimeout(() => {
        connectionTimedOut = true;
        marks.timeoutPhase = 'connection';
        controller.abort();
      }, connectionTimeout);
    try {
      const response = await new Promise<HttpResponse>((resolve, reject) => {
        const secure = request.protocol === 'https:';
        outgoing = (secure ? httpsRequest : httpRequest)(
          {
            protocol: request.protocol,
            hostname: request.hostname,
            port: request.port,
            path: request.path + (query.size ? `?${query}` : ''),
            method: request.method,
            headers: request.headers,
            agent: secure ? httpsAgent : httpAgent,
            signal
          },
          (incoming) => {
            mark('firstByteMs');
            marks.status = incoming.statusCode;
            const chunks: Buffer[] = [];
            incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
            incoming.on('error', reject);
            incoming.on('end', () => {
              const headers: Record<string, string> = {};
              for (const [name, value] of Object.entries(incoming.headers))
                if (value !== undefined) headers[name] = Array.isArray(value) ? value.join(', ') : value;
              resolve(
                new HttpResponse({
                  statusCode: incoming.statusCode ?? 0,
                  headers,
                  body: Readable.from(Buffer.concat(chunks))
                })
              );
            });
          }
        );
        outgoing.on('error', reject);
        outgoing.on('socket', (socket) => {
          mark('socketMs');
          if (!socket.connecting) {
            marks.reused = 1;
            clearTimeout(connectionTimer);
            return;
          }
          marks.reused = 0;
          socket.once('lookup', (error) => {
            mark('dnsMs');
            if (error) marks.dnsError = error.name;
          });
          socket.once('connect', () => {
            mark('connectMs');
            if (!secure) clearTimeout(connectionTimer);
          });
          (socket as TLSSocket).once('secureConnect', () => {
            mark('tlsMs');
            clearTimeout(connectionTimer);
          });
        });
        outgoing.on('finish', () => mark('sentMs'));
        if (request.body instanceof Readable) {
          request.body.on('error', (error) => outgoing!.destroy(error));
          request.body.pipe(outgoing);
        } else outgoing.end(request.body);
      });
      return { response };
    } catch (error) {
      marks.error = error instanceof Error ? error.name : 'UnknownError';
      if (connectionTimedOut) throw new ConnectionTimeoutError();
      if (timedOut) {
        const timeout = new Error(`Request did not complete within ${timeoutMs} ms`, { cause: error });
        timeout.name = 'TimeoutError';
        throw timeout;
      }
      throw error;
    } finally {
      clearTimeout(timer);
      clearTimeout(connectionTimer);
      trace('aws-http', {
        id,
        service: request.hostname,
        target: safeOperation,
        startedHostMs,
        // SDK invocation/attempt identifiers contain no authentication data; retain retries and redirects individually.
        invocation: request.headers['amz-sdk-invocation-id'],
        attempt: request.headers['amz-sdk-request'],
        totalMs: hostClockMs() - startedHostMs,
        ...marks
      });
    }
  };
  return handler;
};

// Match the Console's buffered JSON fetch contract and trace it through the same transport, with no request data.
const consoleAttempt = async (url: string, options: RequestInit) => {
  const parsed = new URL(url);
  const handler = createMeasuredHandler();
  const { response } = await handler.handle(
    new HttpRequest({
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : undefined,
      method: options.method ?? 'GET',
      path: parsed.pathname,
      query: Object.fromEntries(
        [...new Set(parsed.searchParams.keys())].map((key) => [key, parsed.searchParams.getAll(key)])
      ),
      headers: Object.fromEntries(new Headers(options.headers).entries()),
      body: options.body
    }),
    { abortSignal: options.signal ?? undefined }
  );
  const chunks: Buffer[] = [];
  for await (const chunk of response.body) chunks.push(Buffer.from(chunk));
  return new Response(Buffer.concat(chunks), { status: response.statusCode, headers: response.headers });
};

// Retry only a connection that never became ready to send HTTP. A dispatched request/body failure is not replayed.
// One deadline covers all Console connection attempts and full response-body collection.
export const measuredConsoleFetch = async (url: string, options: RequestInit = {}) => {
  const deadline = AbortSignal.timeout(30000);
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline;
  for (let attempt = 1; ; attempt++) {
    try {
      return await consoleAttempt(url, { ...options, signal });
    } catch (error) {
      if (
        !(error instanceof ConnectionTimeoutError) ||
        attempt >= 3 ||
        signal.aborted ||
        options.body instanceof Readable
      )
        throw error;
    }
  }
};
