// Benchmark-only transport experiment. Never log headers, full URLs, bodies, credential IDs or error messages.
import { Agent as HttpAgent, request as httpRequest, type ClientRequest } from 'node:http';
import { Agent as HttpsAgent, request as httpsRequest, type AgentOptions, type RequestOptions } from 'node:https';
import { connect as connectTcp, type TcpNetConnectOpts, type Socket } from 'node:net';
import type { TLSSocket } from 'node:tls';
import { Readable, type Duplex } from 'node:stream';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { HttpRequest, HttpResponse } from '@smithy/protocol-http';
import { trace, hostClockMs } from './trace';

const httpAgent = new HttpAgent({ keepAlive: true });
type Dial = { startedHostMs: number; dnsMs?: number; connectMs?: number; tlsMs?: number; outcome: string };
const dialAttempts = new WeakMap<AbortSignal, Dial[]>();
const dialDetails = new WeakMap<Duplex, { chosen: Dial; trials: Dial[]; claimed: boolean }>();
type DialOptions = RequestOptions;
// Race at most two TCP connections, then perform one normal verified TLS handshake before HTTP dispatch.
export class HedgedHttpsAgent extends HttpsAgent {
  private activeSignal?: AbortSignal;
  withSignal<T>(signal: AbortSignal, create: () => T): T {
    const previous = this.activeSignal;
    this.activeSignal = signal;
    try {
      return create();
    } finally {
      this.activeSignal = previous;
    }
  }
  constructor(
    options: AgentOptions = {},
    private readonly hedgeDelay = 300
  ) {
    super({ ...options, keepAlive: true });
  }
  protected connectSocket(options: TcpNetConnectOpts): Socket {
    return connectTcp(options);
  }
  override createConnection(
    options: DialOptions,
    callback?: (error: Error | null, socket: Duplex) => void
  ): Duplex | null | undefined {
    if (!callback) return super.createConnection(options);
    const pending = new Set<Duplex>();
    const trials: Dial[] = [];
    let finished = false;
    let backup: ReturnType<typeof setTimeout> | undefined;
    let last: Duplex;
    const signal = this.activeSignal;
    if (signal) dialAttempts.set(signal, trials);
    const abort = () => {
      const error = new Error('Connection canceled');
      error.name = 'AbortError';
      finish(error);
    };
    const finish = (error: Error | null, winner?: Duplex, chosen?: Dial) => {
      if (finished) return;
      finished = true;
      clearTimeout(backup);
      signal?.removeEventListener('abort', abort);
      for (const socket of pending) if (socket !== winner) socket.destroy();
      for (const trial of trials) if (trial !== chosen && trial.outcome === 'pending') trial.outcome = 'canceled';
      if (winner && chosen) {
        const secureOptions: DialOptions & { socket: Duplex } = { ...options, socket: winner };
        const secure = super.createConnection(secureOptions) as TLSSocket;
        secure.once('secureConnect', () => {
          chosen.tlsMs = hostClockMs() - chosen.startedHostMs;
          chosen.outcome = 'ready';
        });
        dialDetails.set(secure, { chosen, trials, claimed: false });
        callback(null, secure);
      } else callback(error, last);
    };
    const dial = () => {
      const record: Dial = { startedHostMs: hostClockMs(), outcome: 'pending' };
      trials.push(record);
      const socket = this.connectSocket({
        host: options.hostname ?? options.host ?? 'localhost',
        port: Number(options.port ?? 443),
        family: options.family,
        lookup: options.lookup,
        localAddress: options.localAddress,
        localPort: options.localPort
      });
      last = socket;
      pending.add(socket);
      socket.once('lookup', () => {
        record.dnsMs = hostClockMs() - record.startedHostMs;
      });
      socket.once('connect', () => {
        record.connectMs = hostClockMs() - record.startedHostMs;
        record.outcome = 'tcp-ready';
        finish(null, socket, record);
      });
      socket.once('close', () => {
        if (record.outcome === 'pending') record.outcome = 'canceled';
      });
      socket.once('error', (error) => {
        pending.delete(socket);
        if (finished) return;
        record.outcome = error.name;
        if (trials.length < 2) {
          clearTimeout(backup);
          dial();
        } else if (pending.size === 0) finish(error);
      });
    };
    dial();
    if (!finished && trials.length < 2) backup = setTimeout(dial, this.hedgeDelay);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    return undefined;
  }
}
const httpsAgent = new HedgedHttpsAgent();
let sequence = 0;

export const createMeasuredHandler = ({
  requestTimeout = 30_000,
  secureAgent = httpsAgent
}: { requestTimeout?: number; secureAgent?: HedgedHttpsAgent } = {}) => {
  const handler = new NodeHttpHandler({ httpAgent, httpsAgent: secureAgent });
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
    let connectionDials: Dial[] | undefined;
    let rejectOnAbort: (() => void) | undefined;
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
    try {
      const response = await new Promise<HttpResponse>((resolve, reject) => {
        rejectOnAbort = () => {
          const error = new Error('Request canceled');
          error.name = 'AbortError';
          reject(error);
        };
        if (signal.aborted) {
          rejectOnAbort();
          return;
        }
        signal.addEventListener('abort', rejectOnAbort, { once: true });
        const secure = request.protocol === 'https:';
        outgoing = secureAgent.withSignal(signal, () =>
          (secure ? httpsRequest : httpRequest)(
            {
              protocol: request.protocol,
              hostname: request.hostname,
              port: request.port,
              path: request.path + (query.size ? `?${query}` : ''),
              method: request.method,
              headers: request.headers,
              agent: secure ? secureAgent : httpAgent,
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
          )
        );
        outgoing.on('error', reject);
        outgoing.on('socket', (socket) => {
          mark('socketMs');
          const details = dialDetails.get(socket);
          if (details && !details.claimed) {
            details.claimed = true;
            connectionDials = details.trials;
            marks.reused = 0;
            marks.socketMs = details.chosen.startedHostMs - startedHostMs;
            for (const name of ['dnsMs', 'connectMs', 'tlsMs'] as const) {
              const value = details.chosen[name];
              if (value !== undefined) marks[name] = marks.socketMs + value;
            }
            if (details.chosen.tlsMs === undefined) (socket as TLSSocket).once('secureConnect', () => mark('tlsMs'));
            return;
          }
          if (!socket.connecting) {
            marks.reused = 1;
            return;
          }
          marks.reused = 0;
          socket.once('lookup', (error) => {
            mark('dnsMs');
            if (error) marks.dnsError = error.name;
          });
          socket.once('connect', () => {
            mark('connectMs');
          });
          (socket as TLSSocket).once('secureConnect', () => {
            mark('tlsMs');
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
      if (timedOut) {
        const timeout = new Error(`Request did not complete within ${timeoutMs} ms`, { cause: error });
        timeout.name = 'TimeoutError';
        throw timeout;
      }
      throw error;
    } finally {
      clearTimeout(timer);
      if (rejectOnAbort) signal.removeEventListener('abort', rejectOnAbort);
      connectionDials ??= dialAttempts.get(signal);
      dialAttempts.delete(signal);
      trace('aws-http', {
        id,
        service: request.hostname,
        target: safeOperation,
        startedHostMs,
        // SDK invocation/attempt identifiers contain no authentication data; retain retries and redirects individually.
        invocation: request.headers['amz-sdk-invocation-id'],
        attempt: request.headers['amz-sdk-request'],
        totalMs: hostClockMs() - startedHostMs,
        ...marks,
        connectionDials
      });
    }
  };
  return handler;
};

// Match the Console's buffered JSON fetch contract and trace it through the same transport, with no request data.
export const measuredConsoleFetch = async (url: string, options: RequestInit = {}) => {
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
