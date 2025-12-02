import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Registry {
  Arn?: Value<string>;
  Name?: Value<string>;
  constructor(properties: Registry) {
    Object.assign(this, properties);
  }
}

export class SchemaVersion {
  IsLatest?: Value<boolean>;
  VersionNumber?: Value<number>;
  constructor(properties: SchemaVersion) {
    Object.assign(this, properties);
  }
}
export interface SchemaProperties {
  SchemaDefinition?: Value<string>;
  Description?: Value<string>;
  DataFormat: Value<string>;
  Registry?: Registry;
  Compatibility: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  CheckpointVersion?: SchemaVersion;
}
export default class Schema extends ResourceBase<SchemaProperties> {
  static Registry = Registry;
  static SchemaVersion = SchemaVersion;
  constructor(properties: SchemaProperties) {
    super('AWS::Glue::Schema', properties);
  }
}
