import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Compaction {
  Status?: Value<string>;
  TargetFileSizeMB?: Value<number>;
  constructor(properties: Compaction) {
    Object.assign(this, properties);
  }
}

export class IcebergMetadata {
  IcebergSchema?: IcebergSchema;
  IcebergSortOrder?: IcebergSortOrder;
  IcebergSchemaV2?: IcebergSchemaV2;
  IcebergPartitionSpec?: IcebergPartitionSpec;
  TableProperties?: { [key: string]: Value<string> };
  constructor(properties: IcebergMetadata) {
    Object.assign(this, properties);
  }
}

export class IcebergPartitionField {
  SourceId!: Value<number>;
  FieldId?: Value<number>;
  Transform!: Value<string>;
  Name!: Value<string>;
  constructor(properties: IcebergPartitionField) {
    Object.assign(this, properties);
  }
}

export class IcebergPartitionSpec {
  Fields!: List<IcebergPartitionField>;
  SpecId?: Value<number>;
  constructor(properties: IcebergPartitionSpec) {
    Object.assign(this, properties);
  }
}

export class IcebergSchema {
  SchemaFieldList!: List<SchemaField>;
  constructor(properties: IcebergSchema) {
    Object.assign(this, properties);
  }
}

export class IcebergSchemaV2 {
  SchemaV2FieldList!: List<SchemaV2Field>;
  SchemaV2FieldType!: Value<string>;
  SchemaId?: Value<number>;
  IdentifierFieldIds?: List<Value<number>>;
  constructor(properties: IcebergSchemaV2) {
    Object.assign(this, properties);
  }
}

export class IcebergSortField {
  SourceId!: Value<number>;
  NullOrder!: Value<string>;
  Transform!: Value<string>;
  Direction!: Value<string>;
  constructor(properties: IcebergSortField) {
    Object.assign(this, properties);
  }
}

export class IcebergSortOrder {
  Fields!: List<IcebergSortField>;
  OrderId?: Value<number>;
  constructor(properties: IcebergSortOrder) {
    Object.assign(this, properties);
  }
}

export class SchemaField {
  Type!: Value<string>;
  Required?: Value<boolean>;
  Id?: Value<number>;
  Name!: Value<string>;
  constructor(properties: SchemaField) {
    Object.assign(this, properties);
  }
}

export class SchemaV2Field {
  Type!: { [key: string]: any };
  Required!: Value<boolean>;
  Doc?: Value<string>;
  Id!: Value<number>;
  Name!: Value<string>;
  constructor(properties: SchemaV2Field) {
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

export class StorageClassConfiguration {
  StorageClass?: Value<string>;
  constructor(properties: StorageClassConfiguration) {
    Object.assign(this, properties);
  }
}
export interface TableProperties {
  WithoutMetadata?: Value<string>;
  StorageClassConfiguration?: StorageClassConfiguration;
  TableName: Value<string>;
  TableBucketARN: Value<string>;
  OpenTableFormat: Value<string>;
  IcebergMetadata?: IcebergMetadata;
  Compaction?: Compaction;
  Namespace: Value<string>;
  SnapshotManagement?: SnapshotManagement;
  Tags?: List<ResourceTag>;
}
export default class Table extends ResourceBase<TableProperties> {
  static Compaction = Compaction;
  static IcebergMetadata = IcebergMetadata;
  static IcebergPartitionField = IcebergPartitionField;
  static IcebergPartitionSpec = IcebergPartitionSpec;
  static IcebergSchema = IcebergSchema;
  static IcebergSchemaV2 = IcebergSchemaV2;
  static IcebergSortField = IcebergSortField;
  static IcebergSortOrder = IcebergSortOrder;
  static SchemaField = SchemaField;
  static SchemaV2Field = SchemaV2Field;
  static SnapshotManagement = SnapshotManagement;
  static StorageClassConfiguration = StorageClassConfiguration;
  constructor(properties: TableProperties) {
    super('AWS::S3Tables::Table', properties);
  }
}
