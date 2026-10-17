import { expect, test } from 'bun:test';
import { getLocalRedisImageTag } from './redis';

// Every engine version a redis-cluster accepts must name an image that exists on Docker Hub; dev mode cannot start
// a local cache otherwise. Checked on Docker Hub on 8 Oct 2026: redis:7.2, 7.0, 6.2 and 6.0 exist; redis:7.1 does not.
test.each([
  ['7.1', 'redis:7.2'],
  ['7.0', 'redis:7.0'],
  ['6.2', 'redis:6.2'],
  ['6.0', 'redis:6.0'],
  // The default when a config sets no engine version.
  ['7.2', 'redis:7.2']
])('engine version %s runs locally as %s', (engineVersion, image) => {
  expect(getLocalRedisImageTag(engineVersion)).toBe(image);
});
