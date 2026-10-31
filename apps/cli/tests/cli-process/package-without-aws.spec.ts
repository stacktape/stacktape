/**
 * `stacktape package` builds artifacts on this machine, so it asks AWS for nothing unless the configuration needs AWS.
 * The source CLI runs as a child process with an isolated HOME and AWS config, the network guard and a loopback STS
 * fake that records every request. The project is one pure JavaScript function, which packages without Docker.
 *
 * The account is looked up only for a directive that reads it: an assumed-role profile names its account, so even
 * then nothing is requested, and environment keys are looked up with one STS call. The function's entry file is named
 * after the account, so a wrong account fails the build. A profile that names its account is the only source of
 * credentials: when it fails, container credentials of another account must not stand in for it.
 *
 * A web build resolves its environment variables one by one. A variable that reads a resource of the stack is left out
 * with a warning, as `package` does not read the deployed stack; any other failure, such as unusable credentials, a
 * refused or missing secret or a typo in a resource or parameter name, stops the build before it runs. The build command is a
 * local script that records its environment.
 */
import { afterEach, describe, expect, test as bunTest } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer, type IncomingMessage } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';

/** Each scenario starts the source CLI as a child process, which takes several seconds. */
const test = (name: string, fn: () => Promise<void>) => bunTest(name, fn, 120_000);

const cliRoot = resolve(import.meta.dir, '..', '..');
const ROLE_ACCOUNT = '333333333333';
const KEYS_ACCOUNT = '444444444444';
const ENVIRONMENT_KEY = 'ASIAFAKEPACKAGEKEYS';
/** Served as ECS container credentials; any request signed with it means the wrong account was used. */
const CONTAINER_KEY = 'ASIAFAKECONTAINER';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

/**
 * Answers GetCallerIdentity for the environment key and serves container credentials. Secrets Manager holds the JSON
 * secret `db-credentials` and refuses `denied-secret`; other secrets do not exist. Refuses everything else. Records
 * each request's action and the key that signed it.
 */
const startAwsFake = async () => {
  const actions: string[] = [];
  const signingKeys: string[] = [];
  let containerCredentialRequests = 0;
  const server = createServer(async (request: IncomingMessage, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(chunk as Buffer);
    if (request.url === '/container-credentials') {
      containerCredentialRequests += 1;
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          AccessKeyId: CONTAINER_KEY,
          SecretAccessKey: 'fake',
          Token: 'fake',
          Expiration: new Date(Date.now() + 3_600_000).toISOString()
        })
      );
      return;
    }
    const target = request.headers['x-amz-target'];
    const action =
      typeof target === 'string'
        ? (target.split('.').pop() ?? 'unknown')
        : (new URLSearchParams(Buffer.concat(chunks).toString('utf8')).get('Action') ?? 'unknown');
    const accessKeyId = /Credential=([^/]+)\//.exec(request.headers.authorization ?? '')?.[1] ?? '';
    actions.push(action);
    signingKeys.push(accessKeyId);
    if (action === 'GetCallerIdentity' && accessKeyId === ENVIRONMENT_KEY) {
      response.writeHead(200, { 'content-type': 'text/xml' });
      response.end(`<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
  <GetCallerIdentityResult><Arn>arn:aws:iam::${KEYS_ACCOUNT}:user/ci</Arn><UserId>AIDAFAKE</UserId><Account>${KEYS_ACCOUNT}</Account></GetCallerIdentityResult>
  <ResponseMetadata><RequestId>fake</RequestId></ResponseMetadata>
</GetCallerIdentityResponse>`);
      return;
    }
    if (action === 'GetSecretValue') {
      const { SecretId: secretId } = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { SecretId: string };
      if (secretId === 'db-credentials') {
        response.writeHead(200, { 'content-type': 'application/x-amz-json-1.1' });
        response.end(
          JSON.stringify({
            ARN: 'arn:aws:secretsmanager:eu-west-1:444444444444:secret:db-credentials-AbCdEf',
            Name: secretId,
            VersionId: 'version-1',
            SecretString: JSON.stringify({ user: 'app' })
          })
        );
        return;
      }
      response.writeHead(400, { 'content-type': 'application/x-amz-json-1.1' });
      response.end(
        JSON.stringify(
          secretId === 'denied-secret'
            ? { __type: 'AccessDeniedException', Message: 'The AWS fake refuses this secret.' }
            : { __type: 'ResourceNotFoundException', Message: "Secrets Manager can't find the secret." }
        )
      );
      return;
    }
    response.writeHead(403, { 'content-type': 'text/xml' });
    response.end(`<ErrorResponse><Error><Type>Sender</Type><Code>AccessDenied</Code>
<Message>The AWS fake refuses ${action}.</Message></Error><RequestId>fake</RequestId></ErrorResponse>`);
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
  const endpoint = `http://127.0.0.1:${address.port}`;
  return {
    endpoint,
    containerCredentialsUri: `${endpoint}/container-credentials`,
    actions,
    signingKeys,
    containerCredentialRequests: () => containerCredentialRequests
  };
};

/**
 * Packages a one-function project. `entry` is the entry file's name without extension, which may be a directive;
 * the project has `handler.ts` and one file for each account, so only the right account finds its file. `resources`
 * replaces the function with other resources; `resourcesFromVariable` supplies them through `$Var()`.
 */
const runPackage = async ({
  awsEndpoint,
  entry = 'src/handler.ts',
  resources,
  resourcesFromVariable = false,
  environment = {}
}: {
  awsEndpoint: string;
  entry?: string;
  resources?: string[];
  resourcesFromVariable?: boolean;
  environment?: Record<string, string>;
}) => {
  const home = await mkdtemp(join(tmpdir(), 'stacktape-package-without-aws-'));
  cleanups.push(() => rm(home, { recursive: true, force: true }));
  const project = join(home, 'project');
  await mkdir(join(home, '.aws'));
  await mkdir(join(project, 'src'), { recursive: true });
  // `deploy` assumes the role; `base` holds keys the STS fake does not know, so using them would fail. `broken` names
  // its role's account but its source profile does not exist.
  await writeFile(
    join(home, '.aws', 'config'),
    [
      '[profile deploy]',
      `role_arn = arn:aws:iam::${ROLE_ACCOUNT}:role/deployer`,
      'source_profile = base',
      '[profile base]',
      'aws_access_key_id = AKIAFAKEBASEPROFILE',
      'aws_secret_access_key = fake',
      '[profile broken]',
      `role_arn = arn:aws:iam::${ROLE_ACCOUNT}:role/deployer`,
      'source_profile = missing',
      ''
    ].join('\n')
  );
  for (const name of ['handler', ROLE_ACCOUNT, KEYS_ACCOUNT]) {
    await writeFile(join(project, 'src', `${name}.ts`), `export default async () => ({ from: '${name}' });\n`);
  }
  // A web build runs this instead of its framework and records the environment it got.
  await mkdir(join(project, 'node_modules', '.bin'), { recursive: true });
  await writeFile(join(project, 'package.json'), '{ "name": "pkgnoaws", "private": true }\n');
  await writeFile(join(project, 'node_modules', '.bin', 'capture-env'), '#!/bin/sh\nenv > build-env.txt\n', {
    mode: 0o755
  });
  const resourceLines = resources ?? [
    '  api:',
    '    type: function',
    '    properties:',
    '      packaging:',
    '        type: js-bundle',
    '        properties:',
    `          entryfilePath: ${JSON.stringify(entry)}`
  ];
  await writeFile(
    join(project, 'stacktape.yml'),
    [
      ...(resourcesFromVariable
        ? [
            'variables:',
            '  allResources:',
            ...resourceLines.map((line) => `  ${line}`),
            'resources: $Var().allResources'
          ]
        : ['resources:', ...resourceLines]),
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
  const buildEnvironment = await readFile(join(project, 'build-env.txt'), 'utf8').then(
    (text) => text.split('\n'),
    () => undefined
  );
  return { exitCode, output: stdout + stderr, zips, buildEnvironment };
};

describe('stacktape package without AWS', () => {
  test('packages with no AWS credentials at all and asks AWS nothing', async () => {
    const aws = await startAwsFake();
    const run = await runPackage({ awsEndpoint: aws.endpoint, entry: 'src/handler.ts' });

    expect(run.exitCode, run.output).toBe(0);
    expect(run.zips).toHaveLength(1);
    expect(run.output).not.toContain('AWS credentials loaded');
    expect(aws.actions).toEqual([]);
  });

  test('environment keys are not checked with STS when nothing reads the account', async () => {
    const aws = await startAwsFake();
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      entry: 'src/handler.ts',
      environment: { AWS_ACCESS_KEY_ID: ENVIRONMENT_KEY, AWS_SECRET_ACCESS_KEY: 'fake' }
    });

    expect(run.exitCode, run.output).toBe(0);
    expect(aws.actions).toEqual([]);
  });

  test("$AwsAccountId() of an assumed-role profile comes from the profile's role, without a request", async () => {
    const aws = await startAwsFake();
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      entry: "$Format('src/{}.ts', $AwsAccountId())",
      environment: { AWS_PROFILE: 'deploy' }
    });

    expect(run.exitCode, run.output).toBe(0);
    expect(run.zips).toHaveLength(1);
    expect(aws.actions).toEqual([]);
  });

  test('$AwsAccountId() with environment keys looks the account up once with STS', async () => {
    const aws = await startAwsFake();
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      entry: "$Format('src/{}.ts', $AwsAccountId())",
      environment: { AWS_ACCESS_KEY_ID: ENVIRONMENT_KEY, AWS_SECRET_ACCESS_KEY: 'fake' }
    });

    expect(run.exitCode, run.output).toBe(0);
    expect(run.zips).toHaveLength(1);
    expect(aws.actions).toEqual(['GetCallerIdentity']);
  });

  test('a failing profile that names its account is not replaced by container credentials of another account', async () => {
    const aws = await startAwsFake();
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      entry: "$Format('src/{}.ts', $StackOutput('other-test', 'Entry'))",
      environment: { AWS_PROFILE: 'broken', AWS_CONTAINER_CREDENTIALS_FULL_URI: aws.containerCredentialsUri }
    });

    expect(aws.containerCredentialRequests(), run.output).toBe(0);
    expect(aws.signingKeys).not.toContain(CONTAINER_KEY);
    expect(run.exitCode, run.output).not.toBe(0);
    expect(run.output).toContain('Could not load AWS credentials from AWS profile "broken"');
  });

  const webResources = (environment: string[]) => [
    '  web:',
    '    type: nuxt-web',
    '    properties:',
    '      buildCommand: capture-env',
    '      environment:',
    ...environment
  ];

  test('a web build that needs AWS stops when there are no credentials, instead of building without them', async () => {
    const aws = await startAwsFake();
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      resources: webResources([
        '        - name: PLAIN',
        '          value: kept',
        '        - name: DB_PASSWORD',
        "          value: $Secret('db-password')"
      ])
    });

    expect(run.exitCode, run.output).not.toBe(0);
    expect(run.output).toContain('LOCAL_AWS_CREDENTIALS_UNAVAILABLE');
    expect(run.buildEnvironment).toBeUndefined();
  });

  const withKeys = { AWS_ACCESS_KEY_ID: ENVIRONMENT_KEY, AWS_SECRET_ACCESS_KEY: 'fake' };

  test('a web build stops, naming the variable, when it may not read a secret', async () => {
    const aws = await startAwsFake();
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      resources: webResources([
        '        - name: PLAIN',
        '          value: kept',
        '        - name: DB_PASSWORD',
        "          value: $Secret('denied-secret')"
      ]),
      environment: withKeys
    });

    expect(run.exitCode, run.output).not.toBe(0);
    expect(run.output).toContain('Cannot resolve environment variable `DB_PASSWORD` for the build of `web`');
    expect(run.output).toContain('AccessDeniedException');
    expect(run.buildEnvironment).toBeUndefined();
  });

  test('a web build stops when a secret does not contain the JSON key it reads', async () => {
    const aws = await startAwsFake();
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      resources: webResources(['        - name: DB_PASSWORD', "          value: $Secret('db-credentials.password')"]),
      environment: withKeys
    });

    expect(run.exitCode, run.output).not.toBe(0);
    expect(run.output).toContain('Cannot resolve environment variable `DB_PASSWORD` for the build of `web`');
    expect(run.output).toContain('does not contain JSON key `password`');
    expect(run.buildEnvironment).toBeUndefined();
  });

  const recordsTable = [
    '  records:',
    '    type: dynamo-db-table',
    '    properties:',
    '      primaryKey:',
    '        partitionKey:',
    '          name: id',
    '          type: string'
  ];

  test('a web variable that reads a resource of the stack is left out of the build with a warning', async () => {
    const aws = await startAwsFake();
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      resources: [
        ...recordsTable,
        ...webResources([
          '        - name: PLAIN',
          '          value: kept',
          '        - name: TABLE',
          "          value: $ResourceParam('records', 'name')"
        ])
      ],
      environment: withKeys
    });

    // The build command creates no Nuxt output, so packaging fails after it ran.
    expect(run.buildEnvironment, run.output).toContain('PLAIN=kept');
    expect(run.buildEnvironment?.some((line) => line.startsWith('TABLE='))).toBe(false);
    expect(run.output).toContain('Building `web` without environment variable `TABLE`');
  });

  test('a web variable that reads a resource supplied through a directive is left out with a warning', async () => {
    const aws = await startAwsFake();
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      resources: [
        ...recordsTable,
        ...webResources([
          '        - name: PLAIN',
          '          value: kept',
          '        - name: TABLE',
          "          value: $ResourceParam('records', 'name')"
        ])
      ],
      resourcesFromVariable: true,
      environment: withKeys
    });

    expect(run.output).not.toContain('DIRECTIVE_RESOURCE_NOT_FOUND');
    expect(run.buildEnvironment, run.output).toContain('PLAIN=kept');
    expect(run.buildEnvironment?.some((line) => line.startsWith('TABLE='))).toBe(false);
    expect(run.output).toContain('Building `web` without environment variable `TABLE`');
  });

  test('a web variable with a parameter name its resource does not have stops the build and lists the names', async () => {
    const aws = await startAwsFake();
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      resources: [
        ...recordsTable,
        ...webResources(['        - name: TABLE', "          value: $ResourceParam('records', 'nmae')"])
      ],
      environment: withKeys
    });

    expect(run.exitCode, run.output).not.toBe(0);
    expect(run.output).toContain('Cannot resolve environment variable `TABLE` for the build of `web`');
    expect(run.output).toContain('Available parameters: name, arn, streamArn.');
    expect(run.buildEnvironment).toBeUndefined();
  });

  test('a web variable that reads a resource missing from the configuration stops the build', async () => {
    const aws = await startAwsFake();
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      resources: [
        ...recordsTable,
        ...webResources(['        - name: TABLE', "          value: $ResourceParam('recordz', 'name')"])
      ],
      environment: withKeys
    });

    expect(run.exitCode, run.output).not.toBe(0);
    expect(run.output).toContain('DIRECTIVE_RESOURCE_NOT_FOUND');
    expect(run.output).toContain('recordz');
    expect(run.buildEnvironment).toBeUndefined();
  });

  test('a code-swap web service packages its code-swap image without reading the deployed stack', async () => {
    const aws = await startAwsFake();
    // Unique, so concurrent runs on the shared Docker daemon do not replace each other's image.
    const service = `swap${randomUUID().replaceAll('-', '').slice(0, 10)}`;
    const image = `stp-pkgnoaws-test-${service}-service-container`;
    cleanups.push(async () => {
      for (const tag of [image, `${image}-code-swap-base`])
        await Bun.spawn(['docker', 'image', 'rm', '--force', tag], { stdout: 'ignore', stderr: 'ignore' }).exited;
    });
    const run = await runPackage({
      awsEndpoint: aws.endpoint,
      resources: [
        `  ${service}:`,
        '    type: web-service',
        '    properties:',
        '      codeSwap: true',
        '      packaging:',
        '        type: js-bundle',
        '        properties:',
        '          entryfilePath: src/handler.ts',
        '      resources:',
        '        cpu: 0.25',
        '        memory: 512'
      ],
      environment: { AWS_PROFILE: 'deploy' }
    });

    expect(run.exitCode, run.output).toBe(0);
    expect(aws.actions).toEqual([]);
    const inspect = Bun.spawn(['docker', 'image', 'inspect', image, '--format', '{{json .Config}}'], {
      stdout: 'pipe',
      stderr: 'pipe'
    });
    const config = JSON.parse(await new Response(inspect.stdout).text()) as { Entrypoint: string[]; Env: string[] };
    expect(config.Entrypoint).toEqual(['/stacktape-supervisor']);
    const bucket = awsResourceNames.deploymentBucket(
      getGloballyUniqueStackHash({ region: 'eu-west-1', stackName: 'pkgnoaws-test', accountId: ROLE_ACCOUNT })
    );
    expect(config.Env).toContain(`STP_BENCH_BUCKET=${bucket}`);
    expect(config.Env).toContain('STP_BENCH_TABLE=pkgnoaws-test-code-swap');
  });
});
