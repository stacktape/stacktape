import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Compaction {
  Status?: Value<string>;
  TargetFileSizeMB?: Value<number>;
  constructor(properties: Compaction) {
    Object.assign(this, properties);
  }
}

export class IcebergMetadata {
  IcebergSchema!: IcebergSchema;
  constructor(properties: IcebergMetadata) {
    Object.assign(this, properties);
  }
}

export class IcebergSchema {
  SchemaFieldList!: List<SchemaField>;
  constructor(properties: IcebergSchema) {
    Object.assign(this, properties);
  }
}

export class SchemaField {
  Type!: Value<string>;
  Required?: Value<boolean>;
  Name!: Value<string>;
  constructor(properties: SchemaField) {
    Object.assign(this, properties);
  }
}

export class SnapshotManagement {
  Status?: Value<string>;
  MinSnapshotsToKeep?: Value<number>;
  MaxSnapshotAgeHours?: Value<number>;
  constructor(properties: SnapshotManagement) {
    Object.assign(this, properties);
  }
}
export interface TableProperties {
  WithoutMetadata?: Value<string>;
  TableName: Value<string>;
  TableBucketARN: Value<string>;
  OpenTableFormat: Value<string>;
  IcebergMetadata?: IcebergMetadata;
  Compaction?: Compaction;
  Namespace: Value<string>;
  SnapshotManagement?: SnapshotManagement;
}
export default class Table extends ResourceBase<TableProperties> {
  static Compaction = Compaction;
  static IcebergMetadata = IcebergMetadata;
  static IcebergSchema = IcebergSchema;
  static SchemaField = SchemaField;
  static SnapshotManagement = SnapshotManagement;
  constructor(properties: TableProperties) {
    super('AWS::S3Tables::Table', properties);
  }
}
