import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http';
import type { Server } from 'node:net';
import type { ProxyServerOptions } from './types';
import { createServer as createHttpServer, request } from 'node:http';
import { createServer as createNetServer, connect as netConnect } from 'node:net';
import { createServer as createTlsServer } from 'node:tls';
import { escapeHtml, formatUrl } from './utils';

export const PORTLESS_HEADER = 'X-Portless';

const HOP_BY_HOP_HEADERS = new Set(['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade']);

const getRequestHost = (req: IncomingMessage): string => {
  const authority = req.headers[':authority'];
  if (typeof authority === 'string' && authority) return authority;
  return req.headers.host || '';
};

const buildForwardedHeaders = (req: IncomingMessage, tls: boolean): Record<string, string> => {
  const headers: Record<string, string> = {};
  const remoteAddress = req.socket.remoteAddress || '127.0.0.1';
  const hostHeader = getRequestHost(req);

  headers['x-forwarded-for'] = req.headers['x-forwarded-for']
    ? `${req.headers['x-forwarded-for']}, ${remoteAddress}`
    : remoteAddress;
  headers['x-forwarded-proto'] = (req.headers['x-forwarded-proto'] as string) || (tls ? 'https' : 'http');
  headers['x-forwarded-host'] = (req.headers['x-forwarded-host'] as string) || hostHeader;
  headers['x-forwarded-port'] = (req.headers['x-forwarded-port'] as string) || hostHeader.split(':')[1] || '80';

  return headers;
};

/** Extract Host header value from raw HTTP head bytes */
const extractHostFromRawHeaders = (rawHead: string): string => {
  const match = rawHead.match(/\r\nHost:\s*([^\r\n]+)/i);
  return match ? match[1].split(':')[0].toLowerCase() : '';
};

/** Build X-Forwarded-* headers for raw TCP proxying (no IncomingMessage available) */
const buildRawForwardedHeaders = (rawHead: string, tls: boolean): string => {
  const hostMatch = rawHead.match(/\r\nHost:\s*([^\r\n]+)/i);
  const hostHeader = hostMatch ? hostMatch[1] : '';
  const port = hostHeader.split(':')[1] || '80';
  const proto = tls ? 'https' : 'http';

  return (
    `x-forwarded-for: 127.0.0.1\r\n` +
    `x-forwarded-proto: ${proto}\r\n` +
    `x-forwarded-host: ${hostHeader}\r\n` +
    `x-forwarded-port: ${port}\r\n`
  );
};

/** Inject X-Forwarded headers into raw HTTP head bytes before the final \r\n\r\n */
const injectHeadersIntoRawHead = (rawHead: string, tls: boolean): string => {
  const headerEndIdx = rawHead.indexOf('\r\n\r\n');
  if (headerEndIdx === -1) return rawHead;
  const forwarded = buildRawForwardedHeaders(rawHead, tls);
  return `${rawHead.substring(0, headerEndIdx)}\r\n${forwarded}\r\n`;
};

export type ProxyServer = Server;

export const createProxyServer = (options: ProxyServerOptions): ProxyServer => {
  const { getRoutes, proxyPort, onError = (msg: string) => console.error(msg), tls } = options;

  const isTls = Boolean(tls);

  // --- HTTP request handler (for non-upgrade requests) ---
  const handleRequest = (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader(PORTLESS_HEADER, '1');

    const routes = getRoutes();
    const host = getRequestHost(req).split(':')[0];
    if (!host) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing Host header');
      return;
    }

    const route = routes.find((r) => r.hostname === host);
    if (!route) {
      const safeHost = escapeHtml(host);
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <head><title>stacktape dev proxy - Not Found</title></head>
          <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
            <h1>Not Found</h1>
            <p>No app registered for <strong>${safeHost}</strong></p>
            ${
              routes.length > 0
                ? `<h2>Active apps:</h2><ul>${routes
                    .map(
                      (r) =>
                        `<li><a href="${escapeHtml(formatUrl(r.hostname, proxyPort))}">${escapeHtml(r.hostname)}</a> - localhost:${escapeHtml(String(r.port))}</li>`
                    )
                    .join('')}</ul>`
                : '<p><em>No apps running.</em></p>'
            }
          </body>
        </html>
      `);
      return;
    }

    const proxyReqHeaders: OutgoingHttpHeaders = { ...req.headers, ...buildForwardedHeaders(req, isTls) };
    for (const key of Object.keys(proxyReqHeaders)) {
      if (key.startsWith(':')) delete proxyReqHeaders[key];
    }

    const proxyReq = request(
      {
        hostname: 'localhost',
        port: route.port,
        path: req.url,
        method: req.method,
        headers: proxyReqHeaders
      },
      (proxyRes) => {
        const responseHeaders: OutgoingHttpHeaders = { ...proxyRes.headers };
        if (isTls) {
          for (const h of HOP_BY_HOP_HEADERS) delete responseHeaders[h];
        }
        res.writeHead(proxyRes.statusCode || 502, responseHeaders);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      onError(`Proxy error for ${getRequestHost(req)}: ${err.message}`);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway: target app may not be running.');
      }
    });

    res.on('close', () => {
      if (!proxyReq.destroyed) proxyReq.destroy();
    });

    req.on('error', () => {
      if (!proxyReq.destroyed) proxyReq.destroy();
    });

    req.pipe(proxyReq);
  };

  // --- WebSocket upgrade handler at raw TCP level ---
  // bun's http.createServer passes broken sockets to 'upgrade' event handlers
  // where write() is a no-op. We intercept WebSocket upgrades at the TCP level
  // before bun's HTTP parser processes them, using a net.Server wrapper.
  const handleRawUpgrade = (clientSocket: import('node:net').Socket, rawHead: Buffer, remainingData: Buffer): void => {
    const rawStr = rawHead.toString();
    const host = extractHostFromRawHeaders(rawStr);
    const routes = getRoutes();
    const route = routes.find((r) => r.hostname === host);

    if (!route) {
      clientSocket.destroy();
      return;
    }

    const modifiedHead = injectHeadersIntoRawHead(rawStr, isTls);
    const upstream = netConnect({ host: '127.0.0.1', port: route.port }, () => {
      upstream.write(modifiedHead);
      if (remainingData.length > 0) upstream.write(remainingData);
      upstream.pipe(clientSocket);
      clientSocket.pipe(upstream);
    });

    upstream.on('error', (err) => {
      onError(`WebSocket proxy error for ${host}: ${err.message}`);
      clientSocket.destroy();
    });

    clientSocket.on('error', () => upstream.destroy());
  };

  // --- Server creation ---
  // Use a net/tls.Server wrapper that peeks at incoming data to detect WebSocket
  // upgrades before bun's HTTP parser. Normal HTTP requests are forwarded to
  // an internal http.Server on a random loopback port.
  const httpServer = createHttpServer(handleRequest);

  let internalReady = false;
  httpServer.listen(0, '127.0.0.1', () => {
    internalReady = true;
  });

  const getInternalPort = (): number => {
    if (!internalReady) return 0;
    const addr = httpServer.address();
    if (addr && typeof addr === 'object') return addr.port;
    return 0;
  };

  const activeSockets = new Set<import('node:net').Socket>();

  const connectionHandler = (clientSocket: import('node:net').Socket) => {
    activeSockets.add(clientSocket);
    clientSocket.on('close', () => activeSockets.delete(clientSocket));

    let headBuf = Buffer.alloc(0);

    const onData = (chunk: Buffer) => {
      headBuf = Buffer.concat([headBuf, chunk]);

      // Search for header terminator directly in buffer (avoids UTF-8 conversion issues)
      const headerEnd = headBuf.indexOf('\r\n\r\n');
      if (headerEnd === -1) {
        if (headBuf.length > 16384) clientSocket.destroy();
        return;
      }

      clientSocket.removeListener('data', onData);

      const headerEndByte = headerEnd + 4;
      const remaining = headBuf.subarray(headerEndByte);
      const headerPart = headBuf.subarray(0, headerEndByte);
      const headStr = headerPart.toString();

      if (/\r\nUpgrade:\s*websocket/i.test(headStr)) {
        handleRawUpgrade(clientSocket, headerPart, remaining);
      } else {
        const internalPort = getInternalPort();
        if (!internalPort) {
          clientSocket.destroy();
          return;
        }
        const internal = netConnect({ host: '127.0.0.1', port: internalPort }, () => {
          internal.write(headBuf);
          clientSocket.pipe(internal);
          internal.pipe(clientSocket);
        });
        internal.on('error', () => clientSocket.destroy());
        clientSocket.on('error', () => internal.destroy());
      }
    };

    clientSocket.on('data', onData);
    clientSocket.on('error', () => {});
  };

  // When TLS is enabled, use tls.createServer so the browser can connect with HTTPS.
  // The connectionHandler operates on the decrypted stream — same WebSocket detection logic applies.
  const server: Server =
    isTls && tls
      ? createTlsServer({ cert: tls.cert, key: tls.key, SNICallback: tls.SNICallback }, connectionHandler)
      : createNetServer(connectionHandler);

  server.on('close', () => {
    for (const socket of activeSockets) socket.destroy();
    activeSockets.clear();
    httpServer.closeAllConnections();
    httpServer.close();
  });

  return server;
};
