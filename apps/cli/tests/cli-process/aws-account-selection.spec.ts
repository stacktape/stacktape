/**
 * Which connected AWS account a stack command targets when local AWS credentials are selected. The source CLI runs as
 * a child process against the control-plane fake and a loopback STS/CloudFormation fake, with an isolated HOME and
 * AWS config file and the network guard. No scenario needs an emulator: each stops at a stack that does not exist,
 * or earlier, and the fakes record whether AWS was asked anything.
 */
import { afterEach, describe, expect, test as bunTest } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { startControlPlaneFake, type ControlPlaneFake } from './control-plane-fake';

/** Each scenario starts the source CLI as a child process, which takes several seconds. */
const test = (name: string, fn: () => Promise<void>) => bunTest(name, fn, 120_000);

const cliRoot = resolve(import.meta.dir, '..', '..');
const projectName = 'acctsel';
const region = 'eu-west-1';
const PRODUCTION = '222222222222';
const DEV = '111111111111';
const E2E = '333333333333';
/** Keys the control-plane fake hands out per account, mapped back to the account by the STS fake. */
const consoleKeys = { production: 'ASIAFAKEPRODUCTION', dev: 'ASIAFAKEDEV' };
const accountOfKey: Record<string, string> = { [consoleKeys.production]: PRODUCTION, [consoleKeys.dev]: DEV };

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

type AwsRequest = { action: string; accessKeyId: string };

/** Answers GetCallerIdentity by access key and reports every stack as missing. Anything else is refused. */
const startAwsFake = async () => {
  const requests: AwsRequest[] = [];
  const server = createServer(async (request: IncomingMessage, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    const action = new URLSearchParams(Buffer.concat(chunks).toString('utf8')).get('Action') ?? 'unknown';
    const accessKeyId = /Credential=([^/]+)\//.exec(request.headers.authorization ?? '')?.[1] ?? '';
    requests.push({ action, accessKeyId });
    const account = accountOfKey[accessKeyId];
    if (action === 'GetCallerIdentity' && account) {
      response.writeHead(200, { 'content-type': 'text/xml' });
      response.end(`<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
  <GetCallerIdentityResult><Arn>arn:aws:sts::${account}:assumed-role/stacktape/cli</Arn><UserId>AROAFAKE:cli</UserId><Account>${account}</Account></GetCallerIdentityResult>
  <ResponseMetadata><RequestId>fake</RequestId></ResponseMetadata>
</GetCallerIdentityResponse>`);
      return;
    }
    const missingStack = action === 'DescribeStacks';
    response.writeHead(400, { 'content-type': 'text/xml' });
    response.end(`<ErrorResponse><Error><Type>Sender</Type><Code>${missingStack ? 'ValidationError' : 'AccessDenied'}</Code>
<Message>${missingStack ? 'Stack with id acctsel-test does not exist' : `The AWS fake refuses ${action}.`}</Message></Error><RequestId>fake</RequestId></ErrorResponse>`);
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

const startConsole = async (
  connectedAwsAccounts: Parameters<typeof startControlPlaneFake>[0]['connectedAwsAccounts'],
  freePlanLimit?: Parameters<typeof startControlPlaneFake>[0]['freePlanLimit']
) => {
  const controlPlane = await startControlPlaneFake({
    projectName,
    connectedAwsAccounts,
    freePlanLimit,
    awsAccountCredentials: {
      production: { accessKeyId: consoleKeys.production, secretAccessKey: 'fake' },
      dev: { accessKeyId: consoleKeys.dev, secretAccessKey: 'fake' }
    }
  });
  cleanups.push(controlPlane.close);
  return controlPlane;
};

type JsonlRecord = { type?: string; code?: string; message?: string; ok?: boolean; level?: string };

/** Runs `stacktape delete` with an isolated HOME whose AWS config defines the `dev` and `e2e` SSO profiles. */
const runDelete = async ({
  controlPlane,
  awsEndpoint,
  environment = {},
  args = [],
  command = 'delete'
}: {
  controlPlane: ControlPlaneFake;
  awsEndpoint: string;
  environment?: Record<string, string>;
  args?: string[];
  command?: 'delete' | 'deploy' | 'dev';
}) => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-account-selection-'));
  cleanups.push(() => rm(home, { recursive: true, force: true }));
  await mkdir(join(home, '.aws'));
  await mkdir(join(home, 'project'));
  await writeFile(
    join(home, '.aws', 'config'),
    ['[profile dev]', `sso_account_id = ${DEV}`, '[profile e2e]', `sso_account_id = ${E2E}`, ''].join('\n')
  );
  const child = Bun.spawn(
    [
      'bun',
      '--preload',
      join(cliRoot, 'scripts', 'network-guard-preload.ts'),
      join(cliRoot, 'scripts', 'dev.ts'),
      command,
      '--stage',
      'test',
      '--region',
      region,
      '--projectName',
      projectName,
      '--currentWorkingDirectory',
      join(home, 'project'),
      // Dev mode never asks for confirmation, so it has no such option.
      ...(command === 'dev' ? [] : ['--autoConfirmOperation']),
      '--outputFormat',
      'jsonl',
      ...args
    ],
    {
      cwd: cliRoot,
      env: {
        PATH: process.env.PATH ?? '',
        HOME: home,
        XDG_CONFIG_HOME: join(home, '.config'),
        XDG_CACHE_HOME: join(home, '.cache'),
        TMPDIR: tmpdir(),
        CI: '1',
        NO_COLOR: '1',
        AWS_EC2_METADATA_DISABLED: 'true',
        AWS_ENDPOINT_URL: awsEndpoint,
        STACKTAPE_API_KEY: 'account-selection-fake-do-not-use',
        STP_CUSTOM_TRPC_API_ENDPOINT: controlPlane.endpoint,
        SKIP_LOADING_ENV: '1',
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
  return { exitCode, stdout, stderr, records, error: records.find((record) => record.ok === false) };
};

const credentialRequests = (controlPlane: ControlPlaneFake) =>
  controlPlane.calls
    .filter(({ procedure }) => procedure === 'awsAccountCredentials')
    .map(({ input }) => (input as { awsAccountName: string }).awsAccountName);

const connected = {
  production: { name: 'production', awsAccountId: PRODUCTION, connectionMode: 'PRIVILEGED' as const },
  dev: { name: 'dev', awsAccountId: DEV, connectionMode: 'PRIVILEGED' as const }
};

describe('AWS account selection by local credentials', () => {
  test('AWS_PROFILE for an account that is not connected fails before Stacktape or AWS is asked for anything', async () => {
    // The incident: the organization's only connection is production, and AWS_PROFILE points somewhere else.
    const controlPlane = await startConsole([connected.production]);
    const aws = await startAwsFake();
    const run = await runDelete({ controlPlane, awsEndpoint: aws.endpoint, environment: { AWS_PROFILE: 'e2e' } });

    expect(run.exitCode, run.stdout + run.stderr).not.toBe(0);
    expect(run.error?.code).toBe('LOCAL_AWS_ACCOUNT_NOT_CONNECTED');
    expect(run.stdout).toContain(`AWS_PROFILE=e2e belongs to AWS account ${E2E}`);
    expect(run.stdout).toContain(`production (${PRODUCTION})`);
    expect(controlPlane.calls.map(({ procedure }) => procedure)).toEqual(['currentUserAndOrgData']);
    expect(aws.requests).toEqual([]);
  });

  test('AWS_PROFILE chooses the matching connected account and the run names it', async () => {
    const controlPlane = await startConsole([connected.production, connected.dev]);
    const aws = await startAwsFake();
    const run = await runDelete({ controlPlane, awsEndpoint: aws.endpoint, environment: { AWS_PROFILE: 'dev' } });

    expect(credentialRequests(controlPlane)).toEqual(['dev']);
    expect(run.stdout).toContain(`for account dev (${DEV}), selected by AWS_PROFILE=dev`);
    // The run stops at the missing stack in the dev account, after nothing but reads.
    expect(run.exitCode).not.toBe(0);
    expect(run.error?.code).toBe('NON_EXISTING_STACK_E32');
    expect(aws.requests.map(({ action }) => action)).toContain('DescribeStacks');
    expect(aws.requests.every(({ accessKeyId }) => accessKeyId === consoleKeys.dev)).toBe(true);
    expect(controlPlane.unexpectedProcedures).toEqual([]);
  });

  test('--awsAccount wins over AWS_PROFILE without resolving it, and says so', async () => {
    const controlPlane = await startConsole([connected.production, connected.dev]);
    const aws = await startAwsFake();
    const run = await runDelete({
      controlPlane,
      awsEndpoint: aws.endpoint,
      // The profile is not even resolvable: --awsAccount must not look at it.
      environment: { AWS_PROFILE: 'missing' },
      args: ['--awsAccount', 'production']
    });

    expect(credentialRequests(controlPlane)).toEqual(['production']);
    expect(run.stdout).toContain(
      `AWS_PROFILE=missing is ignored: --aws-account selects \\"production\\" (${PRODUCTION}).`
    );
    expect(run.stdout).toContain(`for account production (${PRODUCTION})`);
    expect(aws.requests.every(({ accessKeyId }) => accessKeyId === consoleKeys.production)).toBe(true);
  });

  test('without local credentials, the only connected account is used as before', async () => {
    const controlPlane = await startConsole([connected.production]);
    const aws = await startAwsFake();
    const run = await runDelete({ controlPlane, awsEndpoint: aws.endpoint });

    expect(credentialRequests(controlPlane)).toEqual(['production']);
    expect(run.stdout).toContain(`for account production (${PRODUCTION})`);
    expect(run.stdout).not.toContain('selected by');
  });
});

describe('Free plan cost limit', () => {
  const overLimit = {
    monthToDateCostsUsd: 142.17,
    limitUsd: 100,
    month: '2026-10',
    upgradeUrl: 'https://console.stacktape.com/subscription-plans'
  };

  test('a deploy is refused with the costs and the plans page before AWS is asked for anything', async () => {
    const controlPlane = await startConsole([connected.production], overLimit);
    const aws = await startAwsFake();
    const run = await runDelete({ controlPlane, awsEndpoint: aws.endpoint, command: 'deploy' });

    expect(run.exitCode, run.stdout + run.stderr).not.toBe(0);
    expect(run.error?.code, run.stdout).toBe('FREE_PLAN_LIMIT_E502');
    expect(run.stdout).toContain('Deploys are paused');
    expect(run.stdout).toContain('$142.17');
    expect(run.stdout).toContain('limit of $100 a month');
    expect(run.stdout).toContain(overLimit.upgradeUrl);
    expect(run.stdout).toContain('Deleting and rolling back stages still work');
    expect(aws.requests.filter(({ action }) => action !== 'GetCallerIdentity')).toEqual([]);
  });

  test('dev mode is refused the same way before it prompts, creates or deploys anything', async () => {
    const controlPlane = await startConsole([connected.production], overLimit);
    const aws = await startAwsFake();
    const run = await runDelete({ controlPlane, awsEndpoint: aws.endpoint, command: 'dev' });

    expect(run.exitCode, run.stdout + run.stderr).not.toBe(0);
    expect(run.error?.code, run.stdout).toBe('FREE_PLAN_LIMIT_E502');
    expect(run.stdout).toContain('Deploys are paused');
    expect(run.stdout).toContain('$142.17');
    expect(run.stdout).toContain(overLimit.upgradeUrl);
    expect(aws.requests.filter(({ action }) => action !== 'GetCallerIdentity')).toEqual([]);
  });

  test('a delete still runs while deploys are paused', async () => {
    const controlPlane = await startConsole([connected.production], overLimit);
    const aws = await startAwsFake();
    const run = await runDelete({ controlPlane, awsEndpoint: aws.endpoint });

    // The fake account has no stack, so the delete gets as far as looking for it.
    expect(run.error?.code).toBe('NON_EXISTING_STACK_E32');
    expect(aws.requests.map(({ action }) => action)).toContain('DescribeStacks');
    expect(controlPlane.calls.map(({ procedure }) => procedure)).not.toContain('canDeploy');
  });
});
