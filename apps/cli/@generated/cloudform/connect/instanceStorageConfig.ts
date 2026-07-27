import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfig {
  EncryptionType!: Value<string>;
  KeyId!: Value<string>;
  constructor(properties: EncryptionConfig) {
    Object.assign(this, properties);
  }
}

export class KinesisFirehoseConfig {
  FirehoseArn!: Value<string>;
  constructor(properties: KinesisFirehoseConfig) {
    Object.assign(this, properties);
  }
}

export class KinesisStreamConfig {
  StreamArn!: Value<string>;
  constructor(properties: KinesisStreamConfig) {
    Object.assign(this, properties);
  }
}

export class KinesisVideoStreamConfig {
  Prefix!: Value<string>;
  RetentionPeriodHours!: Value<number>;
  EncryptionConfig!: EncryptionConfig;
  constructor(properties: KinesisVideoStreamConfig) {
    Object.assign(this, properties);
  }
}

export class S3Config {
  BucketName!: Value<string>;
  BucketPrefix!: Value<string>;
  EncryptionConfig?: EncryptionConfig;
  constructor(properties: S3Config) {
    Object.assign(this, properties);
  }
}
export interface InstanceStorageConfigProperties {
  KinesisStreamConfig?: KinesisStreamConfig;
  S3Config?: S3Config;
  StorageType: Value<string>;
  InstanceArn: Value<string>;
  ResourceType: Value<string>;
  KinesisVideoStreamConfig?: KinesisVideoStreamConfig;
  KinesisFirehoseConfig?: KinesisFirehoseConfig;
}
export default class InstanceStorageConfig extends ResourceBase<InstanceStorageConfigProperties> {
  static EncryptionConfig = EncryptionConfig;
  static KinesisFirehoseConfig = KinesisFirehoseConfig;
  static KinesisStreamConfig = KinesisStreamConfig;
  static KinesisVideoStreamConfig = KinesisVideoStreamConfig;
  static S3Config = S3Config;
  constructor(properties: InstanceStorageConfigProperties) {
    super('AWS::Connect::InstanceStorageConfig', properties);
  }
}
