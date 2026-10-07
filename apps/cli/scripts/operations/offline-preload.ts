// Keep the normal suite's fail-closed network guard in every CLI child. It also resets inherited AWS settings;
// restore only this scenario's loopback endpoint afterwards, never a developer profile or credential.
// oxlint-disable-next-line import/no-unassigned-import -- installs the existing offline network guard in CLI children.
import '../test-preload';

const endpoint = process.env.J9_AWS_ENDPOINT;
if (endpoint) {
  const url = new URL(endpoint);
  if (url.hostname !== '127.0.0.1') throw new Error('J9 AWS endpoint must be on loopback.');
  process.env.AWS_ENDPOINT_URL = endpoint;
  process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS = 'false';
}

// Domain discovery has two external HTTP boundaries. Redirect only their exact origins to the owned RDAP fixture.
const rdapEndpoint = process.env.J9_RDAP_ENDPOINT;
if (rdapEndpoint) {
  const endpointUrl = new URL(rdapEndpoint);
  if (endpointUrl.hostname !== '127.0.0.1') throw new Error('J9 RDAP endpoint must be on loopback.');
  const guardedFetch = globalThis.fetch;
  globalThis.fetch = Object.assign(async (...args: Parameters<typeof fetch>) => {
    const [input, options] = args;
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin === 'https://data.iana.org' || url.origin === 'https://rdap.j9.test') {
      return guardedFetch(new URL(url.pathname, endpointUrl), options);
    }
    return guardedFetch(...args);
  }, guardedFetch);
}
