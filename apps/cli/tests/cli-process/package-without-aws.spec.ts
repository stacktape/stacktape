/**
 * `stacktape package` builds artifacts on this machine, so it asks AWS for nothing unless the configuration needs AWS.
 * The source CLI runs as a child process with an isolated HOME and AWS config, the network guard and a loopback STS
 * fake that records every request. The project is one pure JavaScript function, which packages without Docker.
 *
 * The account is looked up only for a directive that reads it: an assumed-role profile names its account, so even
 * then nothing is requested, and environment keys are looked up with one STS call. The function's entry file is named
 * after the account, so a wrong account fails the build.
 */
import { afterEach, describe, expect, test as bunTest } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/** Each scenario starts the source CLI as a child process, which takes several seconds. */
const test = (name: string, fn: () => Promise<void>) => bunTest(name, fn, 120_000);

const cliRoot = resolve(import.meta.dir, '..', '..');
const ROLE_ACCOUNT = '333333333333';
const KEYS_ACCOUNT = '444444444444';
const ENVIRONMENT_KEY = 'ASIAFAKEPACKAGEKEYS';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

/** Answers GetCallerIdentity for the environment key; refuses everything else. */
const startStsFake = async () => {
  const actions: string[] = [];
  const server = createServer(async (request: IncomingMessage, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    const action = new URLSearchParams(Buffer.concat(chunks).toString('utf8')).get('Action') ?? 'unknown';
    const accessKeyId = /Credential=([^/]+)\//.exec(request.headers.authorization ?? '')?.[1] ?? '';
    actions.push(action);
    if (action === 'GetCallerIdentity' && accessKeyId === ENVIRONMENT_KEY) {
      response.writeHead(200, { 'content-type': 'text/xml' });
      response.end(`<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
  <GetCallerIdentityResult><Arn>arn:aws:iam::${KEYS_ACCOUNT}:user/ci</Arn><UserId>AIDAFAKE</UserId><Account>${KEYS_ACCOUNT}</Account></GetCallerIdentityResult>
  <ResponseMetadata><RequestId>fake</RequestId></ResponseMetadata>
</GetCallerIdentityResponse>`);
      return;
    }
    response.writeHead(403, { 'content-type': 'text/xml' });
    response.end(`<ErrorResponse><Error><Type>Sender</Type><Code>AccessDenied</Code>
<Message>The STS fake refuses ${action}.</Message></Error><RequestId>fake</RequestId></ErrorResponse>`);
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('The STS fake did not bind a TCP port.');
  cleanups.push(
    () =>
      new Promise<void>((done) => {
        server.close(() => done());
        server.closeAllConnections();
      })
  );
  return { endpoint: `http://127.0.0.1:${address.port}`, actions };
};

/**
 * Packages a one-function project. `entry` is the entry file's name without extension, which may be a directive;
 * the project has `handler.ts` and one file for each account, so only the right account finds its file.
 */
const runPackage = async ({
  awsEndpoint,
  entry,
  environment = {}
}: {
  awsEndpoint: string;
  entry: string;
  environment?: Record<string, string>;
}) => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-package-without-aws-'));
  cleanups.push(() => rm(home, { recursive: true, force: true }));
  const project = join(home, 'project');
  await mkdir(join(home, '.aws'));
  await mkdir(join(project, 'src'), { recursive: true });
  // `deploy` assumes the role; `base` holds keys the STS fake does not know, so using them would fail.
  await writeFile(
    join(home, '.aws', 'config'),
    [
      '[profile deploy]',
      `role_arn = arn:aws:iam::${ROLE_ACCOUNT}:role/deployer`,
      'source_profile = base',
      '[profile base]',
      'aws_access_key_id = AKIAFAKEBASEPROFILE',
      'aws_secret_access_key = fake',
      ''
    ].join('\n')
  );
  for (const name of ['handler', ROLE_ACCOUNT, KEYS_ACCOUNT]) {
    await writeFile(join(project, 'src', `${name}.ts`), `export default async () => ({ from: '${name}' });\n`);
  }
  await writeFile(
    join(project, 'stacktape.yml'),
    [
      'resources:',
      '  api:',
      '    type: function',
      '    properties:',
      '      packaging:',
      '        type: js-bundle',
      '        properties:',
      `          entryfilePath: ${JSON.stringify(entry)}`,
      ''
    ].join('\n')
  );
  const invocationId = `package-without-aws-${randomUUID()}`;
  cleanups.push(() => rm(join(cliRoot, '.stacktape', invocationId), { recursive: true, force: true }));
  const child = Bun.spawn(
    [
      'bun',
      '--preload',
      join(cliRoot, 'scripts', 'network-guard-preload.ts'),
      join(cliRoot, 'scripts', 'dev.ts'),
      'package',
      '--stage',
      'test',
      '--region',
      'eu-west-1',
      '--projectName',
      'pkgnoaws',
      '--currentWorkingDirectory',
      project
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
        SKIP_LOADING_ENV: '1',
        STP_DISABLE_TELEMETRY: '1',
        STP_INVOCATION_ID: invocationId,
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
  // `package` leaves its artifacts in the invocation directory under the process's working directory.
  const lambdas = join(cliRoot, '.stacktape', invocationId, 'build', 'lambdas');
  const zips = (await readdir(lambdas).catch(() => [] as string[])).filter((file) => file.endsWith('.zip'));
  return { exitCode, output: stdout + stderr, zips };
};

describe('stacktape package without AWS', () => {
  test('packages with no AWS credentials at all and asks AWS nothing', async () => {
    const sts = await startStsFake();
    const run = await runPackage({ awsEndpoint: sts.endpoint, entry: 'src/handler.ts' });

    expect(run.exitCode, run.output).toBe(0);
    expect(run.zips).toHaveLength(1);
    expect(run.output).not.toContain('AWS credentials loaded');
    expect(sts.actions).toEqual([]);
  });

  test('environment keys are not checked with STS when nothing reads the account', async () => {
    const sts = await startStsFake();
    const run = await runPackage({
      awsEndpoint: sts.endpoint,
      entry: 'src/handler.ts',
      environment: { AWS_ACCESS_KEY_ID: ENVIRONMENT_KEY, AWS_SECRET_ACCESS_KEY: 'fake' }
    });

    expect(run.exitCode, run.output).toBe(0);
    expect(sts.actions).toEqual([]);
  });

  test("$AwsAccountId() of an assumed-role profile comes from the profile's role, without a request", async () => {
    const sts = await startStsFake();
    const run = await runPackage({
      awsEndpoint: sts.endpoint,
      entry: "$Format('src/{}.ts', $AwsAccountId())",
      environment: { AWS_PROFILE: 'deploy' }
    });

    expect(run.exitCode, run.output).toBe(0);
    expect(run.zips).toHaveLength(1);
    expect(sts.actions).toEqual([]);
  });

  test('$AwsAccountId() with environment keys looks the account up once with STS', async () => {
    const sts = await startStsFake();
    const run = await runPackage({
      awsEndpoint: sts.endpoint,
      entry: "$Format('src/{}.ts', $AwsAccountId())",
      environment: { AWS_ACCESS_KEY_ID: ENVIRONMENT_KEY, AWS_SECRET_ACCESS_KEY: 'fake' }
    });

    expect(run.exitCode, run.output).toBe(0);
    expect(run.zips).toHaveLength(1);
    expect(sts.actions).toEqual(['GetCallerIdentity']);
  });
});
