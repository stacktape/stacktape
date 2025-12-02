import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CaptureContentTypeHeader {
  JsonContentTypes?: List<Value<string>>;
  CsvContentTypes?: List<Value<string>>;
  constructor(properties: CaptureContentTypeHeader) {
    Object.assign(this, properties);
  }
}

export class DataStorageConfig {
  Destination!: Value<string>;
  ContentType?: CaptureContentTypeHeader;
  KmsKey?: Value<string>;
  constructor(properties: DataStorageConfig) {
    Object.assign(this, properties);
  }
}

export class EndpointMetadata {
  EndpointStatus?: Value<string>;
  EndpointName!: Value<string>;
  EndpointConfigName?: Value<string>;
  constructor(properties: EndpointMetadata) {
    Object.assign(this, properties);
  }
}

export class InferenceExperimentSchedule {
  EndTime?: Value<string>;
  StartTime?: Value<string>;
  constructor(properties: InferenceExperimentSchedule) {
    Object.assign(this, properties);
  }
}

export class ModelInfrastructureConfig {
  InfrastructureType!: Value<string>;
  RealTimeInferenceConfig!: RealTimeInferenceConfig;
  constructor(properties: ModelInfrastructureConfig) {
    Object.assign(this, properties);
  }
}

export class ModelVariantConfig {
  ModelName!: Value<string>;
  VariantName!: Value<string>;
  InfrastructureConfig!: ModelInfrastructureConfig;
  constructor(properties: ModelVariantConfig) {
    Object.assign(this, properties);
  }
}

export class RealTimeInferenceConfig {
  InstanceCount!: Value<number>;
  InstanceType!: Value<string>;
  constructor(properties: RealTimeInferenceConfig) {
    Object.assign(this, properties);
  }
}

export class ShadowModeConfig {
  SourceModelVariantName!: Value<string>;
  ShadowModelVariants!: List<ShadowModelVariantConfig>;
  constructor(properties: ShadowModeConfig) {
    Object.assign(this, properties);
  }
}

export class ShadowModelVariantConfig {
  ShadowModelVariantName!: Value<string>;
  SamplingPercentage!: Value<number>;
  constructor(properties: ShadowModelVariantConfig) {
    Object.assign(this, properties);
  }
}
export interface InferenceExperimentProperties {
  DataStorageConfig?: DataStorageConfig;
  Description?: Value<string>;
  StatusReason?: Value<string>;
  ModelVariants: List<ModelVariantConfig>;
  ShadowModeConfig?: ShadowModeConfig;
  RoleArn: Value<string>;
  Name: Value<string>;
  Type: Value<string>;
  EndpointName: Value<string>;
  DesiredState?: Value<string>;
  Schedule?: InferenceExperimentSchedule;
  KmsKey?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class InferenceExperiment extends ResourceBase<InferenceExperimentProperties> {
  static CaptureContentTypeHeader = CaptureContentTypeHeader;
  static DataStorageConfig = DataStorageConfig;
  static EndpointMetadata = EndpointMetadata;
  static InferenceExperimentSchedule = InferenceExperimentSchedule;
  static ModelInfrastructureConfig = ModelInfrastructureConfig;
  static ModelVariantConfig = ModelVariantConfig;
  static RealTimeInferenceConfig = RealTimeInferenceConfig;
  static ShadowModeConfig = ShadowModeConfig;
  static ShadowModelVariantConfig = ShadowModelVariantConfig;
  constructor(properties: InferenceExperimentProperties) {
    super('AWS::SageMaker::InferenceExperiment', properties);
  }
}
