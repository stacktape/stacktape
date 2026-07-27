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

export class Order {
  Column!: Value<string>;
  SortOrder?: Value<number>;
  constructor(properties: Order) {
    Object.assign(this, properties);
  }
}

export class PartitionInput {
  Parameters?: { [key: string]: any };
  StorageDescriptor?: StorageDescriptor;
  Values!: List<Value<string>>;
  constructor(properties: PartitionInput) {
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
export interface PartitionProperties {
  TableName: Value<string>;
  DatabaseName: Value<string>;
  CatalogId: Value<string>;
  PartitionInput: PartitionInput;
}
export default class Partition extends ResourceBase<PartitionProperties> {
  static Column = Column;
  static Order = Order;
  static PartitionInput = PartitionInput;
  static SchemaId = SchemaId;
  static SchemaReference = SchemaReference;
  static SerdeInfo = SerdeInfo;
  static SkewedInfo = SkewedInfo;
  static StorageDescriptor = StorageDescriptor;
  constructor(properties: PartitionProperties) {
    super('AWS::Glue::Partition', properties);
  }
}
