import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AbortIncompleteMultipartUpload {
  DaysAfterInitiation!: Value<number>;
  constructor(properties: AbortIncompleteMultipartUpload) {
    Object.assign(this, properties);
  }
}

export class BucketEncryption {
  ServerSideEncryptionConfiguration!: List<ServerSideEncryptionRule>;
  constructor(properties: BucketEncryption) {
    Object.assign(this, properties);
  }
}

export class Destination {
  BucketArn!: Value<string>;
  Format!: Value<string>;
  BucketAccountId?: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: Destination) {
    Object.assign(this, properties);
  }
}

export class InventoryConfiguration {
  Destination!: Destination;
  OptionalFields?: List<Value<string>>;
  IncludedObjectVersions!: Value<string>;
  Enabled!: Value<boolean>;
  Id!: Value<string>;
  Prefix?: Value<string>;
  ScheduleFrequency!: Value<string>;
  constructor(properties: InventoryConfiguration) {
    Object.assign(this, properties);
  }
}

export class LifecycleConfiguration {
  Rules!: List<Rule>;
  constructor(properties: LifecycleConfiguration) {
    Object.assign(this, properties);
  }
}

export class MetricsConfiguration {
  AccessPointArn?: Value<string>;
  Id?: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: MetricsConfiguration) {
    Object.assign(this, properties);
  }
}

export class Rule {
  Status!: Value<string>;
  ExpirationInDays?: Value<number>;
  ObjectSizeGreaterThan?: Value<string>;
  Id?: Value<string>;
  Prefix?: Value<string>;
  AbortIncompleteMultipartUpload?: AbortIncompleteMultipartUpload;
  ObjectSizeLessThan?: Value<string>;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}

export class ServerSideEncryptionByDefault {
  SSEAlgorithm!: Value<string>;
  KMSMasterKeyID?: Value<string>;
  constructor(properties: ServerSideEncryptionByDefault) {
    Object.assign(this, properties);
  }
}

export class ServerSideEncryptionRule {
  BucketKeyEnabled?: Value<boolean>;
  ServerSideEncryptionByDefault?: ServerSideEncryptionByDefault;
  constructor(properties: ServerSideEncryptionRule) {
    Object.assign(this, properties);
  }
}
export interface DirectoryBucketProperties {
  InventoryConfigurations?: List<InventoryConfiguration>;
  BucketName?: Value<string>;
  BucketEncryption?: BucketEncryption;
  DataRedundancy: Value<string>;
  LifecycleConfiguration?: LifecycleConfiguration;
  MetricsConfigurations?: List<MetricsConfiguration>;
  Tags?: List<ResourceTag>;
  LocationName: Value<string>;
}
export default class DirectoryBucket extends ResourceBase<DirectoryBucketProperties> {
  static AbortIncompleteMultipartUpload = AbortIncompleteMultipartUpload;
  static BucketEncryption = BucketEncryption;
  static Destination = Destination;
  static InventoryConfiguration = InventoryConfiguration;
  static LifecycleConfiguration = LifecycleConfiguration;
  static MetricsConfiguration = MetricsConfiguration;
  static Rule = Rule;
  static ServerSideEncryptionByDefault = ServerSideEncryptionByDefault;
  static ServerSideEncryptionRule = ServerSideEncryptionRule;
  constructor(properties: DirectoryBucketProperties) {
    super('AWS::S3Express::DirectoryBucket', properties);
  }
}
