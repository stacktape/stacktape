import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface DeliveryProperties {
  S3EnableHiveCompatiblePath?: Value<boolean>;
  FieldDelimiter?: Value<string>;
  DeliveryDestinationArn: Value<string>;
  DeliverySourceName: Value<string>;
  RecordFields?: List<Value<string>>;
  S3SuffixPath?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Delivery extends ResourceBase<DeliveryProperties> {
  constructor(properties: DeliveryProperties) {
    super('AWS::Logs::Delivery', properties);
  }
}
