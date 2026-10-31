import { describe, expect, test } from 'bun:test';
import { getLocalImageName } from './workload-names';

// Docker's grammar for one path component of an image name.
const DOCKER_NAME_COMPONENT = /^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$/;

const name = (projectName: string, stage: string, jobName: string) =>
  getLocalImageName({ projectName, stage, jobName });

describe('local image names', () => {
  test.each([
    ['shop', 'dev', 'web-service-container', 'stp-shop-dev-web-service-container-'],
    ['shop', 'dev', 'worker-default', 'stp-shop-dev-worker-default-'],
    // Container names of multi-container workloads may hold characters an image name cannot.
    ['shop', 'dev', 'api-Side_Car.v2', 'stp-shop-dev-api-side-car-v2-'],
    ['my--app', 'dev', 'api-default', 'stp-my--app-dev-api-default-'],
    ['shop', 'dev', 'api-default_', 'stp-shop-dev-api-default-']
  ])('%s / %s / %s reads %s<hash>', (projectName, stage, jobName, prefix) => {
    const image = name(projectName, stage, jobName);
    expect(image.startsWith(prefix)).toBeTrue();
    expect(image).toMatch(/-[0-9a-f]{10}$/);
    expect(image).toMatch(DOCKER_NAME_COMPONENT);
  });

  test('a same-named workload of two projects or two stages gets two images, and a rebuild the same one', () => {
    const names = [name('shop', 'dev', 'web-service-container'), name('blog', 'dev', 'web-service-container')];
    names.push(name('shop', 'prod', 'web-service-container'));
    expect(new Set(names).size).toBe(3);
    expect(name('shop', 'dev', 'web-service-container')).toBe(names[0]!);
  });

  // Review of #426: the readable part alone is ambiguous, where dashes join the parts and where other characters
  // become dashes.
  test.each([
    [
      ['shop', 'dev', 'api-web-service-container'],
      ['shop', 'dev-api', 'web-service-container']
    ],
    [
      ['shop', 'dev', 'api-web-service-container'],
      ['shop-dev', 'api', 'web-service-container']
    ],
    [
      ['shop', 'dev', 'api-side_car'],
      ['shop', 'dev', 'api-side-car']
    ]
  ])('%j and %j read alike but get two images', (first, second) => {
    const [a, b] = [name(...(first as [string, string, string])), name(...(second as [string, string, string]))];
    expect(a.slice(0, -11)).toBe(b.slice(0, -11));
    expect(a).not.toBe(b);
  });

  test('a long name is shortened to 128 characters and stays valid and distinct', () => {
    const projectName = 'p'.repeat(100);
    const stage = 's'.repeat(27);
    const first = name(projectName, stage, 'api-default');
    const second = name(projectName, stage, 'web-default');
    expect(first.length).toBeLessThanOrEqual(128);
    expect(first).toMatch(DOCKER_NAME_COMPONENT);
    expect(first).not.toBe(second);
  });
});
