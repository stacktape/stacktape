import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CloudWatchEncryption {
  KmsKeyArn?: Value<string>;
  CloudWatchEncryptionMode?: Value<string>;
  constructor(properties: CloudWatchEncryption) {
    Object.assign(this, properties);
  }
}

export class EncryptionConfiguration {
  S3Encryptions?: S3Encryptions;
  CloudWatchEncryption?: CloudWatchEncryption;
  JobBookmarksEncryption?: JobBookmarksEncryption;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class JobBookmarksEncryption {
  KmsKeyArn?: Value<string>;
  JobBookmarksEncryptionMode?: Value<string>;
  constructor(properties: JobBookmarksEncryption) {
    Object.assign(this, properties);
  }
}

export class S3Encryption {
  KmsKeyArn?: Value<string>;
  S3EncryptionMode?: Value<string>;
  constructor(properties: S3Encryption) {
    Object.assign(this, properties);
  }
}

export type S3Encryptions = List<S3Encryption>;
export interface SecurityConfigurationProperties {
  EncryptionConfiguration: EncryptionConfiguration;
  Name: Value<string>;
}
export default class SecurityConfiguration extends ResourceBase<SecurityConfigurationProperties> {
  static CloudWatchEncryption = CloudWatchEncryption;
  static EncryptionConfiguration = EncryptionConfiguration;
  static JobBookmarksEncryption = JobBookmarksEncryption;
  static S3Encryption = S3Encryption;
  constructor(properties: SecurityConfigurationProperties) {
    super('AWS::Glue::SecurityConfiguration', properties);
  }
}
