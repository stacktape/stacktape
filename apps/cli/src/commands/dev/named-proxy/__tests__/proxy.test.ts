import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Server as HttpServer } from 'node:http';
import { createServer as createHttpServer } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, rmSync } from 'fs-extra';
import crypto from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import { createProxyServer, type ProxyServer } from '../proxy';
import type { RouteInfo } from '../types';

/** Start a simple HTTP backend server that echoes request info */
const startBackend = (port: number, body = 'ok'): Promise<HttpServer> =>
  new Promise((resolve) => {
    const server = createHttpServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const requestBody = Buffer.concat(chunks).toString();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            body,
            method: req.method,
            url: req.url,
            host: req.headers.host,
            xForwardedFor: req.headers['x-forwarded-for'],
            xForwardedProto: req.headers['x-forwarded-proto'],
            xForwardedHost: req.headers['x-forwarded-host'],
            xForwardedPort: req.headers['x-forwarded-port'],
            requestBody: requestBody || undefined
          })
        );
      });
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });

/**
 * Start a raw TCP server that handles WebSocket upgrades.
 * Uses net.Server instead of http.createServer because bun's HTTP upgrade handler
 * passes broken sockets where write() is a no-op.
 */
const startWebSocketBackend = (port: number): Promise<import('node:net').Server> =>
  new Promise((resolve) => {
    const server = net.createServer((socket) => {
      let buf = '';
      const onData = (chunk: Buffer) => {
        buf += chunk.toString();
        if (!buf.includes('\r\n\r\n')) return;
        socket.removeListener('data', onData);

        const keyMatch = buf.match(/Sec-WebSocket-Key:\s*([^\r\n]+)/i);
        if (keyMatch) {
          const acceptKey = crypto
            .createHash('sha1')
            .update(`${keyMatch[1]}258EAFA5-E914-47DA-95CA-5AB5DC11C65B`)
            .digest('base64');
          socket.write(
            `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
          );
          // Echo any subsequent data
          socket.on('data', (d: Buffer) => socket.write(d));
        } else {
          socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
          socket.destroy();
        }
      };
      socket.on('data', onData);
      socket.on('error', () => {});
    });
    server.listen(port, '127.0.0.1', () => resolve(server));
  });

const closeServer = async (server: HttpServer | ProxyServer | net.Server): Promise<void> => {
  // Force-close keep-alive connections on HTTP servers
  if ('closeAllConnections' in server && typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
  return new Promise((resolve) => {
    server.close(() => resolve());
    // Fallback: resolve after short delay even if connections linger (test cleanup)
    setTimeout(resolve, 500);
  });
};

const fetchJson = async (
  proxyPort: number,
  hostname: string,
  path = '/',
  options: RequestInit = {}
): Promise<{ status: number; headers: Record<string, string>; body: Record<string, unknown> }> => {
  const res = await fetch(`http://127.0.0.1:${proxyPort}${path}`, {
    ...options,
    headers: { ...((options.headers as Record<string, string>) || {}), Host: hostname }
  });
  const body = (await res.json()) as Record<string, unknown>;
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k] = v;
  });
  return { status: res.status, headers, body };
};

const fetchText = async (
  proxyPort: number,
  hostname: string,
  path = '/'
): Promise<{ status: number; headers: Record<string, string>; body: string }> => {
  const res = await fetch(`http://127.0.0.1:${proxyPort}${path}`, {
    headers: { Host: hostname }
  });
  const body = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    headers[k] = v;
  });
  return { status: res.status, headers, body };
};

// ----- Test suite -----

describe('createProxyServer', () => {
  let proxyServer: ProxyServer;
  let backendA: HttpServer;
  let backendB: HttpServer;

  const PROXY_PORT = 19100;
  const BACKEND_A_PORT = 19101;
  const BACKEND_B_PORT = 19102;

  const routes: RouteInfo[] = [];

  beforeAll(async () => {
    [backendA, backendB] = await Promise.all([
      startBackend(BACKEND_A_PORT, 'backend-a'),
      startBackend(BACKEND_B_PORT, 'backend-b')
    ]);

    routes.push(
      { hostname: 'app-a.dev.localhost', port: BACKEND_A_PORT },
      { hostname: 'app-b.dev.localhost', port: BACKEND_B_PORT }
    );

    proxyServer = createProxyServer({
      getRoutes: () => routes,
      proxyPort: PROXY_PORT,
      onError: () => {}
    });
    await new Promise<void>((resolve) => {
      proxyServer.listen(PROXY_PORT, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await Promise.all([closeServer(proxyServer), closeServer(backendA), closeServer(backendB)]);
  });

  test('routes requests to correct backend based on Host header', async () => {
    const resA = await fetchJson(PROXY_PORT, 'app-a.dev.localhost');
    expect(resA.status).toBe(200);
    expect(resA.body.body).toBe('backend-a');
    expect(resA.headers['x-portless']).toBe('1');
    expect(resA.body.xForwardedFor).toBe('127.0.0.1');
    expect(resA.body.xForwardedProto).toBe('http');
    expect(resA.body.xForwardedHost).toBe('app-a.dev.localhost');

    const resB = await fetchJson(PROXY_PORT, 'app-b.dev.localhost');
    expect(resB.status).toBe(200);
    expect(resB.body.body).toBe('backend-b');
  });

  test('returns 404 HTML for unregistered hostname', async () => {
    const res = await fetchText(PROXY_PORT, 'unknown.dev.localhost');
    expect(res.status).toBe(404);
    expect(res.body).toContain('Not Found');
    expect(res.body).toContain('unknown.dev.localhost');
    expect(res.body).toContain('app-a.dev.localhost');
    expect(res.body).toContain('app-b.dev.localhost');
  });

  test('Host header with port is correctly handled (port stripped for matching)', async () => {
    const res = await fetchJson(PROXY_PORT, `app-a.dev.localhost:${PROXY_PORT}`);
    expect(res.status).toBe(200);
    expect(res.body.body).toBe('backend-a');
  });
});

describe('proxy - backend down', () => {
  let proxyServer: ProxyServer;
  const PROXY_PORT = 19120;
  const DEAD_BACKEND_PORT = 19121;

  const routes: RouteInfo[] = [{ hostname: 'dead.dev.localhost', port: DEAD_BACKEND_PORT }];
  const errors: string[] = [];

  beforeAll(async () => {
    proxyServer = createProxyServer({
      getRoutes: () => routes,
      proxyPort: PROXY_PORT,
      onError: (msg) => errors.push(msg)
    });
    await new Promise<void>((resolve) => {
      proxyServer.listen(PROXY_PORT, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await closeServer(proxyServer);
  });

  test('returns 502 when backend is not running', async () => {
    const res = await fetchText(PROXY_PORT, 'dead.dev.localhost');
    expect(res.status).toBe(502);
    expect(res.body).toContain('Bad Gateway');
  });
});

describe('proxy - WebSocket upgrade', () => {
  let proxyServer: ProxyServer;
  let wsBackend: net.Server;

  const PROXY_PORT = 19130;
  const WS_BACKEND_PORT = 19131;

  beforeAll(async () => {
    wsBackend = await startWebSocketBackend(WS_BACKEND_PORT);

    proxyServer = createProxyServer({
      getRoutes: () => [{ hostname: 'ws.dev.localhost', port: WS_BACKEND_PORT }],
      proxyPort: PROXY_PORT,
      onError: () => {}
    });
    await new Promise<void>((resolve) => {
      proxyServer.listen(PROXY_PORT, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await Promise.all([closeServer(proxyServer), closeServer(wsBackend)]);
  });

  test('proxies WebSocket upgrade handshake', async () => {
    const wsKey = crypto.randomBytes(16).toString('base64');

    const response = await new Promise<string>((resolve) => {
      let data = '';
      const socket = net.createConnection({ port: PROXY_PORT, host: '127.0.0.1' }, () => {
        socket.write(
          'GET / HTTP/1.1\r\n' +
            'Host: ws.dev.localhost\r\n' +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            `Sec-WebSocket-Key: ${wsKey}\r\n` +
            'Sec-WebSocket-Version: 13\r\n' +
            '\r\n'
        );
      });
      socket.on('data', (chunk: Buffer) => {
        data += chunk.toString();
        if (data.includes('\r\n\r\n')) {
          socket.destroy();
          resolve(data);
        }
      });
      socket.on('error', () => resolve(data));
      socket.on('close', () => resolve(data));
      setTimeout(() => {
        socket.destroy();
        resolve(data);
      }, 5000);
    });

    expect(response).toContain('101 Switching Protocols');
    expect(response.toLowerCase()).toContain('upgrade: websocket');
  });

  test('destroys socket for WebSocket upgrade to unknown host', async () => {
    const wsKey = crypto.randomBytes(16).toString('base64');

    const result = await new Promise<'closed' | 'timeout'>((resolve) => {
      const socket = net.createConnection({ port: PROXY_PORT, host: '127.0.0.1' }, () => {
        socket.write(
          'GET / HTTP/1.1\r\n' +
            'Host: nonexistent.dev.localhost\r\n' +
            'Upgrade: websocket\r\n' +
            'Connection: Upgrade\r\n' +
            `Sec-WebSocket-Key: ${wsKey}\r\n` +
            'Sec-WebSocket-Version: 13\r\n' +
            '\r\n'
        );
      });

      socket.on('close', () => resolve('closed'));
      socket.on('error', () => resolve('closed'));
      setTimeout(() => {
        socket.destroy();
        resolve('timeout');
      }, 3000);
    });

    expect(result).toBe('closed');
  });
});

describe('proxy - 404 page HTML safety', () => {
  let proxyServer: ProxyServer;
  const PROXY_PORT = 19140;

  beforeAll(async () => {
    proxyServer = createProxyServer({
      getRoutes: () => [],
      proxyPort: PROXY_PORT,
      onError: () => {}
    });
    await new Promise<void>((resolve) => {
      proxyServer.listen(PROXY_PORT, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await closeServer(proxyServer);
  });

  test('escapes XSS attempts in hostname', async () => {
    const res = await fetchText(PROXY_PORT, '<script>\"x\'&y\"</script>.localhost');
    expect(res.status).toBe(404);
    expect(res.body).not.toContain('<script>');
    expect(res.body).toContain('&lt;script&gt;&quot;x&#39;&amp;y&quot;&lt;');
  });
});

describe('proxy - SSE (Server-Sent Events) streaming', () => {
  let proxyServer: ProxyServer;
  let sseBackend: HttpServer;

  const PROXY_PORT = 19160;
  const SSE_BACKEND_PORT = 19161;

  beforeAll(async () => {
    // SSE backend that sends 3 events then closes
    sseBackend = await new Promise<HttpServer>((resolve) => {
      const server = createHttpServer((req, res) => {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive'
        });
        let count = 0;
        const interval = setInterval(() => {
          res.write(`data: event-${count}\n\n`);
          count++;
          if (count >= 3) {
            clearInterval(interval);
            res.end();
          }
        }, 50);
        req.on('close', () => clearInterval(interval));
      });
      server.listen(SSE_BACKEND_PORT, '127.0.0.1', () => resolve(server));
    });

    proxyServer = createProxyServer({
      getRoutes: () => [{ hostname: 'sse.dev.localhost', port: SSE_BACKEND_PORT }],
      proxyPort: PROXY_PORT,
      onError: () => {}
    });
    await new Promise<void>((resolve) => {
      proxyServer.listen(PROXY_PORT, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await Promise.all([closeServer(proxyServer), closeServer(sseBackend)]);
  });

  test('streams SSE events through proxy without buffering', async () => {
    const events: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ port: PROXY_PORT, host: '127.0.0.1' }, () => {
        // Use Connection: close so server ends connection after response
        socket.write(
          'GET /events HTTP/1.1\r\nHost: sse.dev.localhost\r\nAccept: text/event-stream\r\nConnection: close\r\n\r\n'
        );
      });

      let data = '';
      socket.on('data', (chunk: Buffer) => {
        data += chunk.toString();
        // Check if we've received all 3 events
        const matches = data.match(/data: event-\d+/g);
        if (matches && matches.length >= 3) {
          for (const m of matches) if (!events.includes(m)) events.push(m);
          socket.destroy();
          resolve();
        }
      });

      socket.on('error', () => resolve());
      setTimeout(() => {
        socket.destroy();
        reject(new Error('SSE timeout'));
      }, 5000);
    });

    expect(events).toEqual(['data: event-0', 'data: event-1', 'data: event-2']);
  });
});

describe('proxy - large request body', () => {
  let proxyServer: ProxyServer;
  let backend: HttpServer;

  const PROXY_PORT = 19170;
  const BACKEND_PORT = 19171;

  beforeAll(async () => {
    backend = await new Promise<HttpServer>((resolve) => {
      const server = createHttpServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
          const body = Buffer.concat(chunks);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              receivedBytes: body.length,
              digest: crypto.createHash('sha256').update(body).digest('hex'),
              method: req.method,
              path: req.url
            })
          );
        });
      });
      server.listen(BACKEND_PORT, '127.0.0.1', () => resolve(server));
    });

    proxyServer = createProxyServer({
      getRoutes: () => [{ hostname: 'upload.dev.localhost', port: BACKEND_PORT }],
      proxyPort: PROXY_PORT,
      onError: () => {}
    });
    await new Promise<void>((resolve) => {
      proxyServer.listen(PROXY_PORT, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await Promise.all([closeServer(proxyServer), closeServer(backend)]);
  });

  test('proxies 1MB POST body correctly', async () => {
    const bodySize = 1024 * 1024; // 1MB
    const largeBody = crypto.randomBytes(bodySize);

    const res = await fetch(`http://127.0.0.1:${PROXY_PORT}/upload`, {
      method: 'POST',
      headers: { Host: 'upload.dev.localhost', 'Content-Type': 'application/octet-stream' },
      body: largeBody
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { receivedBytes: number; digest: string; method: string; path: string };
    expect(json.receivedBytes).toBe(bodySize);
    expect(json.digest).toBe(crypto.createHash('sha256').update(largeBody).digest('hex'));
    expect(json.method).toBe('POST');
    expect(json.path).toBe('/upload');
  });
});

// --- TLS / HTTPS tests ---

/** Generate a self-signed cert+key for testing */
const generateSelfSignedCert = (): { cert: Buffer; key: Buffer } => {
  const keyPath = join(tmpdir(), `test-key-${process.pid}.pem`);
  const certPath = join(tmpdir(), `test-cert-${process.pid}.pem`);
  try {
    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'rsa:2048',
        '-keyout',
        keyPath,
        '-out',
        certPath,
        '-days',
        '1',
        '-nodes',
        '-subj',
        '/CN=localhost',
        '-addext',
        'subjectAltName=DNS:localhost,DNS:*.localhost'
      ],
      { stdio: 'pipe', timeout: 10000 }
    );

    const key = readFileSync(keyPath);
    const cert = readFileSync(certPath);
    return { cert, key };
  } catch (error) {
    throw new Error('TLS proxy qualification requires a working openssl executable.', { cause: error });
  } finally {
    rmSync(keyPath, { force: true });
    rmSync(certPath, { force: true });
  }
};

const fetchTlsJson = (port: number, path: string): Promise<{ body: Record<string, unknown>; status: number }> =>
  new Promise((resolve, reject) => {
    const request = httpsRequest(
      {
        headers: { host: 'secure.dev.localhost' },
        host: '127.0.0.1',
        path,
        port,
        rejectUnauthorized: false
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => {
          try {
            resolve({
              body: JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>,
              status: response.statusCode ?? 0
            });
          } catch (error) {
            reject(error);
          }
        });
      }
    );
    request.on('error', reject);
    request.end();
  });

describe('proxy - TLS / HTTPS', () => {
  let proxyServer: ProxyServer;
  let backend: HttpServer;
  const certs = generateSelfSignedCert();

  const PROXY_PORT = 19150;
  const BACKEND_PORT = 19151;

  beforeAll(async () => {
    backend = await startBackend(BACKEND_PORT, 'tls-backend');

    proxyServer = createProxyServer({
      getRoutes: () => [{ hostname: 'secure.dev.localhost', port: BACKEND_PORT }],
      proxyPort: PROXY_PORT,
      onError: () => {},
      tls: { cert: certs.cert, key: certs.key }
    });
    await new Promise<void>((resolve) => {
      proxyServer.listen(PROXY_PORT, '127.0.0.1', () => resolve());
    });
  });

  afterAll(async () => {
    await Promise.all([closeServer(proxyServer), closeServer(backend)]);
  });

  test('accepts TLS connections and proxies HTTPS requests', async () => {
    const response = await fetchTlsJson(PROXY_PORT, '/api/test');
    expect(response.status).toBe(200);
    expect(response.body.body).toBe('tls-backend');
    expect(response.body.url).toBe('/api/test');
    expect(response.body.xForwardedProto).toBe('https');
  });

  test('TLS proxy handles WebSocket upgrade over HTTPS', async () => {
    const wsBackend = await startWebSocketBackend(19152);
    const wsProxy = createProxyServer({
      getRoutes: () => [{ hostname: 'wss.dev.localhost', port: 19152 }],
      proxyPort: 19153,
      onError: () => {},
      tls: { cert: certs.cert, key: certs.key }
    });
    await new Promise<void>((r) => wsProxy.listen(19153, '127.0.0.1', () => r()));

    try {
      const wsKey = crypto.randomBytes(16).toString('base64');
      const response = await new Promise<string>((resolve) => {
        const socket = tls.connect({ port: 19153, host: '127.0.0.1', rejectUnauthorized: false }, () => {
          socket.write(
            'GET / HTTP/1.1\r\n' +
              'Host: wss.dev.localhost\r\n' +
              'Upgrade: websocket\r\n' +
              'Connection: Upgrade\r\n' +
              `Sec-WebSocket-Key: ${wsKey}\r\n` +
              'Sec-WebSocket-Version: 13\r\n' +
              '\r\n'
          );
        });

        let data = '';
        socket.on('data', (chunk: Buffer) => {
          data += chunk.toString();
          if (data.includes('\r\n\r\n')) {
            socket.destroy();
            resolve(data);
          }
        });
        socket.on('error', () => resolve(data));
        setTimeout(() => {
          socket.destroy();
          resolve(data);
        }, 5000);
      });

      expect(response).toContain('101 Switching Protocols');
      expect(response.toLowerCase()).toContain('upgrade: websocket');
    } finally {
      await Promise.all([closeServer(wsProxy), closeServer(wsBackend)]);
    }
  });

  test('plain TCP to TLS proxy fails gracefully (no crash)', async () => {
    // Send plain HTTP to a TLS-enabled proxy — should fail without crashing the server
    const result = await new Promise<'closed' | 'error' | 'timeout'>((resolve) => {
      const socket = net.createConnection({ port: PROXY_PORT, host: '127.0.0.1' }, () => {
        socket.write('GET / HTTP/1.1\r\nHost: secure.dev.localhost\r\n\r\n');
      });
      socket.on('close', () => resolve('closed'));
      socket.on('error', () => resolve('error'));
      setTimeout(() => {
        socket.destroy();
        resolve('timeout');
      }, 3000);
    });

    // Connection should be closed or errored (TLS handshake failure), not timeout
    expect(['closed', 'error']).toContain(result);

    // Verify the server is still alive after the bad connection
    const goodRes = await new Promise<string>((resolve, reject) => {
      const socket = tls.connect({ port: PROXY_PORT, host: '127.0.0.1', rejectUnauthorized: false }, () => {
        socket.write('GET / HTTP/1.1\r\nHost: secure.dev.localhost\r\nConnection: close\r\n\r\n');
      });
      let data = '';
      socket.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      socket.on('end', () => resolve(data));
      socket.on('error', reject);
      setTimeout(() => {
        socket.destroy();
        reject(new Error('timeout'));
      }, 5000);
    });

    expect(goodRes).toContain('200');
  });
});

// r2bd2: on Windows another program listened on 127.0.0.1 and ::1 of a frontend's port, the HTTP upstream `localhost`
// resolved to ::1 and the generated URL reached that program. HTTP and WebSocket requests go to the one loopback
// address the route names, whatever listens on the other one.
describe('proxy - one loopback address per route', () => {
  const hasIpv6Loopback = () =>
    new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.listen(0, '::1', () => server.close(() => resolve(true)));
    });

  /** Answers a plain request with its name and a WebSocket upgrade with its name in a header. */
  const startNamedBackend = (name: string, port: number, host: string) =>
    new Promise<net.Server>((resolve, reject) => {
      const server = net.createServer((socket) => {
        socket.on('error', () => {});
        socket.once('data', (chunk: Buffer) => {
          socket.end(
            /\r\nUpgrade:\s*websocket/i.test(chunk.toString())
              ? `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nX-Backend: ${name}\r\n\r\n`
              : `HTTP/1.1 200 OK\r\nContent-Length: ${name.length}\r\nConnection: close\r\n\r\n${name}`
          );
        });
      });
      server.once('error', reject);
      server.listen(port, host, () => resolve(server));
    });

  const upgrade = (proxyPort: number, hostname: string) =>
    new Promise<string>((resolve) => {
      let data = '';
      const socket = net.createConnection({ port: proxyPort, host: '127.0.0.1' }, () => {
        socket.write(
          `GET / HTTP/1.1\r\nHost: ${hostname}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
            `Sec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n\r\n`
        );
      });
      socket.on('data', (chunk: Buffer) => (data += chunk.toString()));
      socket.on('error', () => resolve(data));
      socket.on('close', () => resolve(data));
      setTimeout(() => socket.destroy(), 5000);
    });

  test.each([
    ['127.0.0.1', '::1', undefined],
    ['::1', '127.0.0.1', '::1']
  ])('an app on %s is reached while another program holds %s of its port', async (appHost, otherHost, routeHost) => {
    if (!(await hasIpv6Loopback())) return;
    const probe = net.createServer();
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const port = (probe.address() as net.AddressInfo).port;
    await closeServer(probe);
    const app = await startNamedBackend('app', port, appHost);
    const other = await startNamedBackend('other', port, otherHost);
    const proxyServer = createProxyServer({
      getRoutes: () => [{ hostname: 'web.dev.localhost', port, ...(routeHost && { host: routeHost }) }],
      proxyPort: 0,
      onError: () => {}
    });
    await new Promise<void>((resolve) => proxyServer.listen(0, '127.0.0.1', resolve));
    const proxyPort = (proxyServer.address() as net.AddressInfo).port;
    try {
      expect((await fetchText(proxyPort, 'web.dev.localhost')).body).toBe('app');
      expect(await upgrade(proxyPort, 'web.dev.localhost')).toContain('X-Backend: app');
    } finally {
      await Promise.all([closeServer(proxyServer), closeServer(app), closeServer(other)]);
    }
  });
});
