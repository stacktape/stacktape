import { globalStateManager } from '@application-services/global-state-manager';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { connect, createServer, type AddressInfo } from 'node:net';
import { DOCKER_HOST_NAME, getLocalWorkloadEndpoint } from './container/network';
import { getWorkloadEnvironmentVars, pointLoopbackAtHost } from './utils';

/**
 * In dev mode a workload's environment is built from its config: `$ResourceParam` references to workloads that run
 * locally become their local addresses, every other directive resolves against the deployed stack, and the JS/TS
 * runtime flags are added. Synthesis never takes this path, so it is proved here through the real builder.
 */
const originalStackInfoMap = deployedStackOverviewManager.stackInfoMap;

beforeAll(() => {
  configManager.reset();
  configManager.configResolver.setContext({
    authoringParams: { stage: 'local', region: 'eu-west-1', cliArgs: {}, command: 'dev', awsProfile: '' },
    builtInDirectives: {
      runtime: {
        calculatedStackOverviewManager,
        configManager,
        deployedStackOverviewManager,
        stackManager,
        templateManager
      },
      accountId: '123456789999',
      additionalArgs: {},
      awsProfile: '',
      cliArgs: {},
      command: 'dev',
      disableEmulation: false,
      region: 'eu-west-1',
      stage: 'local',
      workingDir: process.cwd()
    },
    workingDir: process.cwd()
  });
  configManager.configResolver.registerBuiltInDirectives();
  deployedStackOverviewManager.stackInfoMap = {
    resources: {
      db: { referencableParams: { connectionString: { value: 'postgresql://deployed.internal:5432/app' } } }
    }
  } as unknown as typeof originalStackInfoMap;
});

afterAll(() => {
  deployedStackOverviewManager.stackInfoMap = originalStackInfoMap;
  configManager.reset();
});

test('a dev workload sees local workloads at their local address and deployed resources at their deployed values', async () => {
  const environment = await getWorkloadEnvironmentVars({
    workloadType: 'function',
    jobName: 'api',
    workloadName: 'api',
    jobEnvironment: [
      { name: 'SERVICE_URL', value: "$ResourceParam('service', 'url')" },
      { name: 'SERVICE_ADDRESS', value: "$ResourceParam('service', 'address')" },
      { name: 'DATABASE_URL', value: "$ResourceParam('db', 'connectionString')" },
      { name: 'STAGE', value: '$Stage()' }
    ],
    connectTo: [],
    packagingType: 'js-bundle',
    entryfilePath: 'src/api.ts',
    nodeVersion: 22,
    skipAwsCredentials: true,
    localWorkloadAddresses: { service: 'http://localhost:3000' }
  });

  expect(environment).toMatchObject({
    SERVICE_URL: 'http://localhost:3000',
    SERVICE_ADDRESS: 'http://localhost:3000',
    DATABASE_URL: 'postgresql://deployed.internal:5432/app',
    STAGE: 'local'
  });
  expect(String(environment.NODE_OPTIONS).split(' ')).toEqual(
    expect.arrayContaining(['--enable-source-maps', '--experimental-require-module'])
  );
}, 20_000);

// A local container's unchanged AWS SDK code called real DynamoDB (AccessDenied) because only deployed dev functions
// got the SDK's endpoint variable. Every local consumer connected to local tables gets it; all local tables share one
// DynamoDB Local, so one endpoint serves several. With a deployed table in `connectTo` too, one endpoint cannot serve
// both, so the variable is left out.
test('local workloads and scripts connected to local DynamoDB tables get AWS_ENDPOINT_URL_DYNAMODB', async () => {
  const resources = deployedStackOverviewManager.stackInfoMap!.resources as Record<string, unknown>;
  resources.archive = { resourceType: 'dynamo-db-table', referencableParams: { name: { value: 'deployed-archive' } } };
  deployedStackOverviewManager.injectLocalResourceInfo(
    ['events', 'sessions'].map((name) => ({
      name,
      resourceType: 'dynamodb',
      referencableParams: { name, endpoint: 'http://localhost:12200' }
    }))
  );
  const endpointFor = (connectTo: string[]) =>
    deployedStackOverviewManager.getLocalDynamoDbEndpointEnvVars(connectTo).AWS_ENDPOINT_URL_DYNAMODB;

  expect(endpointFor(['events'])).toBe('http://localhost:12200');
  expect(endpointFor(['db', 'events', 'sessions'])).toBe('http://localhost:12200');
  expect(endpointFor(['events', 'archive'])).toBeUndefined();
  expect(endpointFor(['archive'])).toBeUndefined();
  expect(endpointFor(['db'])).toBeUndefined();

  // Local scripts (hooks, seeds) resolve their `connectTo` here.
  expect(deployedStackOverviewManager.locallyResolveEnvVariablesFromConnectTo(['events'])).toMatchObject({
    STP_EVENTS_ENDPOINT: 'http://localhost:12200',
    AWS_ENDPOINT_URL_DYNAMODB: 'http://localhost:12200'
  });

  // A container gets it with its other local variables, at the address it reaches the host by.
  const environment = await getWorkloadEnvironmentVars({
    workloadType: 'multi-container-workload',
    jobName: 'api',
    workloadName: 'api',
    jobEnvironment: [],
    connectTo: [],
    skipAwsCredentials: true,
    localResourceEnvVars: deployedStackOverviewManager.getLocalDynamoDbEndpointEnvVars(['events'])
  });
  expect(environment.AWS_ENDPOINT_URL_DYNAMODB).toMatch(/^http:\/\/[^/]+:12200$/);
  expect(environment.AWS_ENDPOINT_URL_DYNAMODB).not.toContain('localhost');
}, 20_000);

// r2z review: on its own Docker network, a container must reach local databases, tunnels and other local workloads
// through host.docker.internal, also when it reads host and port separately. A URL the developer wrote, and the
// workload's own address, stay as they are: a browser or an OAuth provider uses them.
test('a container on its own network gets host.docker.internal only in the values Stacktape sets', async () => {
  deployedStackOverviewManager.injectLocalResourceInfo([
    {
      name: 'mydb',
      resourceType: 'postgres',
      referencableParams: {
        host: 'localhost',
        port: '5433',
        connectionString: 'postgresql://app:secret@localhost:5433/app'
      }
    }
  ]);
  const environment = await getWorkloadEnvironmentVars({
    workloadType: 'multi-container-workload',
    jobName: 'api',
    workloadName: 'api',
    jobEnvironment: [
      { name: 'DB_HOST', value: "$ResourceParam('mydb', 'host')" },
      { name: 'DB_PORT', value: "$ResourceParam('mydb', 'port')" },
      { name: 'DB_URL', value: "$ResourceParam('mydb', 'connectionString')" },
      { name: 'WORKER_URL', value: "$ResourceParam('worker', 'url')" },
      { name: 'SELF_URL', value: "$ResourceParam('api', 'url')" },
      { name: 'APP_URL', value: 'http://localhost:3000' },
      { name: 'NEXTAUTH_URL', value: 'http://127.0.0.1:3000/auth' }
    ],
    connectTo: [],
    skipAwsCredentials: true,
    port: 3000,
    dockerHost: 'host.docker.internal',
    localWorkloadAddresses: { worker: 'http://127.0.0.1:8082', api: 'http://127.0.0.1:3000' },
    localResourceEnvVars: {
      STP_MYDB_HOST: 'localhost',
      STP_MYDB_PORT: '5433',
      STP_MYDB_CONNECTION_STRING: 'postgresql://app:secret@localhost:5433/app',
      STP_WORKER_URL: 'http://127.0.0.1:8082',
      STP_API_URL: 'http://127.0.0.1:3000',
      AWS_ENDPOINT_URL_DYNAMODB: 'http://127.0.0.1:12200'
    }
  });
  expect(environment).toMatchObject({
    DB_HOST: 'host.docker.internal',
    DB_PORT: '5433',
    DB_URL: 'postgresql://app:secret@host.docker.internal:5433/app',
    WORKER_URL: 'http://host.docker.internal:8082',
    SELF_URL: 'http://127.0.0.1:3000',
    APP_URL: 'http://localhost:3000',
    NEXTAUTH_URL: 'http://127.0.0.1:3000/auth',
    STP_MYDB_HOST: 'host.docker.internal',
    STP_MYDB_PORT: '5433',
    STP_MYDB_CONNECTION_STRING: 'postgresql://app:secret@host.docker.internal:5433/app',
    STP_WORKER_URL: 'http://host.docker.internal:8082',
    STP_API_URL: 'http://127.0.0.1:3000',
    AWS_ENDPOINT_URL_DYNAMODB: 'http://host.docker.internal:12200',
    PORT: '3000'
  });
}, 20_000);

// r2cc finding 1: every boto3 client in a local Python container failed with NoRegionError. ECS sets both variables
// for a deployed container; botocore and the AWS CLI v1 read only AWS_DEFAULT_REGION.
test('a local container gets the region in AWS_REGION and AWS_DEFAULT_REGION', async () => {
  const originalArgs = globalStateManager.rawArgs;
  globalStateManager.rawArgs = { ...originalArgs, region: 'ap-southeast-2' };
  try {
    const environment = await getWorkloadEnvironmentVars({
      workloadType: 'multi-container-workload',
      jobName: 'api',
      workloadName: 'api',
      jobEnvironment: [],
      connectTo: [],
      skipAwsCredentials: true
    });
    expect(environment).toMatchObject({ AWS_REGION: 'ap-southeast-2', AWS_DEFAULT_REGION: 'ap-southeast-2' });
  } finally {
    globalStateManager.rawArgs = originalArgs;
  }
}, 20_000);

test('only a loopback host is replaced, not a name that contains one', () => {
  const at = (value: string) => pointLoopbackAtHost(value, 'host.docker.internal');
  expect(at('localhost')).toBe('host.docker.internal');
  expect(at('127.0.0.1')).toBe('host.docker.internal');
  expect(at('redis://:pw@localhost:6380/0')).toBe('redis://:pw@host.docker.internal:6380/0');
  expect(at('127.0.0.10')).toBe('127.0.0.10');
  expect(at('my-localhost:1')).toBe('my-localhost:1');
  expect(at('localhost.example.com')).toBe('localhost.example.com');
});

// r2bd: on Docker Desktop for Windows, the native Next.js server got API_URL=http://host.docker.internal:3000 and failed
// with `getaddrinfo ENOTFOUND`: that name resolves only inside Docker Desktop's containers, on macOS too. Linux passed
// because native Docker Engine made the shared address 127.0.0.1. Each consumer now gets the address it can reach from
// where it runs: processes on this machine get loopback and the stable host port, containers the Docker host alias.
const platforms: { docker: string; containerDockerHost: string | undefined; containerHost: string }[] = [
  // Docker Desktop: Windows, macOS, and WSL using Docker Desktop. The container is on its own network.
  { docker: 'Docker Desktop', containerDockerHost: DOCKER_HOST_NAME, containerHost: DOCKER_HOST_NAME },
  // Native Linux Docker Engine: own network too, with `--add-host` and loopback relays for the alias.
  { docker: 'Linux Docker Engine', containerDockerHost: DOCKER_HOST_NAME, containerHost: DOCKER_HOST_NAME },
  // Rootless Docker: the container shares this machine's network.
  { docker: 'rootless Docker', containerDockerHost: undefined, containerHost: '127.0.0.1' }
];

test.each(platforms)(
  'with $docker, a native frontend reaches a local workload at loopback and a container at $containerHost',
  async ({ containerDockerHost, containerHost }) => {
    // A local workload's stable host port, as the port switch serves it on this machine's loopback.
    const workload = createServer((socket) => socket.end('ok'));
    await new Promise<void>((resolve) => workload.listen(0, '127.0.0.1', resolve));
    const hostPort = (workload.address() as AddressInfo).port;
    try {
      const api = getLocalWorkloadEndpoint({ resourceType: 'web-service', hostPort });
      const queue = getLocalWorkloadEndpoint({ resourceType: 'private-service', hostPort });
      expect(api).toEqual({ param: 'url', value: `http://127.0.0.1:${hostPort}` });
      expect(queue).toEqual({ param: 'address', value: `127.0.0.1:${hostPort}` });

      // A native process (the Next.js dev server, a hook, a script) uses the address as it is, and it answers.
      const { hostname, port } = new URL(api.value);
      const reply = await new Promise<string>((resolve, reject) => {
        let data = '';
        connect({ host: hostname, port: Number(port) })
          .on('data', (chunk) => (data += chunk))
          .on('close', () => resolve(data))
          .on('error', reject);
      });
      expect(reply).toBe('ok');

      deployedStackOverviewManager.injectLocalWorkloadInfo(
        [
          { name: 'api', resourceType: 'web-service', url: api.value },
          { name: 'queue', resourceType: 'private-service', address: queue.value }
        ],
        { markAsLocallyInjected: false }
      );
      const environment = await getWorkloadEnvironmentVars({
        workloadType: 'multi-container-workload',
        jobName: 'worker',
        workloadName: 'worker',
        jobEnvironment: [
          { name: 'API_URL', value: "$ResourceParam('api', 'url')" },
          { name: 'QUEUE_ADDRESS', value: "$ResourceParam('queue', 'address')" }
        ],
        connectTo: [],
        skipAwsCredentials: true,
        dockerHost: containerDockerHost,
        localWorkloadAddresses: { api: api.value, queue: queue.value },
        localResourceEnvVars: { STP_API_URL: api.value, STP_QUEUE_ADDRESS: queue.value }
      });
      expect(environment).toMatchObject({
        API_URL: `http://${containerHost}:${hostPort}`,
        QUEUE_ADDRESS: `${containerHost}:${hostPort}`,
        STP_API_URL: `http://${containerHost}:${hostPort}`,
        STP_QUEUE_ADDRESS: `${containerHost}:${hostPort}`
      });
    } finally {
      await new Promise((resolve) => workload.close(resolve));
    }
  },
  20_000
);
