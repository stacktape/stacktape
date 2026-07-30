import { plugin } from 'bun';
import http from 'node:http';
import https from 'node:https';
import { createStacktapeOpenTuiBuildPlugin } from '@shared/utils/stacktape-opentui';

// Tests must opt into a deliberately configured local endpoint; inheriting a developer or CI identity is never a
// valid default. Dummy credentials and disabled instance metadata stop the credential chain from escaping first.
process.env.AWS_ACCESS_KEY_ID = 'stacktape-tests-no-real-aws';
process.env.AWS_SECRET_ACCESS_KEY = 'stacktape-tests-no-real-aws';
process.env.AWS_SESSION_TOKEN = 'stacktape-tests-no-real-aws';
process.env.AWS_DEFAULT_REGION = 'eu-west-1';
process.env.AWS_EC2_METADATA_DISABLED = 'true';
process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS = 'true';
delete process.env.AWS_PROFILE;
delete process.env.AWS_ENDPOINT_URL;
for (const name of Object.keys(process.env)) {
  if (name.startsWith('AWS_ENDPOINT_URL_')) {
    delete process.env[name];
  }
}

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

const assertLocalTarget = (input: unknown) => {
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

plugin(createStacktapeOpenTuiBuildPlugin());
