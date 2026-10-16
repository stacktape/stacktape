/* eslint-disable no-await-in-loop -- Docker builds and runtime probes are deliberately serialized to bound host load. */
/*
 * Node Lambda artifacts with dependencies the bundle leaves out, built from a pnpm project and run in the official
 * Lambda runtime. On this Linux x64 host, native packages that were installed for Linux (bcrypt's prebuilds, a napi-rs
 * platform package), pdfkit and uglify-js, which read their own files, and a scoped package excluded from the
 * bundle are copied from node_modules without Docker, while better-sqlite3, whose addon prebuild-install fetched
 * for this machine's Node.js into build/, is installed again in the Lambda build image, for x64 and for arm64.
 */
import { mkdtemp, readdir, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildJsBundleLambda } from '../src/buildpacks/js-bundle-lambda';
import { buildNativeBinaryLayer, planLambdaDependencies, writeLambdaDependencies } from '../src/es/native-dependencies';
import type { RunDocker } from '../src/runtime-contracts';
import { assignChunksToLayers } from '../src/split-bundler/layer-assignment';
import { buildSplitBundle } from '../src/split-bundler/bundler';
import { createLayerArtifacts } from '../src/split-bundler/layer-builder';
import {
  archiveItem,
  assertRunOutput,
  createPackagingError,
  progressLogger,
  run,
  runDocker,
  write
} from './e2e-helpers';

const root = await mkdtemp(join(tmpdir(), 'stacktape-node-lambda-e2e-'));
const sourceRoot = join(root, 'src');
const buildRoot = join(root, 'build');
const nativeInstallationRoot = join(buildRoot, 'native-installations');
const containers = new Set<string>();

/** Fails the run when packaging asks Docker for something it should have copied. */
const refuseDocker: RunDocker = async (commands) => {
  throw new Error(`Packaging ran Docker for packages already installed for Lambda: docker ${commands.join(' ')}`);
};

/** Real Docker, counting the native installations packaging asks for. */
const countingDocker = () => {
  const builds: string[][] = [];
  const counted: RunDocker = (commands) => {
    builds.push(commands);
    return runDocker(commands);
  };
  return { builds, runDocker: counted };
};

/** The pnpm store directories a function's `node_modules` carries, such as `@hapi+boom@10.0.1`. */
const listStoreDirectories = async (nodeModulesPath: string) =>
  (await readdir(join(nodeModulesPath, '.installed', 'node_modules', '.pnpm'))).toSorted();

/** The Lambda Node runtimes the CLI's split-bundling policy admits. Add one there only after adding it here. */
const SUPPORTED_LAMBDA_NODE_VERSIONS = [18, 20, 22, 24];

const assertZipWithinLambdaLimit = async (zipPath: string) => {
  const size = (await stat(zipPath)).size;
  if (size <= 0 || size > 50 * 1024 * 1024) {
    throw new Error(`Expected ${zipPath} to be a non-empty Lambda ZIP below 50 MiB; received ${size} bytes.`);
  }
};

const invokeLambdaRuntime = async ({
  functionPath,
  handler = 'index.handler',
  layerMounts = [],
  event = {},
  environment = {},
  nodeVersion = 24
}: {
  functionPath: string;
  handler?: string;
  layerMounts?: Array<{ source: string; target: string }>;
  event?: Record<string, unknown>;
  environment?: Record<string, string>;
  /** Lambda Node runtime to invoke in. Split output is version-independent; the matrix proves it. */
  nodeVersion?: number;
}) => {
  // Docker Desktop on WSL sometimes publishes a port that nothing listens on: every host connection is refused while
  // the runtime waits inside. The emulator listens within a second, and before that Docker's proxies reset connections
  // rather than refuse them. A refused request never reached the function, so a new container is safe.
  runtimes: for (let container = 1; ; container += 1) {
    const name = `stp-node-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    containers.add(name);
    try {
      await run('docker', [
        'run',
        '--platform',
        'linux/amd64',
        '--detach',
        '--rm',
        '--name',
        name,
        '--publish',
        '127.0.0.1::8080',
        '--mount',
        `type=bind,source=${functionPath},target=/var/task,readonly`,
        ...layerMounts.flatMap(({ source, target }) => [
          '--mount',
          `type=bind,source=${source},target=${target},readonly`
        ]),
        ...Object.entries(environment).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
        `public.ecr.aws/lambda/nodejs:${nodeVersion}`,
        handler
      ]);

      let invocationUrl: string | undefined;
      let lastError: unknown;
      let refusedSince: number | undefined;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        let refused = false;
        try {
          const portOutput = await run('docker', ['port', name, '8080/tcp']);
          const port = portOutput.stdout.trim().match(/:(\d+)$/)?.[1];
          if (port) {
            invocationUrl = `http://127.0.0.1:${port}/2015-03-31/functions/function/invocations`;
            const response = await fetch(invocationUrl, {
              method: 'POST',
              body: JSON.stringify(event)
            });
            const body = await response.text();
            if (!response.ok) {
              throw new Error(`Lambda runtime returned HTTP ${response.status}: ${body}`);
            }
            return body;
          }
        } catch (error) {
          lastError = error;
          refused = (error as { code?: string }).code === 'ConnectionRefused';
        }
        refusedSince = refused ? (refusedSince ?? Date.now()) : undefined;
        if (refusedSince !== undefined && Date.now() - refusedSince >= 10_000 && container < 3) continue runtimes;
        await Bun.sleep(250);
      }
      const logs = await run('docker', ['logs', name]).catch((error) => ({
        stdout: '',
        stderr: String(error)
      }));
      throw new Error(
        `Lambda runtime at ${invocationUrl ?? 'an unpublished port'} did not become ready: ${String(lastError)}\n${logs.stdout}\n${logs.stderr}`
      );
    } finally {
      await run('docker', ['rm', '--force', name]).catch(() => undefined);
      containers.delete(name);
    }
  }
};

try {
  await run('docker', ['version', '--format', '{{.Server.Version}}']);
  const dependencies = {
    '@hapi/boom': '10.0.1',
    '@node-rs/xxhash': '1.7.8',
    bcrypt: '6.0.0',
    'better-sqlite3': '12.11.1',
    // Reads its font metrics from its own directory at run time, so it must stay out of the bundle.
    pdfkit: '0.16.0',
    // Finds the sources it compiles itself from with `require.resolve` and reads them at load.
    'uglify-js': '3.19.3'
  };
  await write(
    join(root, 'package.json'),
    `${JSON.stringify(
      {
        name: 'stacktape-node-lambda-e2e',
        private: true,
        type: 'module',
        packageManager: 'pnpm@11.17.0',
        dependencies
      },
      null,
      2
    )}\n`
  );
  await write(
    join(root, 'pnpm-workspace.yaml'),
    'packages:\n  - "."\nallowBuilds:\n  bcrypt: true\n  better-sqlite3: true\n'
  );
  await run('pnpm', ['install', '--prefer-offline'], root);

  const sharedMarker = `split-layer-${'x'.repeat(4096)}`;
  await write(join(sourceRoot, 'shared.ts'), `export const sharedMarker = ${JSON.stringify(sharedMarker)};\n`);
  await write(
    join(sourceRoot, 'native.ts'),
    [
      'import bcrypt from "bcrypt";',
      'import { sharedMarker } from "./shared";',
      'export const handler = async () => ({',
      '  function: "native",',
      '  native: await bcrypt.compare("secret", await bcrypt.hash("secret", 4)),',
      '  sharedLength: sharedMarker.length,',
      '  nodeEnv: process.env.NODE_ENV',
      '});'
    ].join('\n')
  );
  await write(
    join(sourceRoot, 'plain.ts'),
    [
      'import { sharedMarker } from "./shared";',
      'export const handler = async () => ({',
      '  function: "plain",',
      '  sharedLength: sharedMarker.length,',
      '  nodeEnv: process.env.NODE_ENV',
      '});'
    ].join('\n')
  );

  console.log('Building a split Lambda bundle with shared and native layers...');
  const splitResult = await buildSplitBundle({
    entrypoints: ['native', 'plain'].map((name) => ({
      name,
      jobName: name,
      entryfilePath: join(sourceRoot, `${name}.ts`),
      distFolderPath: join(buildRoot, 'functions', name)
    })),
    sharedOutdir: join(buildRoot, 'shared'),
    cwd: root,
    minify: true,
    sourceMaps: 'external',
    sourceMapBannerType: 'pre-compiled',
    installDependencies: async () => undefined,
    createPackagingError
  });

  const nativeOutput = splitResult.lambdaOutputs.get('native');
  const plainOutput = splitResult.lambdaOutputs.get('plain');
  if (!nativeOutput || !plainOutput) {
    throw new Error('Split bundling did not produce both synthetic functions.');
  }
  if (nativeOutput.externalDependencies.length !== 1 || nativeOutput.externalDependencies[0]?.name !== 'bcrypt') {
    throw new Error(
      `Native dependency attribution was incorrect: ${JSON.stringify(nativeOutput.externalDependencies)}`
    );
  }
  if (plainOutput.externalDependencies.length !== 0) {
    throw new Error(
      `The plain Lambda incorrectly inherited native dependencies: ${JSON.stringify(plainOutput.externalDependencies)}`
    );
  }

  const assignment = assignChunksToLayers(splitResult.chunkAnalysis, {
    minUsageCount: 2,
    minChunkSize: 1,
    maxLayers: 3,
    maxLayerSize: 50 * 1024 * 1024
  });
  if (assignment.layeredChunks.length === 0) {
    throw new Error('The shared synthetic module was not assigned to a layer.');
  }
  const { layerArtifacts } = await createLayerArtifacts({
    lambdaOutputs: splitResult.lambdaOutputs,
    layerAssignment: assignment,
    layerBasePath: join(buildRoot, 'layers')
  });
  const sharedLayer = layerArtifacts[0];
  if (!sharedLayer) throw new Error('No shared chunk layer was emitted.');

  console.log('Building the dependency layer from the installed bcrypt, without Docker...');
  const nativeLayer = await buildNativeBinaryLayer({
    dependencies: nativeOutput.externalDependencies,
    plan: await planLambdaDependencies({ dependencies: nativeOutput.externalDependencies, architecture: 'x64' }),
    installationRootPath: nativeInstallationRoot,
    layerBasePath: join(buildRoot, 'native-layers'),
    lambdaRuntimeVersion: 24,
    usedByLambdas: ['native'],
    runDocker: refuseDocker
  });

  const lambdaArchives = await Promise.all([
    archiveItem({
      absoluteSourcePath: join(buildRoot, 'functions', 'native'),
      absoluteDestDirPath: buildRoot,
      fileNameBase: 'native-function',
      format: 'zip'
    }),
    archiveItem({
      absoluteSourcePath: join(buildRoot, 'functions', 'plain'),
      absoluteDestDirPath: buildRoot,
      fileNameBase: 'plain-function',
      format: 'zip'
    }),
    archiveItem({
      absoluteSourcePath: sharedLayer.layerPath,
      absoluteDestDirPath: buildRoot,
      fileNameBase: 'shared-layer',
      format: 'zip'
    }),
    archiveItem({
      absoluteSourcePath: nativeLayer.layerPath,
      absoluteDestDirPath: buildRoot,
      fileNameBase: 'native-layer',
      format: 'zip'
    })
  ]);
  await Promise.all(lambdaArchives.map(assertZipWithinLambdaLimit));

  console.log('Invoking both split functions in the official Lambda Node 24 runtime...');
  const nativeResponse = await invokeLambdaRuntime({
    functionPath: join(buildRoot, 'functions', 'native'),
    layerMounts: [
      {
        source: join(sharedLayer.layerPath, 'nodejs', 'chunks'),
        target: '/opt/nodejs/chunks'
      },
      {
        source: join(sharedLayer.layerPath, 'nodejs', 'package.json'),
        target: '/opt/nodejs/package.json'
      },
      {
        source: join(nativeLayer.layerPath, 'nodejs', 'node_modules'),
        target: '/opt/nodejs/node_modules'
      }
    ],
    environment: { NODE_ENV: 'production' }
  });
  const sharedChunkLayerMounts = [
    { source: join(sharedLayer.layerPath, 'nodejs', 'chunks'), target: '/opt/nodejs/chunks' },
    { source: join(sharedLayer.layerPath, 'nodejs', 'package.json'), target: '/opt/nodejs/package.json' }
  ];
  const plainResponse = await invokeLambdaRuntime({
    functionPath: join(buildRoot, 'functions', 'plain'),
    layerMounts: sharedChunkLayerMounts,
    environment: { NODE_ENV: 'production' }
  });
  for (const [name, response] of [
    ['native', nativeResponse],
    ['plain', plainResponse]
  ] as const) {
    const parsed = JSON.parse(response) as Record<string, unknown>;
    if (
      parsed.function !== name ||
      parsed.sharedLength !== sharedMarker.length ||
      parsed.nodeEnv !== 'production' ||
      (name === 'native' && parsed.native !== true)
    ) {
      throw new Error(`Unexpected ${name} Lambda response: ${response}`);
    }
  }

  /*
   * Every Lambda runtime the split path admits, not just the default one.
   *
   * A split artifact differs from a per-Lambda one in exactly one way that the runtime can reject:
   * its entry imports shared chunks by the absolute specifier `/opt/nodejs/chunks/...`, which an ES
   * module resolver has to accept as a file URL. Bun is given `target: 'node'` with no version, so
   * the emitted syntax is the same for every runtime and only that resolution is in question.
   *
   * Running the same bytes on each runtime is what licenses `SUPPORTED_NODE_VERSIONS` in the CLI's
   * split-bundling policy. Add a version there only after adding it here.
   */
  console.log('Invoking the same split artifact on every supported Lambda Node runtime...');
  for (const runtimeVersion of SUPPORTED_LAMBDA_NODE_VERSIONS) {
    const response = JSON.parse(
      await invokeLambdaRuntime({
        functionPath: join(buildRoot, 'functions', 'plain'),
        nodeVersion: runtimeVersion,
        layerMounts: sharedChunkLayerMounts,
        environment: { NODE_ENV: 'production' }
      })
    ) as Record<string, unknown>;
    if (response.function !== 'plain' || response.sharedLength !== sharedMarker.length) {
      throw new Error(
        `The split artifact did not resolve its shared layer on Node ${runtimeVersion}: ${JSON.stringify(response)}`
      );
    }
  }

  /*
   * The assumption the AWS SDK rule rests on.
   *
   * `es/import-classification` leaves `@aws-sdk/client-*` and `@aws-sdk/lib-*` out of a Lambda
   * artifact because the runtime provides them. Those packages live at `/var/runtime/node_modules`,
   * which is not on Node's own resolution path — Lambda puts it there through `NODE_PATH`, and
   * `NODE_PATH` is a CommonJS mechanism. Since split artifacts are ES modules, "the runtime provides
   * it" has to be true for an `import`, not only for a `require`, or every such Lambda fails at load
   * with ERR_MODULE_NOT_FOUND. One import per family is checked; the families are the rule's claim.
   *
   * This runs an unbundled artifact of exactly the shape the split bundler emits — `type: module`
   * plus a bare import — on each runtime. If a future runtime stops shipping the SDK, this fails
   * here instead of in a customer's production Lambda.
   */
  console.log('Checking that an ES module Lambda can still import the runtime-provided AWS SDK...');
  const runtimeSdkDist = join(buildRoot, 'functions', 'runtime-sdk');
  await write(join(runtimeSdkDist, 'package.json'), `${JSON.stringify({ type: 'module' })}\n`);
  await write(
    join(runtimeSdkDist, 'index.js'),
    [
      "import { S3Client } from '@aws-sdk/client-s3';",
      "import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';",
      'export const handler = async () => ({',
      '  client: typeof S3Client === "function",',
      '  lib: typeof DynamoDBDocumentClient === "function"',
      '});'
    ].join('\n')
  );
  for (const runtimeVersion of SUPPORTED_LAMBDA_NODE_VERSIONS) {
    const response = JSON.parse(
      await invokeLambdaRuntime({ functionPath: runtimeSdkDist, nodeVersion: runtimeVersion })
    ) as Record<string, unknown>;
    if (response.client !== true || response.lib !== true) {
      throw new Error(
        `Lambda Node ${runtimeVersion} did not resolve @aws-sdk/client-s3 and @aws-sdk/lib-dynamodb from an ES module, so leaving them out of the artifact is no longer safe: ${JSON.stringify(response)}`
      );
    }
  }

  const buildFunction = (
    name: string,
    extraOptions: { dependenciesToExcludeFromBundle?: string[] },
    docker: RunDocker
  ) =>
    buildJsBundleLambda({
      cwd: root,
      name: `synthetic-${name}`,
      entryfilePath: join(sourceRoot, `${name}.ts`),
      distFolderPath: join(buildRoot, 'functions', name),
      existingDigests: [],
      progressLogger,
      invocationId: 'synthetic-node-lambda-e2e',
      sizeLimit: 250,
      nodeVersion: 24,
      outputModuleFormat: 'esm',
      disableSourceMaps: true,
      // The opt-in, exercised on the real runtime; the split build above runs with the default.
      minifyIdentifiers: true,
      requiresGlibcBinaries: true,
      dockerBuildOutputArchitecture: 'linux/amd64',
      nodeTarget: '24',
      minify: true,
      archiveItem,
      createPackagingError,
      runDocker: docker,
      installDependencies: async () => undefined,
      nativeDependencyInstallationRootPath: nativeInstallationRoot,
      ...extraOptions
    });

  console.log(
    'Packaging installed native packages, a package that reads its own files and an excluded scoped package without Docker...'
  );
  await write(
    join(sourceRoot, 'copied.ts'),
    [
      'import bcrypt from "bcrypt";',
      'import { xxh64 } from "@node-rs/xxhash";',
      'import * as Boom from "@hapi/boom";',
      'import PDFDocument from "pdfkit";',
      'import UglifyJS from "uglify-js";',
      'const renderPdf = () => new Promise((resolve, reject) => {',
      '  const document = new PDFDocument();',
      '  const chunks = [];',
      '  document.on("data", (chunk) => chunks.push(chunk));',
      '  document.on("end", () => resolve(Buffer.concat(chunks).subarray(0, 4).toString()));',
      '  document.on("error", reject);',
      '  document.font("Helvetica").text("Stacktape");',
      '  document.end();',
      '});',
      'export const handler = async () => ({',
      '  bcrypt: await bcrypt.compare("secret", await bcrypt.hash("secret", 4)),',
      '  xxhash: xxh64("stacktape").toString(16),',
      '  boom: Boom.badRequest("invalid").output.statusCode,',
      '  pdf: await renderPdf(),',
      '  minified: UglifyJS.minify("var answer = 40 + 2;").code',
      '});'
    ].join('\n')
  );
  const copiedDist = join(buildRoot, 'functions', 'copied');
  const copiedOutput = await buildFunction('copied', { dependenciesToExcludeFromBundle: ['@hapi/boom'] }, refuseDocker);
  if (copiedOutput.outcome !== 'bundled' || !copiedOutput.artifactPath) {
    throw new Error(`The copied-dependency function did not emit an artifact: ${JSON.stringify(copiedOutput)}`);
  }
  await assertZipWithinLambdaLimit(copiedOutput.artifactPath);
  // The function repeats the project's pnpm layout under `node_modules/.installed`: each package once in `.pnpm`.
  const copiedPackages = await listStoreDirectories(join(copiedDist, 'node_modules'));
  for (const expected of [
    '@hapi+boom@',
    '@hapi+hoek@',
    '@node-rs+xxhash@',
    '@node-rs+xxhash-linux-x64-gnu@',
    'bcrypt@',
    'pdfkit@',
    'uglify-js@'
  ]) {
    if (!copiedPackages.some((name) => name.startsWith(expected))) {
      throw new Error(`${expected} is missing from the function's node_modules: ${copiedPackages.join(', ')}`);
    }
  }
  if (copiedPackages.some((name) => name.includes('musl') || name.includes('darwin'))) {
    throw new Error(`The function carries binaries for other platforms: ${copiedPackages.join(', ')}`);
  }
  const copiedResponse = JSON.parse(
    await invokeLambdaRuntime({ functionPath: copiedDist, environment: { NODE_ENV: 'production' } })
  ) as Record<string, unknown>;
  if (
    copiedResponse.bcrypt !== true ||
    typeof copiedResponse.xxhash !== 'string' ||
    copiedResponse.boom !== 400 ||
    copiedResponse.pdf !== '%PDF' ||
    copiedResponse.minified !== 'var answer=42;'
  ) {
    throw new Error(`Unexpected copied-dependency Lambda response: ${JSON.stringify(copiedResponse)}`);
  }

  console.log(
    'Installing better-sqlite3 again in the Lambda build image, because its addon was built for this host...'
  );
  await write(
    join(sourceRoot, 'sqlite.ts'),
    [
      'import Database from "better-sqlite3";',
      'export const handler = async () => {',
      '  const database = new Database(":memory:");',
      '  return { sqlite: database.prepare("select sqlite_version() as version").get().version };',
      '};'
    ].join('\n')
  );
  const sqliteDocker = countingDocker();
  const sqliteOutput = await buildFunction('sqlite', {}, sqliteDocker.runDocker);
  if (sqliteOutput.outcome !== 'bundled' || sqliteDocker.builds.length !== 1) {
    throw new Error(`better-sqlite3 should take exactly one Docker installation, took ${sqliteDocker.builds.length}.`);
  }
  const sqliteResponse = JSON.parse(
    await invokeLambdaRuntime({ functionPath: join(buildRoot, 'functions', 'sqlite') })
  ) as Record<string, unknown>;
  if (typeof sqliteResponse.sqlite !== 'string') {
    throw new Error(`Unexpected better-sqlite3 Lambda response: ${JSON.stringify(sqliteResponse)}`);
  }

  console.log('Preparing the same packages for arm64: bcrypt from its prebuilds, better-sqlite3 in Docker...');
  const sqlitePackage = {
    name: 'better-sqlite3',
    version: dependencies['better-sqlite3'],
    path: await realpath(join(root, 'node_modules', 'better-sqlite3'))
  };
  const armPlan = await planLambdaDependencies({
    dependencies: [sqlitePackage, ...nativeOutput.externalDependencies],
    architecture: 'arm64'
  });
  if (armPlan.packagesToInstallForLambda.map(({ name }) => name).join() !== 'better-sqlite3') {
    throw new Error(
      `Only better-sqlite3 should need an arm64 installation: ${armPlan.packagesToInstallForLambda.map(({ name }) => name)}`
    );
  }
  const armNodeModules = join(buildRoot, 'arm64', 'node_modules');
  await writeLambdaDependencies({
    plan: armPlan,
    nodeModulesPath: armNodeModules,
    installationRootPath: nativeInstallationRoot,
    lambdaRuntimeVersion: 24,
    runDocker
  });
  await assertRunOutput({
    dockerArgs: [
      '--platform',
      'linux/arm64',
      '--mount',
      `type=bind,source=${armNodeModules},target=/opt/nodejs/node_modules,readonly`,
      'node:24-bookworm-slim',
      'node',
      '-e',
      "const b=require('/opt/nodejs/node_modules/bcrypt'); const D=require('/opt/nodejs/node_modules/better-sqlite3'); new D(':memory:'); b.hash('secret',4).then(h=>b.compare('secret',h)).then(v=>console.log('arm64:'+process.arch+':'+v))"
    ],
    expected: 'arm64:arm64:true'
  });

  console.log(
    'Synthetic Node Lambda E2E passed: split/shared/dependency layers, copied native, napi-rs, self-reading and scoped packages without Docker, better-sqlite3 installed in Docker for x64 and arm64, and Lambda Node 18-24 execution.'
  );
} finally {
  await Promise.all([...containers].map((name) => run('docker', ['rm', '--force', name]).catch(() => undefined)));
  await rm(root, { recursive: true, force: true });
}
