import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SchemaVersionMetadataProperties {
  SchemaVersionId: Value<string>;
  Value: Value<string>;
  Key: Value<string>;
}
export default class SchemaVersionMetadata extends ResourceBase<SchemaVersionMetadataProperties> {
  constructor(properties: SchemaVersionMetadataProperties) {
    super('AWS::Glue::SchemaVersionMetadata', properties);
  }
}
