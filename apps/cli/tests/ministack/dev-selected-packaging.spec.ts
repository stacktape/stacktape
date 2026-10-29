/**
 * A dev session that leaves functions out does not build them: the dev stack keeps the code they run. The source CLI
 * runs `dev --agent` against MiniStack four times on one project of three functions, and the real SDK observes what
 * each function runs and what the dev stack's template names.
 *
 * Run through `pnpm --filter @stacktape/cli run test:ministack:deploy tests/ministack/dev-selected-packaging.spec.ts`,
 * which builds the helper Lambdas the emulator runs.
 */
import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer, type AddressInfo } from 'node:net';
import { join } from 'node:path';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { startMiniStack, type MiniStack } from '@stacktape/ministack/fixture';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { withPersistedApiKey } from '../../src/app/global-state-manager/api-key-storage';
import { parseYaml } from '../../src/utils/yaml';
// oxlint-disable-next-line import/no-unassigned-import
import './offline-preload';
import {
  cliRoot,
  createFamilyProject,
  getStackTemplate,
  runSourceCliCommand,
  writeProjectFiles,
  type FamilyProject
} from './harness';

const out = join(
  cliRoot,
  '.stacktape',
  'ministack',
  `dev-selected-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`
);
const FUNCTIONS = ['api', 'worker', 'mailer'] as const;

let ministack: MiniStack;
let lambda: LambdaClient;
let cloudFormation: CloudFormationClient;
let s3: S3Client;
let project: FamilyProject;

const handler = (name: string, version: string) =>
  `export default async () => ({ statusCode: 200, body: "${name}-${version}" });\n`;
/** Fails to bundle: the import does not exist. */
const brokenHandler = `import { missing } from './does-not-exist';\nexport default async () => missing;\n`;

const config = ({ apiMemory }: { apiMemory: number }) =>
  `resources:\n${FUNCTIONS.map(
    (name) =>
      `  ${name}:\n    type: function\n    properties:\n      packaging:\n        type: js-bundle\n        properties:\n          entryfilePath: ${name}.ts\n      memory: ${name === 'api' ? apiMemory : 256}\n`
  ).join('')}`;

/**
 * `dev --agent` starts its session in a daemon, which reads the API key `stacktape login` stores; the parent consumes
 * `STACKTAPE_API_KEY` and does not pass it on. The key is the offline placeholder the control-plane fake accepts.
 */
const DEV_ENV = { STACKTAPE_CREDENTIAL_STORE: 'file' };
const storeApiKey = async (target: FamilyProject) => {
  await mkdir(join(target.home, '.stacktape'), { recursive: true });
  await writeFile(
    join(target.home, '.stacktape', 'persisted-state.json'),
    JSON.stringify(
      withPersistedApiKey({
        persistedState: { systemId: 'ministack-dev-selected', cliArgsDefaults: {}, otherDefaults: {} },
        apiKey: 'offline-qualification-do-not-use',
        endpoint: target.controlPlane.endpoint
      })
    )
  );
};

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => resolve(port));
    });
  });

const invoke = async (name: string) => {
  const result = await lambda.send(
    new InvokeCommand({
      FunctionName: awsResourceNames.lambda(name, project.stackName),
      Payload: Buffer.from('{}')
    })
  );
  assert.equal(result.FunctionError, undefined, `${name} failed: ${Buffer.from(result.Payload ?? []).toString()}`);
  return (JSON.parse(Buffer.from(result.Payload!).toString()) as { body?: string }).body;
};

const deployedCodeKeys = async () => {
  const template = parseYaml(await getStackTemplate(cloudFormation, project.stackName)) as {
    Resources: Record<string, { Properties?: { Code?: { S3Key?: string } } }>;
  };
  return Object.fromEntries(
    FUNCTIONS.map((name) => [name, template.Resources[cfLogicalNames.lambda(name)]?.Properties?.Code?.S3Key])
  );
};

type Status = {
  ready?: boolean;
  workloads?: { name: string; status?: string }[];
  functionsNotInSession?: { name: string; codeDeployedAt?: string; message: string }[];
};

/** Starts a session, reads its status and stops it. */
const runSession = async (logName: string, resources: string) => {
  const port = await freePort();
  const started = await runSourceCliCommand({
    project,
    ministack,
    logName,
    args: ['dev', '--agent', '--agentPort', String(port), '--resources', resources],
    env: DEV_ENV
  });
  const startMs = started.ms;
  let status: Status | undefined;
  try {
    assert.equal(started.exitCode, 0, `dev ${logName} failed:\n${`${started.stdout}\n${started.stderr}`.slice(-4000)}`);
    const tokenFile = /"tokenFile":"([^"]+)"/.exec(started.stdout)?.[1];
    assert.ok(tokenFile, 'the start reports the agent token file');
    const token = (await readFile(tokenFile.replaceAll('\\\\', '\\'), 'utf8')).trim();
    const response = await fetch(`http://127.0.0.1:${port}/status?verbose=true`, {
      headers: { authorization: `Bearer ${token}` }
    });
    status = ((await response.json()) as { data?: Status }).data;
  } finally {
    const stopped = await runSourceCliCommand({
      project,
      ministack,
      logName: `${logName}-stop`,
      args: ['dev:stop', '--agentPort', String(port)],
      env: DEV_ENV,
      targetArgs: false
    });
    assert.equal(stopped.exitCode, 0, `dev:stop after ${logName} failed:\n${stopped.stdout.slice(-2000)}`);
  }
  return { startMs, status: status!, output: started.stdout };
};

beforeAll(async () => {
  await assert.rejects(fetch('https://sts.amazonaws.com/'), /Tests cannot access external network target/);
  await mkdir(out, { recursive: true });
  ministack = await startMiniStack({ label: 'dev-selected' });
  lambda = new LambdaClient(ministack.clientConfig());
  cloudFormation = new CloudFormationClient(ministack.clientConfig());
  s3 = new S3Client({ ...ministack.clientConfig(), forcePathStyle: true });
  project = await createFamilyProject({ familyName: 'devselected', out, ministack });
  await storeApiKey(project);
}, 180_000);

afterAll(async () => {
  try {
    lambda?.destroy();
    cloudFormation?.destroy();
    s3?.destroy();
    await project?.close();
    await writeFile(join(out, 'ministack.log'), ministack?.logs() ?? '');
  } finally {
    await ministack?.stop();
  }
});

describe('a dev session builds only the functions it runs', () => {
  const timings: Record<string, number> = {};

  test('create with every function, then sessions that leave functions out keep their code', async () => {
    // 1. A new dev stack with all three functions.
    await writeProjectFiles(project, {
      'stacktape.yml': config({ apiMemory: 256 }),
      ...Object.fromEntries(FUNCTIONS.map((name) => [`${name}.ts`, handler(name, 'v1')]))
    });
    const created = await runSession('create-all', 'all');
    timings.createAll = created.startMs;
    expect(created.status.functionsNotInSession).toBeUndefined();
    for (const name of FUNCTIONS) expect(await invoke(name)).toBe(`${name}-v1`);
    const createdKeys = await deployedCodeKeys();

    // 2. worker is broken and left out, with mailer: the selection changes, so the dev stack updates without them.
    await writeProjectFiles(project, { 'worker.ts': brokenHandler });
    const subset = await runSession('subset-broken-worker', 'api');
    timings.subsetUpdate = subset.startMs;
    expect(subset.status.ready).toBe(true);
    expect(subset.status.functionsNotInSession?.map(({ name }) => name).toSorted()).toEqual(['mailer', 'worker']);
    for (const entry of subset.status.functionsNotInSession ?? []) {
      expect(entry.message).toMatch(/^not in this session; runs the code deployed at \d{4}-\d\d-\d\dT\d\d:\d\dZ/);
      expect(entry.codeDeployedAt).toBeDefined();
    }
    expect(subset.output).toContain('Functions not in this session keep running their deployed code');
    expect(await invoke('worker')).toBe('worker-v1');
    expect(await invoke('mailer')).toBe('mailer-v1');
    const subsetKeys = await deployedCodeKeys();
    expect({ worker: subsetKeys.worker, mailer: subsetKeys.mailer }).toEqual({
      worker: createdKeys.worker,
      mailer: createdKeys.mailer
    });

    // 3. mailer is edited while it is left out, and a change to api updates the dev stack: mailer keeps v1, and
    // status says it runs the earlier code.
    await writeProjectFiles(project, {
      'stacktape.yml': config({ apiMemory: 512 }),
      'mailer.ts': handler('mailer', 'v2')
    });
    const edited = await runSession('subset-edited-mailer', 'api');
    timings.subsetConfigUpdate = edited.startMs;
    expect(await invoke('mailer')).toBe('mailer-v1');
    expect((await deployedCodeKeys()).mailer).toBe(createdKeys.mailer);
    // Cleanup after each update leaves the stored code that the kept functions' template still names.
    const stored = ((await s3.send(new ListObjectsV2Command({ Bucket: project.deploymentBucket }))).Contents ?? []).map(
      ({ Key }) => Key
    );
    expect(stored).toEqual(expect.arrayContaining([createdKeys.mailer, createdKeys.worker]));
    expect(edited.status.functionsNotInSession?.find(({ name }) => name === 'mailer')?.message).toMatch(
      /may differ from your current source/
    );

    // 4. Selecting them again builds and deploys their current source.
    await writeProjectFiles(project, { 'worker.ts': handler('worker', 'v2') });
    const all = await runSession('select-all-again', 'all');
    timings.selectAllAgain = all.startMs;
    expect(all.status.functionsNotInSession).toBeUndefined();
    expect(await invoke('worker')).toBe('worker-v2');
    expect(await invoke('mailer')).toBe('mailer-v2');
    console.log('dev start timings (ms)', timings);
  }, 900_000);

  test('a broken function left out of a new dev stack fails the first create and says why it was built', async () => {
    const fresh = await createFamilyProject({ familyName: 'devselectedfresh', out, ministack });
    await storeApiKey(fresh);
    const previous = project;
    project = fresh;
    try {
      await writeProjectFiles(project, {
        'stacktape.yml': config({ apiMemory: 256 }),
        'api.ts': handler('api', 'v1'),
        'mailer.ts': handler('mailer', 'v1'),
        'worker.ts': brokenHandler
      });
      const port = await freePort();
      const started = await runSourceCliCommand({
        project,
        ministack,
        logName: 'fresh-broken-worker',
        args: ['dev', '--agent', '--agentPort', String(port), '--resources', 'api'],
        env: DEV_ENV
      });
      expect(started.exitCode).not.toBe(0);
      expect(`${started.stdout}\n${started.stderr}`).toContain(
        '`worker` is not in this session, but the dev stack has no code for it yet'
      );
    } finally {
      project = previous;
      await fresh.close();
    }
  }, 300_000);
});
