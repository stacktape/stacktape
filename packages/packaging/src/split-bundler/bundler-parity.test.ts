/* eslint-disable no-await-in-loop -- Build modes and runtime dependency transitions reuse output directories sequentially. */
/*
 * The two ES bundlers must classify a bare import the same way.
 *
 * They answer the same question — bundle this, leave it to the runtime, or externalize and install
 * it — and they used to answer it from two hand-maintained copies of the same rules. The copies
 * drifted: the split bundler never learned that a Lambda runtime already ships the AWS SDK, and it
 * failed a whole build on package metadata the per-Lambda bundler tolerates.
 *
 * These tests pin the shared behaviour at the level a customer feels it: what ends up in the
 * artifact.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { afterEach, describe, expect, test } from 'bun:test';
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildEsCode } from '../bundlers/es';
import { buildSplitBundle } from './bundler';
import type { PackagingErrorDetails } from './types';

const temporaryDirectories: string[] = [];
const createPackagingError = ({ message, cause }: PackagingErrorDetails) =>
  new Error(message, cause === undefined ? undefined : { cause });

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const createRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-split-parity-'));
  temporaryDirectories.push(root);
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'parity-fixture', private: true }));
  return root;
};

/** A stand-in package, so the fixtures never need a real install. */
const writePackage = async ({
  root,
  name,
  files = {},
  packageJson = {}
}: {
  root: string;
  name: string;
  files?: Record<string, string>;
  packageJson?: Record<string, unknown>;
}) => {
  const packageRoot = join(root, 'node_modules', name);
  await mkdir(packageRoot, { recursive: true });
  await writeFile(
    join(packageRoot, 'package.json'),
    JSON.stringify({ name, version: '1.0.0', main: 'index.js', ...packageJson })
  );
  await Promise.all([
    writeFile(
      join(packageRoot, 'index.js'),
      files['index.js'] ?? `module.exports = { name: ${JSON.stringify(name)} };`
    ),
    ...Object.entries(files)
      .filter(([file]) => file !== 'index.js')
      .map(([file, contents]) => writeFile(join(packageRoot, file), contents))
  ]);
  return packageRoot;
};

const splitBundle = async ({
  root,
  entries,
  ...options
}: {
  root: string;
  entries: string[];
  isLambda?: boolean;
  nodeTarget?: number | string;
  bundleAwsSdk?: boolean;
  excludeDependencies?: string[];
  dependenciesToExcludeFromBundle?: string[];
}) =>
  buildSplitBundle({
    entrypoints: entries.map((name) => ({
      name,
      jobName: name,
      entryfilePath: join(root, 'src', `${name}.ts`),
      distFolderPath: join(root, 'dist', name)
    })),
    sharedOutdir: join(root, 'shared'),
    cwd: root,
    minify: false,
    sourceMaps: 'disabled',
    installDependencies: async () => {},
    createPackagingError,
    ...options
  });

describe('Prisma, whose query engine no import reaches', () => {
  test('a schema the artifact cannot run with fails the build instead of the first invocation', async () => {
    const root = await createRoot();
    // Prisma 6 with the `prisma-client` generator and no engineType is unsupported. The per-Lambda path
    // has always said so at build time; the split path used to package it happily.
    await writeFile(join(root, 'schema.prisma'), 'generator client { provider = "prisma-client" }');
    await writePackage({
      root,
      name: '@prisma/client',
      packageJson: { version: '6.2.0' },
      files: { 'index.js': 'module.exports = { PrismaClient: class {} };' }
    });
    await mkdir(join(root, 'src'), { recursive: true });
    await Promise.all(
      ['api', 'worker'].map((entry) =>
        writeFile(
          join(root, 'src', `${entry}.ts`),
          `import { PrismaClient } from '@prisma/client';\nexport const handler = async () => new PrismaClient();\n`
        )
      )
    );

    await expect(splitBundle({ root, entries: ['api', 'worker'], isLambda: true, nodeTarget: 24 })).rejects.toThrow(
      /engineType/i
    );
  });
});

describe('a handler the config names by export', () => {
  test('survives split bundling, so naming one need not cost the shared layer', async () => {
    const root = await createRoot();
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'shared.ts'), 'export const shared = () => "shared";');
    await Promise.all(
      ['api', 'worker'].map((entry) =>
        writeFile(
          join(root, 'src', `${entry}.ts`),
          `import { shared } from './shared';\nexport const processOrder = async () => shared();\n`
        )
      )
    );

    await splitBundle({ root, entries: ['api', 'worker'], isLambda: true, nodeTarget: 24 });

    // `index.processOrder` is the handler the CloudFormation template points at.
    const module = (await import(`${join(root, 'dist', 'api', 'index.js')}?parity=${Date.now()}`)) as {
      processOrder?: () => Promise<string>;
    };
    expect(await module.processOrder?.()).toBe('shared');
  });
});

// These are the installed SDK packages, not AWS service fakes. No SDK request is made.
test('single and split artifacts load their SDK from the promised runtime or from their own bytes', async () => {
  const root = await createRoot();
  const sdkModules = join(import.meta.dir, '../../node_modules');
  await symlink(sdkModules, join(root, 'node_modules'), 'junction');
  await mkdir(join(root, 'src'));
  await Promise.all(
    ['api', 'worker'].map((name) =>
      writeFile(
        join(root, 'src', `${name}.ts`),
        [
          "import { DynamoDBClient } from '@aws-sdk/client-dynamodb';",
          "import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';",
          'export const handler = () => {',
          "  const client = new DynamoDBClient({ region: 'eu-west-1', credentials: { accessKeyId: 'test', secretAccessKey: 'test' } });",
          '  const document = DynamoDBDocumentClient.from(client);',
          '  const result = { client: client.constructor.name, service: document.constructor.name, environment: process.env.NODE_ENV };',
          '  document.destroy(); return result;',
          '};'
        ].join('\n')
      )
    )
  );

  for (const [label, options, provided] of [
    ['managed', { isLambda: true, nodeTarget: 24 }, true],
    ['explicit', { isLambda: true, nodeTarget: 24, bundleAwsSdk: true }, false],
    ['container', { isLambda: false, nodeTarget: 24 }, false],
    ['older', { isLambda: true, nodeTarget: 16 }, false]
  ] as const) {
    await buildEsCode({
      sourcePath: join(root, 'src/api.ts'),
      distPath: join(root, 'single/index.js'),
      cwd: root,
      externals: [],
      sourceMaps: 'disabled',
      sourceMapBannerType: 'disabled',
      outputModuleFormat: 'esm',
      minify: true,
      createPackagingError,
      ...options,
      nodeTarget: String(options.nodeTarget)
    });
    await splitBundle({ root, entries: ['api', 'worker'], ...options });
    for (const [kind, source] of [
      ['single', join(root, 'single')],
      ['split', join(root, 'dist/api')]
    ] as const) {
      const runtime = await mkdtemp(join(tmpdir(), `stacktape-sdk-${label}-${kind}-`));
      temporaryDirectories.push(runtime);
      await cp(source, runtime, { recursive: true });
      const invoke = () =>
        spawnSync(
          process.env.npm_node_execpath || 'node',
          [
            '--input-type=module',
            '--eval',
            `import { handler } from ${JSON.stringify(pathToFileURL(join(runtime, 'index.js')).href)}; console.log(JSON.stringify(handler()));`
          ],
          {
            cwd: runtime,
            env: { ...process.env, NODE_ENV: 'runtime-only', NODE_PATH: '' },
            encoding: 'utf8',
            timeout: 10_000
          }
        );
      if (provided) {
        const missingRuntime = invoke();
        expect(missingRuntime.status, `${label}/${kind}: should require the runtime SDK`).not.toBe(0);
        expect(missingRuntime.stderr).toContain('ERR_MODULE_NOT_FOUND');
        await symlink(sdkModules, join(runtime, 'node_modules'), 'junction');
      }
      const execution = invoke();
      expect(execution.status, `${label}/${kind}: ${execution.stderr}`).toBe(0);
      expect(JSON.parse(execution.stdout)).toEqual({
        client: DynamoDBClient.name,
        service: DynamoDBDocumentClient.name,
        environment: 'runtime-only'
      });
    }
  }
}, 30_000);

test('dependency rules select bundled bytes or runtime modules on both build paths', async () => {
  for (const [label, manifest, options, expected, packageName] of [
    ['pure', {}, {}, 'build-copy', 'fixture-dep'],
    ['native', { gypfile: true }, {}, 'runtime-copy', 'fixture-dep'],
    ['authored-external', {}, { dependenciesToExcludeFromBundle: ['fixture-dep'] }, 'runtime-copy', 'fixture-dep'],
    ['excluded', {}, { excludeDependencies: ['fixture-dep'] }, 'runtime-copy', 'fixture-dep'],
    ['wildcard', {}, { dependenciesToExcludeFromBundle: ['*'] }, 'runtime-copy', 'fixture-dep'],
    ['ignored', {}, {}, 'runtime-copy', 'pnpapi'],
    ['missing-manifest', undefined, {}, 'build-copy', 'fixture-dep']
  ] as const) {
    const root = await createRoot();
    const packageRoot = await writePackage({
      root,
      name: packageName,
      packageJson: manifest ?? {},
      files: { 'index.js': "module.exports = 'build-copy';" }
    });
    if (manifest === undefined) await rm(join(packageRoot, 'package.json'));
    await mkdir(join(root, 'src'));
    await writeFile(
      join(root, 'src/api.ts'),
      `import value from '${packageName}'; export const handler = () => value;`
    );
    const buildOptions = {
      excludeDependencies: 'excludeDependencies' in options ? [...options.excludeDependencies] : [],
      dependenciesToExcludeFromBundle:
        'dependenciesToExcludeFromBundle' in options ? [...options.dependenciesToExcludeFromBundle] : []
    };
    await buildEsCode({
      sourcePath: join(root, 'src/api.ts'),
      distPath: join(root, 'single/index.js'),
      cwd: root,
      externals: [],
      outputModuleFormat: 'esm',
      sourceMaps: 'disabled',
      sourceMapBannerType: 'disabled',
      createPackagingError,
      ...buildOptions
    });
    await splitBundle({ root, entries: ['api'], ...buildOptions });
    for (const source of [join(root, 'single'), join(root, 'dist/api')]) {
      const runtime = await mkdtemp(join(tmpdir(), `stacktape-dependency-${label}-`));
      temporaryDirectories.push(runtime);
      await cp(source, runtime, { recursive: true });
      // The dependency available to the runtime has different bytes. Loading the artifact tells us which it chose.
      await writePackage({
        root: runtime,
        name: packageName,
        files: { 'index.js': "module.exports = 'runtime-copy';" }
      });
      const execution = spawnSync(
        process.env.npm_node_execpath || 'node',
        [
          '--input-type=module',
          '--eval',
          `import { handler } from ${JSON.stringify(pathToFileURL(join(runtime, 'index.js')).href)}; console.log(JSON.stringify(handler()));`
        ],
        { cwd: runtime, env: { ...process.env, NODE_PATH: '' }, encoding: 'utf8', timeout: 10_000 }
      );
      expect(execution.status, `${label}: ${execution.stderr}`).toBe(0);
      expect(JSON.parse(execution.stdout), label).toBe(expected);
    }
  }
}, 30_000);
