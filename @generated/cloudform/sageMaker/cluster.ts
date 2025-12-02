import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AlarmDetails {
  AlarmName!: Value<string>;
  constructor(properties: AlarmDetails) {
    Object.assign(this, properties);
  }
}

export class CapacitySizeConfig {
  Type!: Value<string>;
  Value!: Value<number>;
  constructor(properties: CapacitySizeConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterAutoScalingConfig {
  Mode!: Value<string>;
  AutoScalerType?: Value<string>;
  constructor(properties: ClusterAutoScalingConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterEbsVolumeConfig {
  VolumeSizeInGB?: Value<number>;
  VolumeKmsKeyId?: Value<string>;
  RootVolume?: Value<boolean>;
  constructor(properties: ClusterEbsVolumeConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterInstanceGroup {
  InstanceGroupName!: Value<string>;
  InstanceStorageConfigs?: List<ClusterInstanceStorageConfig>;
  LifeCycleConfig!: ClusterLifeCycleConfig;
  TrainingPlanArn?: Value<string>;
  ThreadsPerCore?: Value<number>;
  OverrideVpcConfig?: VpcConfig;
  InstanceCount!: Value<number>;
  OnStartDeepHealthChecks?: List<Value<string>>;
  ImageId?: Value<string>;
  CurrentCount?: Value<number>;
  ScheduledUpdateConfig?: ScheduledUpdateConfig;
  InstanceType!: Value<string>;
  ExecutionRole!: Value<string>;
  constructor(properties: ClusterInstanceGroup) {
    Object.assign(this, properties);
  }
}

export class ClusterInstanceStorageConfig {
  EbsVolumeConfig?: ClusterEbsVolumeConfig;
  constructor(properties: ClusterInstanceStorageConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterLifeCycleConfig {
  SourceS3Uri!: Value<string>;
  OnCreate!: Value<string>;
  constructor(properties: ClusterLifeCycleConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterOrchestratorEksConfig {
  ClusterArn!: Value<string>;
  constructor(properties: ClusterOrchestratorEksConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterRestrictedInstanceGroup {
  OverrideVpcConfig?: VpcConfig;
  InstanceCount!: Value<number>;
  OnStartDeepHealthChecks?: List<Value<string>>;
  EnvironmentConfig!: EnvironmentConfig;
  InstanceGroupName!: Value<string>;
  InstanceStorageConfigs?: List<ClusterInstanceStorageConfig>;
  CurrentCount?: Value<number>;
  TrainingPlanArn?: Value<string>;
  InstanceType!: Value<string>;
  ThreadsPerCore?: Value<number>;
  ExecutionRole!: Value<string>;
  constructor(properties: ClusterRestrictedInstanceGroup) {
    Object.assign(this, properties);
  }
}

export class DeploymentConfig {
  AutoRollbackConfiguration?: List<AlarmDetails>;
  RollingUpdatePolicy?: RollingUpdatePolicy;
  WaitIntervalInSeconds?: Value<number>;
  constructor(properties: DeploymentConfig) {
    Object.assign(this, properties);
  }
}

export class EnvironmentConfig {
  FSxLustreConfig?: FSxLustreConfig;
  constructor(properties: EnvironmentConfig) {
    Object.assign(this, properties);
  }
}

export class FSxLustreConfig {
  SizeInGiB!: Value<number>;
  PerUnitStorageThroughput!: Value<number>;
  constructor(properties: FSxLustreConfig) {
    Object.assign(this, properties);
  }
}

export class Orchestrator {
  Eks!: ClusterOrchestratorEksConfig;
  constructor(properties: Orchestrator) {
    Object.assign(this, properties);
  }
}

export class RollingUpdatePolicy {
  MaximumBatchSize!: CapacitySizeConfig;
  RollbackMaximumBatchSize?: CapacitySizeConfig;
  constructor(properties: RollingUpdatePolicy) {
    Object.assign(this, properties);
  }
}

export class ScheduledUpdateConfig {
  ScheduleExpression!: Value<string>;
  DeploymentConfig?: DeploymentConfig;
  constructor(properties: ScheduledUpdateConfig) {
    Object.assign(this, properties);
  }
}

export class TieredStorageConfig {
  Mode!: Value<string>;
  InstanceMemoryAllocationPercentage?: Value<number>;
  constructor(properties: TieredStorageConfig) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  SecurityGroupIds!: List<Value<string>>;
  Subnets!: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface ClusterProperties {
  VpcConfig?: VpcConfig;
  NodeRecovery?: Value<string>;
  NodeProvisioningMode?: Value<string>;
  InstanceGroups?: List<ClusterInstanceGroup>;
  RestrictedInstanceGroups?: List<ClusterRestrictedInstanceGroup>;
  ClusterName?: Value<string>;
  Orchestrator?: Orchestrator;
  AutoScaling?: ClusterAutoScalingConfig;
  ClusterRole?: Value<string>;
  Tags?: List<ResourceTag>;
  TieredStorageConfig?: TieredStorageConfig;
}
export default class Cluster extends ResourceBase<ClusterProperties> {
  static AlarmDetails = AlarmDetails;
  static CapacitySizeConfig = CapacitySizeConfig;
  static ClusterAutoScalingConfig = ClusterAutoScalingConfig;
  static ClusterEbsVolumeConfig = ClusterEbsVolumeConfig;
  static ClusterInstanceGroup = ClusterInstanceGroup;
  static ClusterInstanceStorageConfig = ClusterInstanceStorageConfig;
  static ClusterLifeCycleConfig = ClusterLifeCycleConfig;
  static ClusterOrchestratorEksConfig = ClusterOrchestratorEksConfig;
  static ClusterRestrictedInstanceGroup = ClusterRestrictedInstanceGroup;
  static DeploymentConfig = DeploymentConfig;
  static EnvironmentConfig = EnvironmentConfig;
  static FSxLustreConfig = FSxLustreConfig;
  static Orchestrator = Orchestrator;
  static RollingUpdatePolicy = RollingUpdatePolicy;
  static ScheduledUpdateConfig = ScheduledUpdateConfig;
  static TieredStorageConfig = TieredStorageConfig;
  static VpcConfig = VpcConfig;
  constructor(properties?: ClusterProperties) {
    super('AWS::SageMaker::Cluster', properties || {});
  }
}
