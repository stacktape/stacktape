import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ExpirationDataRule {
  DaysAfterLastAccess!: Value<number>;
  constructor(properties: ExpirationDataRule) {
    Object.assign(this, properties);
  }
}

export class ImportDataRule {
  Trigger!: Value<string>;
  SizeLessThan!: Value<number>;
  Prefix!: Value<string>;
  constructor(properties: ImportDataRule) {
    Object.assign(this, properties);
  }
}

export class SynchronizationConfiguration {
  ImportDataRules!: List<ImportDataRule>;
  LatestVersionNumber?: Value<number>;
  ExpirationDataRules!: List<ExpirationDataRule>;
  constructor(properties: SynchronizationConfiguration) {
    Object.assign(this, properties);
  }
}
export interface FileSystemProperties {
  AcceptBucketWarning?: Value<boolean>;
  KmsKeyId?: Value<string>;
  Bucket: Value<string>;
  SynchronizationConfiguration?: SynchronizationConfiguration;
  Prefix?: Value<string>;
  ClientToken?: Value<string>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class FileSystem extends ResourceBase<FileSystemProperties> {
  static ExpirationDataRule = ExpirationDataRule;
  static ImportDataRule = ImportDataRule;
  static SynchronizationConfiguration = SynchronizationConfiguration;
  constructor(properties: FileSystemProperties) {
    super('AWS::S3Files::FileSystem', properties);
  }
}
