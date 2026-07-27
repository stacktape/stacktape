import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AttributePayload {
  Attributes?: { [key: string]: Value<string> };
  constructor(properties: AttributePayload) {
    Object.assign(this, properties);
  }
}

export class ThingGroupProperties {
  AttributePayload?: AttributePayload;
  ThingGroupDescription?: Value<string>;
  constructor(properties: ThingGroupProperties) {
    Object.assign(this, properties);
  }
}
export interface ThingGroupProperties {
  ParentGroupName?: Value<string>;
  ThingGroupName?: Value<string>;
  ThingGroupProperties?: ThingGroupProperties;
  QueryString?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ThingGroup extends ResourceBase<ThingGroupProperties> {
  static AttributePayload = AttributePayload;
  static ThingGroupProperties = ThingGroupProperties;
  constructor(properties?: ThingGroupProperties) {
    super('AWS::IoT::ThingGroup', properties || {});
  }
}
