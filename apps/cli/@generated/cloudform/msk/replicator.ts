import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AmazonMskCluster {
  MskClusterArn!: Value<string>;
  constructor(properties: AmazonMskCluster) {
    Object.assign(this, properties);
  }
}

export class ApacheKafkaCluster {
  ApacheKafkaClusterId!: Value<string>;
  BootstrapBrokerString!: Value<string>;
  constructor(properties: ApacheKafkaCluster) {
    Object.assign(this, properties);
  }
}

export class CloudWatchLogs {
  LogGroup?: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: CloudWatchLogs) {
    Object.assign(this, properties);
  }
}

export class ConsumerGroupReplication {
  ConsumerGroupOffsetSyncMode?: Value<string>;
  ConsumerGroupsToReplicate!: List<Value<string>>;
  ConsumerGroupsToExclude?: List<Value<string>>;
  SynchroniseConsumerGroupOffsets?: Value<boolean>;
  DetectAndCopyNewConsumerGroups?: Value<boolean>;
  constructor(properties: ConsumerGroupReplication) {
    Object.assign(this, properties);
  }
}

export class Firehose {
  DeliveryStream?: Value<string>;
  Enabled!: Value<boolean>;
  constructor(properties: Firehose) {
    Object.assign(this, properties);
  }
}

export class KafkaCluster {
  VpcConfig?: KafkaClusterClientVpcConfig;
  AmazonMskCluster?: AmazonMskCluster;
  ClientAuthentication?: KafkaClusterClientAuthentication;
  ApacheKafkaCluster?: ApacheKafkaCluster;
  EncryptionInTransit?: KafkaClusterEncryptionInTransit;
  constructor(properties: KafkaCluster) {
    Object.assign(this, properties);
  }
}

export class KafkaClusterClientAuthentication {
  SaslScram!: KafkaClusterSaslScramAuthentication;
  constructor(properties: KafkaClusterClientAuthentication) {
    Object.assign(this, properties);
  }
}

export class KafkaClusterClientVpcConfig {
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds!: List<Value<string>>;
  constructor(properties: KafkaClusterClientVpcConfig) {
    Object.assign(this, properties);
  }
}

export class KafkaClusterEncryptionInTransit {
  EncryptionType!: Value<string>;
  RootCaCertificate?: Value<string>;
  constructor(properties: KafkaClusterEncryptionInTransit) {
    Object.assign(this, properties);
  }
}

export class KafkaClusterSaslScramAuthentication {
  SecretArn!: Value<string>;
  Mechanism!: Value<string>;
  constructor(properties: KafkaClusterSaslScramAuthentication) {
    Object.assign(this, properties);
  }
}

export class LogDelivery {
  ReplicatorLogDelivery?: ReplicatorLogDelivery;
  constructor(properties: LogDelivery) {
    Object.assign(this, properties);
  }
}

export class ReplicationInfo {
  TargetCompressionType!: Value<string>;
  TargetKafkaClusterId?: Value<string>;
  TopicReplication!: TopicReplication;
  ConsumerGroupReplication!: ConsumerGroupReplication;
  SourceKafkaClusterArn?: Value<string>;
  TargetKafkaClusterArn?: Value<string>;
  SourceKafkaClusterId?: Value<string>;
  constructor(properties: ReplicationInfo) {
    Object.assign(this, properties);
  }
}

export class ReplicationStartingPosition {
  Type?: Value<string>;
  constructor(properties: ReplicationStartingPosition) {
    Object.assign(this, properties);
  }
}

export class ReplicationTopicNameConfiguration {
  Type?: Value<string>;
  constructor(properties: ReplicationTopicNameConfiguration) {
    Object.assign(this, properties);
  }
}

export class ReplicatorLogDelivery {
  S3?: S3;
  Firehose?: Firehose;
  CloudWatchLogs?: CloudWatchLogs;
  constructor(properties: ReplicatorLogDelivery) {
    Object.assign(this, properties);
  }
}

export class S3 {
  Bucket?: Value<string>;
  Enabled!: Value<boolean>;
  Prefix?: Value<string>;
  constructor(properties: S3) {
    Object.assign(this, properties);
  }
}

export class TopicReplication {
  StartingPosition?: ReplicationStartingPosition;
  TopicsToReplicate!: List<Value<string>>;
  TopicsToExclude?: List<Value<string>>;
  TopicNameConfiguration?: ReplicationTopicNameConfiguration;
  CopyTopicConfigurations?: Value<boolean>;
  DetectAndCopyNewTopics?: Value<boolean>;
  CopyAccessControlListsForTopics?: Value<boolean>;
  constructor(properties: TopicReplication) {
    Object.assign(this, properties);
  }
}
export interface ReplicatorProperties {
  Description?: Value<string>;
  ServiceExecutionRoleArn: Value<string>;
  ReplicatorName: Value<string>;
  ReplicationInfoList: List<ReplicationInfo>;
  KafkaClusters: List<KafkaCluster>;
  LogDelivery?: LogDelivery;
  Tags?: List<ResourceTag>;
}
export default class Replicator extends ResourceBase<ReplicatorProperties> {
  static AmazonMskCluster = AmazonMskCluster;
  static ApacheKafkaCluster = ApacheKafkaCluster;
  static CloudWatchLogs = CloudWatchLogs;
  static ConsumerGroupReplication = ConsumerGroupReplication;
  static Firehose = Firehose;
  static KafkaCluster = KafkaCluster;
  static KafkaClusterClientAuthentication = KafkaClusterClientAuthentication;
  static KafkaClusterClientVpcConfig = KafkaClusterClientVpcConfig;
  static KafkaClusterEncryptionInTransit = KafkaClusterEncryptionInTransit;
  static KafkaClusterSaslScramAuthentication = KafkaClusterSaslScramAuthentication;
  static LogDelivery = LogDelivery;
  static ReplicationInfo = ReplicationInfo;
  static ReplicationStartingPosition = ReplicationStartingPosition;
  static ReplicationTopicNameConfiguration = ReplicationTopicNameConfiguration;
  static ReplicatorLogDelivery = ReplicatorLogDelivery;
  static S3 = S3;
  static TopicReplication = TopicReplication;
  constructor(properties: ReplicatorProperties) {
    super('AWS::MSK::Replicator', properties);
  }
}
