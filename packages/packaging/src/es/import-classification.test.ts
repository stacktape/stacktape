/*
 * The rules both ES bundlers share. They used to be two hand-maintained copies that drifted; these
 * pin each rule once, where it now lives.
 */
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  analyzeDependency,
  classifyBeforeResolution,
  classifyResolvedModule,
  getModuleName,
  isRuntimeProvidedLambdaModule
} from './import-classification';

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const writePackage = async ({
  name,
  packageJson = {}
}: {
  name: string;
  packageJson?: Record<string, unknown>;
}): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-classification-'));
  temporaryDirectories.push(root);
  const packageRoot = join(root, 'node_modules', name);
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({ name, version: '1.0.0', main: 'index.js', ...packageJson })
  );
  await writeFile(join(packageRoot, 'index.js'), 'module.exports = {};');
  return packageRoot;
};

describe('naming the package a specifier belongs to', () => {
  test.each([
    ['lodash', 'lodash'],
    ['lodash/merge', 'lodash'],
    ['@scope/pkg', '@scope/pkg'],
    ['@scope/pkg/deep/path', '@scope/pkg'],
    ['trailing/', 'trailing']
  ])('%s belongs to %s', (specifier, expected) => {
    expect(getModuleName(specifier)).toBe(expected);
  });
});

describe('modules a Lambda runtime provides', () => {
  test.each([24, 22, 20, 18])('Node %i ships the AWS SDK v3 clients', (nodeTarget) => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/client-s3', nodeTarget })).toBe(true);
  });

  test.each(['24', 'nodejs24.x'])('the runtime version may be written as %s', (nodeTarget) => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/client-s3', nodeTarget })).toBe(true);
  });

  test('a container is not a Lambda runtime, however new its Node version', () => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: false, moduleName: '@aws-sdk/client-s3', nodeTarget: 24 })).toBe(
      false
    );
  });

  test.each([16, 14, undefined, 'unknown'])('Node %s is not assumed to ship it', (nodeTarget) => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/client-s3', nodeTarget })).toBe(false);
  });

  test('the clients and the lib helpers built on them are provided; the rest of the SDK is not assumed', () => {
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/lib-dynamodb', nodeTarget: 24 })).toBe(
      true
    );
    expect(
      isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: '@aws-sdk/util-dynamodb', nodeTarget: 24 })
    ).toBe(false);
    expect(isRuntimeProvidedLambdaModule({ isLambda: true, moduleName: 'aws-sdk', nodeTarget: 24 })).toBe(false);
  });

  test('`bundleAwsSdk` keeps the SDK in the bundle, for code that needs a newer one than the runtime ships', () => {
    const sdkClient = { isLambda: true, moduleName: '@aws-sdk/client-s3', nodeTarget: 24 };
    expect(isRuntimeProvidedLambdaModule({ ...sdkClient, bundleAwsSdk: true })).toBe(false);
    expect(
      classifyBeforeResolution({ ...sdkClient, aliases: {}, bundleAwsSdk: true, specifier: '@aws-sdk/client-s3' })
    ).toEqual({ outcome: 'continue' });
  });

  test('a provided module is recognized before anything tries to locate it on disk', () => {
    expect(
      classifyBeforeResolution({
        aliases: {},
        isLambda: true,
        moduleName: '@aws-sdk/client-s3',
        nodeTarget: 24,
        specifier: '@aws-sdk/client-s3'
      })
    ).toEqual({ outcome: 'runtime-provided' });
  });
});

describe('what happens before a module is located', () => {
  test('a Node builtin is left to the runtime', () => {
    expect(
      classifyBeforeResolution({ aliases: {}, isLambda: true, moduleName: 'fs', nodeTarget: 24, specifier: 'fs' })
    ).toEqual({ outcome: 'builtin' });
    expect(
      classifyBeforeResolution({
        aliases: {},
        isLambda: true,
        moduleName: 'node:fs',
        nodeTarget: 24,
        specifier: 'node:fs'
      })
    ).toEqual({ outcome: 'builtin' });
  });

  test('a tsconfig path alias points at project sources, not a package', () => {
    expect(
      classifyBeforeResolution({
        aliases: { '@app': '/src' },
        isLambda: true,
        moduleName: '@app',
        nodeTarget: 24,
        specifier: '@app/orders'
      })
    ).toEqual({ outcome: 'alias' });
  });

  test('an ordinary dependency carries on to resolution', () => {
    expect(
      classifyBeforeResolution({ aliases: {}, isLambda: true, moduleName: 'zod', nodeTarget: 24, specifier: 'zod' })
    ).toEqual({ outcome: 'continue' });
  });
});

describe('what a located module needs', () => {
  const baseOptions = {
    dependenciesToExcludeFromBundle: [],
    excludeDependencies: [],
    ignoredModules: [] as readonly string[],
    shouldIgnoreAllDeps: false
  };

  test('a pure-JS dependency is bundled', async () => {
    const modulePath = await writePackage({ name: 'pure' });
    const verdict = await classifyResolvedModule({ ...baseOptions, modulePath, moduleName: 'pure' });
    expect(verdict.outcome).toBe('bundle');
    expect(verdict.dependenciesToInstallInDocker).toEqual([]);
  });

  test('a dependency with a native binary is installed instead of bundled', async () => {
    const modulePath = await writePackage({ name: 'native', packageJson: { gypfile: true } });
    const verdict = await classifyResolvedModule({ ...baseOptions, modulePath, moduleName: 'native' });
    expect(verdict.outcome).toBe('external');
    expect(verdict.dependenciesToInstallInDocker.map(({ name }) => name)).toEqual(['native']);
  });

  test('a dependency the user excluded is installed instead of bundled', async () => {
    const modulePath = await writePackage({ name: 'excluded' });
    const verdict = await classifyResolvedModule({
      ...baseOptions,
      dependenciesToExcludeFromBundle: ['excluded'],
      modulePath,
      moduleName: 'excluded'
    });
    expect(verdict.outcome).toBe('external');
    expect(verdict.dependenciesToInstallInDocker.map(({ note }) => note)).toEqual(['EXCLUDED_FROM_BUNDLE_BY_USER']);
  });

  test('a name on the ignore list leaves the bundle', async () => {
    const verdict = await classifyResolvedModule({
      ...baseOptions,
      ignoredModules: ['@prisma/engines'],
      modulePath: undefined,
      moduleName: '@prisma/engines'
    });
    expect(verdict).toMatchObject({ outcome: 'external', note: 'IGNORED' });
  });

  test('`excludeDependencies` keeps a package out of the bundle just as the ignore list does', async () => {
    const verdict = await classifyResolvedModule({
      ...baseOptions,
      excludeDependencies: ['keep-out'],
      modulePath: undefined,
      moduleName: 'keep-out'
    });
    expect(verdict).toMatchObject({ outcome: 'external', note: 'IGNORED' });
  });

  test('the wildcard externalizes everything that could be located', async () => {
    const modulePath = await writePackage({ name: 'anything' });
    const verdict = await classifyResolvedModule({
      ...baseOptions,
      modulePath,
      moduleName: 'anything',
      shouldIgnoreAllDeps: true
    });
    expect(verdict).toMatchObject({ outcome: 'external', note: 'WILDCARD_EXTERNALIZED' });
  });

  test('a module that could not be located is left for the bundler to report', async () => {
    const verdict = await classifyResolvedModule({ ...baseOptions, modulePath: null, moduleName: 'missing' });
    expect(verdict).toEqual({ outcome: 'bundle', dependenciesToInstallInDocker: [] });
  });
});

describe('unreadable package metadata', () => {
  test('is not fatal: the import falls through instead of failing the build', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stacktape-classification-'));
    temporaryDirectories.push(root);
    const packageRoot = join(root, 'node_modules', 'no-manifest');
    await mkdir(packageRoot, { recursive: true });
    await writeFile(join(packageRoot, 'index.js'), 'module.exports = {};');

    const analysis = await analyzeDependency({
      dependenciesToExcludeFromBundle: [],
      dependency: { name: 'no-manifest', path: packageRoot }
    });

    expect(analysis).toEqual({ dependenciesToInstallInDocker: [], allExternalDeps: [] });
  });
});
