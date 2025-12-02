import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Schema {
  RegistryName?: Value<string>;
  SchemaArn?: Value<string>;
  SchemaName?: Value<string>;
  constructor(properties: Schema) {
    Object.assign(this, properties);
  }
}
export interface SchemaVersionProperties {
  SchemaDefinition: Value<string>;
  Schema: Schema;
}
export default class SchemaVersion extends ResourceBase<SchemaVersionProperties> {
  static Schema = Schema;
  constructor(properties: SchemaVersionProperties) {
    super('AWS::Glue::SchemaVersion', properties);
  }
}
