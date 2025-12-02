import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AttributePayload {
  Attributes?: { [key: string]: Value<string> };
  constructor(properties: AttributePayload) {
    Object.assign(this, properties);
  }
}
export interface ThingProperties {
  AttributePayload?: AttributePayload;
  ThingName?: Value<string>;
}
export default class Thing extends ResourceBase<ThingProperties> {
  static AttributePayload = AttributePayload;
  constructor(properties?: ThingProperties) {
    super('AWS::IoT::Thing', properties || {});
  }
}
