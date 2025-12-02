import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Alarm {
  AlarmName!: Value<string>;
  constructor(properties: Alarm) {
    Object.assign(this, properties);
  }
}

export class AutoRollbackConfiguration {
  Alarms!: List<Alarm>;
  constructor(properties: AutoRollbackConfiguration) {
    Object.assign(this, properties);
  }
}

export class DeployedImage {
  ResolutionTime?: Value<string>;
  SpecifiedImage?: Value<string>;
  ResolvedImage?: Value<string>;
  constructor(properties: DeployedImage) {
    Object.assign(this, properties);
  }
}

export class InferenceComponentCapacitySize {
  Type!: Value<string>;
  Value!: Value<number>;
  constructor(properties: InferenceComponentCapacitySize) {
    Object.assign(this, properties);
  }
}

export class InferenceComponentComputeResourceRequirements {
  NumberOfAcceleratorDevicesRequired?: Value<number>;
  MaxMemoryRequiredInMb?: Value<number>;
  MinMemoryRequiredInMb?: Value<number>;
  NumberOfCpuCoresRequired?: Value<number>;
  constructor(properties: InferenceComponentComputeResourceRequirements) {
    Object.assign(this, properties);
  }
}

export class InferenceComponentContainerSpecification {
  ArtifactUrl?: Value<string>;
  Environment?: { [key: string]: Value<string> };
  DeployedImage?: DeployedImage;
  Image?: Value<string>;
  constructor(properties: InferenceComponentContainerSpecification) {
    Object.assign(this, properties);
  }
}

export class InferenceComponentDeploymentConfig {
  AutoRollbackConfiguration?: AutoRollbackConfiguration;
  RollingUpdatePolicy?: InferenceComponentRollingUpdatePolicy;
  constructor(properties: InferenceComponentDeploymentConfig) {
    Object.assign(this, properties);
  }
}

export class InferenceComponentRollingUpdatePolicy {
  MaximumExecutionTimeoutInSeconds?: Value<number>;
  MaximumBatchSize?: InferenceComponentCapacitySize;
  WaitIntervalInSeconds?: Value<number>;
  RollbackMaximumBatchSize?: InferenceComponentCapacitySize;
  constructor(properties: InferenceComponentRollingUpdatePolicy) {
    Object.assign(this, properties);
  }
}

export class InferenceComponentRuntimeConfig {
  CurrentCopyCount?: Value<number>;
  DesiredCopyCount?: Value<number>;
  CopyCount?: Value<number>;
  constructor(properties: InferenceComponentRuntimeConfig) {
    Object.assign(this, properties);
  }
}

export class InferenceComponentSpecification {
  Container?: InferenceComponentContainerSpecification;
  ModelName?: Value<string>;
  ComputeResourceRequirements?: InferenceComponentComputeResourceRequirements;
  BaseInferenceComponentName?: Value<string>;
  StartupParameters?: InferenceComponentStartupParameters;
  constructor(properties: InferenceComponentSpecification) {
    Object.assign(this, properties);
  }
}

export class InferenceComponentStartupParameters {
  ModelDataDownloadTimeoutInSeconds?: Value<number>;
  ContainerStartupHealthCheckTimeoutInSeconds?: Value<number>;
  constructor(properties: InferenceComponentStartupParameters) {
    Object.assign(this, properties);
  }
}
export interface InferenceComponentProperties {
  EndpointName: Value<string>;
  VariantName?: Value<string>;
  InferenceComponentName?: Value<string>;
  Specification: InferenceComponentSpecification;
  RuntimeConfig?: InferenceComponentRuntimeConfig;
  DeploymentConfig?: InferenceComponentDeploymentConfig;
  EndpointArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class InferenceComponent extends ResourceBase<InferenceComponentProperties> {
  static Alarm = Alarm;
  static AutoRollbackConfiguration = AutoRollbackConfiguration;
  static DeployedImage = DeployedImage;
  static InferenceComponentCapacitySize = InferenceComponentCapacitySize;
  static InferenceComponentComputeResourceRequirements = InferenceComponentComputeResourceRequirements;
  static InferenceComponentContainerSpecification = InferenceComponentContainerSpecification;
  static InferenceComponentDeploymentConfig = InferenceComponentDeploymentConfig;
  static InferenceComponentRollingUpdatePolicy = InferenceComponentRollingUpdatePolicy;
  static InferenceComponentRuntimeConfig = InferenceComponentRuntimeConfig;
  static InferenceComponentSpecification = InferenceComponentSpecification;
  static InferenceComponentStartupParameters = InferenceComponentStartupParameters;
  constructor(properties: InferenceComponentProperties) {
    super('AWS::SageMaker::InferenceComponent', properties);
  }
}
