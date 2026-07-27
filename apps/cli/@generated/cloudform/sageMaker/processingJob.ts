import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AppSpecification {
  ContainerEntrypoint?: List<Value<string>>;
  ImageUri!: Value<string>;
  ContainerArguments?: List<Value<string>>;
  constructor(properties: AppSpecification) {
    Object.assign(this, properties);
  }
}

export class AthenaDatasetDefinition {
  WorkGroup?: Value<string>;
  OutputS3Uri!: Value<string>;
  KmsKeyId?: Value<string>;
  QueryString!: Value<string>;
  Database!: Value<string>;
  OutputFormat!: Value<string>;
  OutputCompression?: Value<string>;
  Catalog!: Value<string>;
  constructor(properties: AthenaDatasetDefinition) {
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

export class DatasetDefinition {
  InputMode?: Value<string>;
  RedshiftDatasetDefinition?: RedshiftDatasetDefinition;
  AthenaDatasetDefinition?: AthenaDatasetDefinition;
  LocalPath?: Value<string>;
  DataDistributionType?: Value<string>;
  constructor(properties: DatasetDefinition) {
    Object.assign(this, properties);
  }
}

export class ExperimentConfig {
  TrialName?: Value<string>;
  ExperimentName?: Value<string>;
  TrialComponentDisplayName?: Value<string>;
  RunName?: Value<string>;
  constructor(properties: ExperimentConfig) {
    Object.assign(this, properties);
  }
}

export class FeatureStoreOutput {
  FeatureGroupName!: Value<string>;
  constructor(properties: FeatureStoreOutput) {
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

export class ProcessingInputsObject {
  AppManaged?: Value<boolean>;
  InputName!: Value<string>;
  DatasetDefinition?: DatasetDefinition;
  S3Input?: S3Input;
  constructor(properties: ProcessingInputsObject) {
    Object.assign(this, properties);
  }
}

export class ProcessingOutputConfig {
  KmsKeyId?: Value<string>;
  Outputs!: List<ProcessingOutputsObject>;
  constructor(properties: ProcessingOutputConfig) {
    Object.assign(this, properties);
  }
}

export class ProcessingOutputsObject {
  S3Output?: S3Output;
  AppManaged?: Value<boolean>;
  FeatureStoreOutput?: FeatureStoreOutput;
  OutputName!: Value<string>;
  constructor(properties: ProcessingOutputsObject) {
    Object.assign(this, properties);
  }
}

export class ProcessingResources {
  ClusterConfig!: ClusterConfig;
  constructor(properties: ProcessingResources) {
    Object.assign(this, properties);
  }
}

export class RedshiftDatasetDefinition {
  OutputS3Uri!: Value<string>;
  KmsKeyId?: Value<string>;
  ClusterId!: Value<string>;
  QueryString!: Value<string>;
  Database!: Value<string>;
  OutputFormat!: Value<string>;
  OutputCompression?: Value<string>;
  ClusterRoleArn!: Value<string>;
  DbUser!: Value<string>;
  constructor(properties: RedshiftDatasetDefinition) {
    Object.assign(this, properties);
  }
}

export class S3Input {
  S3CompressionType?: Value<string>;
  S3DataDistributionType?: Value<string>;
  S3Uri!: Value<string>;
  S3InputMode?: Value<string>;
  LocalPath?: Value<string>;
  S3DataType!: Value<string>;
  constructor(properties: S3Input) {
    Object.assign(this, properties);
  }
}

export class S3Output {
  S3Uri!: Value<string>;
  LocalPath?: Value<string>;
  S3UploadMode!: Value<string>;
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
export interface ProcessingJobProperties {
  ProcessingResources: ProcessingResources;
  StoppingCondition?: StoppingCondition;
  ExperimentConfig?: ExperimentConfig;
  ProcessingInputs?: List<ProcessingInputsObject>;
  NetworkConfig?: NetworkConfig;
  ProcessingOutputConfig?: ProcessingOutputConfig;
  Environment?: { [key: string]: Value<string> };
  AppSpecification: AppSpecification;
  ProcessingJobName?: Value<string>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ProcessingJob extends ResourceBase<ProcessingJobProperties> {
  static AppSpecification = AppSpecification;
  static AthenaDatasetDefinition = AthenaDatasetDefinition;
  static ClusterConfig = ClusterConfig;
  static DatasetDefinition = DatasetDefinition;
  static ExperimentConfig = ExperimentConfig;
  static FeatureStoreOutput = FeatureStoreOutput;
  static NetworkConfig = NetworkConfig;
  static ProcessingInputsObject = ProcessingInputsObject;
  static ProcessingOutputConfig = ProcessingOutputConfig;
  static ProcessingOutputsObject = ProcessingOutputsObject;
  static ProcessingResources = ProcessingResources;
  static RedshiftDatasetDefinition = RedshiftDatasetDefinition;
  static S3Input = S3Input;
  static S3Output = S3Output;
  static StoppingCondition = StoppingCondition;
  static VpcConfig = VpcConfig;
  constructor(properties: ProcessingJobProperties) {
    super('AWS::SageMaker::ProcessingJob', properties);
  }
}
