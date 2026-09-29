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
import { NATIVE_TOOL, type SplitProjectFixture, writeSplitProjectFixture } from './split-project-fixture';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
const REPO_ROOT = resolve(CLI_ROOT, '..', '..');
const WORKER = join(import.meta.dir, 'deploy-artifacts-worker.ts');
const IMAGE = 'ministackorg/ministack:1.5.17@sha256:11d7308bfc75029d55625b9525e84a2401431ed1ff2148c6311800ff5009ae9c';
const REGION = 'eu-west-1';
const BUCKET = awsResourceNames.deploymentBucket('acceptx1');
const RETENTION_HASH = 'retentx1';
const RETENTION_BUCKET = awsResourceNames.deploymentBucket(RETENTION_HASH);
const FAILURE_HASH = 'failurx1';
const FAILURE_BUCKET = awsResourceNames.deploymentBucket(FAILURE_HASH);
const MISSING_BUCKET = awsResourceNames.deploymentBucket('missingx1');
const WORKER_TIMEOUT_MS = 120_000;
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
    retentionBucket: RETENTION_BUCKET,
    failureBucket: FAILURE_BUCKET,
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
      await client.send(
        new CreateBucketCommand({ Bucket: RETENTION_BUCKET, CreateBucketConfiguration: { LocationConstraint: REGION } })
      );
      await client.send(
        new CreateBucketCommand({ Bucket: FAILURE_BUCKET, CreateBucketConfiguration: { LocationConstraint: REGION } })
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
        stderr: 'pipe',
        timeout: WORKER_TIMEOUT_MS
      });
      const rejectionOutput = `${rejected.stdout.toString()}${rejected.stderr.toString()}`;
      await writeFile(join(out, '00-nonlocal-endpoint.output.log'), rejectionOutput);
      scenarios.push({ label: '00-nonlocal-endpoint', command: rejectedCommand, exitCode: rejected.exitCode });
      assert.notEqual(rejected.exitCode, 0, 'The worker accepted a non-local AWS endpoint');
      assert.match(rejectionOutput, /The local AWS endpoint must use 127\.0\.0\.1 and an explicit port/);
      scenarios.at(-1)!.assertions = { nonLocalEndpointRejected: true };

      const listKeys = async (bucket = BUCKET) =>
        (await client.send(new ListObjectsV2Command({ Bucket: bucket }))).Contents?.flatMap(({ Key }) =>
          Key ? [Key] : []
        ).toSorted() ?? [];
      const storedHash = async (key: string, bucket = BUCKET) => {
        const body = (await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))).Body;
        assert.ok(body, `S3 returned no body for ${key}`);
        return sha256(await body.transformToByteArray());
      };
      const run = async (
        label: string,
        lastVersion: string,
        {
          projectFixture = fixture,
          stackHash,
          previousVersionsToKeep,
          deleteObsoleteArtifacts
        }: {
          projectFixture?: SplitProjectFixture;
          stackHash?: string;
          previousVersionsToKeep?: number;
          deleteObsoleteArtifacts?: boolean;
        } = {}
      ) => {
        const request: DeployArtifactsRequest = {
          localAwsEndpoint: endpoint,
          lastVersion,
          resultPath: join(out, `${label}.result.json`),
          ...(stackHash ? { stackHash } : {}),
          ...(previousVersionsToKeep === undefined ? {} : { previousVersionsToKeep }),
          ...(deleteObsoleteArtifacts ? { deleteObsoleteArtifacts } : {})
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
          cwd: projectFixture.project,
          env: {
            HOME: process.env.HOME ?? '',
            PATH: projectFixture.dockerDirectory,
            STP_FAKE_DOCKER_INSTALL: projectFixture.dockerInstall,
            STP_FAKE_DOCKER_LOG: join(out, `${label}.docker.log`),
            STP_INVOCATION_ID: label,
            AWS_EC2_METADATA_DISABLED: 'true'
          },
          stdout: 'pipe',
          stderr: 'pipe',
          timeout: WORKER_TIMEOUT_MS
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
      const assertStoredZip = async (deployment: DeployArtifactsResult, number: number, bucket = BUCKET) => {
        const { layerPath, s3Key } = layer(deployment, number);
        const archiveHash = sha256(await readFile(`${layerPath}.zip`));
        assert.equal(await storedHash(s3Key, bucket), archiveHash, `S3 stored the wrong ZIP for ${s3Key}`);
      };
      const assertStoredFunctionZips = async (deployment: DeployArtifactsResult, bucket = BUCKET) => {
        for (const { jobName, digest, skipped } of deployment.jobs) {
          if (skipped) continue;
          const key = deployment.functions[jobName]?.s3Key;
          const directory = deployment.functionDirectories[jobName];
          assert.ok(key && directory, `No generated ZIP or template key for ${jobName}`);
          assert.equal(
            await storedHash(key, bucket),
            sha256(await readFile(`${directory}-${digest}.zip`)),
            `S3 stored the wrong function ZIP for ${key}`
          );
        }
      };
      const assertTemplateProtected = async (deployment: DeployArtifactsResult, bucket = BUCKET) => {
        const keys = new Set(
          Object.values(deployment.functions).flatMap(({ s3Key, layerKeys }) => [s3Key, ...layerKeys])
        );
        for (const key of keys) {
          assert.ok(!deployment.obsoleteKeys.includes(key), `Retention selected a template artifact ${key}`);
          assert.ok(
            deployment.uploadedKeys.includes(key) || deployment.retentionProtectedKeys.includes(key),
            `Template artifact ${key} is neither uploaded nor reused`
          );
          await storedHash(key, bucket);
        }
      };

      const seed = await run('01-seed', 'v000000');
      for (const number of [0, 1]) {
        assert.ok(seed.uploadedKeys.includes(layer(seed, number).s3Key));
        await assertStoredZip(seed, number);
      }
      await assertStoredFunctionZips(seed);
      await assertTemplateProtected(seed);
      const seedKeys = await listKeys();
      scenarios.at(-1)!.assertions = {
        layersUploaded: 2,
        storedObjects: seedKeys.length,
        layerAndFunctionBytesMatch: true
      };

      await chmod(join(fixture.dockerInstall, 'node_modules', NATIVE_TOOL), 0o644);
      const mixed = await run('02-mixed', seed.version);
      assert.notEqual(layer(mixed, 0).s3Key, layer(seed, 0).s3Key, 'Native layer key did not change');
      assert.equal(layer(mixed, 1).s3Key, layer(seed, 1).s3Key, 'Shared layer key changed');
      assert.ok(mixed.uploadedKeys.includes(layer(mixed, 0).s3Key));
      assert.ok(!mixed.uploadedKeys.includes(layer(mixed, 1).s3Key));
      await assertStoredZip(mixed, 0);
      await assertStoredFunctionZips(mixed);
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

      // A separate fixture and bucket keep the retention proof independent of the changed-layer scenario.
      const retentionFixture = await writeSplitProjectFixture(join(out, 'retention-fixture'));
      const retentionOptions = {
        projectFixture: retentionFixture,
        stackHash: RETENTION_HASH,
        previousVersionsToKeep: 0
      };
      const plainHandler = join(retentionFixture.project, 'src', 'handlers', 'plain.ts');
      const plainSource = await readFile(plainHandler, 'utf8');
      assert.ok(plainSource.includes("function: 'plain'"), 'The plain handler fixture changed shape');
      const buildA = await run('04-retention-a', 'v000000', retentionOptions);
      await assertStoredFunctionZips(buildA, RETENTION_BUCKET);
      await writeFile(plainHandler, plainSource.replace("function: 'plain'", "function: 'plain-b'"));
      const buildB = await run('05-retention-b', buildA.version, retentionOptions);
      await assertStoredFunctionZips(buildB, RETENTION_BUCKET);
      await writeFile(plainHandler, plainSource);
      const keyA = buildA.functions.plain?.s3Key;
      const keyB = buildB.functions.plain?.s3Key;
      assert.ok(keyA && keyB && keyA !== keyB, 'B did not produce a different plain function ZIP');
      assert.ok(buildB.uploadedKeys.includes(keyB), 'B did not upload its changed plain function');
      const aHash = await storedHash(keyA, RETENTION_BUCKET);
      const buildAAgain = await run('06-retention-a-again', buildB.version, {
        ...retentionOptions,
        deleteObsoleteArtifacts: true
      });
      assert.equal(buildAAgain.functions.plain?.s3Key, keyA, 'The reverted template does not reference A');
      assert.ok(
        buildAAgain.jobs.some(({ jobName, skipped }) => jobName === 'plain' && skipped),
        'A was rebuilt'
      );
      assert.ok(!buildAAgain.uploadedKeys.includes(keyA), 'A was re-uploaded');
      assert.ok(buildAAgain.retentionProtectedKeys.includes(keyA), 'A was not recorded as reused');
      assert.ok(!buildAAgain.obsoleteKeys.includes(keyA), 'Retention selected referenced A for deletion');
      await assertTemplateProtected(buildAAgain, RETENTION_BUCKET);
      const retainedKeys = await listKeys(RETENTION_BUCKET);
      assert.ok(retainedKeys.includes(keyA), 'Retention removed the object named by the current template');
      assert.equal(await storedHash(keyA, RETENTION_BUCKET), aHash, 'The reused A object changed');
      assert.ok(
        !retainedKeys.includes(`cf-template/${buildA.version}.yml`),
        'Retention did not delete an old template'
      );
      scenarios.at(-1)!.assertions = {
        revertedFunctionReused: true,
        referencedObjectSurvivedDeletion: true,
        oldTemplateDeleted: true,
        storedObjects: retainedKeys.length
      };

      const failureFixture = await writeSplitProjectFixture(join(out, 'failure-fixture'));
      const failedRequest: DeployArtifactsRequest = {
        localAwsEndpoint: endpoint,
        stackHash: FAILURE_HASH,
        failLayerUploadToBucket: MISSING_BUCKET,
        lastVersion: 'v000000',
        resultPath: join(out, '07-failed-layer-upload.result.json')
      };
      const failedRequestPath = join(out, '07-failed-layer-upload.request.json');
      await writeFile(failedRequestPath, `${JSON.stringify(failedRequest, null, 2)}\n`);
      const failedCommand = [
        process.execPath,
        '--preload',
        join(CLI_ROOT, 'scripts', 'test-preload.ts'),
        WORKER,
        failedRequestPath
      ];
      const failed = Bun.spawnSync(failedCommand, {
        cwd: failureFixture.project,
        env: {
          HOME: process.env.HOME ?? '',
          PATH: failureFixture.dockerDirectory,
          STP_FAKE_DOCKER_INSTALL: failureFixture.dockerInstall,
          STP_FAKE_DOCKER_LOG: join(out, '07-failed-layer-upload.docker.log'),
          STP_INVOCATION_ID: '07-failed-layer-upload',
          AWS_EC2_METADATA_DISABLED: 'true'
        },
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: WORKER_TIMEOUT_MS
      });
      const failedOutput = `${failed.stdout.toString()}${failed.stderr.toString()}`;
      await writeFile(join(out, '07-failed-layer-upload.output.log'), failedOutput);
      scenarios.push({ label: '07-failed-layer-upload', command: failedCommand, exitCode: failed.exitCode });
      assert.equal(failed.signalCode, undefined, 'The failed upload worker timed out or was signaled');
      assert.notEqual(failed.exitCode, 0, 'The failed S3 layer upload reported success');
      assert.match(failedOutput, /NoSuchBucket|not exist|404/i, 'The failure did not come from the missing S3 bucket');
      assert.doesNotMatch(failedOutput, /Deployment artifacts uploaded/, 'A failed upload printed a success message');
      assert.equal(await Bun.file(failedRequest.resultPath).exists(), false, 'A failed upload wrote a success result');
      scenarios.at(-1)!.assertions = { localSdkUploadFailed: true, noSuccessResult: true, noSuccessMessage: true };
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
