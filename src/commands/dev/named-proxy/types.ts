import type { SecureContext } from 'node:tls';

export type RouteInfo = {
  hostname: string;
  port: number;
};

export type ProxyTlsOptions = {
  cert: Buffer;
  key: Buffer;
  SNICallback?: (servername: string, cb: (err: Error | null, ctx?: SecureContext) => void) => void;
};

export type ProxyServerOptions = {
  getRoutes: () => RouteInfo[];
  proxyPort: number;
  onError?: (message: string) => void;
  tls?: ProxyTlsOptions;
};
