import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ArtifactConfig {
  S3Encryption?: S3Encryption;
  constructor(properties: ArtifactConfig) {
    Object.assign(this, properties);
  }
}

export class BaseScreenshot {
  IgnoreCoordinates?: List<Value<string>>;
  ScreenshotName!: Value<string>;
  constructor(properties: BaseScreenshot) {
    Object.assign(this, properties);
  }
}

export class BrowserConfig {
  BrowserType!: Value<string>;
  constructor(properties: BrowserConfig) {
    Object.assign(this, properties);
  }
}

export class Code {
  Script?: Value<string>;
  S3ObjectVersion?: Value<string>;
  S3Bucket?: Value<string>;
  S3Key?: Value<string>;
  BlueprintTypes?: List<Value<string>>;
  Handler?: Value<string>;
  SourceLocationArn?: Value<string>;
  Dependencies?: List<Dependency>;
  constructor(properties: Code) {
    Object.assign(this, properties);
  }
}

export class Dependency {
  Type?: Value<string>;
  Reference!: Value<string>;
  constructor(properties: Dependency) {
    Object.assign(this, properties);
  }
}

export class RetryConfig {
  MaxRetries!: Value<number>;
  constructor(properties: RetryConfig) {
    Object.assign(this, properties);
  }
}

export class RunConfig {
  TimeoutInSeconds?: Value<number>;
  EnvironmentVariables?: { [key: string]: Value<string> };
  MemoryInMB?: Value<number>;
  EphemeralStorage?: Value<number>;
  ActiveTracing?: Value<boolean>;
  constructor(properties: RunConfig) {
    Object.assign(this, properties);
  }
}

export class S3Encryption {
  KmsKeyArn?: Value<string>;
  EncryptionMode?: Value<string>;
  constructor(properties: S3Encryption) {
    Object.assign(this, properties);
  }
}

export class Schedule {
  DurationInSeconds?: Value<string>;
  RetryConfig?: RetryConfig;
  Expression!: Value<string>;
  constructor(properties: Schedule) {
    Object.assign(this, properties);
  }
}

export class VPCConfig {
  Ipv6AllowedForDualStack?: Value<boolean>;
  VpcId?: Value<string>;
  SubnetIds!: List<Value<string>>;
  SecurityGroupIds!: List<Value<string>>;
  constructor(properties: VPCConfig) {
    Object.assign(this, properties);
  }
}

export class VisualReference {
  BaseScreenshots?: List<BaseScreenshot>;
  BrowserType?: Value<string>;
  BaseCanaryRunId!: Value<string>;
  constructor(properties: VisualReference) {
    Object.assign(this, properties);
  }
}
export interface CanaryProperties {
  BrowserConfigs?: List<BrowserConfig>;
  VisualReferences?: List<VisualReference>;
  ArtifactConfig?: ArtifactConfig;
  SuccessRetentionPeriod?: Value<number>;
  RuntimeVersion: Value<string>;
  VPCConfig?: VPCConfig;
  RunConfig?: RunConfig;
  DryRunAndUpdate?: Value<boolean>;
  FailureRetentionPeriod?: Value<number>;
  Code: Code;
  ResourcesToReplicateTags?: List<Value<string>>;
  Name: Value<string>;
  ProvisionedResourceCleanup?: Value<string>;
  ExecutionRoleArn: Value<string>;
  Schedule: Schedule;
  ArtifactS3Location: Value<string>;
  Tags?: List<ResourceTag>;
  StartCanaryAfterCreation?: Value<boolean>;
}
export default class Canary extends ResourceBase<CanaryProperties> {
  static ArtifactConfig = ArtifactConfig;
  static BaseScreenshot = BaseScreenshot;
  static BrowserConfig = BrowserConfig;
  static Code = Code;
  static Dependency = Dependency;
  static RetryConfig = RetryConfig;
  static RunConfig = RunConfig;
  static S3Encryption = S3Encryption;
  static Schedule = Schedule;
  static VPCConfig = VPCConfig;
  static VisualReference = VisualReference;
  constructor(properties: CanaryProperties) {
    super('AWS::Synthetics::Canary', properties);
  }
}
