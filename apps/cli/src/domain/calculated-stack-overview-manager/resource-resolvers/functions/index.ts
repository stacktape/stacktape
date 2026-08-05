import type { Environment, FunctionProperties } from '@stacktape/cloudformation/resources/aws-lambda-function';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { getAtt, join, ref } from '@stacktape/cloudformation/intrinsics';
import type { HelperLambdaName } from '@config';
import type {
  StpHelperLambdaFunction,
  StpLambdaFunction
} from '@domain-services/config-manager/resolved-types/functions';
import type { StpCdnAttachableResourceType } from '@domain-services/config-manager/resolved-types/resources';

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
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfEvaluatedLinks } from '@domain-services/calculated-stack-overview-manager/cloudformation-links';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';

import { tagNames } from '@stacktape/naming/tag-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { isCompositeWebResourceType } from '@utils/composite-web-resources';
import { getAugmentedEnvironment, getLanguageFromExtension } from '@utils/environment';
import { CliError } from '@utils/errors';
import { getLambdaIssueFilterPattern, isIssueDetectionSupportedLanguage } from '../_utils/issue-detection';
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
import type { ResourceWithPresentCdn } from '../_utils/cdn';
import {
  getResolvedConnectToEnvironmentVariables,
  mergeConnectToEnvironmentVariables
} from '../_utils/connect-to-helper';
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
import type { EsLanguageSpecificConfig } from '@stacktape/config/deployment-artifacts';
import type { LambdaEfsMount, LambdaS3FilesMount } from '@stacktape/config/functions';
import { DEFAULT_LAMBDA_NODE_VERSION } from '@stacktape/packaging/bundlers/constants';
import { resolveNodeVersion } from '@stacktape/packaging/bundlers/node-version';

export const resolveFunctions = async () => {
  // Create shared chunk layer resources (from split bundling) before resolving individual functions
  const layerArtifacts = packagingManager.getLayerArtifacts();
  for (const layer of layerArtifacts) {
    const layerLogicalName = cfLogicalNames.sharedChunkLayer(layer.layerNumber);

    // Create the LayerVersion resource with the S3 key computed during packaging
    const layerResource = cfnResource('AWS::Lambda::LayerVersion', {
      LayerName: `${calculatedStackOverviewManager.context.stackName}-shared-chunk-layer-${layer.layerNumber}`,
      Description: `Shared chunk layer ${layer.layerNumber} for code splitting`,
      CompatibleRuntimes: [`nodejs${DEFAULT_LAMBDA_NODE_VERSION}.x`],
      Content: {
        S3Bucket: deploymentArtifactManager.deploymentBucketName,
        S3Key: layer.s3Key
      }
    });

    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: layerLogicalName,
      resource: layerResource,
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
  }

  configManager.functions.forEach((lambdaProps) => {
    resolveFunction({ lambdaProps });
  });
};

export const resolveFunction = ({ lambdaProps }: { lambdaProps: StpLambdaFunction | StpHelperLambdaFunction }) => {
  const { stackName } = calculatedStackOverviewManager.context;

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
  const efsVolumeMounts = (volumeMounts || []).filter((mount): mount is LambdaEfsMount => mount.type === 'efs');
  const s3FilesVolumeMounts = (volumeMounts || []).filter(
    (mount): mount is LambdaS3FilesMount => mount.type === 's3files'
  );
  const mountedEfsFilesystems = efsVolumeMounts.length
    ? resolveReferencesToMountedEfsFilesystems({ resource: lambdaProps as StpLambdaFunction })
    : [];
  const mountedS3FilesAccessPointArns = s3FilesVolumeMounts.map((mount) => mount.properties.accessPointArn);
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
      mountedEfsFilesystems,
      mountedS3FilesAccessPointArns
    }),
    nameChain
  });
  lambdaDependsOn.push(lambdaRoleLogicalName);
  const iamRoleArnToUse = getAtt(lambdaRoleLogicalName, 'Arn');
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
  const nodeVersion = resolveNodeVersion({
    nodeVersion: languageSpecificConfig?.nodeVersion,
    runtime,
    target: 'lambda'
  });

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
  const fileSystemConfigs = (volumeMounts || []).map((mount) => {
    if (mount.type === 's3files') {
      return {
        Arn: mount.properties.accessPointArn,
        LocalMountPath: mount.properties.mountPath
      };
    }

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
      Arn: getAtt(accessPointLogicalName, 'Arn'),
      LocalMountPath: mount.properties.mountPath
    };
  });
  const lambdaFunctionResource = cfnResource('AWS::Lambda::Function', {
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
    Object.assign(lambdaFunctionResource.Properties, {
      VpcConfig: {
        SecurityGroupIds: [ref(securityGroupLogicalName)],
        SubnetIds: vpcManager.getPublicSubnetIds()
      }
    });
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
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_FUNCTION_VPC_REQUIRED',
        message:
          `Function \`${name}\` cannot connect to VPC-only resources unless it joins the default VPC:\n` +
          resourcesRequiringOnlyVpcAccess
            .map(({ name: refName, type: refType }) => `- \`${refName}\` (${refType})`)
            .join('\n'),
        hints:
          'Set `joinDefaultVpc: true` on the function. A function in the VPC needs appropriate networking to make outbound Internet requests.'
      });
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
      paramValue: getAtt(cfLogicalNames.lambdaUrl(name), 'FunctionUrl'),
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
  // Add layers: user-defined layers + shared chunk layers from split bundling
  const sharedLayerNumbers = packagingManager.getLayerNumbersForLambda(name);
  const sharedLayerRefs = sharedLayerNumbers.map((layerNumber) =>
    getAtt(cfLogicalNames.sharedChunkLayer(layerNumber), 'LayerVersionArn')
  );
  const allLayers = [...(layers || []), ...sharedLayerRefs];
  if (allLayers.length > 5) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_FUNCTION_LAYER_LIMIT_EXCEEDED',
      message: `Function \`${name}\` exceeds the AWS limit of 5 layers (user-defined: ${(layers || []).length}, shared: ${sharedLayerRefs.length}).`,
      hints: 'Reduce the number of user-defined layers or shared-layer dependencies.'
    });
  }
  if (allLayers.length > 0) {
    Object.assign(lambdaFunctionResource.Properties, { Layers: allLayers });
  }
  if (reservedConcurrency) {
    Object.assign(lambdaFunctionResource.Properties, { ReservedConcurrentExecutions: reservedConcurrency });
  }
  // Provisioned concurrency requires an alias pointing to a specific version.
  // If deployment is configured, alias is already created (with code deploy), so we just add provisioned concurrency to it.
  // If no deployment, we create version + alias specifically for provisioned concurrency.
  if (provisionedConcurrency && !deployment) {
    const versionPublisherLogicalName = cfLogicalNames.lambdaVersionPublisherCustomResource(name);
    calculatedStackOverviewManager.addCfChildResource({
      nameChain,
      cfLogicalName: versionPublisherLogicalName,
      resource: getLambdaVersionPublisherCustomResource({ lambdaProps })
    });
    calculatedStackOverviewManager.addCfChildResource({
      nameChain,
      cfLogicalName: cfLogicalNames.lambdaStpAlias(name),
      resource: getLambdaAliasResource({ lambdaProps, provisionedConcurrency })
    });
    // Add codeDigest to version publisher custom resource so it's re-invoked when (and only when) code changes.
    // This replaces the old forceUpdate: Date.now() which caused false positives in diff.
    templateManager.addFinalTemplateOverrideFn(async (template) => {
      const { digest } = deploymentArtifactManager.getLambdaS3UploadInfo({ artifactName, packaging });
      const versionPublisherProperties = template.Resources[versionPublisherLogicalName].Properties as {
        codeDigest?: string;
      };
      versionPublisherProperties.codeDigest = digest;
    });
  }
  if (
    !joinDefaultVpc &&
    accessToAtlasMongoClusterResources.length &&
    thirdPartyProviderManager.getAtlasMongoDbProviderConfig().accessibility &&
    thirdPartyProviderManager.getAtlasMongoDbProviderConfig().accessibility.accessibilityMode !== 'internet'
  ) {
    // if function is not in vpc and is trying to scope (connectTo) atlas mongo cluster and atlas mongo does not allow connections from internet
    const accessibilityMode = thirdPartyProviderManager.getAtlasMongoDbProviderConfig().accessibility.accessibilityMode;
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_FUNCTION_ATLAS_NETWORK_INCOMPATIBLE',
      message:
        `Function \`${name}\` cannot connect to MongoDB Atlas resources limited to \`${accessibilityMode}\` access:\n` +
        accessToAtlasMongoClusterResources.map(({ name: refName }) => `- \`${refName}\``).join('\n'),
      hints: [
        'Set `joinDefaultVpc: true` on the function and configure outbound networking if it needs Internet access.',
        'Alternatively, set `providerConfig.mongoDbAtlas.accessibility.accessibilityMode` to `internet`.'
      ]
    });
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
        paramValue: getAtt(logGroupLogicalName, 'Arn'),
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
    // Issue detection: add subscription filter to detect runtime errors.
    // Skip if logForwarding is configured — CloudWatch allows max 2 subscription filters per log group,
    // and logForwarding already uses one. Third-party tools (Lumigo, Datadog) may use the other.
    const detectedLanguage = getLanguageFromExtension(entryfilePath);
    const hasLogForwarding = !!logging?.logForwarding;
    const isNotServiceLambda = name !== ('stacktapeServiceLambda' as HelperLambdaName);
    const isNotEdgeFunction = (type as string) !== 'edge-lambda-function';
    const isUserManagedPackaging = [
      'prebuilt-image',
      'custom-dockerfile',
      'nixpacks',
      'external-buildpack',
      'custom-artifact'
    ].includes(packagingType || '');
    if (
      configManager.isIssueDetectionEnabled &&
      isIssueDetectionSupportedLanguage(detectedLanguage) &&
      isNotServiceLambda &&
      isNotEdgeFunction &&
      !isUserManagedPackaging &&
      !hasLogForwarding
    ) {
      const serviceLambdaArn = getAtt(configManager.stacktapeServiceLambdaProps.cfLogicalName, 'Arn');
      const subscriptionFilterLogicalName = cfLogicalNames.issueDetectionSubscriptionFilter(name);
      const permissionLogicalName = cfLogicalNames.issueDetectionLogsPermission();

      if (!templateManager.getCfResourceFromTemplate(permissionLogicalName)) {
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: permissionLogicalName,
          nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL, 'stacktapeServiceLambda'],
          resource: cfnResource('AWS::Lambda::Permission', {
            Action: 'lambda:InvokeFunction',
            Principal: `logs.${calculatedStackOverviewManager.context.region}.amazonaws.com`,
            FunctionName: serviceLambdaArn,
            SourceAccount: ref('AWS::AccountId')
          })
        });
      }

      const subscriptionFilterResource = cfnResource('AWS::Logs::SubscriptionFilter', {
        LogGroupName: awsResourceNames.lambdaLogGroup({ lambdaAwsResourceName: resourceName }),
        FilterPattern: getLambdaIssueFilterPattern(detectedLanguage),
        DestinationArn: serviceLambdaArn
      });
      subscriptionFilterResource.DependsOn = [permissionLogicalName, logGroupLogicalName];
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: subscriptionFilterLogicalName,
        nameChain,
        resource: subscriptionFilterResource
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

    const functionProperties = template.Resources[cfLogicalName].Properties as FunctionProperties;
    functionProperties.Code = {
      S3Key: s3Key,
      S3Bucket: deploymentArtifactManager.deploymentBucketName
    };

    functionProperties.Tags = stackManager.getTags([
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
      const environment = {
        Variables: {
          ...((templateResourceProps.Environment as Environment)?.Variables || {})
        }
      };
      templateResourceProps.Environment = environment;
      environment.Variables = Object.fromEntries(
        mergeConnectToEnvironmentVariables(
          Object.entries(environment.Variables).map(([Name, Value]) => ({ Name, Value })),
          variablesToInject
        ).map(({ Name, Value }) => [Name, Value])
      );
    }

    // resolving s3 package
    const { digest, s3Key } = deploymentArtifactManager.getLambdaS3UploadInfo({ artifactName, packaging });

    const functionProperties = template.Resources[cfLogicalName].Properties as FunctionProperties;
    functionProperties.Code = {
      S3Key: s3Key,
      S3Bucket: deploymentArtifactManager.deploymentBucketName
    };

    functionProperties.Tags = stackManager.getTags([{ name: tagNames.codeDigest(), value: digest }]);
  });
  if (configParentResourceType !== 'batch-job') {
    calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
      nameChain,
      paramName: 'arn',
      paramValue: getAtt(cfLogicalName, 'Arn'),
      showDuringPrint: true
    });
  }
  if (destinations) {
    // Use alias qualifier when alias exists (either for deployment or provisioned concurrency)
    const lambdaEventInvokeConfig = cfnResource('AWS::Lambda::EventInvokeConfig', {
      FunctionName: ref(cfLogicalName),
      DestinationConfig: {},
      Qualifier: lambdaProps.aliasLogicalName ? awsResourceNames.lambdaStpAlias() : '$LATEST'
    });
    if (destinations.onFailure) {
      Object.assign(lambdaEventInvokeConfig.Properties.DestinationConfig, {
        OnFailure: { Destination: destinations.onFailure }
      });
    }
    if (destinations.onSuccess) {
      Object.assign(lambdaEventInvokeConfig.Properties.DestinationConfig, {
        OnSuccess: { Destination: destinations.onSuccess }
      });
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
        resource: cfnResource('AWS::CodeDeploy::Application', {
          ApplicationName: awsResourceNames.lambdaCodeDeployApp(calculatedStackOverviewManager.context.stackName),
          ComputePlatform: 'Lambda'
        })
      });
    }
    const deployVersionPublisherLogicalName = cfLogicalNames.lambdaVersionPublisherCustomResource(name);
    calculatedStackOverviewManager.addCfChildResource({
      nameChain,
      cfLogicalName: deployVersionPublisherLogicalName,
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
    // Add codeDigest to version publisher custom resource so it's re-invoked when (and only when) code changes.
    templateManager.addFinalTemplateOverrideFn(async (template) => {
      const { digest } = deploymentArtifactManager.getLambdaS3UploadInfo({ artifactName, packaging });
      const versionPublisherProperties = template.Resources[deployVersionPublisherLogicalName].Properties as {
        codeDigest?: string;
      };
      versionPublisherProperties.codeDigest = digest;
    });
  }
  // add monitoring link (use alias when available for deployment or provisioned concurrency)
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: configParentResourceType === 'batch-job' ? 'metrics-trigger-lambda' : 'metrics',
    nameChain,
    linkValue: cfEvaluatedLinks.lambda({
      awsLambdaName: ref(cfLogicalName),
      tab: 'monitoring',
      alias: lambdaProps.aliasLogicalName && awsResourceNames.lambdaStpAlias()
    })
  });
  calculatedStackOverviewManager.addStacktapeResourceLink({
    linkName: configParentResourceType === 'batch-job' ? 'trigger-lambda-console' : 'console',
    nameChain,
    linkValue: cfEvaluatedLinks.lambda({
      awsLambdaName: ref(cfLogicalName),
      tab: 'testing',
      alias: lambdaProps.aliasLogicalName && awsResourceNames.lambdaStpAlias()
    })
  });
  if (cdn?.enabled) {
    // `resolveFunction` also runs for the helper Lambdas Stacktape synthesizes itself, and those are not members of
    // `StpCdnCompatibleResource`, so no narrowing available here can recover the user shape from the parameter's
    // union. The guard above settles it at runtime: `cdn` comes off `lambdaProps`, and no helper-Lambda producer in
    // `ConfigManager` ever sets a `cdn`, so only a user Lambda with an enabled CDN reaches this block. This records
    // both of those facts once, in place of the identical unchecked cast that used to be repeated at each call below.
    const cdnCompatibleResource = lambdaProps as ResourceWithPresentCdn<StpLambdaFunction>;
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
          isCompositeWebResourceType(configParentResourceType) &&
          `${configManager.findImmediateParent({ nameChain }).name.toLowerCase()}-${calculatedStackOverviewManager.context.stackName}`
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.cloudfrontDistribution(
          isCompositeWebResourceType(configParentResourceType)
            ? configManager.findImmediateParent({ nameChain }).name
            : name,
          0
        ),
        nameChain,
        resource: getCloudfrontDistributionResource({
          stpResourceName: name,
          cdnCompatibleResource,
          defaultOriginType: type as StpCdnAttachableResourceType,
          customDomains: [cdnDefaultDomainName],
          certificateArn: getAtt(cfLogicalNames.customResourceDefaultDomainCert(), 'usEast1CertArn')
        })
      });
      calculatedStackOverviewManager.addCfChildResource({
        cfLogicalName: cfLogicalNames.customResourceDefaultDomain(
          isCompositeWebResourceType(configParentResourceType)
            ? configManager.findImmediateParent({ nameChain }).name
            : name,
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
      calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
        paramName: 'cdnCanonicalDomain',
        nameChain,
        paramValue: getAtt(
          cfLogicalNames.cloudfrontDistribution(
            (isCompositeWebResourceType(configParentResourceType)
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
        paramName: 'cdnCanonicalUrl',
        nameChain,
        paramValue: join('', [
          'https://',
          getAtt(
            cfLogicalNames.cloudfrontDistribution(
              (isCompositeWebResourceType(configParentResourceType)
                ? configManager.findImmediateParent({ nameChain })
                : lambdaProps
              ).name,
              0
            ),
            'DomainName'
          )
        ]),
        showDuringPrint: false
      });
    } else {
      const cloudfrontDistributions = Object.values(getCloudfrontDistributionConfigs(cdnCompatibleResource));
      const allCustomCdnDomains: string[] = [];
      cloudfrontDistributions.forEach(({ domains: domainSet, certificateArn, disableDns }, index) => {
        const domains = Array.from(domainSet);
        const cloudfrontDistributionIndex = index;
        allCustomCdnDomains.push(...domains);
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.cloudfrontDistribution(
            isCompositeWebResourceType(configParentResourceType)
              ? configManager.findImmediateParent({ nameChain }).name
              : name,
            cloudfrontDistributionIndex
          ),
          nameChain,
          resource: getCloudfrontDistributionResource({
            stpResourceName: name,
            cdnCompatibleResource,
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
          paramValue: getAtt(
            cfLogicalNames.cloudfrontDistribution(
              (isCompositeWebResourceType(configParentResourceType)
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
          paramValue: join(
            ',',
            cloudfrontDistributions.map((_, idx) =>
              getAtt(
                cfLogicalNames.cloudfrontDistribution(
                  (isCompositeWebResourceType(configParentResourceType)
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
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'cdnCanonicalUrl',
          nameChain,
          paramValue: join(
            ',',
            cloudfrontDistributions.map((_, idx) =>
              join('', [
                'https://',
                getAtt(
                  cfLogicalNames.cloudfrontDistribution(
                    (isCompositeWebResourceType(configParentResourceType)
                      ? configManager.findImmediateParent({ nameChain })
                      : lambdaProps
                    ).name,
                    idx
                  ),
                  'DomainName'
                )
              ])
            )
          ),
          showDuringPrint: false
        });
      }
    }
    // actual distributions END
  }
};
