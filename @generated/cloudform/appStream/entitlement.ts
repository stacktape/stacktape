import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Attribute {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Attribute) {
    Object.assign(this, properties);
  }
}
export interface EntitlementProperties {
  AppVisibility: Value<string>;
  Description?: Value<string>;
  Attributes: List<Attribute>;
  StackName: Value<string>;
  Name: Value<string>;
}
export default class Entitlement extends ResourceBase<EntitlementProperties> {
  static Attribute = Attribute;
  constructor(properties: EntitlementProperties) {
    super('AWS::AppStream::Entitlement', properties);
  }
}
