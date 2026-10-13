import { afterAll, beforeAll, expect, test } from 'bun:test';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import {
  CreateBucketCommand,
  type DeleteObjectsCommandInput,
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutBucketVersioningCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
import { AwsS3, type S3SyncInfo } from '../../src/aws/s3';
import { S3Sync } from '../../src/aws/s3-sync';
import { startControlPlaneFake, type ControlPlaneFake } from '../cli-process/control-plane-fake';
import { buildOfflineQualificationEnvironment } from '../../scripts/qualification/offline-aws';
import { assertProcessSucceeded, runProcess } from '../../scripts/qualification/process';
import { ensureDevCliArtifacts } from '../../scripts/qualification/source-cli-packaging';
import {
  createFamilyProject,
  describeStackResources,
  runSourceCli,
  STAGE,
  writeProjectFiles,
  type FamilyProject
} from '../ministack/harness';

const cliRoot = resolve(import.meta.dir, '../..');
const buildHelpers = async (bundled: boolean) => {
  assertProcessSucceeded(
    await runProcess({
      command: process.execPath,
      args: [
        'run',
        join(cliRoot, 'scripts/package-helper-lambdas.ts'),
        '--dev',
        ...(bundled ? ['--bundle-aws-sdk'] : [])
      ],
      cwd: cliRoot,
      timeoutMs: 120_000
    })
  );
};
let helpersPrepared = false;
let ministack: MiniStack;
beforeAll(async () => {
  await ensureDevCliArtifacts();
  // The deploy harness needs a self-contained helper in MiniStack's local Lambda runtime.
  // Restore normal development artifacts in teardown, including when startup or a scenario fails.
  helpersPrepared = true;
  await buildHelpers(true);
  ministack = await startMiniStack({ label: 't14-static-content' });
}, 180_000);
afterAll(async () => {
  try {
    await ministack?.stop();
  } finally {
    if (helpersPrepared) await buildHelpers(false);
  }
}, 120_000);

const capability = (client: S3Client, sync: S3Sync) =>
  new AwsS3({
    createClient: () => client,
    createAcceleratedClient: () => client,
    createSyncClient: () => sync,
    createAcceleratedSyncClient: () => sync,
    getErrorHandler: (message) => (cause) => {
      throw new Error(message, { cause });
    }
  });

const readObject = async (client: S3Client, bucket: string, key: string) => {
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return {
    body: await object.Body!.transformToString(),
    cacheControl: object.CacheControl,
    contentType: object.ContentType,
    metadata: object.Metadata
  };
};
const keys = async (client: S3Client, bucket: string) =>
  (await client.send(new ListObjectsV2Command({ Bucket: bucket }))).Contents?.map((object) => object.Key).sort() ?? [];

test('directory sync stores headers, tags and bytes, preserves optional removals and restores an old version', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-static-sync-'));
  const config = ministack.clientConfig(ministack.account());
  const client = new S3Client(config);
  const sync = new S3Sync({ clientArgs: config, s3Plugins: [] });
  const s3 = capability(client, sync);
  const bucket = 'static-content';
  const progressUpdates: S3SyncInfo[] = [];
  let releaseUpload = () => {};
  const firstProgress = new Promise<void>((resolveProgress) => {
    releaseUpload = resolveProgress;
  });
  // A real upload stays active until its first progress callback. The deadline releases it for a fault run
  // with callbacks removed, so that run fails an assertion and still completes normal fixture cleanup.
  let progressDeadline: ReturnType<typeof setTimeout> | undefined;
  sync.s3.middlewareStack.add(
    (next, context) => async (args) => {
      if (context.commandName === 'PutObjectCommand') await firstProgress;
      return next(args);
    },
    { step: 'initialize', name: 'waitForFirstUploadProgress' }
  );

  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    await client.send(
      new PutBucketVersioningCommand({ Bucket: bucket, VersioningConfiguration: { Status: 'Enabled' } })
    );
    await mkdir(join(root, 'static'));
    await writeFile(join(root, 'index.html'), '<h1>Release one</h1>');
    await writeFile(join(root, 'static/app.js'), 'console.log("release one");');
    await writeFile(join(root, 'static/app.js.map'), 'excluded source map');
    await writeFile(join(root, 'removed.html'), 'remove me');
    const uploadConfiguration = {
      directoryPath: root,
      disableS3TransferAcceleration: true,
      headersPreset: 'single-page-app' as const,
      excludeFilesPatterns: ['**/*.map'],
      fileOptions: [
        {
          includePattern: '**/*.html',
          excludePattern: 'removed.html',
          headers: [
            { key: 'cache-control', value: 'no-cache' },
            { key: 'x-stacktape-origin', value: 'static' }
          ],
          tags: [{ key: 'release channel', value: 'v4/preview' }]
        }
      ]
    };
    progressDeadline = setTimeout(() => releaseUpload(), 2_000);
    const completedUpload = await s3.syncDirectory({
      bucketName: bucket,
      uploadConfiguration,
      deleteRemoved: true,
      onProgress(info) {
        progressUpdates.push({ ...info });
        releaseUpload();
      }
    });
    clearTimeout(progressDeadline);
    expect(progressUpdates.some(({ activeTransfers, progressTotal }) => activeTransfers > 0 && progressTotal > 0)).toBe(
      true
    );
    expect(
      progressUpdates.every(({ progressPercent }) => Number(progressPercent) >= 0 && Number(progressPercent) <= 100)
    ).toBe(true);
    expect(completedUpload).toMatchObject({
      activeTransfers: 0,
      filesFound: 3,
      progressAmount: 56,
      progressTotal: 56,
      progressPercent: '100.00'
    });
    expect(await keys(client, bucket)).toEqual(['index.html', 'removed.html', 'static/app.js']);
    expect(await readObject(client, bucket, 'index.html')).toEqual({
      body: '<h1>Release one</h1>',
      cacheControl: 'no-cache',
      contentType: 'text/html',
      metadata: { 'x-stacktape-origin': 'static' }
    });
    expect(await readObject(client, bucket, 'static/app.js')).toMatchObject({
      body: 'console.log("release one");',
      cacheControl: 'public, max-age=31536000, immutable',
      contentType: 'text/javascript'
    });
    expect((await readObject(client, bucket, 'removed.html')).cacheControl).toBe(
      'public, max-age=0, s-maxage=31536000, must-revalidate'
    );
    expect((await client.send(new GetObjectTaggingCommand({ Bucket: bucket, Key: 'index.html' }))).TagSet).toEqual([
      { Key: 'release channel', Value: 'v4/preview' }
    ]);
    const oldVersions = await s3.listObjectVersions(bucket);
    const oldIndex = oldVersions.find((object) => object.Key === 'index.html')!;

    // Changed bytes, a new object, and a removed file are observed independently through the SDK.
    await writeFile(join(root, 'index.html'), '<h1>Release two</h1>');
    await writeFile(join(root, 'new.html'), 'new page');
    await rm(join(root, 'removed.html'));
    await s3.syncDirectory({ bucketName: bucket, uploadConfiguration, deleteRemoved: false, onProgress() {} });
    expect(await keys(client, bucket)).toEqual(['index.html', 'new.html', 'removed.html', 'static/app.js']);
    expect((await readObject(client, bucket, 'index.html')).body).toBe('<h1>Release two</h1>');
    await s3.syncDirectory({ bucketName: bucket, uploadConfiguration, deleteRemoved: true, onProgress() {} });
    expect(await keys(client, bucket)).toEqual(['index.html', 'new.html', 'static/app.js']);
    await expect(client.send(new GetObjectCommand({ Bucket: bucket, Key: 'removed.html' }))).rejects.toMatchObject({
      name: 'NoSuchKey'
    });
    // Same bytes still need new header and tag values on a later sync.
    uploadConfiguration.fileOptions[0].headers[0].value = 'max-age=60';
    uploadConfiguration.fileOptions[0].tags[0].value = 'v4/stable';
    await s3.syncDirectory({ bucketName: bucket, uploadConfiguration, deleteRemoved: true, onProgress() {} });
    expect(await readObject(client, bucket, 'index.html')).toMatchObject({
      body: '<h1>Release two</h1>',
      cacheControl: 'max-age=60',
      metadata: { 'x-stacktape-origin': 'static' }
    });
    expect((await client.send(new GetObjectTaggingCommand({ Bucket: bucket, Key: 'index.html' }))).TagSet).toEqual([
      { Key: 'release channel', Value: 'v4/stable' }
    ]);

    await s3.restoreObjectVersion({ bucketName: bucket, key: 'index.html', versionId: oldIndex.VersionId! });
    expect(await readObject(client, bucket, 'index.html')).toEqual({
      body: '<h1>Release one</h1>',
      cacheControl: 'no-cache',
      contentType: 'text/html',
      metadata: { 'x-stacktape-origin': 'static' }
    });
  } finally {
    clearTimeout(progressDeadline);
    releaseUpload();
    sync.s3.destroy();
    client.destroy();
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);

test('the CLI installs a nested static project dependency before building its deep page and asset', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-static-package-'));
  const account = ministack.account();
  const home = join(root, 'home');
  try {
    await mkdir(join(home, 'tmp'), { recursive: true });
    await cp(join(import.meta.dir, 'fixtures/site'), join(root, 'frontend'), { recursive: true });
    await mkdir(join(root, 'dependency'));
    await writeFile(
      join(root, 'dependency/package.json'),
      JSON.stringify({ name: 'static-site-marker', version: '1.0.0', type: 'module', exports: './index.js' })
    );
    await writeFile(join(root, 'dependency/index.js'), "export const marker = 'nested-dependency-installed';");
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'static-package', private: true }));
    await writeFile(
      join(root, 'package-lock.json'),
      JSON.stringify({ name: 'static-package', lockfileVersion: 3, packages: { '': { name: 'static-package' } } })
    );
    await writeFile(
      join(root, 'frontend/package.json'),
      JSON.stringify({
        name: 'static-frontend',
        private: true,
        type: 'module',
        dependencies: { 'static-site-marker': 'file:../dependency' },
        scripts: { 'prepare-site': 'bun prepare.ts', build: 'bun build.ts' }
      })
    );
    await writeFile(
      join(root, 'frontend/package-lock.json'),
      JSON.stringify({
        name: 'static-frontend',
        lockfileVersion: 3,
        packages: {
          '': { name: 'static-frontend', dependencies: { 'static-site-marker': 'file:../dependency' } },
          '../dependency': { name: 'static-site-marker', version: '1.0.0' },
          'node_modules/static-site-marker': { resolved: '../dependency', link: true }
        }
      })
    );
    // npm only installs the local dependency. A miss cannot reach the package registry.
    await writeFile(join(root, '.npmrc'), 'registry=http://127.0.0.1:1\n');
    await writeFile(join(root, 'frontend/.npmrc'), 'registry=http://127.0.0.1:1\n');
    await writeFile(
      join(root, 'frontend/src/app.ts'),
      "import { marker } from 'static-site-marker'; import { release } from './release'; document.body.dataset.release = release; document.body.dataset.marker = marker;"
    );
    await writeFile(
      join(root, 'stacktape.yml'),
      `resources:
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: frontend/dist
      hostingContentType: static-website
      build:
        workingDirectory: frontend
        command: bun run prepare-site && bun run build
`
    );
    const result = await runProcess({
      command: process.execPath,
      args: [
        '--preload',
        join(cliRoot, 'tests/ministack/offline-preload.ts'),
        join(cliRoot, 'scripts/dev.ts'),
        'package',
        '--stage',
        'local',
        '--projectName',
        'staticpackage',
        '--region',
        ministack.region,
        '--currentWorkingDirectory',
        root,
        '--outputFormat',
        'jsonl'
      ],
      cwd: cliRoot,
      env: {
        ...buildOfflineQualificationEnvironment({
          endpoint: ministack.endpoint,
          invocationId: 'static-package',
          homeDirectory: home
        }),
        ...ministack.childEnvironment(account),
        MINISTACK_ENDPOINT: ministack.endpoint,
        MINISTACK_ACCESS_KEY_ID: account.credentials.accessKeyId,
        MINISTACK_SECRET_ACCESS_KEY: account.credentials.secretAccessKey
      },
      timeoutMs: 60_000
    });
    assertProcessSucceeded(result);
    expect(await readFile(join(root, 'frontend/dist/docs/getting-started/index.html'), 'utf8')).toContain(
      '<h1>Getting started</h1>'
    );
    const asset = await readFile(join(root, 'frontend/dist/static/app.js'), 'utf8');
    expect(asset).toContain('static-release-one');
    expect(asset).toContain('nested-dependency-installed');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 90_000);

test('direct bucket sync runs without a usable config, updates content and deletes removed files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-static-cli-'));
  const account = ministack.account();
  const client = new S3Client(ministack.clientConfig(account, { region: 'eu-north-1' }));
  let controlPlane: ControlPlaneFake | undefined;
  const bucket = 'direct-static-content';
  const home = join(root, 'home');
  const env = {
    ...buildOfflineQualificationEnvironment({
      endpoint: ministack.endpoint,
      invocationId: 'static-sync',
      homeDirectory: home
    }),
    ...ministack.childEnvironment(account, { region: 'eu-north-1' }),
    MINISTACK_ENDPOINT: ministack.endpoint,
    MINISTACK_ACCESS_KEY_ID: account.credentials.accessKeyId,
    MINISTACK_SECRET_ACCESS_KEY: account.credentials.secretAccessKey,
    STP_CUSTOM_TRPC_API_ENDPOINT: undefined
  };
  const runSync = (source = relative(cliRoot, join(root, 'dist'))) =>
    runProcess({
      command: process.execPath,
      args: [
        '--preload',
        join(cliRoot, 'tests/ministack/offline-preload.ts'),
        join(cliRoot, 'scripts/dev.ts'),
        'bucket:sync',
        '--bucketId',
        bucket,
        '--sourcePath',
        source,
        '--headersPreset',
        'single-page-app',
        '--region',
        'eu-north-1',
        '--awsAccount',
        'cli-process-account',
        '--currentWorkingDirectory',
        root,
        '--outputFormat',
        'jsonl'
      ],
      cwd: cliRoot,
      env,
      timeoutMs: 60_000
    });
  try {
    controlPlane = await startControlPlaneFake({ projectName: 'staticsite', awsAccountId: account.accountId });
    env.STP_CUSTOM_TRPC_API_ENDPOINT = controlPlane.endpoint;
    await mkdir(join(home, 'tmp'), { recursive: true });
    await mkdir(join(root, 'dist/static'), { recursive: true });
    await writeFile(join(root, 'stacktape.ts'), 'throw new Error("Direct bucket sync must not load configuration");');
    await writeFile(join(root, 'dist/index.html'), '<h1>Direct release one</h1>');
    await writeFile(join(root, 'dist/static/old.js'), 'old asset');
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    assertProcessSucceeded(await runSync());
    expect(await readObject(client, bucket, 'index.html')).toMatchObject({
      body: '<h1>Direct release one</h1>',
      cacheControl: 'public, max-age=0, s-maxage=31536000, must-revalidate'
    });
    expect(await keys(client, bucket)).toEqual(['index.html', 'static/old.js']);
    await writeFile(join(root, 'dist/index.html'), '<h1>Direct release two</h1>');
    await writeFile(join(root, 'dist/static/new.js'), 'new asset');
    await rm(join(root, 'dist/static/old.js'));
    assertProcessSucceeded(await runSync());
    expect((await readObject(client, bucket, 'index.html')).body).toBe('<h1>Direct release two</h1>');
    expect(await keys(client, bucket)).toEqual(['index.html', 'static/new.js']);
    const missing = await runSync(relative(cliRoot, join(root, 'missing')));
    expect(missing.exitCode).toBe(1);
    expect(missing.stdout).toContain('SYNC_BUCKET_DIRECTORY_INACCESSIBLE');
    expect(await keys(client, bucket)).toEqual(['index.html', 'static/new.js']);
  } finally {
    await controlPlane?.close();
    client.destroy();
    await rm(root, { recursive: true, force: true });
  }
}, 180_000);

test('configured bucket sync resolves the deployed resource and source directory without touching another bucket', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-static-configured-'));
  const client = new S3Client(ministack.clientConfig());
  const cloudFormation = new CloudFormationClient(ministack.clientConfig());
  let project: FamilyProject | undefined;
  try {
    project = await createFamilyProject({ familyName: 'static-configured', out: root, ministack });
    await writeProjectFiles(project, {
      'stacktape.yml': `resources:
  website:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: public
        headersPreset: static-website
        disableS3TransferAcceleration: true
  unrelated:
    type: bucket
`,
      'public/index.html': '<h1>Deployed baseline</h1>',
      'public/removed.html': 'old configured page'
    });
    const deployed = await runSourceCli({ project, step: 'create', ministack });
    expect(deployed.exitCode, deployed.tail).toBe(0);
    const resources = await describeStackResources(cloudFormation, project.stackName);
    const bucket = resources?.find(
      ({ LogicalResourceId }) => LogicalResourceId === 'WebsiteBucket'
    )?.PhysicalResourceId;
    const unrelatedBucket = resources?.find(
      ({ LogicalResourceId }) => LogicalResourceId === 'UnrelatedBucket'
    )?.PhysicalResourceId;
    expect(bucket).toBeDefined();
    expect(unrelatedBucket).toBeDefined();
    await client.send(
      new PutObjectCommand({ Bucket: unrelatedBucket!, Key: 'keep.txt', Body: 'other resource content' })
    );
    await writeProjectFiles(project, {
      'public/index.html': '<h1>Configured sync update</h1>',
      'public/added.html': 'new configured page'
    });
    await rm(join(project.directory, 'public/removed.html'));
    const account = ministack.defaultAccount;
    const result = await runProcess({
      command: process.execPath,
      args: [
        '--preload',
        join(cliRoot, 'tests/ministack/offline-preload.ts'),
        join(cliRoot, 'scripts/dev.ts'),
        'bucket:sync',
        '--stage',
        STAGE,
        '--resourceName',
        'website',
        '--projectName',
        project.projectName,
        '--region',
        ministack.region,
        '--awsAccount',
        'cli-process-account',
        '--currentWorkingDirectory',
        project.directory,
        '--outputFormat',
        'jsonl'
      ],
      cwd: cliRoot,
      env: {
        ...buildOfflineQualificationEnvironment({
          endpoint: ministack.endpoint,
          invocationId: 'configured-static-sync',
          homeDirectory: project.home
        }),
        ...ministack.childEnvironment(account),
        MINISTACK_ENDPOINT: ministack.endpoint,
        MINISTACK_ACCESS_KEY_ID: account.credentials.accessKeyId,
        MINISTACK_SECRET_ACCESS_KEY: account.credentials.secretAccessKey,
        STP_SKIP_COST_DISCOVERY: '1',
        STP_CUSTOM_TRPC_API_ENDPOINT: project.controlPlane.endpoint
      },
      timeoutMs: 60_000
    });
    assertProcessSucceeded(result);
    expect(await readObject(client, bucket!, 'index.html')).toMatchObject({
      body: '<h1>Configured sync update</h1>',
      cacheControl: 'public, max-age=0, s-maxage=31536000, must-revalidate'
    });
    expect(await keys(client, bucket!)).toEqual(['added.html', 'index.html']);
    expect(await keys(client, unrelatedBucket!)).toEqual(['keep.txt']);
    expect((await readObject(client, unrelatedBucket!, 'keep.txt')).body).toBe('other resource content');
  } finally {
    try {
      await project?.close();
    } finally {
      cloudFormation.destroy();
      client.destroy();
      await rm(root, { recursive: true, force: true });
    }
  }
}, 180_000);

test('listing and batch deletion reach every object version and delete marker beyond the first page', async () => {
  const config = ministack.clientConfig(ministack.account());
  const client = new S3Client(config);
  const sync = new S3Sync({ clientArgs: config, s3Plugins: [] });
  // MiniStack 1.5.26 accepts oversized batches. Inject AWS's documented rejection; valid requests still
  // reach the emulator, and the assertion below observes that every stored version and marker was deleted.
  client.middlewareStack.add(
    (next, context) => async (args) => {
      if (context.commandName === 'DeleteObjectsCommand') {
        const input = args.input as DeleteObjectsCommandInput;
        if ((input.Delete?.Objects?.length ?? 0) > 1000) {
          throw new Error('Injected S3 rejection: DeleteObjects accepts at most 1000 identifiers.');
        }
      }
      return next(args);
    },
    { step: 'initialize', name: 'rejectOversizedS3DeleteBatch' }
  );
  const s3 = capability(client, sync);
  const bucket = 'paged-static-content';
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    await client.send(
      new PutBucketVersioningCommand({ Bucket: bucket, VersioningConfiguration: { Status: 'Enabled' } })
    );
    // 1,001 distinct keys exercise both object and version pagination and the service's delete batch boundary.
    for (let start = 0; start < 1001; start += 25) {
      await Promise.all(
        Array.from({ length: Math.min(25, 1001 - start) }, (_, offset) =>
          client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: `page-${String(start + offset).padStart(4, '0')}`,
              Body: 'page'
            })
          )
        )
      );
    }
    expect((await client.send(new ListObjectsV2Command({ Bucket: bucket }))).IsTruncated).toBe(true);
    const objects = await s3.listObjects(bucket);
    expect(objects).toHaveLength(1001);
    expect(objects.at(-1)?.Key).toBe('page-1000');
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: 'page-0000' }));
    // The 1,000th version is now the newest page-0998; its older versions are on the next page.
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: 'page-0998', Body: 'updated once' }));
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: 'page-0998', Body: 'updated twice' }));
    expect((await client.send(new ListObjectVersionsCommand({ Bucket: bucket }))).IsTruncated).toBe(true);
    const versions = await s3.listObjectVersions(bucket);
    expect(versions).toHaveLength(1004);
    expect(
      new Set(versions.filter((object) => object.Key === 'page-0998').map((object) => object.VersionId)).size
    ).toBe(3);
    expect(versions.filter((object) => object.Key === 'page-0000')).toHaveLength(2);
    await s3.deleteObjects(bucket, [{ Key: '' }, ...versions.map(({ Key, VersionId }) => ({ Key, VersionId }))]);
    expect(await s3.listObjects(bucket)).toEqual([]);
    expect((await client.send(new ListObjectVersionsCommand({ Bucket: bucket }))).Versions ?? []).toEqual([]);
    expect((await client.send(new ListObjectVersionsCommand({ Bucket: bucket }))).DeleteMarkers ?? []).toEqual([]);
  } finally {
    sync.s3.destroy();
    client.destroy();
  }
}, 120_000);
