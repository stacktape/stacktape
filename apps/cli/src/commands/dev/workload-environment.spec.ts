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
      runtime: { calculatedStackOverviewManager, deployedStackOverviewManager, stackManager, templateManager },
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
