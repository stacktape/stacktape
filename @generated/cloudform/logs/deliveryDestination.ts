import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DestinationPolicy {
  DeliveryDestinationName?: Value<string>;
  DeliveryDestinationPolicy?: { [key: string]: any };
  constructor(properties: DestinationPolicy) {
    Object.assign(this, properties);
  }
}
export interface DeliveryDestinationProperties {
  DestinationResourceArn?: Value<string>;
  OutputFormat?: Value<string>;
  DeliveryDestinationPolicy?: DestinationPolicy;
  Tags?: List<ResourceTag>;
  DeliveryDestinationType?: Value<string>;
  Name: Value<string>;
}
export default class DeliveryDestination extends ResourceBase<DeliveryDestinationProperties> {
  static DestinationPolicy = DestinationPolicy;
  constructor(properties: DeliveryDestinationProperties) {
    super('AWS::Logs::DeliveryDestination', properties);
  }
}
