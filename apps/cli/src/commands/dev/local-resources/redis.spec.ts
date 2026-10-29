import { expect, test } from 'bun:test';
import { getLocalRedisImageTag } from './redis';

// Every engine version a `redis` resource accepts must name an image that exists on Docker Hub; dev mode cannot start
// a local cache otherwise. Checked on Docker Hub on 8 Oct 2026: redis:7.2, 7.0, 6.2 and 6.0 exist; redis:7.1 does not.
// Checked on 29 Oct 2026: valkey/valkey 7.2, 8.0, 8.1, 9.0, 9.1, 7, 8 and 9 exist; 8.2 does not.
test.each([
  ['redis', '7.1', 'redis:7.2'],
  ['redis', '7.0', 'redis:7.0'],
  ['redis', '6.2', 'redis:6.2'],
  ['redis', '6.0', 'redis:6.0'],
  ['valkey', '9.1', 'valkey/valkey:9.1'],
  ['valkey', '9.0', 'valkey/valkey:9.0'],
  ['valkey', '8.2', 'valkey/valkey:8.1'],
  ['valkey', '8.1', 'valkey/valkey:8.1'],
  ['valkey', '8.0', 'valkey/valkey:8.0'],
  ['valkey', '7.2', 'valkey/valkey:7.2'],
  ['valkey-serverless', '9', 'valkey/valkey:9'],
  ['valkey-serverless', '8', 'valkey/valkey:8'],
  ['valkey-serverless', '7', 'valkey/valkey:7']
] as const)('%s %s runs locally as %s', (engine, engineVersion, image) => {
  expect(getLocalRedisImageTag(engine, engineVersion)).toBe(image);
});
