import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SchemaInputAttribute {
  GroupName?: Value<string>;
  Type!: Value<string>;
  SubType?: Value<string>;
  Hashed?: Value<boolean>;
  MatchKey?: Value<string>;
  FieldName!: Value<string>;
  constructor(properties: SchemaInputAttribute) {
    Object.assign(this, properties);
  }
}
export interface SchemaMappingProperties {
  Description?: Value<string>;
  MappedInputFields: List<SchemaInputAttribute>;
  SchemaName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class SchemaMapping extends ResourceBase<SchemaMappingProperties> {
  static SchemaInputAttribute = SchemaInputAttribute;
  constructor(properties: SchemaMappingProperties) {
    super('AWS::EntityResolution::SchemaMapping', properties);
  }
}
