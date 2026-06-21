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

export class NodeGroupConfiguration {
  Slots?: Value<string>;
  ReplicaAvailabilityZones?: List<Value<string>>;
  NodeGroupId?: Value<string>;
  ReplicaCount?: Value<number>;
  PrimaryAvailabilityZone?: Value<string>;
  constructor(properties: NodeGroupConfiguration) {
    Object.assign(this, properties);
  }
}

export class ReadEndPoint {
  Addresses?: Value<string>;
  PortsList?: List<Value<string>>;
  AddressesList?: List<Value<string>>;
  Ports?: Value<string>;
  constructor(properties: ReadEndPoint) {
    Object.assign(this, properties);
  }
}
export interface ReplicationGroupProperties {
  PreferredCacheClusterAZs?: List<Value<string>>;
  NodeGroupConfiguration?: List<NodeGroupConfiguration>;
  SnapshotArns?: List<Value<string>>;
  ClusterMode?: Value<string>;
  Port?: Value<number>;
  NumNodeGroups?: Value<number>;
  NotificationTopicArn?: Value<string>;
  SnapshotName?: Value<string>;
  AutomaticFailoverEnabled?: Value<boolean>;
  ReplicasPerNodeGroup?: Value<number>;
  ReplicationGroupDescription: Value<string>;
  MultiAZEnabled?: Value<boolean>;
  TransitEncryptionEnabled?: Value<boolean>;
  NetworkType?: Value<string>;
  ReplicationGroupId?: Value<string>;
  Engine?: Value<string>;
  Tags?: List<ResourceTag>;
  NumCacheClusters?: Value<number>;
  GlobalReplicationGroupId?: Value<string>;
  EngineVersion?: Value<string>;
  KmsKeyId?: Value<string>;
  CacheSubnetGroupName?: Value<string>;
  CacheParameterGroupName?: Value<string>;
  PreferredMaintenanceWindow?: Value<string>;
  PrimaryClusterId?: Value<string>;
  AtRestEncryptionEnabled?: Value<boolean>;
  AutoMinorVersionUpgrade?: Value<boolean>;
  SecurityGroupIds?: List<Value<string>>;
  SnapshotWindow?: Value<string>;
  TransitEncryptionMode?: Value<string>;
  CacheNodeType?: Value<string>;
  SnapshotRetentionLimit?: Value<number>;
  UserGroupIds?: List<Value<string>>;
  SnapshottingClusterId?: Value<string>;
  IpDiscovery?: Value<string>;
  AuthToken?: Value<string>;
  DataTieringEnabled?: Value<boolean>;
  LogDeliveryConfigurations?: List<LogDeliveryConfigurationRequest>;
}
export default class ReplicationGroup extends ResourceBase<ReplicationGroupProperties> {
  static CloudWatchLogsDestinationDetails = CloudWatchLogsDestinationDetails;
  static DestinationDetails = DestinationDetails;
  static Endpoint = Endpoint;
  static KinesisFirehoseDestinationDetails = KinesisFirehoseDestinationDetails;
  static LogDeliveryConfigurationRequest = LogDeliveryConfigurationRequest;
  static NodeGroupConfiguration = NodeGroupConfiguration;
  static ReadEndPoint = ReadEndPoint;
  constructor(properties: ReplicationGroupProperties) {
    super('AWS::ElastiCache::ReplicationGroup', properties);
  }
}
