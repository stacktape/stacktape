/**
 * Shared-layer upload acceptance: a deployment zips only the layers its bucket does not hold yet.
 *
 * Three deployments of the split project fixture (`split-project-fixture.ts`) run through the deploy command's own
 * packaging and upload code (`deploy-artifacts-worker.ts`) into one local bucket. The fixture's shared module carries
 * an extra 12 MiB string, so shared layer 1 is large. Changing the native tool's mode changes the native-dependency
 * layer 0 alone.
 *
 * - `seed`: an empty bucket. Both layers are zipped and uploaded.
 * - `mixed`: only layer 0 changed. Its ZIP must extract with Info-ZIP `unzip` to exactly its directory, and the stored
 *   object must be that ZIP. Layer 1 must be neither zipped nor uploaded. Every layer key the template uses must be
 *   recorded (a reused key among the reused objects) and must not be among the objects retention would delete.
 * - `unchanged`: nothing is zipped or uploaded, and both keys stay protected.
 *
 * A retention sequence then runs in its own bucket with `previousVersionsToKeep: 0`, so retention keeps one version per
 * name: deploy A, deploy B (the `plain` function's code changed), then deploy A again. The third deployment reuses A's
 * stored object for `plain`, which is older than B's, and its template points at it: that object must be recorded as
 * reused and must not be among the objects retention would delete.
 *
 * The report holds the source and fixture identities, each deployment's command and output, ZIP sizes and the
 * `zip:archive` spans inside the upload.
 *
 *   pnpm --filter @stacktape/cli run test:layer-upload -- [--out <dir>]
 *
 * Needs `unzip`; contacts no AWS service and runs no Docker. `--out` must be new or empty; the fixture, bucket, builds
 * and logs stay there, and extracted trees are removed.
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, lstat, mkdir, readdir, readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import assert from 'node:assert/strict';
import yargsParser from 'yargs-parser';
import { claimOutputDirectory, createSourceTracker, describeSourceIdentity } from '../perf/measurement-context';
import type { DeployArtifactsRequest, DeployArtifactsResult } from './deploy-artifacts-worker';
import { extractZip } from './lambda-runtime';
import { NATIVE_TOOL, type SplitProjectFixture, writeSplitProjectFixture } from './split-project-fixture';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
const REPO_ROOT = resolve(CLI_ROOT, '..', '..');
const DEPLOY_WORKER = join(import.meta.dir, 'deploy-artifacts-worker.ts');
const PAYLOAD_BYTES = 12 * 1024 * 1024;

type Span = { name: string; start: number; end: number | null; detail?: Record<string, unknown> };
type Deployment = DeployArtifactsResult & { label: string; wallMs: number; layerZipSpans: Span[]; bucket: string };

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

/** Paths, kinds, modes and contents of a tree, in code-unit order, apart from the top-level entries in `skip`. */
const describeTree = async (root: string, skip: string[] = []) => {
  const entries = (await readdir(root, { recursive: true, withFileTypes: true })).filter(
    (entry) => !skip.includes(relative(root, join(entry.parentPath, entry.name)).split('/')[0]!)
  );
  const described = await Promise.all(
    entries.map(async (entry) => {
      const path = join(entry.parentPath, entry.name);
      const name = relative(root, path);
      if (entry.isSymbolicLink()) return `${name} link ${await readlink(path)}`;
      if (entry.isDirectory()) return `${name} directory`;
      const mode = ((await lstat(path)).mode & 0o777).toString(8);
      return `${name} file ${mode} ${sha256(await readFile(path))}`;
    })
  );
  return described.toSorted((left, right) => (left < right ? -1 : left > right ? 1 : 0));
};

/** SHA-256 over a tree's description. */
const hashTree = async (root: string, skip: string[] = []) => sha256((await describeTree(root, skip)).join('\n'));

const treeBytes = async (root: string) => {
  let bytes = 0;
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) bytes += (await lstat(join(entry.parentPath, entry.name))).size;
  }
  return bytes;
};

/** A deterministic, poorly compressible string, so the large layer costs what a real large layer costs to zip. */
const payload = (bytes: number) => {
  const blocks: Buffer[] = [];
  for (let index = 0; blocks.length * 32 < (bytes * 3) / 4; index++) {
    blocks.push(createHash('sha256').update(`layer-upload-acceptance ${index}`).digest());
  }
  return Buffer.concat(blocks).toString('base64').slice(0, bytes);
};

/** Makes the shared module, and so shared layer 1, large. Every function still uses it. */
const enlargeSharedModule = async (fixture: SplitProjectFixture) => {
  const path = join(fixture.project, 'src', 'shared', 'catalog.ts');
  const source = await readFile(path, 'utf8');
  const original = "export const catalogSize = () => CATALOG.join('').length;";
  assert.ok(source.includes(original), 'the fixture shared module changed shape');
  await writeFile(
    path,
    source.replace(
      original,
      `const PAYLOAD = '${payload(PAYLOAD_BYTES)}';\n\nexport const catalogSize = () => CATALOG.join('').length + PAYLOAD.length;`
    )
  );
};

/** One deployment in its own process, into `bucket`, with the CLI's timing spans. */
const deploy = async ({
  fixture,
  bucket,
  directory,
  label,
  lastVersion,
  previousVersionsToKeep
}: {
  fixture: SplitProjectFixture;
  bucket: string;
  directory: string;
  label: string;
  lastVersion: string;
  previousVersionsToKeep?: number;
}): Promise<Deployment> => {
  const deploymentDirectory = join(directory, label);
  await mkdir(deploymentDirectory, { recursive: true });
  const request: DeployArtifactsRequest = {
    bucketDirectory: bucket,
    lastVersion,
    resultPath: join(deploymentDirectory, 'result.json'),
    ...(previousVersionsToKeep === undefined ? {} : { previousVersionsToKeep })
  };
  const requestPath = join(deploymentDirectory, 'request.json');
  await writeFile(requestPath, `${JSON.stringify(request, null, 2)}\n`);
  const timingsPath = join(deploymentDirectory, 'timings.json');
  const started = performance.now();
  const child = Bun.spawnSync(
    [process.execPath, '--preload', join(CLI_ROOT, 'scripts', 'test-preload.ts'), DEPLOY_WORKER, requestPath],
    {
      cwd: fixture.project,
      env: {
        HOME: process.env.HOME ?? '',
        PATH: fixture.dockerDirectory,
        STP_FAKE_DOCKER_INSTALL: fixture.dockerInstall,
        STP_FAKE_DOCKER_LOG: join(deploymentDirectory, 'docker.log'),
        STP_INVOCATION_ID: label,
        STP_TIMINGS_FILE: timingsPath
      },
      stdout: 'pipe',
      stderr: 'pipe'
    }
  );
  const wallMs = Math.round((performance.now() - started) * 10) / 10;
  await writeFile(join(deploymentDirectory, 'output.log'), `${child.stdout.toString()}${child.stderr.toString()}`);
  if (child.exitCode !== 0) {
    throw new Error(`Deployment ${label} failed (${child.exitCode}): ${child.stderr.toString() || child.stdout}`);
  }
  const result = JSON.parse(await readFile(request.resultPath, 'utf8')) as DeployArtifactsResult;
  const spans = (JSON.parse(await readFile(timingsPath, 'utf8')) as { spans: Span[] }).spans;
  const layerZipSpans = spans.filter(
    ({ name, start }) => name === 'zip:archive' && start >= result.upload.startMs && start <= result.upload.endMs
  );
  return { ...result, label, wallMs, layerZipSpans, bucket };
};

const layerOf = (deployment: Deployment, layerNumber: number) => {
  const layer = deployment.layers.find((candidate) => candidate.layerNumber === layerNumber);
  assert.ok(layer, `${deployment.label} built no layer ${layerNumber}`);
  return layer;
};

/** A layer as this deployment left it: its ZIP, whether it was uploaded, and how retention treats its key. */
const describeLayer = async (deployment: Deployment, layerNumber: number, bucket: string) => {
  const layer = layerOf(deployment, layerNumber);
  const zipPath = `${layer.layerPath}.zip`;
  const zip = existsSync(zipPath) ? await readFile(zipPath) : null;
  return {
    layerNumber,
    s3Key: layer.s3Key,
    directoryBytes: await treeBytes(layer.layerPath),
    zipBytes: zip?.length ?? null,
    zipSha256: zip ? sha256(zip) : null,
    storedSha256: existsSync(join(bucket, layer.s3Key)) ? sha256(await readFile(join(bucket, layer.s3Key))) : null,
    uploaded: deployment.uploadedKeys.includes(layer.s3Key),
    recordedAsReused: deployment.retentionProtectedKeys.includes(layer.s3Key),
    selectedForDeletion: deployment.obsoleteKeys.includes(layer.s3Key),
    usedByTemplate: Object.values(deployment.functions).some(({ layerKeys }) => layerKeys.includes(layer.s3Key))
  };
};

/** The layer's ZIP holds exactly its directory, and the bucket stores exactly that ZIP. */
const expectZippedAndStored = async (deployment: Deployment, layerNumber: number, bucket: string) => {
  const layer = layerOf(deployment, layerNumber);
  const described = await describeLayer(deployment, layerNumber, bucket);
  assert.ok(described.zipSha256, `${deployment.label}: layer ${layerNumber} was not zipped`);
  assert.ok(described.uploaded, `${deployment.label}: layer ${layerNumber} was not uploaded`);
  assert.equal(described.storedSha256, described.zipSha256, `${deployment.label}: the stored layer ${layerNumber}`);
  const extracted = await extractZip(`${layer.layerPath}.zip`);
  try {
    assert.deepEqual(await describeTree(extracted), await describeTree(layer.layerPath));
  } finally {
    await rm(extracted, { recursive: true, force: true });
  }
};

const expectCachedNotZipped = async (deployment: Deployment, layerNumber: number, bucket: string) => {
  const described = await describeLayer(deployment, layerNumber, bucket);
  assert.equal(described.zipSha256, null, `${deployment.label}: the cached layer ${layerNumber} was zipped`);
  assert.equal(described.uploaded, false, `${deployment.label}: the cached layer ${layerNumber} was uploaded`);
  assert.ok(described.recordedAsReused, `${deployment.label}: layer ${layerNumber} is not recorded as reused`);
  assert.ok(described.storedSha256, `${deployment.label}: layer ${layerNumber} is not in the bucket`);
};

/** Every layer key the template uses is one this deployment built, and retention would delete none of them. */
const expectTemplateKeysProtected = (deployment: Deployment) => {
  const layerKeys = new Set(deployment.layers.map(({ s3Key }) => s3Key));
  const referenced = new Set(Object.values(deployment.functions).flatMap(({ layerKeys: keys }) => keys));
  assert.deepEqual([...referenced].toSorted(), [...layerKeys].toSorted(), `${deployment.label}: template layer keys`);
  for (const key of referenced) {
    assert.ok(!deployment.obsoleteKeys.includes(key), `${deployment.label}: retention would delete ${key}`);
    assert.ok(
      deployment.uploadedKeys.includes(key) || deployment.retentionProtectedKeys.includes(key),
      `${deployment.label}: ${key} is neither uploaded nor recorded as reused`
    );
  }
};

const results: { check: string; ok: boolean; detail?: string }[] = [];

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

const main = async () => {
  const args = yargsParser(process.argv.slice(2), { string: ['out'] });
  const outDirectory = resolve(
    args.out ?? join(CLI_ROOT, '.stacktape', 'layer-upload-acceptance', new Date().toISOString().replace(/[:.]/g, '-'))
  );
  await claimOutputDirectory(outDirectory);
  const source = createSourceTracker({
    repoRoot: REPO_ROOT,
    scopes: ['apps/cli', 'packages/packaging'],
    excludePaths: [relative(REPO_ROOT, outDirectory)]
  });
  console.info(`Source ${describeSourceIdentity(source.before)}; output in ${outDirectory}`);

  const fixture = await writeSplitProjectFixture(join(outDirectory, 'fixture'));
  await enlargeSharedModule(fixture);
  const bucket = join(outDirectory, 'bucket');
  await mkdir(bucket, { recursive: true });
  const deploymentsDirectory = join(outDirectory, 'deployments');
  const fixtureIdentities: Record<string, { project: string; dockerInstall: string }> = {};
  const deployments: Deployment[] = [];
  const run = async (
    label: string,
    lastVersion: string,
    {
      bucketDirectory = bucket,
      previousVersionsToKeep
    }: { bucketDirectory?: string; previousVersionsToKeep?: number } = {}
  ) => {
    fixtureIdentities[label] = {
      // The deployments' own output under `.stacktape` is not an input.
      project: await hashTree(fixture.project, ['.stacktape']),
      dockerInstall: await hashTree(fixture.dockerInstall)
    };
    const deployment = await deploy({
      fixture,
      bucket: bucketDirectory,
      directory: deploymentsDirectory,
      label,
      lastVersion,
      previousVersionsToKeep
    });
    deployments.push(deployment);
    return deployment;
  };
  const summary = async (deployment: Deployment) =>
    (await Promise.all([0, 1].map((layerNumber) => describeLayer(deployment, layerNumber, bucket))))
      .map(
        ({ layerNumber, zipBytes, uploaded }) =>
          `layer ${layerNumber} ${zipBytes === null ? 'not zipped' : `zipped (${zipBytes} bytes)`}, ${uploaded ? 'uploaded' : 'reused'}`
      )
      .join('; ');

  const seed = await run('01-seed', 'v000000');
  await check('seed: every layer is zipped, uploaded and stored as its directory', async () => {
    await expectZippedAndStored(seed, 0, bucket);
    await expectZippedAndStored(seed, 1, bucket);
    expectTemplateKeysProtected(seed);
    return summary(seed);
  });

  // The existing way to change the native-dependency layer alone: its tool loses the execute bit.
  await chmod(join(fixture.dockerInstall, 'node_modules', NATIVE_TOOL), 0o644);
  const mixed = await run('02-mixed', seed.version);
  await check('mixed: only the changed layer is zipped and uploaded, the large cached layer is not', async () => {
    assert.notEqual(layerOf(mixed, 0).s3Key, layerOf(seed, 0).s3Key, 'layer 0 did not change');
    assert.equal(layerOf(mixed, 1).s3Key, layerOf(seed, 1).s3Key, 'layer 1 changed');
    await expectZippedAndStored(mixed, 0, bucket);
    await expectCachedNotZipped(mixed, 1, bucket);
    expectTemplateKeysProtected(mixed);
    assert.equal(mixed.layerZipSpans.length, 1, `${mixed.layerZipSpans.length} archives during the upload`);
    return summary(mixed);
  });

  const unchanged = await run('03-unchanged', mixed.version);
  await check('unchanged: nothing is zipped or uploaded and both layer keys stay protected', async () => {
    for (const layerNumber of [0, 1]) {
      assert.equal(layerOf(unchanged, layerNumber).s3Key, layerOf(mixed, layerNumber).s3Key);
      await expectCachedNotZipped(unchanged, layerNumber, bucket);
    }
    expectTemplateKeysProtected(unchanged);
    assert.equal(unchanged.layerZipSpans.length, 0, `${unchanged.layerZipSpans.length} archives during the upload`);
    return summary(unchanged);
  });

  // Retention: a function reverted to an earlier build reuses that build's older object.
  const retentionBucket = join(outDirectory, 'retention-bucket');
  await mkdir(retentionBucket, { recursive: true });
  const retention = { bucketDirectory: retentionBucket, previousVersionsToKeep: 0 };
  const plainHandler = join(fixture.project, 'src', 'handlers', 'plain.ts');
  const plainSource = await readFile(plainHandler, 'utf8');
  assert.ok(plainSource.includes("function: 'plain'"), 'the fixture plain handler changed shape');
  const buildA = await run('04-retention-a', 'v000000', retention);
  await writeFile(plainHandler, plainSource.replace("function: 'plain'", "function: 'plain-b'"));
  const buildB = await run('05-retention-b', buildA.version, retention);
  await writeFile(plainHandler, plainSource);
  const buildAAgain = await run('06-retention-a-again', buildB.version, retention);
  await check('retention: a reverted function keeps the older object its template uses', async () => {
    const keyA = buildA.functions.plain?.s3Key;
    const keyB = buildB.functions.plain?.s3Key;
    assert.ok(keyA && keyB && keyA !== keyB, 'B did not build a new object for plain');
    assert.ok(buildB.uploadedKeys.includes(keyB), 'B did not upload its plain object');
    assert.equal(buildAAgain.functions.plain?.s3Key, keyA, "the reverted deployment does not use A's object");
    assert.ok(
      buildAAgain.jobs.some(({ jobName, skipped }) => jobName === 'plain' && skipped),
      'plain was rebuilt instead of reused'
    );
    assert.ok(existsSync(join(retentionBucket, keyA)), "A's object is not in the bucket");
    assert.ok(!buildAAgain.obsoleteKeys.includes(keyA), `retention would delete ${keyA}, which the template uses`);
    assert.ok(buildAAgain.retentionProtectedKeys.includes(keyA), `${keyA} is not recorded as reused`);
    return `plain uses ${keyA} again; B's ${keyB} ${buildAAgain.obsoleteKeys.includes(keyB) ? 'expires' : 'stays in the window'}`;
  });

  const sourceCheck = source.check();
  await check('the source did not change during the run', async () => {
    assert.equal(sourceCheck, 'unchanged');
  });

  const report = {
    kind: 'stacktape-layer-upload-acceptance',
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    source: { before: source.before, after: source.after, check: sourceCheck },
    worker: [process.execPath, '--preload', 'scripts/test-preload.ts', relative(CLI_ROOT, DEPLOY_WORKER)],
    payloadBytes: PAYLOAD_BYTES,
    fixtureIdentities,
    deployments: await Promise.all(
      deployments.map(async (deployment) => ({
        label: deployment.label,
        version: deployment.version,
        wallMs: deployment.wallMs,
        uploadMs: Math.round((deployment.upload.endMs - deployment.upload.startMs) * 10) / 10,
        layerZipSpans: deployment.layerZipSpans.map(({ start, end, detail }) => ({
          durationMs: end === null ? null : Math.round((end - start) * 10) / 10,
          detail
        })),
        layers: await Promise.all(
          [0, 1].map((layerNumber) => describeLayer(deployment, layerNumber, deployment.bucket))
        ),
        functions: deployment.functions,
        uploadedKeys: deployment.uploadedKeys,
        retentionProtectedKeys: deployment.retentionProtectedKeys,
        obsoleteKeys: deployment.obsoleteKeys
      }))
    ),
    results
  };
  await writeFile(join(outDirectory, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  const failed = results.filter(({ ok }) => !ok);
  console.info(`\n${results.length - failed.length} of ${results.length} checks passed.`);
  if (failed.length > 0) process.exitCode = 1;
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
