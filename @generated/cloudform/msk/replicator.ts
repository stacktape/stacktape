import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AmazonMskCluster {
  MskClusterArn!: Value<string>;
  constructor(properties: AmazonMskCluster) {
    Object.assign(this, properties);
  }
}

export class ConsumerGroupReplication {
  ConsumerGroupsToReplicate!: List<Value<string>>;
  ConsumerGroupsToExclude?: List<Value<string>>;
  SynchroniseConsumerGroupOffsets?: Value<boolean>;
  DetectAndCopyNewConsumerGroups?: Value<boolean>;
  constructor(properties: ConsumerGroupReplication) {
    Object.assign(this, properties);
  }
}

export class KafkaCluster {
  VpcConfig!: KafkaClusterClientVpcConfig;
  AmazonMskCluster!: AmazonMskCluster;
  constructor(properties: KafkaCluster) {
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

export class ReplicationInfo {
  TargetCompressionType!: Value<string>;
  TopicReplication!: TopicReplication;
  ConsumerGroupReplication!: ConsumerGroupReplication;
  SourceKafkaClusterArn!: Value<string>;
  TargetKafkaClusterArn!: Value<string>;
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
  Tags?: List<ResourceTag>;
}
export default class Replicator extends ResourceBase<ReplicatorProperties> {
  static AmazonMskCluster = AmazonMskCluster;
  static ConsumerGroupReplication = ConsumerGroupReplication;
  static KafkaCluster = KafkaCluster;
  static KafkaClusterClientVpcConfig = KafkaClusterClientVpcConfig;
  static ReplicationInfo = ReplicationInfo;
  static ReplicationStartingPosition = ReplicationStartingPosition;
  static ReplicationTopicNameConfiguration = ReplicationTopicNameConfiguration;
  static TopicReplication = TopicReplication;
  constructor(properties: ReplicatorProperties) {
    super('AWS::MSK::Replicator', properties);
  }
}
