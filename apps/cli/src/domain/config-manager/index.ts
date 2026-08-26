import type { AnyCloudFormationResource } from '@stacktape/cloudformation/resource';
import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';
import type { StpCfInfrastructureModuleType } from '@domain-services/cloudformation-registry-manager/types';
import type { EnrichedBjContainerProps, EnrichedCwContainerProps } from '@domain-services/packaging-manager/types';
import type { StpAlarmEnabledResource } from '@domain-services/config-manager/resolved-types/alarms';
import type { StpApplicationLoadBalancer } from '@domain-services/config-manager/resolved-types/application-load-balancers';
import type { StpAppSyncApi } from '@domain-services/config-manager/resolved-types/appsync-apis';
import type { StpAstroWeb } from '@domain-services/config-manager/resolved-types/astro-web';
import type { StpBatchJob } from '@domain-services/config-manager/resolved-types/batch-jobs';
import type { StpConvex } from '@domain-services/config-manager/resolved-types/convex';
import type { StpCustomResourceDefinition } from '@domain-services/config-manager/resolved-types/custom-resources';
import type { StpDeploymentScript } from '@domain-services/config-manager/resolved-types/deployment-script';
import type {
  StpEdgeLambdaFunction,
  StpHelperEdgeLambdaFunction
} from '@domain-services/config-manager/resolved-types/edge-lambda-functions';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import type { GuardrailDefinition } from '@domain-services/config-manager/resolved-types/guardrails';
import type { StpHostingBucket } from '@domain-services/config-manager/resolved-types/hosting-buckets';
import type { StpContainerWorkload } from '@domain-services/config-manager/resolved-types/multi-container-workloads';
import type { StpNextjsWeb } from '@domain-services/config-manager/resolved-types/nextjs-web';
import type { DeploymentNotificationDefinition } from '@domain-services/config-manager/resolved-types/notifications';
import type { StpNuxtWeb } from '@domain-services/config-manager/resolved-types/nuxt-web';
import type { StpPrivateService } from '@domain-services/config-manager/resolved-types/private-services';
import type { StpRemixWeb } from '@domain-services/config-manager/resolved-types/remix-web';
import type {
  StpCdnAttachableResourceType,
  StpCdnCompatibleResource,
  StpResource
} from '@domain-services/config-manager/resolved-types/resources';
import type { StpSolidStartWeb } from '@domain-services/config-manager/resolved-types/solidstart-web';
import type { StpSvelteKitWeb } from '@domain-services/config-manager/resolved-types/sveltekit-web';
import type { StpTanStackWeb } from '@domain-services/config-manager/resolved-types/tanstack-web';
import type { StpWebService } from '@domain-services/config-manager/resolved-types/web-services';
import type { StpWorkerService } from '@domain-services/config-manager/resolved-types/worker-services';
import type { StpWebSocketApiGateway } from '@domain-services/config-manager/resolved-types/websocket-api-gateways';
import type { AlarmDefinition } from '@stacktape/config/alarms';
import { guardrailDefinitionSchema } from '@stacktape/console-api/guardrails';
import type { FinalTransform, ResourceTransform as CfResourceTransform } from '@stacktape/config-authoring/tooling';
import type { DefaultedResource, ResourceDefinitionOf, StacktapeResourceType } from './normalized-resource';
import { isAbsolute, join } from 'node:path';
import { eventManager } from '@application-services/event-manager';
import { getRemoteResourceNames } from '../../commands/dev/local-resources';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import {
  getLambdaLogResourceArnsForPermissions,
  getLogGroupPolicyDocumentStatements
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/role-helpers';
import { isTransferAccelerationEnabledInRegion } from 'src/aws/buckets';
import { isS3NativeUploadHeader } from 'src/aws/s3-upload-options';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { fsPaths } from 'src/config/runtime-paths';
import { helperLambdaAwsResourceNames } from '@stacktape/naming/helper-lambda-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getJobName, getSimpleServiceDefaultContainerName } from '@stacktape/naming/workload-names';
import { getStpNameForResource } from '@stacktape/naming/stacktape-resource-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { processAllNodesSync, traverseToMaximalExtent } from '@utils/misc';
import { isAuroraEngine } from 'src/aws/rds-engines';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { getDirectiveParams, getIsDirective } from '@utils/directives';
import { getApexDomain } from '@utils/domains';
import { ConfigResolver, type ConfigResolverContext } from './config-resolver';
import { getAuthoredOverrides } from './normalized-resource';
import { getAlarmsToBeAppliedToResource, isGlobalAlarmEligibleForStack } from './utils/alarms';
import { DEFAULT_TEST_LISTENER_PORT } from './utils/application-load-balancers';
import { normalizeCustomDomains } from './utils/custom-domains';
import { buildConvexNestedResources, getConvexSecretName } from './utils/convex';
import { getStacktapeOriginRequestLambdaIamStatement } from './utils/iam';
import {
  getBatchJobTriggerLambdaAccessControl,
  getBatchJobTriggerLambdaEnvironment,
  getLambdaHandler,
  getLambdaRuntime,
  getStacktapeServiceLambdaAlarmNotificationInducedStatements,
  getStacktapeServiceLambdaCustomResourceInducedStatements,
  getStacktapeServiceLambdaCustomTaggingInducedStatement,
  getStacktapeServiceLambdaEcsRedeployInducedStatements,
  getStacktapeServiceLambdaEnvironment,
  getStacktapeServiceLambdaIssueDetectionStatements,
  getStacktapeServiceLambdaTracingStatements,
  getStacktapeServiceLambdaUptimeMonitoringStatements
} from './utils/lambdas';
import { mergeStacktapeDefaults } from './utils/misc';
import { getLambdaTracingInstrumentation, resolveEffectiveTracing } from './utils/tracing';
import { MAX_UPTIME_CHECKS_PER_STACK, resolveUptimeCheckRegions, validateUptimeCheck } from './utils/uptime-checks';
import { buildNextjsWebNestedResources } from './utils/nextjs-webs';
import { buildSsrWebNestedResources } from './utils/ssr-webs';
import { runInitialValidations, validateConfigStructure, validateGuardrails } from './utils/validation';
import { isDevCommand, isResourceTypeExcludedInDevMode } from '../../commands/dev/dev-mode-utils';
import type { StacktapeConfig } from '@stacktape/config';
import type { ApplicationLoadBalancerAlarm, HttpApiGatewayAlarm } from '@stacktape/config/alarms';
import type { ApplicationLoadBalancerListener } from '@stacktape/config/application-load-balancers';
import type {
  CdnBucketRoute,
  CdnForwardingOptions,
  CdnHttpApiGatewayRoute,
  CdnLambdaFunctionRoute,
  CdnLoadBalancerRoute
} from '@stacktape/config/cdn';
import type {
  ContainerWorkloadHttpApiIntegration,
  ContainerWorkloadHttpApiIntegrationProps,
  ContainerWorkloadServiceConnectIntegration,
  ContainerWorkloadServiceConnectIntegrationProps,
  S3Integration
} from '@stacktape/config/events';
import type { MongoDbAtlasProvider, UpstashProvider } from '@stacktape/config/providers';
import type { DomainConfiguration, StackConfig, StackOutput } from '@stacktape/config/shared';
import type { WebServiceAlbLoadBalancing, WebServiceNlbLoadBalancing } from '@stacktape/config/web-services';
import { configErrors } from './errors';
import type { StackContext } from '@domain-services/stack-context';
import type { ConfigManagerInitContext, IssueDetectionContext } from './context';
import type { HelperLambdaDetails } from '@utils/helper-lambdas';
import { CliError } from '@utils/errors';
import { canonicalizeEmailIdentity } from '@domain-services/email-sender-manager/identity';

/**
 * A CDN-capable resource whose `cdn` block is present, as proved by reading `cdn.enabled` off it. Only the block
 * itself is promised: everything inside it stays as optional as the user authored it.
 */
type ResourceWithEnabledCdn = StpCdnCompatibleResource & { cdn: NonNullable<StpCdnCompatibleResource['cdn']> };

/**
 * What project-name discovery already loaded. Full initialization reuses it instead of loading the configuration
 * again, because a TypeScript configuration is user code that must execute exactly once per invocation.
 */
type DiscoveredConfig = {
  finalTransform: FinalTransform | null;
  rawConfig: StacktapeConfig;
  source: Pick<ConfigResolverContext, 'configPath' | 'presetConfig' | 'templateId' | 'workingDir'>;
  transforms: { [logicalName: string]: CfResourceTransform };
};

export class ConfigManager {
  config: StacktapeConfig;
  rawConfig: StacktapeConfig;
  name = this.constructor.name;
  configResolver = new ConfigResolver();
  globalConfigGuardrails: GuardrailDefinition[] = [];
  globalConfigDeploymentNotifications: DeploymentNotificationDefinition[] = [];
  globalConfigAlarms: AlarmDefinition[] = [];
  transforms: { [logicalName: string]: CfResourceTransform } = {};
  finalTransform: FinalTransform | null = null;
  #stackContext: StackContext | undefined;
  #helperLambdaDetails: HelperLambdaDetails | undefined;
  #issueDetection: IssueDetectionContext = {};
  #discoveredConfig: DiscoveredConfig | undefined;

  private get stackContext(): StackContext {
    if (!this.#stackContext) {
      throw new Error('Config manager was used before its stack context was initialized.');
    }
    return this.#stackContext;
  }

  setStackContext = (stackContext: StackContext) => {
    this.#stackContext = Object.freeze({ ...stackContext });
  };

  private get helperLambdaDetails(): HelperLambdaDetails {
    if (!this.#helperLambdaDetails) {
      throw new Error('Config manager was used before helper Lambda details were initialized.');
    }
    return this.#helperLambdaDetails;
  }

  /**
   * Loads only the raw config (without directives resolution or validation).
   * Used to extract projectName before full initialization.
   */
  loadRawConfigOnly = async ({ context }: { context: ConfigResolverContext }) => {
    this.#discoveredConfig = undefined;
    // A local path triggers discovery. The resolver still applies its existing input precedence, so a preset or
    // template present in the same context may supply the discovered configuration.
    if (context.configPath) {
      await this.configResolver.loadRawConfig({ context });
      this.#discoveredConfig = {
        finalTransform: this.configResolver.finalTransform,
        rawConfig: this.configResolver.rawConfig,
        source: {
          configPath: context.configPath,
          presetConfig: context.presetConfig,
          templateId: context.templateId,
          workingDir: context.workingDir
        },
        transforms: this.configResolver.transforms
      };
    }
  };

  init = async ({ configRequired = true, context }: { configRequired: boolean; context: ConfigManagerInitContext }) => {
    const { configPath, presetConfig, templateId } = context.resolver;
    await eventManager.startEvent({
      eventType: 'LOAD_CONFIG_FILE',
      description: 'Loading configuration',
      phase: 'INITIALIZE'
    });
    if (!templateId && !presetConfig && !configPath && configRequired) {
      throw configErrors.configFileMissing();
    }

    // Preserve the legacy optional-config behavior: a preset config is only consumed when the command requires
    // configuration. For optional commands, a preset takes precedence over (and suppresses) local-path discovery.
    const shouldLoadConfig = configRequired || Boolean(templateId || (!presetConfig && configPath));

    // Initialization is staged on a plain candidate manager and published only once every validation passed. A
    // configuration that fails validation therefore leaves this manager exactly as project-name discovery left it,
    // and the next attempt starts from a resolver without the failed attempt's directive registrations and results.
    const candidate = new ConfigManager();
    candidate.setStackContext(context.stack);
    candidate.#helperLambdaDetails = context.helperLambdaDetails;
    candidate.#issueDetection = context.issueDetection;
    // Reuse what discovery loaded rather than loading the configuration again, so a TypeScript config and its
    // transform side channel are produced by exactly one execution of the user's module.
    const discoveredConfig = this.#getDiscoveredConfigFor(context.resolver);
    if (discoveredConfig) {
      candidate.configResolver.rawConfig = discoveredConfig.rawConfig;
      candidate.configResolver.transforms = discoveredConfig.transforms;
      candidate.configResolver.finalTransform = discoveredConfig.finalTransform;
    }
    candidate.configResolver.setContext(context.resolver);
    candidate.configResolver.registerBuiltInDirectives();

    if (shouldLoadConfig) {
      if (!candidate.configResolver.rawConfig) {
        await candidate.configResolver.loadRawConfig({ context: context.resolver });
      }
      candidate.transforms = candidate.configResolver.transforms;
      candidate.finalTransform = candidate.configResolver.finalTransform;
      candidate.configResolver.registerUserDirectives(candidate.configResolver.rawConfig?.directives || []);
      await candidate.configResolver.loadResolvedConfig();
      candidate.config = candidate.configResolver.resolvedConfig;
      candidate.rawConfig = candidate.configResolver.rawConfig;
      await validateConfigStructure({ config: candidate.config, configPath, templateId });
      runInitialValidations({ configManager: candidate, stackContext: candidate.stackContext });
    }

    this.#publishInitializedConfig(candidate);
    this.#discoveredConfig = undefined;

    await eventManager.finishEvent({
      eventType: 'LOAD_CONFIG_FILE',
      data: { stackName: this.stackContext.stackName, config: this.config },
      phase: 'INITIALIZE'
    });
  };

  #getDiscoveredConfigFor = (context: ConfigResolverContext): DiscoveredConfig | undefined => {
    const discoveredConfig = this.#discoveredConfig;
    const source = discoveredConfig?.source;
    return source &&
      source.configPath === context.configPath &&
      source.presetConfig === context.presetConfig &&
      source.templateId === context.templateId &&
      source.workingDir === context.workingDir
      ? discoveredConfig
      : undefined;
  };

  /**
   * Publishes a validated candidate as this manager's state in one synchronous step. The global configuration arrays
   * are deliberately left alone: they are loaded separately and initialization does not own them.
   */
  #publishInitializedConfig = (candidate: ConfigManager) => {
    this.configResolver = candidate.configResolver;
    this.config = candidate.config;
    this.rawConfig = candidate.rawConfig;
    this.transforms = candidate.transforms;
    this.finalTransform = candidate.finalTransform;
    this.#stackContext = candidate.#stackContext;
    this.#helperLambdaDetails = candidate.#helperLambdaDetails;
    this.#issueDetection = candidate.#issueDetection;
  };

  reset = () => {
    this.configResolver.reset();
    this.config = null;
    this.rawConfig = null;
    this.globalConfigGuardrails = [];
    this.globalConfigDeploymentNotifications = [];
    this.globalConfigAlarms = [];
    // Transforms belong to the configuration that declared them. `init` only reassigns them for a defineConfig-style
    // TypeScript config, so without clearing them here a later YAML configuration would inherit the previous one's.
    this.transforms = {};
    this.finalTransform = null;
    this.#stackContext = undefined;
    this.#helperLambdaDetails = undefined;
    this.#issueDetection = {};
    this.#discoveredConfig = undefined;
  };

  validateGuardrails = ({ hasConfig }: { hasConfig: boolean }) =>
    validateGuardrails({
      configManager: this,
      guardrails: this.guardrails,
      hasConfig,
      stackContext: this.stackContext
    });

  loadGlobalConfig = async () => {
    const globalConfig = await stacktapeTrpcApiManager.apiClient.globalConfig();
    // The Console wire format still calls channels `notificationTargets` and attaches full console
    // channels. Config-language alarms use `notificationChannels`; console-attached channels become
    // `console-channel` references resolved by the Console at delivery time, so channel credentials
    // never enter the customer-side alarm payload.
    this.globalConfigAlarms = (globalConfig.alarms || [])
      .map((wireAlarm) => {
        const { notificationTargets, ...alarm } = wireAlarm;
        return {
          ...alarm,
          notificationChannels: (notificationTargets || []).map(({ name }) => ({
            type: 'console-channel',
            properties: { channelName: name }
          }))
        } as unknown as AlarmDefinition;
      })
      .filter((alarm) =>
        isGlobalAlarmEligibleForStack({
          alarm,
          projectName: this.stackContext.projectName,
          stage: this.stackContext.stage
        })
      );
    this.globalConfigDeploymentNotifications = (globalConfig.deploymentNotifications ||
      []) as DeploymentNotificationDefinition[];
    const parsedGuardrails = guardrailDefinitionSchema.array().safeParse(globalConfig.guardrails || []);
    if (!parsedGuardrails.success) {
      throw new CliError({
        category: 'GUARDRAIL',
        code: 'GUARDRAIL_DEFINITION_INVALID',
        message: 'Your organization has an invalid guardrail definition.',
        hints: 'Ask an organization administrator to review and save the guardrail again in Stacktape Console.'
      });
    }
    this.globalConfigGuardrails = parsedGuardrails.data;
    // this.alarms = this.alarms.concat(getGlobalConfigDefinedAlarms({ globalConfigAlarms: this.globalConfigAlarms }));
  };

  resolveDirectives = async <T>(params: {
    itemToResolve: any;
    resolveRuntime: boolean;
    useLocalResolve?: boolean;
  }): Promise<T> => {
    return this.configResolver.resolveDirectives(params);
  };

  invalidatePotentiallyChangedDirectiveResults = () => {
    // currently we consider runtime directives the ones that potentially changed
    this.configResolver.invalidateRuntimeDirectiveResults();
  };

  findResourceInConfig = ({ nameChain }: { nameChain: string | string[] }) => {
    const chain = typeof nameChain === 'string' ? nameChain.split('.') : nameChain;
    const configParent = this.allConfigResources.find(({ name }) => name === chain[0]);

    const { resultValue, restPath, validPath } = traverseToMaximalExtent(
      { [chain[0]]: configParent },
      chain.join('._nestedResources.')
    );

    return {
      resource: resultValue as StpResource,
      validPath,
      restPath,
      fullyResolved: !restPath
    };
  };

  findImmediateParent = ({ nameChain }: { nameChain: string | string[] }) => {
    const chain = typeof nameChain === 'string' ? nameChain.split('.') : nameChain;
    return this.findResourceInConfig({ nameChain: chain.slice(0, -1) }).resource;
  };

  /**
   * Flattens every authored resource of one type into the shape the CLI works with: the authored properties raised to
   * the top level, plus the resource's identity, plus the defaults for that type.
   *
   * Selecting on the discriminator narrows the authored definition, so the properties spread here are the ones that
   * resource type really declares. Families needing more than authored properties and identity — a Lambda's `handler`,
   * a service's `_nestedResources` — add it in their own getter.
   *
   * The result is a `DefaultedResource` rather than a `NormalizedResource`: everything returned here has been through
   * `mergeStacktapeDefaults`, so the properties that resource type declares a default for are present. For the
   * majority of types the table is empty and the two shapes are identical.
   */
  private getResourcesFromConfig = <TResourceType extends StacktapeResourceType>(
    resourceType: TResourceType
  ): DefaultedResource<TResourceType>[] => {
    return Object.entries(this.config.resources)
      .filter((entry): entry is [string, ResourceDefinitionOf<TResourceType>] => entry[1].type === resourceType)
      .map(([name, definition]) => ({
        name: getStpNameForResource({ nameChain: [name] }),
        // The filter above proved these equal `definition.type`, and naming the parameter keeps the narrowing.
        type: resourceType,
        overrides: getAuthoredOverrides(definition),
        configParentResourceType: resourceType,
        nameChain: [name],
        ...definition.properties
      }))
      .map(mergeStacktapeDefaults);
  };

  private get globallyUniqueStackHash() {
    return this.stackContext.globallyUniqueStackHash;
  }

  get mongoDbAtlasProvider() {
    return this.config.providerConfig?.mongoDbAtlas as MongoDbAtlasProvider;
  }

  get requireAtlasCredentialsParameter() {
    return this.atlasMongoClusters?.length && !this.mongoDbAtlasProvider?.privateKey;
  }

  get upstashProvider() {
    return this.config.providerConfig?.upstash as UpstashProvider;
  }

  get requireUpstashCredentialsParameter() {
    return this.upstashRedisDatabases?.length && !this.upstashProvider?.apiKey;
  }

  get deploymentConfig() {
    return {
      disableS3TransferAcceleration: !this.isS3TransferAccelerationAvailableInDeploymentRegion,
      ...this.config?.deploymentConfig
    };
  }

  get agentCoreRuntimes() {
    return this.getResourcesFromConfig('agentcore-runtime').map((runtime) => ({
      ...runtime,
      jobName: getJobName({ workloadName: runtime.name, workloadType: runtime.type }),
      configParentResourceType: 'agentcore-runtime' as const
    }));
  }

  get agentCoreMemories() {
    return this.getResourcesFromConfig('agentcore-memory');
  }

  get agentCoreGateways() {
    return this.getResourcesFromConfig('agentcore-gateway');
  }

  get agentCoreBrowsers() {
    return this.getResourcesFromConfig('agentcore-browser');
  }

  get agentCoreCodeInterpreters() {
    return this.getResourcesFromConfig('agentcore-code-interpreter');
  }

  get functions() {
    return this.getResourcesFromConfig('function').map(({ name, packaging, ...definition }) => {
      return {
        ...definition,
        name,
        type: 'function',
        packaging,
        artifactName: name,
        handler: getLambdaHandler({ name, packaging }),
        resourceName: awsResourceNames.lambda(name, this.stackContext.stackName),
        cfLogicalName: cfLogicalNames.lambda(name),
        aliasLogicalName:
          (definition.deployment || definition.provisionedConcurrency) && cfLogicalNames.lambdaStpAlias(name),
        events: definition.events || [],
        configParentResourceType: 'function'
      } as StpLambdaFunction;
    });
  }

  get containerWorkloads() {
    const fromConvex = this.convexes.flatMap((c) => {
      const out: StpContainerWorkload[] = [c._nestedResources.backendContainerWorkload];
      if (c._nestedResources.dashboardContainerWorkload) {
        out.push(c._nestedResources.dashboardContainerWorkload);
      }
      return out;
    });
    return [...this.getResourcesFromConfig('multi-container-workload'), ...fromConvex];
  }

  get batchJobs() {
    return this.getResourcesFromConfig('batch-job').map((batchJob) => {
      const artifactName = 'batchJobTriggerLambda';
      const helperLambdaData = this.helperLambdaDetails.batchJobTriggerLambda;
      const triggerLambdaIdentifier: keyof StpBatchJob['_nestedResources'] = 'triggerFunction';
      const triggerLambdaStpName = getStpNameForResource({
        nameChain: [...batchJob.nameChain, triggerLambdaIdentifier],
        parentResourceType: batchJob.type
      });
      return {
        ...batchJob,
        _nestedResources: {
          [triggerLambdaIdentifier]: {
            nameChain: [...batchJob.nameChain, triggerLambdaIdentifier],
            name: triggerLambdaStpName,
            packaging: { type: 'helper-lambda', properties: helperLambdaData },
            type: 'function',
            resourceName: awsResourceNames.lambda(triggerLambdaStpName, this.stackContext.stackName),
            cfLogicalName: cfLogicalNames.lambda(triggerLambdaStpName),
            artifactName,
            artifactPath: helperLambdaData.artifactPath,
            handler: helperLambdaData.handler,
            configParentResourceType: batchJob.configParentResourceType,
            timeout: 10,
            runtime: 'nodejs22.x' as const,
            events: batchJob.events || [],
            environment: getBatchJobTriggerLambdaEnvironment({
              stackName: this.stackContext.stackName,
              batchJobName: batchJob.name
            }),
            iamRoleStatements: getBatchJobTriggerLambdaAccessControl({ batchJobName: batchJob.name })
          } as StpHelperLambdaFunction
        }
      } as StpBatchJob;
    });
  }

  get buckets() {
    const fromConvex = this.convexes.flatMap((c) => [
      c._nestedResources.modulesBucket,
      c._nestedResources.filesBucket,
      c._nestedResources.searchBucket,
      c._nestedResources.exportsBucket,
      c._nestedResources.snapshotImportsBucket
    ]);
    return [...this.getResourcesFromConfig('bucket'), ...fromConvex];
  }

  get hostingBuckets() {
    return this.getResourcesFromConfig('hosting-bucket').map(
      (hostingBucket: Omit<StpHostingBucket, '_nestedResources'>) => {
        const nestedBucketIdentifier: keyof StpHostingBucket['_nestedResources'] = 'bucket';

        const {
          name: _n,
          type,
          uploadDirectoryPath,
          customDomains,
          disableUrlNormalization,
          edgeFunctions,
          errorDocument,
          hostingContentType,
          indexDocument,
          injectEnvironment: _injectEnvironment,
          writeDotenvFilesTo: _writeDotenvFilesTo,
          useFirewall,
          fileOptions,
          configParentResourceType,
          nameChain,
          routeRewrites,
          excludeFilesPatterns,
          build: _build,
          dev: _dev,
          ..._restProps
        } = hostingBucket;
        // props check constant ensures full destructuring of web service props
        const _propsCheck: Record<string, never> = _restProps;
        return {
          ...hostingBucket,
          _nestedResources: {
            [nestedBucketIdentifier]: {
              nameChain: [...nameChain, nestedBucketIdentifier],
              name: getStpNameForResource({
                nameChain: [...nameChain, nestedBucketIdentifier],
                parentResourceType: type
              }),
              type: 'bucket',
              configParentResourceType,
              directoryUpload: {
                directoryPath: uploadDirectoryPath,
                headersPreset: hostingContentType || 'static-website',
                fileOptions,
                excludeFilesPatterns
              },
              cdn: {
                enabled: true,
                customDomains,
                disableUrlNormalization,
                edgeFunctions,
                errorDocument,
                indexDocument,
                rewriteRoutesForSinglePageApp: hostingContentType === 'single-page-app',
                useFirewall,
                routeRewrites
              }
            }
          }
        } as StpHostingBucket;
      }
    );
  }

  get databases() {
    const topLevel = this.getResourcesFromConfig('relational-database');
    const fromConvex = this.convexes.map((c) => c._nestedResources.database).filter(Boolean);
    return [...topLevel, ...fromConvex];
  }

  get convexes() {
    return this.getResourcesFromConfig('convex').map(
      (convex) =>
        ({
          ...convex,
          _nestedResources: buildConvexNestedResources({ convex, stackContext: this.stackContext })
        }) as unknown as StpConvex
    );
  }

  get efsFilesystems() {
    return this.getResourcesFromConfig('efs-filesystem');
  }

  get dynamoDbTables() {
    return this.getResourcesFromConfig('dynamo-db-table');
  }

  get applicationLoadBalancers(): StpApplicationLoadBalancer[] {
    const topLevel = this.getResourcesFromConfig('application-load-balancer').map((resource) => ({
      ...resource,
      customDomains: normalizeCustomDomains({ customDomains: resource.customDomains })
    }));
    const fromConvex = this.convexes.map((c) => ({
      ...c._nestedResources.loadBalancer,
      customDomains: normalizeCustomDomains({
        customDomains: c._nestedResources.loadBalancer.customDomains as
          | (string | DomainConfiguration)[]
          | null
          | undefined
      })
    }));
    return [...topLevel, ...fromConvex];
  }

  get httpApiGateways() {
    return this.getResourcesFromConfig('http-api-gateway');
  }

  get websocketApiGateways() {
    return this.getResourcesFromConfig('websocket-api-gateway');
  }

  get appsyncApis(): StpAppSyncApi[] {
    return this.getResourcesFromConfig('appsync-api');
  }

  get eventBuses() {
    return this.getResourcesFromConfig('event-bus');
  }

  get bastions() {
    return this.getResourcesFromConfig('bastion');
  }

  get stateMachines() {
    return this.getResourcesFromConfig('state-machine');
  }

  get customResourceDefinitions() {
    return this.getResourcesFromConfig('custom-resource-definition').map((customResourceDefinition) => {
      const customResourceFunctionIdentifier: keyof StpCustomResourceDefinition['_nestedResources'] = 'backingFunction';
      const stpName = getStpNameForResource({
        nameChain: [...customResourceDefinition.nameChain, customResourceFunctionIdentifier],
        parentResourceType: customResourceDefinition.type
      });
      return {
        ...customResourceDefinition,
        _nestedResources: {
          backingFunction: {
            ...customResourceDefinition,
            nameChain: [...customResourceDefinition.nameChain, customResourceFunctionIdentifier],
            type: 'function',
            name: stpName,
            handler: getLambdaHandler({
              name: stpName,
              packaging: customResourceDefinition.packaging
            }),
            resourceName: awsResourceNames.lambda(stpName, this.stackContext.stackName),
            cfLogicalName: cfLogicalNames.lambda(stpName),
            artifactName: stpName,
            events: []
          }
        }
      } as StpCustomResourceDefinition;
    });
  }

  get customResourceInstances() {
    return this.getResourcesFromConfig('custom-resource-instance');
  }

  get userPools() {
    return this.getResourcesFromConfig('user-auth-pool');
  }

  get atlasMongoClusters() {
    return this.getResourcesFromConfig('mongo-db-atlas-cluster');
  }

  get redisClusters() {
    return this.getResourcesFromConfig('redis-cluster');
  }

  get deploymentScripts() {
    return this.getResourcesFromConfig('deployment-script').map((deploymentScript) => {
      const deploymentScriptFunctionIdentifier: keyof StpDeploymentScript['_nestedResources'] = 'scriptFunction';
      const stpName = getStpNameForResource({
        nameChain: [...deploymentScript.nameChain, deploymentScriptFunctionIdentifier],
        parentResourceType: deploymentScript.type
      });
      return {
        ...deploymentScript,
        _nestedResources: {
          scriptFunction: {
            ...deploymentScript,
            nameChain: [...deploymentScript.nameChain, deploymentScriptFunctionIdentifier],
            name: getStpNameForResource({
              nameChain: [...deploymentScript.nameChain, deploymentScriptFunctionIdentifier],
              parentResourceType: deploymentScript.type
            }),
            handler: getLambdaHandler({ name: stpName, packaging: deploymentScript.packaging }),
            resourceName: awsResourceNames.lambda(stpName, this.stackContext.stackName),
            cfLogicalName: cfLogicalNames.lambda(stpName),
            artifactName: stpName,
            type: 'function',
            events: []
          }
        }
      } as StpDeploymentScript;
    });
  }

  get upstashRedisDatabases() {
    return this.getResourcesFromConfig('upstash-redis');
  }

  get stackTracingDefault() {
    return this.config.stackConfig?.tracing;
  }

  /** Lambda functions whose effective tracing (stack default + per-resource override) is enabled. */
  get tracedLambdaFunctions() {
    return this.functions.flatMap((lambdaFunction) => {
      const effectiveTracing = resolveEffectiveTracing({
        stackDefault: this.stackTracingDefault,
        resourceOverride: lambdaFunction.tracing,
        resourceName: lambdaFunction.name
      });
      return effectiveTracing.enabled ? [{ ...lambdaFunction, effectiveTracing }] : [];
    });
  }

  /**
   * Traced functions with their instrumentation resolved: the layer + environment when it can be
   * applied, or the reason it cannot (unsupported runtime, region without the layer, wrapper
   * collision). Account-level tracing infrastructure keys off functions that actually get
   * instrumented, not off intent alone.
   */
  get lambdaTracingInstrumentations() {
    return this.tracedLambdaFunctions.map((lambdaFunction) => ({
      ...lambdaFunction,
      ...getLambdaTracingInstrumentation({
        resourceName: lambdaFunction.name,
        runtime: getLambdaRuntime({
          name: lambdaFunction.name,
          packaging: lambdaFunction.packaging,
          runtime: lambdaFunction.runtime
        }),
        region: this.stackContext.region,
        samplingRate: lambdaFunction.effectiveTracing.samplingRate,
        userEnvironment: Object.fromEntries(
          (lambdaFunction.environment || []).map(({ name: varName, value }) => [varName, value])
        ),
        userLayers: lambdaFunction.layers,
        projectName: this.stackContext.projectName,
        stage: this.stackContext.stage
      })
    }));
  }

  get instrumentedLambdaFunctions() {
    return this.lambdaTracingInstrumentations.filter(({ instrumentation }) => instrumentation);
  }

  get uptimeChecks() {
    const configuredChecks = this.getResourcesFromConfig('uptime-check');
    if (configuredChecks.length > MAX_UPTIME_CHECKS_PER_STACK) {
      throw configErrors.uptimeChecksLimitExceeded({
        count: configuredChecks.length,
        limit: MAX_UPTIME_CHECKS_PER_STACK
      });
    }
    return configuredChecks.map((check) => {
      const resolved = {
        ...check,
        regions: resolveUptimeCheckRegions({
          configuredRegions: check.regions,
          stackRegion: this.stackContext.region
        })
      };
      validateUptimeCheck({ check: resolved });
      return resolved;
    });
  }

  get edgeLambdaFunctions() {
    return this.getResourcesFromConfig('edge-lambda-function').map((edgeLambda) => {
      const lambdaResourceName = awsResourceNames.edgeLambda(
        edgeLambda.name,
        this.stackContext.stackName,
        this.stackContext.region
      );
      return {
        ...edgeLambda,
        handler: getLambdaHandler({ name: edgeLambda.name, packaging: edgeLambda.packaging }),
        resourceName: lambdaResourceName,
        artifactName: edgeLambda.name,
        events: [],
        iamRoleStatements: [
          ...(edgeLambda.iamRoleStatements || []),
          ...getLogGroupPolicyDocumentStatements(
            getLambdaLogResourceArnsForPermissions({
              lambdaResourceName,
              edgeLambda: true
            }),
            false
          )
        ],
        logging: {
          disabled: edgeLambda.logging?.disabled,
          retentionDays: edgeLambda.logging?.retentionDays || 180,
          logClass: edgeLambda.logging?.logClass
        }
      } as StpEdgeLambdaFunction;
    });
  }

  get awsCdkConstructs() {
    return this.getResourcesFromConfig('aws-cdk-construct');
  }

  get sqsQueues() {
    return this.getResourcesFromConfig('sqs-queue');
  }

  get snsTopics() {
    return this.getResourcesFromConfig('sns-topic');
  }

  get kinesisStreams() {
    return this.getResourcesFromConfig('kinesis-stream');
  }

  get kafkaClusters() {
    return this.getResourcesFromConfig('kafka-cluster');
  }

  get kafkaClustersWithLambdaEvents() {
    const remoteNames = isDevCommand() ? getRemoteResourceNames() : new Set(this.kafkaClusters.map(({ name }) => name));
    const used = new Set<string>();
    [
      ...this.functions,
      ...this.deploymentScripts.map(({ _nestedResources }) => _nestedResources.scriptFunction),
      ...this.customResourceDefinitions.map(({ _nestedResources }) => _nestedResources.backingFunction)
    ].forEach((lambda) =>
      lambda.events?.forEach((event) => {
        if (
          event.type === 'kafka-topic' &&
          'kafkaClusterName' in event.properties &&
          event.properties.kafkaClusterName &&
          remoteNames.has(event.properties.kafkaClusterName)
        ) {
          used.add(event.properties.kafkaClusterName);
        }
      })
    );
    return this.kafkaClusters.filter(({ name }) => used.has(name));
  }

  get dsqlDatabases() {
    return this.getResourcesFromConfig('dsql-database');
  }

  get emailSenders() {
    return this.getResourcesFromConfig('email-sender').map((resource) => {
      try {
        return { ...resource, identity: canonicalizeEmailIdentity(resource.identity) };
      } catch (cause) {
        throw new CliError({
          category: 'CONFIG_VALIDATION',
          code: 'CONFIG_EMAIL_SENDER_IDENTITY_INVALID',
          message: `Email sender \`${resource.name}\` has invalid identity \`${resource.identity}\`.`,
          hints: 'Use a domain such as `example.com` or an exact address such as `billing@example.com`.',
          cause
        });
      }
    });
  }

  get webAppFirewalls() {
    return this.getResourcesFromConfig('web-app-firewall');
  }

  get nextjsWebs() {
    return this.getResourcesFromConfig('nextjs-web').map(
      (nextjsWeb) =>
        ({
          ...nextjsWeb,
          _nestedResources: buildNextjsWebNestedResources({ nextjsWeb, stackContext: this.stackContext })
        }) as StpNextjsWeb
    );
  }

  get astroWebs() {
    return this.getResourcesFromConfig('astro-web').map(
      (astroWeb) =>
        ({
          ...astroWeb,
          _nestedResources: buildSsrWebNestedResources({ ssrWeb: astroWeb, stackContext: this.stackContext })
        }) as StpAstroWeb
    );
  }

  get nuxtWebs() {
    return this.getResourcesFromConfig('nuxt-web').map(
      (nuxtWeb) =>
        ({
          ...nuxtWeb,
          _nestedResources: buildSsrWebNestedResources({ ssrWeb: nuxtWeb, stackContext: this.stackContext })
        }) as StpNuxtWeb
    );
  }

  get sveltekitWebs() {
    return this.getResourcesFromConfig('sveltekit-web').map(
      (sveltekitWeb) =>
        ({
          ...sveltekitWeb,
          _nestedResources: buildSsrWebNestedResources({ ssrWeb: sveltekitWeb, stackContext: this.stackContext })
        }) as StpSvelteKitWeb
    );
  }

  get solidstartWebs() {
    return this.getResourcesFromConfig('solidstart-web').map(
      (solidstartWeb) =>
        ({
          ...solidstartWeb,
          _nestedResources: buildSsrWebNestedResources({ ssrWeb: solidstartWeb, stackContext: this.stackContext })
        }) as StpSolidStartWeb
    );
  }

  get tanstackWebs() {
    return this.getResourcesFromConfig('tanstack-web').map(
      (tanstackWeb) =>
        ({
          ...tanstackWeb,
          _nestedResources: buildSsrWebNestedResources({ ssrWeb: tanstackWeb, stackContext: this.stackContext })
        }) as StpTanStackWeb
    );
  }

  get remixWebs() {
    return this.getResourcesFromConfig('remix-web').map(
      (remixWeb) =>
        ({
          ...remixWeb,
          _nestedResources: buildSsrWebNestedResources({ ssrWeb: remixWeb, stackContext: this.stackContext })
        }) as StpRemixWeb
    );
  }

  get openSearchDomains() {
    return this.getResourcesFromConfig('open-search-domain');
  }

  get webServices() {
    const containerWorkloadIdentifier: keyof StpWebService['_nestedResources'] = 'containerWorkload';
    const httpApiGatewayIdentifier: keyof StpWebService['_nestedResources'] = 'httpApiGateway';
    const loadBalancerIdentifier: keyof StpWebService['_nestedResources'] = 'loadBalancer';
    const networkLoadBalancerIdentifier: keyof StpWebService['_nestedResources'] = 'networkLoadBalancer';

    return this.getResourcesFromConfig('web-service').map((serviceDefinition) => {
      const {
        name: _,
        packaging,
        resources,
        type,
        connectTo,
        iamRoleStatements,
        environment,
        secrets,
        internalHealthCheck,
        logging,
        scaling,
        cdn,
        cors,
        customDomains,
        alarms,
        disabledGlobalAlarms,
        loadBalancing,
        deployment,
        useFirewall,
        configParentResourceType: _configParentResourceType,
        nameChain,
        stopTimeout,
        enableRemoteSessions,
        volumeMounts,
        sideContainers,
        usePrivateSubnetsWithNAT,
        overrides: _overrides,
        ...restProps
      } = serviceDefinition;
      // props check constant ensures full destructuring of web service props
      // eslint-disable-next-line
      const propsCheck: Record<string, never> = restProps;
      const needTestListener = deployment?.beforeAllowTrafficFunction;

      return {
        ...serviceDefinition,
        _nestedResources: {
          [containerWorkloadIdentifier]: {
            nameChain: [...nameChain, containerWorkloadIdentifier],
            enableRemoteSessions,
            usePrivateSubnetsWithNAT,
            containers: [
              {
                name: getSimpleServiceDefaultContainerName(),
                dependsOn: sideContainers?.length
                  ? sideContainers
                      .filter(
                        (helperContainer) =>
                          !helperContainer.dependsOn?.some(
                            ({ containerName }) => containerName === getSimpleServiceDefaultContainerName()
                          )
                      )
                      .map((helperContainer) => ({
                        containerName: helperContainer.name,
                        condition: helperContainer.containerType === 'run-on-init' ? 'SUCCESS' : 'START'
                      }))
                  : undefined,
                packaging,
                environment: (environment || [])
                  .concat([
                    ...(loadBalancing?.type === 'network-load-balancer' ? [] : [{ name: 'PORT', value: 3000 }]),
                    { name: 'HOST', value: '0.0.0.0' }
                  ])
                  .concat(deployment ? [{ name: 'DEPLOYMENT_TEST_PORT', value: DEFAULT_TEST_LISTENER_PORT }] : []),
                secrets,
                logging,
                internalHealthCheck,
                loadBalancerHealthCheck: {
                  healthcheckPath: (loadBalancing as WebServiceAlbLoadBalancing)?.properties?.healthcheckPath,
                  healthcheckInterval: (loadBalancing as WebServiceAlbLoadBalancing)?.properties?.healthcheckInterval,
                  healthcheckTimeout: (loadBalancing as WebServiceAlbLoadBalancing)?.properties?.healthcheckTimeout,
                  healthCheckProtocol: (loadBalancing as WebServiceNlbLoadBalancing)?.properties?.healthCheckProtocol,
                  healthCheckPort: (loadBalancing as WebServiceNlbLoadBalancing)?.properties?.healthCheckPort
                },
                essential: true,
                stopTimeout,
                volumeMounts,
                events: [
                  loadBalancing?.type === 'application-load-balancer'
                    ? {
                        type: 'application-load-balancer',
                        properties: {
                          priority: 3,
                          containerPort: 3000,
                          loadBalancerName: `${[...nameChain, loadBalancerIdentifier].join('.')}`,
                          listenerPort: 443,
                          paths: ['*']
                        }
                      }
                    : loadBalancing?.type === 'network-load-balancer'
                      ? loadBalancing.properties.ports.map(({ port, containerPort }) => ({
                          type: 'network-load-balancer',
                          properties: {
                            containerPort: containerPort || port,
                            loadBalancerName: `${[...nameChain, networkLoadBalancerIdentifier].join('.')}`,
                            listenerPort: port
                          }
                        }))
                      : {
                          type: 'http-api-gateway',
                          properties: {
                            containerPort: 3000,
                            httpApiGatewayName: `${[...nameChain, httpApiGatewayIdentifier].join('.')}`,
                            method: '*',
                            path: '/{proxy+}'
                          }
                        }
                ].flat()
              },
              ...(sideContainers || []).map((sideContainer) => ({
                essential: sideContainer.containerType !== 'run-on-init',
                ...sideContainer
              }))
            ],
            name: getStpNameForResource({
              nameChain: [...nameChain, containerWorkloadIdentifier],
              parentResourceType: type
            }),
            resources,
            type: 'multi-container-workload',
            configParentResourceType: type,
            connectTo,
            iamRoleStatements,
            scaling,
            deployment: deployment && { testListenerPort: DEFAULT_TEST_LISTENER_PORT, ...deployment }
          },
          [httpApiGatewayIdentifier]:
            loadBalancing?.type === 'application-load-balancer' || loadBalancing?.type === 'network-load-balancer'
              ? undefined
              : {
                  nameChain: [...nameChain, httpApiGatewayIdentifier],
                  name: getStpNameForResource({
                    nameChain: [...nameChain, httpApiGatewayIdentifier],
                    parentResourceType: type
                  }),
                  type: 'http-api-gateway',
                  configParentResourceType: type,
                  customDomains,
                  cors,
                  cdn,
                  alarms: alarms as HttpApiGatewayAlarm[],
                  disabledGlobalAlarms,
                  logging
                },
          [loadBalancerIdentifier]:
            loadBalancing?.type === 'application-load-balancer'
              ? {
                  nameChain: [...nameChain, loadBalancerIdentifier],
                  name: getStpNameForResource({
                    nameChain: [...nameChain, loadBalancerIdentifier],
                    parentResourceType: type
                  }),
                  type: 'application-load-balancer',
                  configParentResourceType: type,
                  customDomains: customDomains?.length ? customDomains : null,
                  cdn: cdn && { listenerPort: 443, originDomainName: customDomains?.[0]?.domainName, ...cdn },
                  alarms: alarms as ApplicationLoadBalancerAlarm[],
                  disabledGlobalAlarms,
                  useFirewall,
                  listeners: [
                    {
                      port: 80,
                      protocol: 'HTTP',
                      defaultAction: {
                        type: 'redirect',
                        properties: { statusCode: 'HTTP_301', protocol: 'HTTPS' }
                      }
                    },
                    {
                      port: 443,
                      protocol: 'HTTPS',
                      customCertificateArns: null
                    }
                  ].concat(
                    needTestListener
                      ? [
                          {
                            port: DEFAULT_TEST_LISTENER_PORT,
                            protocol: 'HTTPS',
                            customCertificateArns: null
                          }
                        ]
                      : []
                  ) as ApplicationLoadBalancerListener[]
                }
              : undefined,
          [networkLoadBalancerIdentifier]:
            loadBalancing?.type === 'network-load-balancer'
              ? {
                  nameChain: [...nameChain, networkLoadBalancerIdentifier],
                  name: getStpNameForResource({
                    nameChain: [...nameChain, networkLoadBalancerIdentifier],
                    parentResourceType: type
                  }),
                  type: 'network-load-balancer',
                  configParentResourceType: type,
                  customDomains: customDomains?.length ? customDomains : null,
                  disabledGlobalAlarms,
                  listeners: loadBalancing.properties?.ports.map((port) => ({
                    port: port.port,
                    protocol: port.protocol || 'TLS',
                    customCertificateArns: null
                  }))
                }
              : undefined
        }
      } as StpWebService;
    });
  }

  get privateServices() {
    return this.getResourcesFromConfig('private-service').map((serviceDefinition) => {
      const containerWorkloadIdentifier: keyof StpPrivateService['_nestedResources'] = 'containerWorkload';
      const loadBalancerIdentifier: keyof StpPrivateService['_nestedResources'] = 'loadBalancer';

      const {
        name,
        packaging,
        resources,
        type,
        connectTo,
        iamRoleStatements,
        environment,
        secrets,
        internalHealthCheck,
        logging,
        scaling,
        stopTimeout,
        loadBalancing,
        port,
        protocol,
        configParentResourceType: _configParentResourceType,
        nameChain,
        enableRemoteSessions,
        volumeMounts,
        sideContainers,
        usePrivateSubnetsWithNAT,
        overrides: _overrides,
        ...restProps
      } = serviceDefinition;
      // props check constant ensures full destructuring of web service props
      // eslint-disable-next-line
      const propsCheck: Record<string, never> = restProps;

      return {
        ...serviceDefinition,
        _nestedResources: {
          containerWorkload: {
            nameChain: [...nameChain, containerWorkloadIdentifier],
            enableRemoteSessions,
            usePrivateSubnetsWithNAT,
            containers: [
              {
                name: getSimpleServiceDefaultContainerName(),
                dependsOn: sideContainers?.length
                  ? sideContainers
                      .filter(
                        (helperContainer) =>
                          !helperContainer.dependsOn?.some(
                            ({ containerName }) => containerName === getSimpleServiceDefaultContainerName()
                          )
                      )
                      .map((helperContainer) => ({
                        containerName: helperContainer.name,
                        condition: helperContainer.containerType === 'run-on-init' ? 'SUCCESS' : 'START'
                      }))
                  : undefined,
                packaging,
                environment: (environment || []).concat(
                  { name: 'PORT', value: port || 3000 },
                  { name: 'HOST', value: '0.0.0.0' }
                ),
                secrets,
                logging,
                internalHealthCheck,
                essential: true,
                volumeMounts,
                stopTimeout,
                events: [
                  loadBalancing?.type === 'application-load-balancer'
                    ? {
                        type: 'application-load-balancer',
                        properties: {
                          priority: 3,
                          containerPort: port || 3000,
                          loadBalancerName: `${[...nameChain, loadBalancerIdentifier].join('.')}`,
                          listenerPort: port || 3000,
                          paths: ['*']
                        }
                      }
                    : {
                        type: 'service-connect',
                        properties: {
                          containerPort: port || 3000,
                          alias: name.toLowerCase(),
                          protocol // : protocol || 'http'
                        }
                      }
                ]
              },
              ...(sideContainers || []).map((sideContainer) => ({
                essential: sideContainer.containerType !== 'run-on-init',
                ...sideContainer
              }))
            ],
            name: getStpNameForResource({
              nameChain: [...nameChain, containerWorkloadIdentifier],
              parentResourceType: type
            }),
            resources,
            type: 'multi-container-workload',
            configParentResourceType: type,
            connectTo,
            iamRoleStatements,
            scaling
          },
          loadBalancer:
            loadBalancing?.type === 'application-load-balancer'
              ? {
                  nameChain: [...nameChain, loadBalancerIdentifier],
                  name: getStpNameForResource({
                    nameChain: [...nameChain, loadBalancerIdentifier],
                    parentResourceType: type
                  }),
                  interface: 'internal',
                  type: 'application-load-balancer',
                  configParentResourceType: type,
                  listeners: [
                    {
                      port: port || 3000,
                      protocol: 'HTTP'
                    }
                  ]
                }
              : undefined
        }
      } as StpPrivateService;
    });
  }

  get workerServices() {
    return this.getResourcesFromConfig('worker-service').map((serviceDefinition) => {
      const containerWorkloadIdentifier: keyof StpWorkerService['_nestedResources'] = 'containerWorkload';

      const {
        name: _n,
        nameChain,
        packaging,
        resources,
        type,
        connectTo,
        iamRoleStatements,
        environment,
        secrets,
        internalHealthCheck,
        logging,
        scaling,
        configParentResourceType: _configParentResourceType,
        stopTimeout,
        enableRemoteSessions,
        volumeMounts,
        sideContainers,
        usePrivateSubnetsWithNAT,
        overrides: _overrides,
        ...restProps
      } = serviceDefinition;
      // props check constant ensures full destructuring of web service props
      // eslint-disable-next-line
      const propsCheck: Record<string, never> = restProps;
      return {
        ...serviceDefinition,
        _nestedResources: {
          containerWorkload: {
            nameChain: [...nameChain, containerWorkloadIdentifier],
            enableRemoteSessions,
            usePrivateSubnetsWithNAT,
            containers: [
              {
                name: getSimpleServiceDefaultContainerName(),
                dependsOn: sideContainers?.length
                  ? sideContainers
                      .filter(
                        (helperContainer) =>
                          !helperContainer.dependsOn?.some(
                            ({ containerName }) => containerName === getSimpleServiceDefaultContainerName()
                          )
                      )
                      .map((helperContainer) => ({
                        containerName: helperContainer.name,
                        condition: helperContainer.containerType === 'run-on-init' ? 'SUCCESS' : 'START'
                      }))
                  : undefined,
                packaging,
                environment,
                secrets,
                logging,
                internalHealthCheck,
                essential: true,
                stopTimeout,
                volumeMounts
              },
              ...(sideContainers || []).map((sideContainer) => ({
                essential: sideContainer.containerType !== 'run-on-init',
                ...sideContainer
              }))
            ],
            name: getStpNameForResource({
              nameChain: [...nameChain, containerWorkloadIdentifier],
              parentResourceType: type
            }),
            resources,
            type: 'multi-container-workload',
            configParentResourceType: type,
            connectTo,
            iamRoleStatements,
            scaling
          }
        }
      } as StpWorkerService;
    });
  }

  get cloudformationResources(): (AnyCloudFormationResource & { name: string })[] {
    return Object.entries(this.config?.cloudformationResources || {}).map(([name, definition]) => {
      return { name, ...definition };
    });
  }

  get hooks() {
    return this.config.hooks || {};
  }

  getRollbackSafetyInfo = () => {
    const UNSAFE_DIRECTIVES = ['File', 'FileRaw', 'CliArgs', 'GitInfo', 'StackOutput', 'Secret', 'SsmParam'];
    // Detect unsafe directives by scanning resolved directive results
    const unsafeDirectives: string[] = [];
    for (const rawDefinition of this.configResolver.resolvedDirectiveDefinitions) {
      for (const unsafeName of UNSAFE_DIRECTIVES) {
        if (rawDefinition.startsWith(`$${unsafeName}(`)) {
          if (!unsafeDirectives.includes(`$${unsafeName}`)) {
            unsafeDirectives.push(`$${unsafeName}`);
          }
        }
      }
    }

    // Detect custom (user-defined) directives
    const hasCustomDirectives = (this.rawConfig?.directives?.length ?? 0) > 0;

    // Detect TypeScript transforms
    const hasTypeScriptTransforms = Object.keys(this.transforms || {}).length > 0 || this.finalTransform !== null;

    // Detect after:deploy hooks
    const hasAfterDeployHooks = (this.config?.hooks?.afterDeploy?.length ?? 0) > 0;

    // Detect bucket-synced content
    const hasBucketSync = this.allBucketsToSync.length > 0;

    return { unsafeDirectives, hasCustomDirectives, hasTypeScriptTransforms, hasAfterDeployHooks, hasBucketSync };
  };

  get scripts() {
    return this.config.scripts || {};
  }

  get stackConfig(): StackConfig {
    return this.config.stackConfig || ({} as StackConfig);
  }

  get reuseVpcConfig() {
    return this.stackConfig?.vpc?.reuseVpc;
  }

  get isIssueDetectionEnabled() {
    return this.issueDetectionPolicy.enabled;
  }

  get issueDetectionPolicy(): {
    enabled: boolean;
    reason: string;
    eventSamplingRate: number;
  } {
    const organization = this.#issueDetection.organization;
    const stage = this.stackContext.stage;
    const eventSamplingRate = Math.min(100, Math.max(1, Number(organization?.issuesEventSamplingRate || 100)));

    if (!organization || !stage) {
      return {
        enabled: false,
        reason: 'disabled because Console issue settings could not be loaded',
        eventSamplingRate
      };
    }

    const enabledStages = organization.issuesEnabledStages || [];
    if (enabledStages.length > 0 && !enabledStages.includes('*') && !enabledStages.includes(stage)) {
      return {
        enabled: false,
        reason: `disabled by Console policy for stage "${stage}"`,
        eventSamplingRate
      };
    }

    if (organization.issuesAllProjectsEnabled) {
      return {
        enabled: true,
        reason: 'enabled by Console policy for all projects',
        eventSamplingRate
      };
    }

    const projectName = this.stackContext.projectName;
    const project = this.#issueDetection.projects?.find((projectData) => projectData.name === projectName);

    if (project?.issuesEnabled) {
      return {
        enabled: true,
        reason: `enabled by Console policy for project "${projectName}"`,
        eventSamplingRate
      };
    }

    return {
      enabled: false,
      reason: 'disabled by Console policy',
      eventSamplingRate
    };
  }

  get guardrails() {
    return this.globalConfigGuardrails || [];
  }

  get deploymentNotifications(): DeploymentNotificationDefinition[] {
    return this.globalConfigDeploymentNotifications || [];
  }

  get outputs(): StackOutput[] {
    return this.stackConfig.outputs || [];
  }

  get isS3TransferAccelerationAvailableInDeploymentRegion(): boolean {
    return isTransferAccelerationEnabledInRegion({
      region: this.stackContext.region
    }); // 'ap-southeast-3']
  }

  get stackInfoDirPath() {
    return this.stackConfig.disableStackInfoSaving
      ? null
      : fsPaths.stackInfoDirectory({
          workingDir: this.stackContext.workingDir,
          directoryName: this.stackConfig.stackInfoDirectory
        });
  }

  get prebuiltImageRepositoryCredentialsSecretArns(): string[] {
    const credentialSecretArns = new Set();
    this.allContainerWorkloads.forEach(({ containers }) => {
      containers.forEach((container) => {
        if (
          container.packaging.type === 'prebuilt-image' &&
          container.packaging.properties.repositoryCredentialsSecretArn
        ) {
          credentialSecretArns.add(container.packaging.properties.repositoryCredentialsSecretArn);
        }
      });
    });
    return Array.from(credentialSecretArns) as string[];
  }

  get allContainerWorkloads() {
    return [
      ...this.containerWorkloads,
      ...this.webServices.map(({ _nestedResources: { containerWorkload } }) => containerWorkload),
      ...this.privateServices.map(({ _nestedResources: { containerWorkload } }) => containerWorkload),
      ...this.workerServices.map(({ _nestedResources: { containerWorkload } }) => containerWorkload)
    ];
  }

  get allApplicationLoadBalancers() {
    return [
      ...this.applicationLoadBalancers,
      ...this.webServices.map(({ _nestedResources: { loadBalancer } }) => loadBalancer).filter(Boolean),
      ...this.privateServices.map(({ _nestedResources: { loadBalancer } }) => loadBalancer).filter(Boolean)
    ];
  }

  get allNetworkLoadBalancers() {
    return [
      ...this.networkLoadBalancers,
      ...this.webServices.map(({ _nestedResources: { networkLoadBalancer } }) => networkLoadBalancer).filter(Boolean)
    ];
  }

  get allHttpApiGateways() {
    return [
      ...this.httpApiGateways,
      ...this.webServices.map(({ _nestedResources: { httpApiGateway } }) => httpApiGateway).filter(Boolean)
    ];
  }

  get allWebsocketApiGateways(): StpWebSocketApiGateway[] {
    return this.websocketApiGateways;
  }

  get allAppsyncApis(): StpAppSyncApi[] {
    return this.appsyncApis;
  }

  get allBuckets() {
    // In dev mode, filter out buckets from hosting-bucket and nextjs-web since they are excluded
    const filteredHostingBuckets = isDevCommand()
      ? this.hostingBuckets.filter((hb) => !isResourceTypeExcludedInDevMode(hb.type))
      : this.hostingBuckets;
    const filteredNextjsWebs = isDevCommand()
      ? this.nextjsWebs.filter((nw) => !isResourceTypeExcludedInDevMode(nw.type))
      : this.nextjsWebs;
    const allSsrWebs = [
      ...this.astroWebs,
      ...this.nuxtWebs,
      ...this.sveltekitWebs,
      ...this.solidstartWebs,
      ...this.tanstackWebs,
      ...this.remixWebs
    ];
    const filteredSsrWebs = isDevCommand()
      ? allSsrWebs.filter((sw) => !isResourceTypeExcludedInDevMode(sw.type))
      : allSsrWebs;
    return [
      ...this.buckets,
      ...filteredHostingBuckets.map(({ _nestedResources: { bucket } }) => bucket),
      ...filteredNextjsWebs.map(({ _nestedResources: { bucket } }) => bucket),
      ...filteredSsrWebs.map(({ _nestedResources: { bucket } }) => bucket)
    ];
  }

  get allContainerWorkloadContainers(): EnrichedCwContainerProps[] {
    return this.allContainerWorkloads
      .map(({ name, configParentResourceType, containers, resources }) => {
        return containers.map((container) => {
          return {
            ...container,
            workloadType: configParentResourceType,
            workloadName: name,
            resources,
            jobName: getJobName({
              workloadName: name,
              workloadType: configParentResourceType,
              containerName: container.name
            })
          };
        });
      })
      .flat();
  }

  get allBatchJobContainers(): EnrichedBjContainerProps[] {
    return this.batchJobs.map(({ name, container, type, resources }) => {
      return {
        ...container,
        workloadType: type,
        workloadName: name,
        resources,
        jobName: getJobName({ workloadName: name, workloadType: 'batch-job' })
      };
    });
  }

  get allContainers() {
    return [...this.allContainerWorkloadContainers, ...this.allBatchJobContainers];
  }

  get allContainersRequiringPackaging() {
    return this.allContainers.filter((job) => job.packaging.type !== 'prebuilt-image');
  }

  get agentCoreRuntimesRequiringPackaging() {
    return this.agentCoreRuntimes.filter((runtime) => runtime.packaging.type !== 'prebuilt-image');
  }

  get helperLambdas(): StpHelperLambdaFunction[] {
    const res = [];
    res.push(this.stacktapeServiceLambdaProps);
    if (this.batchJobs.length) {
      res.push(this.batchJobs[0]._nestedResources.triggerFunction);
    }
    if (this.configContainsCdnDistribution) {
      res.push(this.stacktapeOriginRequestLambdaProps, this.stacktapeOriginResponseLambdaProps);
    }
    return res;
  }

  get allAlarms() {
    return this.allResourcesIncludingNested
      .map((resource: StpAlarmEnabledResource) =>
        getAlarmsToBeAppliedToResource({ resource, globalAlarms: this.globalConfigAlarms })
      )
      .flat();
  }

  get allUsedDomainsInConfig(): string[] {
    const resultDomains: Set<string> = new Set<string>();
    const domainAssociations: {
      [fullDomainName: string]: string[];
    } = {};
    const recordManagedDomain = ({ domain, resourceName }: { domain: DomainConfiguration; resourceName: string }) => {
      domainAssociations[domain.domainName] = (domainAssociations[domain.domainName] || []).concat(resourceName);
      if (domain.disableDnsRecordCreation && domain.customCertificateArn) {
        return;
      }

      resultDomains.add(getApexDomain(domain.domainName));
    };

    // check load balancers and their domains
    this.allApplicationLoadBalancers.forEach(({ name, customDomains }) => {
      customDomains?.forEach((domain) => recordManagedDomain({ domain, resourceName: name }));
    });
    // check load balancers and their domains
    this.allNetworkLoadBalancers.forEach(({ name, customDomains }) => {
      customDomains?.forEach((domain) => recordManagedDomain({ domain, resourceName: name }));
    });
    // check http api gateways
    this.allHttpApiGateways.forEach(({ name, customDomains }) => {
      customDomains?.forEach((domain) => recordManagedDomain({ domain, resourceName: name }));
    });
    this.allWebsocketApiGateways.forEach(({ name, customDomains }) => {
      customDomains?.forEach((domain) => recordManagedDomain({ domain, resourceName: name }));
    });
    this.allAppsyncApis.forEach(({ name, customDomain }) => {
      if (customDomain) {
        recordManagedDomain({ domain: customDomain, resourceName: name });
      }
    });

    // check cdns
    [
      ...this.allBuckets,
      ...this.allApplicationLoadBalancers,
      ...this.allHttpApiGateways,
      ...this.functions,
      ...this.allNextjsLambdaFunctions,
      ...this.allSsrWebLambdaFunctions
    ].forEach(({ name: stpResourceName, cdn }) => {
      cdn?.customDomains?.forEach((domain) => recordManagedDomain({ domain, resourceName: stpResourceName }));
    });

    this.userPools.forEach(({ name, customDomain }) => {
      if (customDomain) {
        recordManagedDomain({ domain: customDomain, resourceName: name });
      }
    });

    Object.entries(domainAssociations).forEach(([fullDomainName, associations]) => {
      if (associations.length > 1) {
        throw configErrors.domainAssociatedWithMultipleResources({ fullDomainName, associations });
      }
    });
    return Array.from(resultDomains);
  }

  get categorizedEmailsUsedInAlertNotifications() {
    const senders = new Set<string>();
    const recipients = new Set<string>();
    this.allAlarms.forEach(({ notificationChannels }) =>
      notificationChannels?.forEach(({ type, properties }) => {
        if (type === 'email') {
          senders.add(properties.sender);
          recipients.add(properties.recipient);
        }
      })
    );
    return { senders, recipients };
  }

  get allEmailsUsedInAlertNotifications() {
    const { senders, recipients } = this.categorizedEmailsUsedInAlertNotifications;
    return Array.from(new Set([...senders, ...recipients]));
  }

  get allCdnAssociations(): {
    [_resourceType in StpCdnAttachableResourceType]: {
      [stpResourceNameOfTargetedResource: string]: {
        cdnAttachedResource: StpCdnCompatibleResource;
        customForwardingOptions?: CdnForwardingOptions;
      }[];
    };
  } {
    const cdnAssociations: {
      [_resourceType in StpCdnAttachableResourceType]: {
        [stpResourceNameOfTargetedResource: string]: {
          cdnAttachedResource: StpCdnCompatibleResource;
          customForwardingOptions?: CdnForwardingOptions;
        }[];
      };
    } = {
      bucket: {},
      'application-load-balancer': {},
      'http-api-gateway': {},
      function: {}
    };
    // going through buckets and checking for associated cdns
    [
      ...this.allBuckets,
      ...this.allApplicationLoadBalancers,
      ...this.allHttpApiGateways,
      ...this.functions,
      ...this.allNextjsLambdaFunctions,
      ...this.allSsrWebLambdaFunctions
    ].forEach((resource) => {
      if (resource.cdn?.enabled) {
        cdnAssociations[resource.type][resource.name] = (cdnAssociations[resource.type][resource.name] || []).concat({
          cdnAttachedResource: resource,
          customForwardingOptions: resource.cdn?.forwardingOptions
        });
        resource.cdn.routeRewrites?.forEach((routeRewrite) => {
          const routingToAnotherResource = routeRewrite.routeTo && routeRewrite.routeTo.type !== 'custom-origin';
          const stpResourceName =
            routingToAnotherResource &&
            this.findResourceInConfig({
              nameChain:
                (routeRewrite.routeTo as CdnBucketRoute).properties.bucketName ||
                (routeRewrite.routeTo as CdnHttpApiGatewayRoute).properties.httpApiGatewayName ||
                (routeRewrite.routeTo as CdnLambdaFunctionRoute).properties.functionName ||
                (routeRewrite.routeTo as CdnLoadBalancerRoute).properties.loadBalancerName
            }).resource?.name;
          if (routingToAnotherResource) {
            cdnAssociations[routeRewrite.routeTo.type][stpResourceName] = (
              cdnAssociations[routeRewrite.routeTo.type][stpResourceName] || []
            ).concat({ cdnAttachedResource: resource, customForwardingOptions: routeRewrite.forwardingOptions });
          }
        });
      }
    });

    return cdnAssociations;
  }

  get simplifiedCdnAssociations(): {
    [_resourceType in StpCdnAttachableResourceType]: {
      [stpResourceNameOfTargetedResource: string]: string[];
    };
  } {
    const result: {
      [_resourceType in StpCdnAttachableResourceType]: {
        [stpResourceNameOfTargetedResource: string]: string[];
      };
    } = {
      bucket: {},
      'application-load-balancer': {},
      'http-api-gateway': {},
      function: {}
    };

    Object.keys(this.allCdnAssociations).forEach((resourceGroup) => {
      Object.keys(this.allCdnAssociations[resourceGroup]).forEach((resourceName) => {
        result[resourceGroup][resourceName] = Array.from(
          new Set(
            this.allCdnAssociations[resourceGroup][resourceName].map(
              ({
                cdnAttachedResource: { name }
              }: {
                cdnAttachedResource: StpCdnCompatibleResource;
                customForwardingOptions?: CdnForwardingOptions;
              }) => name
            )
          )
        );
      });
    });

    return result;
  }

  get allResourcesWithCdnsToInvalidate() {
    return [
      ...this.allBuckets,
      ...this.allApplicationLoadBalancers,
      ...this.allHttpApiGateways,
      ...this.functions,
      ...this.allNextjsLambdaFunctions,
      ...this.allSsrWebLambdaFunctions
    ].filter((resource): resource is ResourceWithEnabledCdn => {
      const { cdn } = resource;
      return Boolean(cdn?.enabled && !cdn?.disableInvalidationAfterDeploy);
    });
  }

  // returns array of stacktapeLogicalNames of buckets
  get allBucketsUsingCustomMetadataHeaders() {
    return this.allBuckets
      .filter(({ directoryUpload }) =>
        directoryUpload?.fileOptions?.some(({ headers }) => headers.some(({ key }) => !isS3NativeUploadHeader(key)))
      )
      .map(({ name }) => name);
  }

  get allImagesCount(): number {
    return this.allContainersRequiringPackaging.length + this.agentCoreRuntimesRequiringPackaging.length;
  }

  get allLambdaResourcesCount(): number {
    return this.allLambdasTriggerableUsingEvents.length;
  }

  get allSecretNamesUsedInAlarmNotifications() {
    const secretNames: string[] = [];
    processAllNodesSync(this.allAlarms, (node) => {
      if (typeof node === 'string') {
        // if secret is referenced using $Secret directive
        if (getIsDirective(node) && node.startsWith('$Secret')) {
          const [secretName] = getDirectiveParams('Secret', node)[0].value.split('.') as string[];
          secretNames.push(secretName);
          return;
        }
        // secret referenced using dynamic reference
        if (node.startsWith('{{resolve:secretsmanager')) {
          const [, , secretName] = node.split(':');
          secretNames.push(secretName);
        }
      }
    });
    return Array.from(new Set(secretNames));
  }

  get allSecretReferencesUsedInConfig() {
    const secretRefs = new Map<string, Set<string>>();
    const visit = (node: unknown) => {
      if (typeof node === 'string' && getIsDirective(node) && node.startsWith('$Secret')) {
        const fullRef = getDirectiveParams('Secret', node)[0].value as string;
        const [secretName, jsonKey] = fullRef.split('.');
        if (!secretRefs.has(secretName)) {
          secretRefs.set(secretName, new Set());
        }
        if (jsonKey) {
          secretRefs.get(secretName).add(jsonKey);
        }
      }
    };
    processAllNodesSync(this.config, visit);
    // Also scan synthesized nested resources (e.g., the env vars + DB credentials a
    // `convex` resource expands into during preprocessing) so secret-preflight can
    // auto-create those secrets.
    processAllNodesSync(this.convexes, visit);
    for (const convex of this.convexes) {
      const secretName = getConvexSecretName({
        nameChain: convex.nameChain,
        region: this.stackContext.region,
        stackName: this.stackContext.stackName
      });
      if (!secretRefs.has(secretName)) {
        secretRefs.set(secretName, new Set());
      }
      secretRefs.get(secretName).add('instanceSecret');
      secretRefs.get(secretName).add('dbPassword');
    }
    return secretRefs;
  }

  get autoGenerableSecretNames(): Set<string> {
    const names = new Set<string>();
    const extractSecretName = (value: unknown): string | null => {
      if (typeof value === 'string' && getIsDirective(value) && value.startsWith('$Secret')) {
        const fullRef = getDirectiveParams('Secret', value)[0].value as string;
        return fullRef.split('.')[0];
      }
      return null;
    };
    for (const db of this.databases) {
      const name = extractSecretName(db.credentials?.masterUserPassword);
      if (name) names.add(name);
    }
    for (const redis of this.redisClusters) {
      const name = extractSecretName(redis.defaultUserPassword);
      if (name) names.add(name);
    }
    for (const mongo of this.atlasMongoClusters) {
      const name = extractSecretName(mongo.adminUserCredentials?.password);
      if (name) names.add(name);
    }
    // Convex auto-generates secrets for its synthesized backing Postgres (`dbPassword`)
    // and for its `INSTANCE_SECRET` boot token.
    for (const convex of this.convexes) {
      const dbName = extractSecretName(convex._nestedResources.database?.credentials?.masterUserPassword);
      if (dbName) names.add(dbName);
      // INSTANCE_SECRET is referenced from the backend container env, which is keyed
      // by the same secret name. Adding it explicitly is harmless (Set dedups).
      names.add(
        getConvexSecretName({
          nameChain: convex.nameChain,
          region: this.stackContext.region,
          stackName: this.stackContext.stackName
        })
      );
    }
    return names;
  }

  get allSsmParamReferencesUsedInConfig() {
    const paramNames = new Set<string>();
    processAllNodesSync(this.config, (node) => {
      if (typeof node === 'string' && getIsDirective(node) && node.startsWith('$SsmParam')) {
        const paramName = getDirectiveParams('SsmParam', node)[0].value as string;
        paramNames.add(paramName);
      }
    });
    return paramNames;
  }

  get allParameterNamesUsedInAlarmNotifications() {
    const paramNames: string[] = [];
    processAllNodesSync(this.allAlarms, (node) => {
      if (typeof node === 'string') {
        // $SsmParam directive
        if (getIsDirective(node) && node.startsWith('$SsmParam')) {
          const paramName = getDirectiveParams('SsmParam', node)[0].value as string;
          paramNames.push(paramName);
          return;
        }
        // SSM dynamic reference
        if (node.startsWith('{{resolve:ssm-secure') || node.startsWith('{{resolve:ssm')) {
          const [, , paramName] = node.split(':');
          paramNames.push(paramName);
        }
      }
    });
    return paramNames;
  }

  get cfLogicalNamesToBeProtected() {
    return [
      ...this.databases
        .filter(({ deletionProtection }) => deletionProtection)
        .map(({ name, engine }) => {
          if (isAuroraEngine(engine.type)) {
            return cfLogicalNames.auroraDbCluster(name);
          }
          return cfLogicalNames.dbInstance(name);
        }),
      ...this.dsqlDatabases
        .filter(({ deletionProtection }) => deletionProtection)
        .map(({ name }) => cfLogicalNames.dsqlCluster(name))
    ];
  }

  get allConfigResources(): StpResource[] {
    return [
      ...this.functions,
      ...this.containerWorkloads,
      ...this.batchJobs,
      ...this.buckets,
      ...this.databases,
      ...this.applicationLoadBalancers,
      ...this.networkLoadBalancers,
      ...this.httpApiGateways,
      ...this.websocketApiGateways,
      ...this.appsyncApis,
      ...this.eventBuses,
      ...this.bastions,
      ...this.stateMachines,
      ...this.customResourceDefinitions,
      ...this.customResourceInstances,
      ...this.atlasMongoClusters,
      ...this.dynamoDbTables,
      ...this.redisClusters,
      ...this.userPools,
      ...this.deploymentScripts,
      ...this.upstashRedisDatabases,
      ...this.edgeLambdaFunctions,
      ...this.webServices,
      ...this.privateServices,
      ...this.workerServices,
      ...this.awsCdkConstructs,
      ...this.sqsQueues,
      ...this.snsTopics,
      ...this.kinesisStreams,
      ...this.kafkaClusters,
      ...this.dsqlDatabases,
      ...this.emailSenders,
      ...this.hostingBuckets,
      ...this.webAppFirewalls,
      ...this.nextjsWebs,
      ...this.astroWebs,
      ...this.nuxtWebs,
      ...this.sveltekitWebs,
      ...this.solidstartWebs,
      ...this.tanstackWebs,
      ...this.remixWebs,
      ...this.openSearchDomains,
      ...this.efsFilesystems,
      ...this.convexes,
      ...this.agentCoreRuntimes,
      ...this.agentCoreMemories,
      ...this.agentCoreGateways,
      ...this.agentCoreBrowsers,
      ...this.agentCoreCodeInterpreters
    ];
  }

  get allResourcesIncludingNested(): StpResource[] {
    const unwrapResource = (resource: StpResource): StpResource[] => {
      const nestedResources = Object.values(resource._nestedResources || {}).filter(Boolean);
      return nestedResources.length ? [resource, ...nestedResources.map(unwrapResource).flat()] : [resource];
    };
    const seenNameChains = new Set<string>();
    return this.allConfigResources.flatMap(unwrapResource).filter(({ nameChain }) => {
      const serializedNameChain = JSON.stringify(nameChain);
      if (seenNameChains.has(serializedNameChain)) {
        return false;
      }
      seenNameChains.add(serializedNameChain);
      return true;
    });
  }

  get allResourcesRequiringVpc() {
    return [
      ...this.allContainerWorkloads,
      ...this.batchJobs,
      ...this.allApplicationLoadBalancers,
      ...this.atlasMongoClusters,
      ...this.databases,
      ...this.redisClusters,
      ...this.openSearchDomains,
      ...this.bastions,
      ...this.efsFilesystems,
      ...this.kafkaClusters,
      ...[...this.allUserCodeLambdas, ...this.allNextjsLambdaFunctions].filter(
        ({ joinDefaultVpc }: StpLambdaFunction) => joinDefaultVpc
      )
    ];
  }

  get allResourcesRequiringPrivateSubnets() {
    return this.allContainerWorkloads.filter(({ usePrivateSubnetsWithNAT }) => usePrivateSubnetsWithNAT);
  }

  get httpApiGatewayContainerWorkloadsAssociations() {
    const result: { [stpHttpApiGatewayName: string]: ContainerWorkloadHttpApiIntegrationProps[] } = {};
    this.allContainerWorkloads
      .map(({ containers }) =>
        containers.map(({ events }) => (events || []).filter(({ type }) => type === 'http-api-gateway'))
      )
      .flat(2)
      .forEach((httpApiIntegration: ContainerWorkloadHttpApiIntegration) => {
        const stpHttpApiGatewayName = this.findResourceInConfig({
          nameChain: httpApiIntegration.properties.httpApiGatewayName
        })?.resource?.name;
        result[stpHttpApiGatewayName] = (result[stpHttpApiGatewayName] || []).concat(httpApiIntegration.properties);
      });

    return result;
  }

  get serviceConnectContainerWorkloadsAssociations() {
    const result: { [workloadName: string]: ContainerWorkloadServiceConnectIntegrationProps[] } = {};

    this.allContainerWorkloads
      .map(({ containers, name }) =>
        containers.map(({ events }) =>
          (events || [])
            .filter(({ type }) => type === 'service-connect')
            .map((event) => ({ ...event, workloadName: name }))
        )
      )
      .flat(2)
      .forEach((serviceConnectIntegration: ContainerWorkloadServiceConnectIntegration & { workloadName: string }) => {
        result[serviceConnectIntegration.workloadName] = (result[serviceConnectIntegration.workloadName] || []).concat(
          serviceConnectIntegration.properties
        );
      });

    return result;
  }

  get stacktapeServiceLambdaProps(): StpHelperLambdaFunction {
    const artifactName = 'stacktapeServiceLambda';
    const helperLambdaData = this.helperLambdaDetails[artifactName];
    return {
      name: artifactName,
      packaging: { type: 'helper-lambda', properties: helperLambdaData },
      type: 'function',
      artifactName,
      resourceName: awsResourceNames.stpServiceLambda(this.stackContext.stackName),
      cfLogicalName: cfLogicalNames.lambda(artifactName, true),
      timeout: 900,
      memory: 2048,
      runtime: 'nodejs22.x' as const,
      events: [],
      handler: helperLambdaData.handler,
      artifactPath: helperLambdaData.artifactPath,
      configParentResourceType: 'custom-resource-definition',
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL, artifactName],
      environment: getStacktapeServiceLambdaEnvironment({
        projectName: this.stackContext.projectName,
        globallyUniqueStackHash: this.globallyUniqueStackHash,
        stackName: this.stackContext.stackName,
        stage: this.stackContext.stage,
        issueEventSamplingRate: this.issueDetectionPolicy.eventSamplingRate
      }),
      iamRoleStatements: [
        ...getStacktapeServiceLambdaCustomResourceInducedStatements({
          activeConfig: this,
          stackContext: this.stackContext
        }),
        ...getStacktapeServiceLambdaAlarmNotificationInducedStatements({ activeConfig: this }),
        ...getStacktapeServiceLambdaEcsRedeployInducedStatements({
          activeConfig: this,
          stackName: this.stackContext.stackName
        }),
        ...getStacktapeServiceLambdaCustomTaggingInducedStatement(),
        ...getStacktapeServiceLambdaIssueDetectionStatements({
          issueDetectionEnabled: this.isIssueDetectionEnabled
        }),
        ...getStacktapeServiceLambdaUptimeMonitoringStatements({
          uptimeMonitoringEnabled: this.uptimeChecks.length > 0,
          accountId: this.stackContext.accountId,
          deploymentBucketName: awsResourceNames.deploymentBucket(this.globallyUniqueStackHash)
        }),
        ...getStacktapeServiceLambdaTracingStatements({
          // Dev stacks skip both the instrumentation and the Transaction Search custom resource, so
          // the service lambda must not carry the unused account-level permissions there either.
          tracingEnabled: this.instrumentedLambdaFunctions.length > 0 && !isDevCommand(),
          region: this.stackContext.region
        })
      ]
    };
  }

  get stacktapeOriginRequestLambdaProps(): StpHelperEdgeLambdaFunction {
    const artifactName = 'cdnOriginRequestLambda';
    const helperLambdaData = this.helperLambdaDetails[artifactName];
    const lambdaResourceName = helperLambdaAwsResourceNames.originRequestEdgeLambda(
      this.stackContext.stackName,
      this.stackContext.region
    );
    return {
      name: artifactName,
      packaging: { type: 'helper-lambda', properties: helperLambdaData },
      artifactName,
      resourceName: lambdaResourceName,
      handler: helperLambdaData.handler,
      artifactPath: helperLambdaData.artifactPath,
      type: 'edge-lambda-function',
      timeout: 10,
      runtime: 'nodejs22.x' as const,
      memory: 256,
      configParentResourceType: 'edge-lambda-function',
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL, artifactName],
      iamRoleStatements: [
        ...getLogGroupPolicyDocumentStatements(
          getLambdaLogResourceArnsForPermissions({
            lambdaResourceName,
            edgeLambda: true
          }),
          false
        ),
        ...(Object.keys(this.simplifiedCdnAssociations.bucket).length
          ? [
              getStacktapeOriginRequestLambdaIamStatement({
                ...this.simplifiedCdnAssociations.bucket
              })
            ]
          : [])
      ],
      logging: {
        retentionDays: 3
      }
    };
  }

  get stacktapeOriginResponseLambdaProps(): StpHelperEdgeLambdaFunction {
    const artifactName = 'cdnOriginResponseLambda';
    const helperLambdaData = this.helperLambdaDetails[artifactName];
    const lambdaResourceName = helperLambdaAwsResourceNames.originResponseEdgeLambda(
      this.stackContext.stackName,
      this.stackContext.region
    );
    return {
      name: artifactName,
      packaging: { type: 'helper-lambda', properties: helperLambdaData },
      resourceName: lambdaResourceName,
      handler: helperLambdaData.handler,
      artifactPath: helperLambdaData.artifactPath,
      artifactName,
      type: 'edge-lambda-function',
      configParentResourceType: 'edge-lambda-function',
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL, artifactName],
      timeout: 10,
      runtime: 'nodejs22.x' as const,
      memory: 256,
      iamRoleStatements: getLogGroupPolicyDocumentStatements(
        getLambdaLogResourceArnsForPermissions({
          lambdaResourceName,
          edgeLambda: true
        }),
        false
      ),
      logging: {
        retentionDays: 3
      }
    };
  }

  get sharedGlobalNestedResources() {
    return {
      stacktapeServiceLambda: this.stacktapeServiceLambdaProps,
      cdnOriginRequestLambda: this.configContainsCdnDistribution ? this.stacktapeOriginRequestLambdaProps : undefined,
      cdnOriginResponseLambda: this.configContainsCdnDistribution ? this.stacktapeOriginResponseLambdaProps : undefined
    };
  }

  get allAuroraDatabases() {
    return this.databases.filter(({ engine }) => isAuroraEngine(engine.type));
  }

  get allDatabasesWithInstancies() {
    return this.databases.filter(
      ({ engine }) => engine.type !== 'aurora-mysql-serverless' && engine.type !== 'aurora-postgresql-serverless'
    );
  }

  get requiredCloudformationPrivateTypes(): StpCfInfrastructureModuleType[] {
    const res: StpCfInfrastructureModuleType[] = [];
    if (this.atlasMongoClusters.length) {
      res.push('atlasMongo');
    }
    if (this.upstashRedisDatabases.length) {
      res.push('upstashRedis');
    }
    if (this.allContainerWorkloads.some((cw) => cw.deployment)) {
      res.push('ecsBlueGreen');
    }
    return res;
  }

  get configContainsCdnDistribution(): boolean {
    return [...this.allBuckets, ...this.allHttpApiGateways, ...this.allApplicationLoadBalancers].some(
      (resource) => resource.cdn?.enabled
    );
  }

  get allVpcPeeringConnections() {
    return [].concat(
      this.atlasMongoClusters.length
        ? {
            vpcPeeringConnectionId: getAtt(
              cfLogicalNames.atlasMongoProjectVpcNetworkPeering(),
              'ConnectionId'
            ) as unknown as string
          }
        : []
    );
  }

  get allS3Events() {
    return [...this.functions, ...this.batchJobs.map(({ _nestedResources: { triggerFunction } }) => triggerFunction)]
      .map((lambdaResource) =>
        (lambdaResource.events || [])
          .filter((event: S3Integration) => event.type === 's3')
          .map((event: S3Integration) => {
            return {
              lambdaArn: lambdaResource.aliasLogicalName
                ? ref(lambdaResource.aliasLogicalName)
                : getAtt(lambdaResource.cfLogicalName, 'Arn'),
              workloadName: lambdaResource.name,
              eventConf: event.properties
            };
          })
      )
      .flat();
  }

  get defaultDomainsAreRequired() {
    return (
      this.allApplicationLoadBalancers.some(({ listeners, customDomains, cdn }) => {
        // note: alb with NO specified listeners will automatically get HTTPS listener (without custom cert)
        const hasHttpsListenersWithoutCustomCerts =
          !listeners ||
          listeners.some(
            ({ protocol, customCertificateArns }) => protocol === 'HTTPS' && !customCertificateArns?.length
          );
        const loadBalancerNeedsDefaultDomain = hasHttpsListenersWithoutCustomCerts && !customDomains?.length;
        const cdnNeedsDefaultDomain = cdn?.enabled && !cdn?.customDomains?.length;
        return loadBalancerNeedsDefaultDomain || cdnNeedsDefaultDomain;
      }) ||
      this.allNetworkLoadBalancers.some(({ customDomains, listeners }) => {
        const hasTlsListenersWithoutCustomCerts = listeners.some(
          ({ protocol, customCertificateArns }) => protocol === 'TLS' && !customCertificateArns?.length
        );
        const loadBalancerNeedsDefaultDomain = hasTlsListenersWithoutCustomCerts && !customDomains?.length;
        return loadBalancerNeedsDefaultDomain;
      }) ||
      this.allHttpApiGateways.some(({ customDomains, cdn }) => {
        const httpApiGatewayNeedDefaultDomain = !customDomains?.length;
        const cdnNeedsDefaultDomain = cdn?.enabled && !cdn?.customDomains?.length;
        return httpApiGatewayNeedDefaultDomain || cdnNeedsDefaultDomain;
      }) ||
      [...this.allBuckets, ...this.functions, ...this.allNextjsLambdaFunctions, ...this.allSsrWebLambdaFunctions].some(
        ({ cdn }) => {
          const cdnNeedsDefaultDomain = cdn?.enabled && !cdn?.customDomains?.length;
          return cdnNeedsDefaultDomain;
        }
      )
    );
  }

  get allNextjsLambdaFunctions() {
    return this.nextjsWebs
      .map(({ _nestedResources }) =>
        Object.values(_nestedResources)
          .filter(Boolean)
          .filter(({ type }) => type === 'function' || type === 'edge-lambda-function')
      )
      .flat() as StpLambdaFunction[];
  }

  get allSsrWebLambdaFunctions() {
    return [
      ...this.astroWebs,
      ...this.nuxtWebs,
      ...this.sveltekitWebs,
      ...this.solidstartWebs,
      ...this.tanstackWebs,
      ...this.remixWebs
    ]
      .map(({ _nestedResources }) =>
        Object.values(_nestedResources)
          .filter(Boolean)
          .filter(({ type }) => type === 'function')
      )
      .flat() as StpLambdaFunction[];
  }

  // @note lambdas with a handler function written by user
  get allUserCodeLambdas() {
    return [
      ...this.functions,
      ...this.deploymentScripts.map(({ _nestedResources: { scriptFunction } }) => scriptFunction),
      ...this.customResourceDefinitions.map(({ _nestedResources: { backingFunction } }) => backingFunction),
      ...this.edgeLambdaFunctions
    ];
  }

  get allLambdasToUpload() {
    return [
      ...this.allUserCodeLambdas,
      ...this.allNextjsLambdaFunctions,
      ...this.allSsrWebLambdaFunctions,
      ...this.helperLambdas
    ];
  }

  /**
   * The prober is not a stack function — the uptimeMonitoring custom resource creates it imperatively
   * in each probe region — but its artifact still ships through the deployment bucket like any helper
   * lambda, so the custom resource can copy it into the regional staging buckets.
   */
  get uptimeProberUploadArtifacts() {
    if (!this.uptimeChecks.length) {
      return [];
    }
    const artifactName = 'uptimeProber';
    return [
      {
        artifactName,
        packaging: { type: 'helper-lambda' as const, properties: this.helperLambdaDetails[artifactName] }
      }
    ];
  }

  get allLambdasEligibleForHotswap() {
    return [
      ...this.functions,
      ...this.deploymentScripts.map(({ _nestedResources: { scriptFunction } }) => scriptFunction),
      ...this.customResourceDefinitions.map(({ _nestedResources: { backingFunction } }) => backingFunction),
      ...this.allNextjsLambdaFunctions.filter(({ type }) => type === 'function'),
      ...this.allSsrWebLambdaFunctions
    ];
  }

  get allBucketsToSync() {
    return this.allBuckets
      .filter((bucket) => bucket.directoryUpload)
      .map(({ name, directoryUpload }) => ({
        bucketName: awsResourceNames.bucket(name, this.stackContext.stackName, this.globallyUniqueStackHash),
        uploadConfiguration: {
          ...directoryUpload,
          directoryPath: isAbsolute(directoryUpload.directoryPath)
            ? directoryUpload.directoryPath
            : join(this.stackContext.workingDir, directoryUpload.directoryPath)
        },
        deleteRemoved: true,
        stpConfigBucketName: name
      }));
  }

  // @note all lambdas that need it's own cloudformation resource
  // these lambdas are created as a part of cloudformation template
  get allLambdasTriggerableUsingEvents() {
    return [
      ...this.functions,
      ...this.batchJobs.map(({ _nestedResources: { triggerFunction } }) => triggerFunction),
      this.stacktapeServiceLambdaProps
    ];
  }

  // @note all lambdas that are used as a hook within {workloadConfig}.deployment section
  get allLambdasUsedInDeploymentHooks() {
    const functionNames = new Set<string>();
    [...this.functions, ...this.allContainerWorkloads].forEach(({ deployment }) => {
      if (deployment?.beforeAllowTrafficFunction) {
        functionNames.add(deployment.beforeAllowTrafficFunction);
      }
      if (deployment?.afterTrafficShiftFunction) {
        functionNames.add(deployment.afterTrafficShiftFunction);
      }
    });
    return this.functions.filter(({ name }) => functionNames.has(name));
  }

  get allWorkloadsUsingCustomDeployment() {
    return [...this.functions, ...this.allContainerWorkloads].filter(({ deployment }) => deployment);
  }

  get allUsedEc2InstanceTypes() {
    return this.allContainerWorkloads.map(({ resources }) => resources.instanceTypes || []).flat();
  }

  get allUsedOpenSearchVersionsAndInstanceTypes() {
    const result: { version: string; instanceType: string }[] = [];
    this.openSearchDomains.forEach((resource) => {
      if (!resource.clusterConfig) {
        result.push({ version: resource.version || '2.17', instanceType: 'm4.large.search' });
        return;
      }
      if (resource.clusterConfig?.instanceType) {
        result.push({
          version: resource.version || '2.17',
          instanceType: resource.clusterConfig.instanceType
        });
      }
      if (resource.clusterConfig?.dedicatedMasterType) {
        result.push({
          version: resource.version || '2.17',
          instanceType: resource.clusterConfig.dedicatedMasterType
        });
      }
      if (resource.clusterConfig?.warmType) {
        result.push({
          version: resource.version || '2.17',
          instanceType: resource.clusterConfig.warmType
        });
      }
    });
    return result;
  }

  get isServiceDiscoveryPrivateNamespaceRequired() {
    return (
      Object.keys(this.httpApiGatewayContainerWorkloadsAssociations).length ||
      Object.keys(this.serviceConnectContainerWorkloadsAssociations).length
    );
  }

  get isVpcGatewayEndpointRequired() {
    const s3EndpointRequired = this.allLambdasToUpload.some(({ joinDefaultVpc, connectTo }: StpLambdaFunction) => {
      if (!joinDefaultVpc || !connectTo?.length) {
        return false;
      }
      return connectTo.some(
        (referencedResource) =>
          this.findResourceInConfig({ nameChain: referencedResource })?.resource?.type === 'bucket'
      );
    });
    const dynamoDbEndpointRequired = this.allLambdasToUpload.some(
      ({ joinDefaultVpc, connectTo }: StpLambdaFunction) => {
        if (!joinDefaultVpc || !connectTo?.length) {
          return false;
        }
        return connectTo.some(
          (referencedResource) =>
            this.findResourceInConfig({ nameChain: referencedResource })?.resource?.type === 'dynamo-db-table'
        );
      }
    );
    return {
      s3EndpointRequired,
      dynamoDbEndpointRequired
    };
  }

  get networkLoadBalancers() {
    return this.getResourcesFromConfig('network-load-balancer').map((resource) => ({
      ...resource,
      customDomains: normalizeCustomDomains({
        customDomains: resource.customDomains as (string | DomainConfiguration)[] | null | undefined
      })
    }));
  }
}

export const configManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new ConfigManager());
