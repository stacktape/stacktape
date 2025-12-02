import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Mqtt5Configuration {
  PropagatingAttributes?: List<PropagatingAttribute>;
  constructor(properties: Mqtt5Configuration) {
    Object.assign(this, properties);
  }
}

export class PropagatingAttribute {
  UserPropertyKey!: Value<string>;
  ThingAttribute?: Value<string>;
  ConnectionAttribute?: Value<string>;
  constructor(properties: PropagatingAttribute) {
    Object.assign(this, properties);
  }
}

export class ThingTypeProperties {
  ThingTypeDescription?: Value<string>;
  Mqtt5Configuration?: Mqtt5Configuration;
  SearchableAttributes?: List<Value<string>>;
  constructor(properties: ThingTypeProperties) {
    Object.assign(this, properties);
  }
}
export interface ThingTypeProperties {
  DeprecateThingType?: Value<boolean>;
  ThingTypeName?: Value<string>;
  ThingTypeProperties?: ThingTypeProperties;
  Tags?: List<ResourceTag>;
}
export default class ThingType extends ResourceBase<ThingTypeProperties> {
  static Mqtt5Configuration = Mqtt5Configuration;
  static PropagatingAttribute = PropagatingAttribute;
  static ThingTypeProperties = ThingTypeProperties;
  constructor(properties?: ThingTypeProperties) {
    super('AWS::IoT::ThingType', properties || {});
  }
}
