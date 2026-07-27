import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface PublicTypeVersionProperties {
  TypeName?: Value<string>;
  LogDeliveryBucket?: Value<string>;
  Type?: Value<string>;
  PublicVersionNumber?: Value<string>;
  Arn?: Value<string>;
}
export default class PublicTypeVersion extends ResourceBase<PublicTypeVersionProperties> {
  constructor(properties?: PublicTypeVersionProperties) {
    super('AWS::CloudFormation::PublicTypeVersion', properties || {});
  }
}
