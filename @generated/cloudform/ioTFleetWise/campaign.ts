import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CollectionScheme {
  TimeBasedCollectionScheme?: TimeBasedCollectionScheme;
  ConditionBasedCollectionScheme?: ConditionBasedCollectionScheme;
  constructor(properties: CollectionScheme) {
    Object.assign(this, properties);
  }
}

export class ConditionBasedCollectionScheme {
  MinimumTriggerIntervalMs?: Value<number>;
  Expression!: Value<string>;
  TriggerMode?: Value<string>;
  ConditionLanguageVersion?: Value<number>;
  constructor(properties: ConditionBasedCollectionScheme) {
    Object.assign(this, properties);
  }
}

export class ConditionBasedSignalFetchConfig {
  ConditionExpression!: Value<string>;
  TriggerMode!: Value<string>;
  constructor(properties: ConditionBasedSignalFetchConfig) {
    Object.assign(this, properties);
  }
}

export class DataDestinationConfig {
  S3Config?: S3Config;
  MqttTopicConfig?: MqttTopicConfig;
  TimestreamConfig?: TimestreamConfig;
  constructor(properties: DataDestinationConfig) {
    Object.assign(this, properties);
  }
}

export class DataPartition {
  UploadOptions?: DataPartitionUploadOptions;
  StorageOptions!: DataPartitionStorageOptions;
  Id!: Value<string>;
  constructor(properties: DataPartition) {
    Object.assign(this, properties);
  }
}

export class DataPartitionStorageOptions {
  MaximumSize!: StorageMaximumSize;
  StorageLocation!: Value<string>;
  MinimumTimeToLive!: StorageMinimumTimeToLive;
  constructor(properties: DataPartitionStorageOptions) {
    Object.assign(this, properties);
  }
}

export class DataPartitionUploadOptions {
  Expression!: Value<string>;
  ConditionLanguageVersion?: Value<number>;
  constructor(properties: DataPartitionUploadOptions) {
    Object.assign(this, properties);
  }
}

export class MqttTopicConfig {
  ExecutionRoleArn!: Value<string>;
  MqttTopicArn!: Value<string>;
  constructor(properties: MqttTopicConfig) {
    Object.assign(this, properties);
  }
}

export class S3Config {
  BucketArn!: Value<string>;
  DataFormat?: Value<string>;
  StorageCompressionFormat?: Value<string>;
  Prefix?: Value<string>;
  constructor(properties: S3Config) {
    Object.assign(this, properties);
  }
}

export class SignalFetchConfig {
  ConditionBased?: ConditionBasedSignalFetchConfig;
  TimeBased?: TimeBasedSignalFetchConfig;
  constructor(properties: SignalFetchConfig) {
    Object.assign(this, properties);
  }
}

export class SignalFetchInformation {
  Actions!: List<Value<string>>;
  FullyQualifiedName!: Value<string>;
  SignalFetchConfig!: SignalFetchConfig;
  ConditionLanguageVersion?: Value<number>;
  constructor(properties: SignalFetchInformation) {
    Object.assign(this, properties);
  }
}

export class SignalInformation {
  MaxSampleCount?: Value<number>;
  DataPartitionId?: Value<string>;
  MinimumSamplingIntervalMs?: Value<number>;
  Name!: Value<string>;
  constructor(properties: SignalInformation) {
    Object.assign(this, properties);
  }
}

export class StorageMaximumSize {
  Value!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: StorageMaximumSize) {
    Object.assign(this, properties);
  }
}

export class StorageMinimumTimeToLive {
  Value!: Value<number>;
  Unit!: Value<string>;
  constructor(properties: StorageMinimumTimeToLive) {
    Object.assign(this, properties);
  }
}

export class TimeBasedCollectionScheme {
  PeriodMs!: Value<number>;
  constructor(properties: TimeBasedCollectionScheme) {
    Object.assign(this, properties);
  }
}

export class TimeBasedSignalFetchConfig {
  ExecutionFrequencyMs!: Value<number>;
  constructor(properties: TimeBasedSignalFetchConfig) {
    Object.assign(this, properties);
  }
}

export class TimestreamConfig {
  ExecutionRoleArn!: Value<string>;
  TimestreamTableArn!: Value<string>;
  constructor(properties: TimestreamConfig) {
    Object.assign(this, properties);
  }
}
export interface CampaignProperties {
  Action?: Value<string>;
  Compression?: Value<string>;
  Description?: Value<string>;
  DataPartitions?: List<DataPartition>;
  Priority?: Value<number>;
  SignalsToCollect?: List<SignalInformation>;
  StartTime?: Value<string>;
  SignalsToFetch?: List<SignalFetchInformation>;
  ExpiryTime?: Value<string>;
  SpoolingMode?: Value<string>;
  DataDestinationConfigs?: List<DataDestinationConfig>;
  SignalCatalogArn: Value<string>;
  Name: Value<string>;
  PostTriggerCollectionDuration?: Value<number>;
  DataExtraDimensions?: List<Value<string>>;
  DiagnosticsMode?: Value<string>;
  TargetArn: Value<string>;
  CollectionScheme: CollectionScheme;
  Tags?: List<ResourceTag>;
}
export default class Campaign extends ResourceBase<CampaignProperties> {
  static CollectionScheme = CollectionScheme;
  static ConditionBasedCollectionScheme = ConditionBasedCollectionScheme;
  static ConditionBasedSignalFetchConfig = ConditionBasedSignalFetchConfig;
  static DataDestinationConfig = DataDestinationConfig;
  static DataPartition = DataPartition;
  static DataPartitionStorageOptions = DataPartitionStorageOptions;
  static DataPartitionUploadOptions = DataPartitionUploadOptions;
  static MqttTopicConfig = MqttTopicConfig;
  static S3Config = S3Config;
  static SignalFetchConfig = SignalFetchConfig;
  static SignalFetchInformation = SignalFetchInformation;
  static SignalInformation = SignalInformation;
  static StorageMaximumSize = StorageMaximumSize;
  static StorageMinimumTimeToLive = StorageMinimumTimeToLive;
  static TimeBasedCollectionScheme = TimeBasedCollectionScheme;
  static TimeBasedSignalFetchConfig = TimeBasedSignalFetchConfig;
  static TimestreamConfig = TimestreamConfig;
  constructor(properties: CampaignProperties) {
    super('AWS::IoTFleetWise::Campaign', properties);
  }
}
