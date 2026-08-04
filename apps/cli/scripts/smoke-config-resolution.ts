import { strict as assert } from 'node:assert';
import { dirname, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import type { StacktapeConfig } from '@stacktape/config';
import type { GetConfigParams } from '@stacktape/config-authoring/tooling';

const smokeConfigPath = join(process.cwd(), '_test-stacks', 'config-loading-smoke', 'stacktape.ts');
const smokeAuthoringParams: GetConfigParams = {
  projectName: 'smoke',
  stage: 'tst',
  region: 'eu-west-1',
  command: 'synth',
  awsProfile: '',
  cliArgs: {},
  user: { id: 'smoke-user', name: 'Smoke User', email: 'smoke@example.com' }
};

const setSmokeState = () => {
  (globalStateManager as any).rawCommands = ['synth'];
  (globalStateManager as any).rawArgs = {
    projectName: 'smoke',
    stage: 'tst',
    region: 'eu-west-1',
    configPath: smokeConfigPath,
    currentWorkingDirectory: dirname(smokeConfigPath)
  } as any;
  (globalStateManager as any).configPath = smokeConfigPath;
  (globalStateManager as any).persistedState = {
    cliArgsDefaults: {},
    otherDefaults: {}
  };
  (globalStateManager as any).awsConfigFileContent = {};
  (globalStateManager as any).userData = {
    id: 'smoke-user',
    name: 'Smoke User',
    email: 'smoke@example.com'
  } as any;
  (globalStateManager as any).targetStack = {
    projectName: 'smoke',
    stage: 'tst'
  } as any;
};

const smokeTestTsConfigLoading = async () => {
  const configResolver = new ConfigResolver();
  const { config } = await configResolver.loadTypescriptConfig({
    filePath: smokeConfigPath,
    authoringParams: smokeAuthoringParams
  });

  assert.ok(config);
  assert.equal(config.resources.lambda.type, 'function');
  assert.deepEqual(config.resources.lambda.properties.connectTo, ['uploads']);
  const event = config.resources.lambda.properties.events[0];
  assert.equal(event.type, 'http-api-gateway');
  if (event.type !== 'http-api-gateway') {
    throw new Error('Expected the config-loading smoke event to be an HTTP API event.');
  }
  assert.equal(event.properties.httpApiGatewayName, 'api');
  assert.deepEqual(config.resources.lambda.properties.environment, [
    {
      name: 'CONFIG_LOADING_BUCKET',
      value: "$ResourceParam('uploads','name')"
    },
    {
      name: 'CONFIG_LOADING_SUFFIX',
      value: 'config-loading-from-pkg-b'
    },
    {
      name: 'CONFIG_LOADING_PROJECT',
      value: 'smoke'
    },
    {
      name: 'CONFIG_LOADING_REGION',
      value: 'eu-west-1'
    },
    {
      name: 'CONFIG_LOADING_STAGE',
      value: 'tst'
    }
  ]);
};

const smokeTestNestedDirectiveResolution = async () => {
  const configResolver = new ConfigResolver();
  configResolver.rawConfig = { resources: {} } as StacktapeConfig;
  configResolver.registerBuiltInDirectives();
  configResolver.registerDirective({
    name: 'First',
    isRuntime: false,
    requiredParams: {},
    resolveFunction: () => () => "$Format('{}-{}', 'prefix', $Stage())"
  });

  const resolved = await configResolver.resolveDirectives<{
    value: string;
  }>({
    itemToResolve: { value: '$First()' },
    resolveRuntime: true
  });

  assert.deepEqual(resolved, { value: 'prefix-tst' });
};

const main = async () => {
  setSmokeState();
  await smokeTestTsConfigLoading();
  await smokeTestNestedDirectiveResolution();
  console.info('Smoke config resolution passed.');
};

main();
