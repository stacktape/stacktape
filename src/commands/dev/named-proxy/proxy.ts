import type { IncomingMessage, OutgoingHttpHeaders, Server, ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import type { ProxyServerOptions } from './types';
import { createServer as createHttpServer, request } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
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

export type ProxyServer = Server;

export const createProxyServer = (options: ProxyServerOptions): ProxyServer => {
  const { getRoutes, proxyPort, onError = (msg: string) => console.error(msg), tls } = options;

  const isTls = Boolean(tls);

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

  const handleUpgrade = (req: IncomingMessage, socket: Socket, head: Buffer) => {
    const routes = getRoutes();
    const host = getRequestHost(req).split(':')[0];
    const route = routes.find((r) => r.hostname === host);
    if (!route) {
      socket.destroy();
      return;
    }

    const proxyReqHeaders: OutgoingHttpHeaders = { ...req.headers, ...buildForwardedHeaders(req, isTls) };
    for (const key of Object.keys(proxyReqHeaders)) {
      if (key.startsWith(':')) delete proxyReqHeaders[key];
    }

    const proxyReq = request({
      hostname: 'localhost',
      port: route.port,
      path: req.url,
      method: req.method,
      headers: proxyReqHeaders
    });

    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      let response = 'HTTP/1.1 101 Switching Protocols\r\n';
      for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
        response += `${proxyRes.rawHeaders[i]}: ${proxyRes.rawHeaders[i + 1]}\r\n`;
      }
      response += '\r\n';
      socket.write(response);
      if (proxyHead.length > 0) socket.write(proxyHead);
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
      proxySocket.on('error', () => socket.destroy());
      socket.on('error', () => proxySocket.destroy());
    });

    proxyReq.on('error', (err) => {
      onError(`WebSocket proxy error for ${getRequestHost(req)}: ${err.message}`);
      socket.destroy();
    });

    if (head.length > 0) {
      proxyReq.write(head);
    }
    proxyReq.end();
  };

  if (!isTls) {
    const server = createHttpServer(handleRequest);
    server.on('upgrade', handleUpgrade);
    return server;
  }

  const httpsServer = createHttpsServer({
    cert: tls.cert,
    key: tls.key,
    ...(tls.SNICallback ? { SNICallback: tls.SNICallback } : {})
  });
  httpsServer.on('request', handleRequest);
  httpsServer.on('upgrade', (req: IncomingMessage, socket: Socket, head: Buffer) => {
    handleUpgrade(req, socket, head);
  });

  return httpsServer;
};
