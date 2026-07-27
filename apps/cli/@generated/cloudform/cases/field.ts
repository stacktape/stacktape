import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FieldAttributes {
  Text?: TextAttributes;
  constructor(properties: FieldAttributes) {
    Object.assign(this, properties);
  }
}

export class TextAttributes {
  IsMultiline!: Value<boolean>;
  constructor(properties: TextAttributes) {
    Object.assign(this, properties);
  }
}
export interface FieldProperties {
  Type: Value<string>;
  Description?: Value<string>;
  DomainId?: Value<string>;
  Attributes?: FieldAttributes;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Field extends ResourceBase<FieldProperties> {
  static FieldAttributes = FieldAttributes;
  static TextAttributes = TextAttributes;
  constructor(properties: FieldProperties) {
    super('AWS::Cases::Field', properties);
  }
}
