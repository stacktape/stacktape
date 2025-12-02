import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Column {
  Type!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Column) {
    Object.assign(this, properties);
  }
}

export class CustomerManagedS3 {
  Bucket!: Value<string>;
  RoleArn!: Value<string>;
  KeyPrefix?: Value<string>;
  constructor(properties: CustomerManagedS3) {
    Object.assign(this, properties);
  }
}

export class CustomerManagedS3Storage {
  Bucket!: Value<string>;
  KeyPrefix?: Value<string>;
  constructor(properties: CustomerManagedS3Storage) {
    Object.assign(this, properties);
  }
}

export class DatastorePartition {
  Partition?: Partition;
  TimestampPartition?: TimestampPartition;
  constructor(properties: DatastorePartition) {
    Object.assign(this, properties);
  }
}

export class DatastorePartitions {
  Partitions?: List<DatastorePartition>;
  constructor(properties: DatastorePartitions) {
    Object.assign(this, properties);
  }
}

export class DatastoreStorage {
  CustomerManagedS3?: CustomerManagedS3;
  ServiceManagedS3?: { [key: string]: any };
  IotSiteWiseMultiLayerStorage?: IotSiteWiseMultiLayerStorage;
  constructor(properties: DatastoreStorage) {
    Object.assign(this, properties);
  }
}

export class FileFormatConfiguration {
  ParquetConfiguration?: ParquetConfiguration;
  JsonConfiguration?: { [key: string]: any };
  constructor(properties: FileFormatConfiguration) {
    Object.assign(this, properties);
  }
}

export class IotSiteWiseMultiLayerStorage {
  CustomerManagedS3Storage?: CustomerManagedS3Storage;
  constructor(properties: IotSiteWiseMultiLayerStorage) {
    Object.assign(this, properties);
  }
}

export class ParquetConfiguration {
  SchemaDefinition?: SchemaDefinition;
  constructor(properties: ParquetConfiguration) {
    Object.assign(this, properties);
  }
}

export class Partition {
  AttributeName!: Value<string>;
  constructor(properties: Partition) {
    Object.assign(this, properties);
  }
}

export class RetentionPeriod {
  NumberOfDays?: Value<number>;
  Unlimited?: Value<boolean>;
  constructor(properties: RetentionPeriod) {
    Object.assign(this, properties);
  }
}

export class SchemaDefinition {
  Columns?: List<Column>;
  constructor(properties: SchemaDefinition) {
    Object.assign(this, properties);
  }
}

export class TimestampPartition {
  AttributeName!: Value<string>;
  TimestampFormat?: Value<string>;
  constructor(properties: TimestampPartition) {
    Object.assign(this, properties);
  }
}
export interface DatastoreProperties {
  DatastoreStorage?: DatastoreStorage;
  FileFormatConfiguration?: FileFormatConfiguration;
  DatastorePartitions?: DatastorePartitions;
  DatastoreName?: Value<string>;
  RetentionPeriod?: RetentionPeriod;
  Tags?: List<ResourceTag>;
}
export default class Datastore extends ResourceBase<DatastoreProperties> {
  static Column = Column;
  static CustomerManagedS3 = CustomerManagedS3;
  static CustomerManagedS3Storage = CustomerManagedS3Storage;
  static DatastorePartition = DatastorePartition;
  static DatastorePartitions = DatastorePartitions;
  static DatastoreStorage = DatastoreStorage;
  static FileFormatConfiguration = FileFormatConfiguration;
  static IotSiteWiseMultiLayerStorage = IotSiteWiseMultiLayerStorage;
  static ParquetConfiguration = ParquetConfiguration;
  static Partition = Partition;
  static RetentionPeriod = RetentionPeriod;
  static SchemaDefinition = SchemaDefinition;
  static TimestampPartition = TimestampPartition;
  constructor(properties?: DatastoreProperties) {
    super('AWS::IoTAnalytics::Datastore', properties || {});
  }
}
