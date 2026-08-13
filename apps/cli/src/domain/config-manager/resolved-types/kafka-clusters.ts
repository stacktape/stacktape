import type { KafkaCluster } from '@stacktape/config/kafka-clusters';

export type StpKafkaCluster = KafkaCluster['properties'] & {
  name: string;
  type: KafkaCluster['type'];
  configParentResourceType: KafkaCluster['type'];
  nameChain: string[];
};

export type KafkaClusterReferencableParam = 'arn' | 'name' | 'bootstrapServers';
