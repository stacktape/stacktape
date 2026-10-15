import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import {
  DeleteFunctionCommand,
  GetFunctionConfigurationCommand,
  InvokeCommand,
  LambdaClient,
  ListTagsCommand
} from '@aws-sdk/client-lambda';
import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import type { SourceMapManifest } from '@stacktape/console-api/source-maps';
import { sourceMapBundleSchema } from '@stacktape/console-api/source-maps';
import AdmZip from 'adm-zip';
import { startMiniStack } from '@stacktape/ministack/fixture';
// oxlint-disable-next-line import/no-unassigned-import
import './offline-preload';
import {
  createFamilyProject,
  describeStackResources,
  getStackTemplate,
  runSourceCli,
  writeProjectFiles
} from './harness';

const config = {
  resources: {
    api: {
      type: 'function',
      properties: { packaging: { type: 'js-bundle', properties: { entryfilePath: 'handler.ts' } } }
    }
  }
};
const handler = (body: string) => `export default async () => ({ statusCode: 200, body: "${body}" });\n`;

// A code-only change is deployed without CloudFormation, recorded as a release, and restored by rollback. Each of
// those deployments keeps the function's source maps out of its ZIP, in the deployment bucket, and tells the Console
// which maps describe the code the function runs from when.
test('code-only deploys update functions directly, record a release and roll back to the exact code', async () => {
  const out = await mkdtemp(join(tmpdir(), 'stp-fast-deploy-'));
  const ministack = await startMiniStack({ label: 'fast-deploy' });
  const cloudFormation = new CloudFormationClient(ministack.clientConfig());
  const lambda = new LambdaClient(ministack.clientConfig());
  const s3 = new S3Client(ministack.clientConfig());
  const project = await createFamilyProject({ familyName: 'fast-deploy', out, ministack });
  let deployed = false;
  const deployedVersion = async () =>
    (await cloudFormation.send(new DescribeStacksCommand({ StackName: project.stackName }))).Stacks![0]!.Outputs!.find(
      ({ OutputKey }) => OutputKey === 'StpDeploymentVersion'
    )!.OutputValue;
  const invoke = async (functionName: string) => {
    const result = await lambda.send(new InvokeCommand({ FunctionName: functionName, Payload: Buffer.from('{}') }));
    return (JSON.parse(Buffer.from(result.Payload!).toString()) as { body: string }).body;
  };
  try {
    await writeProjectFiles(project, { 'stacktape.yml': config, 'handler.ts': handler('first') });
    const created = await runSourceCli({ project, step: 'create', ministack });
    expect(created.exitCode, created.tail).toBe(0);
    deployed = true;
    const resources = (await describeStackResources(cloudFormation, project.stackName))!;
    const functionName = resources.find(
      ({ LogicalResourceId }) => LogicalResourceId === 'ApiFunction'
    )!.PhysicalResourceId!;
    const bucket = resources.find(
      ({ LogicalResourceId }) => LogicalResourceId === 'StpDeploymentBucket'
    )!.PhysicalResourceId!;
    const templateAfterCreate = await getStackTemplate(cloudFormation, project.stackName);
    expect(await invoke(functionName)).toBe('first');

    /** The manifest the deployment recorded last, and what it names in the bucket. */
    const recordedSourceMaps = async () => {
      const manifests = project.controlPlane.calls
        .filter(({ procedure }) => procedure === 'recordStackOperation')
        .map(({ input }) => (input as { sourceMaps?: SourceMapManifest }).sourceMaps)
        .filter((manifest): manifest is SourceMapManifest => Boolean(manifest));
      const [entry] = manifests.at(-1)!.functions;
      expect(manifests.at(-1)!.functions).toHaveLength(1);
      expect(entry!.lambdaName).toBe(functionName);
      const zipKey = (
        (await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'api/' }))).Contents ?? []
      ).find(({ Key }) => Key!.endsWith(`-${entry!.digest}.zip`))!.Key!;
      const zip = new AdmZip(
        Buffer.from(
          await (await s3.send(new GetObjectCommand({ Bucket: bucket, Key: zipKey }))).Body!.transformToByteArray()
        )
      );
      const bundle = sourceMapBundleSchema.parse(
        JSON.parse(
          await (
            await s3.send(new GetObjectCommand({ Bucket: bucket, Key: entry!.sourceMapKeys[0]! }))
          ).Body!.transformToString()
        )
      );
      return { entry: entry!, manifests, zipEntries: zip.getEntries().map(({ entryName }) => entryName), bundle };
    };
    const firstBuild = await recordedSourceMaps();
    // Recorded before the code switched, and again with the time Lambda started running it.
    expect(firstBuild.manifests.length).toBeGreaterThanOrEqual(2);
    expect(firstBuild.manifests.at(-2)!.functions[0]!.activeSince).toBeUndefined();
    expect(firstBuild.entry.sourceMapKeys).toEqual([`source-maps/api/${firstBuild.entry.digest}.json`]);
    expect(firstBuild.entry.activeSince).toBeGreaterThan(0);
    expect(firstBuild.zipEntries).toContain('index.js');
    expect(firstBuild.zipEntries.filter((name) => name.endsWith('.map'))).toEqual([]);
    expect(firstBuild.bundle.files['/var/task/index.js']!.sources).toContain('handler.ts');
    const { Environment } = await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: functionName }));
    expect(Environment?.Variables?.NODE_OPTIONS ?? '').not.toContain('--enable-source-maps');

    await writeProjectFiles(project, { 'handler.ts': handler('second') });
    const fast = await runSourceCli({ project, step: 'update', ministack });
    expect(fast.exitCode, fast.tail).toBe(0);
    // No change plan and an untouched stack: the code went in directly.
    expect(fast.changeSummary).toBeUndefined();
    expect(await getStackTemplate(cloudFormation, project.stackName)).toBe(templateAfterCreate);
    expect(await deployedVersion()).toBe('v000001');
    expect(await invoke(functionName)).toBe('second');
    const fastReleased = await recordedSourceMaps();
    expect(fastReleased.entry.digest).not.toBe(firstBuild.entry.digest);
    expect(fastReleased.entry.activeSince).toBeGreaterThanOrEqual(firstBuild.entry.activeSince!);
    expect(fastReleased.zipEntries.filter((name) => name.endsWith('.map'))).toEqual([]);
    const releaseTemplates = async () =>
      ((await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'cf-template/' }))).Contents ?? [])
        .map(({ Key }) => Key)
        .toSorted();
    expect(await releaseTemplates()).toEqual(['cf-template/v000001.yml', 'cf-template/v000002.yml']);

    // Deploying the same code again changes nothing and records no release.
    const unchanged = await runSourceCli({ project, step: 'unchanged', ministack });
    expect(unchanged.exitCode, unchanged.tail).toBe(0);
    expect(unchanged.changeSummary).toBeUndefined();
    expect(await releaseTemplates()).toEqual(['cf-template/v000001.yml', 'cf-template/v000002.yml']);

    // Rolling back from the fast release v000002 restores v000001's code as v000003, through CloudFormation, even
    // though the template CloudFormation holds already references v000001's code.
    const rolledBack = await runSourceCli({
      project,
      step: 'rollback',
      ministack,
      rollbackTarget: ['--rollbackSteps', '1']
    });
    expect(rolledBack.exitCode, rolledBack.tail).toBe(0);
    expect(await deployedVersion()).toBe('v000003');
    expect(await invoke(functionName)).toBe('first');
    // The restored code is the first build: its maps are still stored, and the rollback says it runs again.
    const restored = await recordedSourceMaps();
    expect(restored.entry.digest).toBe(firstBuild.entry.digest);
    expect(restored.entry.sourceMapKeys).toEqual(firstBuild.entry.sourceMapKeys);
    expect(restored.entry.activeSince).toBeGreaterThanOrEqual(fastReleased.entry.activeSince!);

    // Deploying the source again after that rollback must notice that the function no longer runs it, even though
    // CloudFormation left the fast release's code-digest tag in place.
    const redeployed = await runSourceCli({ project, step: 'update', ministack });
    expect(redeployed.exitCode, redeployed.tail).toBe(0);
    expect(await invoke(functionName)).toBe('second');

    // Rolling forward to the fast release restores its code as well.
    const forward = await runSourceCli({
      project,
      step: 'rollback',
      ministack,
      rollbackTarget: ['--targetVersion', 'v000001']
    });
    expect(forward.exitCode, forward.tail).toBe(0);
    expect(await invoke(functionName)).toBe('first');
    const toFastRelease = await runSourceCli({
      project,
      step: 'rollback',
      ministack,
      rollbackTarget: ['--targetVersion', 'v000002']
    });
    expect(toFastRelease.exitCode, toFastRelease.tail).toBe(0);
    expect(await deployedVersion()).toBe('v000006');
    expect(await invoke(functionName)).toBe('second');

    // A fast deployment returns to the first build, which CloudFormation's template references by an older key. A
    // later full deployment of that build must still replace the code the function runs.
    await writeProjectFiles(project, { 'handler.ts': handler('third') });
    const third = await runSourceCli({ project, step: 'update', ministack });
    expect(third.exitCode, third.tail).toBe(0);
    expect(third.changeSummary).toBeUndefined();
    expect(await invoke(functionName)).toBe('third');
    await writeProjectFiles(project, { 'handler.ts': handler('second') });
    const full = await runSourceCli({ project, step: 'update', ministack, extraArgs: ['--fullDeploy'] });
    expect(full.exitCode, full.tail).toBe(0);
    expect(full.changeSummary).toBeDefined();
    expect(await deployedVersion()).toBe('v000008');
    expect(await invoke(functionName)).toBe('second');
  } finally {
    try {
      if (deployed) {
        const deleted = await runSourceCli({ project, step: 'delete', ministack });
        expect(deleted.exitCode, deleted.tail).toBe(0);
      }
    } finally {
      await project.close();
      await ministack.stop();
      await rm(out, { recursive: true, force: true });
    }
  }
});

// A fast deployment that fails partway has still switched some functions; their errors need the new maps.
test('a fast deployment that fails partway records the functions it switched', async () => {
  const out = await mkdtemp(join(tmpdir(), 'stp-fast-deploy-partial-'));
  const ministack = await startMiniStack({ label: 'fast-deploy-partial' });
  const lambda = new LambdaClient(ministack.clientConfig());
  const cloudFormation = new CloudFormationClient(ministack.clientConfig());
  const project = await createFamilyProject({ familyName: 'fast-deploy-partial', out, ministack });
  const twoFunctions = {
    resources: Object.fromEntries(
      ['api', 'worker'].map((name) => [
        name,
        {
          type: 'function',
          properties: { packaging: { type: 'js-bundle', properties: { entryfilePath: `${name}.ts` } } }
        }
      ])
    )
  };
  let deployed = false;
  try {
    await writeProjectFiles(project, {
      'stacktape.yml': twoFunctions,
      'api.ts': handler('api-first'),
      'worker.ts': handler('worker-first')
    });
    const created = await runSourceCli({ project, step: 'create', ministack });
    expect(created.exitCode, created.tail).toBe(0);
    deployed = true;
    const resources = (await describeStackResources(cloudFormation, project.stackName))!;
    const physical = (logicalId: string) =>
      resources.find(({ LogicalResourceId }) => LogicalResourceId === logicalId)!.PhysicalResourceId!;

    // Both functions change; the worker disappears behind the deployment's back, so its direct update fails.
    await writeProjectFiles(project, { 'api.ts': handler('api-second'), 'worker.ts': handler('worker-second') });
    await lambda.send(new DeleteFunctionCommand({ FunctionName: physical('WorkerFunction') }));
    const failed = await runSourceCli({ project, step: 'update', ministack });
    expect(failed.exitCode, failed.tail).not.toBe(0);

    const [recordedBefore, recordedAfter] = project.controlPlane.calls
      .filter(({ procedure }) => procedure === 'recordStackOperation')
      .map(({ input }) => (input as { sourceMaps?: SourceMapManifest }).sourceMaps)
      .filter((manifest): manifest is SourceMapManifest => Boolean(manifest))
      .slice(-2);
    const entry = (manifest: SourceMapManifest | undefined, lambdaName: string) =>
      manifest?.functions.find((candidate) => candidate.lambdaName === lambdaName);
    const { Tags } = await lambda.send(
      new ListTagsCommand({
        Resource: (await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: physical('ApiFunction') })))
          .FunctionArn!
      })
    );
    // The pre-switch record names the new code; the one after the failure dates the api switch and only that.
    expect(entry(recordedBefore, physical('ApiFunction'))?.activeSince).toBeUndefined();
    expect(entry(recordedAfter, physical('ApiFunction'))).toMatchObject({ digest: Tags!['stp:code-digest'] });
    expect(entry(recordedAfter, physical('ApiFunction'))?.activeSince).toBeGreaterThan(0);
    expect(entry(recordedAfter, physical('WorkerFunction'))?.activeSince).toBeUndefined();
  } finally {
    try {
      if (deployed) {
        const deleted = await runSourceCli({ project, step: 'delete', ministack });
        expect(deleted.exitCode, deleted.tail).toBe(0);
      }
    } finally {
      await project.close();
      await ministack.stop();
      await rm(out, { recursive: true, force: true });
    }
  }
});
