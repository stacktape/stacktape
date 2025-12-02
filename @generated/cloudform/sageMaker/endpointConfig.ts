import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AsyncInferenceClientConfig {
  MaxConcurrentInvocationsPerInstance?: Value<number>;
  constructor(properties: AsyncInferenceClientConfig) {
    Object.assign(this, properties);
  }
}

export class AsyncInferenceConfig {
  OutputConfig!: AsyncInferenceOutputConfig;
  ClientConfig?: AsyncInferenceClientConfig;
  constructor(properties: AsyncInferenceConfig) {
    Object.assign(this, properties);
  }
}

export class AsyncInferenceNotificationConfig {
  IncludeInferenceResponseIn?: List<Value<string>>;
  SuccessTopic?: Value<string>;
  ErrorTopic?: Value<string>;
  constructor(properties: AsyncInferenceNotificationConfig) {
    Object.assign(this, properties);
  }
}

export class AsyncInferenceOutputConfig {
  KmsKeyId?: Value<string>;
  NotificationConfig?: AsyncInferenceNotificationConfig;
  S3OutputPath?: Value<string>;
  S3FailurePath?: Value<string>;
  constructor(properties: AsyncInferenceOutputConfig) {
    Object.assign(this, properties);
  }
}

export class CapacityReservationConfig {
  MlReservationArn?: Value<string>;
  CapacityReservationPreference?: Value<string>;
  constructor(properties: CapacityReservationConfig) {
    Object.assign(this, properties);
  }
}

export class CaptureContentTypeHeader {
  JsonContentTypes?: List<Value<string>>;
  CsvContentTypes?: List<Value<string>>;
  constructor(properties: CaptureContentTypeHeader) {
    Object.assign(this, properties);
  }
}

export class CaptureOption {
  CaptureMode!: Value<string>;
  constructor(properties: CaptureOption) {
    Object.assign(this, properties);
  }
}

export class ClarifyExplainerConfig {
  InferenceConfig?: ClarifyInferenceConfig;
  EnableExplanations?: Value<string>;
  ShapConfig!: ClarifyShapConfig;
  constructor(properties: ClarifyExplainerConfig) {
    Object.assign(this, properties);
  }
}

export type ClarifyFeatureType = Value<string>;

export type ClarifyHeader = Value<string>;

export class ClarifyInferenceConfig {
  ContentTemplate?: Value<string>;
  LabelHeaders?: List<ClarifyHeader>;
  MaxPayloadInMB?: Value<number>;
  ProbabilityIndex?: Value<number>;
  LabelAttribute?: Value<string>;
  FeatureTypes?: List<ClarifyFeatureType>;
  FeatureHeaders?: List<ClarifyHeader>;
  LabelIndex?: Value<number>;
  ProbabilityAttribute?: Value<string>;
  FeaturesAttribute?: Value<string>;
  MaxRecordCount?: Value<number>;
  constructor(properties: ClarifyInferenceConfig) {
    Object.assign(this, properties);
  }
}

export class ClarifyShapBaselineConfig {
  ShapBaseline?: Value<string>;
  ShapBaselineUri?: Value<string>;
  MimeType?: Value<string>;
  constructor(properties: ClarifyShapBaselineConfig) {
    Object.assign(this, properties);
  }
}

export class ClarifyShapConfig {
  TextConfig?: ClarifyTextConfig;
  UseLogit?: Value<boolean>;
  Seed?: Value<number>;
  ShapBaselineConfig!: ClarifyShapBaselineConfig;
  NumberOfSamples?: Value<number>;
  constructor(properties: ClarifyShapConfig) {
    Object.assign(this, properties);
  }
}

export class ClarifyTextConfig {
  Language!: Value<string>;
  Granularity!: Value<string>;
  constructor(properties: ClarifyTextConfig) {
    Object.assign(this, properties);
  }
}

export class DataCaptureConfig {
  CaptureOptions!: List<CaptureOption>;
  KmsKeyId?: Value<string>;
  DestinationS3Uri!: Value<string>;
  InitialSamplingPercentage!: Value<number>;
  CaptureContentTypeHeader?: CaptureContentTypeHeader;
  EnableCapture?: Value<boolean>;
  constructor(properties: DataCaptureConfig) {
    Object.assign(this, properties);
  }
}

export class ExplainerConfig {
  ClarifyExplainerConfig?: ClarifyExplainerConfig;
  constructor(properties: ExplainerConfig) {
    Object.assign(this, properties);
  }
}

export class ManagedInstanceScaling {
  Status?: Value<string>;
  MaxInstanceCount?: Value<number>;
  MinInstanceCount?: Value<number>;
  constructor(properties: ManagedInstanceScaling) {
    Object.assign(this, properties);
  }
}

export class ProductionVariant {
  ManagedInstanceScaling?: ManagedInstanceScaling;
  ModelName?: Value<string>;
  VolumeSizeInGB?: Value<number>;
  EnableSSMAccess?: Value<boolean>;
  VariantName!: Value<string>;
  InitialInstanceCount?: Value<number>;
  RoutingConfig?: RoutingConfig;
  InitialVariantWeight?: Value<number>;
  ModelDataDownloadTimeoutInSeconds?: Value<number>;
  CapacityReservationConfig?: CapacityReservationConfig;
  InferenceAmiVersion?: Value<string>;
  ContainerStartupHealthCheckTimeoutInSeconds?: Value<number>;
  ServerlessConfig?: ServerlessConfig;
  InstanceType?: Value<string>;
  constructor(properties: ProductionVariant) {
    Object.assign(this, properties);
  }
}

export class RoutingConfig {
  RoutingStrategy?: Value<string>;
  constructor(properties: RoutingConfig) {
    Object.assign(this, properties);
  }
}

export class ServerlessConfig {
  MaxConcurrency!: Value<number>;
  MemorySizeInMB!: Value<number>;
  ProvisionedConcurrency?: Value<number>;
  constructor(properties: ServerlessConfig) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  Subnets!: List<Value<string>>;
  SecurityGroupIds!: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface EndpointConfigProperties {
  ShadowProductionVariants?: List<ProductionVariant>;
  DataCaptureConfig?: DataCaptureConfig;
  ExecutionRoleArn?: Value<string>;
  EnableNetworkIsolation?: Value<boolean>;
  ProductionVariants: List<ProductionVariant>;
  KmsKeyId?: Value<string>;
  AsyncInferenceConfig?: AsyncInferenceConfig;
  VpcConfig?: VpcConfig;
  EndpointConfigName?: Value<string>;
  ExplainerConfig?: ExplainerConfig;
  Tags?: List<ResourceTag>;
}
export default class EndpointConfig extends ResourceBase<EndpointConfigProperties> {
  static AsyncInferenceClientConfig = AsyncInferenceClientConfig;
  static AsyncInferenceConfig = AsyncInferenceConfig;
  static AsyncInferenceNotificationConfig = AsyncInferenceNotificationConfig;
  static AsyncInferenceOutputConfig = AsyncInferenceOutputConfig;
  static CapacityReservationConfig = CapacityReservationConfig;
  static CaptureContentTypeHeader = CaptureContentTypeHeader;
  static CaptureOption = CaptureOption;
  static ClarifyExplainerConfig = ClarifyExplainerConfig;
  static ClarifyInferenceConfig = ClarifyInferenceConfig;
  static ClarifyShapBaselineConfig = ClarifyShapBaselineConfig;
  static ClarifyShapConfig = ClarifyShapConfig;
  static ClarifyTextConfig = ClarifyTextConfig;
  static DataCaptureConfig = DataCaptureConfig;
  static ExplainerConfig = ExplainerConfig;
  static ManagedInstanceScaling = ManagedInstanceScaling;
  static ProductionVariant = ProductionVariant;
  static RoutingConfig = RoutingConfig;
  static ServerlessConfig = ServerlessConfig;
  static VpcConfig = VpcConfig;
  constructor(properties: EndpointConfigProperties) {
    super('AWS::SageMaker::EndpointConfig', properties);
  }
}
