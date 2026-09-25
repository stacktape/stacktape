/**
 * Local stand-ins for the services a full CLI command reaches, so the released CLI can be measured without AWS.
 *
 * - `serviceUrl` receives what the AWS SDK sends through `AWS_ENDPOINT_URL` and what telemetry sends through
 *   `POSTHOG_HOST`. It answers STS `GetCallerIdentity` for an account that does not exist and accepts telemetry
 *   batches. Every other AWS operation is refused with 403 `AccessDenied`, so a command that needs more than an
 *   identity fails instead of reaching AWS.
 * - `proxyUrl` is the HTTP and HTTPS proxy for everything else. It tunnels only to the `host:port` pairs it was given
 *   and refuses every other destination and every plain-HTTP request.
 *
 * Every request is recorded without its body, headers, query string or path beyond a fixed route: its kind, AWS
 * service and operation or tunnel host and port, status, byte counts, and start and end in milliseconds since the
 * fixture started. Credentials sent with a request never leave the handler.
 *
 * Everything is bounded. A request body above `maxRequestBytes` is refused with 413 and recorded; Bun itself refuses a
 * body above 64 MiB before the fixture sees it, far beyond anything an STS or telemetry request sends. Idle service
 * connections close
 * after `idleTimeoutSeconds`. A proxy client that never completes its request, a tunnel that cannot connect upstream,
 * and a tunnel idle in both directions are closed after their timeouts and recorded with a `note`. `close` destroys
 * every open socket and returns within `closeTimeoutMs`.
 *
 * The fixture records only what reaches it. It cannot see a connection that bypasses the proxy; confining egress is
 * the network sandbox's job (`network-sandbox.ts`).
 */
import type { Server as NetServer, Socket } from 'node:net';
import { connect, createServer } from 'node:net';

export const FIXTURE_ACCOUNT_ID = '000000000000';

export type FixtureRequest = {
  kind: 'aws' | 'telemetry' | 'tunnel' | 'proxy-http' | 'proxy-incomplete' | 'unknown';
  /** AWS signing service and operation, a telemetry route, or a tunnel's `host:port`. */
  target: string;
  status: number;
  allowed: boolean;
  bytesIn: number;
  bytesOut: number;
  startMs: number;
  endMs: number;
  /** Why the fixture ended the exchange itself, such as a timeout or an oversized body. */
  note?: string;
};

export type FixtureLimits = {
  maxRequestBytes: number;
  idleTimeoutSeconds: number;
  proxyRequestTimeoutMs: number;
  upstreamConnectTimeoutMs: number;
  tunnelIdleTimeoutMs: number;
  closeTimeoutMs: number;
};

export const DEFAULT_FIXTURE_LIMITS: FixtureLimits = {
  maxRequestBytes: 1024 * 1024,
  idleTimeoutSeconds: 10,
  proxyRequestTimeoutMs: 10_000,
  upstreamConnectTimeoutMs: 10_000,
  tunnelIdleTimeoutMs: 30_000,
  closeTimeoutMs: 5000
};

export type ExternalServiceFixture = {
  serviceUrl: string;
  proxyUrl: string;
  /** Requests recorded since the last call, in the order they started; the next call starts a new list. */
  takeRequests: () => FixtureRequest[];
  close: () => Promise<void>;
};

const TELEMETRY_ROUTES = ['/batch', '/capture', '/i/v0/e', '/e', '/decide', '/flags'];

const CALLER_IDENTITY = `<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
  <GetCallerIdentityResult>
    <Arn>arn:aws:iam::${FIXTURE_ACCOUNT_ID}:user/stacktape-measurement-fixture</Arn>
    <UserId>AIDAMEASUREMENTFIXTURE</UserId>
    <Account>${FIXTURE_ACCOUNT_ID}</Account>
  </GetCallerIdentityResult>
  <ResponseMetadata>
    <RequestId>00000000-0000-4000-8000-000000000000</RequestId>
  </ResponseMetadata>
</GetCallerIdentityResponse>
`;

const accessDenied = (target: string) =>
  `<ErrorResponse><Error><Type>Sender</Type><Code>AccessDenied</Code><Message>The Stacktape measurement fixture does not serve ${target}.</Message></Error><RequestId>00000000-0000-4000-8000-000000000000</RequestId></ErrorResponse>\n`;

/** The signing service from a SigV4 `Authorization` header; the access key before it is never kept. */
const getSigningService = (authorization: string | null) =>
  authorization?.match(/Credential=[^/,\s]+\/\d{8}\/[^/]+\/([^/]+)\/aws4_request/)?.[1] ?? null;

/** The operation of a query-protocol form body or a JSON-protocol target; nothing else is read from either. */
const getOperation = (request: Request, body: Uint8Array) => {
  const target = request.headers.get('x-amz-target');
  if (target) return target.split('.').at(-1) ?? 'unknown';
  if ((request.headers.get('content-type') ?? '').includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(new TextDecoder().decode(body)).get('Action') ?? 'unknown';
  }
  return `${request.method} (REST)`;
};

/** Bun refuses larger bodies before the handler runs; the recorded limit is `FixtureLimits.maxRequestBytes`. */
const HARD_BODY_LIMIT_BYTES = 64 * 1024 * 1024;

/** The request body, or null once it grows past `maxBytes`; reading stops there. */
const readBoundedBody = async (request: Request, maxBytes: number): Promise<Uint8Array | null> => {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) return Buffer.concat(chunks);
    total += value.length;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
};

const splitHostPort = (value: string) => {
  const separator = value.lastIndexOf(':');
  return separator === -1
    ? { host: value, port: 443 }
    : { host: value.slice(0, separator).replace(/^\[|\]$/g, ''), port: Number(value.slice(separator + 1)) };
};

const closeNetServer = (server: NetServer) =>
  new Promise<void>((resolveClose) => {
    server.close(() => resolveClose());
  });

export const startExternalServiceFixture = async ({
  allowedTunnels = [],
  limits: limitOverrides = {}
}: {
  /** `host:port` pairs the proxy may tunnel to; everything else is refused. */
  allowedTunnels?: string[];
  limits?: Partial<FixtureLimits>;
} = {}): Promise<ExternalServiceFixture> => {
  const limits = { ...DEFAULT_FIXTURE_LIMITS, ...limitOverrides };
  const startedAt = performance.now();
  const now = () => Math.round((performance.now() - startedAt) * 1000) / 1000;
  let requests: FixtureRequest[] = [];
  const allowed = new Set(allowedTunnels);

  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    idleTimeout: limits.idleTimeoutSeconds,
    maxRequestBodySize: HARD_BODY_LIMIT_BYTES,
    fetch: async (request) => {
      const startMs = now();
      const body = await readBoundedBody(request, limits.maxRequestBytes);
      if (body === null) {
        requests.push({
          kind: 'unknown',
          target: request.method,
          status: 413,
          allowed: false,
          bytesIn: limits.maxRequestBytes,
          bytesOut: 0,
          startMs,
          endMs: now(),
          note: 'request body above the fixture limit'
        });
        return new Response(null, { status: 413 });
      }
      const bytesIn = body.length;
      const { pathname } = new URL(request.url);
      const service = getSigningService(request.headers.get('authorization'));
      const record = (entry: Omit<FixtureRequest, 'bytesIn' | 'startMs' | 'endMs'>) => {
        requests.push({ ...entry, bytesIn, startMs, endMs: now() });
      };
      if (service) {
        const target = `${service}:${getOperation(request, body)}`;
        if (target === 'sts:GetCallerIdentity') {
          record({ kind: 'aws', target, status: 200, allowed: true, bytesOut: Buffer.byteLength(CALLER_IDENTITY) });
          return new Response(CALLER_IDENTITY, { status: 200, headers: { 'content-type': 'text/xml' } });
        }
        const refusal = accessDenied(target);
        record({ kind: 'aws', target, status: 403, allowed: false, bytesOut: Buffer.byteLength(refusal) });
        return new Response(refusal, { status: 403, headers: { 'content-type': 'text/xml' } });
      }
      const route = TELEMETRY_ROUTES.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
      if (route && request.method === 'POST') {
        const accepted = '{"status":1}';
        record({ kind: 'telemetry', target: route, status: 200, allowed: true, bytesOut: accepted.length });
        return new Response(accepted, { status: 200, headers: { 'content-type': 'application/json' } });
      }
      record({ kind: 'unknown', target: request.method, status: 404, allowed: false, bytesOut: 0 });
      return new Response(null, { status: 404 });
    }
  });

  const openSockets = new Set<Socket>();
  const proxy = createServer((client) => {
    openSockets.add(client);
    client.on('close', () => openSockets.delete(client));
    client.on('error', () => client.destroy());
    const startMs = now();
    let head = Buffer.alloc(0);
    const refuseIncomplete = (note: string) => {
      requests.push({
        kind: 'proxy-incomplete',
        target: 'unparsed',
        status: 400,
        allowed: false,
        bytesIn: head.length,
        bytesOut: 0,
        startMs,
        endMs: now(),
        note
      });
      client.destroy();
    };
    client.setTimeout(limits.proxyRequestTimeoutMs, () => refuseIncomplete('no complete request before the timeout'));
    const onHead = (chunk: Buffer) => {
      head = Buffer.concat([head, chunk]);
      const headerEnd = head.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        if (head.length > 16_384) refuseIncomplete('request head above 16 KiB');
        return;
      }
      client.off('data', onHead);
      client.setTimeout(0);
      const [method = '', destination = ''] = head.subarray(0, headerEnd).toString('latin1').split(' ');
      if (method !== 'CONNECT') {
        // Only the host is kept: a plain-HTTP request line carries the full URL.
        const host = URL.canParse(destination) ? new URL(destination).host : 'unparsed';
        requests.push({
          kind: 'proxy-http',
          target: host,
          status: 403,
          allowed: false,
          bytesIn: head.length,
          bytesOut: 0,
          startMs,
          endMs: now()
        });
        client.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
        return;
      }
      const { host, port } = splitHostPort(destination);
      const target = `${host}:${port}`;
      if (!allowed.has(target)) {
        requests.push({
          kind: 'tunnel',
          target,
          status: 403,
          allowed: false,
          bytesIn: 0,
          bytesOut: 0,
          startMs,
          endMs: now()
        });
        client.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n');
        return;
      }
      let bytesIn = 0;
      let bytesOut = 0;
      let recorded = false;
      const finish = (status: number, note?: string) => {
        if (recorded) return;
        recorded = true;
        requests.push({
          kind: 'tunnel',
          target,
          status,
          allowed: true,
          bytesIn,
          bytesOut,
          startMs,
          endMs: now(),
          ...(note && { note })
        });
      };
      const closeTunnel = (status: number, note: string) => {
        finish(status, note);
        upstream.destroy();
        client.destroy();
      };
      const onConnectTimeout = () => closeTunnel(504, 'upstream connect timeout');
      const upstream = connect(port, host, () => {
        // Connected: from now on the tunnel closes when no data has moved in either direction for the idle timeout.
        upstream.off('timeout', onConnectTimeout);
        upstream.setTimeout(limits.tunnelIdleTimeoutMs);
        upstream.once('timeout', () => closeTunnel(200, 'tunnel idle timeout'));
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        const early = head.subarray(headerEnd + 4);
        if (early.length) {
          bytesIn += early.length;
          upstream.write(early);
        }
        client.on('data', (chunk: Buffer) => {
          bytesIn += chunk.length;
        });
        upstream.on('data', (chunk: Buffer) => {
          bytesOut += chunk.length;
        });
        client.pipe(upstream);
        upstream.pipe(client);
      });
      upstream.setTimeout(limits.upstreamConnectTimeoutMs);
      upstream.once('timeout', onConnectTimeout);
      openSockets.add(upstream);
      upstream.on('close', () => {
        openSockets.delete(upstream);
        finish(200);
        client.end();
      });
      upstream.on('error', () => {
        finish(502);
        client.destroy();
      });
      client.on('close', () => upstream.destroy());
    };
    client.on('data', onHead);
  });
  await new Promise<void>((resolveListen, reject) => {
    proxy.once('error', reject);
    proxy.listen(0, '127.0.0.1', () => resolveListen());
  });
  const proxyAddress = proxy.address();
  if (!proxyAddress || typeof proxyAddress === 'string') {
    throw new Error('The measurement proxy did not report a TCP address.');
  }

  return {
    serviceUrl: `http://127.0.0.1:${server.port}`,
    proxyUrl: `http://127.0.0.1:${proxyAddress.port}`,
    takeRequests: () => {
      const taken = requests.toSorted((left, right) => left.startMs - right.startMs);
      requests = [];
      return taken;
    },
    close: async () => {
      for (const socket of openSockets) socket.destroy();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          Promise.all([server.stop(true), closeNetServer(proxy)]),
          new Promise<void>((resolveClose) => {
            timer = setTimeout(resolveClose, limits.closeTimeoutMs);
          })
        ]);
      } finally {
        // Cleared whichever way the race ended, so a prompt close never holds the process open.
        clearTimeout(timer);
      }
    }
  };
};
