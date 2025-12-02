import type { List } from '@cloudform/dataTypes';
import type { Ingress } from '@cloudform/ec2/securityGroup';
import type { UpdatePolicy } from '@cloudform/resource';
import { globalStateManager } from '@application-services/global-state-manager';
import SecurityGroup from '@cloudform/ec2/securityGroup';
import ParameterGroup from '@cloudform/elastiCache/parameterGroup';
import ReplicationGroup from '@cloudform/elastiCache/replicationGroup';
import SubnetGroup from '@cloudform/elastiCache/subnetGroup';
import { Ref } from '@cloudform/functions';
import LogGroup from '@cloudform/logs/logGroup';
import { getConnectToReferencesForResource } from '@domain-services/config-manager/utils/resource-references';
import { vpcManager } from '@domain-services/vpc-manager';
import { awsResourceNames } from '@shared/naming/aws-resource-names';
import { cfLogicalNames } from '@shared/naming/logical-names';
import { ExpectedError } from '@utils/errors';

export const getRedisParameterGroupResource = ({ resource }: { resource: StpRedisCluster }) => {
  return new ParameterGroup({
    CacheParameterGroupFamily: getCacheParameterGroupFamily({ resource }),
    Description: `Parameter group for ${resource.name} replica group in ${globalStateManager.targetStack.stackName} stack.`,
    Properties: {
      'cluster-enabled': resource.enableSharding ? 'yes' : 'no'
    }
  });
};

export const getRedisSubnetGroupResource = ({ resource }: { resource: StpRedisCluster }) => {
  return new SubnetGroup({
    Description: `${awsResourceNames.redisReplicationGroupDescription(
      resource.name,
      globalStateManager.targetStack.stackName
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
  const replicationGroup = new ReplicationGroup({
    Engine: 'redis',
    EngineVersion: getEngineVersion({ resource }),
    CacheParameterGroupName: Ref(cfLogicalNames.redisParameterGroup(resource.name)),
    CacheNodeType: resource.instanceSize,
    TransitEncryptionEnabled: true,
    AtRestEncryptionEnabled: true,
    AuthToken: resource.defaultUserPassword,
    AutomaticFailoverEnabled: !!(resource.enableSharding || resource.enableAutomaticFailover),
    ReplicationGroupDescription: awsResourceNames.redisReplicationGroupDescription(
      resource.name,
      globalStateManager.targetStack.stackName
    ),
    CacheSubnetGroupName: Ref(cfLogicalNames.redisSubnetGroup(resource.name)),
    Port: getRedisPort({ resource }),
    SecurityGroupIds: [Ref(cfLogicalNames.redisSecurityGroup(resource.name))],
    LogDeliveryConfigurations: !resource.logging?.disabled
      ? [
          {
            DestinationType: 'cloudwatch-logs',
            DestinationDetails: {
              CloudWatchLogsDetails: { LogGroup: Ref(cfLogicalNames.redisLogGroup(resource.name)) }
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
      globalStateManager.targetStack.stackName
    )
  });
  replicationGroup.UpdatePolicy = {
    UseOnlineResharding: true
  } as UpdatePolicy;

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
  const basicIngressRules: List<Ingress> =
    !resource.accessibility || resource.accessibility.accessibilityMode === 'vpc'
      ? [{ CidrIp: vpcManager.getVpcCidr(), FromPort: redisPort, ToPort: redisPort, IpProtocol: 'tcp' }]
      : resource.accessibility.accessibilityMode === 'scoping-workloads-in-vpc'
        ? getConnectToReferencesForResource({ nameChain: resource.nameChain }).map(
            ({ scopingCfLogicalNameOfSecurityGroup }) => ({
              SourceSecurityGroupId: Ref(scopingCfLogicalNameOfSecurityGroup),
              FromPort: redisPort,
              ToPort: redisPort,
              IpProtocol: 'tcp'
            })
          ) || []
        : [];
  return new SecurityGroup({
    VpcId: vpcManager.getVpcId(),
    GroupName: awsResourceNames.redisClusterSecurityGroup(resource.name, globalStateManager.targetStack.stackName),
    GroupDescription: `Stacktape generated security group for redis cluster ${resource.name} in stack ${globalStateManager.targetStack.stackName}`,
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
  return new LogGroup({
    LogGroupName: awsResourceNames.redisLogGroup(resource.name, globalStateManager.targetStack.stackName),
    RetentionInDays: retentionDays
  });
};

export const getRedisPort = ({ resource }: { resource: StpRedisCluster }) => {
  return resource.port || 6379;
};
