import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface StreamConsumerProperties {
  ConsumerName: Value<string>;
  StreamARN: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class StreamConsumer extends ResourceBase<StreamConsumerProperties> {
  constructor(properties: StreamConsumerProperties) {
    super('AWS::Kinesis::StreamConsumer', properties);
  }
}
