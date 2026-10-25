import { expect, test } from 'bun:test';
import { shouldExcludeResourceInDevMode, withSourceMapsInPackage } from './dev-mode';

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

// A bastion serves deployed private databases. A dev stack runs them locally, and a deployed bastion would keep the
// stage's own VPC, where VPC functions cannot reach the local databases. Naming it in `--remote-resources` keeps it.
test.each([
  ['dev', [], true],
  ['dev', ['databaseBastion'], false],
  ['deploy', [], false]
] as const)('a bastion in a %s stack with remote resources %j is left out: %p', (command, remote, excluded) => {
  expect(
    shouldExcludeResourceInDevMode('databaseBastion', 'bastion', { command, remoteResourceNames: new Set(remote) })
  ).toBe(excluded);
});
