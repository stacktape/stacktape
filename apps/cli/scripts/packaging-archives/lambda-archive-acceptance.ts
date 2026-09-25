/**
 * Lambda archive acceptance. The CLI owns it because it drives the CLI's production archiver and deploy code.
 *
 * Every archive here comes from the CLI's archiver, is extracted into a new directory by Info-ZIP `unzip`, and runs in
 * the official AWS Lambda Node.js image as an unprivileged user that owns none of its files (see `lambda-runtime.ts`).
 *
 * 1. Backends. The same fixture goes through archiver, zip, 7-Zip and a zip that fails, each in a process whose PATH
 *    offers only that tool. Executables (also ones only the group or others may execute), a single file, hidden
 *    entries, links, a removed file and paths with spaces and quotes must behave the same whichever tool wrote the
 *    archive, and the report names the tool actually used.
 * 2. Cache upgrade of single artifacts. A deployment bucket is seeded the way an older CLI left it: permission-broken
 *    ZIPs under their old digests and keys. For a custom artifact and a managed per-function build, the old object
 *    must fail in Lambda, the current packaging code must reject it and emit a working one, an unchanged run must reuse
 *    that one, and a chmod-only change must be rebuilt.
 * 3. Cache upgrade of split functions and their layers. Every deployment runs the deploy command's own packaging and
 *    upload code on a local bucket (see `deploy-artifacts-worker.ts`), so each rebuild, reuse and upload below is the
 *    CLI's decision. After objects an older CLI left, the functions are rebuilt and new shared and native layers
 *    uploaded; unchanged, everything is reused; mode-only changes to the native layer's tool, to a Prisma engine and to
 *    the host's umask are rebuilt exactly where the archive changes and reused where it does not.
 *    Each backend also archives a compressible fixture: a `useNativeZip` directory is written at level 1 by a native
 *    tool and at level 6 by archiver (none on PATH, or after a native failure), and an explicit level wins either way.
 * 4. The runtime verifier itself gives up on an invocation that never answers and on a container that cannot start,
 *    and leaves no container behind.
 *
 *   pnpm --filter @stacktape/cli run test:lambda-archives -- [--zip-dir <dir>] [--7z-dir <dir>] [--out <dir>]
 *     [--only backends]
 *
 * Needs Docker and `unzip`; contacts no AWS service. A native tool neither given nor on PATH is reported as not
 * qualified; the split deployments use the zip tool when one is given. `--out` must be new or empty; fixtures, builds
 * and archives stay there, extracted trees are removed.
 */
import type { PackagingProgressLogger, RunDocker } from '@stacktape/packaging/runtime-contracts';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { chmod, lstat, mkdir, readdir, readFile, readlink, rm, symlink, writeFile } from 'node:fs/promises';
import { delimiter, dirname, join, resolve } from 'node:path';
import { buildLambdaS3Key, buildLayerS3Key } from '@domain-services/deployment-artifact-manager/artifact-names';
import { parseBucketObjectS3Key } from '@domain-services/deployment-artifact-manager/utils';
import { createCliPackagingError } from '@domain-services/packaging-manager/errors';
import { LAMBDA_ARCHIVE_FORMAT } from '@stacktape/packaging/artifact/archive-entries';
import { buildUsingCustomArtifact } from '@stacktape/packaging/artifact/custom-artifact';
import { buildUsingStacktapeEsLambdaBuildpack } from '@stacktape/packaging/buildpacks/stacktape-es-lambda-buildpack';
import { createEsBundle } from '@stacktape/packaging/bundlers/es';
import { resolveNodeVersion } from '@stacktape/packaging/bundlers/node-version';
import { archiveItem } from '@utils/zip';
import yargsParser from 'yargs-parser';
import { claimOutputDirectory } from '../perf/measurement-context';
import type { DeployArtifactsRequest, DeployArtifactsResult } from './deploy-artifacts-worker';
import {
  ensureLambdaImage,
  extractZip,
  type Invocation,
  invokeInLambdaRuntime,
  listLeftoverContainers
} from './lambda-runtime';
import {
  getPreviousChunkLayerHash,
  getPreviousCustomArtifactDigest,
  getPreviousNativeLayerHash,
  getPreviousSplitFunctionDigest,
  writePreviousFallbackZip,
  writePreviousOwnerOnlyZip
} from './previous-format';
import {
  NATIVE_TOOL,
  SHARED_CATALOG_SIZE,
  SPLIT_FUNCTIONS,
  type SplitFunctionName,
  type SplitProjectFixture,
  writeSplitProjectFixture
} from './split-project-fixture';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
const WORKER = join(import.meta.dir, 'archive-worker.ts');
const DEPLOY_WORKER = join(import.meta.dir, 'deploy-artifacts-worker.ts');

type Result = { check: string; ok: boolean; detail?: string | undefined };
const results: Result[] = [];
/** Every previous and current identity the cache scenarios used, in full, for comparison with other implementations. */
const identities: Record<string, Record<string, string>> = {};

const check = async (name: string, body: () => Promise<string | void>) => {
  try {
    const detail = await body();
    results.push({ check: name, ok: true, ...(detail ? { detail } : {}) });
    console.info(`ok      ${name}${detail ? ` — ${detail}` : ''}`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    results.push({ check: name, ok: false, detail });
    console.error(`FAILED  ${name}\n        ${detail.split('\n').join('\n        ')}`);
  }
};

const progressLogger: PackagingProgressLogger = {
  eventContext: {},
  startEvent: () => {},
  updateEvent: () => {},
  finishEvent: () => {}
};

const file = async (path: string, contents: string, mode = 0o644) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
  await chmod(path, mode);
};

/** Extracts ZIPs into one new directory, runs `body` on it, and removes the directory again. */
const withExtracted = async <T>(zipPaths: string | string[], body: (directory: string) => Promise<T>) => {
  const directory = await extractZip(zipPaths);
  try {
    return await body(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

/** Runs a function ZIP with its layer ZIPs, extracted in attachment order into `/opt` as Lambda does. */
const runArchivedFunction = ({
  functionZip,
  layerZips = [],
  handler = 'index.handler'
}: {
  functionZip: string;
  layerZips?: string[];
  handler?: string;
}) =>
  withExtracted(functionZip, (functionDirectory) =>
    layerZips.length > 0
      ? withExtracted(layerZips, (layerDirectory) =>
          invokeInLambdaRuntime({ functionDirectory, layerDirectory, handler })
        )
      : invokeInLambdaRuntime({ functionDirectory, handler })
  );

/** The deflate options Info-ZIP `unzip -v` reports for a ZIP's file entries: `F` fast (1), `N` normal, `X` best (9). */
const deflateOptions = (zipPath: string) => [
  ...new Set(
    Bun.spawnSync(['unzip', '-v', zipPath], { stdout: 'pipe' })
      .stdout.toString()
      .match(/Defl:[A-Z]/g)
      ?.map((method) => method.slice(-1)) ?? []
  )
];

const listZipNames = (zipPath: string) =>
  Bun.spawnSync(['unzip', '-Z1', zipPath], { stdout: 'pipe' }).stdout.toString().split('\n').filter(Boolean);

const modeOf = async (path: string) => ((await lstat(path)).mode & 0o777).toString(8);

const describeLogs = ({ logs }: Invocation) => `${logs.stdout}${logs.stderr}`;

const expectInvocation = (invocation: Invocation, expected: object) => {
  assert.equal(invocation.status, 200, invocation.body);
  assert.deepEqual(JSON.parse(invocation.body), expected, describeLogs(invocation));
};

// ---------------------------------------------------------------------------------------------------------------------
// 1. Backends

const EXPECTED_HANDLER_RESPONSE = {
  uid: 993,
  tool: 'executable-fixture',
  groupOnlyTool: 'group-executable-fixture',
  otherOnlyTool: 'other-executable-fixture',
  toolThroughLink: 'executable-fixture',
  throughDirectoryLink: 'v2',
  hidden: 'hidden-fixture',
  hiddenDirectory: { hidden: true },
  ownerOnlyOnHost: 'private-fixture',
  spacedName: 'spaced-fixture',
  removedPresent: false,
  modes: { tool: '755', groupOnlyTool: '755', otherOnlyTool: '755', ownerOnlyOnHost: '644', directory: '755' }
};

type WorkerArchive = { path: string; backend: string; nativeFailure?: { tool: string; message: string } };
type LevelArchives = Record<
  'byDefault' | 'override9' | 'direct1' | 'direct6' | 'direct9',
  WorkerArchive & { bytes: number }
>;

const checkBackend = async ({
  label,
  pathDirectory,
  expectBackend,
  expectNativeFailure,
  outDirectory
}: {
  label: string;
  pathDirectory: string;
  expectBackend: string;
  expectNativeFailure: string | null;
  outDirectory: string;
}) => {
  const directory = join(outDirectory, 'backends', label);
  await mkdir(directory, { recursive: true });
  const child = Bun.spawnSync([process.execPath, WORKER, directory], {
    cwd: CLI_ROOT,
    // Only the tool under test: the archiver picks the first native tool it finds on PATH.
    env: { ...process.env, PATH: pathDirectory },
    stdout: 'pipe',
    stderr: 'pipe'
  });
  if (child.exitCode !== 0) {
    await check(`${label}: archives the fixture`, async () => {
      throw new Error(child.stderr.toString() || child.stdout.toString());
    });
    return;
  }
  const { first, second, single, levels } = JSON.parse(child.stdout.toString().trim().split('\n').at(-1)!) as Record<
    'first' | 'second' | 'single',
    WorkerArchive
  > & { levels: LevelArchives };

  await check(`${label}: reports the backend that wrote the archive`, async () => {
    for (const archive of [first, second]) {
      assert.equal(archive.backend, expectBackend);
      assert.equal(archive.nativeFailure?.tool ?? null, expectNativeFailure);
    }
    assert.equal(single.backend, 'archiver', 'a single file is always written by archiver');
    return `${second.backend}${second.nativeFailure ? ` after ${second.nativeFailure.tool} failed: ${second.nativeFailure.message.split('\n')[0]}` : ''}`;
  });

  await check(
    `${label}: a native tool compresses at level 1, archiver at level 6, and an explicit level wins`,
    async () => {
      const { byDefault, override9, direct1, direct6, direct9 } = levels;
      for (const direct of [direct1, direct6, direct9]) assert.equal(direct.backend, 'archiver');
      assert.equal(byDefault.backend, expectBackend);
      assert.equal(override9.backend, expectBackend);
      const sizes = `default ${byDefault.bytes} B, override 9 ${override9.bytes} B; archiver 1/6/9 ${direct1.bytes}/${direct6.bytes}/${direct9.bytes} B`;
      if (expectBackend === 'archiver') {
        assert.equal(byDefault.bytes, direct6.bytes, `the archiver default is level 6 (${sizes})`);
        assert.ok(direct6.bytes < direct1.bytes, `the fixture tells level 6 from level 1 (${sizes})`);
        assert.equal(override9.bytes, direct9.bytes, `an explicit level 9 is kept (${sizes})`);
        return sizes;
      }
      if (expectBackend === 'zip') {
        assert.deepEqual(deflateOptions(byDefault.path), ['F'], `the zip default is level 1 (${sizes})`);
        assert.deepEqual(deflateOptions(override9.path), ['X'], `an explicit level 9 is kept (${sizes})`);
      }
      return `${sizes}; deflate options ${deflateOptions(byDefault.path).join('')} and ${deflateOptions(override9.path).join('')}`;
    }
  );

  await check(`${label}: rewriting the same destination drops a file removed from the source`, async () => {
    assert.ok(listZipNames(join(directory, 'first archive copy.zip')).includes('removed.txt'));
    assert.ok(!listZipNames(second.path).includes('removed.txt'));
    assert.equal(first.path, second.path);
  });

  await check(`${label}: the extracted directory runs in the Lambda runtime`, () =>
    withExtracted(second.path, async (extracted) => {
      assert.equal(await modeOf(join(extracted, 'bin', 'tool.sh')), '755');
      assert.equal(await modeOf(join(extracted, 'bin', 'group-tool.sh')), '755');
      assert.equal(await modeOf(join(extracted, 'bin', 'other-tool.sh')), '755');
      assert.equal(await modeOf(join(extracted, 'private.txt')), '644');
      assert.equal(await readlink(join(extracted, 'tool-link')), 'bin/tool.sh');
      assert.equal(await readlink(join(extracted, 'current')), 'versions/v2');
      const invocation = await invokeInLambdaRuntime({ functionDirectory: extracted, handler: 'index.handler' });
      expectInvocation(invocation, EXPECTED_HANDLER_RESPONSE);
      return 'executables (also group- and other-only ones), links, hidden entries, owner-only file and quoted name all usable by uid 993';
    })
  );

  await check(`${label}: a single-file custom runtime the host left non-executable runs`, () =>
    withExtracted(single.path, async (extracted) => {
      assert.equal(await modeOf(join(extracted, 'bootstrap')), '755');
      expectInvocation(await invokeInLambdaRuntime({ functionDirectory: extracted }), {
        customRuntime: true,
        uid: 993
      });
    })
  );
};

// ---------------------------------------------------------------------------------------------------------------------
// 2. Cache upgrade of single artifacts

/** A deployment bucket, as S3 keys and object bytes, read the way the CLI reads the real one. */
class ArtifactInventory {
  readonly objects = new Map<string, Buffer>();
  constructor(private readonly directory: string) {}

  put = async (key: string, zipPath: string) => {
    this.objects.set(key, await readFile(zipPath));
  };

  /** As `DeploymentArtifactManager.getExistingDigestsForJob`. */
  existingDigestsFor = (jobName: string) =>
    [...this.objects.keys()]
      .map(parseBucketObjectS3Key)
      .filter(({ name }) => name === jobName)
      .map(({ digest }) => digest!);

  /** As `DeploymentArtifactManager#getUserLambdaS3UploadInfo` for a skipped job: the newest object with that digest. */
  reusableKeyFor = (jobName: string, digest: string) =>
    [...this.objects.keys()]
      .map((s3Key) => ({ s3Key, ...parseBucketObjectS3Key(s3Key) }))
      .filter(({ name }) => name === jobName)
      .sort(({ version: left }, { version: right }) => right.localeCompare(left))
      .find((object) => object.digest === digest)?.s3Key;

  /** Writes the stored object to a file so it can be extracted like a download from the bucket. */
  materialize = async (key: string) => {
    const bytes = this.objects.get(key);
    assert.ok(bytes, `The bucket has no object ${key}.`);
    const path = join(this.directory, `${key.replace(/[/]/g, '__')}`);
    await mkdir(this.directory, { recursive: true });
    await writeFile(path, bytes);
    return path;
  };
}

const runStoredFunction = async ({ inventory, functionKey }: { inventory: ArtifactInventory; functionKey: string }) =>
  runArchivedFunction({ functionZip: await inventory.materialize(functionKey) });

/** A handler that runs two tools and reports each one's output or failure. */
const TOOL_RUNNER = (tools: string[]) => `import { execFileSync } from 'node:child_process';

const run = (path) => {
  try {
    return execFileSync(path).toString().trim();
  } catch (error) {
    return \`failed: \${error.code ?? error.message}\`;
  }
};

export const handler = async () => ({ uid: process.getuid(), ${tools.map((tool, index) => `tool${index + 1}: run(${JSON.stringify(tool)})`).join(', ')} });
`;

const customArtifactScenario = async (outDirectory: string) => {
  const root = join(outDirectory, 'cache', 'custom artifact');
  const packagePath = join(root, 'package');
  await file(join(packagePath, 'index.mjs'), TOOL_RUNNER(['/var/task/bin/tool.sh', '/var/task/bin/second.sh']));
  await file(join(packagePath, 'bin', 'tool.sh'), '#!/bin/sh\necho custom-tool\n', 0o755);
  await file(join(packagePath, 'bin', 'second.sh'), '#!/bin/sh\necho custom-second\n');
  const jobName = 'custom-function';
  const handler = 'index.handler';
  const inventory = new ArtifactInventory(join(root, 'bucket'));
  const build = (distFolder: string) =>
    buildUsingCustomArtifact({
      name: jobName,
      cwd: root,
      packagePath,
      handler,
      distFolderPath: join(root, distFolder),
      existingDigests: inventory.existingDigestsFor(jobName),
      progressLogger,
      archiveItem,
      createPackagingError: createCliPackagingError
    });

  const previousZip = join(root, 'previous.zip');
  await writePreviousFallbackZip({ sourcePath: packagePath, outputPath: previousZip });
  const previousDigest = await getPreviousCustomArtifactDigest({ packagePath, handler });
  const previousKey = buildLambdaS3Key(jobName, '000001', previousDigest);
  await inventory.put(previousKey, previousZip);

  await check('custom artifact: the object an older CLI uploaded cannot run its tool', async () => {
    expectInvocation(await runStoredFunction({ inventory, functionKey: previousKey }), {
      uid: 993,
      tool1: 'failed: EACCES',
      tool2: 'failed: EACCES'
    });
  });

  const corrected = await build('dist-corrected');
  const correctedKey = buildLambdaS3Key(jobName, '000002', corrected.digest);
  identities.customArtifact = { previousDigest, previousKey, correctedDigest: corrected.digest, correctedKey };
  await check('custom artifact: the current build rejects the old digest and emits a working ZIP', async () => {
    assert.equal(corrected.outcome, 'bundled');
    assert.notEqual(corrected.digest, previousDigest);
    await inventory.put(correctedKey, corrected.artifactPath!);
    expectInvocation(await runStoredFunction({ inventory, functionKey: correctedKey }), {
      uid: 993,
      tool1: 'custom-tool',
      tool2: 'failed: EACCES'
    });
    return `old ${previousDigest.slice(0, 12)} → new ${corrected.digest.slice(0, 12)}`;
  });

  await check('custom artifact: an unchanged run reuses the corrected object', async () => {
    const unchanged = await build('dist-unchanged');
    assert.equal(unchanged.outcome, 'skipped');
    assert.equal(unchanged.digest, corrected.digest);
    assert.equal(inventory.reusableKeyFor(jobName, unchanged.digest), correctedKey);
    expectInvocation(await runStoredFunction({ inventory, functionKey: correctedKey }), {
      uid: 993,
      tool1: 'custom-tool',
      tool2: 'failed: EACCES'
    });
  });

  await check('custom artifact: a chmod-only change is rebuilt with the new mode', async () => {
    await chmod(join(packagePath, 'bin', 'second.sh'), 0o755);
    const changed = await build('dist-chmod');
    assert.equal(changed.outcome, 'bundled');
    assert.notEqual(changed.digest, corrected.digest);
    const changedKey = buildLambdaS3Key(jobName, '000003', changed.digest);
    identities.customArtifact!.chmodDigest = changed.digest;
    await inventory.put(changedKey, changed.artifactPath!);
    expectInvocation(await runStoredFunction({ inventory, functionKey: changedKey }), {
      uid: 993,
      tool1: 'custom-tool',
      tool2: 'custom-second'
    });
  });
};

const refuseDocker: RunDocker = async () => {
  throw new Error('The Lambda archive acceptance does not install dependencies in Docker.');
};

const managedBuildpackScenario = async (outDirectory: string) => {
  const root = join(outDirectory, 'cache', 'managed buildpack');
  // `workspaces: []` makes this directory its own project root, as a standalone project is.
  await file(join(root, 'package.json'), '{"name":"managed-fixture","private":true,"type":"module","workspaces":[]}\n');
  // Bun transpiles without type checking, so the plain JavaScript handler serves as TypeScript source.
  await file(join(root, 'src', 'handler.ts'), TOOL_RUNNER(['/var/task/bin/tool.sh', '/var/task/bin/second.sh']));
  await file(join(root, 'bin', 'tool.sh'), '#!/bin/sh\necho managed-tool\n', 0o755);
  await file(join(root, 'bin', 'second.sh'), '#!/bin/sh\necho managed-second\n');
  const jobName = 'managed-function';
  const inventory = new ArtifactInventory(join(root, 'bucket'));
  const nodeTarget = String(resolveNodeVersion({ nodeVersion: undefined, runtime: undefined, target: 'lambda' }));
  const common = {
    name: jobName,
    cwd: root,
    entryfilePath: join(root, 'src', 'handler.ts'),
    includeFiles: ['bin/tool.sh', 'bin/second.sh'],
    invocationId: 'lambda-archive-acceptance',
    minify: true,
    nodeTarget,
    outputModuleFormat: 'esm' as const,
    additionalDigestInput: 'lambda-archive-acceptance',
    dockerBuildOutputArchitecture: 'linux/amd64' as const,
    installDependencies: async () => {},
    nativeDependencyInstallationRootPath: join(root, '_bin-install'),
    runDocker: refuseDocker,
    createPackagingError: createCliPackagingError,
    progressLogger
  };
  // The directory checksum includes the directory's own name, so every build uses the job name, as the CLI does.
  const build = (run: string) =>
    buildUsingStacktapeEsLambdaBuildpack({
      ...common,
      distFolderPath: join(root, run, jobName),
      existingDigests: inventory.existingDigestsFor(jobName),
      archiveItem,
      sizeLimit: 250
    });

  // An older CLI built the same bundle, computed the digest its image counterpart still computes, and zipped the
  // directory with the previous fallback archiver.
  const previousDist = join(root, 'previous', jobName);
  const previous = await createEsBundle({
    ...common,
    distFolderPath: previousDist,
    existingDigests: [],
    installNonStaticallyBuiltDepsInDocker: true,
    isLambda: true,
    externals: []
  });
  const previousZip = join(root, 'previous.zip');
  await writePreviousFallbackZip({ sourcePath: previousDist, outputPath: previousZip });
  const previousKey = buildLambdaS3Key(jobName, '000001', previous.digest);
  await inventory.put(previousKey, previousZip);

  await check('managed buildpack: the object an older CLI uploaded cannot run its included tool', async () => {
    expectInvocation(await runStoredFunction({ inventory, functionKey: previousKey }), {
      uid: 993,
      tool1: 'failed: EACCES',
      tool2: 'failed: EACCES'
    });
  });

  const corrected = await build('dist-corrected');
  const correctedKey = buildLambdaS3Key(jobName, '000002', corrected.digest);
  identities.managedBuildpack = {
    previousDigest: previous.digest,
    previousKey,
    correctedDigest: corrected.digest,
    correctedKey
  };
  await check('managed buildpack: the current build rejects the old digest and emits a working ZIP', async () => {
    assert.equal(corrected.outcome, 'bundled');
    assert.notEqual(corrected.digest, previous.digest);
    await inventory.put(correctedKey, corrected.artifactPath!);
    expectInvocation(await runStoredFunction({ inventory, functionKey: correctedKey }), {
      uid: 993,
      tool1: 'managed-tool',
      tool2: 'failed: EACCES'
    });
    return `old ${previous.digest.slice(0, 12)} → new ${corrected.digest.slice(0, 12)}`;
  });

  await check('managed buildpack: an unchanged run reuses the corrected object', async () => {
    const unchanged = await build('dist-unchanged');
    assert.equal(unchanged.outcome, 'skipped');
    assert.equal(unchanged.digest, corrected.digest);
    assert.equal(inventory.reusableKeyFor(jobName, unchanged.digest), correctedKey);
    expectInvocation(await runStoredFunction({ inventory, functionKey: correctedKey }), {
      uid: 993,
      tool1: 'managed-tool',
      tool2: 'failed: EACCES'
    });
  });

  await check('managed buildpack: a chmod-only change to an included file is rebuilt with the new mode', async () => {
    await chmod(join(root, 'bin', 'second.sh'), 0o755);
    const changed = await build('dist-chmod');
    assert.equal(changed.outcome, 'bundled');
    assert.notEqual(changed.digest, corrected.digest);
    const changedKey = buildLambdaS3Key(jobName, '000003', changed.digest);
    identities.managedBuildpack!.chmodDigest = changed.digest;
    await inventory.put(changedKey, changed.artifactPath!);
    expectInvocation(await runStoredFunction({ inventory, functionKey: changedKey }), {
      uid: 993,
      tool1: 'managed-tool',
      tool2: 'managed-second'
    });
  });
};

// ---------------------------------------------------------------------------------------------------------------------
// 3. Cache upgrade of split functions and their layers, decided by the CLI's deploy code

type Deployment = DeployArtifactsResult & { label: string };

/**
 * One deployment in its own process (see `deploy-artifacts-worker.ts`), working in the project with the Docker stand-in
 * and `pathDirectories` as its whole PATH, and optionally a umask. Its request, result, Docker commands and output stay
 * in the deployment's directory.
 */
const deploy = async ({
  fixture,
  bucket,
  label,
  lastVersion,
  pathDirectories,
  umask
}: {
  fixture: SplitProjectFixture;
  bucket: string;
  label: string;
  lastVersion: string;
  pathDirectories: string[];
  umask?: string | undefined;
}): Promise<Deployment> => {
  const directory = join(fixture.root, 'deployments', label);
  await mkdir(directory, { recursive: true });
  const request: DeployArtifactsRequest = {
    bucketDirectory: bucket,
    lastVersion,
    resultPath: join(directory, 'result.json')
  };
  await writeFile(join(directory, 'request.json'), `${JSON.stringify(request, null, 2)}\n`);
  const command = [
    process.execPath,
    '--preload',
    join(CLI_ROOT, 'scripts', 'test-preload.ts'),
    DEPLOY_WORKER,
    join(directory, 'request.json')
  ];
  const child = Bun.spawnSync(umask ? ['/bin/sh', '-c', `umask ${umask} && exec "$@"`, 'sh', ...command] : command, {
    cwd: fixture.project,
    env: {
      HOME: process.env.HOME ?? '',
      PATH: [fixture.dockerDirectory, ...pathDirectories].join(delimiter),
      STP_FAKE_DOCKER_INSTALL: fixture.dockerInstall,
      STP_FAKE_DOCKER_LOG: join(directory, 'docker.log'),
      STP_INVOCATION_ID: label
    },
    stdout: 'pipe',
    stderr: 'pipe'
  });
  await writeFile(join(directory, 'output.log'), `${child.stdout.toString()}${child.stderr.toString()}`);
  if (child.exitCode !== 0) {
    throw new Error(
      `Deployment ${label} failed (${child.exitCode}): ${child.stderr.toString() || child.stdout.toString()}`
    );
  }
  return { label, ...(JSON.parse(await readFile(request.resultPath, 'utf8')) as DeployArtifactsResult) };
};

const SPLIT_RESPONSES: Record<SplitFunctionName, Record<string, unknown>> = {
  native: {
    function: 'native',
    uid: 993,
    catalog: SHARED_CATALOG_SIZE,
    packageName: 'fixture-native',
    tool: 'native-tool'
  },
  prisma: {
    function: 'prisma',
    uid: 993,
    catalog: SHARED_CATALOG_SIZE,
    client: 'stub-client',
    engine: 'prisma-engine'
  },
  plain: { function: 'plain', uid: 993, catalog: SHARED_CATALOG_SIZE }
};

const jobOf = (deployment: Deployment, name: SplitFunctionName) => {
  const job = deployment.jobs.find(({ jobName }) => jobName === name);
  assert.ok(job, `${deployment.label} did not package ${name}.`);
  return job;
};

const layerOf = (deployment: Deployment, layerNumber: number) => {
  const layer = deployment.layers.find((candidate) => candidate.layerNumber === layerNumber);
  assert.ok(layer, `${deployment.label} built no layer ${layerNumber}.`);
  return layer;
};

const layerNumberOf = (s3Key: string) => Number(/^shared-layer-(\d+)\//.exec(s3Key)![1]);

/**
 * Checks what the deploy code decided, from its own records: which functions it packaged anew and which it found
 * unchanged, which objects the finalized template uses, and which of those it uploaded or took from the bucket.
 * Reuse of a function is established from the skipped job, the template's key, the stored object and the absence of
 * an upload. The manager's retention record lists reused layers but not reused functions (see
 * `DeployArtifactsResult.retentionProtectedKeys`); that gap is reported per deployment, not asserted here.
 */
const expectDecisions = (
  deployment: Deployment,
  expected: { rebuilt: SplitFunctionName[]; uploadedLayers: number[] },
  bucket: string
): string => {
  for (const name of SPLIT_FUNCTIONS) {
    const job = jobOf(deployment, name);
    const rebuilt = expected.rebuilt.includes(name);
    const { s3Key } = deployment.functions[name]!;
    assert.equal(job.skipped, !rebuilt, `${deployment.label}: ${name} should be ${rebuilt ? 'rebuilt' : 'reused'}`);
    assert.equal(parseBucketObjectS3Key(s3Key).digest, job.digest, `${name}: the template names the packaged digest`);
    assert.equal(deployment.uploadedKeys.includes(s3Key), rebuilt, `${deployment.label}: upload of ${s3Key}`);
    if (!rebuilt) {
      assert.ok(
        parseBucketObjectS3Key(s3Key).version !== deployment.version && existsSync(join(bucket, s3Key)),
        `${deployment.label}: ${s3Key} is an object an earlier deployment left in the bucket`
      );
    }
  }
  for (const layer of deployment.layers) {
    const uploaded = expected.uploadedLayers.includes(layer.layerNumber);
    assert.equal(
      deployment.uploadedKeys.includes(layer.s3Key),
      uploaded,
      `${deployment.label}: upload of ${layer.s3Key}`
    );
    assert.equal(
      deployment.retentionProtectedKeys.includes(layer.s3Key),
      !uploaded,
      `${deployment.label}: retention record of the reused ${layer.s3Key}`
    );
  }
  return [
    ...SPLIT_FUNCTIONS.map((name) => `${name} ${jobOf(deployment, name).skipped ? 'reused' : 'rebuilt'}`),
    ...deployment.layers.map(
      ({ layerNumber, s3Key }) =>
        `layer ${layerNumber} ${deployment.uploadedKeys.includes(s3Key) ? 'uploaded' : 'reused'}`
    )
  ].join(', ');
};

const splitProjectScenario = async ({
  outDirectory,
  pathDirectories
}: {
  outDirectory: string;
  pathDirectories: string[];
}) => {
  const fixture = await writeSplitProjectFixture(join(outDirectory, 'cache', 'split project'));
  const bucket = join(fixture.root, 'deployment bucket');
  const recordingBucket = join(fixture.root, 'recording bucket');
  await Promise.all([mkdir(bucket, { recursive: true }), mkdir(recordingBucket, { recursive: true })]);
  const run = (label: string, lastVersion: string, umask?: string) =>
    deploy({ fixture, bucket, label, lastVersion, pathDirectories, umask });
  const objectPath = (s3Key: string) => join(bucket, s3Key);
  const invokeDeployed = (deployment: Deployment, name: SplitFunctionName) =>
    runArchivedFunction({
      functionZip: objectPath(deployment.functions[name]!.s3Key),
      layerZips: deployment.functions[name]!.layerKeys.map(objectPath)
    });
  const expectResponses = async (
    deployment: Deployment,
    overrides: Partial<Record<SplitFunctionName, Record<string, unknown>>> = {}
  ) => {
    for (const name of SPLIT_FUNCTIONS) {
      expectInvocation(await invokeDeployed(deployment, name), { ...SPLIT_RESPONSES[name], ...overrides[name] });
    }
  };

  // What an older CLI deployed as v000001: this build, named by the previous formulas and zipped by the previous
  // archivers. The build is recorded once, into a bucket of its own, for its directories.
  const recording = await deploy({
    fixture,
    bucket: recordingBucket,
    label: '01-recording',
    lastVersion: 'v000000',
    pathDirectories
  });
  const previousLayerHashes = new Map([
    [0, await getPreviousNativeLayerHash(layerOf(recording, 0).layerPath)],
    [1, await getPreviousChunkLayerHash(layerOf(recording, 1).layerPath)]
  ]);
  const previousLayerKey = (layerNumber: number) =>
    buildLayerS3Key(layerNumber, previousLayerHashes.get(layerNumber)!, '');
  await Promise.all(
    [0, 1].map((layerNumber) => mkdir(dirname(objectPath(previousLayerKey(layerNumber))), { recursive: true }))
  );
  await writePreviousFallbackZip({
    sourcePath: layerOf(recording, 0).layerPath,
    outputPath: objectPath(previousLayerKey(0))
  });
  await writePreviousOwnerOnlyZip({
    sourcePath: layerOf(recording, 1).layerPath,
    outputPath: objectPath(previousLayerKey(1))
  });
  const previous = {} as Record<SplitFunctionName, { digest: string; s3Key: string; layerKeys: string[] }>;
  for (const name of SPLIT_FUNCTIONS) {
    const layerNumbers = recording.functions[name]!.layerKeys.map(layerNumberOf);
    const digest = await getPreviousSplitFunctionDigest({
      distFolderPath: recording.functionDirectories[name]!,
      chunkLayers: layerNumbers
        .filter((layerNumber) => layerNumber !== 0)
        .map((layerNumber) => ({ layerNumber, contentHash: previousLayerHashes.get(layerNumber)! })),
      nativeLayer: layerNumbers.includes(0) ? { layerNumber: 0, contentHash: previousLayerHashes.get(0)! } : null
    });
    const s3Key = buildLambdaS3Key(name, 'v000001', digest);
    await mkdir(dirname(objectPath(s3Key)), { recursive: true });
    await writePreviousOwnerOnlyZip({
      sourcePath: recording.functionDirectories[name]!,
      outputPath: objectPath(s3Key)
    });
    previous[name] = { digest, s3Key, layerKeys: layerNumbers.map(previousLayerKey) };
  }

  await check(
    'split project: each function as an older CLI deployed it, with its layers, fails in Lambda',
    async () => {
      for (const name of SPLIT_FUNCTIONS) {
        const invocation = await runArchivedFunction({
          functionZip: objectPath(previous[name].s3Key),
          layerZips: previous[name].layerKeys.map(objectPath)
        });
        assert.match(invocation.body, /errorType|EACCES|permission denied/i, invocation.body);
      }
      return 'owner-only function and shared-layer ZIPs; native layer whose tool lost its execute bit';
    }
  );

  const corrected = await run('02-corrected', 'v000001');
  identities.splitProject = {
    'layer0.previousKey': previousLayerKey(0),
    'layer0.correctedKey': layerOf(corrected, 0).s3Key,
    'layer1.previousKey': previousLayerKey(1),
    'layer1.correctedKey': layerOf(corrected, 1).s3Key,
    ...Object.fromEntries(
      SPLIT_FUNCTIONS.flatMap((name) => [
        [`${name}.previousDigest`, previous[name].digest],
        [`${name}.previousKey`, previous[name].s3Key],
        [`${name}.correctedDigest`, jobOf(corrected, name).digest],
        [`${name}.correctedKey`, corrected.functions[name]!.s3Key]
      ])
    )
  };
  await check(
    'split project: the deploy code rebuilds every function and uploads new layers beside the old objects',
    async () => {
      const summary = expectDecisions(corrected, { rebuilt: [...SPLIT_FUNCTIONS], uploadedLayers: [0, 1] }, bucket);
      for (const name of SPLIT_FUNCTIONS) {
        assert.notEqual(jobOf(corrected, name).digest, previous[name].digest);
        assert.equal(
          jobOf(corrected, name).digest,
          jobOf(recording, name).digest,
          'the same build gives the same digest'
        );
        assert.ok(existsSync(objectPath(previous[name].s3Key)), 'the old object stays in the bucket');
      }
      for (const layerNumber of [0, 1]) {
        assert.notEqual(layerOf(corrected, layerNumber).s3Key, previousLayerKey(layerNumber));
      }
      return summary;
    }
  );
  await check('split project: the uploaded functions and layers run in Lambda', () => expectResponses(corrected));

  const unchanged = await run('03-unchanged', corrected.version);
  await check('split project: an unchanged deployment reuses every function and layer object', async () => {
    const summary = expectDecisions(unchanged, { rebuilt: [], uploadedLayers: [] }, bucket);
    for (const name of SPLIT_FUNCTIONS) {
      assert.deepEqual(unchanged.functions[name], corrected.functions[name]);
    }
    await expectResponses(unchanged);
    return summary;
  });

  // The native layer holds what the Docker dependency build returned; its tool's mode changes there.
  const nativeTool = join(fixture.dockerInstall, 'node_modules', NATIVE_TOOL);
  await chmod(nativeTool, 0o654);
  const groupExecutable = await run('04-native-tool-0654', unchanged.version);
  await check('split project: a native tool executable only by its group keeps its layer and functions', async () => {
    const summary = expectDecisions(groupExecutable, { rebuilt: [], uploadedLayers: [] }, bucket);
    assert.equal(layerOf(groupExecutable, 0).s3Key, layerOf(corrected, 0).s3Key);
    expectInvocation(await invokeDeployed(groupExecutable, 'native'), SPLIT_RESPONSES.native);
    return summary;
  });

  await chmod(nativeTool, 0o644);
  const toolNotExecutable = await run('05-native-tool-0644', groupExecutable.version);
  identities.splitProject['layer0.toolNotExecutableKey'] = layerOf(toolNotExecutable, 0).s3Key;
  identities.splitProject['native.toolNotExecutableDigest'] = jobOf(toolNotExecutable, 'native').digest;
  await check(
    'split project: a native tool that lost its execute bit gets a new layer and rebuilds only its user',
    async () => {
      const summary = expectDecisions(toolNotExecutable, { rebuilt: ['native'], uploadedLayers: [0] }, bucket);
      assert.notEqual(layerOf(toolNotExecutable, 0).s3Key, layerOf(corrected, 0).s3Key);
      assert.equal(layerOf(toolNotExecutable, 1).s3Key, layerOf(corrected, 1).s3Key);
      // The new layer carries what the build now returns: a tool nobody may execute.
      await expectResponses(toolNotExecutable, { native: { tool: 'failed: EACCES' } });
      return summary;
    }
  );

  await chmod(nativeTool, 0o755);
  const toolExecutableAgain = await run('06-native-tool-0755', toolNotExecutable.version);
  await check('split project: restoring the tool reuses the earlier layer and function objects', async () => {
    const summary = expectDecisions(toolExecutableAgain, { rebuilt: [], uploadedLayers: [] }, bucket);
    for (const name of SPLIT_FUNCTIONS) {
      assert.deepEqual(toolExecutableAgain.functions[name], corrected.functions[name]);
    }
    expectInvocation(await invokeDeployed(toolExecutableAgain, 'native'), SPLIT_RESPONSES.native);
    return summary;
  });

  // The Prisma engine is copied into the function that uses Prisma, keeping its executable intent.
  await chmod(fixture.prismaEngine, 0o644);
  const engineNotExecutable = await run('07-prisma-engine-0644', toolExecutableAgain.version);
  identities.splitProject['prisma.engineNotExecutableDigest'] = jobOf(engineNotExecutable, 'prisma').digest;
  await check('split project: a Prisma engine that lost its execute bit rebuilds only its function', async () => {
    const summary = expectDecisions(engineNotExecutable, { rebuilt: ['prisma'], uploadedLayers: [] }, bucket);
    expectInvocation(await invokeDeployed(engineNotExecutable, 'prisma'), {
      ...SPLIT_RESPONSES.prisma,
      engine: 'failed: EACCES'
    });
    return summary;
  });

  await chmod(fixture.prismaEngine, 0o755);
  const engineExecutableAgain = await run('08-prisma-engine-0755', engineNotExecutable.version);
  await check('split project: restoring the Prisma engine reuses the earlier function object', async () => {
    const summary = expectDecisions(engineExecutableAgain, { rebuilt: [], uploadedLayers: [] }, bucket);
    assert.deepEqual(engineExecutableAgain.functions.prisma, corrected.functions.prisma);
    expectInvocation(await invokeDeployed(engineExecutableAgain, 'prisma'), SPLIT_RESPONSES.prisma);
    return summary;
  });

  // Bundles and shared chunks carry the modes the host created them with, never an execute bit.
  const ownerOnlyHost = await run('09-umask-077', engineExecutableAgain.version, '077');
  await check('split project: a host with umask 077 reuses every object, and they still run', async () => {
    const chunkDirectory = join(layerOf(ownerOnlyHost, 1).layerPath, 'nodejs', 'chunks');
    const chunk = (await readdir(chunkDirectory)).find((name) => name.endsWith('.js'))!;
    assert.equal(await modeOf(join(ownerOnlyHost.functionDirectories.plain!, 'index.js')), '600');
    assert.equal(await modeOf(join(chunkDirectory, chunk)), '600');
    const summary = expectDecisions(ownerOnlyHost, { rebuilt: [], uploadedLayers: [] }, bucket);
    await expectResponses(ownerOnlyHost);
    return `${summary}; this build wrote its bundles and chunks as 0600`;
  });

  return [
    recording,
    corrected,
    unchanged,
    groupExecutable,
    toolNotExecutable,
    toolExecutableAgain,
    engineNotExecutable,
    engineExecutableAgain,
    ownerOnlyHost
  ].map((deployment) => ({
    label: deployment.label,
    version: deployment.version,
    decisions: SPLIT_FUNCTIONS.map((name) => `${name} ${jobOf(deployment, name).skipped ? 'reused' : 'rebuilt'}`),
    uploadedKeys: deployment.uploadedKeys,
    retentionProtectedKeys: deployment.retentionProtectedKeys,
    // Objects this deployment's template uses without having uploaded them, which retention was not told about.
    reusedButNotRetentionProtected: SPLIT_FUNCTIONS.map((name) => deployment.functions[name]!.s3Key).filter(
      (s3Key) => !deployment.uploadedKeys.includes(s3Key) && !deployment.retentionProtectedKeys.includes(s3Key)
    )
  }));
};

// ---------------------------------------------------------------------------------------------------------------------
// 4. The runtime verifier

const runtimeVerifierScenario = async (outDirectory: string) => {
  const directory = join(outDirectory, 'runtime verifier');
  // The interval keeps the runtime alive: a promise that merely never settles lets Node exit, which the emulator
  // reports at once.
  await file(
    join(directory, 'stalled', 'index.mjs'),
    'export const handler = () => new Promise(() => {\n  setInterval(() => {}, 1000);\n});\n'
  );
  // Mounted where the image has a directory, a file lets Docker create the container but not start it.
  await file(join(directory, 'function file'), 'not a directory\n');

  await check(
    'runtime verifier: an invocation that never answers fails at its deadline and leaves no container',
    async () => {
      const startedAt = Date.now();
      await assert.rejects(
        invokeInLambdaRuntime({
          functionDirectory: join(directory, 'stalled'),
          handler: 'index.handler',
          timeoutMs: 5000
        }),
        /did not answer before the deadline/
      );
      assert.deepEqual(listLeftoverContainers(), []);
      return `gave up after ${((Date.now() - startedAt) / 1000).toFixed(1)} s`;
    }
  );

  await check('runtime verifier: a container that cannot start fails and leaves no container', async () => {
    await assert.rejects(
      invokeInLambdaRuntime({ functionDirectory: join(directory, 'function file'), handler: 'index.handler' }),
      /docker run --detach failed/
    );
    assert.deepEqual(listLeftoverContainers(), []);
  });
};

// ---------------------------------------------------------------------------------------------------------------------

/** The directory holding an executable named `tool` on PATH, if any. */
const findOnPath = (tool: string) =>
  (process.env.PATH ?? '').split(delimiter).find((directory) => directory && existsSync(join(directory, tool)));

const main = async () => {
  const args = yargsParser(process.argv.slice(2), { string: ['zip-dir', '7z-dir', 'out', 'only'] });
  if (args.only !== undefined && args.only !== 'backends') throw new Error(`Unknown --only ${args.only}.`);
  const outDirectory = resolve(
    args.out ??
      join(CLI_ROOT, '.stacktape', 'lambda-archive-acceptance', new Date().toISOString().replace(/[:.]/g, '-'))
  );
  await claimOutputDirectory(outDirectory);
  const imageDigest = ensureLambdaImage();
  console.info(`Lambda image ${imageDigest}; archive format ${LAMBDA_ARCHIVE_FORMAT}; output in ${outDirectory}`);

  const tools = join(outDirectory, 'tools');
  await mkdir(join(tools, 'none'), { recursive: true });
  // A host without a ZIP tool still has Node.js; only the ZIP tools are withheld.
  const nodeDirectory = findOnPath('node');
  if (nodeDirectory) await symlink(join(nodeDirectory, 'node'), join(tools, 'none', 'node'));
  await file(
    join(tools, 'failing zip', 'zip'),
    '#!/bin/sh\nif [ "$1" = "--version" ]; then exit 0; fi\nfor argument in "$@"; do case "$argument" in *.zip) printf "PK partial output" > "$argument";; esac; done\necho "simulated zip failure" >&2\nexit 12\n',
    0o755
  );
  const zipDirectory = args['zip-dir'] ? resolve(args['zip-dir']) : findOnPath('zip');
  const sevenZipDirectory = args['7z-dir'] ? resolve(args['7z-dir']) : findOnPath('7z');
  const backends = [
    { label: 'archiver', pathDirectory: join(tools, 'none'), expectBackend: 'archiver', expectNativeFailure: null },
    ...(zipDirectory
      ? [{ label: 'zip', pathDirectory: zipDirectory, expectBackend: 'zip', expectNativeFailure: null }]
      : []),
    ...(sevenZipDirectory
      ? [{ label: '7z', pathDirectory: sevenZipDirectory, expectBackend: '7z', expectNativeFailure: null }]
      : []),
    {
      label: 'failing zip',
      pathDirectory: join(tools, 'failing zip'),
      expectBackend: 'archiver',
      expectNativeFailure: 'zip'
    }
  ];
  const unqualified = [...(zipDirectory ? [] : ['zip']), ...(sevenZipDirectory ? [] : ['7z'])];
  for (const backend of backends) {
    await checkBackend({ ...backend, outDirectory });
  }

  const splitProjectPath = zipDirectory ? [zipDirectory] : [];
  let splitProjectDeployments: Awaited<ReturnType<typeof splitProjectScenario>> = [];
  if (args.only !== 'backends') {
    // The single-artifact scenarios archive in this process, with whatever native tool its own PATH offers.
    await customArtifactScenario(outDirectory);
    await managedBuildpackScenario(outDirectory);
    await check('split project: every deployment completes', async () => {
      splitProjectDeployments = await splitProjectScenario({ outDirectory, pathDirectories: splitProjectPath });
    });
    await runtimeVerifierScenario(outDirectory);
  }

  const leftovers = listLeftoverContainers();
  await check('no acceptance container is left behind', async () => {
    assert.deepEqual(leftovers, []);
  });

  const failed = results.filter(({ ok }) => !ok);
  const report = {
    kind: 'stacktape-lambda-archive-acceptance',
    schemaVersion: 2,
    createdAt: new Date().toISOString(),
    archiveFormat: LAMBDA_ARCHIVE_FORMAT,
    lambdaImage: imageDigest,
    // Bun's source-map debug IDs, and so bundle digests, depend on the working directory of the process that bundles.
    workingDirectory: process.cwd(),
    only: args.only ?? null,
    backends: backends.map(({ label, pathDirectory }) => ({ label, pathDirectory })),
    unqualifiedBackends: unqualified,
    singleArtifactScenarioPathTools: { zip: findOnPath('zip') ?? null, '7z': findOnPath('7z') ?? null },
    splitProject: { pathDirectories: splitProjectPath, deployments: splitProjectDeployments },
    identities,
    results
  };
  await writeFile(join(outDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.info(
    `\n${results.length - failed.length} of ${results.length} checks passed.${unqualified.length ? ` Not qualified here: ${unqualified.join(', ')} (not found; pass --zip-dir or --7z-dir).` : ''}`
  );
  if (failed.length > 0) process.exitCode = 1;
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
