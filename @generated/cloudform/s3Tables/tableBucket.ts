import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfiguration {
  KMSKeyArn?: Value<string>;
  SSEAlgorithm?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class MetricsConfiguration {
  Status?: Value<string>;
  constructor(properties: MetricsConfiguration) {
    Object.assign(this, properties);
  }
}

export class ReplicationConfiguration {
  Role!: Value<string>;
  Rules!: List<ReplicationRule>;
  constructor(properties: ReplicationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ReplicationDestination {
  DestinationTableBucketARN!: Value<string>;
  constructor(properties: ReplicationDestination) {
    Object.assign(this, properties);
  }
}

export class ReplicationRule {
  Destinations!: List<ReplicationDestination>;
  constructor(properties: ReplicationRule) {
    Object.assign(this, properties);
  }
}

export class StorageClassConfiguration {
  StorageClass?: Value<string>;
  constructor(properties: StorageClassConfiguration) {
    Object.assign(this, properties);
  }
}

export class UnreferencedFileRemoval {
  Status?: Value<string>;
  NoncurrentDays?: Value<number>;
  UnreferencedDays?: Value<number>;
  constructor(properties: UnreferencedFileRemoval) {
    Object.assign(this, properties);
  }
}
export interface TableBucketProperties {
  TableBucketName: Value<string>;
  StorageClassConfiguration?: StorageClassConfiguration;
  MetricsConfiguration?: MetricsConfiguration;
  EncryptionConfiguration?: EncryptionConfiguration;
  UnreferencedFileRemoval?: UnreferencedFileRemoval;
  ReplicationConfiguration?: ReplicationConfiguration;
  Tags?: List<ResourceTag>;
}
export default class TableBucket extends ResourceBase<TableBucketProperties> {
  static EncryptionConfiguration = EncryptionConfiguration;
  static MetricsConfiguration = MetricsConfiguration;
  static ReplicationConfiguration = ReplicationConfiguration;
  static ReplicationDestination = ReplicationDestination;
  static ReplicationRule = ReplicationRule;
  static StorageClassConfiguration = StorageClassConfiguration;
  static UnreferencedFileRemoval = UnreferencedFileRemoval;
  constructor(properties: TableBucketProperties) {
    super('AWS::S3Tables::TableBucket', properties);
  }
}
