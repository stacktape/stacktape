import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { cp, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import { cleanConfigForMinimalTemplateCompilerMode } from '@domain-services/config-manager/utils/misc';
import { validateConfigWithZod } from '@domain-services/config-manager/utils/zod-validator';
import type { StacktapeConfig } from '@stacktape/config';
import {
  $ResourceParam,
  $Stage,
  defineConfig,
  DynamoDbTable,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from '../../src/api/npm/ts';

const fixturePath = join(process.cwd(), '_test-stacks', 'config-loading-smoke', 'stacktape.ts');
const originalState: Record<string, unknown> = {};

// The fixture config imports `pkg-a`, which re-exports a value from `pkg-b`, so that config loading is exercised
// against real installed packages. The two packages are tracked next to this spec and staged into the fixture's
// node_modules for the run instead of being committed under a `node_modules` directory.
const fixtureNodeModules = join(dirname(fixturePath), 'node_modules');
const fixturePackages = join(import.meta.dir, 'fixtures', 'config-loading-packages');

const stateKeys = [
  'rawCommands',
  'rawArgs',
  'configPath',
  'persistedState',
  'awsConfigFileContent',
  'userData',
  'targetStack'
] as const;

beforeAll(async () => {
  await rm(fixtureNodeModules, { force: true, recursive: true });
  await cp(fixturePackages, fixtureNodeModules, { recursive: true });

  for (const key of stateKeys) {
    originalState[key] = (globalStateManager as any)[key];
  }

  (globalStateManager as any).rawCommands = ['synth'];
  (globalStateManager as any).rawArgs = {
    projectName: 'characterization',
    stage: 'test',
    region: 'eu-west-1',
    configPath: fixturePath,
    currentWorkingDirectory: dirname(fixturePath)
  };
  (globalStateManager as any).configPath = fixturePath;
  (globalStateManager as any).persistedState = { cliArgsDefaults: {}, otherDefaults: {} };
  (globalStateManager as any).awsConfigFileContent = {};
  (globalStateManager as any).userData = {
    id: 'test-user',
    name: 'Test User',
    email: 'test@example.com'
  };
  (globalStateManager as any).targetStack = {
    projectName: 'characterization',
    stage: 'test'
  };
});

afterAll(async () => {
  for (const key of stateKeys) {
    (globalStateManager as any)[key] = originalState[key];
  }

  await rm(fixtureNodeModules, { force: true, recursive: true });
});

describe('configuration runtime contract', () => {
  test('loads TypeScript config through tsconfig paths and transitive node_modules', async () => {
    const config = await new ConfigResolver().loadTypescriptConfig({ filePath: fixturePath });

    expect(config.resources.lambda.type).toBe('function');
    expect(config.resources.lambda.properties.environment).toEqual([
      {
        name: 'CONFIG_LOADING_SUFFIX',
        value: 'config-loading-from-pkg-b'
      }
    ]);
  });

  test('transforms class-based config to a plain, valid Stacktape configuration', () => {
    const getConfig = defineConfig(({ stage }) => {
      const records = new DynamoDbTable({
        primaryKey: {
          partitionKey: { name: 'id', type: 'string' }
        }
      });
      const worker = new LambdaFunction({
        packaging: new StacktapeLambdaBuildpackPackaging({
          entryfilePath: './src/handler.ts'
        }),
        connectTo: [records],
        environment: {
          STAGE: $Stage(),
          TABLE_NAME: $ResourceParam('records', 'name')
        }
      });

      return {
        resources: { records, worker },
        stackConfig: {
          outputs: [{ name: 'deployedStage', value: stage }]
        }
      };
    });

    const config = getConfig({
      projectName: 'characterization',
      stage: 'test',
      region: 'eu-west-1',
      cliArgs: {} as any,
      command: 'synth',
      awsProfile: '',
      user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
    });

    expect(config).toEqual(
      expect.objectContaining({
        resources: expect.objectContaining({
          records: expect.objectContaining({ type: 'dynamo-db-table' }),
          worker: expect.objectContaining({
            type: 'function',
            properties: expect.objectContaining({
              connectTo: ['records'],
              environment: [
                { name: 'STAGE', value: '$Stage()' },
                { name: 'TABLE_NAME', value: "$ResourceParam('records','name')" }
              ]
            })
          })
        }),
        stackConfig: {
          outputs: [{ name: 'deployedStage', value: 'test' }]
        }
      })
    );
    expect(validateConfigWithZod({ config, configPath: 'stacktape.ts' })).toEqual({ valid: true });
  });

  test('removes CDK constructs only from resources for server template compilation', () => {
    const config: StacktapeConfig = {
      stackConfig: {},
      resources: {
        stackConfig: {
          type: 'aws-cdk-construct',
          properties: { entryfilePath: './src/construct.ts' }
        },
        ordinaryBucket: { type: 'bucket' }
      }
    };

    const cleanedConfig = cleanConfigForMinimalTemplateCompilerMode(config);

    expect(cleanedConfig.stackConfig).toEqual({});
    expect(cleanedConfig.resources).toEqual({ ordinaryBucket: { type: 'bucket' } });
    expect(config.resources.stackConfig).toEqual({
      type: 'aws-cdk-construct',
      properties: { entryfilePath: './src/construct.ts' }
    });
  });

  test('resolves directives returned by other directives to a fixed point', async () => {
    const resolver = new ConfigResolver();
    resolver.rawConfig = { resources: {} } as StacktapeConfig;
    resolver.registerBuiltInDirectives();
    resolver.registerDirective({
      name: 'Characterization',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: () => () => "$Format('{}-{}', 'prefix', $Stage())"
    });

    await expect(
      resolver.resolveDirectives({
        itemToResolve: { value: '$Characterization()' },
        resolveRuntime: true
      })
    ).resolves.toEqual({ value: 'prefix-test' });
  });

  test('rejects misspelled resource types at the schema boundary', () => {
    const result = validateConfigWithZod({
      config: {
        resources: {
          worker: {
            type: 'functon',
            properties: {}
          }
        }
      },
      configPath: 'stacktape.yml'
    });

    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.errorMessage).toContain('Invalid resource type');
      expect(result.errorMessage).toContain('function');
    }
  });
});
