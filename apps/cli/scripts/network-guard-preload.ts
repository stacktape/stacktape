/**
 * Refuses every HTTP request to a host that is not this machine. Preload it into any process a test starts that
 * must stay offline: `bun --preload <cli>/scripts/network-guard-preload.ts ...`. Environment variables alone do not
 * keep an AWS SDK local, because an explicit endpoint in code overrides them; this guard sits in front of the
 * transport, so such a request fails before it leaves. The test preload (`test-preload.ts`) builds on it and also
 * scrubs inherited AWS settings; children that need their own endpoint variables load only this file.
 */
import http from 'node:http';
import https from 'node:https';

const hostnameFrom = (input: unknown): string | undefined => {
  if (input instanceof URL) {
    return input.hostname;
  }
  if (typeof input === 'string') {
    try {
      return new URL(input).hostname;
    } catch {
      return undefined;
    }
  }
  if (input && typeof input === 'object') {
    const { hostname, host, socketPath } = input as { hostname?: string; host?: string; socketPath?: string };
    if (socketPath) {
      return undefined;
    }
    const candidate = hostname ?? host;
    if (!candidate) {
      return undefined;
    }
    try {
      return new URL(`http://${candidate}`).hostname;
    } catch {
      return candidate;
    }
  }
  return undefined;
};

export const assertLocalTarget = (input: unknown) => {
  const hostname = hostnameFrom(input)
    ?.replace(/^\[|\]$/g, '')
    .toLowerCase();
  const isLocal =
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('127.');
  if (!isLocal) {
    throw new Error(`Tests cannot access external network target: ${hostname}`);
  }
};

const guardRequest = <T extends typeof http.request | typeof https.request>(original: T): T =>
  ((...args: unknown[]) => {
    assertLocalTarget(args[0]);
    return Reflect.apply(original, undefined, args);
  }) as T;

const guardGet = <T extends typeof http.get | typeof https.get>(original: T): T =>
  ((...args: unknown[]) => {
    assertLocalTarget(args[0]);
    return Reflect.apply(original, undefined, args);
  }) as T;

http.request = guardRequest(http.request);
http.get = guardGet(http.get);
https.request = guardRequest(https.request);
https.get = guardGet(https.get);

const originalFetch = globalThis.fetch;
const guardedPreconnect: typeof originalFetch.preconnect = (...args) => {
  assertLocalTarget(args[0]);
  return Reflect.apply(originalFetch.preconnect, originalFetch, args);
};
globalThis.fetch = Object.assign(
  async (...args: Parameters<typeof fetch>) => {
    const input = args[0] instanceof Request ? args[0].url : args[0];
    assertLocalTarget(input);
    return originalFetch(...args);
  },
  { preconnect: guardedPreconnect }
);
