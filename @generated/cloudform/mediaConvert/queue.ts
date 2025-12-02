import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface QueueProperties {
  Status?: Value<string>;
  Description?: Value<string>;
  PricingPlan?: Value<string>;
  Tags?: { [key: string]: any };
  ConcurrentJobs?: Value<number>;
  Name?: Value<string>;
}
export default class Queue extends ResourceBase<QueueProperties> {
  constructor(properties?: QueueProperties) {
    super('AWS::MediaConvert::Queue', properties || {});
  }
}
