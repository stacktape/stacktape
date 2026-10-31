import type { SecureContext } from 'node:tls';

export type RouteInfo = {
  hostname: string;
  port: number;
  /**
   * The loopback address the app listens on, which the proxy connects to. Never `localhost`: it resolves to `::1` or
   * `127.0.0.1` depending on the system, and another program can listen on the other one with the same port (r2bd2).
   */
  host?: string;
};

type ProxyTlsOptions = {
  cert: Buffer;
  key: Buffer;
  SNICallback?: (servername: string, cb: (err: Error | null, ctx?: SecureContext) => void) => void;
};

export type ProxyServerOptions = {
  getRoutes: () => RouteInfo[];
  proxyPort: number;
  onError?: (message: string) => void;
  tls?: ProxyTlsOptions;
  /** Sent in the `X-Stacktape-Dev-Proxy` header of every response, so another session can tell whose proxy holds a port. */
  identity?: string;
};
