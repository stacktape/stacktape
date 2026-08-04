import { describe, expect, test } from 'bun:test';
import type { LambdaPackaging } from '@stacktape/config/deployment-artifacts';
import type { SplitBundlingCandidate } from './split-bundling-policy';
import { canBuildSplitNativeDependencies, canUseSplitBundling } from './split-bundling-policy';

type StacktapeLambdaPackaging = Extract<LambdaPackaging, { type: 'stacktape-lambda-buildpack' }>;

const candidate = (
  properties: Partial<StacktapeLambdaPackaging['properties']> = {},
  overrides: Omit<SplitBundlingCandidate, 'packaging'> = {}
): SplitBundlingCandidate => ({
  packaging: {
    type: 'stacktape-lambda-buildpack',
    properties: { entryfilePath: './handler.ts', ...properties }
  },
  ...overrides
});

describe('split bundling compatibility', () => {
  test('accepts two homogeneous default Node 24 Lambdas', () => {
    expect(canUseSplitBundling([candidate(), candidate({ entryfilePath: './worker.ts' })])).toBe(true);
  });

  test('requires at least two candidates', () => {
    expect(canUseSplitBundling([candidate()])).toBe(false);
  });

  test.each([
    ['included files', { includeFiles: ['templates/**'] }],
    ['excluded files', { excludeFiles: ['**/*.test.ts'] }],
    ['excluded deployment dependencies', { excludeDependencies: ['sharp'] }],
    ['a custom handler export', { handlerFunction: 'handle' }],
    ['decorator metadata', { languageSpecificConfig: { nodeVersion: 24, emitTsDecoratorMetadata: true } }],
    ['local source-map output', { languageSpecificConfig: { nodeVersion: 24, outputSourceMapsTo: './maps' } }],
    [
      'deployment-package dependency exclusions',
      { languageSpecificConfig: { nodeVersion: 24, dependenciesToExcludeFromDeploymentPackage: ['pg'] } }
    ],
    ['CommonJS output', { languageSpecificConfig: { nodeVersion: 24, outputModuleFormat: 'cjs' } }],
    ['an older Node target', { languageSpecificConfig: { nodeVersion: 22, outputModuleFormat: 'esm' } }]
  ])('falls back for %s', (_description, properties) => {
    expect(
      canUseSplitBundling([candidate(), candidate(properties as Partial<StacktapeLambdaPackaging['properties']>)])
    ).toBe(false);
  });

  test('falls back when architecture or supported compiler settings differ', () => {
    expect(canUseSplitBundling([candidate(), candidate({}, { architecture: 'arm64' })])).toBe(false);
    expect(
      canUseSplitBundling([
        candidate({ languageSpecificConfig: { nodeVersion: 24, tsConfigPath: './tsconfig.api.json' } }),
        candidate({ languageSpecificConfig: { nodeVersion: 24, tsConfigPath: './tsconfig.worker.json' } })
      ])
    ).toBe(false);
    expect(
      canUseSplitBundling([
        candidate({ languageSpecificConfig: { nodeVersion: 24, disableSourceMaps: true } }),
        candidate({ languageSpecificConfig: { nodeVersion: 24, disableSourceMaps: false } })
      ])
    ).toBe(false);
  });

  test('allows identical supported ESM settings', () => {
    const properties: Partial<StacktapeLambdaPackaging['properties']> = {
      languageSpecificConfig: {
        nodeVersion: 24,
        outputModuleFormat: 'esm',
        tsConfigPath: './tsconfig.build.json',
        dependenciesToExcludeFromBundle: ['sharp']
      }
    };
    expect(canUseSplitBundling([candidate(properties), candidate(properties)])).toBe(true);
  });
});

describe('split bundling native dependency support', () => {
  test('requires Docker when native dependencies need materialization', () => {
    expect(canBuildSplitNativeDependencies({ dependencyCount: 1, dockerIsRunning: false })).toBe(false);
    expect(canBuildSplitNativeDependencies({ dependencyCount: 1, dockerIsRunning: true })).toBe(true);
  });

  test('does not require Docker when the split output has no native dependencies', () => {
    expect(canBuildSplitNativeDependencies({ dependencyCount: 0, dockerIsRunning: false })).toBe(true);
  });
});
