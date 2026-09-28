/**
 * Opt-in local AWS integration pilot for artifact uploads. The existing layer-upload acceptance covers packaging,
 * cache and retention in more depth; this lane checks the same deploy path through real S3 SDK requests.
 *
 * Run with `pnpm --filter @stacktape/cli run test:layer-upload:ministack` with Docker available.
 * The script owns a disposable MiniStack container on a loopback port, uses dummy credentials, and stops it in finally.
 * It writes a source-bound report and leaves the fixture and logs in an ignored output directory.
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { CreateBucketCommand, GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import yargsParser from 'yargs-parser';
import { claimOutputDirectory, createSourceTracker, describeSourceIdentity } from '../perf/measurement-context';
import type { DeployArtifactsRequest, DeployArtifactsResult } from './deploy-artifacts-worker';
import { NATIVE_TOOL, writeSplitProjectFixture } from './split-project-fixture';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
const REPO_ROOT = resolve(CLI_ROOT, '..', '..');
const WORKER = join(import.meta.dir, 'deploy-artifacts-worker.ts');
const IMAGE = 'ministackorg/ministack:1.5.17@sha256:11d7308bfc75029d55625b9525e84a2401431ed1ff2148c6311800ff5009ae9c';
const REGION = 'eu-west-1';
const BUCKET = awsResourceNames.deploymentBucket('acceptx1');
const sha256 = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');

const docker = (args: string[]) =>
  Bun.spawnSync(['docker', ...args], { stdout: 'pipe', stderr: 'pipe', timeout: 120_000 });

const waitForHealth = async (endpoint: string, container: string) => {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const state = docker(['inspect', '--format', '{{.State.Running}}', container]);
    if (state.exitCode !== 0 || state.stdout.toString().trim() !== 'true') {
      throw new Error('MiniStack exited before becoming ready');
    }
    try {
      const response = await fetch(`${endpoint}/_ministack/health`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return;
    } catch {
      // The listener is still starting.
    }
    await delay(100);
  }
  throw new Error('MiniStack did not become healthy within 30 seconds');
};

const main = async () => {
  const args = yargsParser(process.argv.slice(2), { string: ['out'] });
  const out = resolve(
    args.out ?? join(CLI_ROOT, '.stacktape', 'layer-upload-ministack', new Date().toISOString().replace(/[:.]/g, '-'))
  );
  await claimOutputDirectory(out);
  const source = createSourceTracker({
    repoRoot: REPO_ROOT,
    scopes: ['apps/cli', 'packages/packaging'],
    excludePaths: [out]
  });
  assert.ok(source.before.available, `Cannot identify source: ${source.before.reason}`);
  const container = `stacktape-ministack-upload-${randomUUID().slice(0, 12)}`;
  const report: Record<string, unknown> = {
    sourceBefore: source.before,
    image: IMAGE,
    region: REGION,
    bucket: BUCKET,
    scenarios: [],
    cleanup: 'pending'
  };
  const scenarios = report.scenarios as Array<Record<string, unknown>>;
  let failure: unknown;
  let started = false;
  try {
    const run = docker(['run', '--detach', '--rm', '--name', container, '--publish', '127.0.0.1::4566', IMAGE]);
    assert.equal(run.exitCode, 0, `MiniStack container failed to start: ${run.stderr.toString()}`);
    started = true;
    const portResult = docker(['port', container, '4566/tcp']);
    assert.equal(portResult.exitCode, 0, portResult.stderr.toString());
    const port = portResult.stdout.toString().match(/127\.0\.0\.1:(\d+)/)?.[1];
    assert.ok(port, 'MiniStack did not publish a loopback port');
    const endpoint = `http://127.0.0.1:${port}`;
    report.endpoint = endpoint;
    const image = docker(['image', 'inspect', IMAGE, '--format', '{{.Id}}']);
    assert.equal(image.exitCode, 0, image.stderr.toString());
    report.imageId = image.stdout.toString().trim();
    await waitForHealth(endpoint, container);
    const client = new S3Client({
      endpoint,
      region: REGION,
      forcePathStyle: true,
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' }
    });
    try {
      await client.send(
        new CreateBucketCommand({ Bucket: BUCKET, CreateBucketConfiguration: { LocationConstraint: REGION } })
      );
      const fixture = await writeSplitProjectFixture(join(out, 'fixture'));
      const rejectedRequest: DeployArtifactsRequest = {
        localAwsEndpoint: 'https://s3.amazonaws.com',
        lastVersion: 'v000000',
        resultPath: join(out, '00-nonlocal-endpoint.result.json')
      };
      const rejectedRequestPath = join(out, '00-nonlocal-endpoint.request.json');
      await writeFile(rejectedRequestPath, `${JSON.stringify(rejectedRequest, null, 2)}\n`);
      const rejectedCommand = [
        process.execPath,
        '--preload',
        join(CLI_ROOT, 'scripts', 'test-preload.ts'),
        WORKER,
        rejectedRequestPath
      ];
      const rejected = Bun.spawnSync(rejectedCommand, {
        cwd: fixture.project,
        env: { HOME: process.env.HOME ?? '', PATH: fixture.dockerDirectory, AWS_EC2_METADATA_DISABLED: 'true' },
        stdout: 'pipe',
        stderr: 'pipe'
      });
      const rejectionOutput = `${rejected.stdout.toString()}${rejected.stderr.toString()}`;
      await writeFile(join(out, '00-nonlocal-endpoint.output.log'), rejectionOutput);
      scenarios.push({ label: '00-nonlocal-endpoint', command: rejectedCommand, exitCode: rejected.exitCode });
      assert.notEqual(rejected.exitCode, 0, 'The worker accepted a non-local AWS endpoint');
      assert.match(rejectionOutput, /The local AWS endpoint must use 127\.0\.0\.1 and an explicit port/);
      scenarios.at(-1)!.assertions = { nonLocalEndpointRejected: true };

      const listKeys = async () =>
        (await client.send(new ListObjectsV2Command({ Bucket: BUCKET }))).Contents?.flatMap(({ Key }) =>
          Key ? [Key] : []
        ).toSorted() ?? [];
      const storedHash = async (key: string) => {
        const body = (await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))).Body;
        assert.ok(body, `S3 returned no body for ${key}`);
        return sha256(await body.transformToByteArray());
      };
      const run = async (label: string, lastVersion: string) => {
        const request: DeployArtifactsRequest = {
          localAwsEndpoint: endpoint,
          lastVersion,
          resultPath: join(out, `${label}.result.json`)
        };
        const requestPath = join(out, `${label}.request.json`);
        await writeFile(requestPath, `${JSON.stringify(request, null, 2)}\n`);
        const command = [
          process.execPath,
          '--preload',
          join(CLI_ROOT, 'scripts', 'test-preload.ts'),
          WORKER,
          requestPath
        ];
        const started = performance.now();
        const result = Bun.spawnSync(command, {
          cwd: fixture.project,
          env: {
            HOME: process.env.HOME ?? '',
            PATH: fixture.dockerDirectory,
            STP_FAKE_DOCKER_INSTALL: fixture.dockerInstall,
            STP_FAKE_DOCKER_LOG: join(out, `${label}.docker.log`),
            STP_INVOCATION_ID: label,
            AWS_EC2_METADATA_DISABLED: 'true'
          },
          stdout: 'pipe',
          stderr: 'pipe'
        });
        await writeFile(join(out, `${label}.output.log`), `${result.stdout.toString()}${result.stderr.toString()}`);
        scenarios.push({
          label,
          command,
          exitCode: result.exitCode,
          elapsedMs: Math.round(performance.now() - started)
        });
        assert.equal(result.exitCode, 0, `${label} failed; see ${label}.output.log`);
        return JSON.parse(await readFile(request.resultPath, 'utf8')) as DeployArtifactsResult;
      };
      const layer = (deployment: DeployArtifactsResult, number: number) => {
        const value = deployment.layers.find(({ layerNumber }) => layerNumber === number);
        assert.ok(value, `No layer ${number}`);
        return value;
      };
      const assertStoredZip = async (deployment: DeployArtifactsResult, number: number) => {
        const { layerPath, s3Key } = layer(deployment, number);
        const archiveHash = sha256(await readFile(`${layerPath}.zip`));
        assert.equal(await storedHash(s3Key), archiveHash, `S3 stored the wrong ZIP for ${s3Key}`);
      };
      const assertTemplateProtected = async (deployment: DeployArtifactsResult) => {
        const keys = Object.values(deployment.functions).flatMap(({ layerKeys }) => layerKeys);
        for (const key of keys) {
          assert.ok(!deployment.obsoleteKeys.includes(key), `Retention selected active layer ${key}`);
          assert.ok(
            deployment.uploadedKeys.includes(key) || deployment.retentionProtectedKeys.includes(key),
            `Template layer ${key} is neither uploaded nor reused`
          );
          await storedHash(key);
        }
      };

      const seed = await run('01-seed', 'v000000');
      for (const number of [0, 1]) {
        assert.ok(seed.uploadedKeys.includes(layer(seed, number).s3Key));
        await assertStoredZip(seed, number);
      }
      await assertTemplateProtected(seed);
      const seedKeys = await listKeys();
      scenarios.at(-1)!.assertions = { layersUploaded: 2, storedObjects: seedKeys.length, storedBytesMatch: true };

      await chmod(join(fixture.dockerInstall, 'node_modules', NATIVE_TOOL), 0o644);
      const mixed = await run('02-mixed', seed.version);
      assert.notEqual(layer(mixed, 0).s3Key, layer(seed, 0).s3Key, 'Native layer key did not change');
      assert.equal(layer(mixed, 1).s3Key, layer(seed, 1).s3Key, 'Shared layer key changed');
      assert.ok(mixed.uploadedKeys.includes(layer(mixed, 0).s3Key));
      assert.ok(!mixed.uploadedKeys.includes(layer(mixed, 1).s3Key));
      await assertStoredZip(mixed, 0);
      assert.equal(await storedHash(layer(mixed, 1).s3Key), await storedHash(layer(seed, 1).s3Key));
      await assertTemplateProtected(mixed);
      const mixedKeys = await listKeys();
      assert.ok(mixedKeys.length > seedKeys.length, 'Changed layer added no S3 object');
      scenarios.at(-1)!.assertions = {
        changedLayerUploaded: true,
        sharedLayerReused: true,
        storedObjects: mixedKeys.length
      };

      const unchanged = await run('03-unchanged', mixed.version);
      assert.deepEqual(
        unchanged.uploadedKeys.toSorted(),
        [`cf-template/${unchanged.version}.yml`, `stp-template/${unchanged.version}.yml`],
        'Unchanged deployment uploaded an artifact other than its templates'
      );
      assert.deepEqual(await listKeys(), [...mixedKeys, ...unchanged.uploadedKeys].toSorted());
      await assertTemplateProtected(unchanged);
      scenarios.at(-1)!.assertions = {
        noArtifactUploads: true,
        templatesUploaded: 2,
        storedObjects: mixedKeys.length + 2,
        activeKeysPreserved: true
      };
    } finally {
      client.destroy();
    }
  } catch (error) {
    failure = error;
    report.failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
  } finally {
    if (started) {
      const logs = docker(['logs', container]);
      await writeFile(join(out, 'ministack.log'), `${logs.stdout.toString()}${logs.stderr.toString()}`);
      const stop = docker(['rm', '--force', container]);
      const inspect = docker(['inspect', container]);
      report.cleanup =
        stop.exitCode === 0 && inspect.exitCode !== 0
          ? 'MiniStack container removed; in-memory AWS state discarded'
          : `MiniStack cleanup failed: ${stop.stderr.toString()} ${inspect.stdout.toString()}`;
      if (stop.exitCode !== 0 || inspect.exitCode === 0) failure ??= new Error(String(report.cleanup));
    } else {
      report.cleanup = 'No container started';
    }
    report.sourceCheck = source.check();
    report.sourceAfter = source.after;
    await writeFile(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
  assert.equal(report.sourceCheck, 'unchanged', 'Source changed during the acceptance');
  if (failure) throw failure;
  console.info(`MiniStack layer upload passed against ${IMAGE}; ${describeSourceIdentity(source.before)}`);
  console.info(`Evidence: ${join(out, 'report.json')}`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
