import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import type { Server as HttpServer } from 'node:http';
import { createServer as createHttpServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, unlinkSync } from 'fs-extra';
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

    const resB = await fetchJson(PROXY_PORT, 'app-b.dev.localhost');
    expect(resB.status).toBe(200);
    expect(resB.body.body).toBe('backend-b');
  });

  test('sets X-Portless header on responses', async () => {
    const res = await fetchJson(PROXY_PORT, 'app-a.dev.localhost');
    expect(res.headers['x-portless']).toBe('1');
  });

  test('forwards request path and method', async () => {
    const res = await fetchJson(PROXY_PORT, 'app-a.dev.localhost', '/api/users?limit=10');
    expect(res.body.url).toBe('/api/users?limit=10');
    expect(res.body.method).toBe('GET');
  });

  test('forwards POST body', async () => {
    const res = await fetchJson(PROXY_PORT, 'app-a.dev.localhost', '/api/data', {
      method: 'POST',
      body: JSON.stringify({ key: 'value' }),
      headers: { 'Content-Type': 'application/json', Host: 'app-a.dev.localhost' }
    });
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body.requestBody as string)).toEqual({ key: 'value' });
  });

  test('sets X-Forwarded-For header', async () => {
    const res = await fetchJson(PROXY_PORT, 'app-a.dev.localhost');
    expect(res.body.xForwardedFor).toBeDefined();
    expect(typeof res.body.xForwardedFor).toBe('string');
  });

  test('sets X-Forwarded-Proto to http', async () => {
    const res = await fetchJson(PROXY_PORT, 'app-a.dev.localhost');
    expect(res.body.xForwardedProto).toBe('http');
  });

  test('sets X-Forwarded-Host', async () => {
    const res = await fetchJson(PROXY_PORT, 'app-a.dev.localhost');
    expect(res.body.xForwardedHost).toBe('app-a.dev.localhost');
  });

  test('returns 404 HTML for unregistered hostname', async () => {
    const res = await fetchText(PROXY_PORT, 'unknown.dev.localhost');
    expect(res.status).toBe(404);
    expect(res.body).toContain('Not Found');
    expect(res.body).toContain('unknown.dev.localhost');
  });

  test('404 page lists active apps', async () => {
    const res = await fetchText(PROXY_PORT, 'unknown.dev.localhost');
    expect(res.body).toContain('app-a.dev.localhost');
    expect(res.body).toContain('app-b.dev.localhost');
  });

  test('returns 400 for missing Host header', async () => {
    const result = await new Promise<string>((resolve) => {
      const socket = net.createConnection({ port: PROXY_PORT, host: '127.0.0.1' }, () => {
        socket.write('GET / HTTP/1.0\r\n\r\n');
      });
      let data = '';
      socket.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      socket.on('end', () => resolve(data));
    });
    expect(result).toContain('400');
    expect(result).toContain('Missing Host');
  });

  test('Host header with port is correctly handled (port stripped for matching)', async () => {
    const res = await fetchJson(PROXY_PORT, `app-a.dev.localhost:${PROXY_PORT}`);
    expect(res.status).toBe(200);
    expect(res.body.body).toBe('backend-a');
  });
});

describe('proxy - dynamic route changes', () => {
  let proxyServer: ProxyServer;
  let backend: HttpServer;

  const PROXY_PORT = 19110;
  const BACKEND_PORT = 19111;

  const routes: RouteInfo[] = [];

  beforeAll(async () => {
    backend = await startBackend(BACKEND_PORT, 'dynamic-backend');

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
    await Promise.all([closeServer(proxyServer), closeServer(backend)]);
  });

  test('route added after proxy start becomes reachable', async () => {
    // Initially no routes - should get 404
    const before = await fetchText(PROXY_PORT, 'dynamic.dev.localhost');
    expect(before.status).toBe(404);

    // Add route dynamically
    routes.push({ hostname: 'dynamic.dev.localhost', port: BACKEND_PORT });

    // Now should be routable
    const after = await fetchJson(PROXY_PORT, 'dynamic.dev.localhost');
    expect(after.status).toBe(200);
    expect(after.body.body).toBe('dynamic-backend');
  });

  test('route removed after proxy start returns 404', async () => {
    // Ensure route exists
    const routeIdx = routes.findIndex((r) => r.hostname === 'dynamic.dev.localhost');
    if (routeIdx === -1) {
      routes.push({ hostname: 'dynamic.dev.localhost', port: BACKEND_PORT });
    }

    const before = await fetchJson(PROXY_PORT, 'dynamic.dev.localhost');
    expect(before.status).toBe(200);

    // Remove route
    const idx = routes.findIndex((r) => r.hostname === 'dynamic.dev.localhost');
    routes.splice(idx, 1);

    const after = await fetchText(PROXY_PORT, 'dynamic.dev.localhost');
    expect(after.status).toBe(404);
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

  test('calls onError callback when backend is unreachable', async () => {
    errors.length = 0;
    await fetchText(PROXY_PORT, 'dead.dev.localhost');
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]).toContain('dead.dev.localhost');
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
    const res = await fetchText(PROXY_PORT, '<script>alert(1)</script>.localhost');
    expect(res.status).toBe(404);
    expect(res.body).not.toContain('<script>');
    expect(res.body).toContain('&lt;script&gt;');
  });

  test('shows "No apps running" when route list is empty', async () => {
    const res = await fetchText(PROXY_PORT, 'anything.localhost');
    expect(res.status).toBe(404);
    expect(res.body).toContain('No apps running');
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
          res.end(JSON.stringify({ receivedBytes: body.length }));
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
    const largeBody = Buffer.alloc(bodySize, 'A');

    const res = await fetch(`http://127.0.0.1:${PROXY_PORT}/upload`, {
      method: 'POST',
      headers: { Host: 'upload.dev.localhost', 'Content-Type': 'application/octet-stream' },
      body: largeBody
    });

    expect(res.status).toBe(200);
    const json = (await res.json()) as { receivedBytes: number };
    expect(json.receivedBytes).toBe(bodySize);
  });
});

// --- TLS / HTTPS tests ---

/** Generate a self-signed cert+key for testing */
const generateSelfSignedCert = (): { cert: Buffer; key: Buffer } => {
  try {
    const keyPath = join(tmpdir(), `test-key-${process.pid}.pem`);
    const certPath = join(tmpdir(), `test-cert-${process.pid}.pem`);

    execFileSync(
      'openssl',
      [
        'req',
        '-x509',
        '-newkey',
        'ec',
        '-pkeyopt',
        'ec_paramgen_curve:prime256v1',
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
    unlinkSync(keyPath);
    unlinkSync(certPath);
    return { cert, key };
  } catch {
    return { cert: Buffer.alloc(0), key: Buffer.alloc(0) };
  }
};

describe('proxy - TLS / HTTPS', () => {
  let proxyServer: ProxyServer;
  let backend: HttpServer;
  const certs = generateSelfSignedCert();
  const hasCerts = certs.cert.length > 0;

  const PROXY_PORT = 19150;
  const BACKEND_PORT = 19151;

  beforeAll(async () => {
    if (!hasCerts) return;

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
    if (!hasCerts) return;
    await Promise.all([closeServer(proxyServer), closeServer(backend)]);
  });

  test('accepts TLS connections and proxies HTTPS requests', async () => {
    if (!hasCerts) return; // Skip if openssl not available

    const res = await new Promise<{ status: string; body: string }>((resolve, reject) => {
      const socket = tls.connect({ port: PROXY_PORT, host: '127.0.0.1', rejectUnauthorized: false }, () => {
        socket.write(
          'GET /api/test HTTP/1.1\r\n' + 'Host: secure.dev.localhost\r\n' + 'Connection: close\r\n' + '\r\n'
        );
      });

      let data = '';
      socket.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      socket.on('end', () => {
        const [head, ...bodyParts] = data.split('\r\n\r\n');
        const status = head.split('\r\n')[0];
        resolve({ status, body: bodyParts.join('\r\n\r\n') });
      });
      socket.on('error', reject);
      setTimeout(() => {
        socket.destroy();
        reject(new Error('TLS test timeout'));
      }, 5000);
    });

    expect(res.status).toContain('200');
    const body = JSON.parse(res.body);
    expect(body.body).toBe('tls-backend');
    expect(body.url).toBe('/api/test');
  });

  test('TLS proxy sets x-forwarded-proto to https', async () => {
    if (!hasCerts) return;

    const res = await new Promise<{ body: string }>((resolve, reject) => {
      const socket = tls.connect({ port: PROXY_PORT, host: '127.0.0.1', rejectUnauthorized: false }, () => {
        socket.write('GET / HTTP/1.1\r\n' + 'Host: secure.dev.localhost\r\n' + 'Connection: close\r\n' + '\r\n');
      });

      let data = '';
      socket.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      socket.on('end', () => {
        const bodyStr = data.split('\r\n\r\n').slice(1).join('\r\n\r\n');
        resolve({ body: bodyStr });
      });
      socket.on('error', reject);
      setTimeout(() => {
        socket.destroy();
        reject(new Error('timeout'));
      }, 5000);
    });

    const body = JSON.parse(res.body);
    expect(body.xForwardedProto).toBe('https');
  });

  test('TLS proxy handles WebSocket upgrade over HTTPS', async () => {
    if (!hasCerts) return;

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

  test('returns 404 for unknown host over TLS', async () => {
    if (!hasCerts) return;

    const res = await new Promise<{ status: string; body: string }>((resolve, reject) => {
      const socket = tls.connect({ port: PROXY_PORT, host: '127.0.0.1', rejectUnauthorized: false }, () => {
        socket.write('GET / HTTP/1.1\r\n' + 'Host: unknown.dev.localhost\r\n' + 'Connection: close\r\n' + '\r\n');
      });

      let data = '';
      socket.on('data', (chunk: Buffer) => {
        data += chunk.toString();
      });
      socket.on('end', () => {
        const [head, ...bodyParts] = data.split('\r\n\r\n');
        resolve({ status: head.split('\r\n')[0], body: bodyParts.join('\r\n\r\n') });
      });
      socket.on('error', reject);
      setTimeout(() => {
        socket.destroy();
        reject(new Error('timeout'));
      }, 5000);
    });

    expect(res.status).toContain('404');
    expect(res.body).toContain('Not Found');
  });

  test('plain TCP to TLS proxy fails gracefully (no crash)', async () => {
    if (!hasCerts) return;

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
