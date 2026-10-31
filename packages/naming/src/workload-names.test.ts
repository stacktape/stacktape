import { describe, expect, test } from 'bun:test';
import { getLocalImageName } from './workload-names';

// Docker's grammar for one path component of an image name.
const DOCKER_NAME_COMPONENT = /^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$/;

describe('local image names', () => {
  test.each([
    ['shop-dev', 'web-service-container', 'stp-shop-dev-web-service-container'],
    ['blog-dev', 'web-service-container', 'stp-blog-dev-web-service-container'],
    ['shop-prod', 'web-service-container', 'stp-shop-prod-web-service-container'],
    ['shop-dev', 'worker-default', 'stp-shop-dev-worker-default'],
    // Container names of multi-container workloads may hold characters an image name cannot.
    ['shop-dev', 'api-Side_Car.v2', 'stp-shop-dev-api-side-car-v2'],
    ['my--app-dev', 'api-default', 'stp-my--app-dev-api-default'],
    ['shop-dev', 'api-default_', 'stp-shop-dev-api-default']
  ])('%s / %s -> %s', (stackName, jobName, expected) => {
    const name = getLocalImageName({ stackName, jobName });
    expect(name).toBe(expected);
    expect(name).toMatch(DOCKER_NAME_COMPONENT);
  });

  test('a same-named workload of two projects or two stages gets two images, and a rebuild the same one', () => {
    const names = ['shop-dev', 'blog-dev', 'shop-prod'].map((stackName) =>
      getLocalImageName({ stackName, jobName: 'web-service-container' })
    );
    expect(new Set(names).size).toBe(3);
    expect(getLocalImageName({ stackName: 'shop-dev', jobName: 'web-service-container' })).toBe(names[0]!);
  });

  test('a name too long for Docker is shortened and keeps a hash of the full name', () => {
    const stackName = `${'p'.repeat(100)}-${'s'.repeat(27)}`;
    const first = getLocalImageName({ stackName, jobName: 'api-default' });
    const second = getLocalImageName({ stackName, jobName: 'web-default' });
    expect(first).toHaveLength(128);
    expect(first).toMatch(DOCKER_NAME_COMPONENT);
    expect(first).not.toBe(second);
    expect(first.slice(0, 119)).toBe(second.slice(0, 119));
  });
});
