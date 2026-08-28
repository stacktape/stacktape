import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { operationReporter, operationSession } from '@application-services/operation-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { ConfigResolver } from '@domain-services/config-manager/config-resolver';
import { ConfigManager, configManager } from '@domain-services/config-manager';
import type { ConfigManagerInitContext } from '@domain-services/config-manager/context';
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

const downloadedTypescriptTemplate = (projectName: string) => `
import { defineConfig } from '@stacktape/config-authoring';

export default defineConfig(() => ({
  projectName: ${JSON.stringify(projectName)},
  resources: {}
}));
`;

const downloadedTemplateResponse = (templateId: string) => ({
  id: templateId,
  name: templateId,
  organizationId: null,
  content: downloadedTypescriptTemplate(templateId)
});

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

/** A resolver with the built-in directives available, ready for tests that register their own directives on top. */
const newResolver = () => {
  const resolver = new ConfigResolver();
  resolver.rawConfig = { resources: {} } as StacktapeConfig;
  resolver.setContext(fixtureResolverContext);
  resolver.registerBuiltInDirectives();
  return resolver;
};

const denseApplicationDir = join(import.meta.dir, 'fixtures', 'dense-application');
const helperLambda = {
  digest: 'config-isolation',
  artifactPath: 'config-isolation.zip',
  handler: 'index.default',
  size: 1
};

/** The inputs the command composition layer hands to a full initialization, for one stack identity. */
const getInitContext = ({
  accountId,
  stage,
  stackName,
  workingDir = denseApplicationDir,
  ...resolverInputs
}: {
  accountId: string;
  configPath?: string;
  presetConfig?: StacktapeConfig;
  stage: string;
  stackName: string;
  templateId?: string;
  workingDir?: string;
}): ConfigManagerInitContext => {
  const stack = {
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
    projectName: stack.projectName,
    stage,
    region: stack.region,
    cliArgs: {} as any,
    command: stack.command,
    awsProfile: '',
    user: undefined
  };

  return {
    helperLambdaDetails: {
      batchJobTriggerLambda: helperLambda,
      stacktapeServiceLambda: helperLambda,
      cdnOriginRequestLambda: helperLambda,
      cdnOriginResponseLambda: helperLambda,
      uptimeProber: helperLambda
    },
    issueDetection: {},
    resolver: {
      authoringParams,
      builtInDirectives: {
        accountId,
        additionalArgs: {},
        awsProfile: '',
        cliArgs: authoringParams.cliArgs,
        command: stack.command,
        disableEmulation: false,
        region: stack.region,
        stage,
        workingDir
      },
      workingDir,
      ...resolverInputs
    },
    stack
  };
};

const singleFunctionConfig = ({ projectName, resourceName }: { projectName: string; resourceName: string }) =>
  ({
    projectName,
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
  }) as StacktapeConfig;

/** Two functions claiming one HTTP route: rejected by the static validations that run after directive resolution. */
const duplicateHttpRouteConfig: StacktapeConfig = {
  projectName: 'conflict-project',
  stackConfig: { tags: [{ name: 'candidate-stage', value: '$Stage()' }] },
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
};

describe('configuration runtime contract', () => {
  test('reuses one manager for two different configs without leaking config, directives, or stack identity', async () => {
    const manager = new ConfigManager();

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
      await targetManager.init({
        configRequired: true,
        context: getInitContext({
          accountId,
          stage,
          stackName,
          presetConfig: config ?? singleFunctionConfig({ projectName: `${stage}-project`, resourceName })
        })
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
        config: duplicateHttpRouteConfig
      })
    ).rejects.toMatchObject({ code: 'CONFIG_HTTP_API_ROUTE_CONFLICT' });

    expect(manager.functions.map(({ name }) => name)).toEqual(['secondFunction']);
  });

  test('publishes nothing when initialization fails and initializes normally on a retry', async () => {
    const manager = new ConfigManager();

    await expect(
      manager.init({
        configRequired: true,
        context: getInitContext({
          accountId: '444444444444',
          stage: 'conflict',
          stackName: 'conflict-project-conflict',
          presetConfig: duplicateHttpRouteConfig
        })
      })
    ).rejects.toMatchObject({ code: 'CONFIG_HTTP_API_ROUTE_CONFLICT' });

    // The attempt resolved directives and registered every built-in before failing, yet none of that reached the
    // manager: no configuration, transforms, stack context, directive registrations or cached directive results.
    expect(manager.config).toBeUndefined();
    expect(manager.rawConfig).toBeUndefined();
    expect(manager.transforms).toEqual({});
    expect(manager.finalTransform).toBeNull();
    expect(manager.configResolver.rawConfig).toBeNull();
    expect(Object.keys(manager.configResolver.registeredDirectives)).toEqual([]);
    expect(manager.configResolver.resolvedDirectiveDefinitions).toEqual([]);
    expect(() => manager.validateGuardrails({ hasConfig: false })).toThrow('stack context');

    await manager.init({
      configRequired: true,
      context: getInitContext({
        accountId: '444444444444',
        stage: 'retry',
        stackName: 'retry-project-retry',
        presetConfig: singleFunctionConfig({ projectName: 'retry-project', resourceName: 'retryFunction' })
      })
    });

    expect(manager.functions[0]).toMatchObject({
      name: 'retryFunction',
      resourceName: 'retry-project-retry-retryFunction',
      environment: [{ name: 'INVOCATION_STAGE', value: 'retry' }]
    });
  });

  test('keeps the working configuration when a later initialization fails, and keeps resolving runtime directives', async () => {
    const manager = new ConfigManager();
    await manager.init({
      configRequired: true,
      context: getInitContext({
        accountId: '555555555555',
        stage: 'stable',
        stackName: 'stable-project-stable',
        presetConfig: singleFunctionConfig({ projectName: 'stable-project', resourceName: 'stableFunction' })
      })
    });

    await expect(
      manager.init({
        configRequired: true,
        context: getInitContext({
          accountId: '666666666666',
          stage: 'conflict',
          stackName: 'conflict-project-conflict',
          presetConfig: duplicateHttpRouteConfig
        })
      })
    ).rejects.toMatchObject({ code: 'CONFIG_HTTP_API_ROUTE_CONFLICT' });

    // Resource names carry the stack identity, so this also proves the failed attempt's stack context was not published.
    expect(manager.functions.map(({ name, resourceName }) => ({ name, resourceName }))).toEqual([
      { name: 'stableFunction', resourceName: 'stable-project-stable-stableFunction' }
    ]);
    expect(manager.rawConfig.resources).not.toHaveProperty('firstFunction');

    // The committed resolver still owns the built-in directives, including the runtime ones resolved during synthesis.
    const runtimeResolved = await manager.resolveDirectives<{ value: Record<string, unknown> }>({
      itemToResolve: { value: "$CfFormat('stack-{}', 'value')" },
      resolveRuntime: true
    });
    expect(Object.keys(runtimeResolved.value)).toEqual(['Fn::Sub']);
  });

  test('publishes a configuration only for the optional-command inputs that own one', async () => {
    // Inside the workspace so a downloaded TypeScript template resolves `@stacktape/config-authoring` as a user
    // project would.
    const workingDir = await mkdtemp(join(process.cwd(), '.stacktape-optional-config-'));
    const configPath = join(workingDir, 'stacktape.yml');
    const presetConfig = { projectName: 'preset-config-project', resources: {} } as StacktapeConfig;
    const apiClient = stacktapeTrpcApiManager.apiClient;
    const originalTemplate = apiClient.template;

    const initOptional = async (resolverInputs: {
      configPath?: string;
      presetConfig?: StacktapeConfig;
      templateId?: string;
    }) => {
      const manager = new ConfigManager();
      await manager.init({
        configRequired: false,
        context: getInitContext({
          accountId: '777777777777',
          stage: 'optional',
          stackName: 'optional-project-optional',
          workingDir,
          ...resolverInputs
        })
      });
      return manager;
    };

    try {
      await writeFile(configPath, 'projectName: local-config-project\nresources: {}\n');
      apiClient.template = async ({ templateId }) => downloadedTemplateResponse(templateId);

      expect((await initOptional({ configPath })).config.projectName).toBe('local-config-project');
      expect((await initOptional({ templateId: 'downloaded-template' })).config.projectName).toBe(
        'downloaded-template'
      );
      // A preset suppresses local-path discovery for optional commands, and wins over a template when one is loaded.
      expect((await initOptional({ presetConfig })).config).toBeUndefined();
      expect((await initOptional({ presetConfig, configPath })).config).toBeUndefined();
      expect((await initOptional({ presetConfig, templateId: 'downloaded-template' })).config.projectName).toBe(
        'preset-config-project'
      );

      // Without any configuration input there is nothing to publish, but the resolver is still usable.
      const withoutInputs = await initOptional({});
      expect(withoutInputs.config).toBeUndefined();
      await expect(withoutInputs.resolveDirectives({ itemToResolve: '$Stage()', resolveRuntime: false })).resolves.toBe(
        'optional'
      );
    } finally {
      apiClient.template = originalTemplate;
      await rm(workingDir, { recursive: true, force: true });
    }
  });

  test('does not reuse project discovery for an initialization with different configuration inputs', async () => {
    const workingDir = await mkdtemp(join(process.cwd(), '.stacktape-discovery-source-'));
    const configPath = join(workingDir, 'stacktape.yml');
    const manager = new ConfigManager();
    const discoveredContext = getInitContext({
      accountId: '888888888888',
      configPath,
      stage: 'discovery',
      stackName: 'discovered-project-discovery',
      workingDir
    });

    try {
      await writeFile(configPath, 'projectName: discovered-project\nresources: {}\n');
      await manager.loadRawConfigOnly({ context: discoveredContext.resolver });
      expect(manager.configResolver.rawConfig.projectName).toBe('discovered-project');

      await manager.init({
        configRequired: true,
        context: getInitContext({
          accountId: '888888888888',
          presetConfig: { projectName: 'preset-project', resources: {} },
          stage: 'preset',
          stackName: 'preset-project-preset',
          workingDir
        })
      });

      expect(manager.config.projectName).toBe('preset-project');
      expect(manager.functions).toEqual([]);
    } finally {
      await rm(workingDir, { recursive: true, force: true });
    }
  });

  test('loads TypeScript config through tsconfig paths and transitive node_modules', async () => {
    const { config } = await new ConfigResolver().loadTypescriptConfig({
      filePath: fixturePath,
      authoringParams: fixtureAuthoringParams
    });

    expect(config.resources.lambda.type).toBe('function');
    const lambdaProperties = config.resources.lambda.properties as {
      connectTo: string[];
      environment: unknown;
      events: Array<{ properties: { httpApiGatewayName: string } }>;
    };
    expect(lambdaProperties.connectTo).toEqual(['uploads']);
    expect(lambdaProperties.events[0]?.properties.httpApiGatewayName).toBe('api');
    expect(lambdaProperties.environment).toEqual([
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

  test('loads a downloaded TypeScript config without touching a user file and removes its temporary workspace', async () => {
    const workingDir = await mkdtemp(join(process.cwd(), '.stacktape-downloaded-config-test-'));
    const localHelperPath = join(workingDir, 'local-helper.ts');
    const legacyTempPath = join(process.cwd(), '__temp-config.stp.ts');
    const apiClient = stacktapeTrpcApiManager.apiClient;
    const originalTemplate = apiClient.template;
    let originalLegacyContent: string | undefined;

    try {
      originalLegacyContent = await readFile(legacyTempPath, 'utf8').catch(() => undefined);
      const sentinel = originalLegacyContent ?? 'user-owned sentinel';
      if (originalLegacyContent === undefined) {
        await writeFile(legacyTempPath, sentinel);
      }
      await writeFile(localHelperPath, `export const projectName = 'downloaded-template';`);
      apiClient.template = async ({ templateId }) => ({
        ...downloadedTemplateResponse(templateId),
        content: `
import { defineConfig } from '@stacktape/config-authoring';
import { projectName } from './local-helper';

export default defineConfig(() => ({ projectName, resources: {} }));
`
      });

      const resolver = new ConfigResolver();
      resolver.setContext({ ...fixtureResolverContext, templateId: 'downloaded-template', workingDir });

      expect((await resolver.getRawConfig()).projectName).toBe('downloaded-template');
      expect(await readFile(legacyTempPath, 'utf8')).toBe(sentinel);
      expect(await readdir(workingDir)).toEqual(['local-helper.ts']);
    } finally {
      apiClient.template = originalTemplate;
      if (originalLegacyContent === undefined) {
        await rm(legacyTempPath, { force: true });
      } else {
        await writeFile(legacyTempPath, originalLegacyContent);
      }
      await rm(workingDir, { recursive: true, force: true });
    }
  });

  test('loads downloaded TypeScript configs concurrently without sharing their source file', async () => {
    const workingDir = await mkdtemp(join(process.cwd(), '.stacktape-downloaded-config-concurrent-'));
    const apiClient = stacktapeTrpcApiManager.apiClient;
    const originalTemplate = apiClient.template;
    const legacyTempPath = join(process.cwd(), '__temp-config.stp.ts');
    const originalLegacyContent = await readFile(legacyTempPath, 'utf8').catch(() => undefined);

    let releaseBothLoads: () => void;
    const bothLoadsReady = new Promise<void>((resolve) => {
      releaseBothLoads = resolve;
    });
    let readyLoadCount = 0;

    const synchronizeLoad = (resolver: ConfigResolver) => {
      const loadTypescriptConfig = resolver.loadTypescriptConfig;
      resolver.loadTypescriptConfig = async (args) => {
        readyLoadCount += 1;
        if (readyLoadCount === 2) {
          releaseBothLoads();
        }
        await bothLoadsReady;
        return loadTypescriptConfig(args);
      };
    };

    try {
      apiClient.template = async ({ templateId }) => downloadedTemplateResponse(templateId);
      const firstResolver = new ConfigResolver();
      const secondResolver = new ConfigResolver();
      firstResolver.setContext({ ...fixtureResolverContext, templateId: 'first-template', workingDir });
      secondResolver.setContext({ ...fixtureResolverContext, templateId: 'second-template', workingDir });
      synchronizeLoad(firstResolver);
      synchronizeLoad(secondResolver);

      const configs = await Promise.all([firstResolver.getRawConfig(), secondResolver.getRawConfig()]);

      expect(configs.map(({ projectName }) => projectName).sort()).toEqual(['first-template', 'second-template']);
      expect(await readdir(workingDir)).toEqual([]);
    } finally {
      apiClient.template = originalTemplate;
      if (originalLegacyContent === undefined) {
        await rm(legacyTempPath, { force: true });
      } else {
        await writeFile(legacyTempPath, originalLegacyContent);
      }
      await rm(workingDir, { recursive: true, force: true });
    }
  });

  test('removes a downloaded TypeScript source after compilation fails', async () => {
    const workingDir = await mkdtemp(join(process.cwd(), '.stacktape-downloaded-config-invalid-'));
    const apiClient = stacktapeTrpcApiManager.apiClient;
    const originalTemplate = apiClient.template;

    try {
      apiClient.template = async ({ templateId }) => ({
        ...downloadedTemplateResponse(templateId),
        content: '{'
      });
      const resolver = new ConfigResolver();
      resolver.setContext({ ...fixtureResolverContext, templateId: 'invalid-template', workingDir });

      await expect(resolver.getRawConfig()).rejects.toMatchObject({ code: 'CONFIG_TYPESCRIPT_EXECUTION_FAILED' });
      expect(await readdir(workingDir)).toEqual([]);
    } finally {
      apiClient.template = originalTemplate;
      await rm(workingDir, { recursive: true, force: true });
    }
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
      operationSession.reset();
      operationReporter.setSilentMode(true);
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

  test('resolves a chain of directives returned by other directives to a fixed point', async () => {
    const resolver = newResolver();
    resolver.registerDirective({
      name: 'Level1',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: () => () => '$Level2()'
    });
    resolver.registerDirective({
      name: 'Level2',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: () => () => "$Format('{}-{}', 'deep', $Stage())"
    });

    await expect(
      resolver.resolveDirectives({ itemToResolve: { value: '$Level1()' }, resolveRuntime: true })
    ).resolves.toEqual({ value: 'deep-explicit-directive-stage' });
  });

  test('reuses cached directive results whose value is falsy instead of resolving them again', async () => {
    const resolver = newResolver();
    const calls: Record<string, number> = { FalseValue: 0, ZeroValue: 0, EmptyValue: 0 };
    const registerFalsy = (name: string, value: unknown) =>
      resolver.registerDirective({
        name,
        isRuntime: false,
        requiredParams: {},
        resolveFunction: () => () => {
          calls[name] += 1;
          return value;
        }
      });
    registerFalsy('FalseValue', false);
    registerFalsy('ZeroValue', 0);
    registerFalsy('EmptyValue', '');

    const resolved = await resolver.resolveDirectives({
      itemToResolve: {
        first: { flag: '$FalseValue()', count: '$ZeroValue()', text: '$EmptyValue()' },
        second: { flag: '$FalseValue()', count: '$ZeroValue()', text: '$EmptyValue()' }
      },
      resolveRuntime: true
    });

    expect(resolved).toEqual({
      first: { flag: false, count: 0, text: '' },
      second: { flag: false, count: 0, text: '' }
    });
    expect(calls).toEqual({ FalseValue: 1, ZeroValue: 1, EmptyValue: 1 });
  });

  test('fails with a plain-text semantic error when directive dependencies never resolve', async () => {
    const resolver = newResolver();
    resolver.registerDirective({
      name: 'NeverResolves',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: () => () => undefined
    });

    const rejection = await resolver
      .resolveDirectives({
        itemToResolve: { value: "$Format('{}', $NeverResolves())" },
        resolveRuntime: true
      })
      .then(
        () => null,
        (error) => error
      );

    expect(rejection).toMatchObject({
      category: 'DIRECTIVE',
      code: 'DIRECTIVE_DEPENDENCIES_UNRESOLVED'
    });
    expect(rejection.message).toContain("$Format('{}', $NeverResolves())");
    // The message and hints are consumed by the TUI presentation boundary, so they carry no styling of their own.
    expect(`${rejection.message}${rejection.hints.join('')}`).not.toContain('\u001b');
  });

  test('fails when a directive resolves directly to itself', async () => {
    const resolver = newResolver();
    resolver.registerDirective({
      name: 'SelfReference',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: () => () => '$SelfReference()'
    });

    await expect(
      resolver.resolveDirectives({ itemToResolve: { value: '$SelfReference()' }, resolveRuntime: true })
    ).rejects.toMatchObject({
      category: 'DIRECTIVE',
      code: 'DIRECTIVE_DEPENDENCIES_UNRESOLVED',
      message: expect.stringContaining('$SelfReference()')
    });
  });

  test('fails when two directive results form a cycle', async () => {
    const resolver = newResolver();
    resolver.registerDirective({
      name: 'CycleA',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: () => () => '$CycleB()'
    });
    resolver.registerDirective({
      name: 'CycleB',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: () => () => '$CycleA()'
    });

    await expect(
      resolver.resolveDirectives({ itemToResolve: { value: '$CycleA()' }, resolveRuntime: true })
    ).rejects.toMatchObject({
      category: 'DIRECTIVE',
      code: 'DIRECTIVE_DEPENDENCIES_UNRESOLVED'
    });
  });

  test('keeps local and normal resolution results of the same directive separate', async () => {
    const resolver = newResolver();
    resolver.registerDirective({
      name: 'Mode',
      isRuntime: true,
      requiredParams: {},
      resolveFunction: () => () => 'deployed-reference',
      localResolveFunction: () => () => 'local-value'
    });

    const itemToResolve = { value: '$Mode()' };
    await expect(resolver.resolveDirectives({ itemToResolve, resolveRuntime: true })).resolves.toEqual({
      value: 'deployed-reference'
    });
    await expect(
      resolver.resolveDirectives({ itemToResolve, resolveRuntime: true, useLocalResolve: true })
    ).resolves.toEqual({ value: 'local-value' });
    await expect(resolver.resolveDirectives({ itemToResolve, resolveRuntime: true })).resolves.toEqual({
      value: 'deployed-reference'
    });
  });

  test('never substitutes a cached runtime value when runtime resolution is disabled', async () => {
    const resolver = newResolver();
    resolver.registerDirective({
      name: 'RuntimeValue',
      isRuntime: true,
      requiredParams: {},
      resolveFunction: () => () => 'deployed-value'
    });
    resolver.registerDirective({
      name: 'ReturnsRuntimeValue',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: () => () => '$RuntimeValue()'
    });

    const itemToResolve = { direct: '$RuntimeValue()', returned: '$ReturnsRuntimeValue()' };
    await expect(resolver.resolveDirectives({ itemToResolve, resolveRuntime: true })).resolves.toEqual({
      direct: 'deployed-value',
      returned: 'deployed-value'
    });
    await expect(resolver.resolveDirectives({ itemToResolve, resolveRuntime: false })).resolves.toEqual({
      direct: '$RuntimeValue()',
      returned: '$RuntimeValue()'
    });
  });

  test('resolves overlapping invocations of one resolver without them stealing each other work', async () => {
    const resolver = newResolver();
    // Both invocations park inside their resolve function until the other one has started, so their queues are
    // guaranteed to overlap. Deployment commands resolve directives concurrently this way (`Promise.all` over the
    // hosting buckets whose environment is injected).
    let releaseBoth: () => void;
    const bothStarted = new Promise<void>((resolve) => {
      releaseBoth = resolve;
    });
    let startedCount = 0;
    const waitForBoth = async () => {
      startedCount += 1;
      if (startedCount === 2) {
        releaseBoth();
      }
      await bothStarted;
    };

    resolver.registerDirective({
      name: 'Overlapping',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: () => async () => {
        await waitForBoth();
        return 'normal';
      },
      localResolveFunction: () => async () => {
        await waitForBoth();
        return 'local';
      }
    });

    const itemToResolve = { value: "$Format('resolved-{}', $Overlapping())" };
    await expect(
      Promise.all([
        resolver.resolveDirectives({ itemToResolve, resolveRuntime: true }),
        resolver.resolveDirectives({ itemToResolve, resolveRuntime: true, useLocalResolve: true })
      ])
    ).resolves.toEqual([{ value: 'resolved-normal' }, { value: 'resolved-local' }]);
  });

  test('shares an in-flight result between overlapping invocations in the same resolution mode', async () => {
    const resolver = newResolver();
    let calls = 0;
    let markStarted: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    let release: () => void;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });

    resolver.registerDirective({
      name: 'SharedInFlight',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: () => async () => {
        calls += 1;
        markStarted();
        await blocked;
        return `value-${calls}`;
      }
    });

    const itemToResolve = { value: '$SharedInFlight()' };
    const first = resolver.resolveDirectives({ itemToResolve, resolveRuntime: true });
    await started;
    const second = resolver.resolveDirectives({ itemToResolve, resolveRuntime: true });
    release();

    await expect(Promise.all([first, second])).resolves.toEqual([{ value: 'value-1' }, { value: 'value-1' }]);
    expect(calls).toBe(1);
  });

  test('reports a re-entrant directive dependency instead of awaiting its own in-flight result', async () => {
    const resolver = newResolver();
    resolver.registerDirective({
      name: 'Reentrant',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: (activeResolver) => () =>
        activeResolver.resolveDirectives({ itemToResolve: '$Reentrant()', resolveRuntime: true })
    });

    await expect(
      resolver.resolveDirectives({ itemToResolve: '$Reentrant()', resolveRuntime: true })
    ).rejects.toMatchObject({
      category: 'DIRECTIVE',
      code: 'DIRECTIVE_DEPENDENCIES_UNRESOLVED',
      message: expect.stringContaining('$Reentrant()')
    });
  });

  test('invalidation drops runtime directive results and keeps the reusable ones', async () => {
    const resolver = newResolver();
    let reusableCalls = 0;
    resolver.registerDirective({
      name: 'ReusableInput',
      isRuntime: false,
      requiredParams: {},
      resolveFunction: () => () => {
        reusableCalls += 1;
        return `input-${reusableCalls}`;
      }
    });

    const itemToResolve = { reusable: '$ReusableInput()', runtime: "$CfFormat('deployed-{}', 'value')" };
    const resolve = () =>
      resolver.resolveDirectives<{ reusable: string; runtime: unknown }>({
        itemToResolve,
        resolveRuntime: true
      });

    const firstResolution = await resolve();
    expect(firstResolution).toMatchObject({ reusable: 'input-1' });
    expect(resolver.resolvedDirectiveDefinitions.sort()).toEqual([
      "$CfFormat('deployed-{}', 'value')",
      '$ReusableInput()'
    ]);

    resolver.invalidateRuntimeDirectiveResults();
    expect(resolver.resolvedDirectiveDefinitions).toEqual(['$ReusableInput()']);

    expect(await resolve()).toEqual(firstResolution);
    expect(reusableCalls).toBe(1);
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

  test('requires exactly one current Kafka event source and an explicit starting position at the schema boundary', () => {
    const configWithKafkaEvent = (properties: Record<string, unknown>) => ({
      resources: {
        worker: {
          type: 'function',
          properties: {
            events: [{ type: 'kafka-topic', properties }],
            packaging: {
              type: 'stacktape-lambda-buildpack',
              properties: { entryfilePath: 'src/worker.ts' }
            }
          }
        }
      }
    });

    const validSources = [
      {
        kafkaClusterName: 'ordersKafka',
        topicName: 'events',
        startFrom: 'latest'
      },
      {
        mskClusterArn: 'arn:aws:kafka:eu-west-1:111111111111:cluster/orders/uuid',
        topicName: 'events',
        startFrom: 'earliest'
      },
      {
        customKafkaConfiguration: {
          authentication: {
            type: 'BASIC_AUTH',
            properties: {
              authenticationSecretArn: 'arn:aws:secretsmanager:eu-west-1:111111111111:secret:kafka'
            }
          },
          bootstrapServers: ['broker.example.com:9092'],
          topicName: 'events'
        },
        startFrom: 'latest'
      }
    ];
    for (const properties of validSources) {
      expect(validateConfigWithZod({ config: configWithKafkaEvent(properties), configPath: 'stacktape.yml' })).toEqual({
        valid: true
      });
    }

    const missingSource = validateConfigWithZod({
      config: configWithKafkaEvent({ topicName: 'events', startFrom: 'latest' }),
      configPath: 'stacktape.yml'
    });
    expect(missingSource.valid).toBe(false);
    if (missingSource.valid === false) {
      expect(missingSource.errorMessage).toContain('kafkaClusterName');
      expect(missingSource.errorMessage).toContain('Required property');
    }

    const missingStartFrom = validateConfigWithZod({
      config: configWithKafkaEvent({ kafkaClusterName: 'ordersKafka', topicName: 'events' }),
      configPath: 'stacktape.yml'
    });
    expect(missingStartFrom.valid).toBe(false);
    if (missingStartFrom.valid === false) {
      expect(missingStartFrom.errorMessage).toContain('startFrom');
    }

    const competingSources = validateConfigWithZod({
      config: configWithKafkaEvent({
        kafkaClusterName: 'ordersKafka',
        mskClusterArn: 'arn:aws:kafka:eu-west-1:111111111111:cluster/orders/uuid',
        topicName: 'events',
        startFrom: 'latest'
      }),
      configPath: 'stacktape.yml'
    });
    expect(competingSources.valid).toBe(false);
    if (competingSources.valid === false) {
      expect(competingSources.errorMessage).toContain('mskClusterArn');
    }

    const missingAuthentication = validateConfigWithZod({
      config: configWithKafkaEvent({
        customKafkaConfiguration: {
          bootstrapServers: ['broker.example.com:9092'],
          topicName: 'events'
        },
        startFrom: 'latest'
      }),
      configPath: 'stacktape.yml'
    });
    expect(missingAuthentication.valid).toBe(false);
    if (missingAuthentication.valid === false) {
      expect(missingAuthentication.errorMessage).toContain('Resource `worker` is invalid');
    }

    const missingMtlsCertificate = validateConfigWithZod({
      config: configWithKafkaEvent({
        customKafkaConfiguration: {
          authentication: { type: 'MTLS', properties: {} },
          bootstrapServers: ['broker.example.com:9092'],
          topicName: 'events'
        },
        startFrom: 'latest'
      }),
      configPath: 'stacktape.yml'
    });
    expect(missingMtlsCertificate.valid).toBe(false);
    if (missingMtlsCertificate.valid === false) {
      expect(missingMtlsCertificate.errorMessage).toContain('Resource `worker` is invalid');
    }

    expect(
      validateConfigWithZod({
        config: configWithKafkaEvent({
          customKafkaConfiguration: {
            authentication: {
              type: 'BASIC_AUTH',
              properties: {
                authenticationSecretArn: 'arn:aws:secretsmanager:eu-west-1:111111111111:secret:kafka'
              }
            },
            bootstrapServers: ['broker.example.com:9092'],
            topicName: 'events'
          },
          startFrom: 'latest'
        }),
        configPath: 'stacktape.yml'
      })
    ).toEqual({ valid: true });
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
      // `logClass` is carried through undefined rather than defaulted: an unset log class means the
      // log group takes the AWS default, which is not the same as asking for `standard`.
      errorLogs: { disabled: false, retentionDays: 30, logClass: undefined },
      searchSlowLogs: { disabled: false, retentionDays: 5, logClass: undefined },
      indexSlowLogs: { disabled: false, retentionDays: 5, logClass: undefined }
    });
  });

  test('the generated validator preserves CloudFormation intrinsics imported by the config model', () => {
    const configWithAccessPoint = (accessPointArn: unknown) => ({
      resources: {
        reader: {
          type: 'function',
          properties: {
            packaging: {
              type: 'stacktape-lambda-buildpack',
              properties: { entryfilePath: 'src/index.ts' }
            },
            volumeMounts: [
              {
                type: 's3files',
                properties: { accessPointArn, mountPath: '/mnt/files' }
              }
            ]
          }
        }
      }
    });

    expect(
      stacktapeConfigSchema.safeParse(configWithAccessPoint('arn:aws:s3:eu-west-1:123:accesspoint/files')).success
    ).toBe(true);
    expect(stacktapeConfigSchema.safeParse(configWithAccessPoint({ Ref: 'FilesAccessPoint' })).success).toBe(true);
    expect(
      stacktapeConfigSchema.safeParse(configWithAccessPoint({ 'Fn::Sub': '${FilesAccessPointArn}' })).success
    ).toBe(true);
    expect(stacktapeConfigSchema.safeParse(configWithAccessPoint({ arbitrary: 'object' })).success).toBe(false);
  });
});
