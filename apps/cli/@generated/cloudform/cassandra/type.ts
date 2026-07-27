import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Field {
  FieldName!: Value<string>;
  FieldType!: Value<string>;
  constructor(properties: Field) {
    Object.assign(this, properties);
  }
}
export interface TypeProperties {
  TypeName: Value<string>;
  Fields: List<Field>;
  KeyspaceName: Value<string>;
}
export default class Type extends ResourceBase<TypeProperties> {
  static Field = Field;
  constructor(properties: TypeProperties) {
    super('AWS::Cassandra::Type', properties);
  }
}
