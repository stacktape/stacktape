import { describe, expect, test } from 'bun:test';
import { getAugmentedEnvironment, shipsSourceMapsInPackage } from './environment';

const nodeOptionsOf = (environment: { name: string; value: string | number | boolean }[]) =>
  environment.find(({ name }) => name === 'NODE_OPTIONS')?.value;

// A build that ships maps on Node 22+ is proved by the config-loading scenario's NODE_OPTIONS.
describe('--enable-source-maps follows the source maps', () => {
  test('a build that keeps maps out of the package does not set a flag that would read them', () => {
    const environment = getAugmentedEnvironment({
      workloadType: 'function',
      packagingType: 'js-bundle',
      entryfilePath: 'src/handler.ts',
      nodeVersion: 24,
      sourceMapsInPackage: false
    });
    expect(String(nodeOptionsOf(environment) ?? '')).not.toContain('--enable-source-maps');
    // The Node 22+ interop flags do not depend on maps.
    expect(String(nodeOptionsOf(environment))).toContain('--experimental-require-module');
  });

  test("the user's own NODE_OPTIONS are kept either way", () => {
    const environment = getAugmentedEnvironment({
      environment: [{ name: 'NODE_OPTIONS', value: '--max-old-space-size=512' }],
      workloadType: 'function',
      packagingType: 'js-bundle',
      entryfilePath: 'src/handler.ts',
      nodeVersion: 20,
      sourceMapsInPackage: false
    });
    expect(nodeOptionsOf(environment)).toBe('--max-old-space-size=512');
  });
});

describe('when a build ships source maps', () => {
  test('a Lambda ZIP keeps them in the deployment bucket unless the configuration keeps them in the package', () => {
    expect(shipsSourceMapsInPackage(undefined, 'lambda')).toBe(false);
    expect(shipsSourceMapsInPackage({ outputSourceMapsTo: './maps' }, 'lambda')).toBe(false);
    expect(shipsSourceMapsInPackage({ keepSourceMapsInPackage: true }, 'lambda')).toBe(true);
    expect(shipsSourceMapsInPackage({ keepSourceMapsInPackage: true, outputSourceMapsTo: './maps' }, 'lambda')).toBe(
      true
    );
  });

  test('an image ships them by default', () => {
    expect(shipsSourceMapsInPackage(undefined, 'container')).toBe(true);
    expect(shipsSourceMapsInPackage({}, 'container')).toBe(true);
    expect(shipsSourceMapsInPackage({ outputSourceMapsTo: './maps' }, 'container')).toBe(false);
  });

  test.each([
    ['disableSourceMaps', { disableSourceMaps: true, keepSourceMapsInPackage: true }],
    ['emitTsDecoratorMetadata', { emitTsDecoratorMetadata: true, keepSourceMapsInPackage: true }]
  ])('%s leaves no map to read', (_option, config) => {
    expect(shipsSourceMapsInPackage(config, 'lambda')).toBe(false);
    expect(shipsSourceMapsInPackage(config, 'container')).toBe(false);
  });
});
