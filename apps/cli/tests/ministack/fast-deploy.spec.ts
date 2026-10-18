import { expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import {
  DeleteFunctionCommand,
  GetFunctionCommand,
  GetFunctionConfigurationCommand,
  GetLayerVersionByArnCommand,
  InvokeCommand,
  LambdaClient,
  ListLayerVersionsCommand,
  ListTagsCommand
} from '@aws-sdk/client-lambda';
import { ensureLambdaImage, extractZip, invokeInLambdaRuntime } from '../../scripts/packaging-archives/lambda-runtime';
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
      const storedMaps = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: entry!.sourceMapKeys[0]! }));
      expect(storedMaps.ContentEncoding).toBe('gzip');
      const bundle = sourceMapBundleSchema.parse(
        JSON.parse(gunzipSync(await storedMaps.Body!.transformToByteArray()).toString('utf8'))
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

// Large enough to become a shared chunk with the default split-layer thresholds.
const sharedPayload = 'shared-layer-'.repeat(1024);
const sharedSource = (revision: string) =>
  `export const shared = ${JSON.stringify(sharedPayload)};\nexport const revision = '${revision}';\n`;
const splitHandler = (name: string, version: string) =>
  `import { revision, shared } from './shared';\n` +
  `export default async () => ({ statusCode: 200, body: \`${name}-${version}:\${revision}:\${shared.length}\` });\n`;

/**
 * A change to code several functions share changes their shared chunk layer. It is deployed without CloudFormation:
 * the deployment publishes the layer version itself, gives every function its new code and the new version, and
 * records the release. CloudFormation takes the layer back on a rollback or a full deployment, and the versions the
 * fast deployments published are deleted once nothing runs them.
 */
test('a change to shared code publishes the layer directly, and CloudFormation takes it back on rollback and full deploys', async () => {
  const out = await mkdtemp(join(tmpdir(), 'stp-fast-deploy-shared-'));
  const ministack = await startMiniStack({ label: 'fast-deploy-shared' });
  const cloudFormation = new CloudFormationClient(ministack.clientConfig());
  const lambda = new LambdaClient(ministack.clientConfig());
  const s3 = new S3Client(ministack.clientConfig());
  const project = await createFamilyProject({ familyName: 'fast-deploy-shared', out, ministack });
  const config = {
    resources: Object.fromEntries(
      ['first', 'second'].map((name) => [
        name,
        {
          type: 'function',
          properties: { packaging: { type: 'js-bundle', properties: { entryfilePath: `${name}.ts` } } }
        }
      ])
    )
  };
  const layerName = `${project.stackName}-shared-chunk-layer-1`;
  const layerLogicalId = 'StpSharedChunkLayer1LayerVersion';
  let deployed = false;
  const extracted: string[] = [];
  const missingImports: string[] = [];
  let observedUpdates = 0;
  let codeUpdates = 0;
  let layerUpdates = 0;
  let functionUploads = 0;
  let holdFunctionUploads = false;
  let publicationSeen = false;
  let heldUploads = 0;
  let uploadTimeouts = 0;
  const archiveAt = async (location: string) => {
    const url = new URL(location);
    const local =
      url.origin === 'http://localhost:4566' ? `${ministack.endpoint}${url.pathname}${url.search}` : location;
    return new AdmZip(Buffer.from(await (await fetch(local)).arrayBuffer()));
  };
  // Observe the installed module graph after each successful API mutation, including the interval between updates.
  // MiniStack cannot prove AWS's timing, but this would catch a code-first update before the final state hides it.
  const proxy = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      const body = await request.arrayBuffer();
      if (request.method === 'PUT' && url.pathname.endsWith('/code')) codeUpdates++;
      if (request.method === 'PUT' && url.pathname.endsWith('/configuration')) layerUpdates++;
      if (request.method === 'PUT' && /\/(?:first|second)\/v[^/]+\.zip$/.test(url.pathname)) functionUploads++;
      if (request.method === 'POST' && /\/layers\/[^/]+\/versions$/.test(url.pathname)) {
        const content = (JSON.parse(new TextDecoder().decode(body)) as { Content?: { S3Key?: string } }).Content;
        if (content?.S3Key) publicationSeen = true;
      }
      if (holdFunctionUploads && request.method === 'PUT' && /\/(?:first|second)\/v[^/]+\.zip$/.test(url.pathname)) {
        heldUploads++;
        for (let attempt = 0; attempt < 100; attempt++) {
          if (publicationSeen) break;
          await Bun.sleep(100);
        }
        if (!publicationSeen) uploadTimeouts++;
      }
      const headers = new Headers(request.headers);
      headers.set('host', new URL(ministack.endpoint).host);
      const response = await fetch(`${ministack.endpoint}${url.pathname}${url.search}`, {
        method: request.method,
        headers,
        ...(body.byteLength ? { body } : {})
      });
      const target = url.pathname.match(/\/functions\/([^/]+)\/(?:code|configuration)$/);
      if (response.ok && request.method === 'PUT' && target) {
        const current = await lambda.send(new GetFunctionCommand({ FunctionName: decodeURIComponent(target[1]!) }));
        const code = await archiveAt(current.Code!.Location!);
        const layers = await Promise.all(
          (current.Configuration?.Layers ?? []).map(async ({ Arn }) =>
            archiveAt((await lambda.send(new GetLayerVersionByArnCommand({ Arn }))).Content!.Location!)
          )
        );
        const names = new Set(layers.flatMap((zip) => zip.getEntries().map(({ entryName }) => `/opt/${entryName}`)));
        for (const zip of [code, ...layers])
          for (const entry of zip.getEntries()) {
            if (!entry.entryName.endsWith('.js')) continue;
            for (const match of entry
              .getData()
              .toString()
              .matchAll(/["'`](\/opt\/nodejs\/chunks\/chunk-[a-z0-9]+\.js)["'`]/g)) {
              if (!names.has(match[1]!)) missingImports.push(`${entry.entryName}: ${match[1]}`);
            }
          }
        observedUpdates++;
      }
      return response;
    }
  });
  const throughProxy = { ...ministack, endpoint: proxy.url.origin };
  try {
    await writeProjectFiles(project, {
      'stacktape.yml': config,
      'shared.ts': sharedSource('s1'),
      'first.ts': splitHandler('first', 'v1'),
      'second.ts': splitHandler('second', 'v1')
    });
    const created = await runSourceCli({ project, step: 'create', ministack });
    expect(created.exitCode, created.tail).toBe(0);
    deployed = true;
    const resources = (await describeStackResources(cloudFormation, project.stackName))!;
    const physical = (logicalId: string) =>
      resources.find(({ LogicalResourceId }) => LogicalResourceId === logicalId)!.PhysicalResourceId!;
    const functionNames = [physical('FirstFunction'), physical('SecondFunction')];
    const bucket = physical('StpDeploymentBucket');
    const templateAfterCreate = await getStackTemplate(cloudFormation, project.stackName);

    const deployedVersion = async () =>
      (
        await cloudFormation.send(new DescribeStacksCommand({ StackName: project.stackName }))
      ).Stacks![0]!.Outputs!.find(({ OutputKey }) => OutputKey === 'StpDeploymentVersion')!.OutputValue;
    const cloudFormationLayerArn = async () =>
      (await describeStackResources(cloudFormation, project.stackName))!.find(
        ({ LogicalResourceId }) => LogicalResourceId === layerLogicalId
      )!.PhysicalResourceId!;
    /** What each function runs: its code hash, its layer version ARNs and its shared-layers tag. */
    const state = () =>
      Promise.all(
        functionNames.map(async (FunctionName) => {
          const configuration = await lambda.send(new GetFunctionConfigurationCommand({ FunctionName }));
          const { Tags } = await lambda.send(new ListTagsCommand({ Resource: configuration.FunctionArn! }));
          return {
            code: configuration.CodeSha256!,
            layers: (configuration.Layers ?? []).map(({ Arn }) => Arn!),
            tag: Tags?.['stp:shared-layers'],
            digest: Tags?.['stp:code-digest'],
            artifactDigest: Tags?.['stp:artifact-digest']
          };
        })
      );
    const layerVersions = async () =>
      ((await lambda.send(new ListLayerVersionsCommand({ LayerName: layerName }))).LayerVersions ?? []).map(
        ({ LayerVersionArn, Description }) => ({ arn: LayerVersionArn!, description: Description })
      );
    const releaseTemplates = async () =>
      ((await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'cf-template/' }))).Contents ?? [])
        .map(({ Key }) => Key)
        .toSorted();
    const identityOf = (tag: string | undefined) => {
      expect(tag).toMatch(/^1:[a-z0-9]{12}$/);
      return tag!.slice(2);
    };
    /** Runs the function's uploaded ZIP with the layer ZIP of the given content in the official runtime image. */
    const runInRuntime = async ({ prefix, code, identity }: { prefix: string; code: string; identity: string }) => {
      const objects =
        (await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}/` }))).Contents ?? [];
      const bodies = await Promise.all(
        objects.map(async ({ Key }) => ({
          key: Key!,
          bytes: Buffer.from(
            await (await s3.send(new GetObjectCommand({ Bucket: bucket, Key }))).Body!.transformToByteArray()
          )
        }))
      );
      const functionZip = bodies.find(({ bytes }) => createHash('sha256').update(bytes).digest('base64') === code);
      expect(functionZip, `${prefix} must run an uploaded ZIP`).toBeDefined();
      const layerZip = Buffer.from(
        await (
          await s3.send(new GetObjectCommand({ Bucket: bucket, Key: `shared-layer-1/${identity}.zip` }))
        ).Body!.transformToByteArray()
      );
      const directory = await mkdtemp(join(tmpdir(), 'stp-fast-deploy-runtime-'));
      extracted.push(directory);
      await writeFile(join(directory, 'function.zip'), functionZip!.bytes);
      await writeFile(join(directory, 'layer.zip'), layerZip);
      const [functionDirectory, layerDirectory] = await Promise.all([
        extractZip(join(directory, 'function.zip')),
        extractZip([join(directory, 'layer.zip')])
      ]);
      extracted.push(functionDirectory, layerDirectory);
      ensureLambdaImage();
      const result = await invokeInLambdaRuntime({
        functionDirectory,
        layerDirectory,
        handler: 'index.default',
        event: {}
      });
      expect(result.status).toBe(200);
      return (JSON.parse(result.body) as { body: string }).body;
    };

    const initial = await state();
    const cloudFormationV1 = await cloudFormationLayerArn();
    expect(initial.map(({ layers }) => layers)).toEqual([[cloudFormationV1], [cloudFormationV1]]);
    expect(initial[1]!.tag).toBe(initial[0]!.tag);
    const identity1 = identityOf(initial[0]!.tag);

    // The shared code changes, but the function ZIPs remain byte-identical: only their layer configuration changes.
    await writeProjectFiles(project, { 'shared.ts': sharedSource('s2') });
    const shared = await runSourceCli({ project, step: 'update', ministack: throughProxy, logName: 'update-shared' });
    expect(shared.exitCode, shared.tail).toBe(0);
    expect(observedUpdates).toBeGreaterThan(0);
    expect(codeUpdates).toBe(0);
    expect(layerUpdates).toBe(2);
    expect(functionUploads).toBe(0);
    expect(missingImports).toEqual([]);
    expect(shared.changeSummary).toBeUndefined();
    expect(await getStackTemplate(cloudFormation, project.stackName)).toBe(templateAfterCreate);
    expect(await deployedVersion()).toBe('v000001');
    const afterShared = await state();
    const fastArn = afterShared[0]!.layers[0]!;
    expect(afterShared.map(({ layers }) => layers)).toEqual([[fastArn], [fastArn]]);
    expect(fastArn).not.toBe(cloudFormationV1);
    expect(fastArn.split(':')[6]).toBe(layerName);
    expect(afterShared.map(({ code }) => code)).toEqual(initial.map(({ code }) => code));
    expect(afterShared.map(({ artifactDigest }) => artifactDigest)).toEqual(
      initial.map(({ artifactDigest }) => artifactDigest)
    );
    expect(afterShared.map(({ digest }) => digest)).not.toEqual(initial.map(({ digest }) => digest));
    const identity2 = identityOf(afterShared[0]!.tag);
    expect(identity2).not.toBe(identity1);
    expect(afterShared[1]!.tag).toBe(afterShared[0]!.tag);
    const activatedMaps = project.controlPlane.calls
      .filter(({ procedure }) => procedure === 'recordStackOperation')
      .map(({ input }) => (input as { sourceMaps?: SourceMapManifest }).sourceMaps)
      .filter((manifest): manifest is SourceMapManifest => Boolean(manifest))
      .at(-1)!;
    for (const [index, functionName] of functionNames.entries()) {
      const entry = activatedMaps.functions.find(({ lambdaName }) => lambdaName === functionName)!;
      expect(entry.digest).toBe(afterShared[index]!.digest!);
      expect(entry.sourceMapKeys).toContain(`source-maps/shared-layer-1/${identity2}.json`);
      expect(entry.activeSince).toBeGreaterThan(0);
    }
    const published = await layerVersions();
    expect(published.map(({ arn }) => arn).toSorted()).toEqual([cloudFormationV1, fastArn].toSorted());
    expect(published.find(({ arn }) => arn === fastArn)!.description).toContain(`(stp:fast-deployment ${identity2})`);
    expect(await releaseTemplates()).toEqual(['cf-template/v000001.yml', 'cf-template/v000002.yml']);
    const recordedTemplate = await (
      await s3.send(new GetObjectCommand({ Bucket: bucket, Key: 'cf-template/v000002.yml' }))
    ).Body!.transformToString();
    expect(recordedTemplate).toContain(`shared-layer-1/${identity2}.zip`);
    // The code each function now runs imports from the layer content it was given.
    expect(await runInRuntime({ prefix: 'first', code: afterShared[0]!.code, identity: identity2 })).toBe(
      `first-v1:s2:${sharedPayload.length}`
    );

    // Nothing changed: no update, no release.
    const unchanged = await runSourceCli({ project, step: 'unchanged', ministack });
    expect(unchanged.exitCode, unchanged.tail).toBe(0);
    expect(unchanged.changeSummary).toBeUndefined();
    expect(await state()).toEqual(afterShared);
    expect(await releaseTemplates()).toEqual(['cf-template/v000001.yml', 'cf-template/v000002.yml']);

    // One function's own code changes: it keeps the published layer version, the other function is untouched.
    await writeProjectFiles(project, { 'first.ts': splitHandler('first', 'v2') });
    const own = await runSourceCli({ project, step: 'update', ministack, logName: 'update-first' });
    expect(own.exitCode, own.tail).toBe(0);
    expect(own.changeSummary).toBeUndefined();
    const afterOwn = await state();
    expect(afterOwn.map(({ layers }) => layers)).toEqual([[fastArn], [fastArn]]);
    expect(afterOwn[0]!.code).not.toBe(afterShared[0]!.code);
    expect(afterOwn[1]).toEqual(afterShared[1]!);
    expect((await layerVersions()).map(({ arn }) => arn).toSorted()).toEqual([cloudFormationV1, fastArn].toSorted());

    // Rolling back to the shared-change release restores it through CloudFormation, which publishes the layer from
    // the release's stored object. The directly published version is no longer run, so it is deleted.
    const rolledBack = await runSourceCli({
      project,
      step: 'rollback',
      ministack,
      rollbackTarget: ['--rollbackSteps', '1']
    });
    expect(rolledBack.exitCode, rolledBack.tail).toBe(0);
    expect(await deployedVersion()).toBe('v000004');
    const cloudFormationAfterRollback = await cloudFormationLayerArn();
    expect(cloudFormationAfterRollback).not.toBe(cloudFormationV1);
    expect(cloudFormationAfterRollback).not.toBe(fastArn);
    const afterRollback = await state();
    expect(afterRollback.map(({ layers }) => layers)).toEqual([
      [cloudFormationAfterRollback],
      [cloudFormationAfterRollback]
    ]);
    expect(afterRollback.map(({ tag }) => tag)).toEqual([afterShared[0]!.tag, afterShared[1]!.tag]);
    expect(afterRollback[0]!.code).toBe(afterShared[0]!.code);
    const afterRollbackVersions = (await layerVersions()).map(({ arn }) => arn);
    expect(afterRollbackVersions).toContain(cloudFormationAfterRollback);
    expect(afterRollbackVersions).not.toContain(fastArn);

    // Deploying the source again puts first's own change back, on CloudFormation's layer version.
    const redeployed = await runSourceCli({ project, step: 'update', ministack, logName: 'update-after-rollback' });
    expect(redeployed.exitCode, redeployed.tail).toBe(0);
    expect(redeployed.changeSummary).toBeUndefined();
    const afterRedeploy = await state();
    expect(afterRedeploy.map(({ layers }) => layers)).toEqual([
      [cloudFormationAfterRollback],
      [cloudFormationAfterRollback]
    ]);
    expect(afterRedeploy[0]!.code).toBe(afterOwn[0]!.code);

    // A full deployment of a directly published shared change makes CloudFormation publish its own version of it.
    await writeProjectFiles(project, { 'shared.ts': sharedSource('s3') });
    const third = await runSourceCli({ project, step: 'update', ministack, logName: 'update-shared-3' });
    expect(third.exitCode, third.tail).toBe(0);
    expect(third.changeSummary).toBeUndefined();
    const fastArn3 = (await state())[0]!.layers[0]!;
    expect(fastArn3).not.toBe(cloudFormationAfterRollback);
    const full = await runSourceCli({
      project,
      step: 'update',
      ministack,
      logName: 'full-deploy',
      extraArgs: ['--fullDeploy']
    });
    expect(full.exitCode, full.tail).toBe(0);
    expect(full.changeSummary).toBeDefined();
    const cloudFormationAfterFull = await cloudFormationLayerArn();
    expect(cloudFormationAfterFull).not.toBe(fastArn3);
    const afterFull = await state();
    expect(afterFull.map(({ layers }) => layers)).toEqual([[cloudFormationAfterFull], [cloudFormationAfterFull]]);
    const identity3 = identityOf(afterFull[0]!.tag);
    expect((await layerVersions()).map(({ arn }) => arn)).not.toContain(fastArn3);

    // Shared code that returns to what CloudFormation holds puts the functions back on CloudFormation's version
    // without publishing anything, and the version published in between is deleted.
    await writeProjectFiles(project, { 'shared.ts': sharedSource('s4') });
    const fourth = await runSourceCli({ project, step: 'update', ministack, logName: 'update-shared-4' });
    expect(fourth.exitCode, fourth.tail).toBe(0);
    const fastArn4 = (await state())[0]!.layers[0]!;
    expect(fastArn4).not.toBe(cloudFormationAfterFull);
    await writeProjectFiles(project, { 'shared.ts': sharedSource('s3') });
    const back = await runSourceCli({ project, step: 'update', ministack, logName: 'update-shared-back' });
    expect(back.exitCode, back.tail).toBe(0);
    expect(back.changeSummary).toBeUndefined();
    const afterBack = await state();
    expect(afterBack.map(({ layers }) => layers)).toEqual([[cloudFormationAfterFull], [cloudFormationAfterFull]]);
    expect(identityOf(afterBack[0]!.tag)).toBe(identity3);
    expect((await layerVersions()).map(({ arn }) => arn)).toEqual([cloudFormationAfterFull]);

    // CloudFormation leaves a function's layers alone when only its code changes. So a rollback to the release
    // CloudFormation holds, while the functions run a directly published version, makes CloudFormation republish the
    // layer from a copy of the release's object and give the functions the new version with their restored code.
    await writeProjectFiles(project, { 'shared.ts': sharedSource('s5') });
    const fifth = await runSourceCli({ project, step: 'update', ministack, logName: 'update-shared-5' });
    expect(fifth.exitCode, fifth.tail).toBe(0);
    const fastArn5 = (await state())[0]!.layers[0]!;
    expect(fastArn5).not.toBe(cloudFormationAfterFull);
    const toHeld = await runSourceCli({
      project,
      step: 'rollback',
      ministack,
      logName: 'rollback-to-held',
      rollbackTarget: ['--targetVersion', 'v000007']
    });
    expect(toHeld.exitCode, toHeld.tail).toBe(0);
    expect(await deployedVersion()).toBe('v000011');
    const cloudFormationAfterHeld = await cloudFormationLayerArn();
    expect(cloudFormationAfterHeld).not.toBe(cloudFormationAfterFull);
    expect(cloudFormationAfterHeld).not.toBe(fastArn5);
    const afterHeld = await state();
    expect(afterHeld.map(({ layers }) => layers)).toEqual([[cloudFormationAfterHeld], [cloudFormationAfterHeld]]);
    expect(afterHeld.map(({ tag }) => identityOf(tag))).toEqual([identity3, identity3]);
    expect((await layerVersions()).map(({ arn }) => arn)).toEqual([cloudFormationAfterHeld]);
    expect(await runInRuntime({ prefix: 'first', code: afterHeld[0]!.code, identity: identity3 })).toBe(
      `first-v2:s3:${sharedPayload.length}`
    );

    // The same for a full deployment of an unrelated change while the functions run a directly published version of
    // shared code that CloudFormation's template already describes.
    await writeProjectFiles(project, { 'shared.ts': sharedSource('s5') });
    const again = await runSourceCli({ project, step: 'update', ministack, logName: 'update-shared-5-again' });
    expect(again.exitCode, again.tail).toBe(0);
    expect(again.changeSummary).toBeUndefined();
    expect((await state())[0]!.layers[0]).not.toBe(cloudFormationAfterHeld);
    await writeProjectFiles(project, {
      'shared.ts': sharedSource('s3'),
      'stacktape.yml': { resources: { ...config.resources, files: { type: 'bucket', properties: {} } } }
    });
    const drifted = await runSourceCli({ project, step: 'update', ministack, logName: 'full-deploy-drift' });
    expect(drifted.exitCode, drifted.tail).toBe(0);
    expect(drifted.changeSummary).toBeDefined();
    const cloudFormationAfterDrift = await cloudFormationLayerArn();
    expect(cloudFormationAfterDrift).not.toBe(cloudFormationAfterHeld);
    const afterDrift = await state();
    expect(afterDrift.map(({ layers }) => layers)).toEqual([[cloudFormationAfterDrift], [cloudFormationAfterDrift]]);
    expect(afterDrift.map(({ tag }) => identityOf(tag))).toEqual([identity3, identity3]);
    expect((await layerVersions()).map(({ arn }) => arn)).toEqual([cloudFormationAfterDrift]);
    // The functions' tags say what they run, so deploying the same source again changes nothing.
    const settled = await runSourceCli({ project, step: 'unchanged', ministack, logName: 'unchanged-after-drift' });
    expect(settled.exitCode, settled.tail).toBe(0);
    expect(settled.changeSummary).toBeUndefined();
    expect(await state()).toEqual(afterDrift);
    expect((await releaseTemplates()).length).toBe(13);

    // A mixed entry/shared edit falls back to graph/content names so both generations can coexist. Hold the function
    // ZIP uploads until PublishLayerVersion starts: publication must depend only on the layer's object reaching S3.
    publicationSeen = false;
    holdFunctionUploads = true;
    await writeProjectFiles(project, { 'shared.ts': sharedSource('s6'), 'first.ts': splitHandler('first', 'v3') });
    const mixed = await runSourceCli({
      project,
      step: 'update',
      ministack: throughProxy,
      logName: 'mixed-shared-entry'
    });
    expect(mixed.exitCode, mixed.tail).toBe(0);
    expect(heldUploads).toBeGreaterThan(0);
    expect(uploadTimeouts).toBe(0);
    expect(missingImports).toEqual([]);
    const afterMixed = await state();
    expect(
      await runInRuntime({ prefix: 'first', code: afterMixed[0]!.code, identity: identityOf(afterMixed[0]!.tag) })
    ).toBe(`first-v3:s6:${sharedPayload.length}`);
  } finally {
    try {
      if (deployed) {
        const deleted = await runSourceCli({ project, step: 'delete', ministack });
        expect(deleted.exitCode, deleted.tail).toBe(0);
        // Deleting the stack leaves no layer version behind, CloudFormation's or Stacktape's.
        const left = await lambda
          .send(new ListLayerVersionsCommand({ LayerName: layerName }))
          .then(({ LayerVersions }) => LayerVersions ?? [])
          .catch(() => []);
        expect(left).toEqual([]);
      }
    } finally {
      proxy.stop(true);
      await project.close();
      await ministack.stop();
      await Promise.all([out, ...extracted].map((path) => rm(path, { recursive: true, force: true })));
    }
  }
});

// Fail only the external writes under review; every accepted AWS operation still goes through the real SDK and
// MiniStack. Each restore starts from code whose layer update succeeded but whose final tags were never written.
test('failed layer tags and release writes remain retryable through deploy, full deploy and rollback', async () => {
  const out = await mkdtemp(join(tmpdir(), 'stp-fast-deploy-recovery-'));
  const ministack = await startMiniStack({ label: 'fast-deploy-recovery' });
  const cloudFormation = new CloudFormationClient(ministack.clientConfig());
  const lambda = new LambdaClient(ministack.clientConfig());
  const s3 = new S3Client(ministack.clientConfig());
  const project = await createFamilyProject({ familyName: 'fast-deploy-recovery', out, ministack });
  let fault: 'tags' | 'release' | undefined;
  let rejected = 0;
  const proxy = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      const url = new URL(request.url);
      const body = await request.arrayBuffer();
      const finalTags =
        request.method === 'POST' &&
        url.pathname.includes('/tags/') &&
        (JSON.parse(new TextDecoder().decode(body)) as { Tags?: Record<string, string> }).Tags?.['stp:code-digest'] !==
          'updating';
      const releaseWrite = request.method === 'PUT' && url.pathname.includes('/fast-release/');
      if ((fault === 'tags' && finalTags) || (fault === 'release' && releaseWrite)) {
        rejected++;
        return new Response(JSON.stringify({ __type: 'AccessDeniedException', message: 'injected write failure' }), {
          status: 403,
          headers: { 'content-type': 'application/json', 'x-amzn-errortype': 'AccessDeniedException' }
        });
      }
      const headers = new Headers(request.headers);
      headers.set('host', new URL(ministack.endpoint).host);
      return fetch(`${ministack.endpoint}${url.pathname}${url.search}`, {
        method: request.method,
        headers,
        ...(body.byteLength ? { body } : {})
      });
    }
  });
  const throughProxy = { ...ministack, endpoint: proxy.url.origin };
  let deployed = false;
  try {
    await writeProjectFiles(project, {
      'stacktape.yml': {
        resources: Object.fromEntries(
          ['first', 'second'].map((name) => [
            name,
            {
              type: 'function',
              properties: { packaging: { type: 'js-bundle', properties: { entryfilePath: `${name}.ts` } } }
            }
          ])
        )
      },
      'shared.ts': sharedSource('original'),
      'first.ts': splitHandler('first', 'v1'),
      'second.ts': splitHandler('second', 'v1')
    });
    const created = await runSourceCli({ project, step: 'create', ministack });
    expect(created.exitCode, created.tail).toBe(0);
    deployed = true;
    const resources = (await describeStackResources(cloudFormation, project.stackName))!;
    const functionNames = resources
      .filter(({ LogicalResourceId }) => ['FirstFunction', 'SecondFunction'].includes(LogicalResourceId!))
      .map(({ PhysicalResourceId }) => PhysicalResourceId!);
    const bucket = resources.find(
      ({ LogicalResourceId }) => LogicalResourceId === 'StpDeploymentBucket'
    )!.PhysicalResourceId!;
    const state = () =>
      Promise.all(
        functionNames.map(async (FunctionName) => {
          const configuration = await lambda.send(new GetFunctionConfigurationCommand({ FunctionName }));
          const { Tags } = await lambda.send(new ListTagsCommand({ Resource: configuration.FunctionArn! }));
          return { layers: (configuration.Layers ?? []).map(({ Arn }) => Arn!), tags: Tags! };
        })
      );
    const releaseKeys = async () =>
      ((await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'fast-release/' }))).Contents ?? []).map(
        ({ Key }) => Key!
      );
    const layerName = `${project.stackName}-shared-chunk-layer-1`;
    const layerVersions = async () =>
      ((await lambda.send(new ListLayerVersionsCommand({ LayerName: layerName }))).LayerVersions ?? []).map(
        ({ LayerVersionArn }) => LayerVersionArn!
      );
    const originalTag = (await state())[0]!.tags['stp:shared-layers'];

    for (const restore of ['deploy', 'fullDeploy', 'rollback'] as const) {
      const before = await state();
      await writeProjectFiles(project, { 'shared.ts': sharedSource(`changed-${restore}`) });
      fault = 'tags';
      rejected = 0;
      const changed = await runSourceCli({
        project,
        step: 'update',
        ministack: throughProxy,
        logName: `fail-tags-${restore}`
      });
      expect(changed.exitCode, changed.tail).toBe(0);
      expect(rejected).toBeGreaterThan(0);
      fault = undefined;
      const interrupted = await state();
      expect(interrupted[0]!.layers).not.toEqual(before[0]!.layers);
      expect(interrupted.map(({ tags }) => tags['stp:shared-layers'])).toEqual(['updating', 'updating']);
      // Cleanup must keep the version the functions actually run despite their unknown tags.
      expect(await layerVersions()).toContain(interrupted[0]!.layers[0]!);
      await writeProjectFiles(project, { 'shared.ts': sharedSource('original') });
      const restored = await runSourceCli({
        project,
        step: restore === 'rollback' ? 'rollback' : 'update',
        ministack,
        logName: `restore-${restore}`,
        ...(restore === 'fullDeploy' ? { extraArgs: ['--fullDeploy'] } : {})
      });
      expect(restored.exitCode, restored.tail).toBe(0);
      const after = await state();
      expect(after.map(({ tags }) => tags['stp:shared-layers'])).toEqual([originalTag, originalTag]);
      expect(after[0]!.layers).not.toEqual(interrupted[0]!.layers);
      expect(await layerVersions()).not.toContain(interrupted[0]!.layers[0]!);
    }

    await writeProjectFiles(project, { 'shared.ts': sharedSource('unrecorded') });
    const releasesBefore = await releaseKeys();
    fault = 'release';
    rejected = 0;
    const failedRelease = await runSourceCli({
      project,
      step: 'update',
      ministack: throughProxy,
      logName: 'fail-release'
    });
    expect(failedRelease.exitCode, failedRelease.tail).not.toBe(0);
    expect(rejected).toBeGreaterThan(0);
    fault = undefined;
    expect((await state()).map(({ tags }) => tags['stp:code-digest'])).toEqual(['updating', 'updating']);
    expect(await releaseKeys()).toEqual(releasesBefore);
    const retry = await runSourceCli({ project, step: 'update', ministack, logName: 'retry-release' });
    expect(retry.exitCode, retry.tail).toBe(0);
    expect((await releaseKeys()).length).toBe(releasesBefore.length + 1);
    expect(
      (await state()).every(
        ({ tags }) => tags['stp:code-digest'] !== 'updating' && tags['stp:shared-layers'] !== 'updating'
      )
    ).toBe(true);
    const converged = await state();
    const unchanged = await runSourceCli({ project, step: 'unchanged', ministack });
    expect(unchanged.exitCode, unchanged.tail).toBe(0);
    expect(await state()).toEqual(converged);
    expect((await releaseKeys()).length).toBe(releasesBefore.length + 1);
  } finally {
    fault = undefined;
    try {
      if (deployed) {
        const deleted = await runSourceCli({ project, step: 'delete', ministack });
        expect(deleted.exitCode, deleted.tail).toBe(0);
      }
    } finally {
      proxy.stop(true);
      cloudFormation.destroy();
      lambda.destroy();
      s3.destroy();
      await project.close();
      await ministack.stop();
      await rm(out, { recursive: true, force: true });
    }
  }
}, 600_000);
