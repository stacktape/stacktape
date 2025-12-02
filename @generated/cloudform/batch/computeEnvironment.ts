import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ComputeResources {
  SpotIamFleetRole?: Value<string>;
  MaxvCpus!: Value<number>;
  Ec2Configuration?: List<Ec2ConfigurationObject>;
  BidPercentage?: Value<number>;
  SecurityGroupIds?: List<Value<string>>;
  AllocationStrategy?: Value<string>;
  Subnets!: List<Value<string>>;
  Type!: Value<string>;
  MinvCpus?: Value<number>;
  UpdateToLatestImageVersion?: Value<boolean>;
  LaunchTemplate?: LaunchTemplateSpecification;
  ImageId?: Value<string>;
  InstanceRole?: Value<string>;
  InstanceTypes?: List<Value<string>>;
  Ec2KeyPair?: Value<string>;
  PlacementGroup?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  DesiredvCpus?: Value<number>;
  constructor(properties: ComputeResources) {
    Object.assign(this, properties);
  }
}

export class Ec2ConfigurationObject {
  ImageIdOverride?: Value<string>;
  ImageKubernetesVersion?: Value<string>;
  ImageType!: Value<string>;
  constructor(properties: Ec2ConfigurationObject) {
    Object.assign(this, properties);
  }
}

export class EksConfiguration {
  EksClusterArn!: Value<string>;
  KubernetesNamespace!: Value<string>;
  constructor(properties: EksConfiguration) {
    Object.assign(this, properties);
  }
}

export class LaunchTemplateSpecification {
  UserdataType?: Value<string>;
  LaunchTemplateName?: Value<string>;
  Version?: Value<string>;
  Overrides?: List<LaunchTemplateSpecificationOverride>;
  LaunchTemplateId?: Value<string>;
  constructor(properties: LaunchTemplateSpecification) {
    Object.assign(this, properties);
  }
}

export class LaunchTemplateSpecificationOverride {
  TargetInstanceTypes?: List<Value<string>>;
  UserdataType?: Value<string>;
  LaunchTemplateName?: Value<string>;
  Version?: Value<string>;
  LaunchTemplateId?: Value<string>;
  constructor(properties: LaunchTemplateSpecificationOverride) {
    Object.assign(this, properties);
  }
}

export class UpdatePolicy {
  JobExecutionTimeoutMinutes?: Value<number>;
  TerminateJobsOnUpdate?: Value<boolean>;
  constructor(properties: UpdatePolicy) {
    Object.assign(this, properties);
  }
}
export interface ComputeEnvironmentProperties {
  Context?: Value<string>;
  UnmanagedvCpus?: Value<number>;
  Type: Value<string>;
  ReplaceComputeEnvironment?: Value<boolean>;
  ServiceRole?: Value<string>;
  UpdatePolicy?: UpdatePolicy;
  EksConfiguration?: EksConfiguration;
  ComputeEnvironmentName?: Value<string>;
  ComputeResources?: ComputeResources;
  State?: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class ComputeEnvironment extends ResourceBase<ComputeEnvironmentProperties> {
  static ComputeResources = ComputeResources;
  static Ec2ConfigurationObject = Ec2ConfigurationObject;
  static EksConfiguration = EksConfiguration;
  static LaunchTemplateSpecification = LaunchTemplateSpecification;
  static LaunchTemplateSpecificationOverride = LaunchTemplateSpecificationOverride;
  static UpdatePolicy = UpdatePolicy;
  constructor(properties: ComputeEnvironmentProperties) {
    super('AWS::Batch::ComputeEnvironment', properties);
  }
}
