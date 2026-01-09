import type { FunctionProperties } from '@cloudform/lambda/function';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import Application from '@cloudform/codeDeploy/application';
import { GetAtt, Join, Ref } from '@cloudform/functions';
import EventInvokeConfig from '@cloudform/lambda/eventInvokeConfig';
import CfLambdaFunction from '@cloudform/lambda/function';
import { DEFAULT_LAMBDA_NODE_VERSION } from '@config';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { stackManager } from '@domain-services/cloudformation-stack-manager';
import { configManager } from '@domain-services/config-manager';
import { resolveReferencesToMountedEfsFilesystems } from '@domain-services/config-manager/utils/efs-filesystems';
import { getLambdaRuntime } from '@domain-services/config-manager/utils/lambdas';
import { resolveConnectToList } from '@domain-services/config-manager/utils/resource-references';
import { deploymentArtifactManager } from '@domain-services/deployment-artifact-manager';
import { domainManager } from '@domain-services/domain-manager';
import { packagingManager } from '@domain-services/packaging-manager';
import { templateManager } from '@domain-services/template-manager';
import { thirdPartyProviderManager } from '@domain-services/third-party-provider-credentials-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@shared/naming/cf-evaluated-links';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { tagNames } from '@shared/naming/tag-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from '@shared/utils/constants';
import { getAugmentedEnvironment } from '@utils/environment';
import { ExpectedError } from '@utils/errors';
import { resolveAlarmsForResource } from '../_utils/alarms';
import {
  getCachePolicyHash,
  getCdnDefaultDomainCustomResource,
  getCloudfrontCustomizedCachePolicyResource,
  getCloudfrontCustomizedOriginRequestPolicyResource,
  getCloudfrontDefaultDynamicCachePolicyResource,
  getCloudfrontDefaultDynamicOriginRequestPolicyResource,
  getCloudfrontDefaultStaticCachePolicyResource,
  getCloudfrontDefaultStaticOriginRequestPolicyResource,
  getCloudfrontDistributionConfigs,
  getCloudfrontDistributionResource,
  getCloudfrontDnsRecord,
  getCloudfrontOriginAccessIdentityResource,
  getOriginRequestPolicyHash,
  isCustomCachePolicyNeeded,
  isCustomOriginRequestPolicyNeeded
} from '../_utils/cdn';
import { getResolvedConnectToEnvironmentVariables } from '../_utils/connect-to-helper';
import { getEfsAccessPoint } from '../_utils/efs';
import { getResourcesNeededForLogForwarding } from '../_utils/log-forwarding';
import { getAtlasMongoRoleAssociatedUserResource } from '../_utils/role-helpers';
import { resolveApplicationLoadBalancerEvents } from './events/application-load-balancer';
import { resolveCloudwatchAlarmEvents } from './events/cloudwatch-alarm';
import { resolveCloudWatchLogEvents } from './events/cloudwatch-log';
import { resolveDynamoEvents } from './events/dynamo';
import { resolveEventBusEvents } from './events/event-bus';
import { resolveHttpApiEvents } from './events/http-api-gateway';
import { resolveKafkaTopicEvents } from './events/kafka-topic';
import { resolveKinesisEvents } from './events/kinesis';
import { resolveS3Events } from './events/s3';
import { resolveScheduledEvents } from './events/schedule';
import { resolveSnsEvents } from './events/sns';
import { resolveSqsEvents } from './events/sqs';
import {
  getCodeDeployDeploymentGroup,
  getLambdaAliasResource,
  getLambdaFunctionRole,
  getLambdaFunctionSecurityGroup,
  getLambdaLogGroup,
  getLambdaPublicUrlPermission,
  getLambdaUrl,
  getLambdaVersionPublisherCustomResource
} from './utils';

export const resolveFunctions = async () => {
  configManager.functions.forEach((lambdaProps) => {
    resolveFunction({ lambdaProps });
  });
};

export const resolveFunction = ({ lambdaProps }: { lambdaProps: StpLambdaFunction | StpHelperLambdaFunction }) => {
  const { stackName } = globalStateManager.targetStack;

  const {
    name,
    nameChain,
    cfLogicalName,
    resourceName,
    connectTo,
    iamRoleStatements,
    joinDefaultVpc,
    destinations,
    handler,
    memory,
    runtime,
    timeout,
    environment,
    tags,
    logging,
    configParentResourceType,
    artifactName,
    packaging,
    deployment,
    url,
    storage,
    volumeMounts,
    type,
    cdn,
    architecture,
    provisionedConcurrency,
    reservedConcurrency,
    layers
  } = lambdaProps;

  if (nameChain[0] !== PARENT_IDENTIFIER_SHARED_GLOBAL) {
    resolveAlarmsForResource({ resource: lambdaProps as StpLambdaFunction });
  }

  const lambdaDependsOn = [];
  const policyStatementsFromEvents = [
    resolveApplicationLoadBalancerEvents({ lambdaFunction: lambdaProps }),
    resolveCloudwatchAlarmEvents({ lambdaFunction: lambdaProps }),
    resolveCloudWatchLogEvents({ lambdaFunction: lambdaProps }),
    resolveDynamoEvents({ lambdaFunction: lambdaProps }),
    resolveEventBusEvents({ lambdaFunction: lambdaProps }),
    resolveHttpApiEvents({ lambdaFunction: lambdaProps }),
    resolveKafkaTopicEvents({ lambdaFunction: lambdaProps }),
    resolveKinesisEvents({ lambdaFunction: lambdaProps }),
    resolveS3Events({ lambdaFunction: lambdaProps }),
    resolveScheduledEvents({ lambdaFunction: lambdaProps }),
    resolveSnsEvents({ lambdaFunction: lambdaProps }),
    resolveSqsEvents({ lambdaFunction: lambdaProps })
  ].flat();
  const {
    accessToResourcesRequiringRoleChanges,
    accessToResourcesPotentiallyRequiringSecurityGroupCreation,
    accessToAtlasMongoClusterResources,
    accessToAwsServices
  } = resolveConnectToList({
    stpResourceNameOfReferencer: name,
    connectTo
  });
  const lambdaIsUsedInDeploymentHook = configManager.allLambdasUsedInDeploymentHooks.some(
    ({ name: hookLambdaName }) => hookLambdaName === name
  );
  const mountedEfsFilesystems = volumeMounts?.length
    ? resolveReferencesToMountedEfsFilesystems({ resource: lambdaProps as StpLambdaFunction })
    : [];
  mountedEfsFilesystems.forEach(({ name: efsFilesystemName }) => {
    lambdaDependsOn.push(cfLogicalNames.efsMountTarget(efsFilesystemName, 0));
    lambdaDependsOn.push(cfLogicalNames.efsMountTarget(efsFilesystemName, 1));
  });

  const lambdaRoleLogicalName = cfLogicalNames.lambdaRole(name);
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName: lambdaRoleLogicalName,
    resource: getLambdaFunctionRole({
      destinations,
      accessToResourcesRequiringRoleChanges,
      lambdaResourceName: resourceName,
      iamRoleStatements: (iamRoleStatements || []).concat(policyStatementsFromEvents || []),
      accessToAwsServices,
      joinVpc: joinDefaultVpc,
      workloadName: name,
      isUsedInDeploymentHook: lambdaIsUsedInDeploymentHook,
      configParentResourceType,
      mountedEfsFilesystems
    }),
    nameChain
  });
  lambdaDependsOn.push(lambdaRoleLogicalName);
  const iamRoleArnToUse = GetAtt(lambdaRoleLogicalName, 'Arn');
  // here we are addressing creation of atlas mongo user which is associated to this role
  if (accessToAtlasMongoClusterResources?.length) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.atlasMongoUserAssociatedWithRole(name),
      nameChain,
      resource: getAtlasMongoRoleAssociatedUserResource({
        accessToAtlasMongoClusterResources,
        roleCfLogicalName: lambdaRoleLogicalName
      })
    });
    lambdaDependsOn.push(cfLogicalNames.atlasMongoUserAssociatedWithRole(name));
  }

  const packagingType = packaging?.type as Parameters<typeof getAugmentedEnvironment>[0]['packagingType'];
  const entryfilePath = (packaging?.properties as { entryfilePath?: string })?.entryfilePath;
  const languageSpecificConfig = (packaging?.properties as { languageSpecificConfig?: EsLanguageSpecificConfig })
    ?.languageSpecificConfig;
  const nodeVersionFromRuntime = Number(runtime?.match(/nodejs(\d+)/)?.[1]) || null;
  const nodeVersion = languageSpecificConfig?.nodeVersion || nodeVersionFromRuntime || DEFAULT_LAMBDA_NODE_VERSION;

  const transformedEnvVars = {};
  getAugmentedEnvironment({
    environment: environment || [],
    workloadType: 'function',
    packagingType,
    entryfilePath,
    nodeVersion
  }).forEach(({ name: varName, value: varVal }) => {
    transformedEnvVars[varName] = varVal;
  });
  const fileSystemConfigs = (volumeMounts || []).map((mount: any) => {
    const accessPointLogicalName = cfLogicalNames.efsAccessPoint({
      stpResourceName: name,
      efsFilesystemName: mount.properties.efsFilesystemName,
      rootDirectory: mount.properties.rootDirectory
    });

    if (!templateManager.getCfResourceFromTemplate(accessPointLogicalName)) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: accessPointLogicalName,
        resource: getEfsAccessPoint({
          efsFilesystemName: mount.properties.efsFilesystemName,
          rootDirectory: mount.properties.rootDirectory
        }),
        nameChain
      });
    }

    return {
      Arn: GetAtt(accessPointLogicalName, 'Arn'),
      LocalMountPath: mount.properties.mountPath
    };
  });
  const lambdaFunctionResource = new CfLambdaFunction({
    FunctionName: resourceName,
    Architectures: architecture === 'arm64' ? ['arm64'] : ['x86_64'],
    Code: {},
    Handler: handler,
    MemorySize: memory,
    Timeout: timeout,
    Environment: { Variables: transformedEnvVars },
    Role: iamRoleArnToUse,
    Runtime: getLambdaRuntime({ name, packaging, runtime }),
    EphemeralStorage: storage && { Size: storage },
    Tags: stackManager.getTags(tags),
    FileSystemConfigs: fileSystemConfigs.length > 0 ? fileSystemConfigs : undefined
  });
  if (joinDefaultVpc) {
    const securityGroupLogicalName = cfLogicalNames.workloadSecurityGroup(name);
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: securityGroupLogicalName,
      resource: getLambdaFunctionSecurityGroup({
        stackName,
        stpFunctionName: name
      }),
      nameChain
    });
    lambdaFunctionResource.Properties.VpcConfig = {
      SecurityGroupIds: [Ref(securityGroupLogicalName)],
      SubnetIds: vpcManager.getPublicSubnetIds()
    };
  } else if (accessToResourcesPotentiallyRequiringSecurityGroupCreation.length) {
    // if function is not in vpc but is trying to scope (connectTo) resources requiring security group throw error
    // this is only relevant if database or redis cluster is in vpc or scoping-workloads-in-vpc mode
    const resourcesRequiringOnlyVpcAccess = accessToResourcesPotentiallyRequiringSecurityGroupCreation.filter(
      ({ type: t, accessibility }) =>
        t === 'redis-cluster' ||
        accessibility?.accessibilityMode === 'vpc' ||
        accessibility?.accessibilityMode === 'scoping-workloads-in-vpc'
    );
    if (resourcesRequiringOnlyVpcAccess.length) {
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Function ${tuiManager.makeBold(
          name
        )} can not connect to the following resources, unless it is connected to a VPC:\n${resourcesRequiringOnlyVpcAccess.map(
          ({ name: refName, type: refType }) =>
            `${tuiManager.prettyResourceName(refName)} of type ${tuiManager.prettyResourceType(refType)}\n`
        )}`,
        [
          `You can connect the function to a VPC by setting ${tuiManager.prettyConfigProperty(
            'joinDefaultVpc'
          )} property to true. (Note that the function won't be able to make outbound Internet requests after connecting to a VPC)`
        ]
      );
    }
  }
  if (url?.enabled || configManager.simplifiedCdnAssociations.function[name]) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.lambdaUrl(name),
      resource: getLambdaUrl({
        lambdaProps
      }),
      nameChain
    });
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      paramName: 'url',
      paramValue: GetAtt(cfLogicalNames.lambdaUrl(name), 'FunctionUrl'),
      nameChain,
      showDuringPrint: true
    });
    if (!url?.authMode || url.authMode === 'NONE') {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.lambdaPublicUrlPermission(name),
        resource: getLambdaPublicUrlPermission({ lambdaProps }),
        nameChain
      });
    }
  }
  // Add layers: user-defined layers + shared layer from packaging
  const sharedLayerInfo = packagingManager.getSharedLayerInfo();
  const allLayers = [
    ...(layers || []),
    ...(sharedLayerInfo?.layerVersionArn ? [sharedLayerInfo.layerVersionArn] : [])
  ];
  if (allLayers.length > 0) {
    lambdaFunctionResource.Properties.Layers = allLayers;
  }
  if (reservedConcurrency) {
    lambdaFunctionResource.Properties.ReservedConcurrentExecutions = reservedConcurrency;
  }
  // Provisioned concurrency requires an alias pointing to a specific version.
  // If deployment is configured, alias is already created (with code deploy), so we just add provisioned concurrency to it.
  // If no deployment, we create version + alias specifically for provisioned concurrency.
  if (provisionedConcurrency && !deployment) {
    calculatedStackOverviewManager.addCfChildResource({
      nameChain,
      cfLogicalName: cfLogicalNames.lambdaVersionPublisherCustomResource(name),
      resource: getLambdaVersionPublisherCustomResource({ lambdaProps })
    });
    calculatedStackOverviewManager.addCfChildResource({
      nameChain,
      cfLogicalName: cfLogicalNames.lambdaStpAlias(name),
      resource: getLambdaAliasResource({ lambdaProps, provisionedConcurrency })
    });
  }
  if (
    !joinDefaultVpc &&
    accessToAtlasMongoClusterResources.length &&
    thirdPartyProviderManager.getAtlasMongoDbProviderConfig().accessibility &&
    thirdPartyProviderManager.getAtlasMongoDbProviderConfig().accessibility.accessibilityMode !== 'internet'
  ) {
    // if function is not in vpc and is trying to scope (connectTo) atlas mongo cluster and atlas mongo does not allow connections from internet
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in function "${name}". Function is referencing following "atlasMongoCluster" resources which only allow connections from "${
        thirdPartyProviderManager.getAtlasMongoDbProviderConfig().accessibility.accessibilityMode
      }":\n${accessToAtlasMongoClusterResources.map(
        ({ name: refName }) => `"${refName}"\n`
      )}. These cannot be scoped by connectTo unless function is connected to vpc.`,
      [
        'You can EITHER connect function to VPC by setting "joinVpc" property to true. (Note that a function is not able to reach internet once connected to a VPC.)',
        'OR You can allow connections to your MongoDb Atlas clusters from the internet by setting `(config).providers.mongoDbAtlas.accessibility.accessibilityMode` to "internet".'
      ]
    );
  }

  if (!logging?.disabled) {
    const logGroupLogicalName = cfLogicalNames.lambdaLogGroup(name);
    const serviceLambdaName: HelperLambdaName = 'stacktapeServiceLambda';
    if (name === serviceLambdaName) {
      calculatedStackOverviewManager.addCfChildResource({
        nameChain,
        cfLogicalName: logGroupLogicalName,
        resource: getLambdaLogGroup(
          awsResourceNames.lambdaLogGroup({ lambdaAwsResourceName: resourceName }),
          logging?.retentionDays
        ),
        initial: true
      });
    } else {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: logGroupLogicalName,
        resource: getLambdaLogGroup(
          awsResourceNames.lambdaLogGroup({ lambdaAwsResourceName: resourceName }),
          logging?.retentionDays
        ),
        nameChain
      });
    }
    calculatedStackOverviewManager.addStacktapeResourceLink({
      linkName: configParentResourceType === 'batch-job' ? 'logs-trigger-lambda' : 'logs',
      nameChain,
      linkValue: cfEvaluatedLinks.logGroup(awsResourceNames.lambdaLogGroup({ lambdaAwsResourceName: resourceName }))
    });
    if (configParentResourceType !== 'batch-job') {
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        nameChain,
        paramName: 'logGroupArn',
        paramValue: GetAtt(logGroupLogicalName, 'Arn'),
        showDuringPrint: true
      });
    }
    lambdaDependsOn.push(logGroupLogicalName);
    if (logging?.logForwarding) {
      getResourcesNeededForLogForwarding({
        resource: lambdaProps as StpLambdaFunction,
        logGroupCfLogicalName: logGroupLogicalName,
        logForwardingConfig: logging?.logForwarding
      }).forEach(({ cfLogicalName: cfLogicalNameOfResource, cfResource }) => {
        if (!templateManager.getCfResourceFromTemplate(cfLogicalName)) {
          calculatedStackOverviewManager.addCfChildResource({
            nameChain,
            cfLogicalName: cfLogicalNameOfResource,
            resource: cfResource
          });
        }
      });
    }
  }
  if (lambdaDependsOn.length > 0) {
    lambdaFunctionResource.DependsOn = lambdaDependsOn;
  }
  // adding main function resource
  calculatedStackOverviewManager.addCfChildResource({
    cfLogicalName,
    resource: lambdaFunctionResource,
    nameChain
  });
  // adding override for Code and Tags section of AWS::Lambda::Function resource
  // S3 package URI in Code section can only be known after packaging of compute resources is done
  templateManager.addFinalTemplateOverrideFn(async (template) => {
    const { digest, s3Key } = deploymentArtifactManager.getLambdaS3UploadInfo({ artifactName, packaging });

    template.Resources[cfLogicalName].Properties.Code = {
      S3Key: s3Key,
      S3Bucket: deploymentArtifactManager.deploymentBucketName
    };

    template.Resources[cfLogicalName].Properties.Tags = stackManager.getTags([
      ...(tags || []),
      { name: tagNames.codeDigest(), value: digest },
      { name: tagNames.cfAttributionLogicalName(), value: cfLogicalName }
    ]);
  });
  // adding override to inject environment variables deduced from "connectTo" list into AWS::Lambda::Function resource
  templateManager.addFinalTemplateOverrideFn(async (template) => {
    // resolving injecting env variables
    const variablesToInject = getResolvedConnectToEnvironmentVariables({
      connectTo,
      localResolve: false
    });
    if (variablesToInject.length) {
      const templateResourceProps = template.Resources[cfLogicalName].Properties as FunctionProperties;
      templateResourceProps.Environment = {
        Variables: {
          ...(templateResourceProps.Environment?.Variables || {})
        }
      };
      variablesToInject.forEach(({ Name, Value }) => {
        templateResourceProps.Environment.Variables[Name] = Value;
      });
    }

    // resolving s3 package
    const { digest, s3Key } = deploymentArtifactManager.getLambdaS3UploadInfo({ artifactName, packaging });

    template.Resources[cfLogicalName].Properties.Code = {
      S3Key: s3Key,
      S3Bucket: deploymentArtifactManager.deploymentBucketName
    };

    template.Resources[cfLogicalName].Properties.Tags = stackManager.getTags([
      { name: tagNames.codeDigest(), value: digest }
    ]);
  });
  if (configParentResourceType !== 'batch-job') {
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'arn',
      paramValue: GetAtt(cfLogicalName, 'Arn'),
      showDuringPrint: true
    });
  }
  if (destinations) {
    const lambdaEventInvokeConfig = new EventInvokeConfig({
      FunctionName: Ref(cfLogicalName),
      DestinationConfig: {},
      Qualifier: deployment ? awsResourceNames.lambdaStpAlias() : '$LATEST'
    });
    if (destinations.onFailure) {
      lambdaEventInvokeConfig.Properties.DestinationConfig.OnFailure = { Destination: destinations.onFailure };
    }
    if (destinations.onSuccess) {
      lambdaEventInvokeConfig.Properties.DestinationConfig.OnSuccess = { Destination: destinations.onSuccess };
    }
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.lambdaInvokeConfig(name),
      resource: lambdaEventInvokeConfig,
      nameChain
    });
  }
  if (deployment) {
    if (!templateManager.getCfResourceFromTemplate(cfLogicalNames.lambdaCodeDeployApp())) {
      calculatedStackOverviewManager.addCfChildResource({
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        cfLogicalName: cfLogicalNames.lambdaCodeDeployApp(),
        resource: new Application({
          ApplicationName: awsResourceNames.lambdaCodeDeployApp(globalStateManager.targetStack.stackName),
          ComputePlatform: 'Lambda'
        })
      });
    }
    calculatedStackOverviewManager.addCfChildResource({
      nameChain,
      cfLogicalName: cfLogicalNames.lambdaVersionPublisherCustomResource(name),
      resource: getLambdaVersionPublisherCustomResource({ lambdaProps })
    });
    calculatedStackOverviewManager.addCfChildResource({
      nameChain,
      cfLogicalName: cfLogicalNames.codeDeployDeploymentGroup(name),
      resource: getCodeDeployDeploymentGroup({ lambdaProps })
    });
    calculatedStackOverviewManager.addCfChildResource({
      nameChain,
      cfLogicalName: cfLogicalNames.lambdaStpAlias(name),
      resource: getLambdaAliasResource({ lambdaProps })
    });
  }
  // add monitoring link
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: configParentResourceType === 'batch-job' ? 'metrics-trigger-lambda' : 'metrics',
    nameChain,
    linkValue: cfEvaluatedLinks.lambda({
      awsLambdaName: Ref(cfLogicalName),
      tab: 'monitoring',
      alias: deployment && awsResourceNames.lambdaStpAlias()
    })
  });
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: configParentResourceType === 'batch-job' ? 'trigger-lambda-console' : 'console',
    nameChain,
    linkValue: cfEvaluatedLinks.lambda({
      awsLambdaName: Ref(cfLogicalName),
      tab: 'testing',
      alias: deployment && awsResourceNames.lambdaStpAlias()
    })
  });
  if (cdn?.enabled) {
    // origin identity access START
    // here we determine if cdn attached to this lambda function is also targeting some bucket
    // if so, we will create identity for this cdn (one identity for all "possible" distributions)
    if (
      Object.values(configManager.simplifiedCdnAssociations.bucket).some((resourcesTargetingBucket) =>
        resourcesTargetingBucket.includes(name)
      )
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontOriginAccessIdentity(name),
        nameChain,
        resource: getCloudfrontOriginAccessIdentityResource(name)
      });
    }
    // origin identity access END

    // cache policies START
    // first we are dealing with cache policy which will be used for default cache behaviour
    if (
      isCustomCachePolicyNeeded({
        cachingOptions: cdn.cachingOptions,
        originType: type,
        stackName
      })
    ) {
      const cachePolicyLogicalName = cfLogicalNames.cloudfrontCustomCachePolicy(
        name,
        getCachePolicyHash({ cachingOptions: cdn.cachingOptions })
      );
      if (!templateManager.getCfResourceFromTemplate(cachePolicyLogicalName)) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cachePolicyLogicalName,
          nameChain,
          resource: getCloudfrontCustomizedCachePolicyResource({
            stpResourceNameName: name,
            cachingOptions: cdn.cachingOptions,
            originType: configParentResourceType as StpCdnAttachableResourceType,
            stackName
          })
        });
      }
    } else if (
      !cdn.cachingOptions?.cachePolicyId &&
      !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultCachePolicy('DefDynamic'))
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDefaultCachePolicy('DefDynamic'),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        resource: getCloudfrontDefaultDynamicCachePolicyResource(stackName)
      });
    }
    // now we deal with policies from route rewrites
    if (cdn.routeRewrites) {
      cdn.routeRewrites.forEach((routeRewriteRule) => {
        const routeRewriteType = routeRewriteRule.routeTo?.type || type;
        if (
          isCustomCachePolicyNeeded({
            cachingOptions: routeRewriteRule.cachingOptions,
            originType: routeRewriteType,
            stackName
          })
        ) {
          const cachePolicyLogicalName = cfLogicalNames.cloudfrontCustomCachePolicy(
            name,
            getCachePolicyHash({ cachingOptions: routeRewriteRule.cachingOptions })
          );
          if (!templateManager.getCfResourceFromTemplate(cachePolicyLogicalName)) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cachePolicyLogicalName,
              nameChain,
              resource: getCloudfrontCustomizedCachePolicyResource({
                stpResourceNameName: name,
                cachingOptions: routeRewriteRule.cachingOptions,
                originType: routeRewriteType,
                stackName
              })
            });
          }
        } else if (!routeRewriteRule.cachingOptions?.cachePolicyId) {
          if (
            routeRewriteType === 'bucket' &&
            !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultCachePolicy('DefStatic'))
          ) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.cloudfrontDefaultCachePolicy('DefStatic'),
              nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
              resource: getCloudfrontDefaultStaticCachePolicyResource(stackName)
            });
          } else if (
            !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultCachePolicy('DefDynamic'))
          ) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.cloudfrontDefaultCachePolicy('DefDynamic'),
              nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
              resource: getCloudfrontDefaultDynamicCachePolicyResource(stackName)
            });
          }
        }
      });
    }
    // cache policies END

    // request policies START
    // first we are dealing with origin request policy which will be used for default cache behaviour
    if (
      isCustomOriginRequestPolicyNeeded({
        forwardingOptions: cdn.forwardingOptions,
        originType: configParentResourceType as StpCdnAttachableResourceType,
        stackName
      })
    ) {
      const originRequestPolicyLogicalName = cfLogicalNames.cloudfrontCustomOriginRequestPolicy(
        name,
        getOriginRequestPolicyHash({ forwardingOptions: cdn.forwardingOptions })
      );
      if (!templateManager.getCfResourceFromTemplate(originRequestPolicyLogicalName)) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: originRequestPolicyLogicalName,
          nameChain,
          resource: getCloudfrontCustomizedOriginRequestPolicyResource({
            stpResourceNameName: name,
            forwardingOptions: cdn.forwardingOptions,
            originType: configParentResourceType as StpCdnAttachableResourceType,
            stackName
          })
        });
      }
    } else if (
      !cdn.forwardingOptions?.originRequestPolicyId &&
      !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefDynamic'))
    ) {
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefDynamic'),
        nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
        resource: getCloudfrontDefaultDynamicOriginRequestPolicyResource(stackName)
      });
    }
    // now we deal with policies from route rewrites
    if (cdn.routeRewrites) {
      cdn.routeRewrites.forEach((routeRewriteRule) => {
        const routeRewriteType = routeRewriteRule.routeTo?.type || type;
        if (
          isCustomOriginRequestPolicyNeeded({
            forwardingOptions: routeRewriteRule.forwardingOptions,
            originType: routeRewriteType,
            stackName
          })
        ) {
          const originRequestPolicyLogicalName = cfLogicalNames.cloudfrontCustomOriginRequestPolicy(
            name,
            getOriginRequestPolicyHash({ forwardingOptions: routeRewriteRule.forwardingOptions })
          );
          if (!templateManager.getCfResourceFromTemplate(originRequestPolicyLogicalName)) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: originRequestPolicyLogicalName,
              nameChain,
              resource: getCloudfrontCustomizedOriginRequestPolicyResource({
                stpResourceNameName: name,
                forwardingOptions: routeRewriteRule.forwardingOptions,
                originType: routeRewriteType,
                stackName
              })
            });
          }
        } else if (!routeRewriteRule.forwardingOptions?.originRequestPolicyId) {
          if (
            routeRewriteType === 'bucket' &&
            !templateManager.getCfResourceFromTemplate(cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefStatic'))
          ) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefStatic'),
              nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
              resource: getCloudfrontDefaultStaticOriginRequestPolicyResource(stackName)
            });
          } else if (
            !templateManager.getCfResourceFromTemplate(
              cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefDynamic')
            )
          ) {
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.cloudfrontDefaultOriginRequestPolicy('DefDynamic'),
              nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL],
              resource: getCloudfrontDefaultDynamicOriginRequestPolicyResource(stackName)
            });
          }
        }
      });
    }
    // origin request policies END

    // actual distributions START
    if (!cdn.customDomains?.length) {
      const cdnDefaultDomainName = domainManager.getDefaultDomainForResource({
        stpResourceName: name,
        cdn: true,
        customPrefix:
          configParentResourceType === 'nextjs-web' &&
          `${configManager.findImmediateParent({ nameChain }).name.toLowerCase()}-${globalStateManager.targetStack.stackName}`
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDistribution(
          configParentResourceType === 'nextjs-web' ? configManager.findImmediateParent({ nameChain }).name : name,
          0
        ),
        nameChain,
        resource: getCloudfrontDistributionResource({
          stpResourceName: name,
          cdnCompatibleResource: lambdaProps as StpLambdaFunction,
          defaultOriginType: type as StpCdnAttachableResourceType,
          customDomains: [cdnDefaultDomainName],
          certificateArn: GetAtt(cfLogicalNames.customResourceDefaultDomainCert(), 'usEast1CertArn')
        })
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.customResourceDefaultDomain(
          configParentResourceType === 'nextjs-web' ? configManager.findImmediateParent({ nameChain }).name : name,
          true
        ),
        nameChain,
        resource: getCdnDefaultDomainCustomResource({
          resource: lambdaProps as StpLambdaFunction,
          domainName: cdnDefaultDomainName
        })
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        nameChain,
        paramName: 'cdnUrl',
        paramValue: `https://${cdnDefaultDomainName}`,
        showDuringPrint: true
      });
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'cdnDomain',
        nameChain,
        paramValue: cdnDefaultDomainName,
        showDuringPrint: false
      });
    } else {
      const cloudfrontDistributions = Object.values(getCloudfrontDistributionConfigs(lambdaProps as StpLambdaFunction));
      const allCustomCdnDomains: string[] = [];
      cloudfrontDistributions.forEach(({ domains: domainSet, certificateArn, disableDns }, index) => {
        const domains = Array.from(domainSet);
        const cloudfrontDistributionIndex = index;
        allCustomCdnDomains.push(...domains);
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.cloudfrontDistribution(
            configParentResourceType === 'nextjs-web' ? configManager.findImmediateParent({ nameChain }).name : name,
            cloudfrontDistributionIndex
          ),
          nameChain,
          resource: getCloudfrontDistributionResource({
            stpResourceName: name,
            cdnCompatibleResource: lambdaProps as StpLambdaFunction,
            defaultOriginType: type as StpCdnAttachableResourceType,
            customDomains: domains,
            certificateArn
          })
        });
        if (!disableDns) {
          domains.forEach((domain) => {
            domainManager.validateDomainUsability(domain);
            calculatedStackOverviewManager.addCfChildResource({
              cfLogicalName: cfLogicalNames.dnsRecord(domain),
              nameChain,
              resource: getCloudfrontDnsRecord(domain, lambdaProps as StpLambdaFunction, cloudfrontDistributionIndex)
            });
          });
        }
      });
      if (allCustomCdnDomains.length) {
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          nameChain,
          paramName: 'cdnCustomDomainUrls',
          paramValue: allCustomCdnDomains.map((domainName) => `https://${domainName}`).join(', '),
          showDuringPrint: true
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'cdnCustomDomains',
          nameChain,
          paramValue: allCustomCdnDomains.join(', '),
          showDuringPrint: false
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'cdnDomain',
          nameChain,
          paramValue: GetAtt(
            cfLogicalNames.cloudfrontDistribution(
              (configParentResourceType === 'nextjs-web'
                ? configManager.findImmediateParent({ nameChain })
                : lambdaProps
              ).name,
              0
            ),
            'DomainName'
          ),
          showDuringPrint: false
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'cdnCanonicalDomain',
          nameChain,
          paramValue: Join(
            ',',
            cloudfrontDistributions.map((_, idx) =>
              GetAtt(
                cfLogicalNames.cloudfrontDistribution(
                  (configParentResourceType === 'nextjs-web'
                    ? configManager.findImmediateParent({ nameChain })
                    : lambdaProps
                  ).name,
                  idx
                ),
                'DomainName'
              )
            )
          ),
          showDuringPrint: cloudfrontDistributions.some(({ disableDns }) => disableDns)
        });
      }
    }
    // actual distributions END
  }
};
