import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DeliverySourceProperties {
  ResourceArn?: Value<string>;
  LogType?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class DeliverySource extends ResourceBase<DeliverySourceProperties> {
  constructor(properties: DeliverySourceProperties) {
    super('AWS::Logs::DeliverySource', properties);
  }
}
