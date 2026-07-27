import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TrackerConsumerProperties {
  TrackerName: Value<string>;
  ConsumerArn: Value<string>;
}
export default class TrackerConsumer extends ResourceBase<TrackerConsumerProperties> {
  constructor(properties: TrackerConsumerProperties) {
    super('AWS::Location::TrackerConsumer', properties);
  }
}
