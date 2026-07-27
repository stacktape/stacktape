import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapacityProviderConfig {
  LambdaManagedInstancesCapacityProviderConfig!: LambdaManagedInstancesCapacityProviderConfig;
  constructor(properties: CapacityProviderConfig) {
    Object.assign(this, properties);
  }
}

export class Code {
  SourceKMSKeyArn?: Value<string>;
  S3ObjectVersion?: Value<string>;
  S3Bucket?: Value<string>;
  ZipFile?: Value<string>;
  S3Key?: Value<string>;
  S3ObjectStorageMode?: Value<string>;
  ImageUri?: Value<string>;
  constructor(properties: Code) {
    Object.assign(this, properties);
  }
}

export class DeadLetterConfig {
  TargetArn?: Value<string>;
  constructor(properties: DeadLetterConfig) {
    Object.assign(this, properties);
  }
}

export class DurableConfig {
  ExecutionTimeout!: Value<number>;
  RetentionPeriodInDays?: Value<number>;
  constructor(properties: DurableConfig) {
    Object.assign(this, properties);
  }
}

export class Environment {
  Variables?: { [key: string]: Value<string> };
  constructor(properties: Environment) {
    Object.assign(this, properties);
  }
}

export class EphemeralStorage {
  Size!: Value<number>;
  constructor(properties: EphemeralStorage) {
    Object.assign(this, properties);
  }
}

export class FileSystemConfig {
  Arn!: Value<string>;
  LocalMountPath!: Value<string>;
  constructor(properties: FileSystemConfig) {
    Object.assign(this, properties);
  }
}

export class FunctionScalingConfig {
  MinExecutionEnvironments?: Value<number>;
  MaxExecutionEnvironments?: Value<number>;
  constructor(properties: FunctionScalingConfig) {
    Object.assign(this, properties);
  }
}

export class ImageConfig {
  WorkingDirectory?: Value<string>;
  Command?: List<Value<string>>;
  EntryPoint?: List<Value<string>>;
  constructor(properties: ImageConfig) {
    Object.assign(this, properties);
  }
}

export class LambdaManagedInstancesCapacityProviderConfig {
  ExecutionEnvironmentMemoryGiBPerVCpu?: Value<number>;
  CapacityProviderArn!: Value<string>;
  PerExecutionEnvironmentMaxConcurrency?: Value<number>;
  constructor(properties: LambdaManagedInstancesCapacityProviderConfig) {
    Object.assign(this, properties);
  }
}

export class LoggingConfig {
  LogFormat?: Value<string>;
  ApplicationLogLevel?: Value<string>;
  LogGroup?: Value<string>;
  SystemLogLevel?: Value<string>;
  constructor(properties: LoggingConfig) {
    Object.assign(this, properties);
  }
}

export class RuntimeManagementConfig {
  UpdateRuntimeOn!: Value<string>;
  RuntimeVersionArn?: Value<string>;
  constructor(properties: RuntimeManagementConfig) {
    Object.assign(this, properties);
  }
}

export class SnapStart {
  ApplyOn!: Value<string>;
  constructor(properties: SnapStart) {
    Object.assign(this, properties);
  }
}

export class SnapStartResponse {
  OptimizationStatus?: Value<string>;
  ApplyOn?: Value<string>;
  constructor(properties: SnapStartResponse) {
    Object.assign(this, properties);
  }
}

export class TenancyConfig {
  TenantIsolationMode!: Value<string>;
  constructor(properties: TenancyConfig) {
    Object.assign(this, properties);
  }
}

export class TracingConfig {
  Mode?: Value<string>;
  constructor(properties: TracingConfig) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  Ipv6AllowedForDualStack?: Value<boolean>;
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface FunctionProperties {
  FunctionScalingConfig?: FunctionScalingConfig;
  Description?: Value<string>;
  TracingConfig?: TracingConfig;
  VpcConfig?: VpcConfig;
  RuntimeManagementConfig?: RuntimeManagementConfig;
  DurableConfig?: DurableConfig;
  ReservedConcurrentExecutions?: Value<number>;
  SnapStart?: SnapStart;
  FileSystemConfigs?: List<FileSystemConfig>;
  FunctionName?: Value<string>;
  Runtime?: Value<string>;
  KmsKeyArn?: Value<string>;
  PublishToLatestPublished?: Value<boolean>;
  PackageType?: Value<string>;
  CodeSigningConfigArn?: Value<string>;
  Layers?: List<Value<string>>;
  TenancyConfig?: TenancyConfig;
  Tags?: List<ResourceTag>;
  ImageConfig?: ImageConfig;
  MemorySize?: Value<number>;
  DeadLetterConfig?: DeadLetterConfig;
  Timeout?: Value<number>;
  CapacityProviderConfig?: CapacityProviderConfig;
  Handler?: Value<string>;
  Code: Code;
  Role: Value<string>;
  LoggingConfig?: LoggingConfig;
  RecursiveLoop?: Value<string>;
  Environment?: Environment;
  EphemeralStorage?: EphemeralStorage;
  Architectures?: List<Value<string>>;
}
export default class Function extends ResourceBase<FunctionProperties> {
  static CapacityProviderConfig = CapacityProviderConfig;
  static Code = Code;
  static DeadLetterConfig = DeadLetterConfig;
  static DurableConfig = DurableConfig;
  static Environment = Environment;
  static EphemeralStorage = EphemeralStorage;
  static FileSystemConfig = FileSystemConfig;
  static FunctionScalingConfig = FunctionScalingConfig;
  static ImageConfig = ImageConfig;
  static LambdaManagedInstancesCapacityProviderConfig = LambdaManagedInstancesCapacityProviderConfig;
  static LoggingConfig = LoggingConfig;
  static RuntimeManagementConfig = RuntimeManagementConfig;
  static SnapStart = SnapStart;
  static SnapStartResponse = SnapStartResponse;
  static TenancyConfig = TenancyConfig;
  static TracingConfig = TracingConfig;
  static VpcConfig = VpcConfig;
  constructor(properties: FunctionProperties) {
    super('AWS::Lambda::Function', properties);
  }
}
