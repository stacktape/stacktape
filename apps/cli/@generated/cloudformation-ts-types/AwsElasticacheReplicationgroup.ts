// This file is auto-generated. Do not edit manually.
// Source: aws-elasticache-replicationgroup.json

/** Resource Type definition for AWS::ElastiCache::ReplicationGroup */
export type AwsElasticacheReplicationgroup = {
  /** @uniqueItems true */
  PreferredCacheClusterAZs?: string[];
  ReaderEndPointPort?: string;
  /** @uniqueItems true */
  NodeGroupConfiguration?: {
    Slots?: string;
    PrimaryAvailabilityZone?: string;
    /** @uniqueItems true */
    ReplicaAvailabilityZones?: string[];
    NodeGroupId?: string;
    ReplicaCount?: number;
  }[];
  /** @uniqueItems true */
  SnapshotArns?: string[];
  ConfigurationEndPointPort?: string;
  Port?: number;
  NumNodeGroups?: number;
  NotificationTopicArn?: string;
  AutomaticFailoverEnabled?: boolean;
  ReplicasPerNodeGroup?: number;
  TransitEncryptionEnabled?: boolean;
  Engine?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  PrimaryEndPointAddress?: string;
  GlobalReplicationGroupId?: string;
  ConfigurationEndPointAddress?: string;
  EngineVersion?: string;
  KmsKeyId?: string;
  PrimaryClusterId?: string;
  ReadEndPointPorts?: string;
  AutoMinorVersionUpgrade?: boolean;
  /** @uniqueItems true */
  SecurityGroupIds?: string[];
  SnapshotWindow?: string;
  TransitEncryptionMode?: string;
  SnapshotRetentionLimit?: number;
  /** @uniqueItems false */
  ReadEndPointAddressesList?: string[];
  SnapshottingClusterId?: string;
  IpDiscovery?: string;
  ReadEndPointAddresses?: string;
  PrimaryEndPointPort?: string;
  /** @uniqueItems true */
  CacheSecurityGroupNames?: string[];
  ClusterMode?: string;
  /** @uniqueItems false */
  ReadEndPointPortsList?: string[];
  SnapshotName?: string;
  ReplicationGroupDescription: string;
  ReaderEndPointAddress?: string;
  MultiAZEnabled?: boolean;
  NetworkType?: string;
  ReplicationGroupId?: string;
  NumCacheClusters?: number;
  CacheSubnetGroupName?: string;
  CacheParameterGroupName?: string;
  PreferredMaintenanceWindow?: string;
  AtRestEncryptionEnabled?: boolean;
  CacheNodeType?: string;
  /** @uniqueItems true */
  UserGroupIds?: string[];
  AuthToken?: string;
  DataTieringEnabled?: boolean;
  /** @uniqueItems true */
  LogDeliveryConfigurations?: {
    LogType: string;
    LogFormat: string;
    DestinationType: string;
    DestinationDetails: {
      CloudWatchLogsDetails?: {
        LogGroup: string;
      };
      KinesisFirehoseDetails?: {
        DeliveryStream: string;
      };
    };
  }[];
};
