/** Deployed Lambda → real dev tunnel → local PostgreSQL, including log readback and environment restoration. */
import { plugin } from 'bun';
import { randomBytes } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join, dirname, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import AdmZip from 'adm-zip';
import { Client } from 'pg';
import { fromIni } from '@aws-sdk/credential-providers';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import {
  IAMClient,
  CreateRoleCommand,
  PutRolePolicyCommand,
  GetRoleCommand,
  DeleteRoleCommand,
  DeleteRolePolicyCommand
} from '@aws-sdk/client-iam';
import {
  LambdaClient,
  CreateFunctionCommand,
  GetFunctionCommand,
  GetFunctionConfigurationCommand,
  InvokeCommand,
  DeleteFunctionCommand,
  waitUntilFunctionActiveV2
} from '@aws-sdk/client-lambda';
import {
  CloudWatchLogsClient,
  CreateLogGroupCommand,
  DeleteLogGroupCommand,
  DescribeLogGroupsCommand
} from '@aws-sdk/client-cloudwatch-logs';
import { createStacktapeOpenTuiBuildPlugin } from '../support/opentui-loader';

const check: (value: unknown, message: string) => asserts value = (value, message) => {
  if (!value) throw new Error(message);
};
const PREFIX = 'STP_AWS_LAMBDA_DEV_';
export const resolveLambdaDevOptions = (env: Record<string, string | undefined> = process.env) => {
  check(env[`${PREFIX}DEPLOY`] === '1', 'Explicit Lambda dev canary opt-in is required.');
  check(
    env[`${PREFIX}CONFIRM_DISPOSABLE`] === 'this-is-a-disposable-test-account',
    'Disposable account confirmation is required.'
  );
  check(env[`${PREFIX}PROFILE`] === 'stacktape-e2e', 'Only the stacktape-e2e profile is accepted.');
  const accountId = env[`${PREFIX}EXPECTED_ACCOUNT_ID`];
  check(accountId && /^\d{12}$/.test(accountId), 'An exact 12-digit expected account is required.');
  const stateFile = env[`${PREFIX}STATE_FILE`];
  check(stateFile && isAbsolute(stateFile), 'An absolute recovery state file is required.');
  const owner = env[`${PREFIX}OWNER`];
  check(owner && /^[a-z0-9-]{1,40}$/.test(owner), 'A safe unique owner is required.');
  check(
    !Object.keys(env).some((key) => key === 'AWS_ENDPOINT_URL' || key.startsWith('AWS_ENDPOINT_URL_')),
    'Endpoint overrides are forbidden.'
  );
  check(process.platform === 'linux', 'This canary currently qualifies Linux only.');
  // Dev mode has no default relay: bore relays are unauthenticated, so only one the operator controls is acceptable.
  check(
    env.STACKTAPE_TUNNEL_SERVER?.trim(),
    'Set STACKTAPE_TUNNEL_SERVER to a bore-compatible relay you control; dev mode never uses a public relay.'
  );
  return { accountId, stateFile, owner, region: 'eu-west-1' as const, profile: 'stacktape-e2e' };
};

type State = {
  accountId: string;
  owner: string;
  region: string;
  name: string;
  directory: string;
  container: string;
  roleAttempted: boolean;
  functionAttempted: boolean;
  containerAttempted: boolean;
  cleanupVerified?: boolean;
};
export const validateLambdaDevRecoveryState = (
  value: unknown,
  options: ReturnType<typeof resolveLambdaDevOptions>
): State => {
  check(typeof value === 'object' && value !== null, 'Recovery state must be an object.');
  const candidate = value as Record<string, unknown>;
  check(
    candidate.accountId === options.accountId &&
      candidate.owner === options.owner &&
      candidate.region === options.region,
    'Recovery state identity differs from this run.'
  );
  check(
    typeof candidate.name === 'string' &&
      new RegExp(`^v4lambdadev-${options.owner}-[a-f0-9]{8}$`).test(candidate.name) &&
      candidate.container === candidate.name,
    'Recovery resource names differ from this run.'
  );
  check(
    typeof candidate.directory === 'string' &&
      dirname(candidate.directory) === tmpdir() &&
      /^stacktape-lambda-dev-[a-zA-Z0-9]{6}$/.test(basename(candidate.directory)),
    'Recovery directory is not an owned temporary directory.'
  );
  check(
    typeof candidate.roleAttempted === 'boolean' &&
      typeof candidate.functionAttempted === 'boolean' &&
      typeof candidate.containerAttempted === 'boolean',
    'Recovery creation flags are invalid.'
  );
  return {
    accountId: options.accountId,
    owner: options.owner,
    region: options.region,
    name: candidate.name,
    container: candidate.name,
    directory: candidate.directory,
    roleAttempted: candidate.roleAttempted,
    functionAttempted: candidate.functionAttempted,
    containerAttempted: candidate.containerAttempted,
    cleanupVerified: candidate.cleanupVerified === true
  };
};

const absent = (error: unknown) =>
  error instanceof Error && ['ResourceNotFoundException', 'NoSuchEntityException', 'NoSuchEntity'].includes(error.name);
const docker = (args: string[], allowMissing = false) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 60_000 });
  if (result.status !== 0 && !(allowMissing && /No such (?:object|container)/i.test(result.stderr ?? ''))) {
    // Docker run contains a test DB password; never repeat argv or its command in failure output.
    throw new Error(`Docker ${args[0]} failed (${result.status}).`);
  }
  return result.stdout.trim();
};
const waitFor = async (description: string, predicate: () => Promise<boolean>, timeout = 60_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${description}.`);
};
const portIsOpen = (port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });

export const runLambdaDevCanary = async (cleanupOnly = false) => {
  const options = resolveLambdaDevOptions();
  const config = {
    region: options.region,
    credentials: fromIni({ profile: options.profile }),
    ignoreConfiguredEndpointUrls: true,
    maxAttempts: 3
  };
  const sts = new STSClient(config);
  const iam = new IAMClient(config);
  const lambda = new LambdaClient(config);
  const logs = new CloudWatchLogsClient(config);
  let state: State | undefined;
  let db: Client | undefined;
  let port: number | undefined;
  let closeDev = async () => {};
  const save = () => writeFile(options.stateFile, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  const cleanup = async () => {
    if (!state || state.cleanupVerified) return;
    if (state.containerAttempted) {
      const inspected = spawnSync('docker', ['inspect', state.container], { encoding: 'utf8', timeout: 10_000 });
      if (inspected.status === 0) {
        const [container] = JSON.parse(inspected.stdout) as Array<{ Config: { Labels: Record<string, string> } }>;
        check(
          container.Config.Labels['stacktape-canary-owner'] === state.owner,
          'Refusing to remove a foreign container.'
        );
        docker(['rm', '-f', '-v', state.container]);
      } else
        check(/No such (?:object|container)/i.test(inspected.stderr), 'Docker cannot establish container absence.');
      docker(['inspect', state.container], true);
      const exists = spawnSync('docker', ['inspect', state.container], { encoding: 'utf8', timeout: 10_000 });
      check(
        exists.status !== 0 && /No such (?:object|container)/i.test(exists.stderr),
        'The owned database container remains.'
      );
    }
    if (port) check(!(await portIsOpen(port)), 'The local database port remains open.');
    // Exact identities and tags authorize deletion after a partial setup or a resumed cleanup.
    if (state.functionAttempted) {
      try {
        const existing = await lambda.send(new GetFunctionCommand({ FunctionName: state.name }));
        check(
          existing.Tags?.['stacktape-canary-owner'] === state.owner,
          'Refusing to delete a function with another owner.'
        );
        await lambda.send(new DeleteFunctionCommand({ FunctionName: state.name }));
      } catch (error) {
        if (!absent(error)) throw error;
      }
      await waitFor('function deletion', async () => {
        try {
          await lambda.send(new GetFunctionCommand({ FunctionName: state!.name }));
          return false;
        } catch (error) {
          if (absent(error)) return true;
          throw error;
        }
      });
      const groupName = `/aws/lambda/${state.name}`;
      await logs.send(new DeleteLogGroupCommand({ logGroupName: groupName })).catch((error) => {
        if (!absent(error)) throw error;
      });
      check(
        !(await logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: groupName }))).logGroups?.some(
          (group) => group.logGroupName === groupName
        ),
        'The exact Lambda log group still exists.'
      );
    }
    if (state.roleAttempted) {
      try {
        const existing = await iam.send(new GetRoleCommand({ RoleName: state.name }));
        check(
          existing.Role?.Tags?.some(({ Key, Value }) => Key === 'stacktape-canary-owner' && Value === state!.owner),
          'Refusing to delete a role with another owner.'
        );
        await iam.send(new DeleteRolePolicyCommand({ RoleName: state.name, PolicyName: 'logs' })).catch((error) => {
          if (!absent(error)) throw error;
        });
        await iam.send(new DeleteRoleCommand({ RoleName: state.name }));
      } catch (error) {
        if (!absent(error)) throw error;
      }
      await waitFor('role deletion', async () => {
        try {
          await iam.send(new GetRoleCommand({ RoleName: state!.name }));
          return false;
        } catch (error) {
          if (absent(error)) return true;
          throw error;
        }
      });
    }
    await rm(state.directory, { recursive: true, force: true });
    state.cleanupVerified = true;
    await save();
    console.info('Lambda dev canary cleanup verified: function, role, log group, container and local port removed.');
  };
  let failure: unknown;
  try {
    await (async () => {
      check(
        (await sts.send(new GetCallerIdentityCommand({}))).Account === options.accountId,
        'The profile account differs from the expected account.'
      );
      if (cleanupOnly) {
        // Only validated recovery state authorizes cleanup, including from finally after a failure.
        state = validateLambdaDevRecoveryState(JSON.parse(await readFile(options.stateFile, 'utf8')), options);
        await cleanup();
        return;
      }
      check(!(await Bun.file(options.stateFile).exists()), 'Recovery state already exists; run --cleanup-only first.');
      const name = `v4lambdadev-${options.owner}-${randomBytes(4).toString('hex')}`;
      state = {
        accountId: options.accountId,
        owner: options.owner,
        region: options.region,
        name,
        directory: await mkdtemp(join(tmpdir(), 'stacktape-lambda-dev-')),
        container: name,
        roleAttempted: false,
        functionAttempted: false,
        containerAttempted: false
      };
      await save();
      state.roleAttempted = true;
      await save();
      const role = await iam.send(
        new CreateRoleCommand({
          RoleName: name,
          Tags: [{ Key: 'stacktape-canary-owner', Value: options.owner }],
          AssumeRolePolicyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }]
          })
        })
      );
      await iam.send(
        new PutRolePolicyCommand({
          RoleName: name,
          PolicyName: 'logs',
          PolicyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
                Resource: `arn:aws:logs:${options.region}:${options.accountId}:log-group:/aws/lambda/${name}:*`
              }
            ]
          })
        })
      );
      const entry = join(state.directory, 'index.ts');
      await writeFile(
        entry,
        `import { Client } from ${JSON.stringify(join(import.meta.dir, '../../node_modules/pg/lib/index.js'))};\nexport async function handler() { const db = new Client({ connectionString: process.env.STP_DB_CONNECTION_STRING, connectionTimeoutMillis: 8000 }); await db.connect(); try { const result = await db.query('select value from dev_values'); const value = result.rows[0].value; console.info('DEV_DATABASE_VALUE=' + value); return { value }; } finally { await db.end(); } }\n`
      );
      const built = await Bun.build({ entrypoints: [entry], target: 'node', format: 'cjs', minify: true });
      check(built.success, 'Lambda fixture did not bundle.');
      const zip = new AdmZip();
      zip.addFile('index.js', Buffer.from(await built.outputs[0].text()));
      const originals = { STP_DB_CONNECTION_STRING: 'postgresql://deployed.invalid:5432/original' };
      state.functionAttempted = true;
      await save();
      // IAM role propagation is an external contract; retry only this specific create rejection.
      await waitFor('IAM role propagation', async () => {
        try {
          await lambda.send(
            new CreateFunctionCommand({
              FunctionName: name,
              Role: role.Role!.Arn!,
              Runtime: 'nodejs22.x',
              Handler: 'index.handler',
              Timeout: 15,
              Code: { ZipFile: zip.toBuffer() },
              Environment: { Variables: originals },
              Tags: { 'stacktape-canary-owner': options.owner }
            })
          );
          return true;
        } catch (error) {
          if (
            error instanceof Error &&
            error.name === 'InvalidParameterValueException' &&
            /role.*assumed/i.test(error.message)
          )
            return false;
          throw error;
        }
      });
      await waitUntilFunctionActiveV2({ client: lambda, maxWaitTime: 60 }, { FunctionName: name });
      // Stacktape normally creates this log group in CloudFormation. Seed that unrelated prerequisite here.
      await logs.send(
        new CreateLogGroupCommand({
          logGroupName: `/aws/lambda/${name}`,
          tags: { 'stacktape-canary-owner': options.owner }
        })
      );
      state.containerAttempted = true;
      await save();
      const password = randomBytes(16).toString('hex');
      docker([
        'run',
        '-d',
        '--name',
        name,
        '--label',
        `stacktape-canary-owner=${options.owner}`,
        '-p',
        '127.0.0.1::5432',
        '--tmpfs',
        '/var/lib/postgresql/data',
        '-e',
        `POSTGRES_PASSWORD=${password}`,
        'postgres:16.4'
      ]);
      port = Number(docker(['port', name, '5432/tcp']).split(':').at(-1));
      check(Number.isInteger(port) && port > 0, 'Docker returned no database port.');
      await waitFor(
        'PostgreSQL readiness',
        async () =>
          spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'postgres'], { stdio: 'ignore', timeout: 5000 })
            .status === 0
      );
      const connectionString = `postgresql://postgres:${password}@127.0.0.1:${port}/postgres`;
      db = new Client({ connectionString });
      await db.connect();
      await db.query("create table dev_values(value text); insert into dev_values values ('first');");
      plugin(createStacktapeOpenTuiBuildPlugin());
      const [
        { globalStateManager },
        { applicationManager },
        { awsSdkManager },
        { startTunnel, registerTunnelCleanupHook, getActiveTunnels },
        { updateLambdaEnvVarsWithTunnels, registerLambdaEnvCleanupHook },
        { LambdaCloudwatchLogPrinter }
      ] = await Promise.all([
        import('../../src/app/global-state-manager'),
        import('../../src/app/application-manager'),
        import('../../src/utils/aws-sdk-manager'),
        import('../../src/commands/dev/tunnel-manager'),
        import('../../src/commands/dev/lambda-env-manager'),
        import('../../src/utils/cloudwatch-logs')
      ]);
      globalStateManager.rawArgs = { region: options.region, profile: options.profile };
      // The env manager uses the explicitly selected profile's standard credential chain.
      process.env.AWS_PROFILE = options.profile;
      process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS = 'true';
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_SESSION_TOKEN;
      awsSdkManager.init({ region: options.region, credentials: config.credentials, plugins: [] });
      registerLambdaEnvCleanupHook();
      registerTunnelCleanupHook();
      closeDev = async () => {
        await Promise.all(applicationManager.cleanUpHooks.map((hook) => hook({ success: true, interrupted: false })));
        check(getActiveTunnels().length === 0, 'Dev cleanup left an active tunnel.');
      };
      const startedAt = Date.now() - 1000;
      const tunnel = await startTunnel('db', port);
      const updated = await updateLambdaEnvVarsWithTunnels({
        lambdas: [{ name: 'query', functionName: name, referencedLocalResources: ['db'] }],
        tunnels: [tunnel],
        localResources: [
          {
            name: 'db',
            type: 'postgres',
            version: '16.4',
            port,
            actualPort: port,
            dataDir: state.directory,
            host: '127.0.0.1',
            containerName: name,
            connectionString,
            referencableParams: { connectionString }
          }
        ]
      });
      check(updated.updated.includes('query'), 'Dev did not update the deployed Lambda.');
      const invoke = async (expected: string) => {
        const result = await lambda.send(new InvokeCommand({ FunctionName: name, Payload: Buffer.from('{}') }));
        check(
          !result.FunctionError &&
            result.Payload &&
            JSON.parse(Buffer.from(result.Payload).toString()).value === expected,
          `The deployed Lambda did not query the local database (${expected}).`
        );
      };
      await invoke('first');
      await db.query("update dev_values set value = 'edited'");
      await invoke('edited');
      const lines: string[] = [];
      const printer = new LambdaCloudwatchLogPrinter({
        fetchSince: startedAt,
        logGroupAwsResourceName: `/aws/lambda/${name}`,
        onLog: (line) => lines.push(line)
      });
      await waitFor('dev log printer to observe both database values', async () => {
        await printer.printLogs();
        return (
          lines.some((line) => line.includes('DEV_DATABASE_VALUE=first')) &&
          lines.some((line) => line.includes('DEV_DATABASE_VALUE=edited'))
        );
      });
      await closeDev();
      check(
        (await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: name }))).Environment?.Variables
          ?.STP_DB_CONNECTION_STRING === originals.STP_DB_CONNECTION_STRING,
        'Dev cleanup did not restore the original Lambda environment.'
      );
      console.info(
        'Deployed Lambda read initial and edited local PostgreSQL values through the real dev tunnel; dev logs and environment restoration passed.'
      );
    })();
  } catch (error) {
    failure = error;
  } finally {
    const localCleanup = await Promise.allSettled([closeDev(), db?.end()]);
    for (const result of localCleanup) if (result.status === 'rejected') failure ??= result.reason;
    try {
      await cleanup();
    } catch (error) {
      console.error('Cleanup failed:', error instanceof Error ? error.message : 'unknown error');
      failure ??= error;
    }
    if (state && !state.cleanupVerified) {
      console.error(
        `Cleanup incomplete. Recover with ${PREFIX}DEPLOY=1 ${PREFIX}CONFIRM_DISPOSABLE=this-is-a-disposable-test-account ${PREFIX}PROFILE=stacktape-e2e ${PREFIX}EXPECTED_ACCOUNT_ID=${options.accountId} ${PREFIX}OWNER=${options.owner} ${PREFIX}STATE_FILE=${options.stateFile} pnpm --filter @stacktape/cli run test:real-aws-lambda-dev -- --cleanup-only`
      );
    }
    sts.destroy();
    iam.destroy();
    lambda.destroy();
    logs.destroy();
  }
  if (failure) throw failure;
};

if (import.meta.main) {
  runLambdaDevCanary(process.argv.includes('--cleanup-only')).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Lambda dev canary failed.');
    process.exitCode = 1;
  });
}
