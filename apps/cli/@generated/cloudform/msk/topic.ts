import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TopicProperties {
  ClusterArn: Value<string>;
  ReplicationFactor: Value<number>;
  Configs?: Value<string>;
  PartitionCount: Value<number>;
  TopicName: Value<string>;
}
export default class Topic extends ResourceBase<TopicProperties> {
  constructor(properties: TopicProperties) {
    super('AWS::MSK::Topic', properties);
  }
}
