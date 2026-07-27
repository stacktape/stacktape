// This file is auto-generated. Do not edit manually.
// Source: aws-elasticache-cachecluster.json

/** Resource Type definition for AWS::ElastiCache::CacheCluster */
export type AwsElasticacheCachecluster = {
  /** @uniqueItems false */
  CacheSecurityGroupNames?: string[];
  /** @uniqueItems true */
  SnapshotArns?: string[];
  Port?: number;
  ConfigurationEndpointAddress?: string;
  NotificationTopicArn?: string;
  NumCacheNodes: number;
  SnapshotName?: string;
  TransitEncryptionEnabled?: boolean;
  NetworkType?: string;
  /** @uniqueItems true */
  PreferredAvailabilityZones?: string[];
  /** @uniqueItems false */
  VpcSecurityGroupIds?: string[];
  ClusterName?: string;
  RedisEndpointAddress?: string;
  Engine: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  EngineVersion?: string;
  RedisEndpointPort?: string;
  CacheSubnetGroupName?: string;
  CacheParameterGroupName?: string;
  PreferredMaintenanceWindow?: string;
  AutoMinorVersionUpgrade?: boolean;
  PreferredAvailabilityZone?: string;
  SnapshotWindow?: string;
  CacheNodeType: string;
  SnapshotRetentionLimit?: number;
  ConfigurationEndpointPort?: string;
  IpDiscovery?: string;
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
  Id?: string;
  AZMode?: string;
};
