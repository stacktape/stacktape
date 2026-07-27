import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchLogsDestinationDetails {
  LogGroup!: Value<string>;
  constructor(properties: CloudWatchLogsDestinationDetails) {
    Object.assign(this, properties);
  }
}

export class DestinationDetails {
  CloudWatchLogsDetails?: CloudWatchLogsDestinationDetails;
  KinesisFirehoseDetails?: KinesisFirehoseDestinationDetails;
  constructor(properties: DestinationDetails) {
    Object.assign(this, properties);
  }
}

export class Endpoint {
  Address?: Value<string>;
  Port?: Value<string>;
  constructor(properties: Endpoint) {
    Object.assign(this, properties);
  }
}

export class KinesisFirehoseDestinationDetails {
  DeliveryStream!: Value<string>;
  constructor(properties: KinesisFirehoseDestinationDetails) {
    Object.assign(this, properties);
  }
}

export class LogDeliveryConfigurationRequest {
  LogFormat!: Value<string>;
  LogType!: Value<string>;
  DestinationType!: Value<string>;
  DestinationDetails!: DestinationDetails;
  constructor(properties: LogDeliveryConfigurationRequest) {
    Object.assign(this, properties);
  }
}
export interface CacheClusterProperties {
  EngineVersion?: Value<string>;
  SnapshotArns?: List<Value<string>>;
  CacheSubnetGroupName?: Value<string>;
  Port?: Value<number>;
  CacheParameterGroupName?: Value<string>;
  PreferredMaintenanceWindow?: Value<string>;
  AutoMinorVersionUpgrade?: Value<boolean>;
  NotificationTopicArn?: Value<string>;
  NumCacheNodes: Value<number>;
  SnapshotName?: Value<string>;
  PreferredAvailabilityZone?: Value<string>;
  SnapshotWindow?: Value<string>;
  CacheNodeType: Value<string>;
  SnapshotRetentionLimit?: Value<number>;
  TransitEncryptionEnabled?: Value<boolean>;
  PreferredAvailabilityZones?: List<Value<string>>;
  VpcSecurityGroupIds?: List<Value<string>>;
  NetworkType?: Value<string>;
  IpDiscovery?: Value<string>;
  ClusterName?: Value<string>;
  LogDeliveryConfigurations?: List<LogDeliveryConfigurationRequest>;
  Engine: Value<string>;
  Tags?: List<ResourceTag>;
  AZMode?: Value<string>;
}
export default class CacheCluster extends ResourceBase<CacheClusterProperties> {
  static CloudWatchLogsDestinationDetails = CloudWatchLogsDestinationDetails;
  static DestinationDetails = DestinationDetails;
  static Endpoint = Endpoint;
  static KinesisFirehoseDestinationDetails = KinesisFirehoseDestinationDetails;
  static LogDeliveryConfigurationRequest = LogDeliveryConfigurationRequest;
  constructor(properties: CacheClusterProperties) {
    super('AWS::ElastiCache::CacheCluster', properties);
  }
}
