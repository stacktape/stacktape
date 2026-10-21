/**
 * Preload for the harness process and for every source CLI child it spawns. The normal test guard refuses every
 * non-loopback HTTP request and scrubs inherited AWS settings; this file then restores the one emulator endpoint the
 * harness chose and the account credentials it hands out, and makes `fetch` refuse redirects, so a redirect to a real
 * AWS host cannot slip past the guard either.
 */
// oxlint-disable-next-line import/no-unassigned-import
import '../../scripts/test-preload';

const endpoint = process.env.MINISTACK_ENDPOINT;
if (endpoint) {
  if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(endpoint)) throw new Error('MiniStack must use a loopback port.');
  process.env.AWS_ENDPOINT_URL = endpoint;
  process.env.AWS_ENDPOINT_URL_STS = endpoint;
  process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS = 'false';
  if (process.env.MINISTACK_ACCESS_KEY_ID && process.env.MINISTACK_SECRET_ACCESS_KEY) {
    process.env.AWS_ACCESS_KEY_ID = process.env.MINISTACK_ACCESS_KEY_ID;
    process.env.AWS_SECRET_ACCESS_KEY = process.env.MINISTACK_SECRET_ACCESS_KEY;
    delete process.env.AWS_SESSION_TOKEN;
  }
}

const guardedFetch = globalThis.fetch;
globalThis.fetch = Object.assign((input: Parameters<typeof fetch>[0], options?: Parameters<typeof fetch>[1]) => {
  // MiniStack 1.5.27 advertises artifact downloads on its container's localhost:4566 instead of Docker's mapped
  // loopback port. Keep the path/query intact and route only these emulator-owned downloads to this fixture.
  const url = new URL(input instanceof Request ? input.url : input.toString());
  if (endpoint && url.origin === 'http://localhost:4566' && url.pathname.startsWith('/_ministack/')) {
    input = new URL(`${url.pathname}${url.search}`, endpoint);
  }
  return guardedFetch(input, { ...options, redirect: 'error' });
}, guardedFetch);
