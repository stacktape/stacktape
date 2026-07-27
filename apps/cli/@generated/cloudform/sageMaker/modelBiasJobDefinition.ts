import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BatchTransformInput {
  DatasetFormat!: DatasetFormat;
  S3DataDistributionType?: Value<string>;
  StartTimeOffset?: Value<string>;
  EndTimeOffset?: Value<string>;
  ProbabilityThresholdAttribute?: Value<number>;
  InferenceAttribute?: Value<string>;
  DataCapturedDestinationS3Uri!: Value<string>;
  S3InputMode?: Value<string>;
  LocalPath!: Value<string>;
  ProbabilityAttribute?: Value<string>;
  FeaturesAttribute?: Value<string>;
  constructor(properties: BatchTransformInput) {
    Object.assign(this, properties);
  }
}

export class ClusterConfig {
  InstanceCount!: Value<number>;
  VolumeSizeInGB!: Value<number>;
  VolumeKmsKeyId?: Value<string>;
  InstanceType!: Value<string>;
  constructor(properties: ClusterConfig) {
    Object.assign(this, properties);
  }
}

export class ConstraintsResource {
  S3Uri?: Value<string>;
  constructor(properties: ConstraintsResource) {
    Object.assign(this, properties);
  }
}

export class Csv {
  Header?: Value<boolean>;
  constructor(properties: Csv) {
    Object.assign(this, properties);
  }
}

export class DatasetFormat {
  Parquet?: Value<boolean>;
  Csv?: Csv;
  Json?: Json;
  constructor(properties: DatasetFormat) {
    Object.assign(this, properties);
  }
}

export class EndpointInput {
  S3DataDistributionType?: Value<string>;
  StartTimeOffset?: Value<string>;
  EndTimeOffset?: Value<string>;
  ProbabilityThresholdAttribute?: Value<number>;
  EndpointName!: Value<string>;
  InferenceAttribute?: Value<string>;
  S3InputMode?: Value<string>;
  LocalPath!: Value<string>;
  ProbabilityAttribute?: Value<string>;
  FeaturesAttribute?: Value<string>;
  constructor(properties: EndpointInput) {
    Object.assign(this, properties);
  }
}

export class Json {
  Line?: Value<boolean>;
  constructor(properties: Json) {
    Object.assign(this, properties);
  }
}

export class ModelBiasAppSpecification {
  ConfigUri!: Value<string>;
  Environment?: { [key: string]: Value<string> };
  ImageUri!: Value<string>;
  constructor(properties: ModelBiasAppSpecification) {
    Object.assign(this, properties);
  }
}

export class ModelBiasBaselineConfig {
  ConstraintsResource?: ConstraintsResource;
  BaseliningJobName?: Value<string>;
  constructor(properties: ModelBiasBaselineConfig) {
    Object.assign(this, properties);
  }
}

export class ModelBiasJobInput {
  GroundTruthS3Input!: MonitoringGroundTruthS3Input;
  BatchTransformInput?: BatchTransformInput;
  EndpointInput?: EndpointInput;
  constructor(properties: ModelBiasJobInput) {
    Object.assign(this, properties);
  }
}

export class MonitoringGroundTruthS3Input {
  S3Uri!: Value<string>;
  constructor(properties: MonitoringGroundTruthS3Input) {
    Object.assign(this, properties);
  }
}

export class MonitoringOutput {
  S3Output!: S3Output;
  constructor(properties: MonitoringOutput) {
    Object.assign(this, properties);
  }
}

export class MonitoringOutputConfig {
  KmsKeyId?: Value<string>;
  MonitoringOutputs!: List<MonitoringOutput>;
  constructor(properties: MonitoringOutputConfig) {
    Object.assign(this, properties);
  }
}

export class MonitoringResources {
  ClusterConfig!: ClusterConfig;
  constructor(properties: MonitoringResources) {
    Object.assign(this, properties);
  }
}

export class NetworkConfig {
  EnableNetworkIsolation?: Value<boolean>;
  EnableInterContainerTrafficEncryption?: Value<boolean>;
  VpcConfig?: VpcConfig;
  constructor(properties: NetworkConfig) {
    Object.assign(this, properties);
  }
}

export class S3Output {
  S3Uri!: Value<string>;
  LocalPath!: Value<string>;
  S3UploadMode?: Value<string>;
  constructor(properties: S3Output) {
    Object.assign(this, properties);
  }
}

export class StoppingCondition {
  MaxRuntimeInSeconds!: Value<number>;
  constructor(properties: StoppingCondition) {
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
export interface ModelBiasJobDefinitionProperties {
  ModelBiasJobInput: ModelBiasJobInput;
  ModelBiasJobOutputConfig: MonitoringOutputConfig;
  EndpointName?: Value<string>;
  StoppingCondition?: StoppingCondition;
  JobDefinitionName?: Value<string>;
  JobResources: MonitoringResources;
  NetworkConfig?: NetworkConfig;
  ModelBiasBaselineConfig?: ModelBiasBaselineConfig;
  ModelBiasAppSpecification: ModelBiasAppSpecification;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ModelBiasJobDefinition extends ResourceBase<ModelBiasJobDefinitionProperties> {
  static BatchTransformInput = BatchTransformInput;
  static ClusterConfig = ClusterConfig;
  static ConstraintsResource = ConstraintsResource;
  static Csv = Csv;
  static DatasetFormat = DatasetFormat;
  static EndpointInput = EndpointInput;
  static Json = Json;
  static ModelBiasAppSpecification = ModelBiasAppSpecification;
  static ModelBiasBaselineConfig = ModelBiasBaselineConfig;
  static ModelBiasJobInput = ModelBiasJobInput;
  static MonitoringGroundTruthS3Input = MonitoringGroundTruthS3Input;
  static MonitoringOutput = MonitoringOutput;
  static MonitoringOutputConfig = MonitoringOutputConfig;
  static MonitoringResources = MonitoringResources;
  static NetworkConfig = NetworkConfig;
  static S3Output = S3Output;
  static StoppingCondition = StoppingCondition;
  static VpcConfig = VpcConfig;
  constructor(properties: ModelBiasJobDefinitionProperties) {
    super('AWS::SageMaker::ModelBiasJobDefinition', properties);
  }
}
