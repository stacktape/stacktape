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
import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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

const perFunctionBundle = ({
  root,
  entry,
  ...options
}: {
  root: string;
  entry: string;
  isLambda?: boolean;
  nodeTarget?: string;
  bundleAwsSdk?: boolean;
}) =>
  buildEsCode({
    sourcePath: join(root, 'src', `${entry}.ts`),
    distPath: join(root, 'dist-single', entry, 'index.js'),
    cwd: root,
    externals: [],
    minify: false,
    sourceMaps: 'disabled',
    sourceMapBannerType: 'disabled',
    outputModuleFormat: 'esm',
    createPackagingError,
    ...options
  });

/** Everything the built artifacts for these Lambdas contain, concatenated. */
const artifactSources = async (root: string, entries: string[]) => {
  const sources = await Promise.all(
    entries.flatMap((entry) => [
      Bun.file(join(root, 'dist', entry, 'index.js'))
        .text()
        .catch(() => '')
    ])
  );
  const { readdir } = await import('node:fs/promises');
  const chunkSources = await Promise.all(
    entries.map(async (entry) => {
      const chunkDirectory = join(root, 'dist', entry, 'chunks');
      const names = await readdir(chunkDirectory).catch(() => [] as string[]);
      const chunks = await Promise.all(names.map((name) => Bun.file(join(chunkDirectory, name)).text()));
      return chunks.join('\n');
    })
  );
  return [...sources, ...chunkSources].join('\n');
};

describe('modules the Lambda runtime already provides', () => {
  test('a split bundle leaves the AWS SDK to the Lambda runtime instead of shipping it', async () => {
    const root = await createRoot();
    await writePackage({
      root,
      name: '@aws-sdk/client-s3',
      files: {
        'index.js': 'module.exports = { S3Client: class { constructor() {} }, MARKER: "sdk-bytes-in-artifact" };'
      }
    });
    await mkdir(join(root, 'src'), { recursive: true });
    await Promise.all(
      ['api', 'worker'].map((entry) =>
        writeFile(
          join(root, 'src', `${entry}.ts`),
          `import { S3Client } from '@aws-sdk/client-s3';\nexport const handler = async () => new S3Client({});\n`
        )
      )
    );

    await splitBundle({ root, entries: ['api', 'worker'], isLambda: true, nodeTarget: 24 });

    const sources = await artifactSources(root, ['api', 'worker']);
    expect(sources).not.toContain('sdk-bytes-in-artifact');
    expect(sources).toContain('@aws-sdk/client-s3');
  });

  test('both bundlers agree about it, so a project keeps its artifact when it starts sharing a build', async () => {
    const root = await createRoot();
    await writePackage({
      root,
      name: '@aws-sdk/client-s3',
      files: { 'index.js': 'module.exports = { S3Client: class {}, MARKER: "sdk-bytes-in-artifact" };' }
    });
    await mkdir(join(root, 'src'), { recursive: true });
    await Promise.all(
      ['api', 'worker'].map((entry) =>
        writeFile(
          join(root, 'src', `${entry}.ts`),
          `import { S3Client } from '@aws-sdk/client-s3';\nexport const handler = async () => new S3Client();\n`
        )
      )
    );

    await perFunctionBundle({ root, entry: 'api', isLambda: true, nodeTarget: '24' });
    const perFunctionSource = await Bun.file(join(root, 'dist-single', 'api', 'index.js')).text();

    await splitBundle({ root, entries: ['api', 'worker'], isLambda: true, nodeTarget: 24 });
    const splitSource = await artifactSources(root, ['api']);

    expect(perFunctionSource).not.toContain('sdk-bytes-in-artifact');
    expect(splitSource).not.toContain('sdk-bytes-in-artifact');
  });

  test('the lib helpers built on the clients are left to the runtime with them, on both paths', async () => {
    const root = await createRoot();
    await writePackage({
      root,
      name: '@aws-sdk/lib-dynamodb',
      files: { 'index.js': 'module.exports = { DynamoDBDocumentClient: class {}, MARKER: "sdk-bytes-in-artifact" };' }
    });
    await mkdir(join(root, 'src'), { recursive: true });
    await Promise.all(
      ['api', 'worker'].map((entry) =>
        writeFile(
          join(root, 'src', `${entry}.ts`),
          `import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';\nexport const handler = async () => new DynamoDBDocumentClient();\n`
        )
      )
    );

    await perFunctionBundle({ root, entry: 'api', isLambda: true, nodeTarget: '24' });
    const perFunctionSource = await Bun.file(join(root, 'dist-single', 'api', 'index.js')).text();
    await splitBundle({ root, entries: ['api', 'worker'], isLambda: true, nodeTarget: 24 });
    const splitSource = await artifactSources(root, ['api', 'worker']);

    expect(perFunctionSource).not.toContain('sdk-bytes-in-artifact');
    expect(splitSource).not.toContain('sdk-bytes-in-artifact');
  });

  test('`bundleAwsSdk` ships the SDK from node_modules on both paths, for code that needs a newer one', async () => {
    const root = await createRoot();
    await writePackage({
      root,
      name: '@aws-sdk/lib-dynamodb',
      files: { 'index.js': 'module.exports = { DynamoDBDocumentClient: class {}, MARKER: "sdk-bytes-in-artifact" };' }
    });
    await mkdir(join(root, 'src'), { recursive: true });
    await Promise.all(
      ['api', 'worker'].map((entry) =>
        writeFile(
          join(root, 'src', `${entry}.ts`),
          `import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';\nexport const handler = async () => new DynamoDBDocumentClient();\n`
        )
      )
    );

    await perFunctionBundle({ root, entry: 'api', isLambda: true, nodeTarget: '24', bundleAwsSdk: true });
    const perFunctionSource = await Bun.file(join(root, 'dist-single', 'api', 'index.js')).text();
    await splitBundle({ root, entries: ['api', 'worker'], isLambda: true, nodeTarget: 24, bundleAwsSdk: true });
    const splitSource = await artifactSources(root, ['api', 'worker']);

    expect(perFunctionSource).toContain('sdk-bytes-in-artifact');
    expect(splitSource).toContain('sdk-bytes-in-artifact');
  });

  test('a container build still bundles it, because no container runtime provides it', async () => {
    const root = await createRoot();
    await writePackage({
      root,
      name: '@aws-sdk/client-s3',
      files: { 'index.js': 'module.exports = { S3Client: class {}, MARKER: "sdk-bytes-in-artifact" };' }
    });
    await mkdir(join(root, 'src'), { recursive: true });
    await Promise.all(
      ['api', 'worker'].map((entry) =>
        writeFile(
          join(root, 'src', `${entry}.ts`),
          `import { S3Client } from '@aws-sdk/client-s3';\nexport const handler = async () => new S3Client();\n`
        )
      )
    );

    await splitBundle({ root, entries: ['api', 'worker'], isLambda: false, nodeTarget: 24 });

    expect(await artifactSources(root, ['api', 'worker'])).toContain('sdk-bytes-in-artifact');
  });

  test('a Node version the Lambda runtime does not ship the SDK on keeps it bundled', async () => {
    const root = await createRoot();
    await writePackage({
      root,
      name: '@aws-sdk/client-s3',
      files: { 'index.js': 'module.exports = { S3Client: class {}, MARKER: "sdk-bytes-in-artifact" };' }
    });
    await mkdir(join(root, 'src'), { recursive: true });
    await Promise.all(
      ['api', 'worker'].map((entry) =>
        writeFile(
          join(root, 'src', `${entry}.ts`),
          `import { S3Client } from '@aws-sdk/client-s3';\nexport const handler = async () => new S3Client();\n`
        )
      )
    );

    await splitBundle({ root, entries: ['api', 'worker'], isLambda: true, nodeTarget: 16 });

    expect(await artifactSources(root, ['api', 'worker'])).toContain('sdk-bytes-in-artifact');
  });
});

describe('Prisma, whose query engine no import reaches', () => {
  test('is resolved for a split artifact too, not only for a per-Lambda one', async () => {
    const root = await createRoot();
    // A Prisma 7 client generator with the TypeScript engine: no Rust binary to copy, but `resolvePrisma`
    // must still run and accept the schema. If the split path never called it, a schema this builder
    // rejects would go unnoticed — and a schema needing a Rust engine would ship without one.
    await writeFile(
      join(root, 'schema.prisma'),
      'generator client { provider = "prisma-client" engineType = "client" }'
    );
    await writePackage({
      root,
      name: '@prisma/client',
      packageJson: { version: '7.0.0' },
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

    const result = await splitBundle({ root, entries: ['api', 'worker'], isLambda: true, nodeTarget: 24 });

    expect(Array.from(result.lambdaOutputs.keys()).toSorted()).toEqual(['api', 'worker']);
    for (const output of result.lambdaOutputs.values()) {
      expect(output.resolvedModules).toContain('@prisma/client');
    }
  });

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
    const source = await Bun.file(join(root, 'dist', 'api', 'index.js')).text();
    const module = (await import(`${join(root, 'dist', 'api', 'index.js')}?parity=${Date.now()}`)) as {
      processOrder?: () => Promise<string>;
    };
    expect(source).toContain('processOrder');
    expect(await module.processOrder?.()).toBe('shared');
  });
});
