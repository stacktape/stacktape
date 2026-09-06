import type { ChildProcess } from 'node:child_process';
import { CloudFormationClient, DescribeStacksCommand, ListStackResourcesCommand } from '@aws-sdk/client-cloudformation';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { spawn } from 'node:child_process';
import { createConnection, createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCliDevArtifacts, type CapturedProcess, runCapturedProcess } from './child-process.ts';
import { assertConsoleDevReservation } from './console-dev-reservation.ts';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const consoleApiDirectory = join(workspaceRoot, 'apps', 'console', 'api');
const consoleConfigPath = join(consoleApiDirectory, 'stacktape.ts');
const cliDirectory = join(workspaceRoot, 'apps', 'cli');
const cliDevScript = join(cliDirectory, 'scripts', 'dev.ts');

const REGION = 'eu-west-1';
const PROJECT_NAME = 'console-app';
const SHARED_DEV_STAGE = 'dev';
const LOCAL_DEV_STAGE = 'devlocal';
const SHARED_DEV_STACK = `${PROJECT_NAME}-${SHARED_DEV_STAGE}`;
const EXPECTED_AWS_ACCOUNT_ID = '977946299200';
const DATABASE_RESOURCE = 'mainDatabase';
const BASTION_RESOURCE = 'bastionHost';
const FIRST_TUNNEL_PORT = 15433;

export const assertConsoleDevSupportResources = (
  resources: { LogicalResourceId?: string | undefined; ResourceType?: string | undefined }[]
): void => {
  const legacyData = resources.filter(
    ({ LogicalResourceId, ResourceType }) =>
      /^AWS::(?:RDS|EFS|Cognito|DynamoDB|SQS)::/.test(ResourceType ?? '') ||
      (ResourceType === 'AWS::S3::Bucket' && LogicalResourceId !== 'StpDeploymentBucket')
  );
  if (legacyData.length) {
    throw new Error(
      `console-app-devlocal still owns legacy data resources: ${legacyData.map(({ LogicalResourceId }) => LogicalResourceId).join(', ')}. Startup will not remove them automatically. Complete the reviewed legacy-data migration before refreshing the minimal support stack.`
    );
  }
};

type ProcessExit = { code: number | null; signal: NodeJS.Signals | null };

type JsonlResult = {
  code?: unknown;
  data?: unknown;
  message?: unknown;
  ok?: unknown;
  type: 'result';
};

export type ConsoleDevDataPlane = {
  budgetNotificationsTopicArn: string;
  databaseHost: string;
  databaseName: string;
  pricingTableArn: string;
  pricingTableName: string;
  remoteOperationQueueArn: string;
  remoteOperationQueueUrl: string;
  userPoolClientId: string;
  userPoolDomain: string;
  userPoolId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const requiredString = (record: Record<string, unknown>, key: string, context: string): string => {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`The ${context} is missing a non-empty ${key} value.`);
  }
  return value;
};

const runCaptured = async (
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<CapturedProcess> => runCapturedProcess({ args, command, cwd, env, rejectOnSpawnError: true });

const childExit = (child: ChildProcess): Promise<ProcessExit> =>
  new Promise<ProcessExit>((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolveExit({ code, signal }));
  });

export const parseStacktapeJsonlResult = (output: string): JsonlResult => {
  const results = output
    .split(/\r?\n/)
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const parsed: unknown = JSON.parse(line);
        return isRecord(parsed) && parsed.type === 'result' ? [{ ...parsed, type: 'result' as const }] : [];
      } catch {
        return [];
      }
    });
  const result = results.at(-1);
  if (!result) throw new Error('Stacktape did not return its expected final result.');
  return result;
};

const getStacktapeFailureMessage = (result: JsonlResult): string => {
  const code = typeof result.code === 'string' ? result.code : 'UNKNOWN';
  const message = typeof result.message === 'string' ? result.message : 'Stacktape command failed.';
  if (code.includes('API_KEY')) {
    return 'Your Stacktape login is missing or expired. Run `pnpm dev:cli login`, finish the browser flow, and retry.';
  }
  return `${message} (${code})`;
};

const readParamValue = (resource: Record<string, unknown>, paramName: string, resourceName: string): string => {
  const referencableParams = resource.referencableParams;
  if (!isRecord(referencableParams)) throw new Error(`${resourceName} has no referencable parameters.`);
  const parameter = referencableParams[paramName];
  if (!isRecord(parameter)) throw new Error(`${resourceName} is missing its ${paramName} parameter.`);
  const value = parameter.value;
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${resourceName}.${paramName} is not a non-empty string.`);
  }
  return value;
};

export const extractConsoleDevDataPlane = (describeStacksOutput: unknown): ConsoleDevDataPlane => {
  if (!isRecord(describeStacksOutput) || !Array.isArray(describeStacksOutput.Stacks)) {
    throw new Error('AWS did not return a CloudFormation stack list.');
  }
  const stack = describeStacksOutput.Stacks[0];
  if (!isRecord(stack)) throw new Error(`${SHARED_DEV_STACK} does not exist in ${REGION}.`);
  const status = requiredString(stack, 'StackStatus', SHARED_DEV_STACK);
  if (status.endsWith('_IN_PROGRESS') || status.includes('FAILED') || status.includes('ROLLBACK')) {
    throw new Error(`${SHARED_DEV_STACK} is not ready (status: ${status}).`);
  }
  if (!Array.isArray(stack.Outputs)) throw new Error(`${SHARED_DEV_STACK} has no outputs.`);
  const stackInfoOutput = stack.Outputs.find((output) => isRecord(output) && output.OutputKey === 'StpStackInfoMap');
  if (!isRecord(stackInfoOutput) || typeof stackInfoOutput.OutputValue !== 'string') {
    throw new Error(`${SHARED_DEV_STACK} has no StpStackInfoMap output.`);
  }
  let stackInfo: unknown;
  try {
    stackInfo = JSON.parse(stackInfoOutput.OutputValue);
  } catch {
    throw new Error(`${SHARED_DEV_STACK} has an invalid StpStackInfoMap output.`);
  }
  if (!isRecord(stackInfo) || !isRecord(stackInfo.resources)) {
    throw new Error(`${SHARED_DEV_STACK} has an invalid resource map.`);
  }
  const resources = stackInfo.resources;
  const database = resources[DATABASE_RESOURCE];
  const userPool = resources.mainUserPool;
  if (!isRecord(database) || database.resourceType !== 'relational-database') {
    throw new Error(`${SHARED_DEV_STACK} has no relational database named ${DATABASE_RESOURCE}.`);
  }
  if (!isRecord(userPool) || userPool.resourceType !== 'user-auth-pool') {
    throw new Error(`${SHARED_DEV_STACK} has no user-auth-pool named mainUserPool.`);
  }
  const sharedParameter = (name: string, type: string, parameter: string): string => {
    const resource = resources[name];
    if (!isRecord(resource) || resource.resourceType !== type) {
      throw new Error(`${SHARED_DEV_STACK} has no ${type} named ${name}.`);
    }
    return readParamValue(resource, parameter, name);
  };
  return {
    budgetNotificationsTopicArn: sharedParameter('budgetNotificationsTopic', 'sns-topic', 'arn'),
    databaseHost: readParamValue(database, 'host', DATABASE_RESOURCE),
    databaseName: readParamValue(database, 'dbName', DATABASE_RESOURCE),
    pricingTableArn: sharedParameter('pricingTable', 'dynamo-db-table', 'arn'),
    pricingTableName: sharedParameter('pricingTable', 'dynamo-db-table', 'name'),
    remoteOperationQueueArn: sharedParameter('remoteOperationQueue', 'sqs-queue', 'arn'),
    remoteOperationQueueUrl: sharedParameter('remoteOperationQueue', 'sqs-queue', 'url'),
    userPoolClientId: readParamValue(userPool, 'clientId', 'mainUserPool'),
    userPoolDomain: readParamValue(userPool, 'domain', 'mainUserPool'),
    userPoolId: readParamValue(userPool, 'id', 'mainUserPool')
  };
};

const checkPortAvailable = (port: number): Promise<boolean> =>
  new Promise<boolean>((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') resolvePort(false);
      else reject(error);
    });
    server.listen(port, '127.0.0.1', () => server.close(() => resolvePort(true)));
  });

const findTunnelPort = async (): Promise<number> => {
  const ports = Array.from({ length: 20 }, (_, index) => FIRST_TUNNEL_PORT + index);
  const availability = await Promise.all(ports.map(checkPortAvailable));
  const port = ports.find((_, index) => availability[index]);
  if (port !== undefined) return port;
  throw new Error(`No free database tunnel port was found between ${FIRST_TUNNEL_PORT} and ${FIRST_TUNNEL_PORT + 19}.`);
};

const canConnect = (port: number): Promise<boolean> =>
  new Promise<boolean>((resolveConnection) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolveConnection(true);
    });
    const unavailable = () => {
      socket.destroy();
      resolveConnection(false);
    };
    socket.once('error', unavailable);
    socket.once('timeout', unavailable);
  });

const waitForTunnel = async (port: number, tunnelExit: Promise<ProcessExit>): Promise<void> => {
  const deadline = Date.now() + 30_000;
  const poll = async (): Promise<void> => {
    if (Date.now() >= deadline) throw new Error('Timed out waiting for the shared dev database tunnel.');
    const outcome = await Promise.race([
      canConnect(port).then((ready) => ({ kind: 'probe' as const, ready })),
      tunnelExit.then((exit) => ({ kind: 'exit' as const, exit }))
    ]);
    if (outcome.kind === 'exit') {
      throw new Error(
        `The shared dev database tunnel exited before it was ready (exit: ${outcome.exit.code ?? outcome.exit.signal}).`
      );
    }
    if (outcome.ready) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
    return poll();
  };
  return poll();
};

export const terminateChild = async (
  child: ChildProcess | undefined,
  exit: Promise<ProcessExit> | undefined
): Promise<void> => {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  if (!child.killed) child.kill('SIGINT');
  if (!exit) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const stopped = await Promise.race([
      exit.then(() => true),
      new Promise<false>((resolveWait) => {
        timer = setTimeout(() => resolveWait(false), 5_000);
      })
    ]);
    if (!stopped && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    await exit;
  } finally {
    clearTimeout(timer);
  }
};

const main = async () => {
  if (!process.versions.bun) {
    throw new Error('This helper must be run through Bun. Use `pnpm dev:console`.');
  }

  await assertConsoleDevReservation();

  const buildExitCode = await buildCliDevArtifacts(workspaceRoot);
  if (buildExitCode !== 0) {
    process.exitCode = buildExitCode;
    return;
  }

  const loginCheck = await runCaptured(
    process.execPath,
    [cliDevScript, 'info:whoami', '--agent', '--outputFormat', 'jsonl'],
    cliDirectory
  );
  const loginResult = parseStacktapeJsonlResult(loginCheck.stdout);
  if (loginCheck.code !== 0 || loginResult.ok !== true) throw new Error(getStacktapeFailureMessage(loginResult));

  let identity;
  try {
    identity = await new STSClient({ region: REGION }).send(new GetCallerIdentityCommand({}));
  } catch {
    throw new Error(
      'AWS authentication failed. Configure credentials for the Console dev account through the standard AWS SDK credential chain and retry.'
    );
  }
  if (identity.Account !== EXPECTED_AWS_ACCOUNT_ID) {
    const account = identity.Account || 'unknown';
    throw new Error(
      `Refusing to start Console dev mode in AWS account ${account}; expected ${EXPECTED_AWS_ACCOUNT_ID}.`
    );
  }

  let stackDetails;
  try {
    stackDetails = await new CloudFormationClient({ region: REGION }).send(
      new DescribeStacksCommand({ StackName: SHARED_DEV_STACK })
    );
  } catch {
    throw new Error(`Could not inspect ${SHARED_DEV_STACK} in ${REGION}. Confirm the stack exists and is readable.`);
  }
  const dataPlane = extractConsoleDevDataPlane(stackDetails);
  const cloudFormation = new CloudFormationClient({ region: REGION });
  const supportResources: { LogicalResourceId?: string | undefined; ResourceType?: string | undefined }[] = [];
  let nextToken: string | undefined;
  do {
    try {
      // eslint-disable-next-line no-await-in-loop -- Each page supplies the token required to request the next page.
      const page = await cloudFormation.send(
        new ListStackResourcesCommand({ StackName: `${PROJECT_NAME}-${LOCAL_DEV_STAGE}`, NextToken: nextToken })
      );
      supportResources.push(...(page.StackResourceSummaries ?? []));
      nextToken = page.NextToken;
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'ValidationError' &&
        /does not exist/.test(error.message) &&
        !nextToken
      )
        break;
      throw new Error('Could not inspect the existing Console devlocal resources. Startup stopped before any update.', {
        cause: error
      });
    }
  } while (nextToken);
  assertConsoleDevSupportResources(supportResources);
  const tunnelPort = await findTunnelPort();
  const devEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    STACKTAPE_CONSOLE_DEV_BUDGET_TOPIC_ARN: dataPlane.budgetNotificationsTopicArn,
    STACKTAPE_CONSOLE_DEV_PRICING_TABLE_ARN: dataPlane.pricingTableArn,
    STACKTAPE_CONSOLE_DEV_PRICING_TABLE_NAME: dataPlane.pricingTableName,
    STACKTAPE_CONSOLE_DEV_OPERATION_QUEUE_ARN: dataPlane.remoteOperationQueueArn,
    STACKTAPE_CONSOLE_DEV_OPERATION_QUEUE_URL: dataPlane.remoteOperationQueueUrl,
    STACKTAPE_CONSOLE_DEV_DATABASE_HOST: dataPlane.databaseHost,
    STACKTAPE_CONSOLE_DEV_DATABASE_NAME: dataPlane.databaseName,
    STACKTAPE_CONSOLE_DEV_DATABASE_TUNNEL_HOST: process.platform === 'linux' ? '127.0.0.1' : 'host.docker.internal',
    STACKTAPE_CONSOLE_DEV_DATABASE_TUNNEL_PORT: String(tunnelPort),
    STACKTAPE_CONSOLE_DEV_USER_POOL_CLIENT_ID: dataPlane.userPoolClientId,
    STACKTAPE_CONSOLE_DEV_USER_POOL_DOMAIN: dataPlane.userPoolDomain,
    STACKTAPE_CONSOLE_DEV_USER_POOL_ID: dataPlane.userPoolId
  };

  console.info(`Opening the ${SHARED_DEV_STACK} database tunnel on 127.0.0.1:${tunnelPort}...`);
  const tunnel = spawn(
    process.execPath,
    [
      '--no-orphans',
      cliDevScript,
      'bastion:tunnel',
      '--region',
      REGION,
      '--stage',
      SHARED_DEV_STAGE,
      '--projectName',
      PROJECT_NAME,
      '--resourceName',
      DATABASE_RESOURCE,
      '--bastionResource',
      BASTION_RESOURCE,
      '--localTunnelingPort',
      String(tunnelPort),
      '--outputFormat',
      'plain'
    ],
    { cwd: cliDirectory, env: process.env, stdio: 'inherit', windowsHide: true }
  );
  const tunnelExited = childExit(tunnel);
  let dev: ChildProcess | undefined;
  let devExited: Promise<ProcessExit> | undefined;
  let cleanupPromise: Promise<void> | undefined;
  const cleanup = () => {
    cleanupPromise ??= (async () => {
      try {
        await terminateChild(dev, devExited);
      } finally {
        await terminateChild(tunnel, tunnelExited);
      }
    })();
    return cleanupPromise;
  };
  let interrupted = false;
  const handleSignal = (signal: NodeJS.Signals) => {
    interrupted = true;
    process.exitCode = signal === 'SIGINT' ? 130 : 143;
    void cleanup().catch(() => {
      process.exitCode = 1;
    });
  };
  process.once('SIGINT', handleSignal);
  process.once('SIGTERM', handleSignal);

  try {
    await waitForTunnel(tunnelPort, tunnelExited);
    if (interrupted) return;
    console.info('Shared dev data plane is ready. Starting the local Console API and UI...\n');
    dev = spawn(
      process.execPath,
      [
        '--no-orphans',
        cliDevScript,
        'dev',
        '--region',
        REGION,
        '--stage',
        LOCAL_DEV_STAGE,
        '--configPath',
        consoleConfigPath,
        '--currentWorkingDirectory',
        consoleApiDirectory,
        '--projectName',
        PROJECT_NAME,
        '--resources',
        'apiServer,webBucket'
      ],
      { cwd: cliDirectory, env: devEnvironment, stdio: 'inherit', windowsHide: true }
    );
    devExited = childExit(dev);
    const outcome = await Promise.race([
      devExited.then((exit) => ({ kind: 'dev' as const, exit })),
      tunnelExited.then((exit) => ({ kind: 'tunnel' as const, exit }))
    ]);
    if (interrupted) return;
    if (outcome.kind === 'tunnel' && dev.exitCode === null) {
      throw new Error(
        `The shared dev database tunnel stopped unexpectedly (${outcome.exit.code ?? outcome.exit.signal}).`
      );
    }
    process.exitCode = outcome.exit.code ?? (outcome.exit.signal ? 1 : 0);
  } finally {
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
    await cleanup();
  }
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
