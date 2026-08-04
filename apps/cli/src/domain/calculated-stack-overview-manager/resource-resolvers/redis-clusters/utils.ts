import type { CloudFormationList } from '@stacktape/cloudformation/intrinsics';
import type { Ingress } from '@stacktape/cloudformation/resources/aws-ec2-securitygroup';
import { cfnResource } from '@stacktape/cloudformation/resource';
import { ref } from '@stacktape/cloudformation/intrinsics';
import type { StpRedisCluster } from '@domain-services/config-manager/resolved-types/redis-cluster';
import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { getConnectToReferencesForResource } from '@domain-services/config-manager/utils/resource-references';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { getCloudFormationLogRetentionDays } from '@utils/cloudformation';
import { ExpectedError } from '@utils/errors';

export const getRedisParameterGroupResource = ({ resource }: { resource: StpRedisCluster }) => {
  return cfnResource('AWS::ElastiCache::ParameterGroup', {
    CacheParameterGroupFamily: getCacheParameterGroupFamily({ resource }),
    Description: `Parameter group for ${resource.name} replica group in ${calculatedStackOverviewManager.context.stackName} stack.`,
    Properties: {
      'cluster-enabled': resource.enableSharding ? 'yes' : 'no'
    }
  });
};

export const getRedisSubnetGroupResource = ({ resource }: { resource: StpRedisCluster }) => {
  return cfnResource('AWS::ElastiCache::SubnetGroup', {
    Description: `${awsResourceNames.redisReplicationGroupDescription(
      resource.name,
      calculatedStackOverviewManager.context.stackName
    )} subnet group`,
    SubnetIds: vpcManager.getPublicSubnetIds()
  });
};

export const getRedisReplicationGroupResource = ({ resource }: { resource: StpRedisCluster }) => {
  const { numReplicaNodes, numShards } = resource;

  if (resource.enableSharding && (!numReplicaNodes || numReplicaNodes < 1)) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${resource.type} "${resource.name}". When sharding is enabled, "numReplicaNodes" (number of replica nodes) must be set to at least 1.`
    );
  }

  if (resource.enableAutomaticFailover && (!numReplicaNodes || numReplicaNodes < 1)) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Error in ${resource.type} "${resource.name}". When automatic failover is enabled, "numReplicaNodes" (number of replica nodes) must be set to at least 1.`
    );
  }
  const replicationGroup = cfnResource('AWS::ElastiCache::ReplicationGroup', {
    Engine: 'redis',
    EngineVersion: getEngineVersion({ resource }),
    CacheParameterGroupName: ref(cfLogicalNames.redisParameterGroup(resource.name)),
    CacheNodeType: resource.instanceSize,
    TransitEncryptionEnabled: true,
    AtRestEncryptionEnabled: true,
    AuthToken: resource.defaultUserPassword,
    AutomaticFailoverEnabled: !!(resource.enableSharding || resource.enableAutomaticFailover),
    ReplicationGroupDescription: awsResourceNames.redisReplicationGroupDescription(
      resource.name,
      calculatedStackOverviewManager.context.stackName
    ),
    CacheSubnetGroupName: ref(cfLogicalNames.redisSubnetGroup(resource.name)),
    Port: getRedisPort({ resource }),
    SecurityGroupIds: [ref(cfLogicalNames.redisSecurityGroup(resource.name))],
    LogDeliveryConfigurations: !resource.logging?.disabled
      ? [
          {
            DestinationType: 'cloudwatch-logs',
            DestinationDetails: {
              CloudWatchLogsDetails: { LogGroup: ref(cfLogicalNames.redisLogGroup(resource.name)) }
            },
            LogFormat: resource.logging?.format || 'json',
            LogType: 'slow-log'
          }
        ]
      : undefined,
    NumNodeGroups: resource.enableSharding ? numShards || 1 : undefined,
    NumCacheClusters: !resource.enableSharding ? (numReplicaNodes || 0) + 1 : undefined,
    ReplicasPerNodeGroup: resource.enableSharding ? resource.numReplicaNodes : undefined,
    // NodeGroupConfiguration: resource.sharding?.enabled
    //   ? Array.from(Array(resource.sharding?.numShards || 1).keys(), (shardNum) => ({
    //       NodeGroupId: `${shardNum + 1}`.padStart(4, '0'),
    //       ReplicaCount: resource.replicaNodesCount
    //     }))
    //   : undefined,
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

const getCacheParameterGroupFamily = ({ resource }: { resource: StpRedisCluster }) => {
  const engineVersion = getEngineVersion({ resource });
  if (engineVersion.startsWith('6')) {
    return 'redis6.x';
  }
  return `redis${engineVersion.split('.')[0]}`;
};

const getEngineVersion = ({ resource }: { resource: StpRedisCluster }): StpRedisCluster['engineVersion'] => {
  return resource.engineVersion || '6.2';
};

export const getRedisSecurityGroupResource = ({ resource }: { resource: StpRedisCluster }) => {
  const redisPort = getRedisPort({ resource });
  const basicIngressRules: CloudFormationList<Ingress> =
    !resource.accessibility || resource.accessibility.accessibilityMode === 'vpc'
      ? [{ CidrIp: vpcManager.getVpcCidr(), FromPort: redisPort, ToPort: redisPort, IpProtocol: 'tcp' }]
      : resource.accessibility.accessibilityMode === 'scoping-workloads-in-vpc'
        ? getConnectToReferencesForResource({ nameChain: resource.nameChain }).map(
            ({ scopingCfLogicalNameOfSecurityGroup }) => ({
              SourceSecurityGroupId: ref(scopingCfLogicalNameOfSecurityGroup),
              FromPort: redisPort,
              ToPort: redisPort,
              IpProtocol: 'tcp'
            })
          ) || []
        : [];
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
  retentionDays
}: {
  resource: StpRedisCluster;
  retentionDays: number;
}) => {
  return cfnResource('AWS::Logs::LogGroup', {
    LogGroupName: awsResourceNames.redisLogGroup(resource.name, calculatedStackOverviewManager.context.stackName),
    RetentionInDays: getCloudFormationLogRetentionDays(retentionDays)
  });
};

export const getRedisPort = ({ resource }: { resource: StpRedisCluster }) => {
  return resource.port || 6379;
};
