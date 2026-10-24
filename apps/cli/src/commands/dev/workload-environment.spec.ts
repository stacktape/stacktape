import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { templateManager } from '@domain-services/template-manager';
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { getWorkloadEnvironmentVars } from './utils';

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
