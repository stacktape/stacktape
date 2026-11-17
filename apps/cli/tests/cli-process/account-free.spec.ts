/**
 * Without a Stacktape API key the CLI works account-free on local AWS credentials. The source CLI runs as a child
 * process against a loopback AWS fake; the Stacktape API endpoint points at a listener that records every connection,
 * so each scenario proves that nothing reached the Stacktape API. A signed-in run of the same starter config, against
 * the control-plane fake, shows that the two stacks differ only in what Console features add.
 */
import { afterAll, afterEach, beforeAll, expect, test as bunTest } from 'bun:test';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { createServer as createTcpServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parse } from 'yaml';
import { buildOperationsCli } from '../../scripts/operations/cli-process';
import { startControlPlaneFake } from './control-plane-fake';

/** Each scenario starts the source CLI as a child process, which takes several seconds. */
const test = (name: string, fn: () => Promise<void>) => bunTest(name, fn, 120_000);

const cliRoot = resolve(import.meta.dir, '..', '..');
const ACCOUNT = '555555555555';
const STARTER = join(cliRoot, 'starter-projects', 'lambda-api-dynamo-db');

let cli: Awaited<ReturnType<typeof buildOperationsCli>>;
beforeAll(async () => {
  cli = await buildOperationsCli();
}, 120_000);
afterAll(() => cli?.close());

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

const closeServer = (server: { close: (callback: () => void) => unknown }) => () =>
  new Promise<void>((done) => {
    server.close(() => done());
  });

/** Stands in for the Stacktape API: it records each connection and closes it without answering. */
const startApiListener = async () => {
  const connections: number[] = [];
  const server = createTcpServer((socket) => {
    connections.push(Date.now());
    socket.destroy();
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  cleanups.push(closeServer(server));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('The API listener did not bind a TCP port.');
  return { endpoint: `http://127.0.0.1:${address.port}`, connections };
};

/** Answers GetCallerIdentity and reports every stack as missing; refuses everything else. */
const startAwsFake = async () => {
  const actions: string[] = [];
  const server = createServer(async (request: IncomingMessage, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    const parameters = new URLSearchParams(Buffer.concat(chunks).toString('utf8'));
    const target = request.headers['x-amz-target'];
    const action = parameters.get('Action') ?? (typeof target === 'string' ? target.split('.').at(-1)! : 'unknown');
    actions.push(action);
    if (action === 'GetCallerIdentity') {
      response.writeHead(200, { 'content-type': 'text/xml' });
      response.end(`<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
  <GetCallerIdentityResult><Arn>arn:aws:iam::${ACCOUNT}:user/developer</Arn><UserId>AIDAFAKE</UserId><Account>${ACCOUNT}</Account></GetCallerIdentityResult>
  <ResponseMetadata><RequestId>fake</RequestId></ResponseMetadata>
</GetCallerIdentityResponse>`);
      return;
    }
    const missingStack = action === 'DescribeStacks' || action === 'ListStackResources';
    response.writeHead(400, { 'content-type': 'text/xml' });
    response.end(`<ErrorResponse><Error><Type>Sender</Type><Code>${missingStack ? 'ValidationError' : 'AccessDenied'}</Code>
<Message>${missingStack ? `Stack with id ${parameters.get('StackName')} does not exist` : `The AWS fake refuses ${action}.`}</Message></Error><RequestId>fake</RequestId></ErrorResponse>`);
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  cleanups.push(() => {
    server.closeAllConnections();
    return closeServer(server)();
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('The AWS fake did not bind a TCP port.');
  return { endpoint: `http://127.0.0.1:${address.port}`, actions };
};

/** An isolated HOME with the starter's config, plus `files` written relative to the project. */
const createProject = async (files: Record<string, string> = {}) => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-account-free-'));
  cleanups.push(() => rm(home, { recursive: true, force: true }));
  const project = join(home, 'project');
  await mkdir(join(home, '.aws'), { recursive: true });
  await mkdir(join(project, 'src'), { recursive: true });
  await writeFile(join(home, '.aws', 'config'), '');
  await writeFile(join(project, 'stacktape.yml'), await readFile(join(STARTER, 'stacktape.yml'), 'utf8'));
  await writeFile(join(project, 'package.json'), '{ "name": "starter", "private": true }');
  await writeFile(join(project, 'src', 'index.ts'), 'export const handler = async () => ({ statusCode: 200 });\n');
  for (const [name, content] of Object.entries(files)) await writeFile(join(project, name), content);
  // Synthesis names the helper Lambda artifacts (`pnpm --filter @stacktape/cli build:dev-artifacts` builds them).
  await cp(
    join(cliRoot, '__stacktape-dist', 'dev', 'helper-lambdas'),
    join(project, '__stacktape-dist', 'dev', 'helper-lambdas'),
    {
      recursive: true
    }
  );
  return { home, project };
};

type JsonlRecord = { type?: string; code?: string; message?: string; ok?: boolean; data?: unknown };

const runCli = async ({
  home,
  cwd,
  args,
  apiEndpoint,
  awsEndpoint,
  environment = {},
  output = ['--outputFormat', 'jsonl']
}: {
  home: string;
  cwd: string;
  args: string[];
  apiEndpoint: string;
  awsEndpoint: string;
  environment?: Record<string, string>;
  output?: string[];
}) => {
  const child = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      '--preload',
      join(cliRoot, 'scripts', 'network-guard-preload.ts'),
      cli.path,
      ...args,
      ...output
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
        AWS_ACCESS_KEY_ID: 'AKIAFAKEACCOUNTFREE',
        AWS_SECRET_ACCESS_KEY: 'fake',
        AWS_ENDPOINT_URL: awsEndpoint,
        STP_CUSTOM_TRPC_API_ENDPOINT: apiEndpoint,
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
  return {
    exitCode,
    output: stdout + stderr,
    results: records.filter((record) => record.type === 'result'),
    error: records.find((record) => record.ok === false)
  };
};

type Template = { Resources: Record<string, { Type: string; Properties?: Record<string, unknown> }> };

const synthesize = async ({ apiKey }: { apiKey?: string }) => {
  const aws = await startAwsFake();
  const { home, project } = await createProject();
  const api = apiKey
    ? await startControlPlaneFake({ projectName: 'starter' }).then((fake) => {
        cleanups.push(fake.close);
        return { endpoint: fake.endpoint, connections: fake.calls };
      })
    : await startApiListener();
  const outFile = join(home, 'template.yml');
  const run = await runCli({
    home,
    cwd: project,
    args: ['synth', '--projectName', 'starter', '--stage', 'test', '--region', 'eu-west-1', '--outFile', outFile],
    apiEndpoint: api.endpoint,
    awsEndpoint: aws.endpoint,
    environment: apiKey ? { STACKTAPE_API_KEY: apiKey } : {}
  });
  expect(run.exitCode, run.output).toBe(0);
  return { template: parse(await readFile(outFile, 'utf8')) as Template, apiConnections: api.connections };
};

const serviceLambdaEnvironment = (template: Template) =>
  (
    template.Resources.StacktapeServiceLambdaCustomResourceFunction?.Properties?.Environment as
      | { Variables: Record<string, unknown> }
      | undefined
  )?.Variables ?? {};

test('account-free synth contacts no Stacktape API and differs from a Console stack only by Console additions', async () => {
  const accountFree = await synthesize({});
  const withConsole = await synthesize({ apiKey: 'account-free-spec-fake-do-not-use' });
  expect(accountFree.apiConnections).toEqual([]);

  const free = accountFree.template.Resources;
  const console = withConsole.template.Resources;
  // Nothing exists only without the Console.
  expect(Object.keys(free).filter((id) => !console[id])).toEqual([]);
  // The Console adds the default domain of the HTTP API and error tracking; nothing else.
  expect(
    Object.keys(console)
      .filter((id) => !free[id])
      .toSorted()
  ).toEqual([
    'ApiGatewayApiMapping',
    'ApiGatewayDefaultDomainCustomResource',
    'ApiGatewayDomainName',
    'ApiIssueDetectionSubscriptionFilter',
    'StpDefaultDomainCertCustomResource',
    'StpIssueDetectionLogsPermission'
  ]);
  // Every shared resource is identical, except the service Lambda's Console endpoint and default-domain permissions.
  const changed = Object.keys(free).filter((id) => JSON.stringify(free[id]) !== JSON.stringify(console[id]));
  expect(changed.toSorted()).toEqual(['StacktapeServiceLambdaCustomResourceFunction', 'StacktapeServiceLambdaRole']);
  const freeEnvironment = serviceLambdaEnvironment(accountFree.template);
  const { STACKTAPE_TRPC_API_ENDPOINT, ...consoleEnvironment } = serviceLambdaEnvironment(withConsole.template);
  expect(STACKTAPE_TRPC_API_ENDPOINT).toBeDefined();
  expect(freeEnvironment).toEqual(consoleEnvironment);
});

test('a Console-only config feature fails account-free validation with the fix', async () => {
  const aws = await startAwsFake();
  const api = await startApiListener();
  const starter = await readFile(join(STARTER, 'stacktape.yml'), 'utf8');
  const { home, project } = await createProject({
    'stacktape.yml': starter.replace(
      'resources:\n',
      'resources:\n  homepage:\n    type: uptime-check\n    properties:\n      url: https://example.com\n'
    )
  });
  const run = await runCli({
    home,
    cwd: project,
    args: ['validate', '--projectName', 'starter', '--stage', 'test', '--region', 'eu-west-1'],
    apiEndpoint: api.endpoint,
    awsEndpoint: aws.endpoint
  });
  expect(run.exitCode, run.output).not.toBe(0);
  expect(run.error?.code, run.output).toBe('CONFIG_NEEDS_CONSOLE');
  expect(run.error?.message).toContain(
    'Uptime checks (`homepage`) need the Stacktape Console (free up to $200/month of AWS spend). Run: stacktape connect — your stacks are added as they are, no redeploy. Or remove the uptime-check resources.'
  );
  expect(api.connections).toEqual([]);
});

test('Console commands say they need sign-in and why, without contacting the API', async () => {
  const aws = await startAwsFake();
  const api = await startApiListener();
  const { home, project } = await createProject();
  const orgList = await runCli({
    home,
    cwd: project,
    args: ['org:list'],
    apiEndpoint: api.endpoint,
    awsEndpoint: aws.endpoint
  });
  expect(orgList.error?.code, orgList.output).toBe('CONSOLE_SIGN_IN_REQUIRED');
  expect(orgList.error?.message).toBe(
    'stacktape org list needs the Stacktape Console, because organizations are kept in the Stacktape Console.'
  );
  const runner = await runCli({
    home,
    cwd: project,
    args: ['deploy', '--runner', 'ec2', '--projectName', 'starter', '--stage', 'test', '--region', 'eu-west-1'],
    apiEndpoint: api.endpoint,
    awsEndpoint: aws.endpoint
  });
  expect(runner.error?.message, runner.output).toBe(
    'stacktape deploy --runner ec2 needs the Stacktape Console, because remote runners run in the Stacktape Console.'
  );
  const connect = await runCli({
    home,
    cwd: project,
    args: ['connect', '--agent'],
    output: [],
    apiEndpoint: api.endpoint,
    awsEndpoint: aws.endpoint
  });
  expect(connect.results, connect.output).toHaveLength(1);
  expect(connect.results[0]).toMatchObject({ ok: false, code: 'STACKTAPE_API_KEY_MISSING' });
  expect(api.connections).toEqual([]);
  expect(aws.actions).toEqual([]);
});

/** Records PostHog requests: the event properties each one carries. */
const startPostHogFake = async () => {
  const events: { event: string; properties: Record<string, unknown> }[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    let body = Buffer.concat(chunks);
    if (request.headers['content-encoding'] === 'gzip' || body[0] === 0x1f) body = gunzipSync(body);
    const parsed = JSON.parse(body.toString('utf8')) as { batch?: typeof events } & (typeof events)[number];
    events.push(...(parsed.batch ?? [parsed]));
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end('{"status":1}');
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  cleanups.push(() => {
    server.closeAllConnections();
    return closeServer(server)();
  });
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('The PostHog fake did not bind a TCP port.');
  return { host: `http://127.0.0.1:${address.port}`, events };
};

test('connect on an account already connected finds the stacks deployed since and reports them', async () => {
  const aws = await startAwsFake();
  const { home, project } = await createProject();
  const api = await startControlPlaneFake({
    projectName: 'starter',
    awsAccountId: ACCOUNT,
    existingStacks: {
      projects: [
        {
          name: 'starter',
          created: true,
          stages: [
            { stage: 'test', region: 'eu-west-1' },
            { stage: 'production', region: 'eu-west-1' }
          ]
        }
      ],
      skippedRegions: ['us-east-1']
    }
  });
  cleanups.push(api.close);
  const connect = await runCli({
    home,
    cwd: project,
    args: ['connect', '--agent'],
    output: [],
    apiEndpoint: api.endpoint,
    awsEndpoint: aws.endpoint,
    environment: { STACKTAPE_API_KEY: 'stp-cli-process-connect', AWS_REGION: 'eu-west-1' }
  });
  expect(connect.exitCode, connect.output).toBe(0);
  // The account is already connected: no new connection, one search for its stacks through that connection.
  expect(api.calls.filter(({ procedure }) => procedure === 'findExistingStacksFromCli')).toEqual([
    {
      procedure: 'findExistingStacksFromCli',
      input: { connectionId: 'aws-connection-cli-process-account' },
      apiKey: 'stp-cli-process-connect'
    }
  ]);
  expect(api.unexpectedProcedures).toEqual([]);
  expect(connect.output).toContain('Found 2 stages of 1 project in this account; 1 project added to the Console.');
  expect(connect.output).toContain('Could not read stacks in us-east-1; stacks there are not listed yet.');
  expect(connect.results.at(-1)).toMatchObject({
    ok: true,
    data: {
      result: {
        awsAccountId: ACCOUNT,
        existingStacks: {
          stages: [
            { projectName: 'starter', stage: 'test', region: 'eu-west-1' },
            { projectName: 'starter', stage: 'production', region: 'eu-west-1' }
          ],
          newProjects: ['starter'],
          skippedRegions: ['us-east-1']
        }
      }
    }
  });
});

test('account-free telemetry shows its notice first, sends only allowlisted fields, and stays off in CI', async () => {
  const aws = await startAwsFake();
  const api = await startApiListener();
  const posthog = await startPostHogFake();
  const { home, project } = await createProject();
  const telemetry = {
    STP_DISABLE_TELEMETRY: '0',
    POSTHOG_PROJECT_TOKEN: 'account-free-spec',
    POSTHOG_HOST: posthog.host,
    CI: ''
  };
  const versionArgs = { home, cwd: project, args: ['version'], apiEndpoint: api.endpoint, awsEndpoint: aws.endpoint };

  // Machine-readable output cannot show the notice, so nothing is sent.
  await runCli({ ...versionArgs, environment: telemetry });
  // CI never sends.
  await runCli({ ...versionArgs, environment: { ...telemetry, CI: 'true' }, output: ['--outputFormat', 'plain'] });
  // DO_NOT_TRACK turns it off.
  await runCli({
    ...versionArgs,
    environment: { ...telemetry, DO_NOT_TRACK: '1' },
    output: ['--outputFormat', 'plain']
  });
  await Bun.sleep(1000);
  expect(posthog.events).toEqual([]);

  const first = await runCli({ ...versionArgs, environment: telemetry, output: ['--outputFormat', 'plain'] });
  expect(first.output).toContain('Stacktape sends anonymous usage data');
  for (let attempt = 0; attempt < 50 && !posthog.events.length; attempt++) await Bun.sleep(100);
  expect(posthog.events).toHaveLength(1);
  const [{ event, properties }] = posthog.events;
  expect(event).toBe('cli_command_completed');
  const sent = Object.keys(properties).filter((key) => !key.startsWith('$'));
  expect(sent.toSorted()).toEqual(
    [
      'app',
      'app_version',
      'arch',
      'command',
      'environment',
      'is_ci',
      'outcome',
      'platform',
      'schema_version'
    ].toSorted()
  );
  expect(properties).toMatchObject({ command: 'version', outcome: 'success', is_ci: false });

  // Shown once per machine.
  const second = await runCli({ ...versionArgs, environment: telemetry, output: ['--outputFormat', 'plain'] });
  expect(second.output).not.toContain('Stacktape sends anonymous usage data');
  expect(api.connections).toEqual([]);
});
