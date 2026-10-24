import { expect, test } from 'bun:test';
import { withSourceMapsInPackage } from './dev-mode';

// Dev stack functions keep their source maps in the package, so `--enable-source-maps` is set and a stack trace in
// the dev log points at `src/api.ts`, not `/var/task/index.js`. An explicit choice in the config still wins.
test.each([
  [{ type: 'js-bundle', properties: { entryfilePath: 'src/api.ts' } }, true],
  [{ type: 'js-bundle', properties: { entryfilePath: 'src/api.ts', keepSourceMapsInPackage: false } }, false],
  [{ type: 'js-bundle', properties: { entryfilePath: 'src/api.ts', keepSourceMapsInPackage: true } }, true],
  [{ type: 'js-bundle', properties: { entryfilePath: 'src/api.ts', disableSourceMaps: true } }, undefined],
  [{ type: 'custom-artifact', properties: { packagePath: 'dist.zip' } }, undefined],
  [{ type: 'buildpack', properties: { entryfilePath: 'main.py' } }, undefined]
] as const)('dev packaging %j keeps source maps in the package: %p', (packaging, expected) => {
  const result = withSourceMapsInPackage(packaging as { type: string; properties?: unknown });
  expect((result.properties as { keepSourceMapsInPackage?: boolean }).keepSourceMapsInPackage).toBe(expected);
  if (expected === undefined || 'keepSourceMapsInPackage' in packaging.properties) expect(result).toBe(packaging);
});
