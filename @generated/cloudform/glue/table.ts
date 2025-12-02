import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Column {
  Comment?: Value<string>;
  Type?: Value<string>;
  Name!: Value<string>;
  constructor(properties: Column) {
    Object.assign(this, properties);
  }
}

export class IcebergInput {
  MetadataOperation?: MetadataOperation;
  Version?: Value<string>;
  constructor(properties: IcebergInput) {
    Object.assign(this, properties);
  }
}

export type MetadataOperation = Value<string>;

export class OpenTableFormatInput {
  IcebergInput?: IcebergInput;
  constructor(properties: OpenTableFormatInput) {
    Object.assign(this, properties);
  }
}

export class Order {
  Column!: Value<string>;
  SortOrder!: Value<number>;
  constructor(properties: Order) {
    Object.assign(this, properties);
  }
}

export class SchemaId {
  RegistryName?: Value<string>;
  SchemaName?: Value<string>;
  SchemaArn?: Value<string>;
  constructor(properties: SchemaId) {
    Object.assign(this, properties);
  }
}

export class SchemaReference {
  SchemaVersionId?: Value<string>;
  SchemaId?: SchemaId;
  SchemaVersionNumber?: Value<number>;
  constructor(properties: SchemaReference) {
    Object.assign(this, properties);
  }
}

export class SerdeInfo {
  Parameters?: { [key: string]: any };
  SerializationLibrary?: Value<string>;
  Name?: Value<string>;
  constructor(properties: SerdeInfo) {
    Object.assign(this, properties);
  }
}

export class SkewedInfo {
  SkewedColumnNames?: List<Value<string>>;
  SkewedColumnValues?: List<Value<string>>;
  SkewedColumnValueLocationMaps?: { [key: string]: any };
  constructor(properties: SkewedInfo) {
    Object.assign(this, properties);
  }
}

export class StorageDescriptor {
  StoredAsSubDirectories?: Value<boolean>;
  Parameters?: { [key: string]: any };
  BucketColumns?: List<Value<string>>;
  NumberOfBuckets?: Value<number>;
  OutputFormat?: Value<string>;
  Columns?: List<Column>;
  SerdeInfo?: SerdeInfo;
  SortColumns?: List<Order>;
  Compressed?: Value<boolean>;
  SchemaReference?: SchemaReference;
  SkewedInfo?: SkewedInfo;
  InputFormat?: Value<string>;
  Location?: Value<string>;
  constructor(properties: StorageDescriptor) {
    Object.assign(this, properties);
  }
}

export class TableIdentifier {
  DatabaseName?: Value<string>;
  Region?: Value<string>;
  CatalogId?: Value<string>;
  Name?: Value<string>;
  constructor(properties: TableIdentifier) {
    Object.assign(this, properties);
  }
}

export class TableInput {
  Owner?: Value<string>;
  ViewOriginalText?: Value<string>;
  Description?: Value<string>;
  TableType?: Value<string>;
  Parameters?: { [key: string]: any };
  ViewExpandedText?: Value<string>;
  StorageDescriptor?: StorageDescriptor;
  TargetTable?: TableIdentifier;
  PartitionKeys?: List<Column>;
  Retention?: Value<number>;
  Name?: Value<string>;
  constructor(properties: TableInput) {
    Object.assign(this, properties);
  }
}
export interface TableProperties {
  TableInput: TableInput;
  OpenTableFormatInput?: OpenTableFormatInput;
  DatabaseName: Value<string>;
  CatalogId: Value<string>;
}
export default class Table extends ResourceBase<TableProperties> {
  static Column = Column;
  static IcebergInput = IcebergInput;
  static OpenTableFormatInput = OpenTableFormatInput;
  static Order = Order;
  static SchemaId = SchemaId;
  static SchemaReference = SchemaReference;
  static SerdeInfo = SerdeInfo;
  static SkewedInfo = SkewedInfo;
  static StorageDescriptor = StorageDescriptor;
  static TableIdentifier = TableIdentifier;
  static TableInput = TableInput;
  constructor(properties: TableProperties) {
    super('AWS::Glue::Table', properties);
  }
}
