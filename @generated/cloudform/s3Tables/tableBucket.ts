import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfiguration {
  KMSKeyArn?: Value<string>;
  SSEAlgorithm?: Value<string>;
  constructor(properties: EncryptionConfiguration) {
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
  EncryptionConfiguration?: EncryptionConfiguration;
  UnreferencedFileRemoval?: UnreferencedFileRemoval;
}
export default class TableBucket extends ResourceBase<TableBucketProperties> {
  static EncryptionConfiguration = EncryptionConfiguration;
  static UnreferencedFileRemoval = UnreferencedFileRemoval;
  constructor(properties: TableBucketProperties) {
    super('AWS::S3Tables::TableBucket', properties);
  }
}
