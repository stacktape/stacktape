/**
 * Artifact upload scenario through real packaging, template finalization, S3 and CloudFormation on shared MiniStack.
 * Changed, unchanged and reverted builds exercise ZIP bytes, extraction, reuse and real retention deletion.
 *
 * Run with `pnpm --filter @stacktape/cli run test:layer-upload:ministack` with Docker available.
 * The shared MiniStack fixture owns the disposable container on a loopback port with synthetic credentials and stops
 * it in finally. The script writes a source-bound report and leaves the fixture and logs in an ignored output directory.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chmod, lstat, readdir, readFile, readlink, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import {
  CreateBucketCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { MINISTACK_IMAGE, startMiniStack, stopMiniStackOnSignals, type MiniStack } from '@stacktape/ministack/fixture';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { extractZip } from './lambda-runtime';
import yargsParser from 'yargs-parser';
import { claimOutputDirectory, createSourceTracker, describeSourceIdentity } from '../perf/measurement-context';
import type { DeployArtifactsRequest, DeployArtifactsResult } from './deploy-artifacts-worker';
import { NATIVE_TOOL, type SplitProjectFixture, writeSplitProjectFixture } from './split-project-fixture';

const CLI_ROOT = resolve(import.meta.dir, '..', '..');
const REPO_ROOT = resolve(CLI_ROOT, '..', '..');
const WORKER = join(import.meta.dir, 'deploy-artifacts-worker.ts');
const REGION = 'eu-west-1';
const BUCKET = awsResourceNames.deploymentBucket('acceptx1');
const RETENTION_HASH = 'retentx1';
const RETENTION_BUCKET = awsResourceNames.deploymentBucket(RETENTION_HASH);
const FAILURE_HASH = 'failurx1';
const FAILURE_BUCKET = awsResourceNames.deploymentBucket(FAILURE_HASH);
const MISSING_BUCKET = awsResourceNames.deploymentBucket('missingx1');
const DENIED_HASH = 'deniedx1';
const DENIED_BUCKET = awsResourceNames.deploymentBucket(DENIED_HASH);
const WORKER_TIMEOUT_MS = 120_000;
const sha256 = (value: Uint8Array) => createHash('sha256').update(value).digest('hex');

const describeTree = async (root: string) =>
  (
    await Promise.all(
      (
        await readdir(root, { recursive: true, withFileTypes: true })
      ).map(async (entry) => {
        const path = join(entry.parentPath, entry.name);
        const name = relative(root, path);
        if (entry.isSymbolicLink()) return `${name} link ${await readlink(path)}`;
        if (entry.isDirectory()) return `${name} directory`;
        return `${name} file ${(await lstat(path)).mode & 0o777} ${sha256(await readFile(path))}`;
      })
    )
  ).toSorted();

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
  const report: Record<string, unknown> = {
    sourceBefore: source.before,
    region: REGION,
    bucket: BUCKET,
    retentionBucket: RETENTION_BUCKET,
    failureBucket: FAILURE_BUCKET,
    deniedBucket: DENIED_BUCKET,
    scenarios: [],
    cleanup: 'pending'
  };
  const scenarios = report.scenarios as Array<Record<string, unknown>>;
  let failure: unknown;
  let ministack: MiniStack | undefined;
  let releaseSignals = () => {};
  try {
    ministack = await startMiniStack({ label: 'layer-upload', region: REGION });
    releaseSignals = stopMiniStackOnSignals(ministack);
    const { endpoint } = ministack;
    report.image = ministack.image;
    report.imageId = ministack.imageId;
    report.endpoint = endpoint;
    report.fixtureStartupMs = ministack.startupMs;
    // The workers below get the same account through `childEnvironment`, so they see these buckets.
    const client = new S3Client(ministack.clientConfig());
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
      await client.send(
        new CreateBucketCommand({ Bucket: DENIED_BUCKET, CreateBucketConfiguration: { LocationConstraint: REGION } })
      );
      // A hand-placed root object once crashed the next deployment. It must survive artifact loading and retention.
      const note = Buffer.from('customer-owned deployment note');
      await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: 'notes.txt', Body: note }));
      await client.send(new PutObjectCommand({ Bucket: RETENTION_BUCKET, Key: 'probe-state', Body: note }));
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
        env: { HOME: process.env.HOME ?? '', PATH: fixture.dockerDirectory, ...ministack.childEnvironment() },
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
          noCache,
          deleteObsoleteArtifacts
        }: {
          projectFixture?: SplitProjectFixture;
          stackHash?: string;
          previousVersionsToKeep?: number;
          noCache?: boolean;
          deleteObsoleteArtifacts?: boolean;
        } = {}
      ) => {
        const request: DeployArtifactsRequest = {
          localAwsEndpoint: endpoint,
          lastVersion,
          resultPath: join(out, `${label}.result.json`),
          ...(stackHash ? { stackHash } : {}),
          ...(previousVersionsToKeep === undefined ? {} : { previousVersionsToKeep }),
          ...(deleteObsoleteArtifacts ? { deleteObsoleteArtifacts } : {}),
          ...(noCache ? { noCache } : {})
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
            ...ministack!.childEnvironment()
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
      const assertLayerExtracts = async (deployment: DeployArtifactsResult, number: number) => {
        const { layerPath } = layer(deployment, number);
        const extracted = await extractZip(`${layerPath}.zip`);
        try {
          assert.deepEqual(
            await describeTree(extracted),
            await describeTree(layerPath),
            'Layer ZIP changed its contents or modes'
          );
        } finally {
          await rm(extracted, { recursive: true, force: true });
        }
      };
      const assertNotZipped = async (deployment: DeployArtifactsResult, number: number) => {
        assert.equal(
          await Bun.file(`${layer(deployment, number).layerPath}.zip`).exists(),
          false,
          'Cached layer was zipped'
        );
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
        await assertLayerExtracts(seed, number);
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
      await assertLayerExtracts(mixed, 0);
      await assertNotZipped(mixed, 1);
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
      for (const number of [0, 1]) await assertNotZipped(unchanged, number);
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
      assert.equal(
        await storedHash('probe-state', RETENTION_BUCKET),
        sha256(note),
        'Retention touched a non-artifact object'
      );
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

      // A newly uploaded function must survive even when the keep window is zero.
      await writeFile(plainHandler, plainSource.replace("function: 'plain'", "function: 'plain-c'"));
      const buildC = await run('07-retention-new-upload', buildAAgain.version, {
        ...retentionOptions,
        deleteObsoleteArtifacts: true
      });
      const keyC = buildC.functions.plain?.s3Key;
      assert.ok(keyC && keyC !== keyA && keyC !== keyB, 'C did not produce a new function ZIP');
      assert.ok(buildC.uploadedKeys.includes(keyC), 'C did not upload its changed function');
      assert.ok(!buildC.retentionProtectedKeys.includes(keyC), 'C was reused instead of uploaded');
      assert.ok((await listKeys(RETENTION_BUCKET)).includes(keyC), 'Retention deleted the just-uploaded function');
      await assertStoredFunctionZips(buildC, RETENTION_BUCKET);
      await assertTemplateProtected(buildC, RETENTION_BUCKET);
      assert.ok(
        !(await listKeys(RETENTION_BUCKET)).includes(`cf-template/${buildAAgain.version}.yml`),
        'The new-upload deletion run did not remove the obsolete template'
      );
      scenarios.at(-1)!.assertions = { freshFunctionUploaded: true, uploadedObjectSurvivedDeletion: true };

      // A failed attempt can leave this version's objects in the next retry's initial listing.
      const retryC = await run('08-retention-upload-retry', buildAAgain.version, {
        ...retentionOptions,
        noCache: true,
        deleteObsoleteArtifacts: true
      });
      assert.equal(retryC.version, buildC.version, 'The retry advanced the deployment version');
      assert.equal(retryC.functions.plain?.s3Key, keyC, 'The retry did not replace the pre-existing C object');
      assert.ok(retryC.uploadedKeys.includes(keyC), 'The no-cache retry did not upload C');
      assert.ok(!retryC.retentionProtectedKeys.includes(keyC), 'C was recorded as reused in the retry');
      assert.ok(
        (await listKeys(RETENTION_BUCKET)).includes(keyC),
        'Retention deleted the just-uploaded retry function'
      );
      await assertStoredFunctionZips(retryC, RETENTION_BUCKET);
      await assertTemplateProtected(retryC, RETENTION_BUCKET);
      scenarios.at(-1)!.assertions = { existingVersionUploadedAgain: true, uploadedObjectSurvivedDeletion: true };

      const failureFixture = await writeSplitProjectFixture(join(out, 'failure-fixture'));
      /** Runs a worker whose upload must fail, and checks that it reports the failure and no success. */
      const runFailing = async (label: string, request: Omit<DeployArtifactsRequest, 'resultPath'>) => {
        const failedRequest: DeployArtifactsRequest = { ...request, resultPath: join(out, `${label}.result.json`) };
        const failedRequestPath = join(out, `${label}.request.json`);
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
            STP_FAKE_DOCKER_LOG: join(out, `${label}.docker.log`),
            STP_INVOCATION_ID: label,
            ...ministack!.childEnvironment()
          },
          stdout: 'pipe',
          stderr: 'pipe',
          timeout: WORKER_TIMEOUT_MS
        });
        const failedOutput = `${failed.stdout.toString()}${failed.stderr.toString()}`;
        await writeFile(join(out, `${label}.output.log`), failedOutput);
        scenarios.push({ label, command: failedCommand, exitCode: failed.exitCode });
        assert.equal(failed.signalCode, undefined, `${label}: the worker timed out or was signaled`);
        assert.notEqual(failed.exitCode, 0, `${label}: the failed upload reported success`);
        assert.doesNotMatch(failedOutput, /Deployment artifacts uploaded/, `${label}: a failed upload printed success`);
        assert.equal(
          await Bun.file(failedRequest.resultPath).exists(),
          false,
          `${label}: a failed upload wrote a success result`
        );
        return failedOutput;
      };
      const missingBucketOutput = await runFailing('09-failed-layer-upload', {
        localAwsEndpoint: endpoint,
        stackHash: FAILURE_HASH,
        failLayerUploadToBucket: MISSING_BUCKET,
        lastVersion: 'v000000'
      });
      assert.match(
        missingBucketOutput,
        /NoSuchBucket|not exist|404/i,
        'The failure did not come from the missing S3 bucket'
      );
      scenarios.at(-1)!.assertions = { localSdkUploadFailed: true, noSuccessResult: true, noSuccessMessage: true };
      // A denied function upload has no retry: the deployment must stop rather than point a template at nothing.
      const deniedOutput = await runFailing('10-denied-function-upload', {
        localAwsEndpoint: endpoint,
        stackHash: DENIED_HASH,
        denyFunctionUploads: true,
        lastVersion: 'v000000'
      });
      assert.match(deniedOutput, /AccessDenied: injected denial/, 'The failure did not come from the denied upload');
      assert.ok(
        !(await listKeys(DENIED_BUCKET)).some((key) => key.endsWith('.zip') && !key.startsWith('shared-layer-')),
        'A denied function ZIP is stored'
      );
      scenarios.at(-1)!.assertions = { deniedUploadFailed: true, noSuccessResult: true, noSuccessMessage: true };
    } finally {
      client.destroy();
    }
  } catch (error) {
    failure = error;
    report.failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
  } finally {
    releaseSignals();
    if (ministack) {
      try {
        await writeFile(join(out, 'ministack.log'), ministack.logs());
      } catch (error) {
        report.logError = String(error);
      } finally {
        try {
          await ministack.stop();
          report.cleanup = 'MiniStack container and volumes removed; in-memory AWS state discarded';
        } catch (error) {
          report.cleanup = `MiniStack cleanup failed: ${String(error)}`;
          failure ??= error;
        }
      }
    } else {
      report.cleanup = 'No container started';
    }
    report.sourceCheck = source.check();
    report.sourceAfter = source.after;
    await writeFile(join(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  }
  assert.equal(report.sourceCheck, 'unchanged', 'Source changed during the acceptance');
  if (failure) throw failure;
  console.info(`MiniStack layer upload passed against ${MINISTACK_IMAGE}; ${describeSourceIdentity(source.before)}`);
  console.info(`Evidence: ${join(out, 'report.json')}`);
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
