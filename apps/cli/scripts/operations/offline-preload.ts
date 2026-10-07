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
