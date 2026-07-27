import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ConsumableResourceProperties {
  TotalQuantity: Value<number>;
  ConsumableResourceName?: Value<string>;
  ResourceType: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class ConsumableResource extends ResourceBase<ConsumableResourceProperties> {
  constructor(properties: ConsumableResourceProperties) {
    super('AWS::Batch::ConsumableResource', properties);
  }
}
