/* eslint-disable no-await-in-loop -- Docker builds and runtime probes are deliberately serialized to bound host load. */
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathExists } from 'fs-extra';
import { buildUsingStacktapeEsLambdaBuildpack } from '../src/buildpacks/stacktape-es-lambda-buildpack';
import { buildNativeBinaryLayer } from '../src/es/native-dependencies';
import { assignChunksToLayers } from '../src/split-bundler/layer-assignment';
import { buildSplitBundle } from '../src/split-bundler/bundler';
import { createLayerArtifacts } from '../src/split-bundler/layer-builder';
import type { SplitBundleDependency } from '../src/split-bundler/types';
import {
  archiveItem,
  assertFile,
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
    for (let attempt = 0; attempt < 120; attempt += 1) {
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
      }
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
};

try {
  await run('docker', ['version', '--format', '{{.Server.Version}}']);
  await write(
    join(root, 'package.json'),
    `${JSON.stringify(
      {
        name: 'stacktape-node-lambda-e2e',
        private: true,
        type: 'module',
        packageManager: 'pnpm@11.17.0',
        dependencies: { bcrypt: '6.0.0' }
      },
      null,
      2
    )}\n`
  );
  await write(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - "."\nonlyBuiltDependencies:\n  - bcrypt\n');
  await run('pnpm', ['add', 'bcrypt@6.0.0', '--allow-build=bcrypt', '--prefer-offline'], root);

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
  if (
    nativeOutput.dependenciesToInstallInDocker.length !== 1 ||
    nativeOutput.dependenciesToInstallInDocker[0]?.name !== 'bcrypt'
  ) {
    throw new Error(
      `Native dependency attribution was incorrect: ${JSON.stringify(nativeOutput.dependenciesToInstallInDocker)}`
    );
  }
  if (plainOutput.dependenciesToInstallInDocker.length !== 0) {
    throw new Error(
      `The plain Lambda incorrectly inherited native dependencies: ${JSON.stringify(plainOutput.dependenciesToInstallInDocker)}`
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

  console.log('Building and executing bcrypt native layers with npm, Yarn, pnpm, Bun, and Deno...');
  const nativeLayers = new Map<string, Awaited<ReturnType<typeof buildNativeBinaryLayer>>>();
  for (const packageManager of ['npm', 'yarn', 'pnpm', 'bun', 'deno'] as const) {
    const layer = await buildNativeBinaryLayer({
      dependencies: nativeOutput.dependenciesToInstallInDocker,
      installationRootPath: nativeInstallationRoot,
      layerBasePath: join(buildRoot, 'native-layers'),
      lambdaRuntimeVersion: 24,
      packageManager,
      dockerBuildOutputArchitecture: 'linux/amd64',
      usedByLambdas: ['native'],
      layerName: `layer-${packageManager}`,
      runDocker: (commands) => runDocker(commands)
    });
    if (!layer) throw new Error(`${packageManager} did not emit a native layer.`);
    nativeLayers.set(packageManager, layer);
    await assertRunOutput({
      dockerArgs: [
        '--platform',
        'linux/amd64',
        '--mount',
        `type=bind,source=${layer.layerPath},target=/opt,readonly`,
        'node:24-bookworm-slim',
        'node',
        '-e',
        "const b=require('/opt/nodejs/node_modules/bcrypt'); b.hash('secret',4).then(h=>b.compare('secret',h)).then(v=>console.log('native-matrix:'+v))"
      ],
      expected: 'native-matrix:true'
    });
  }

  console.log('Building an isolated incompatible bcrypt 5 layer...');
  const bcrypt5Dependencies: SplitBundleDependency[] = nativeOutput.dependenciesToInstallInDocker.map(
    ({ name, note, hasBinary, peerDependencies, optionalPeerDependencies }) => ({
      name,
      version: '5.1.1',
      note,
      hasBinary,
      peerDependencies,
      optionalPeerDependencies
    })
  );
  const bcrypt5Layer = await buildNativeBinaryLayer({
    dependencies: bcrypt5Dependencies,
    installationRootPath: nativeInstallationRoot,
    layerBasePath: join(buildRoot, 'native-layers'),
    lambdaRuntimeVersion: 24,
    packageManager: 'pnpm',
    dockerBuildOutputArchitecture: 'linux/amd64',
    usedByLambdas: ['bcrypt5'],
    layerName: 'layer-pnpm-bcrypt5',
    runDocker: (commands) => runDocker(commands)
  });
  if (!bcrypt5Layer) throw new Error('bcrypt 5 did not emit a native layer.');
  await assertRunOutput({
    dockerArgs: [
      '--platform',
      'linux/amd64',
      '--mount',
      `type=bind,source=${bcrypt5Layer.layerPath},target=/opt,readonly`,
      'node:24-bookworm-slim',
      'node',
      '-e',
      "const p=require('/opt/nodejs/node_modules/bcrypt/package.json'); const b=require('/opt/nodejs/node_modules/bcrypt'); b.hash('secret',4).then(h=>b.compare('secret',h)).then(v=>console.log('isolated:'+p.version+':'+v))"
    ],
    expected: 'isolated:5.1.1:true'
  });

  const pnpmLayer = nativeLayers.get('pnpm');
  if (!pnpmLayer) throw new Error('The pnpm native layer was not available.');
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
      absoluteSourcePath: pnpmLayer.layerPath,
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
        source: join(pnpmLayer.layerPath, 'nodejs', 'node_modules'),
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

  console.log('Packaging a native dependency into a single-function hot-swap ZIP without relying on layers...');
  await write(
    join(sourceRoot, 'hotswap.ts'),
    [
      'import bcrypt from "bcrypt";',
      'export const handler = async () => ({',
      '  function: "hotswap",',
      '  native: await bcrypt.compare("secret", await bcrypt.hash("secret", 4)),',
      '  nodeEnv: process.env.NODE_ENV',
      '});'
    ].join('\n')
  );
  const hotSwapDist = join(buildRoot, 'functions', 'hotswap');
  const hotSwapOutput = await buildUsingStacktapeEsLambdaBuildpack({
    cwd: root,
    name: 'synthetic-hotswap',
    entryfilePath: join(sourceRoot, 'hotswap.ts'),
    distFolderPath: hotSwapDist,
    existingDigests: [],
    progressLogger,
    invocationId: 'synthetic-node-lambda-e2e',
    sizeLimit: 250,
    languageSpecificConfig: {
      nodeVersion: 24,
      outputModuleFormat: 'esm',
      disableSourceMaps: true,
      // The opt-in, exercised on the real runtime; the split build above runs with the default.
      minifyIdentifiers: true
    },
    requiresGlibcBinaries: true,
    dockerBuildOutputArchitecture: 'linux/amd64',
    nodeTarget: '24',
    minify: true,
    archiveItem,
    createPackagingError,
    runDocker,
    installDependencies: async () => undefined,
    nativeDependencyInstallationRootPath: nativeInstallationRoot
  });
  if (hotSwapOutput.outcome !== 'bundled' || !hotSwapOutput.artifactPath) {
    throw new Error(`Hot-swap packaging did not emit an artifact: ${JSON.stringify(hotSwapOutput)}`);
  }
  await assertZipWithinLambdaLimit(hotSwapOutput.artifactPath);
  await assertFile(join(hotSwapDist, 'node_modules', 'bcrypt', 'package.json'));
  if (!(await pathExists(join(hotSwapDist, 'index.js')))) {
    throw new Error('Hot-swap Lambda index.js is missing.');
  }
  const hotSwapResponse = JSON.parse(
    await invokeLambdaRuntime({
      functionPath: hotSwapDist,
      environment: { NODE_ENV: 'production' }
    })
  ) as Record<string, unknown>;
  if (
    hotSwapResponse.function !== 'hotswap' ||
    hotSwapResponse.native !== true ||
    hotSwapResponse.nodeEnv !== 'production'
  ) {
    throw new Error(`Unexpected standalone hot-swap Lambda response: ${JSON.stringify(hotSwapResponse)}`);
  }

  console.log(
    'Synthetic Node Lambda E2E passed: split/shared/native layers, five package managers, version isolation, real ZIPs, Lambda Node 24 execution, and standalone hot-swap.'
  );
} finally {
  await Promise.all([...containers].map((name) => run('docker', ['rm', '--force', name]).catch(() => undefined)));
  await rm(root, { recursive: true, force: true });
}
