import type { StackResourceSummary } from '@aws-sdk/client-cloudformation';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getNumberOrUndefined = (value: any) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return undefined;
};

const getArrayLength = (value: any) => (Array.isArray(value) ? value.length : undefined);

const getStringValue = (value: any) => (typeof value === 'string' ? value : undefined);

const getInstanceSizeBonusSeconds = (instanceClass?: string) => {
  if (!instanceClass || typeof instanceClass !== 'string') return 0;
  const size = instanceClass.split('.').pop() || '';
  if (size === 'micro' || size === 'nano' || size === 'small') return 0;
  if (size === 'medium') return 30;
  if (size === 'large') return 60;
  if (size === 'xlarge') return 120;
  if (size === '2xlarge') return 180;
  if (size === '4xlarge') return 240;
  if (size === '8xlarge') return 360;
  if (size === '12xlarge' || size === '16xlarge' || size === '24xlarge') return 480;
  return 60;
};

const resourceTypesToSkip = new Set([
  'AWS::IAM::Role',
  'AWS::IAM::Policy',
  'AWS::IAM::InstanceProfile',
  'AWS::Logs::LogGroup',
  'AWS::Logs::SubscriptionFilter',
  'AWS::EC2::SecurityGroup',
  'AWS::EC2::RouteTable',
  'AWS::EC2::Route',
  'AWS::EC2::Subnet',
  'AWS::EC2::VPC',
  'AWS::EC2::InternetGateway',
  'AWS::EC2::VPCGatewayAttachment',
  'AWS::EC2::SubnetRouteTableAssociation',
  'AWS::EC2::LaunchTemplate',
  'AWS::EC2::EIP',
  'AWS::S3::BucketPolicy',
  'AWS::SQS::QueuePolicy',
  'AWS::Lambda::Permission',
  'AWS::Lambda::EventInvokeConfig',
  'AWS::CloudWatch::Alarm',
  'AWS::ApplicationAutoScaling::ScalableTarget',
  'AWS::ApplicationAutoScaling::ScalingPolicy',
  'AWS::Route53::RecordSet'
]);

const applyActionMultiplier = ({
  baseSeconds,
  action,
  updateMultiplier,
  deleteMultiplier,
  minSeconds
}: {
  baseSeconds: number;
  action: 'create' | 'update' | 'delete' | 'rollback';
  updateMultiplier?: number;
  deleteMultiplier?: number;
  minSeconds?: number;
}) => {
  if (action === 'update') {
    const result = Math.round(baseSeconds * (updateMultiplier ?? 0.7));
    return Math.max(minSeconds ?? 20, result);
  }
  if (action === 'delete' || action === 'rollback') {
    const result = Math.round(baseSeconds * (deleteMultiplier ?? 0.3));
    return Math.max(minSeconds ?? 20, result);
  }
  return baseSeconds;
};

const getDeregistrationDelaySeconds = (attributes: any) => {
  if (!Array.isArray(attributes)) return 0;
  const value = attributes.find((attr) => attr?.Key === 'deregistration_delay.timeout_seconds')?.Value;
  return getNumberOrUndefined(value) || 0;
};

const optimisticStabilizationTypes = new Set([
  'AWS::EC2::Instance',
  'AWS::ECS::Service',
  'AWS::AutoScaling::AutoScalingGroup',
  'AWS::ElasticLoadBalancingV2::LoadBalancer',
  'AWS::ElasticLoadBalancingV2::TargetGroup',
  'AWS::Lambda::Function',
  'AWS::ApiGatewayV2::Stage',
  'AWS::ECS::TaskDefinition',
  'AWS::ECS::Cluster',
  'AWS::EC2::NatGateway',
  'AWS::EC2::VPCEndpoint'
]);

const getOptimisticStabilizationRatio = (resourceType?: string) => {
  if (!resourceType) return 1;
  return optimisticStabilizationTypes.has(resourceType) ? 0.7 : 1;
};

const resourceTypeEstimateSeconds: {
  [resourceType: string]: ({
    resourceProps,
    oldResourceProps,
    action
  }: {
    resourceProps?: any;
    oldResourceProps?: any;
    action: 'create' | 'update' | 'delete' | 'rollback';
  }) => number;
} = {
  'AWS::EC2::Instance': ({ action }) => applyActionMultiplier({ baseSeconds: 40, action, updateMultiplier: 0.5 }),
  'AWS::RDS::DBInstance': ({ resourceProps, oldResourceProps, action }) => {
    const allocatedStorage = getNumberOrUndefined(resourceProps?.AllocatedStorage) || 20;
    const multiAz = resourceProps?.MultiAZ === true;
    const instanceClass = resourceProps?.DBInstanceClass;
    const storageBonus = clamp(allocatedStorage * 3, 0, 600);
    const baseSeconds = 900 + (multiAz ? 600 : 0) + storageBonus + getInstanceSizeBonusSeconds(instanceClass);
    const oldVersion = getStringValue(oldResourceProps?.EngineVersion);
    const newVersion = getStringValue(resourceProps?.EngineVersion);
    const versionChangePenalty = oldVersion && newVersion && oldVersion !== newVersion ? 1200 : 0;
    if (action === 'delete' || action === 'rollback') {
      return Math.max(180, Math.round(baseSeconds * 0.3));
    }
    if (action === 'update') {
      return Math.max(600, Math.round(baseSeconds * 1.3) + versionChangePenalty);
    }
    return baseSeconds + versionChangePenalty;
  },
  'AWS::RDS::DBCluster': ({ resourceProps, action }) => {
    const engineMode = resourceProps?.EngineMode;
    const isServerless = engineMode === 'serverless' || !!resourceProps?.ServerlessV2ScalingConfiguration;
    const baseSeconds = 900 + (isServerless ? 300 : 0);
    if (action === 'delete' || action === 'rollback') return Math.max(180, Math.round(baseSeconds * 0.3));
    if (action === 'update') return Math.max(420, Math.round(baseSeconds * 1.2));
    return baseSeconds;
  },
  'AWS::OpenSearchService::Domain': ({ resourceProps, action }) => {
    const instanceCount = getNumberOrUndefined(resourceProps?.ClusterConfig?.InstanceCount) || 1;
    const dedicatedMasterCount = getNumberOrUndefined(resourceProps?.ClusterConfig?.DedicatedMasterCount) || 0;
    const warmCount = getNumberOrUndefined(resourceProps?.ClusterConfig?.WarmCount) || 0;
    const multiAz =
      resourceProps?.ClusterConfig?.ZoneAwarenessEnabled || resourceProps?.ClusterConfig?.MultiAZWithStandbyEnabled;
    const baseSeconds =
      1500 +
      clamp((instanceCount - 1) * 240, 0, 1800) +
      clamp(dedicatedMasterCount * 180, 0, 900) +
      clamp(warmCount * 120, 0, 900) +
      (multiAz ? 300 : 0);
    if (action === 'delete' || action === 'rollback') return Math.max(240, Math.round(baseSeconds * 0.25));
    if (action === 'update') return Math.max(600, Math.round(baseSeconds * 1.1));
    return baseSeconds;
  },
  'AWS::ElastiCache::ReplicationGroup': ({ resourceProps, action }) => {
    const nodeGroups = getNumberOrUndefined(resourceProps?.NumNodeGroups);
    const replicasPerNodeGroup = getNumberOrUndefined(resourceProps?.ReplicasPerNodeGroup);
    const cacheClusters = getNumberOrUndefined(resourceProps?.NumCacheClusters);
    const shardCount = nodeGroups || 1;
    const replicas = replicasPerNodeGroup ?? (cacheClusters ? Math.max(cacheClusters - 1, 0) : 0);
    const baseSeconds = 600 + clamp(shardCount * 180, 0, 1200) + clamp(replicas * 120, 0, 1200);
    return applyActionMultiplier({
      baseSeconds,
      action,
      updateMultiplier: 1.2,
      deleteMultiplier: 0.35,
      minSeconds: 120
    });
  },
  'AWS::EFS::FileSystem': ({ action }) => applyActionMultiplier({ baseSeconds: 300, action, updateMultiplier: 1.1 }),
  'AWS::EFS::MountTarget': ({ action }) => applyActionMultiplier({ baseSeconds: 120, action }),
  'AWS::EFS::AccessPoint': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::DynamoDB::GlobalTable': ({ resourceProps, action }) => {
    const replicaCount = getArrayLength(resourceProps?.Replicas) || 1;
    const baseSeconds = 240 + clamp((replicaCount - 1) * 120, 0, 600);
    return applyActionMultiplier({
      baseSeconds,
      action,
      updateMultiplier: 1.1,
      deleteMultiplier: 0.35,
      minSeconds: 60
    });
  },
  'AWS::DynamoDB::Table': ({ resourceProps, action }) => {
    const billingMode = resourceProps?.BillingMode;
    const baseSeconds = 90 + (billingMode === 'PROVISIONED' ? 30 : 0);
    return applyActionMultiplier({
      baseSeconds,
      action,
      updateMultiplier: 1.1,
      deleteMultiplier: 0.35,
      minSeconds: 30
    });
  },
  'AWS::ECS::Service': ({ resourceProps, action }) => {
    const desired = getNumberOrUndefined(resourceProps?.DesiredCount) || 1;
    const deploymentController = resourceProps?.DeploymentController?.Type;
    const gracePeriod = getNumberOrUndefined(resourceProps?.HealthCheckGracePeriodSeconds) || 0;
    const usesFargate =
      resourceProps?.LaunchType === 'FARGATE' ||
      (Array.isArray(resourceProps?.CapacityProviderStrategy) &&
        resourceProps?.CapacityProviderStrategy.some((provider) =>
          String(provider?.CapacityProvider || '')
            .toUpperCase()
            .includes('FARGATE')
        ));
    if (action === 'delete' || action === 'rollback') return 120;
    const healthOverhead = gracePeriod + 60;
    const baseSeconds =
      180 +
      clamp(desired * healthOverhead, 0, 2400) +
      (usesFargate ? 60 : 0) +
      (deploymentController === 'CODE_DEPLOY' ? 300 : 0);
    if (action === 'update') {
      const imagePullSeconds = usesFargate ? 90 : 45;
      const minHealthyPercent =
        getNumberOrUndefined(resourceProps?.DeploymentConfiguration?.MinimumHealthyPercent) || 100;
      const deploymentWaves = minHealthyPercent >= 100 ? 2 : 1;
      const waveSeconds = gracePeriod + imagePullSeconds + 60;
      const estimated = 180 + clamp(desired * waveSeconds * deploymentWaves, 0, 3000);
      return Math.max(180, estimated);
    }
    return baseSeconds;
  },
  'Stacktape::ECSBlueGreenV1::Service': ({ resourceProps, action }) => {
    const desired = getNumberOrUndefined(resourceProps?.DesiredCount) || 1;
    const baseSeconds = 420 + clamp(desired * 120, 0, 2400);
    return applyActionMultiplier({ baseSeconds, action, updateMultiplier: 1, deleteMultiplier: 0.4, minSeconds: 120 });
  },
  'AWS::AutoScaling::AutoScalingGroup': ({ resourceProps, action }) => {
    const desired = Math.max(
      getNumberOrUndefined(resourceProps?.DesiredCapacity) || 0,
      getNumberOrUndefined(resourceProps?.MinSize) || 0,
      1
    );
    const baseSeconds = 180 + clamp(desired * 90, 0, 1800);
    return applyActionMultiplier({ baseSeconds, action, updateMultiplier: 1, deleteMultiplier: 0.4, minSeconds: 60 });
  },
  'AWS::Batch::ComputeEnvironment': ({ resourceProps, action }) => {
    const computeResources = resourceProps?.ComputeResources || {};
    const vcpus =
      getNumberOrUndefined(computeResources?.DesiredvCpus) || getNumberOrUndefined(computeResources?.MinvCpus) || 0;
    const type = computeResources?.Type;
    const vcpuBonus = clamp(Math.ceil(vcpus / 4) * 120, 0, 1800);
    const baseSeconds = (type === 'FARGATE' || type === 'FARGATE_SPOT' ? 300 : 600) + vcpuBonus;
    return applyActionMultiplier({ baseSeconds, action, updateMultiplier: 1, deleteMultiplier: 0.4, minSeconds: 120 });
  },
  'AWS::Batch::JobQueue': ({ action }) => applyActionMultiplier({ baseSeconds: 60, action }),
  'AWS::Batch::JobDefinition': ({ action }) => applyActionMultiplier({ baseSeconds: 60, action }),
  'AWS::EC2::NatGateway': ({ action }) => applyActionMultiplier({ baseSeconds: 180, action, deleteMultiplier: 0.4 }),
  'AWS::EC2::VPCEndpoint': ({ action }) => applyActionMultiplier({ baseSeconds: 120, action, deleteMultiplier: 0.4 }),
  'AWS::ElasticLoadBalancingV2::LoadBalancer': ({ resourceProps, action }) => {
    const type = resourceProps?.Type;
    const baseSeconds = 150 + (type === 'network' ? 60 : 0);
    if (action === 'delete' || action === 'rollback') {
      const delay = getDeregistrationDelaySeconds(resourceProps?.LoadBalancerAttributes);
      return Math.max(90, Math.round(baseSeconds * 0.5) + delay);
    }
    return applyActionMultiplier({ baseSeconds, action, updateMultiplier: 0.8 });
  },
  'AWS::ElasticLoadBalancingV2::TargetGroup': ({ resourceProps, action }) => {
    const baseSeconds = 60;
    if (action === 'delete' || action === 'rollback') {
      const delay = getDeregistrationDelaySeconds(resourceProps?.TargetGroupAttributes);
      return Math.max(30, Math.round(baseSeconds * 0.4) + delay);
    }
    return applyActionMultiplier({ baseSeconds, action, updateMultiplier: 0.8 });
  },
  'AWS::ElasticLoadBalancingV2::Listener': ({ action }) => applyActionMultiplier({ baseSeconds: 45, action }),
  'AWS::ElasticLoadBalancingV2::ListenerRule': ({ action }) => applyActionMultiplier({ baseSeconds: 20, action }),
  'AWS::ElasticLoadBalancingV2::ListenerCertificate': ({ action }) =>
    applyActionMultiplier({ baseSeconds: 20, action }),
  'AWS::CloudFront::Distribution': ({ resourceProps, action }) => {
    const aliases = getArrayLength(resourceProps?.DistributionConfig?.Aliases) || 0;
    const baseSeconds = 900 + clamp(aliases * 120, 0, 1200);
    if (action === 'delete' || action === 'rollback') return Math.max(300, Math.round(baseSeconds * 0.35));
    if (action === 'update') return Math.max(600, Math.round(baseSeconds * 0.7));
    return baseSeconds;
  },
  'AWS::CloudFront::Function': ({ action }) => applyActionMultiplier({ baseSeconds: 45, action }),
  'AWS::CloudFront::CachePolicy': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::CloudFront::OriginRequestPolicy': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::CloudFront::CloudFrontOriginAccessIdentity': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::Lambda::Function': ({ resourceProps, action }) => {
    const memory = getNumberOrUndefined(resourceProps?.MemorySize) || 128;
    const vpcConfig = resourceProps?.VpcConfig;
    const storage = getNumberOrUndefined(resourceProps?.EphemeralStorage?.Size) || 512;
    const baseSeconds = 60 + (memory >= 1024 ? 20 : 0) + (vpcConfig ? 60 : 0) + (storage > 512 ? 20 : 0);
    return applyActionMultiplier({ baseSeconds, action, updateMultiplier: 0.7, deleteMultiplier: 0.4, minSeconds: 20 });
  },
  'AWS::Lambda::Alias': ({ resourceProps, action }) => {
    const provisioned = getNumberOrUndefined(
      resourceProps?.ProvisionedConcurrencyConfig?.ProvisionedConcurrentExecutions
    );
    if (!provisioned) return 30;
    const baseSeconds = 120 + clamp(provisioned * 3, 0, 300);
    return applyActionMultiplier({ baseSeconds, action, updateMultiplier: 0.9, deleteMultiplier: 0.4, minSeconds: 30 });
  },
  'AWS::CodeDeploy::DeploymentGroup': ({ action }) => applyActionMultiplier({ baseSeconds: 120, action }),
  'AWS::CodeDeploy::Application': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::ServiceDiscovery::PrivateDnsNamespace': ({ action }) => applyActionMultiplier({ baseSeconds: 120, action }),
  'AWS::ServiceDiscovery::Service': ({ action }) => applyActionMultiplier({ baseSeconds: 60, action }),
  'AWS::KinesisFirehose::DeliveryStream': ({ action }) => applyActionMultiplier({ baseSeconds: 180, action }),
  'AWS::Events::Archive': ({ action }) => applyActionMultiplier({ baseSeconds: 60, action }),
  'AWS::Events::EventBus': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::Events::Rule': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::Scheduler::Schedule': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::ApiGatewayV2::Api': ({ action }) => applyActionMultiplier({ baseSeconds: 60, action }),
  'AWS::ApiGatewayV2::Integration': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::ApiGatewayV2::Route': ({ action }) => applyActionMultiplier({ baseSeconds: 20, action }),
  'AWS::ApiGatewayV2::Authorizer': ({ action }) => applyActionMultiplier({ baseSeconds: 40, action }),
  'AWS::ApiGatewayV2::Stage': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::ApiGatewayV2::DomainName': ({ action }) => applyActionMultiplier({ baseSeconds: 120, action }),
  'AWS::ApiGatewayV2::ApiMapping': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::ApiGatewayV2::VpcLink': ({ action }) => applyActionMultiplier({ baseSeconds: 180, action }),
  'AWS::Cognito::UserPool': ({ action }) => applyActionMultiplier({ baseSeconds: 120, action }),
  'AWS::Cognito::UserPoolClient': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::Cognito::UserPoolDomain': ({ action }) => applyActionMultiplier({ baseSeconds: 120, action }),
  'AWS::Cognito::UserPoolIdentityProvider': ({ action }) => applyActionMultiplier({ baseSeconds: 120, action }),
  'AWS::Cognito::UserPoolUICustomizationAttachment': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::SNS::Topic': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::SNS::Subscription': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::SQS::Queue': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::ECS::Cluster': ({ action }) => applyActionMultiplier({ baseSeconds: 60, action }),
  'AWS::ECS::CapacityProvider': ({ action }) => applyActionMultiplier({ baseSeconds: 120, action }),
  'AWS::ECS::ClusterCapacityProviderAssociations': ({ action }) => applyActionMultiplier({ baseSeconds: 60, action }),
  'AWS::ECS::TaskDefinition': ({ action }) => applyActionMultiplier({ baseSeconds: 15, action }),
  'AWS::StepFunctions::StateMachine': ({ action }) => applyActionMultiplier({ baseSeconds: 60, action }),
  'AWS::Lambda::EventSourceMapping': ({ action }) => applyActionMultiplier({ baseSeconds: 45, action }),
  'AWS::Kinesis::StreamConsumer': ({ action }) => applyActionMultiplier({ baseSeconds: 60, action }),
  'AWS::SSM::Association': ({ action }) => applyActionMultiplier({ baseSeconds: 120, action }),
  'AWS::SSM::Document': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::S3::Bucket': ({ action }) => {
    if (action === 'delete' || action === 'rollback') return 300;
    return applyActionMultiplier({ baseSeconds: 20, action });
  },
  'AWS::ECR::Repository': ({ action }) => applyActionMultiplier({ baseSeconds: 30, action }),
  'AWS::Budgets::Budget': ({ action }) => applyActionMultiplier({ baseSeconds: 20, action }),
  'AWS::CloudFormation::WaitCondition': ({ resourceProps }) => {
    const timeoutSeconds = getNumberOrUndefined(resourceProps?.Timeout) || 300;
    return Math.max(30, timeoutSeconds);
  },
  'AWS::CloudFormation::WaitConditionHandle': ({ action }) =>
    applyActionMultiplier({ baseSeconds: 10, action, updateMultiplier: 0.5, deleteMultiplier: 0.5 })
};

const getResourceEstimateSeconds = ({
  resourceType,
  resourceProps,
  oldResourceProps,
  action
}: {
  resourceType?: string;
  resourceProps?: any;
  oldResourceProps?: any;
  action: 'create' | 'update' | 'delete' | 'rollback';
}) => {
  if (!resourceType || resourceTypesToSkip.has(resourceType)) return 0;
  if (resourceType === 'AWS::CloudFormation::CustomResource' || resourceType.startsWith('Custom::')) {
    if (action === 'delete' || action === 'rollback') return 60;
    if (action === 'update') return 90;
    return 60;
  }
  const estimator = resourceTypeEstimateSeconds[resourceType];
  if (!estimator) return 0;
  return estimator({ resourceProps, oldResourceProps, action });
};

const getSubReferences = (value: string, resourceNames: Set<string>) => {
  const matches = value.matchAll(/\$\{([^}]+)\}/g);
  const found: string[] = [];
  for (const match of matches) {
    const token = match[1];
    if (!token) continue;
    const logicalName = token.split('.')[0];
    if (resourceNames.has(logicalName)) found.push(logicalName);
  }
  return found;
};

const collectDependencies = (value: any, resourceNames: Set<string>, result: Set<string>) => {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => collectDependencies(item, resourceNames, result));
    return;
  }
  if (typeof value !== 'object') return;
  if (typeof value.Ref === 'string') {
    if (resourceNames.has(value.Ref)) result.add(value.Ref);
    return;
  }
  if (value['Fn::GetAtt']) {
    const getAtt = value['Fn::GetAtt'];
    if (Array.isArray(getAtt) && typeof getAtt[0] === 'string') {
      if (resourceNames.has(getAtt[0])) result.add(getAtt[0]);
      return;
    }
    if (typeof getAtt === 'string') {
      const logicalName = getAtt.split('.')[0];
      if (resourceNames.has(logicalName)) result.add(logicalName);
      return;
    }
  }
  if (value['Fn::Sub']) {
    const subValue = value['Fn::Sub'];
    if (typeof subValue === 'string') {
      getSubReferences(subValue, resourceNames).forEach((name) => result.add(name));
    } else if (Array.isArray(subValue) && typeof subValue[0] === 'string') {
      getSubReferences(subValue[0], resourceNames).forEach((name) => result.add(name));
      if (subValue[1]) collectDependencies(subValue[1], resourceNames, result);
    }
  }
  Object.values(value).forEach((child) => collectDependencies(child, resourceNames, result));
};

const getResourceDependencies = ({ resourceDef, resourceNames }: { resourceDef: any; resourceNames: Set<string> }) => {
  if (!resourceDef) return [];
  const deps = new Set<string>();
  const dependsOn = resourceDef.DependsOn;
  if (Array.isArray(dependsOn)) {
    dependsOn.forEach((dep) => {
      if (typeof dep === 'string' && resourceNames.has(dep)) deps.add(dep);
    });
  } else if (typeof dependsOn === 'string' && resourceNames.has(dependsOn)) {
    deps.add(dependsOn);
  }
  collectDependencies(resourceDef.Properties, resourceNames, deps);
  return Array.from(deps);
};

const getCriticalPathSeconds = ({
  resourceEstimatesSeconds,
  dependencyMap,
  resourceTypes
}: {
  resourceEstimatesSeconds: { [logicalName: string]: number };
  dependencyMap: { [logicalName: string]: string[] };
  resourceTypes: { [logicalName: string]: string | undefined };
}) => {
  const visiting = new Set<string>();
  const memo: { [logicalName: string]: number } = {};
  const compute = (logicalName: string): number => {
    if (memo[logicalName] !== undefined) return memo[logicalName];
    if (visiting.has(logicalName)) return 0;
    visiting.add(logicalName);
    const deps = dependencyMap[logicalName] || [];
    const maxDep = deps.reduce((max, dep) => {
      const depTotal = compute(dep);
      const depDuration = resourceEstimatesSeconds[dep] || 0;
      const ratio = getOptimisticStabilizationRatio(resourceTypes[dep]);
      const effectiveCompletion = Math.max(0, depTotal - depDuration * (1 - ratio));
      return Math.max(max, effectiveCompletion);
    }, 0);
    const total = maxDep + (resourceEstimatesSeconds[logicalName] || 0);
    memo[logicalName] = total;
    visiting.delete(logicalName);
    return total;
  };
  return Object.keys(resourceEstimatesSeconds).reduce((max, logicalName) => {
    return Math.max(max, compute(logicalName));
  }, 0);
};

const getImplicitEcsServiceUpdates = ({
  template,
  oldTemplate,
  updatedResourceLogicalNames
}: {
  template?: CloudformationTemplate;
  oldTemplate?: CloudformationTemplate;
  updatedResourceLogicalNames: string[];
}) => {
  const allResources = template?.Resources || oldTemplate?.Resources || {};
  const resourceNames = new Set(Object.keys(allResources));
  const updatedSet = new Set(updatedResourceLogicalNames);
  const changedTaskDefinitions = new Set(
    updatedResourceLogicalNames.filter(
      (logicalName) => allResources?.[logicalName]?.Type === 'AWS::ECS::TaskDefinition'
    )
  );
  if (!changedTaskDefinitions.size) return [];
  return Object.entries(allResources)
    .filter(([logicalName, resource]) => {
      if (updatedSet.has(logicalName)) return false;
      if (resource?.Type !== 'AWS::ECS::Service' && resource?.Type !== 'Stacktape::ECSBlueGreenV1::Service')
        return false;
      const deps = getResourceDependencies({ resourceDef: resource, resourceNames });
      return deps.some((dep) => changedTaskDefinitions.has(dep));
    })
    .map(([logicalName]) => logicalName);
};

export const getStackDeploymentEstimate = ({
  cfStackAction,
  template,
  oldTemplate,
  existingStackResources,
  resourceLogicalNames
}: {
  cfStackAction: 'create' | 'update' | 'delete' | 'rollback';
  template?: CloudformationTemplate;
  oldTemplate?: CloudformationTemplate;
  existingStackResources?: StackResourceSummary[];
  resourceLogicalNames?: string[];
}) => {
  const extraUpdateResources =
    cfStackAction === 'update' && resourceLogicalNames?.length
      ? getImplicitEcsServiceUpdates({
          template,
          oldTemplate,
          updatedResourceLogicalNames: resourceLogicalNames
        })
      : [];
  const resourceLogicalNamesForEstimate =
    resourceLogicalNames?.length || extraUpdateResources.length
      ? Array.from(new Set([...(resourceLogicalNames || []), ...extraUpdateResources]))
      : undefined;
  const allResources: { [logicalName: string]: { Type?: string; Properties?: any } } =
    cfStackAction === 'delete' || cfStackAction === 'rollback'
      ? Object.fromEntries(
          (existingStackResources || []).map((resource) => [
            resource.LogicalResourceId,
            { Type: resource.ResourceType }
          ])
        )
      : template?.Resources || {};

  const resources: { [logicalName: string]: { Type?: string; Properties?: any } } =
    resourceLogicalNamesForEstimate?.length
      ? Object.fromEntries(
          resourceLogicalNamesForEstimate.map((logicalName) => {
            const fromNew = template?.Resources?.[logicalName];
            const fromOld = oldTemplate?.Resources?.[logicalName];
            return [logicalName, fromNew || fromOld || allResources[logicalName] || {}];
          })
        )
      : allResources;

  const resourceEstimatesSeconds: { [logicalName: string]: number } = {};
  const allResourceEstimatesSeconds: { [logicalName: string]: number } = {};
  const resourceNames = new Set(Object.keys(resources));
  const resourceDefinitions = template?.Resources || oldTemplate?.Resources || {};
  const resourceTypes = Object.fromEntries(
    Object.entries(resources).map(([logicalName, resource]) => [logicalName, resource?.Type])
  );
  const dependencyMap = Object.fromEntries(
    Object.keys(resources).map((logicalName) => [
      logicalName,
      getResourceDependencies({
        resourceDef: resourceDefinitions?.[logicalName] || resources[logicalName],
        resourceNames
      })
    ])
  );
  Object.entries(resources).forEach(([logicalName, resource]) => {
    const seconds = getResourceEstimateSeconds({
      resourceType: resource?.Type,
      resourceProps: resource?.Properties,
      oldResourceProps: oldTemplate?.Resources?.[logicalName]?.Properties,
      action: cfStackAction
    });
    allResourceEstimatesSeconds[logicalName] = seconds;
    if (seconds > 0) {
      resourceEstimatesSeconds[logicalName] = seconds;
    }
  });
  const totalSeconds = getCriticalPathSeconds({
    resourceEstimatesSeconds: allResourceEstimatesSeconds,
    dependencyMap,
    resourceTypes
  });
  return { totalSeconds, resourceEstimatesSeconds };
};

export const getEstimatedRemainingPercent = ({
  totalSeconds,
  startTime,
  now
}: {
  totalSeconds: number;
  startTime?: Date;
  now: Date;
}) => {
  if (!totalSeconds || !startTime) return null;
  const elapsedSeconds = Math.max(0, (now.getTime() - startTime.getTime()) / 1000);
  const remainingRatio = clamp((totalSeconds - elapsedSeconds) / totalSeconds, 0, 1);
  return Math.round(remainingRatio * 100);
};
