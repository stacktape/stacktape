import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AttributeConfiguration {
  EnableValueValidationOnAssociation?: Value<boolean>;
  IsReadOnly?: Value<boolean>;
  constructor(properties: AttributeConfiguration) {
    Object.assign(this, properties);
  }
}

export class Values {
  StringList?: List<Value<string>>;
  constructor(properties: Values) {
    Object.assign(this, properties);
  }
}
export interface PredefinedAttributeProperties {
  AttributeConfiguration?: AttributeConfiguration;
  InstanceArn: Value<string>;
  Values?: Values;
  Purposes?: List<Value<string>>;
  Name: Value<string>;
}
export default class PredefinedAttribute extends ResourceBase<PredefinedAttributeProperties> {
  static AttributeConfiguration = AttributeConfiguration;
  static Values = Values;
  constructor(properties: PredefinedAttributeProperties) {
    super('AWS::Connect::PredefinedAttribute', properties);
  }
}
