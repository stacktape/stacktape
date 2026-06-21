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
  IcebergTableInput?: IcebergTableInput;
  MetadataOperation?: MetadataOperation;
  Version?: Value<string>;
  constructor(properties: IcebergInput) {
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
  Type?: Value<string>;
  Fields!: List<IcebergStructField>;
  SchemaId?: Value<number>;
  IdentifierFieldIds?: List<Value<number>>;
  constructor(properties: IcebergSchema) {
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
  OrderId!: Value<number>;
  constructor(properties: IcebergSortOrder) {
    Object.assign(this, properties);
  }
}

export class IcebergStructField {
  Type!: Value<string>;
  Required!: Value<boolean>;
  Doc?: Value<string>;
  Id!: Value<number>;
  Name!: Value<string>;
  constructor(properties: IcebergStructField) {
    Object.assign(this, properties);
  }
}

export class IcebergTableInput {
  Schema!: IcebergSchema;
  WriteOrder?: IcebergSortOrder;
  Properties?: { [key: string]: any };
  PartitionSpec?: IcebergPartitionSpec;
  Location!: Value<string>;
  constructor(properties: IcebergTableInput) {
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
  ViewDefinition?: ViewDefinition;
  constructor(properties: TableInput) {
    Object.assign(this, properties);
  }
}

export class ViewDefinition {
  SubObjects?: List<Value<string>>;
  IsProtected?: Value<boolean>;
  Definer?: Value<string>;
  Representations?: List<ViewRepresentation>;
  constructor(properties: ViewDefinition) {
    Object.assign(this, properties);
  }
}

export class ViewRepresentation {
  ViewOriginalText?: Value<string>;
  ViewExpandedText?: Value<string>;
  ValidationConnection?: Value<string>;
  Dialect?: Value<string>;
  DialectVersion?: Value<string>;
  constructor(properties: ViewRepresentation) {
    Object.assign(this, properties);
  }
}
export interface TableProperties {
  TableInput?: TableInput;
  OpenTableFormatInput?: OpenTableFormatInput;
  DatabaseName: Value<string>;
  CatalogId: Value<string>;
  Name?: Value<string>;
}
export default class Table extends ResourceBase<TableProperties> {
  static Column = Column;
  static IcebergInput = IcebergInput;
  static IcebergPartitionField = IcebergPartitionField;
  static IcebergPartitionSpec = IcebergPartitionSpec;
  static IcebergSchema = IcebergSchema;
  static IcebergSortField = IcebergSortField;
  static IcebergSortOrder = IcebergSortOrder;
  static IcebergStructField = IcebergStructField;
  static IcebergTableInput = IcebergTableInput;
  static OpenTableFormatInput = OpenTableFormatInput;
  static Order = Order;
  static SchemaId = SchemaId;
  static SchemaReference = SchemaReference;
  static SerdeInfo = SerdeInfo;
  static SkewedInfo = SkewedInfo;
  static StorageDescriptor = StorageDescriptor;
  static TableIdentifier = TableIdentifier;
  static TableInput = TableInput;
  static ViewDefinition = ViewDefinition;
  static ViewRepresentation = ViewRepresentation;
  constructor(properties: TableProperties) {
    super('AWS::Glue::Table', properties);
  }
}
