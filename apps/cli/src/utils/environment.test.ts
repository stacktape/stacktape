import { describe, expect, test } from 'bun:test';
import { getAugmentedEnvironment, shipsSourceMapsInPackage } from './environment';

const nodeOptionsOf = (environment: { name: string; value: string | number | boolean }[]) =>
  environment.find(({ name }) => name === 'NODE_OPTIONS')?.value;

describe('--enable-source-maps follows the source maps', () => {
  test('a JS/TS Lambda whose build ships maps gets the flag', () => {
    const environment = getAugmentedEnvironment({
      workloadType: 'function',
      packagingType: 'stacktape-lambda-buildpack',
      entryfilePath: 'src/handler.ts',
      nodeVersion: 24
    });
    expect(String(nodeOptionsOf(environment))).toContain('--enable-source-maps');
  });

  test('a build that keeps maps out of the package does not set a flag that would read them', () => {
    const environment = getAugmentedEnvironment({
      workloadType: 'function',
      packagingType: 'stacktape-lambda-buildpack',
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
      packagingType: 'stacktape-lambda-buildpack',
      entryfilePath: 'src/handler.ts',
      nodeVersion: 20,
      sourceMapsInPackage: false
    });
    expect(nodeOptionsOf(environment)).toBe('--max-old-space-size=512');
  });
});

describe('when a build ships source maps', () => {
  test('by default it does', () => {
    expect(shipsSourceMapsInPackage(undefined)).toBe(true);
    expect(shipsSourceMapsInPackage({})).toBe(true);
  });

  test.each([
    ['disableSourceMaps', { disableSourceMaps: true }],
    ['outputSourceMapsTo', { outputSourceMapsTo: './maps' }],
    ['emitTsDecoratorMetadata', { emitTsDecoratorMetadata: true }]
  ])('%s keeps them out of the package', (_option, config) => {
    expect(shipsSourceMapsInPackage(config)).toBe(false);
  });
});
