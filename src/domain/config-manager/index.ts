import type { CfResourceTransform, FinalTransform } from './transforms-resolver';
import { isAbsolute, join } from 'node:path';
import { eventManager } from '@application-services/event-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { GetAtt, Ref } from '@cloudform/functions';
import {
  getLambdaLogResourceArnsForPermissions,
  getLogGroupPolicyDocumentStatements
} from '@domain-services/calculated-stack-overview-manager/resource-resolvers/_utils/role-helpers';
import { stpErrors } from '@errors';
import { isTransferAccelerationEnabledInRegion } from '@shared/aws/buckets';
import { isBucketNativelySupportedHeader } from '@shared/aws/sdk-manager/utils';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { fsPaths } from '@shared/naming/fs-paths';
import { helperLambdaAwsResourceNames } from '@shared/naming/helper-lambdas-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { getJobName, getSimpleServiceDefaultContainerName, getStpNameForResource } from '@shared/naming/utils';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { getGloballyUniqueStackHash } from '@shared/utils/hashing';
import { processAllNodesSync, traverseToMaximalExtent } from '@shared/utils/misc';
import { isAuroraEngine } from '@shared/utils/rds-engines';
import compose from '@utils/basic-compose-shim';
import { cancelablePublicMethods, skipInitIfInitialized } from '@utils/decorators';
import { getDirectiveParams, getIsDirective } from '@utils/directives';
import { getApexDomain } from '@utils/domains';
import { getConfigPath } from '@utils/file-loaders';
import { builtInDirectives } from './built-in-directives';
import { ConfigResolver } from './config-resolver';
import { TransformsResolver } from './transforms-resolver';
import { getAlarmsToBeAppliedToResource, isGlobalAlarmEligibleForStack } from './utils/alarms';
import { DEFAULT_TEST_LISTENER_PORT } from './utils/application-load-balancers';
import { getStacktapeOriginRequestLambdaIamStatement } from './utils/iam';
import {
  getBatchJobTriggerLambdaAccessControl,
  getBatchJobTriggerLambdaEnvironment,
  getLambdaHandler,
  getStacktapeServiceLambdaAlarmNotificationInducedStatements,
  getStacktapeServiceLambdaCustomResourceInducedStatements,
  getStacktapeServiceLambdaCustomTaggingInducedStatement,
  getStacktapeServiceLambdaEcsRedeployInducedStatements,
  getStacktapeServiceLambdaEnvironment
} from './utils/lambdas';
import { cleanConfigForMinimalTemplateCompilerMode, mergeStacktapeDefaults } from './utils/misc';
import { runInitialValidations, validateConfigStructure } from './utils/validation';
import { isDevCommand, isResourceTypeExcludedInDevMode } from '../../commands/dev/dev-mode-utils';

export class ConfigManager {
  config: StacktapeConfig;
  rawConfig: StacktapeConfig;
  name = this.constructor.name;
  configResolver = new ConfigResolver();
  transformsResolver = new TransformsResolver();
  globalConfigGuardrails: GuardrailDefinition[] = [];
  globalConfigDeploymentNotifications: DeploymentNotificationDefinition[] = [];
  globalConfigAlarms: AlarmDefinition[] = [];
  transforms: { [logicalName: string]: CfResourceTransform } = {};
  finalTransform: FinalTransform | null = null;

  /**
   * Loads only the raw config (without directives resolution or validation).
   * Used to extract serviceName before full initialization.
   */
  loadRawConfigOnly = async () => {
    const detectedConfigPath = getConfigPath();
    if (detectedConfigPath) {
      globalStateManager.setConfigPath(detectedConfigPath);
    }
    if (globalStateManager.configPath) {
      await this.configResolver.loadRawConfig();
    }
  };

  init = async ({ configRequired = true }: { configRequired: boolean }) => {
    const { templateId } = globalStateManager.args;
    await eventManager.startEvent({
      eventType: 'LOAD_CONFIG_FILE',
      description: 'Loading configuration',
      phase: 'INITIALIZE'
    });
    let detectedConfigPath: string;

    if (!templateId && !globalStateManager.presetConfig) {
      detectedConfigPath = getConfigPath();
      if (!detectedConfigPath && configRequired) {
        throw stpErrors.e16(null);
      }
      globalStateManager.setConfigPath(detectedConfigPath);
    }

    const shouldLoadConfig = configRequired || detectedConfigPath || templateId;
    this.configResolver.registerBuiltInDirectives();
    if (shouldLoadConfig) {
      // Only load transforms for TypeScript configs with defineConfig pattern
      if (this.transformsResolver.isDefineConfigStyle(globalStateManager.configPath)) {
        const { transforms, finalTransform } = await this.transformsResolver.loadTransforms(
          globalStateManager.configPath
        );
        this.transforms = transforms;
        this.finalTransform = finalTransform;
      }
      // Skip loadRawConfig if already loaded by loadRawConfigOnly
      if (!this.configResolver.rawConfig) {
        await this.configResolver.loadRawConfig();
      }
      this.configResolver.registerUserDirectives(this.configResolver.rawConfig?.directives || []);
      await this.configResolver.loadResolvedConfig();
      if (globalStateManager.invokedFrom !== 'server') {
        this.config = this.configResolver.resolvedConfig;
      } else {
        this.config = cleanConfigForMinimalTemplateCompilerMode(this.configResolver.resolvedConfig);
      }
      this.rawConfig = this.configResolver.rawConfig;
      await validateConfigStructure({ config: this.config, configPath: globalStateManager.configPath, templateId });
      if (globalStateManager.invokedFrom !== 'server') {
        runInitialValidations();
      }
    }

    await eventManager.finishEvent({
      eventType: 'LOAD_CONFIG_FILE',
      data: { stackName: globalStateManager.targetStack.stackName, config: this.config },
      phase: 'INITIALIZE'
    });
  };

  reset = () => {
    this.configResolver.reset();
    this.config = null;
    this.rawConfig = null;
    this.globalConfigGuardrails = [];
    this.globalConfigDeploymentNotifications = [];
    this.globalConfigAlarms = [];
  };

  loadGlobalConfig = async () => {
    const globalConfig = await stacktapeTrpcApiManager.apiClient.globalConfig();
    this.globalConfigAlarms = ((globalConfig.alarms as AlarmDefinition[]) || []).filter((alarm) =>
      isGlobalAlarmEligibleForStack({
        alarm,
        projectName: globalStateManager.targetStack.projectName,
        stage: globalStateManager.targetStack.stage
      })
    );
    this.globalConfigDeploymentNotifications = (globalConfig.deploymentNotifications ||
      []) as DeploymentNotificationDefinition[];
    this.globalConfigGuardrails = (globalConfig.guardrails || []) as GuardrailDefinition[];
    // this.alarms = this.alarms.concat(getGlobalConfigDefinedAlarms({ globalConfigAlarms: this.globalConfigAlarms }));
  };

  resolveDirectives = async <T>(params: {
    itemToResolve: any;
    resolveRuntime: boolean;
    useLocalResolve?: boolean;
  }): Promise<T> => {
    // we are doubling resolving
    // this is due to fact that $ResourceParam directive can output $Secret directive which is somehow then not resolved
    // doubling resolving should not be much slower (few ms tops), however this is only workaround and should be resolved properly.
    const firstResolve = await this.configResolver.resolveDirectives(params);

    const second = await this.configResolver.resolveDirectives({ ...params, itemToResolve: firstResolve });

    return second as T;
  };

  invalidatePotentiallyChangedDirectiveResults = () => {
    // currently we consider runtime directives the ones that potentially changed
    const directivesToInvalidate = builtInDirectives.filter(({ isRuntime }) => isRuntime).map(({ name }) => `$${name}`);

    // we delete results of runtime directives from configResolver.results
    for (const directiveDef in this.configResolver.results) {
      if (directivesToInvalidate.some((d) => directiveDef.startsWith(d))) {
        delete this.configResolver.results[directiveDef];
      }
    }
    // we invalidate entire configResolver.resultsWithPath to ensure that no runtime directive is cached
    // non-runtime directives are still cached within configResolver.results
    this.configResolver.resultsWithPath = {};
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

  private getResourcesFromConfig = <T extends StpResource>(resourceType: StpResourceType): T[] => {
    return Object.entries(this.config.resources)
      .map(
        ([name, definition]): StpResource =>
          ({
            name: getStpNameForResource({ nameChain: [name] }),
            type: definition.type,
            overrides: (definition as any).overrides,
            configParentResourceType: definition.type,
            nameChain: [name],
            ...definition.properties
          }) as any
      )
      .filter((resource) => resource.type === resourceType)
      .map(mergeStacktapeDefaults) as T[];
  };

  private get globallyUniqueStackHash() {
    return getGloballyUniqueStackHash({
      region: globalStateManager.region,
      accountId: globalStateManager.targetAwsAccount.awsAccountId,
      stackName: globalStateManager.targetStack.stackName
    });
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

  get budgetConfig() {
    return this.config.budgetControl;
  }

  get deploymentConfig() {
    return {
      disableS3TransferAcceleration: !this.isS3TransferAccelerationAvailableInDeploymentRegion,
      ...this.config?.deploymentConfig
    };
  }

  get functions() {
    return this.getResourcesFromConfig<StpLambdaFunction>('function').map(({ name, packaging, ...definition }) => {
      return {
        ...definition,
        name,
        type: 'function',
        packaging,
        artifactName: name,
        handler: getLambdaHandler({ name, packaging }),
        resourceName: awsResourceNames.lambda(name, globalStateManager.targetStack.stackName),
        cfLogicalName: cfLogicalNames.lambda(name),
        aliasLogicalName:
          (definition.deployment || definition.provisionedConcurrency) && cfLogicalNames.lambdaStpAlias(name),
        events: definition.events || [],
        configParentResourceType: 'function'
      } as StpLambdaFunction;
    });
  }

  get containerWorkloads() {
    return [
      ...this.getResourcesFromConfig<StpContainerWorkload>('multi-container-workload')
      // ...this.webServicesBreakdown.containerWorkloads
    ];
  }

  get batchJobs() {
    return this.getResourcesFromConfig<StpBatchJob>('batch-job').map((batchJob) => {
      const artifactName = 'batchJobTriggerLambda';
      const helperLambdaData = globalStateManager.helperLambdaDetails.batchJobTriggerLambda;
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
            resourceName: awsResourceNames.lambda(triggerLambdaStpName, globalStateManager.targetStack.stackName),
            cfLogicalName: cfLogicalNames.lambda(triggerLambdaStpName),
            artifactName,
            artifactPath: helperLambdaData.artifactPath,
            handler: helperLambdaData.handler,
            configParentResourceType: batchJob.configParentResourceType,
            timeout: 10,
            runtime: 'nodejs22.x' as const,
            events: batchJob.events || [],
            environment: getBatchJobTriggerLambdaEnvironment({
              stackName: globalStateManager.targetStack.stackName,
              batchJobName: batchJob.name
            }),
            iamRoleStatements: getBatchJobTriggerLambdaAccessControl({ batchJobName: batchJob.name })
          } as StpHelperLambdaFunction
        }
      } as StpBatchJob;
    });
  }

  get buckets() {
    return this.getResourcesFromConfig<StpBucket>('bucket');
  }

  get hostingBuckets() {
    return this.getResourcesFromConfig<StpHostingBucket>('hosting-bucket').map(
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
    return this.getResourcesFromConfig<StpRelationalDatabase>('relational-database');
  }

  get efsFilesystems() {
    return this.getResourcesFromConfig<StpEfsFilesystem>('efs-filesystem');
  }

  get dynamoDbTables() {
    return this.getResourcesFromConfig<StpDynamoTable>('dynamo-db-table');
  }

  get applicationLoadBalancers() {
    return this.getResourcesFromConfig<StpApplicationLoadBalancer>('application-load-balancer');
  }

  get httpApiGateways() {
    return this.getResourcesFromConfig<StpHttpApiGateway>('http-api-gateway');
  }

  get eventBuses() {
    return this.getResourcesFromConfig<StpEventBus>('event-bus');
  }

  get bastions() {
    return this.getResourcesFromConfig<StpBastion>('bastion');
  }

  get stateMachines() {
    return this.getResourcesFromConfig<StpStateMachine>('state-machine');
  }

  get customResourceDefinitions() {
    return this.getResourcesFromConfig<StpCustomResourceDefinition>('custom-resource-definition').map(
      (customResourceDefinition) => {
        const customResourceFunctionIdentifier: keyof StpCustomResourceDefinition['_nestedResources'] =
          'backingFunction';
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
              resourceName: awsResourceNames.lambda(stpName, globalStateManager.targetStack.stackName),
              cfLogicalName: cfLogicalNames.lambda(stpName),
              artifactName: stpName,
              events: []
            }
          }
        } as StpCustomResourceDefinition;
      }
    );
  }

  get customResourceInstances() {
    return this.getResourcesFromConfig<StpCustomResource>('custom-resource-instance');
  }

  get userPools() {
    return this.getResourcesFromConfig<StpUserAuthPool>('user-auth-pool');
  }

  get atlasMongoClusters() {
    return this.getResourcesFromConfig<StpMongoDbAtlasCluster>('mongo-db-atlas-cluster');
  }

  get redisClusters() {
    return this.getResourcesFromConfig<StpRedisCluster>('redis-cluster');
  }

  get deploymentScripts() {
    return this.getResourcesFromConfig<StpDeploymentScript>('deployment-script').map((deploymentScript) => {
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
            resourceName: awsResourceNames.lambda(stpName, globalStateManager.targetStack.stackName),
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
    return this.getResourcesFromConfig<StpUpstashRedis>('upstash-redis');
  }

  get edgeLambdaFunctions() {
    return this.getResourcesFromConfig<StpEdgeLambdaFunction>('edge-lambda-function').map((edgeLambda) => {
      const lambdaResourceName = awsResourceNames.edgeLambda(
        edgeLambda.name,
        globalStateManager.targetStack.stackName,
        globalStateManager.region
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
          retentionDays: edgeLambda.logging?.retentionDays || 180
        }
      } as StpEdgeLambdaFunction;
    });
  }

  get awsCdkConstructs() {
    return this.getResourcesFromConfig<StpAwsCdkConstruct>('aws-cdk-construct');
  }

  get sqsQueues() {
    return this.getResourcesFromConfig<StpSqsQueue>('sqs-queue');
  }

  get snsTopics() {
    return this.getResourcesFromConfig<StpSnsTopic>('sns-topic');
  }

  get kinesisStreams() {
    return this.getResourcesFromConfig<StpKinesisStream>('kinesis-stream');
  }

  get webAppFirewalls() {
    return this.getResourcesFromConfig<StpWebAppFirewall>('web-app-firewall');
  }

  get nextjsWebs() {
    return this.getResourcesFromConfig<StpNextjsWeb>('nextjs-web').map((nextjsWeb) => {
      const nestedResourcesIdentifiers: (keyof StpNextjsWeb['_nestedResources'])[] = [
        'bucket',
        'imageFunction',
        'revalidationFunction',
        'revalidationQueue',
        'revalidationTable',
        'revalidationInsertFunction',
        'serverEdgeFunction',
        'serverFunction',
        'warmerFunction'
      ];
      const nestedResourceInfo: {
        [_nestedResource in keyof StpNextjsWeb['_nestedResources']]?: {
          stpResourceName: string;
          stpReferenceableName: string;
          nameChain: string[];
        };
      } = {};
      nestedResourcesIdentifiers.forEach((identifier) => {
        nestedResourceInfo[identifier] = {
          nameChain: [...nextjsWeb.nameChain, identifier],
          stpReferenceableName: [...nextjsWeb.nameChain, identifier].join('.'),
          stpResourceName: getStpNameForResource({
            nameChain: [...nextjsWeb.nameChain, identifier],
            parentResourceType: nextjsWeb.type
          })
        };
      });

      const {
        name,
        configParentResourceType,
        type: _t,
        connectTo,
        customDomains,
        environment,
        fileOptions,
        iamRoleStatements,
        appDirectory: _a,
        buildCommand: _b,
        dev: _dev,
        serverLambda,
        useEdgeLambda,
        useFirewall,
        nameChain: _p,
        warmServerInstances,
        _nestedResources: _,
        streamingEnabled,
        ...restProps
      } = nextjsWeb;
      // eslint-disable-next-line
      const propsCheck: Record<string, never> = restProps;

      const serverCachingOptions: CdnCachingOptions = {
        cacheMethods: ['GET', 'HEAD', 'OPTIONS'],
        defaultTTL: 0,
        minTTL: 0,
        maxTTL: 31536000,
        cacheKeyParameters: {
          headers: {
            whitelist: ['next-url', 'rsc', 'next-router-prefetch', 'next-router-state-tree', 'accept']
          },
          cookies: {
            none: true
          },
          queryString: {
            all: true
          }
        }
      };
      const imageLambdaCachingOptions: CdnCachingOptions = {
        cacheMethods: ['GET', 'HEAD', 'OPTIONS'],
        defaultTTL: 0,
        minTTL: 0,
        maxTTL: 31536000,
        cacheKeyParameters: {
          headers: {
            none: true
          },
          cookies: {
            none: true
          },
          queryString: {
            all: true
          }
        }
      };
      const serverForwardingOptions: CdnForwardingOptions = {
        allowedMethods: ['GET', 'HEAD', 'POST', 'OPTIONS', 'PATCH', 'PUT', 'DELETE'],
        originRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac'
      };
      const imageLambdaForwardingOptions: CdnForwardingOptions = {
        allowedMethods: ['GET', 'HEAD', 'POST', 'OPTIONS', 'PATCH', 'PUT', 'DELETE'],
        originRequestPolicyId: Ref('AWS::NoValue') as unknown as string
      };

      const staticBucketDataForwardingOptions: CdnForwardingOptions = {
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        originRequestPolicyId: Ref('AWS::NoValue') as unknown as string
      };

      const staticBucketDataCachingOptions: CdnCachingOptions = {
        cacheMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6'
      };

      const openNextBuildPath = fsPaths.absoluteNextjsBuiltProjectFolderPath({
        invocationId: globalStateManager.invocationId,
        stpResourceName: name
      });

      const cdnConfiguration: CdnConfiguration = {
        enabled: true,
        edgeFunctions: {
          onRequest: GetAtt(cfLogicalNames.openNextHostHeaderRewriteFunction(name), 'FunctionARN') as unknown as string,
          onOriginRequest: useEdgeLambda && nestedResourceInfo.serverEdgeFunction.stpReferenceableName
        },
        forwardingOptions: serverForwardingOptions,
        cachingOptions: serverCachingOptions,
        useFirewall,
        customDomains,
        routeRewrites: [
          {
            path: 'api/*',
            edgeFunctions: {
              onRequest: GetAtt(
                cfLogicalNames.openNextHostHeaderRewriteFunction(name),
                'FunctionARN'
              ) as unknown as string,
              onOriginRequest: useEdgeLambda && nestedResourceInfo.serverEdgeFunction.stpReferenceableName
            },
            forwardingOptions: serverForwardingOptions,
            cachingOptions: serverCachingOptions
          },
          {
            path: '_next/data/*',
            edgeFunctions: {
              onRequest: GetAtt(
                cfLogicalNames.openNextHostHeaderRewriteFunction(name),
                'FunctionARN'
              ) as unknown as string,
              onOriginRequest: useEdgeLambda && nestedResourceInfo.serverEdgeFunction.stpReferenceableName
            },
            forwardingOptions: serverForwardingOptions,
            cachingOptions: serverCachingOptions
          },
          {
            path: '_next/image*',
            forwardingOptions: imageLambdaForwardingOptions,
            cachingOptions: imageLambdaCachingOptions,
            routeTo: {
              type: 'function',
              properties: {
                functionName: nestedResourceInfo.imageFunction.stpReferenceableName
              }
            }
          },
          // this is cache behaviour for all static content
          // however the path patterns are only known later on (after packaging) and therefore this route rewrite is modified using template override
          {
            path: '<<TBD_STATIC>>',
            forwardingOptions: staticBucketDataForwardingOptions,
            cachingOptions: staticBucketDataCachingOptions,
            routePrefix: '/_assets',
            routeTo: {
              type: 'bucket',
              properties: {
                bucketName: nestedResourceInfo.bucket.stpReferenceableName,
                disableUrlNormalization: true
              }
            }
          }
          // {
          //   path: '_next/*',
          //   forwardingOptions: staticBucketDataForwardingOptions,
          //   cachingOptions: staticBucketDataCachingOptions,
          //   routePrefix: '/_assets',
          //   routeTo: {
          //     type: 'bucket',
          //     properties: {
          //       bucketName: nestedResourceInfo.bucket.stpReferenceableName,
          //       disableUrlNormalization: true
          //     }
          //   }
          // }
          // maybe this will better be done with template override (in resolver)
          // ...(existsSync(`${appDirectory}/public`) ? readdirSync(`${appDirectory}/public`) : []).map((path) => ({
          //   path,
          //   forwardingOptions: staticBucketDataForwardingOptions,
          //   cachingOptions: staticBucketDataCachingOptions,
          //   routePrefix: '/_assets',
          //   routeTo: !useEdgeLambda
          //     ? ({
          //         type: 'bucket',
          //         properties: {
          //           bucketName: nestedResourceInfo.bucket.stpReferenceableName
          //         }
          //       } as CdnBucketRoute)
          //     : undefined
          // }))
        ]
      };

      return {
        ...nextjsWeb,
        _nestedResources: {
          bucket: {
            type: 'bucket',
            nameChain: nestedResourceInfo.bucket.nameChain,
            name: nestedResourceInfo.bucket.stpResourceName,
            configParentResourceType,
            cdn: useEdgeLambda ? { ...cdnConfiguration, disableUrlNormalization: true } : undefined,
            // directory to upload must be created during packaging process
            directoryUpload: {
              directoryPath: `${openNextBuildPath}/bucket-content`,
              fileOptions: [
                ...(fileOptions || []),
                {
                  includePattern: '_assets/_next/**/*',
                  headers: [{ key: 'cache-control', value: 'public,max-age=31536000,immutable' }]
                },
                {
                  excludePattern: '_assets/_next/**/*',
                  includePattern: '_assets/**/*',
                  headers: [{ key: 'cache-control', value: 'public,max-age=0,s-maxage=31536000,must-revalidate' }]
                }
              ]
            }
          },
          serverFunction: !useEdgeLambda
            ? {
                type: 'function',
                nameChain: nestedResourceInfo.serverFunction.nameChain,
                name: nestedResourceInfo.serverFunction.stpResourceName,
                packaging: {
                  type: 'custom-artifact',
                  properties: {
                    packagePath: `${openNextBuildPath}/server-function`,
                    handler: 'index.mjs:handler'
                  }
                },
                environment: [
                  ...(environment || []),
                  {
                    name: 'CACHE_BUCKET_NAME',
                    value: Ref(cfLogicalNames.bucket(nestedResourceInfo.bucket.stpResourceName))
                  },
                  {
                    name: 'CACHE_BUCKET_PREFIX',
                    value: '_cache'
                  },
                  {
                    name: 'CACHE_BUCKET_REGION',
                    value: globalStateManager.region
                  },
                  {
                    name: 'REVALIDATION_QUEUE_URL',
                    value: Ref(cfLogicalNames.sqsQueue(nestedResourceInfo.revalidationQueue.stpResourceName))
                  },
                  {
                    name: 'REVALIDATION_QUEUE_REGION',
                    value: globalStateManager.region
                  },
                  {
                    name: 'CACHE_DYNAMO_TABLE',
                    value: Ref(
                      cfLogicalNames.dynamoGlobalTable(nestedResourceInfo.revalidationTable.stpResourceName)
                    ) as unknown as string
                  }
                ],
                connectTo: [
                  ...(connectTo || []),
                  nestedResourceInfo.bucket.stpReferenceableName,
                  nestedResourceInfo.revalidationQueue.stpReferenceableName,
                  nestedResourceInfo.revalidationTable.stpReferenceableName
                ],
                iamRoleStatements,
                handler: 'index-wrap.handler',
                artifactName: nestedResourceInfo.serverFunction.stpResourceName,
                resourceName: awsResourceNames.lambda(
                  nestedResourceInfo.serverFunction.stpResourceName,
                  globalStateManager.targetStack.stackName
                ),
                cfLogicalName: cfLogicalNames.lambda(nestedResourceInfo.serverFunction.stpResourceName),
                configParentResourceType,
                logging: {
                  disabled: serverLambda?.logging?.disabled,
                  logForwarding: serverLambda?.logging?.logForwarding,
                  retentionDays: serverLambda?.logging?.retentionDays || 180
                },
                memory: serverLambda?.memory || 1024,
                joinDefaultVpc: serverLambda?.joinDefaultVpc,
                timeout: serverLambda?.timeout || 30,
                runtime: 'nodejs22.x',
                cdn: cdnConfiguration,
                responseStreamingEnabled: streamingEnabled
              }
            : undefined,
          serverEdgeFunction: useEdgeLambda
            ? {
                type: 'edge-lambda-function',
                nameChain: nestedResourceInfo.serverEdgeFunction.nameChain,
                name: nestedResourceInfo.serverEdgeFunction.stpResourceName,
                packaging: {
                  type: 'custom-artifact',
                  properties: {
                    packagePath: `${openNextBuildPath}/server-function`,
                    handler: 'index.mjs:handler'
                  }
                },
                // todo: do not forget to create template override (asset modifier resource for this)
                // environment: [...environment, ...(serverLambda?.environment || [])],
                connectTo: [
                  ...(connectTo || []),
                  nestedResourceInfo.bucket.stpReferenceableName,
                  nestedResourceInfo.revalidationQueue.stpReferenceableName,
                  nestedResourceInfo.revalidationTable.stpReferenceableName
                ],
                iamRoleStatements: [
                  ...(iamRoleStatements || []),
                  ...getLogGroupPolicyDocumentStatements(
                    getLambdaLogResourceArnsForPermissions({
                      lambdaResourceName: awsResourceNames.edgeLambda(
                        nestedResourceInfo.serverEdgeFunction.stpResourceName,
                        globalStateManager.targetStack.stackName,
                        globalStateManager.region
                      ),
                      edgeLambda: true
                    }),
                    false
                  )
                ],
                handler: 'index-wrap.handler',
                artifactName: nestedResourceInfo.serverEdgeFunction.stpResourceName,
                resourceName: awsResourceNames.edgeLambda(
                  nestedResourceInfo.serverEdgeFunction.stpResourceName,
                  globalStateManager.targetStack.stackName,
                  globalStateManager.region
                ),
                configParentResourceType,
                logging: {
                  disabled: serverLambda?.logging?.disabled,
                  logForwarding: serverLambda?.logging?.logForwarding,
                  retentionDays: serverLambda?.logging?.retentionDays || 180
                },
                memory: serverLambda?.memory || 1024,
                timeout: serverLambda?.timeout || 30,
                runtime: 'nodejs22.x'
              }
            : undefined,
          imageFunction: {
            type: 'function',
            nameChain: nestedResourceInfo.imageFunction.nameChain,
            name: nestedResourceInfo.imageFunction.stpResourceName,
            packaging: {
              type: 'custom-artifact',
              properties: {
                packagePath: `${openNextBuildPath}/image-optimization-function`,
                handler: 'index.mjs:handler'
              },
              architecture: 'arm64'
            },
            environment: [
              {
                name: 'BUCKET_NAME',
                value: Ref(cfLogicalNames.bucket(nestedResourceInfo.bucket.stpResourceName)) as unknown as string
              },
              {
                name: 'BUCKET_KEY_PREFIX',
                value: '_assets'
              }
            ],
            connectTo: [nestedResourceInfo.bucket.stpReferenceableName],
            handler: 'index.handler',
            artifactName: nestedResourceInfo.imageFunction.stpResourceName,
            resourceName: awsResourceNames.lambda(
              nestedResourceInfo.imageFunction.stpResourceName,
              globalStateManager.targetStack.stackName
            ),
            cfLogicalName: cfLogicalNames.lambda(nestedResourceInfo.imageFunction.stpResourceName),
            configParentResourceType,
            logging: {
              disabled: serverLambda?.logging?.disabled,
              logForwarding: serverLambda?.logging?.logForwarding,
              retentionDays: serverLambda?.logging?.retentionDays || 180
            },
            memory: 2048,
            timeout: 30,
            runtime: 'nodejs22.x'
          },
          revalidationFunction: {
            type: 'function',
            nameChain: nestedResourceInfo.revalidationFunction.nameChain,
            name: nestedResourceInfo.revalidationFunction.stpResourceName,
            packaging: {
              type: 'custom-artifact',
              properties: {
                packagePath: `${openNextBuildPath}/revalidation-function`,
                handler: 'index.mjs:handler'
              }
            },
            handler: 'index.handler',
            artifactName: nestedResourceInfo.revalidationFunction.stpResourceName,
            resourceName: awsResourceNames.lambda(
              nestedResourceInfo.revalidationFunction.stpResourceName,
              globalStateManager.targetStack.stackName
            ),
            cfLogicalName: cfLogicalNames.lambda(nestedResourceInfo.revalidationFunction.stpResourceName),
            configParentResourceType,
            logging: {
              disabled: serverLambda?.logging?.disabled,
              logForwarding: serverLambda?.logging?.logForwarding,
              retentionDays: serverLambda?.logging?.retentionDays || 3
            },
            memory: 128,
            timeout: 30,
            runtime: 'nodejs22.x',
            events: [
              {
                type: 'sqs',
                properties: { sqsQueueName: nestedResourceInfo.revalidationQueue.stpReferenceableName, batchSize: 5 }
              }
            ]
          },
          revalidationQueue: {
            type: 'sqs-queue',
            nameChain: nestedResourceInfo.revalidationQueue.nameChain,
            name: nestedResourceInfo.revalidationQueue.stpResourceName,
            configParentResourceType,
            fifoEnabled: true,
            longPollingSeconds: 20
          },
          revalidationTable: {
            type: 'dynamo-db-table',
            nameChain: nestedResourceInfo.revalidationTable.nameChain,
            name: nestedResourceInfo.revalidationTable.stpResourceName,
            configParentResourceType,
            primaryKey: {
              partitionKey: {
                name: 'tag',
                type: 'string'
              },
              sortKey: {
                name: 'path',
                type: 'string'
              }
            },
            enablePointInTimeRecovery: true,
            secondaryIndexes: [
              {
                name: 'revalidate',
                partitionKey: { name: 'path', type: 'string' },
                sortKey: { name: 'revalidatedAt', type: 'number' }
              }
            ]
          },
          revalidationInsertFunction: {
            type: 'function',
            nameChain: nestedResourceInfo.revalidationInsertFunction.nameChain,
            name: nestedResourceInfo.revalidationInsertFunction.stpResourceName,
            packaging: {
              type: 'custom-artifact',
              properties: {
                packagePath: `${openNextBuildPath}/dynamodb-provider`,
                handler: 'index.mjs:handler'
              }
            },
            handler: 'index-wrap.handler',
            artifactName: nestedResourceInfo.revalidationInsertFunction.stpResourceName,
            resourceName: awsResourceNames.lambda(
              nestedResourceInfo.revalidationInsertFunction.stpResourceName,
              globalStateManager.targetStack.stackName
            ),
            cfLogicalName: cfLogicalNames.lambda(nestedResourceInfo.revalidationInsertFunction.stpResourceName),
            configParentResourceType,
            environment: [
              {
                name: 'CACHE_DYNAMO_TABLE',
                value: Ref(
                  cfLogicalNames.dynamoGlobalTable(nestedResourceInfo.revalidationTable.stpResourceName)
                ) as unknown as string
              }
            ],
            logging: {
              disabled: serverLambda?.logging?.disabled,
              logForwarding: serverLambda?.logging?.logForwarding,
              retentionDays: serverLambda?.logging?.retentionDays || 3
            },
            memory: 1024,
            timeout: 900,
            runtime: 'nodejs22.x',
            connectTo: [nestedResourceInfo.revalidationTable.stpReferenceableName]
          },
          warmerFunction:
            !useEdgeLambda && warmServerInstances
              ? {
                  type: 'function',
                  nameChain: nestedResourceInfo.warmerFunction.nameChain,
                  name: nestedResourceInfo.warmerFunction.stpResourceName,
                  packaging: {
                    type: 'custom-artifact',
                    properties: {
                      packagePath: `${openNextBuildPath}/warmer-function`,
                      handler: 'index.mjs:handler'
                    }
                  },
                  environment: [
                    {
                      name: 'FUNCTION_NAME',
                      value: Ref(
                        cfLogicalNames.lambda(nestedResourceInfo.serverFunction.stpResourceName)
                      ) as unknown as string
                    },
                    {
                      name: 'CONCURRENCY',
                      value: warmServerInstances
                    }
                  ],
                  handler: 'index.handler',
                  runtime: 'nodejs22.x',
                  artifactName: nestedResourceInfo.warmerFunction.stpResourceName,
                  resourceName: awsResourceNames.lambda(
                    nestedResourceInfo.warmerFunction.stpResourceName,
                    globalStateManager.targetStack.stackName
                  ),
                  cfLogicalName: cfLogicalNames.lambda(nestedResourceInfo.warmerFunction.stpResourceName),
                  configParentResourceType,
                  logging: {
                    disabled: serverLambda?.logging?.disabled,
                    logForwarding: serverLambda?.logging?.logForwarding,
                    retentionDays: serverLambda?.logging?.retentionDays || 3
                  },
                  connectTo: [nestedResourceInfo.serverFunction.stpReferenceableName],
                  memory: 1024,
                  events: [
                    {
                      type: 'schedule',
                      properties: {
                        scheduleRate: 'rate(5 minutes)'
                      }
                    }
                  ]
                }
              : undefined
        }
      } as StpNextjsWeb;
    });
  }

  get openSearchDomains() {
    return this.getResourcesFromConfig<StpOpenSearchDomain>('open-search-domain');
  }

  get webServices() {
    const containerWorkloadIdentifier: keyof StpWebService['_nestedResources'] = 'containerWorkload';
    const httpApiGatewayIdentifier: keyof StpWebService['_nestedResources'] = 'httpApiGateway';
    const loadBalancerIdentifier: keyof StpWebService['_nestedResources'] = 'loadBalancer';
    const networkLoadBalancerIdentifier: keyof StpWebService['_nestedResources'] = 'networkLoadBalancer';

    return this.getResourcesFromConfig<StpWebService>('web-service').map((serviceDefinition) => {
      const {
        name: _,
        packaging,
        resources,
        type,
        connectTo,
        iamRoleStatements,
        environment,
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
        _nestedResources,
        ...restProps
      } = serviceDefinition;
      // props check constant ensures full destructuring of web service props
      // eslint-disable-next-line
      const propsCheck: Record<string, never> = restProps;
      const customCerts = customDomains?.length
        ? customDomains.map(({ customCertificateArn }) => customCertificateArn).filter(Boolean)
        : null;
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
                  customDomains: customDomains?.length
                    ? customDomains
                        .filter(({ disableDnsRecordCreation }) => !disableDnsRecordCreation)
                        .map(({ domainName }) => domainName)
                    : null,
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
                      customCertificateArns: customCerts?.length ? customCerts : null
                    }
                  ].concat(
                    needTestListener
                      ? [
                          {
                            port: DEFAULT_TEST_LISTENER_PORT,
                            protocol: 'HTTPS',
                            customCertificateArns: customCerts?.length ? customCerts : null
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
                  customDomains: customDomains?.length
                    ? customDomains
                        .filter(({ disableDnsRecordCreation }) => !disableDnsRecordCreation)
                        .map(({ domainName }) => domainName)
                    : null,
                  disabledGlobalAlarms,
                  listeners: loadBalancing.properties?.ports.map((port) => ({
                    port: port.port,
                    protocol: port.protocol || 'TLS',
                    customCertificateArns: customCerts?.length ? customCerts : null
                  }))
                }
              : undefined
        }
      } as StpWebService;
    });
  }

  get privateServices() {
    return this.getResourcesFromConfig<StpPrivateService>('private-service').map((serviceDefinition) => {
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
        _nestedResources,
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
    return this.getResourcesFromConfig<StpWorkerService>('worker-service').map((serviceDefinition) => {
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
        internalHealthCheck,
        logging,
        scaling,
        configParentResourceType: _configParentResourceType,
        stopTimeout,
        enableRemoteSessions,
        volumeMounts,
        sideContainers,
        usePrivateSubnetsWithNAT,
        _nestedResources,
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

  get cloudformationResources(): (CloudformationResource & { name: string })[] {
    return Object.entries(this.config?.cloudformationResources || {}).map(([name, definition]) => {
      return { name, ...definition };
    });
  }

  get hooks() {
    return this.config.hooks || {};
  }

  get scripts() {
    return this.config.scripts || {};
  }

  get stackConfig(): StackConfig {
    return this.config.stackConfig || ({} as StackConfig);
  }

  get reuseVpcConfig() {
    return this.stackConfig?.vpc?.reuseVpc;
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
      region: globalStateManager.region
    }); // 'ap-southeast-3']
  }

  get stackInfoDirPath() {
    return this.stackConfig.disableStackInfoSaving
      ? null
      : fsPaths.stackInfoDirectory({
          workingDir: globalStateManager.workingDir,
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

  get allBuckets() {
    // In dev mode, filter out buckets from hosting-bucket and nextjs-web since they are excluded
    const filteredHostingBuckets = isDevCommand()
      ? this.hostingBuckets.filter((hb) => !isResourceTypeExcludedInDevMode(hb.type))
      : this.hostingBuckets;
    const filteredNextjsWebs = isDevCommand()
      ? this.nextjsWebs.filter((nw) => !isResourceTypeExcludedInDevMode(nw.type))
      : this.nextjsWebs;
    return [
      ...this.buckets,
      ...filteredHostingBuckets.map(({ _nestedResources: { bucket } }) => bucket),
      ...filteredNextjsWebs.map(({ _nestedResources: { bucket } }) => bucket)
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
    // check load balancers and their domains
    this.allApplicationLoadBalancers.forEach(({ name, customDomains }) => {
      if (customDomains) {
        customDomains.forEach((fullDomainName) => {
          domainAssociations[fullDomainName] = (domainAssociations[fullDomainName] || []).concat(name);
          const rootDomain = getApexDomain(fullDomainName);
          resultDomains.add(rootDomain);
        });
      }
    });
    // check load balancers and their domains
    this.allNetworkLoadBalancers.forEach(({ name, customDomains }) => {
      if (customDomains) {
        customDomains.forEach((fullDomainName) => {
          domainAssociations[fullDomainName] = (domainAssociations[fullDomainName] || []).concat(name);
          const rootDomain = getApexDomain(fullDomainName);
          resultDomains.add(rootDomain);
        });
      }
    });
    // check http api gateways
    this.allHttpApiGateways.forEach(({ name, customDomains }) => {
      if (customDomains) {
        customDomains.forEach((domainConfig) => {
          const fullDomainName = domainConfig.domainName;

          domainAssociations[fullDomainName] = (domainAssociations[fullDomainName] || []).concat(name);
          const rootDomain = getApexDomain(fullDomainName);
          resultDomains.add(rootDomain);
        });
      }
    });

    // check cdns
    [...this.allBuckets, ...this.allApplicationLoadBalancers, ...this.allHttpApiGateways].forEach(
      ({ name: stpResourceName, cdn }) => {
        if (cdn?.customDomains) {
          cdn.customDomains.forEach((domainConfig) => {
            const fullDomainName = domainConfig.domainName;

            domainAssociations[fullDomainName] = [...(domainAssociations[fullDomainName] || []), stpResourceName];
            const rootDomain = getApexDomain(fullDomainName);
            resultDomains.add(rootDomain);
          });
        }
      }
    );

    this.userPools.forEach(({ name, customDomain }) => {
      if (customDomain) {
        const fullDomainName = customDomain.domainName;
        domainAssociations[fullDomainName] = (domainAssociations[fullDomainName] || []).concat(name);
        const rootDomain = getApexDomain(fullDomainName);
        resultDomains.add(rootDomain);
      }
    });

    Object.entries(domainAssociations).forEach(([fullDomainName, associations]) => {
      if (associations.length > 1) {
        throw stpErrors.e47({ fullDomainName, associations });
      }
    });
    return Array.from(resultDomains);
  }

  get categorizedEmailsUsedInAlertNotifications() {
    const senders = new Set<string>();
    const recipients = new Set<string>();
    this.allAlarms.forEach(({ notificationTargets }) =>
      notificationTargets?.forEach(({ type, properties }) => {
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
      ...this.allNextjsLambdaFunctions
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
      ...this.allNextjsLambdaFunctions
    ].filter(({ cdn }) => {
      return cdn?.enabled && !cdn?.disableInvalidationAfterDeploy;
    });
  }

  // returns array of stacktapeLogicalNames of buckets
  get allBucketsUsingCustomMetadataHeaders() {
    return this.allBuckets
      .filter(({ directoryUpload }) =>
        directoryUpload?.fileOptions?.some(({ headers }) =>
          headers.some(({ key }) => !isBucketNativelySupportedHeader(key))
        )
      )
      .map(({ name }) => name);
  }

  get allImagesCount(): number {
    return this.allContainersRequiringPackaging.length;
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

  get allParameterNamesUsedInAlarmNotifications() {
    const paramNames: string[] = [];
    processAllNodesSync(this.allAlarms, (node) => {
      // secret referenced using dynamic reference
      if (typeof node === 'string' && (node.startsWith('{{resolve:ssm-secure') || node.startsWith('{{resolve:ssm'))) {
        const [, , paramName] = node.split(':');
        paramNames.push(paramName);
      }
    });
    return paramNames;
  }

  get cfLogicalNamesToBeProtected() {
    return this.databases
      .filter(({ deletionProtection }) => deletionProtection)
      .map(({ name, engine }) => {
        if (isAuroraEngine(engine.type)) {
          return cfLogicalNames.auroraDbCluster(name);
        }
        return cfLogicalNames.dbInstance(name);
      });
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
      ...this.hostingBuckets,
      ...this.webAppFirewalls,
      ...this.nextjsWebs,
      ...this.openSearchDomains,
      ...this.efsFilesystems
    ];
  }

  get allResourcesIncludingNested(): StpResource[] {
    const unwrapResource = (resource: StpResource): StpResource[] => {
      const nestedResources = Object.values(resource._nestedResources || {}).filter(Boolean);
      return nestedResources.length ? [resource, ...nestedResources.map(unwrapResource).flat()] : [resource];
    };
    return this.allConfigResources.map(unwrapResource).flat();
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
    const helperLambdaData = globalStateManager.helperLambdaDetails[artifactName];
    return {
      name: artifactName,
      packaging: { type: 'helper-lambda', properties: helperLambdaData },
      type: 'function',
      artifactName,
      resourceName: awsResourceNames.stpServiceLambda(globalStateManager.targetStack.stackName),
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
        projectName: globalStateManager.targetStack.projectName,
        globallyUniqueStackHash: this.globallyUniqueStackHash,
        stackName: globalStateManager.targetStack.stackName
      }),
      iamRoleStatements: [
        ...getStacktapeServiceLambdaCustomResourceInducedStatements(),
        ...getStacktapeServiceLambdaAlarmNotificationInducedStatements(),
        ...getStacktapeServiceLambdaEcsRedeployInducedStatements(),
        ...getStacktapeServiceLambdaCustomTaggingInducedStatement()
      ]
    };
  }

  get stacktapeOriginRequestLambdaProps(): StpHelperEdgeLambdaFunction {
    const artifactName = 'cdnOriginRequestLambda';
    const helperLambdaData = globalStateManager.helperLambdaDetails[artifactName];
    const lambdaResourceName = helperLambdaAwsResourceNames.originRequestEdgeLambda(
      globalStateManager.targetStack.stackName,
      globalStateManager.region
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
    const helperLambdaData = globalStateManager.helperLambdaDetails[artifactName];
    const lambdaResourceName = helperLambdaAwsResourceNames.originResponseEdgeLambda(
      globalStateManager.targetStack.stackName,
      globalStateManager.region
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
            vpcPeeringConnectionId: GetAtt(
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
                ? Ref(lambdaResource.aliasLogicalName)
                : GetAtt(lambdaResource.cfLogicalName, 'Arn'),
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
      [...this.allBuckets, ...this.functions, ...this.allNextjsLambdaFunctions].some(({ cdn }) => {
        const cdnNeedsDefaultDomain = cdn?.enabled && !cdn?.customDomains?.length;
        return cdnNeedsDefaultDomain;
      })
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
    return [...this.allUserCodeLambdas, ...this.allNextjsLambdaFunctions, ...this.helperLambdas];
  }

  get allLambdasEligibleForHotswap() {
    return [
      ...this.functions,
      ...this.deploymentScripts.map(({ _nestedResources: { scriptFunction } }) => scriptFunction),
      ...this.customResourceDefinitions.map(({ _nestedResources: { backingFunction } }) => backingFunction),
      ...this.allNextjsLambdaFunctions.filter(({ type }) => type === 'function')
    ];
  }

  get allBucketsToSync() {
    return this.allBuckets
      .filter((bucket) => bucket.directoryUpload)
      .map(({ name, directoryUpload }) => ({
        bucketName: awsResourceNames.bucket(
          name,
          globalStateManager.targetStack.stackName,
          this.globallyUniqueStackHash
        ),
        uploadConfiguration: {
          ...directoryUpload,
          directoryPath: isAbsolute(directoryUpload.directoryPath)
            ? directoryUpload.directoryPath
            : join(globalStateManager.workingDir, directoryUpload.directoryPath)
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
        return [{ version: resource.version || '2.17', instanceType: 'm4.large.search' }];
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
    return this.getResourcesFromConfig<StpNetworkLoadBalancer>('network-load-balancer');
  }
}

export const configManager = compose(skipInitIfInitialized, cancelablePublicMethods)(new ConfigManager());
