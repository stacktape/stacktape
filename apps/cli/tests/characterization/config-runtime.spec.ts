import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { eventManager } from '@application-services/event-manager';
import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import { ConfigManager, configManager } from '@domain-services/config-manager';
import { stacktapeConfigSchema, validateConfigWithZod } from '@domain-services/config-manager/utils/zod-validator';
import { resolveOpenSearchLoggingDefaults } from '@domain-services/calculated-stack-overview-manager/resource-resolvers/open-search';
import {
  getConfigManagerContext,
  getConfigResolverContext,
  getStackContext
} from '../../src/commands/_utils/initialization';

import type { StacktapeConfig } from '@stacktape/config';
import get from 'lodash/get';
import {
  $ResourceParam,
  $Stage,
  type CloudFormationTemplate,
  type GetConfigParams,
  defineConfig,
  DynamoDbTable,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from '@stacktape/config-authoring';
import { resolveNodeVersion } from '@stacktape/packaging/bundlers/node-version';
import { getTypescriptExport } from '@utils/file-loaders';

const fixturePath = join(process.cwd(), '_test-stacks', 'config-loading-smoke', 'stacktape.ts');
const executionFixturePath = join(import.meta.dir, 'fixtures', 'config-execution', 'stacktape.ts');
const executionErrorFixturePath = join(import.meta.dir, 'fixtures', 'config-execution-error', 'stacktape.ts');
const originalState: Record<string, unknown> = {};
const fixtureAuthoringParams: GetConfigParams = {
  projectName: 'explicit-authoring-context',
  stage: 'explicit-stage',
  region: 'us-west-2',
  cliArgs: {} as any,
  command: 'synth',
  awsProfile: '',
  user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
};
const fixtureResolverContext = {
  authoringParams: fixtureAuthoringParams,
  builtInDirectives: {
    accountId: '123456789999',
    additionalArgs: {},
    awsProfile: '',
    cliArgs: fixtureAuthoringParams.cliArgs,
    command: 'synth' as const,
    disableEmulation: false,
    region: 'us-west-2' as const,
    stage: 'explicit-directive-stage',
    workingDir: process.cwd()
  },
  workingDir: process.cwd()
};

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
  test('reuses one manager for two different configs without leaking config, directives, or stack identity', async () => {
    const manager = new ConfigManager();
    const workingDir = join(import.meta.dir, 'fixtures', 'dense-application');
    const helperLambda = {
      digest: 'config-isolation',
      artifactPath: 'config-isolation.zip',
      handler: 'index.default',
      size: 1
    };

    const initialize = async ({
      accountId,
      config,
      resourceName,
      stage,
      stackName,
      targetManager = manager
    }: {
      accountId: string;
      config?: StacktapeConfig;
      resourceName: string;
      stage: string;
      stackName: string;
      targetManager?: ConfigManager;
    }) => {
      const stackContext = {
        accountId,
        command: 'synth' as const,
        globallyUniqueStackHash: `${stage}-hash`,
        invocationId: `${stage}-invocation`,
        projectName: `${stage}-project`,
        region: 'eu-west-1' as const,
        stackName,
        stage,
        workingDir
      };
      const authoringParams: GetConfigParams = {
        projectName: stackContext.projectName,
        stage,
        region: stackContext.region,
        cliArgs: {} as any,
        command: stackContext.command,
        awsProfile: '',
        user: undefined
      };

      await targetManager.init({
        configRequired: true,
        context: {
          helperLambdaDetails: {
            batchJobTriggerLambda: helperLambda,
            stacktapeServiceLambda: helperLambda,
            cdnOriginRequestLambda: helperLambda,
            cdnOriginResponseLambda: helperLambda
          },
          issueDetection: {},
          resolver: {
            authoringParams,
            builtInDirectives: {
              accountId,
              additionalArgs: {},
              awsProfile: '',
              cliArgs: authoringParams.cliArgs,
              command: stackContext.command,
              disableEmulation: false,
              region: stackContext.region,
              stage,
              workingDir
            },
            presetConfig:
              config ??
              ({
                projectName: stackContext.projectName,
                resources: {
                  [resourceName]: {
                    type: 'function',
                    properties: {
                      packaging: {
                        type: 'stacktape-lambda-buildpack',
                        properties: { entryfilePath: './src/api.ts' }
                      },
                      environment: [{ name: 'INVOCATION_STAGE', value: '$Stage()' }]
                    }
                  }
                }
              } as StacktapeConfig),
            workingDir
          },
          stack: stackContext
        }
      });
    };

    await initialize({
      accountId: '111111111111',
      resourceName: 'firstFunction',
      stage: 'first',
      stackName: 'first-project-first'
    });
    expect(manager.functions).toHaveLength(1);
    expect(manager.functions[0]).toMatchObject({
      name: 'firstFunction',
      resourceName: 'first-project-first-firstFunction',
      environment: [{ name: 'INVOCATION_STAGE', value: 'first' }]
    });

    manager.transforms.FirstFunction = (properties) => properties;
    manager.finalTransform = (template) => template;
    manager.reset();

    await initialize({
      accountId: '222222222222',
      resourceName: 'secondFunction',
      stage: 'second',
      stackName: 'second-project-second'
    });
    expect(manager.functions).toHaveLength(1);
    expect(manager.functions[0]).toMatchObject({
      name: 'secondFunction',
      resourceName: 'second-project-second-secondFunction',
      environment: [{ name: 'INVOCATION_STAGE', value: 'second' }]
    });
    expect(manager.config.resources).not.toHaveProperty('firstFunction');
    expect(manager.transforms).toEqual({});
    expect(manager.finalTransform).toBeNull();

    const conflictManager = new ConfigManager();
    await expect(
      initialize({
        accountId: '333333333333',
        resourceName: 'unused',
        stage: 'conflict',
        stackName: 'conflict-project-conflict',
        targetManager: conflictManager,
        config: {
          projectName: 'conflict-project',
          resources: {
            api: { type: 'http-api-gateway' },
            firstFunction: {
              type: 'function',
              properties: {
                packaging: {
                  type: 'stacktape-lambda-buildpack',
                  properties: { entryfilePath: './src/api.ts' }
                },
                events: [
                  {
                    type: 'http-api-gateway',
                    properties: { httpApiGatewayName: 'api', method: 'GET', path: '/duplicate' }
                  }
                ]
              }
            },
            secondFunction: {
              type: 'function',
              properties: {
                packaging: {
                  type: 'stacktape-lambda-buildpack',
                  properties: { entryfilePath: './src/worker.ts' }
                },
                events: [
                  {
                    type: 'http-api-gateway',
                    properties: { httpApiGatewayName: 'api', method: 'GET', path: '/duplicate' }
                  }
                ]
              }
            }
          }
        }
      })
    ).rejects.toMatchObject({ code: 'CONFIG_HTTP_API_ROUTE_CONFLICT' });

    expect(manager.functions.map(({ name }) => name)).toEqual(['secondFunction']);
  });

  test('loads TypeScript config through tsconfig paths and transitive node_modules', async () => {
    const { config } = await new ConfigResolver().loadTypescriptConfig({
      filePath: fixturePath,
      authoringParams: fixtureAuthoringParams
    });

    expect(config.resources.lambda.type).toBe('function');
    expect((config.resources.lambda as { properties: { environment: unknown } }).properties.environment).toEqual([
      {
        name: 'CONFIG_LOADING_SUFFIX',
        value: 'config-loading-from-pkg-b'
      },
      {
        name: 'CONFIG_LOADING_PROJECT',
        value: 'explicit-authoring-context'
      },
      {
        name: 'CONFIG_LOADING_REGION',
        value: 'us-west-2'
      },
      {
        name: 'CONFIG_LOADING_STAGE',
        value: 'explicit-stage'
      }
    ]);
  });

  test('transforms class-based config to a plain, valid Stacktape configuration', () => {
    const definedConfig = defineConfig(({ stage }) => {
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

    const { config } = definedConfig({
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

  test('executes the production config-loading sequence once while retaining executable transforms', async () => {
    const previousPresetConfig = globalStateManager.presetConfig;
    const previousInitializedDomainServices = globalStateManager.initializedDomainServices;
    const previousLocalTargetAwsAccount = globalStateManager.localTargetAwsAccount;
    const previousTargetStack = globalStateManager.targetStack;
    try {
      configManager.reset();
      eventManager.reset();
      eventManager.setSilentMode(true);
      (globalStateManager as any).rawArgs = {
        stage: 'test',
        region: 'eu-west-1',
        configPath: executionFixturePath,
        currentWorkingDirectory: dirname(executionFixturePath)
      };
      (globalStateManager as any).configPath = executionFixturePath;
      (globalStateManager as any).targetStack = undefined;
      globalStateManager.localTargetAwsAccount = {
        id: 'execution-account',
        organizationId: 'execution-organization',
        awsAccountId: '123456789999',
        connectionMode: 'BASIC',
        name: 'execution',
        state: 'ACTIVE',
        primaryRegions: ['eu-west-1'],
        defaultRegion: 'eu-west-1'
      };
      globalStateManager.presetConfig = null;
      globalStateManager.initializedDomainServices = [];

      await configManager.loadRawConfigOnly({ context: getConfigResolverContext() });
      expect(configManager.configResolver.rawConfig.projectName).toBe('execution-config-project');
      await globalStateManager.loadLocalTargetStackInfo({
        configProjectName: configManager.configResolver.rawConfig.projectName
      });
      const stackContext = getStackContext();
      await configManager.init({ configRequired: true, context: getConfigManagerContext(stackContext) });

      const getExecutionCounts = getTypescriptExport({
        filePath: executionFixturePath,
        cache: true,
        exportName: 'getExecutionCounts'
      }) as () => { module: number; factory: number };

      expect(getExecutionCounts()).toEqual({ module: 1, factory: 1 });
      expect(globalStateManager.targetStack.projectName).toBe('execution-config-project');
      expect(Object.keys(configManager.transforms)).toHaveLength(1);
      expect(configManager.finalTransform).toBeFunction();
      expect(configManager.rawConfig.resources.uploads).not.toHaveProperty('transforms');
      expect(configManager.transforms.UploadsBucket({})).toEqual({
        VersioningConfiguration: { Status: 'Enabled' }
      });
      const template: CloudFormationTemplate = { Resources: {} };
      expect(configManager.finalTransform?.(template).Metadata).toEqual({ ConfigExecutionFixture: true });
    } finally {
      configManager.reset();
      globalStateManager.presetConfig = previousPresetConfig;
      globalStateManager.initializedDomainServices = previousInitializedDomainServices;
      globalStateManager.localTargetAwsAccount = previousLocalTargetAwsAccount;
      globalStateManager.targetStack = previousTargetStack;
    }
  });

  test('does not execute a failing TypeScript config again to improve its error trace', async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), 'stacktape-config-execution-'));
    const markerPath = join(tempDirectory, 'executions.txt');
    const previousMarkerPath = process.env.STACKTAPE_CONFIG_EXECUTION_MARKER;
    process.env.STACKTAPE_CONFIG_EXECUTION_MARKER = markerPath;

    try {
      await expect(
        new ConfigResolver().loadTypescriptConfig({
          filePath: executionErrorFixturePath,
          authoringParams: fixtureAuthoringParams
        })
      ).rejects.toMatchObject({ code: 'CONFIG_TYPESCRIPT_EXECUTION_FAILED' });
      expect(await readFile(markerPath, 'utf8')).toBe('executed\n');
    } finally {
      if (previousMarkerPath === undefined) {
        delete process.env.STACKTAPE_CONFIG_EXECUTION_MARKER;
      } else {
        process.env.STACKTAPE_CONFIG_EXECUTION_MARKER = previousMarkerPath;
      }
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  test('resolves directives returned by other directives to a fixed point', async () => {
    const resolver = new ConfigResolver();
    resolver.rawConfig = { resources: {} } as StacktapeConfig;
    resolver.setContext(fixtureResolverContext);
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
    ).resolves.toEqual({ value: 'prefix-explicit-directive-stage' });
  });

  test('reports unknown directives with a stable semantic error code', () => {
    const resolver = new ConfigResolver();
    resolver.setContext(fixtureResolverContext);
    resolver.registerBuiltInDirectives();

    expect(() => resolver.getDirectiveInfo('$DoesNotExist()')).toThrow(
      expect.objectContaining({
        category: 'DIRECTIVE',
        code: 'DIRECTIVE_UNKNOWN',
        hints: ['If this is a custom directive, register it in your Stacktape config.']
      })
    );
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

  test('the generated validator applies current buildpack and logging defaults', () => {
    const parsed = stacktapeConfigSchema.parse({
      resources: {
        nodeFunction: {
          type: 'function',
          properties: {
            packaging: {
              type: 'stacktape-lambda-buildpack',
              properties: { entryfilePath: 'src/index.ts', languageSpecificConfig: {} }
            },
            runtime: 'nodejs22.x',
            logging: {}
          }
        },
        pythonFunction: {
          type: 'function',
          properties: {
            packaging: {
              type: 'stacktape-lambda-buildpack',
              properties: {
                entryfilePath: 'src/index.py',
                languageSpecificConfig: { packageManager: 'uv' }
              }
            }
          }
        },
        cache: {
          type: 'redis-cluster',
          properties: {
            defaultUserPassword: "$Secret('redis.password')",
            instanceSize: 'cache.t4g.micro',
            logging: {}
          }
        }
      }
    });

    expect(
      get(parsed, 'resources.nodeFunction.properties.packaging.properties.languageSpecificConfig.nodeVersion')
    ).toBeUndefined();
    expect(get(parsed, 'resources.nodeFunction.properties.runtime')).toBe('nodejs22.x');
    expect(
      get(parsed, 'resources.nodeFunction.properties.packaging.properties.languageSpecificConfig.outputModuleFormat')
    ).toBeUndefined();
    expect(
      get(parsed, 'resources.pythonFunction.properties.packaging.properties.languageSpecificConfig.pythonVersion')
    ).toBe(3.12);
    expect(get(parsed, 'resources.nodeFunction.properties.logging.retentionDays')).toBe(90);
    expect(get(parsed, 'resources.cache.properties.logging.retentionDays')).toBe(30);
    expect(resolveNodeVersion({ runtime: 'nodejs22.x', target: 'lambda' })).toBe(22);
    expect(resolveNodeVersion({ target: 'lambda' })).toBe(24);
    expect(resolveNodeVersion({ nodeVersion: 20, runtime: 'nodejs22.x', target: 'lambda' })).toBe(20);
    expect(resolveNodeVersion({ runtime: 'nodejs22.x', target: 'container' })).toBe(24);
  });

  test('the generated validator leaves context-dependent OpenSearch retention defaults to synthesis', () => {
    const parsed = stacktapeConfigSchema.parse({
      resources: {
        search: {
          type: 'open-search-domain',
          properties: {
            logging: {
              errorLogs: {},
              searchSlowLogs: {},
              indexSlowLogs: {}
            }
          }
        }
      }
    });

    expect(get(parsed, 'resources.search.properties.logging.errorLogs.retentionDays')).toBeUndefined();
    expect(get(parsed, 'resources.search.properties.logging.searchSlowLogs.retentionDays')).toBeUndefined();
    expect(get(parsed, 'resources.search.properties.logging.indexSlowLogs.retentionDays')).toBeUndefined();
    expect(resolveOpenSearchLoggingDefaults()).toEqual({
      errorLogs: { disabled: false, retentionDays: 30 },
      searchSlowLogs: { disabled: false, retentionDays: 5 },
      indexSlowLogs: { disabled: false, retentionDays: 5 }
    });
  });
});
