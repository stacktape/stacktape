/**
 * A project config that declares `projectName` and `region` is the target of commands run inside the project, so they
 * need only `--stage`. The source CLI runs as a child process against the control-plane fake and a loopback AWS fake
 * that records the region each request is signed for and the stack it names; every scenario stops at a stack that does
 * not exist, or earlier. Nothing contacts AWS: the network guard is preloaded and the fake refuses writes.
 */
import { afterAll, afterEach, beforeAll, describe, expect, test as bunTest } from 'bun:test';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildOperationsCli } from '../../scripts/operations/cli-process';
import { startControlPlaneFake, type ControlPlaneFake } from './control-plane-fake';

/** Each scenario starts the source CLI as a child process, which takes several seconds. */
const test = (name: string, fn: () => Promise<void>) => bunTest(name, fn, 120_000);

const cliRoot = resolve(import.meta.dir, '..', '..');
const ACCOUNT = '444444444444';
const ACCESS_KEY = 'ASIAFAKESETTINGS';
const SETTINGS_CONFIG = `import { Bucket, defineConfig } from 'stacktape';

export default defineConfig({ projectName: 'cfgproj', region: 'eu-central-1' }, ({ projectName, region }) => ({
  resources: { uploads: new Bucket({}) },
  variables: { target: \`\${projectName}/\${region}\` }
}));
`;

// Built once from the real entrypoint, so each scenario can start the CLI inside its own project directory.
let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 120_000);
afterAll(() => cli?.close());

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

type AwsRequest = { action: string; region: string; stackName?: string };

/** Answers GetCallerIdentity and reports every stack as missing. Any other request is refused and recorded. */
const startAwsFake = async () => {
  const requests: AwsRequest[] = [];
  const server = createServer(async (request: IncomingMessage, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks).toString('utf8');
    const parameters = new URLSearchParams(body);
    const target = request.headers['x-amz-target'];
    const action = parameters.get('Action') ?? (typeof target === 'string' ? target.split('.').at(-1)! : 'unknown');
    const region = /Credential=[^/]+\/\d+\/([^/]+)\//.exec(request.headers.authorization ?? '')?.[1] ?? 'unsigned';
    requests.push({
      action,
      region,
      ...(parameters.get('StackName') ? { stackName: parameters.get('StackName')! } : {})
    });
    if (action === 'GetCallerIdentity') {
      response.writeHead(200, { 'content-type': 'text/xml' });
      response.end(`<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
  <GetCallerIdentityResult><Arn>arn:aws:sts::${ACCOUNT}:assumed-role/stacktape/cli</Arn><UserId>AROAFAKE:cli</UserId><Account>${ACCOUNT}</Account></GetCallerIdentityResult>
  <ResponseMetadata><RequestId>fake</RequestId></ResponseMetadata>
</GetCallerIdentityResponse>`);
      return;
    }
    const missingStack = action === 'DescribeStacks';
    response.writeHead(400, { 'content-type': 'text/xml' });
    response.end(`<ErrorResponse><Error><Type>Sender</Type><Code>${missingStack ? 'ValidationError' : 'AccessDenied'}</Code>
<Message>${missingStack ? `Stack with id ${parameters.get('StackName')} does not exist` : `The AWS fake refuses ${action}.`}</Message></Error><RequestId>fake</RequestId></ErrorResponse>`);
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('The AWS fake did not bind a TCP port.');
  cleanups.push(
    () =>
      new Promise<void>((done) => {
        server.close(() => done());
        server.closeAllConnections();
      })
  );
  return { endpoint: `http://127.0.0.1:${address.port}`, requests };
};

const startConsole = async (projectName = 'cfgproj') => {
  const controlPlane = await startControlPlaneFake({
    projectName,
    connectedAwsAccounts: [{ name: 'settings', awsAccountId: ACCOUNT, connectionMode: 'PRIVILEGED' }],
    awsAccountCredentials: { settings: { accessKeyId: ACCESS_KEY, secretAccessKey: 'fake' } }
  });
  cleanups.push(controlPlane.close);
  return controlPlane;
};

/** An isolated HOME with a project directory; `files` are written relative to the project. */
const createHome = async ({
  files,
  awsConfig = '',
  persistedDefaults
}: {
  files: Record<string, string>;
  awsConfig?: string;
  persistedDefaults?: Record<string, string>;
}) => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-config-settings-'));
  cleanups.push(() => rm(home, { recursive: true, force: true }));
  const project = join(home, 'project');
  await mkdir(join(home, '.aws'), { recursive: true });
  await mkdir(project, { recursive: true });
  await writeFile(join(home, '.aws', 'config'), awsConfig);
  for (const [name, content] of Object.entries(files)) {
    await mkdir(join(project, name, '..'), { recursive: true });
    await writeFile(join(project, name), content);
  }
  if (persistedDefaults) {
    await mkdir(join(home, '.stacktape'), { recursive: true });
    await writeFile(
      join(home, '.stacktape', 'persisted-state.json'),
      JSON.stringify({ systemId: 'config-settings-test', cliArgsDefaults: persistedDefaults, otherDefaults: {} })
    );
  }
  return { home, project };
};

type JsonlRecord = { type?: string; code?: string; message?: string; ok?: boolean };

const runCli = async ({
  home,
  cwd,
  args,
  controlPlane,
  awsEndpoint,
  environment = {}
}: {
  home: string;
  cwd: string;
  args: string[];
  controlPlane: ControlPlaneFake;
  awsEndpoint: string;
  environment?: Record<string, string>;
}) => {
  // These commands never invoke helper Lambdas. An empty artifact directory satisfies the startup inventory.
  await mkdir(join(cwd, '__stacktape-dist', 'dev', 'helper-lambdas'), { recursive: true });
  const child = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      '--preload',
      join(cliRoot, 'scripts', 'network-guard-preload.ts'),
      cli.path,
      ...args,
      '--outputFormat',
      'jsonl'
    ],
    {
      cwd,
      env: {
        PATH: process.env.PATH ?? '',
        HOME: home,
        XDG_CONFIG_HOME: join(home, '.config'),
        XDG_CACHE_HOME: join(home, '.cache'),
        TMPDIR: tmpdir(),
        CI: '1',
        NO_COLOR: '1',
        STP_DEV_MODE: 'true',
        AWS_EC2_METADATA_DISABLED: 'true',
        AWS_ENDPOINT_URL: awsEndpoint,
        STACKTAPE_API_KEY: 'config-settings-fake-do-not-use',
        STP_CUSTOM_TRPC_API_ENDPOINT: controlPlane.endpoint,
        STP_DISABLE_TELEMETRY: '1',
        STP_SKIP_COST_DISCOVERY: '1',
        ...environment
      },
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe'
    }
  );
  const timeout = setTimeout(() => child.kill('SIGKILL'), 100_000);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited
  ]);
  clearTimeout(timeout);
  const records = stdout
    .split('\n')
    .filter((line) => line.trim().startsWith('{'))
    .flatMap((line) => {
      try {
        return [JSON.parse(line) as JsonlRecord];
      } catch {
        return [];
      }
    });
  return { exitCode, output: stdout + stderr, error: records.find((record) => record.ok === false) };
};

const stackReads = (requests: AwsRequest[]) =>
  requests.filter(({ action }) => action === 'DescribeStacks').map(({ region, stackName }) => ({ region, stackName }));
const recordedTargets = (controlPlane: ControlPlaneFake) =>
  controlPlane.calls
    .filter(({ procedure }) => procedure === 'recordStackOperation')
    .map(({ input }) => {
      const { projectName, region, stackName } = input as { projectName?: string; region?: string; stackName?: string };
      return { projectName, region, stackName };
    });

describe('commands inside a project take the project name and region from stacktape.ts', () => {
  for (const [label, args] of [
    ['delete', ['delete', '--stage', 'test', '--yes']],
    ['logs', ['logs', 'uploads', '--stage', 'test']]
  ] as const) {
    test(`${label} needs only --stage`, async () => {
      const controlPlane = await startConsole();
      const aws = await startAwsFake();
      const { home, project } = await createHome({ files: { 'stacktape.ts': SETTINGS_CONFIG } });
      const run = await runCli({
        home,
        cwd: project,
        args: [...args],
        controlPlane,
        awsEndpoint: aws.endpoint
      });

      expect(run.error?.code, run.output).not.toBe('CLI_ARGUMENT_REQUIRED');
      expect(stackReads(aws.requests), run.output).toContainEqual({
        region: 'eu-central-1',
        stackName: 'cfgproj-test'
      });
      expect(
        aws.requests.every(({ region }) => region === 'eu-central-1'),
        run.output
      ).toBe(true);
    });
  }

  test('status needs only --stage', async () => {
    const controlPlane = await startConsole();
    const aws = await startAwsFake();
    const { home, project } = await createHome({ files: { 'stacktape.ts': SETTINGS_CONFIG } });
    const run = await runCli({
      home,
      cwd: project,
      args: ['status', '--stage', 'test'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });

    // `status` reads the stack through the Console, from the arguments it captured.
    expect(controlPlane.calls.find(({ procedure }) => procedure === 'stackDetails')?.input, run.output).toMatchObject({
      stackName: 'cfgproj-test',
      region: 'eu-central-1'
    });
  });

  test('deploy needs only --stage and records the config target before it touches the stack', async () => {
    const controlPlane = await startConsole();
    const aws = await startAwsFake();
    const { home, project } = await createHome({ files: { 'stacktape.ts': SETTINGS_CONFIG } });
    const run = await runCli({
      home,
      cwd: project,
      args: ['deploy', '--stage', 'test', '--yes'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });

    expect(run.error?.code, run.output).not.toBe('CLI_ARGUMENT_REQUIRED');
    expect(recordedTargets(controlPlane), run.output).toContainEqual({
      projectName: 'cfgproj',
      region: 'eu-central-1',
      stackName: 'cfgproj-test'
    });
    expect(stackReads(aws.requests), run.output).toContainEqual({ region: 'eu-central-1', stackName: 'cfgproj-test' });
  });
});

describe('precedence of the target', () => {
  test('the config beats AWS_DEFAULT_REGION, the machine-wide defaults and the profile region', async () => {
    const controlPlane = await startConsole();
    const aws = await startAwsFake();
    const { home, project } = await createHome({
      files: { 'stacktape.ts': SETTINGS_CONFIG },
      awsConfig: '[default]\nregion = ap-southeast-2\n',
      persistedDefaults: { region: 'us-west-2', projectName: 'machine-default' }
    });
    const run = await runCli({
      home,
      cwd: project,
      args: ['delete', '--stage', 'test', '--yes'],
      controlPlane,
      awsEndpoint: aws.endpoint,
      environment: { AWS_DEFAULT_REGION: 'us-east-2' }
    });

    expect(stackReads(aws.requests), run.output).toContainEqual({ region: 'eu-central-1', stackName: 'cfgproj-test' });
  });

  test('flags beat the config', async () => {
    const controlPlane = await startConsole('flagproj');
    const aws = await startAwsFake();
    const { home, project } = await createHome({ files: { 'stacktape.ts': SETTINGS_CONFIG } });
    const run = await runCli({
      home,
      cwd: project,
      args: ['delete', '--stage', 'test', '--yes', '--project', 'flagproj', '--region', 'us-west-1'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });

    expect(stackReads(aws.requests), run.output).toContainEqual({ region: 'us-west-1', stackName: 'flagproj-test' });
  });

  test('without settings in the config, the earlier sources apply in their existing order', async () => {
    const controlPlane = await startConsole('legacyproj');
    const aws = await startAwsFake();
    const { home, project } = await createHome({
      files: { 'stacktape.yml': 'resources:\n  uploads:\n    type: bucket\n' },
      awsConfig: '[default]\nregion = ap-southeast-2\n',
      persistedDefaults: { projectName: 'legacyproj' }
    });
    const profileOnly = await runCli({
      home,
      cwd: project,
      args: ['delete', '--stage', 'test', '--yes'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });
    expect(stackReads(aws.requests), profileOnly.output).toContainEqual({
      region: 'ap-southeast-2',
      stackName: 'legacyproj-test'
    });

    aws.requests.length = 0;
    const withEnvironment = await runCli({
      home,
      cwd: project,
      args: ['delete', '--stage', 'test', '--yes'],
      controlPlane,
      awsEndpoint: aws.endpoint,
      environment: { AWS_DEFAULT_REGION: 'us-east-2' }
    });
    expect(stackReads(aws.requests), withEnvironment.output).toContainEqual({
      region: 'us-east-2',
      stackName: 'legacyproj-test'
    });
  });
});

describe('init declares the region later commands would have used', () => {
  const APP_FILES = {
    'package.json': JSON.stringify({ name: 'project', version: '1.0.0', scripts: { start: 'node index.js' } }),
    'index.js':
      "require('node:http').createServer((_, response) => response.end('ok')).listen(process.env.PORT || 3000);\n"
  };
  const declaredRegion = async (project: string) =>
    /^region: (.+)$/m.exec(await readFile(join(project, 'stacktape.yml'), 'utf8'))?.[1];

  test('a named AWS profile’s region is declared, and the next command deploys there', async () => {
    const controlPlane = await startConsole('project');
    const aws = await startAwsFake();
    const { home, project } = await createHome({
      files: APP_FILES,
      awsConfig: '[default]\nregion = us-west-2\n[profile other]\nregion = ap-southeast-2\n'
    });
    const init = await runCli({
      home,
      cwd: project,
      args: ['init', '--headless', '--codingAgent', 'none'],
      controlPlane,
      awsEndpoint: aws.endpoint,
      environment: { AWS_PROFILE: 'other' }
    });
    expect(init.exitCode, init.output).toBe(0);
    expect(await declaredRegion(project), init.output).toBe('ap-southeast-2');

    // Without the profile now: the file carries the region.
    const run = await runCli({
      home,
      cwd: project,
      args: ['status', '--stage', 'test'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });
    expect(controlPlane.calls.find(({ procedure }) => procedure === 'stackDetails')?.input, run.output).toMatchObject({
      stackName: 'project-test',
      region: 'ap-southeast-2'
    });
  });

  test('an AWS_REGION Stacktape does not deploy to is never written into the file', async () => {
    const controlPlane = await startConsole('project');
    const aws = await startAwsFake();
    const { home, project } = await createHome({ files: APP_FILES, awsConfig: '[default]\nregion = us-west-2\n' });
    const init = await runCli({
      home,
      cwd: project,
      args: ['init', '--headless', '--codingAgent', 'none'],
      controlPlane,
      awsEndpoint: aws.endpoint,
      environment: { AWS_REGION: 'mars-north-1' }
    });
    expect(init.exitCode, init.output).toBe(0);
    expect(await declaredRegion(project), init.output).toBe('eu-west-1');
  });
});

describe('alternate config locations', () => {
  test('--config selects a YAML config in another directory and its settings', async () => {
    const controlPlane = await startConsole('yamlproj');
    const aws = await startAwsFake();
    const { home, project } = await createHome({
      files: {
        'stacktape.ts': SETTINGS_CONFIG,
        'infra/stacktape.yml': 'projectName: yamlproj\nregion: ca-central-1\nresources:\n  uploads:\n    type: bucket\n'
      }
    });
    const run = await runCli({
      home,
      cwd: project,
      args: ['delete', '--stage', 'test', '--yes', '--config', 'infra/stacktape.yml'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });

    expect(stackReads(aws.requests), run.output).toContainEqual({ region: 'ca-central-1', stackName: 'yamlproj-test' });
  });

  test('--cwd selects the project whose config is read', async () => {
    const controlPlane = await startConsole();
    const aws = await startAwsFake();
    const { home } = await createHome({ files: { 'services/api/stacktape.ts': SETTINGS_CONFIG } });
    const run = await runCli({
      home,
      cwd: home,
      args: ['delete', '--stage', 'test', '--yes', '--cwd', join(home, 'project', 'services', 'api')],
      controlPlane,
      awsEndpoint: aws.endpoint
    });

    expect(stackReads(aws.requests), run.output).toContainEqual({ region: 'eu-central-1', stackName: 'cfgproj-test' });
  });
});

describe('a config whose settings cannot be read', () => {
  const BROKEN_CONFIG = `import { defineConfig } from 'stacktape';
const region = process.env.REGION ?? 'eu-west-1';
export default defineConfig({ projectName: 'cfgproj', region }, () => ({ resources: {} }));
`;

  test('stops a command that loads it before Stacktape or AWS is asked anything, with the supported form', async () => {
    const controlPlane = await startConsole();
    const aws = await startAwsFake();
    const { home, project } = await createHome({ files: { 'stacktape.ts': BROKEN_CONFIG } });
    const run = await runCli({
      home,
      cwd: project,
      args: ['deploy', '--stage', 'test', '--yes'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });

    expect(run.exitCode).not.toBe(0);
    expect(run.error?.code, run.output).toBe('CONFIG_PROJECT_SETTINGS_INVALID');
    expect(run.output).toContain("export default defineConfig({ projectName: 'my-app', region: 'eu-west-1' }");
    expect(controlPlane.calls).toEqual([]);
    expect(aws.requests).toEqual([]);
  });

  test('a settings call that is not the default export stops the command before credentials or the config run', async () => {
    const controlPlane = await startConsole();
    const aws = await startAwsFake();
    const { home, project } = await createHome({ files: {}, awsConfig: '[default]\nregion = ap-southeast-2\n' });
    const marker = join(home, 'config-ran.marker');
    await writeFile(
      join(project, 'stacktape.ts'),
      `import { writeFileSync } from 'node:fs';
import { Bucket, defineConfig } from 'stacktape';
writeFileSync(${JSON.stringify(marker)}, 'project code ran');
const wrap = <T>(config: T) => config;
export default wrap(defineConfig({ projectName: 'cfgproj', region: 'eu-central-1' }, () => ({ resources: { uploads: new Bucket({}) } })));
`
    );
    const run = await runCli({
      home,
      cwd: project,
      args: ['delete', '--stage', 'test', '--yes'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });

    expect(run.error?.code, run.output).toBe('CONFIG_PROJECT_SETTINGS_INVALID');
    expect(run.output).toContain('could not find the `defineConfig(settings, fn)` call as the default export');
    expect(controlPlane.calls).toEqual([]);
    expect(aws.requests).toEqual([]);
    expect(existsSync(marker), run.output).toBe(false);
  });

  test('never blocks a command that does not use the config', async () => {
    const controlPlane = await startConsole();
    const aws = await startAwsFake();
    const { home, project } = await createHome({ files: { 'stacktape.ts': BROKEN_CONFIG } });
    const help = await runCli({
      home,
      cwd: project,
      args: ['help', 'deploy'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });
    expect(help.exitCode, help.output).toBe(0);

    const secret = await runCli({
      home,
      cwd: project,
      args: ['secret', 'get', 'database', '--region', 'eu-west-1'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });
    expect(secret.error?.code, secret.output).not.toBe('CONFIG_PROJECT_SETTINGS_INVALID');
  });

  test('a loaded config that declares other settings than the file shows is refused before anything changes', async () => {
    const controlPlane = await startConsole();
    const aws = await startAwsFake();
    const { home, project } = await createHome({
      files: {
        // \`defineConfig\` reached through a variable the static read cannot follow, so it finds no settings; the loaded
        // config declares some.
        'stacktape.ts': `import * as stacktape from 'stacktape';
const define = stacktape.defineConfig;
export default define({ projectName: 'cfgproj', region: 'eu-central-1' }, () => ({ resources: { uploads: new stacktape.Bucket({}) } }));
`
      }
    });
    const run = await runCli({
      home,
      cwd: project,
      args: ['delete', '--stage', 'test', '--yes', '--project', 'cfgproj', '--region', 'eu-central-1'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });

    expect(run.error?.code, run.output).toBe('CONFIG_PROJECT_SETTINGS_MISMATCH');
    expect(aws.requests.map(({ action }) => action)).not.toContain('DeleteStack');
  });

  test('an installed stacktape package older than the CLI is named instead of failing inside the config', async () => {
    const controlPlane = await startConsole();
    const aws = await startAwsFake();
    const { home, project } = await createHome({
      files: {
        'stacktape.ts': SETTINGS_CONFIG,
        'node_modules/stacktape/package.json': JSON.stringify({
          name: 'stacktape',
          version: '3.7.0',
          main: 'index.js'
        }),
        // The v3 runtime's defineConfig takes only the config function.
        'node_modules/stacktape/index.js':
          'exports.defineConfig = (configFn) => (params) => configFn(params);\nexports.Bucket = class Bucket {};\n'
      }
    });
    const run = await runCli({
      home,
      cwd: project,
      args: ['delete', '--stage', 'test', '--yes'],
      controlPlane,
      awsEndpoint: aws.endpoint
    });

    expect(run.error?.code, run.output).toBe('CONFIG_PROJECT_SETTINGS_UNSUPPORTED_RUNTIME');
    expect(run.output).toContain('Update it to the version of this CLI');
  });

  test('init’s target probe reads settings without running the config', async () => {
    const controlPlane = await startConsole();
    const aws = await startAwsFake();
    const { home, project } = await createHome({ files: {} });
    const marker = join(home, 'config-ran.marker');
    await writeFile(
      join(project, 'stacktape.ts'),
      `import { writeFileSync } from 'node:fs';
import { Bucket, defineConfig } from 'stacktape';
writeFileSync(${JSON.stringify(marker)}, 'project code ran');
export default defineConfig({ projectName: 'cfgproj', region: 'eu-central-1' }, () => ({ resources: { uploads: new Bucket({}) } }));
`
    );
    const run = await runCli({
      home,
      cwd: project,
      args: [
        'deploy',
        '--stage',
        'test',
        '--config',
        'stacktape.ts',
        '--projectName',
        'cfgproj',
        '--region',
        'eu-central-1',
        '--autoConfirmOperation'
      ],
      controlPlane,
      awsEndpoint: aws.endpoint,
      environment: { STACKTAPE_INIT_TARGET_CHECK: '1' }
    });

    expect(stackReads(aws.requests), run.output).toContainEqual({ region: 'eu-central-1', stackName: 'cfgproj-test' });
    expect(existsSync(marker), run.output).toBe(false);
  });
});
