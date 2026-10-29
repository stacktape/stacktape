import { configManager } from '@domain-services/config-manager';
import type { CloudFormationList } from '@stacktape/cloudformation/intrinsics';
import type { Ingress } from '@stacktape/cloudformation/resources/aws-ec2-securitygroup';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { ref } from '@stacktape/cloudformation/intrinsics';
import type { StpRedis } from '@domain-services/config-manager/resolved-types/redis';
import type { RedisOssEngine, ValkeyEngine, ValkeyServerlessEngine } from '@stacktape/config/redis';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { getConnectToReferencesForResource } from '@domain-services/config-manager/utils/resource-references';
import { templateManager } from '@domain-services/template-manager';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getCloudFormationLogRetentionDays } from '@utils/cloudformation';
import { ExpectedError } from '@utils/errors';
import type { CloudWatchLogGroupOptions } from '@stacktape/config/log-forwarding';
import { getCloudFormationLogGroupClassProperties } from '../_utils/log-groups';
import { LATEST_VALKEY_SERVERLESS_VERSION, LATEST_VALKEY_VERSION } from './versions';

export type NodeBasedRedisEngine = ValkeyEngine | RedisOssEngine;
type NodeBasedRedis = StpRedis & { engine: NodeBasedRedisEngine };
type ServerlessRedis = StpRedis & { engine: ValkeyServerlessEngine };

const SERVERLESS_PRIMARY_PORT = 6379;
const SERVERLESS_READER_PORT = 6380;

export const isServerlessRedis = (resource: StpRedis): resource is ServerlessRedis =>
  resource.engine.type === 'valkey-serverless';

/** What the previously deployed template holds for this cache, if anything. */
type DeployedRedis =
  | { kind: 'node-based'; engine: 'redis' | 'valkey'; engineVersion?: string }
  | { kind: 'serverless'; majorEngineVersion?: string; subnetIds?: unknown };

export const getDeployedRedis = (resource: StpRedis): DeployedRedis | undefined => {
  const deployedResources = templateManager.oldTemplate?.Resources || {};
  const replicationGroup = deployedResources[cfLogicalNames.redisReplicationGroup(resource.name)]?.Properties as
    | { Engine?: string; EngineVersion?: string }
    | undefined;
  if (replicationGroup) {
    return {
      kind: 'node-based',
      engine: replicationGroup.Engine === 'valkey' ? 'valkey' : 'redis',
      engineVersion: replicationGroup.EngineVersion
    };
  }
  const serverlessCache = deployedResources[cfLogicalNames.redisServerlessCache(resource.name)]?.Properties as
    | { MajorEngineVersion?: string; SubnetIds?: unknown }
    | undefined;
  if (serverlessCache) {
    return {
      kind: 'serverless',
      majorEngineVersion: serverlessCache.MajorEngineVersion,
      subnetIds: serverlessCache.SubnetIds
    };
  }
  return undefined;
};

const compareVersions = (a: string, b: string) => {
  const [aMajor = 0, aMinor = 0] = a.split('.').map(Number);
  const [bMajor = 0, bMinor = 0] = b.split('.').map(Number);
  return aMajor - bMajor || aMinor - bMinor;
};

const configError = (resource: StpRedis, message: string, hint?: string) =>
  new ExpectedError('CONFIG_VALIDATION', `Error in ${resource.type} "${resource.name}": ${message}`, hint);

/**
 * Rejects engine changes that AWS would apply by replacing the cache (losing its data and endpoint) or cannot apply
 * at all, before any CloudFormation work starts.
 */
export const validateRedisEngineChange = ({
  resource,
  deployed
}: {
  resource: StpRedis;
  deployed: DeployedRedis | undefined;
}) => {
  const engineType = resource.engine.type;
  if (!deployed) {
    // Only a deployment knows whether the cache exists; offline commands such as `synth` see no deployed template.
    const { command } = calculatedStackOverviewManager.context;
    if (engineType === 'redis' && (command === 'deploy' || command === 'dev')) {
      throw configError(
        resource,
        'New caches cannot use the Redis OSS engine. AWS publishes no Redis OSS versions after 7.1.',
        'Use `engine.type: valkey` (node-based) or `engine.type: valkey-serverless`. Valkey is compatible with Redis clients.'
      );
    }
    return;
  }
  if (deployed.kind === 'node-based' && engineType === 'valkey-serverless') {
    throw configError(
      resource,
      'This cache is deployed as a node-based cache. Switching to `valkey-serverless` would replace it, giving it a new endpoint and deleting its data.',
      'Keep `engine.type` as it is deployed, or delete the cache (or rename the resource) to create a new serverless cache.'
    );
  }
  if (deployed.kind === 'serverless' && engineType !== 'valkey-serverless') {
    throw configError(
      resource,
      `This cache is deployed as \`valkey-serverless\`. Switching to \`${engineType}\` would replace it, giving it a new endpoint and deleting its data.`,
      'Keep `engine.type: valkey-serverless`, or delete the cache (or rename the resource) to create a new node-based cache.'
    );
  }
  if (deployed.kind === 'node-based' && deployed.engine === 'valkey' && engineType === 'redis') {
    throw configError(
      resource,
      'This cache already runs Valkey. Switching back to the Redis OSS engine is not supported.',
      'Keep `engine.type: valkey`.'
    );
  }
  if (deployed.kind === 'serverless') {
    if (deployed.subnetIds !== undefined && !isSameSubnetSet(deployed.subnetIds, vpcManager.getPublicSubnetIds())) {
      throw configError(
        resource,
        'The subnets of this serverless cache would change. AWS applies a subnet change by replacing the cache, giving it a new endpoint and deleting its data.',
        'Revert the VPC change that moved the subnets, or delete the cache (or rename the resource) to recreate it.'
      );
    }
  }
};

/**
 * The version to deploy. Without an explicit version, a deployed cache keeps the version it runs and a new cache gets
 * the latest one, so a Stacktape update never upgrades a cache implicitly.
 */
export const resolveRedisEngineVersion = ({
  resource,
  deployed
}: {
  resource: StpRedis;
  deployed: DeployedRedis | undefined;
}): string => {
  const { engine } = resource;
  if (engine.type === 'valkey-serverless') {
    const deployedVersion = deployed?.kind === 'serverless' ? deployed.majorEngineVersion : undefined;
    const version = engine.properties?.version || deployedVersion || LATEST_VALKEY_SERVERLESS_VERSION;
    if (deployedVersion && compareVersions(version, deployedVersion) < 0) {
      throw configError(
        resource,
        `The cache runs Valkey ${deployedVersion}; it cannot be downgraded to ${version}.`,
        `Set \`engine.properties.version\` to '${deployedVersion}' or later.`
      );
    }
    return version;
  }
  const deployedVersion =
    deployed?.kind === 'node-based' && deployed.engine === engine.type ? deployed.engineVersion : undefined;
  const version =
    engine.properties.version || deployedVersion || (engine.type === 'valkey' ? LATEST_VALKEY_VERSION : undefined);
  if (deployedVersion && compareVersions(version, deployedVersion) < 0) {
    throw configError(
      resource,
      `The cache runs version ${deployedVersion}; it cannot be downgraded to ${version}.`,
      `Set \`engine.properties.version\` to '${deployedVersion}' or later.`
    );
  }
  return version;
};

export const getRedisParameterGroupResource = ({
  resource,
  engineVersion
}: {
  resource: NodeBasedRedis;
  engineVersion: string;
}) => {
  return cfnResource('AWS::ElastiCache::ParameterGroup', {
    CacheParameterGroupFamily: getCacheParameterGroupFamily({ engine: resource.engine.type, engineVersion }),
    Description: `Parameter group for ${resource.name} replica group in ${calculatedStackOverviewManager.context.stackName} stack.`,
    Properties: {
      'cluster-enabled': resource.engine.properties.enableSharding ? 'yes' : 'no'
    }
  });
};

export const getRedisSubnetGroupResource = ({ resource }: { resource: StpRedis }) => {
  return cfnResource('AWS::ElastiCache::SubnetGroup', {
    Description: `${awsResourceNames.redisReplicationGroupDescription(
      resource.name,
      calculatedStackOverviewManager.context.stackName
    )} subnet group`,
    SubnetIds: vpcManager.getPublicSubnetIds()
  });
};

export const getRedisReplicationGroupResource = ({
  resource,
  engineVersion
}: {
  resource: NodeBasedRedis;
  engineVersion: string;
}) => {
  const { numReplicaNodes, numShards, enableSharding, enableAutomaticFailover, logging } = resource.engine.properties;

  if (enableSharding && (!numReplicaNodes || numReplicaNodes < 1)) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${resource.type} "${resource.name}". When sharding is enabled, "numReplicaNodes" (number of replica nodes) must be set to at least 1.`
    );
  }

  if (enableAutomaticFailover && (!numReplicaNodes || numReplicaNodes < 1)) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${resource.type} "${resource.name}". When automatic failover is enabled, "numReplicaNodes" (number of replica nodes) must be set to at least 1.`
    );
  }
  const replicationGroup = cfnResource('AWS::ElastiCache::ReplicationGroup', {
    Engine: resource.engine.type,
    EngineVersion: engineVersion,
    CacheParameterGroupName: ref(cfLogicalNames.redisParameterGroup(resource.name)),
    CacheNodeType: resource.engine.properties.instanceSize,
    TransitEncryptionEnabled: true,
    AtRestEncryptionEnabled: true,
    AuthToken: resource.defaultUserPassword,
    AutomaticFailoverEnabled: !!(enableSharding || enableAutomaticFailover),
    ReplicationGroupDescription: awsResourceNames.redisReplicationGroupDescription(
      resource.name,
      calculatedStackOverviewManager.context.stackName
    ),
    CacheSubnetGroupName: ref(cfLogicalNames.redisSubnetGroup(resource.name)),
    Port: getRedisPort({ resource }),
    SecurityGroupIds: [ref(cfLogicalNames.redisSecurityGroup(resource.name))],
    LogDeliveryConfigurations: !logging?.disabled
      ? [
          {
            DestinationType: 'cloudwatch-logs',
            DestinationDetails: {
              CloudWatchLogsDetails: { LogGroup: ref(cfLogicalNames.redisLogGroup(resource.name)) }
            },
            LogFormat: logging?.format || 'json',
            LogType: 'slow-log'
          }
        ]
      : undefined,
    NumNodeGroups: enableSharding ? numShards || 1 : undefined,
    NumCacheClusters: !enableSharding ? (numReplicaNodes || 0) + 1 : undefined,
    ReplicasPerNodeGroup: enableSharding ? numReplicaNodes : undefined,
    SnapshotRetentionLimit: resource.automatedBackupRetentionDays,
    ReplicationGroupId: awsResourceNames.redisReplicationGroupId(
      resource.name,
      calculatedStackOverviewManager.context.stackName
    )
  });
  replicationGroup.UpdatePolicy = {
    UseOnlineResharding: true
  };

  return replicationGroup;
};

const subnetKeys = (subnetIds: unknown) =>
  (Array.isArray(subnetIds) ? subnetIds : [subnetIds]).map((subnetId) => JSON.stringify(subnetId)).sort();

const isSameSubnetSet = (a: unknown, b: unknown) => JSON.stringify(subnetKeys(a)) === JSON.stringify(subnetKeys(b));

/**
 * A reused VPC can list the same subnets in another order, and CloudFormation replaces a serverless cache when the list
 * changes at all, so the deployed order is kept while the subnets are the same.
 */
const getServerlessSubnetIds = (resource: StpRedis) => {
  const subnetIds = vpcManager.getPublicSubnetIds();
  const deployed = getDeployedRedis(resource);
  return deployed?.kind === 'serverless' &&
    deployed.subnetIds !== undefined &&
    isSameSubnetSet(deployed.subnetIds, subnetIds)
    ? (deployed.subnetIds as typeof subnetIds)
    : subnetIds;
};

/**
 * Serverless caches have no `AuthToken`. Clients keep authenticating as `default` with `defaultUserPassword` through a
 * password user named `default` in a Valkey user group. A Valkey user group needs no built-in default user, so AWS's
 * passwordless built-in `default` user never gets access.
 */
export const getRedisUserResource = ({ resource }: { resource: ServerlessRedis }) => {
  return cfnResource('AWS::ElastiCache::User', {
    UserId: awsResourceNames.redisUserId(resource.name, calculatedStackOverviewManager.context.stackName),
    UserName: 'default',
    Engine: 'valkey',
    AccessString: 'on ~* &* +@all',
    AuthenticationMode: { Type: 'password', Passwords: [resource.defaultUserPassword] }
  });
};

export const getRedisUserGroupResource = ({ resource }: { resource: ServerlessRedis }) => {
  return cfnResource('AWS::ElastiCache::UserGroup', {
    UserGroupId: awsResourceNames.redisUserGroupId(resource.name, calculatedStackOverviewManager.context.stackName),
    Engine: 'valkey',
    UserIds: [ref(cfLogicalNames.redisUser(resource.name))]
  });
};

export const getRedisServerlessCacheResource = ({
  resource,
  majorEngineVersion
}: {
  resource: ServerlessRedis;
  majorEngineVersion: string;
}) => {
  const { maxDataGb, maxEcpuPerSecond } = resource.engine.properties || {};
  if (maxDataGb !== undefined && (!Number.isInteger(maxDataGb) || maxDataGb < 1 || maxDataGb > 5000)) {
    throw configError(resource, '`maxDataGb` must be a whole number of GB between 1 and 5000.');
  }
  if (
    maxEcpuPerSecond !== undefined &&
    (!Number.isInteger(maxEcpuPerSecond) || maxEcpuPerSecond < 1000 || maxEcpuPerSecond > 15_000_000)
  ) {
    throw configError(resource, '`maxEcpuPerSecond` must be a whole number between 1,000 and 15,000,000.');
  }
  const automatedBackupRetentionDays = resource.automatedBackupRetentionDays;
  if (automatedBackupRetentionDays !== undefined && automatedBackupRetentionDays > 35) {
    throw configError(resource, '`automatedBackupRetentionDays` can be at most 35 for serverless caches.');
  }
  return cfnResource('AWS::ElastiCache::ServerlessCache', {
    ServerlessCacheName: awsResourceNames.redisServerlessCacheName(
      resource.name,
      calculatedStackOverviewManager.context.stackName
    ),
    Description: awsResourceNames.redisReplicationGroupDescription(
      resource.name,
      calculatedStackOverviewManager.context.stackName
    ),
    Engine: 'valkey',
    MajorEngineVersion: majorEngineVersion,
    ConnectionType: 'vpc',
    SecurityGroupIds: [ref(cfLogicalNames.redisSecurityGroup(resource.name))],
    SubnetIds: getServerlessSubnetIds(resource),
    UserGroupId: ref(cfLogicalNames.redisUserGroup(resource.name)),
    SnapshotRetentionLimit: automatedBackupRetentionDays,
    CacheUsageLimits:
      maxDataGb !== undefined || maxEcpuPerSecond !== undefined
        ? {
            DataStorage: maxDataGb !== undefined ? { Maximum: maxDataGb, Unit: 'GB' } : undefined,
            ECPUPerSecond: maxEcpuPerSecond !== undefined ? { Maximum: maxEcpuPerSecond } : undefined
          }
        : undefined
  });
};

export const getCacheParameterGroupFamily = ({
  engine,
  engineVersion
}: {
  engine: NodeBasedRedisEngine['type'];
  engineVersion: string;
}) => {
  const major = engineVersion.split('.')[0];
  if (engine === 'valkey') {
    return `valkey${major}`;
  }
  return major === '6' ? 'redis6.x' : `redis${major}`;
};

export const getRedisSecurityGroupResource = ({ resource }: { resource: StpRedis }) => {
  const [fromPort, toPort] = isServerlessRedis(resource)
    ? [SERVERLESS_PRIMARY_PORT, SERVERLESS_READER_PORT]
    : [getRedisPort({ resource }), getRedisPort({ resource })];
  const basicIngressRules: CloudFormationList<Ingress> =
    !resource.accessibility || resource.accessibility.accessibilityMode === 'vpc'
      ? [{ CidrIp: vpcManager.getVpcCidr(), FromPort: fromPort, ToPort: toPort, IpProtocol: 'tcp' }]
      : resource.accessibility.accessibilityMode === 'scoping-workloads-in-vpc'
        ? getConnectToReferencesForResource({
            activeConfig: configManager,
            nameChain: resource.nameChain,
            admittingCfLogicalName: cfLogicalNames.redisSecurityGroup(resource.name)
          }).map(({ scopingCfLogicalNameOfSecurityGroup }) => ({
            SourceSecurityGroupId: ref(scopingCfLogicalNameOfSecurityGroup),
            FromPort: fromPort,
            ToPort: toPort,
            IpProtocol: 'tcp'
          })) || []
        : [];
  // GroupName and GroupDescription replace the security group when they change; keep them as Stacktape v3 set them.
  return cfnResource('AWS::EC2::SecurityGroup', {
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.redisClusterSecurityGroup(
      resource.name,
      calculatedStackOverviewManager.context.stackName
    ),
    GroupDescription: `Stacktape generated security group for redis cluster ${resource.name} in stack ${calculatedStackOverviewManager.context.stackName}`,
    SecurityGroupIngress: basicIngressRules
  });
};

export const getLogGroupResource = ({
  resource,
  retentionDays,
  logClass
}: {
  resource: StpRedis;
  retentionDays: number;
  logClass?: CloudWatchLogGroupOptions['logClass'];
}) => {
  return cfnResource('AWS::Logs::LogGroup', {
    LogGroupName: awsResourceNames.redisLogGroup(resource.name, calculatedStackOverviewManager.context.stackName),
    ...getCloudFormationLogGroupClassProperties(logClass),
    RetentionInDays: getCloudFormationLogRetentionDays(retentionDays)
  });
};

export const getRedisPort = ({ resource }: { resource: StpRedis }) => {
  const { engine } = resource;
  if (engine.type === 'valkey-serverless') {
    return SERVERLESS_PRIMARY_PORT;
  }
  return engine.properties.port || 6379;
};
