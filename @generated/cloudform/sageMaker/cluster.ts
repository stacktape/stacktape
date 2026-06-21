import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AlarmDetails {
  AlarmName!: Value<string>;
  constructor(properties: AlarmDetails) {
    Object.assign(this, properties);
  }
}

export class CapacitySizeConfig {
  Value!: Value<number>;
  Type!: Value<string>;
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

export class ClusterCapacityRequirements {
  Spot?: { [key: string]: any };
  OnDemand?: { [key: string]: any };
  constructor(properties: ClusterCapacityRequirements) {
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

export class ClusterFsxLustreConfig {
  MountPath?: Value<string>;
  DnsName!: Value<string>;
  MountName!: Value<string>;
  constructor(properties: ClusterFsxLustreConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterFsxOpenZfsConfig {
  MountPath?: Value<string>;
  DnsName!: Value<string>;
  constructor(properties: ClusterFsxOpenZfsConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterInstanceGroup {
  SlurmConfig?: ClusterSlurmConfig;
  CapacityRequirements?: ClusterCapacityRequirements;
  InstanceGroupName!: Value<string>;
  InstanceStorageConfigs?: List<ClusterInstanceStorageConfig>;
  KubernetesConfig?: ClusterKubernetesConfig;
  NetworkInterface?: ClusterNetworkInterface;
  LifeCycleConfig?: ClusterLifeCycleConfig;
  TrainingPlanArn?: Value<string>;
  ThreadsPerCore?: Value<number>;
  OverrideVpcConfig?: VpcConfig;
  InstanceCount!: Value<number>;
  OnStartDeepHealthChecks?: List<Value<string>>;
  ImageId?: Value<string>;
  CurrentCount?: Value<number>;
  ScheduledUpdateConfig?: ScheduledUpdateConfig;
  InstanceRequirements?: InstanceRequirements;
  InstanceType!: Value<string>;
  ExecutionRole!: Value<string>;
  MinInstanceCount?: Value<number>;
  constructor(properties: ClusterInstanceGroup) {
    Object.assign(this, properties);
  }
}

export class ClusterInstanceStorageConfig {
  FsxLustreConfig?: ClusterFsxLustreConfig;
  EbsVolumeConfig?: ClusterEbsVolumeConfig;
  FsxOpenZfsConfig?: ClusterFsxOpenZfsConfig;
  constructor(properties: ClusterInstanceStorageConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterKubernetesConfig {
  Labels?: { [key: string]: Value<string> };
  Taints?: List<ClusterKubernetesTaint>;
  constructor(properties: ClusterKubernetesConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterKubernetesTaint {
  Value?: Value<string>;
  Effect!: Value<string>;
  Key!: Value<string>;
  constructor(properties: ClusterKubernetesTaint) {
    Object.assign(this, properties);
  }
}

export class ClusterLifeCycleConfig {
  OnInitComplete?: Value<string>;
  SourceS3Uri?: Value<string>;
  OnCreate?: Value<string>;
  constructor(properties: ClusterLifeCycleConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterNetworkInterface {
  InterfaceType!: Value<string>;
  constructor(properties: ClusterNetworkInterface) {
    Object.assign(this, properties);
  }
}

export class ClusterOrchestratorEksConfig {
  ClusterArn!: Value<string>;
  constructor(properties: ClusterOrchestratorEksConfig) {
    Object.assign(this, properties);
  }
}

export class ClusterOrchestratorSlurmConfig {
  SlurmConfigStrategy?: Value<string>;
  constructor(properties: ClusterOrchestratorSlurmConfig) {
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

export class ClusterSlurmConfig {
  PartitionNames?: List<Value<string>>;
  NodeType!: Value<string>;
  constructor(properties: ClusterSlurmConfig) {
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

export class InstanceRequirements {
  InstanceTypes!: List<Value<string>>;
  constructor(properties: InstanceRequirements) {
    Object.assign(this, properties);
  }
}

export class Orchestrator {
  Slurm?: ClusterOrchestratorSlurmConfig;
  Eks?: ClusterOrchestratorEksConfig;
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
  static ClusterCapacityRequirements = ClusterCapacityRequirements;
  static ClusterEbsVolumeConfig = ClusterEbsVolumeConfig;
  static ClusterFsxLustreConfig = ClusterFsxLustreConfig;
  static ClusterFsxOpenZfsConfig = ClusterFsxOpenZfsConfig;
  static ClusterInstanceGroup = ClusterInstanceGroup;
  static ClusterInstanceStorageConfig = ClusterInstanceStorageConfig;
  static ClusterKubernetesConfig = ClusterKubernetesConfig;
  static ClusterKubernetesTaint = ClusterKubernetesTaint;
  static ClusterLifeCycleConfig = ClusterLifeCycleConfig;
  static ClusterNetworkInterface = ClusterNetworkInterface;
  static ClusterOrchestratorEksConfig = ClusterOrchestratorEksConfig;
  static ClusterOrchestratorSlurmConfig = ClusterOrchestratorSlurmConfig;
  static ClusterRestrictedInstanceGroup = ClusterRestrictedInstanceGroup;
  static ClusterSlurmConfig = ClusterSlurmConfig;
  static DeploymentConfig = DeploymentConfig;
  static EnvironmentConfig = EnvironmentConfig;
  static FSxLustreConfig = FSxLustreConfig;
  static InstanceRequirements = InstanceRequirements;
  static Orchestrator = Orchestrator;
  static RollingUpdatePolicy = RollingUpdatePolicy;
  static ScheduledUpdateConfig = ScheduledUpdateConfig;
  static TieredStorageConfig = TieredStorageConfig;
  static VpcConfig = VpcConfig;
  constructor(properties?: ClusterProperties) {
    super('AWS::SageMaker::Cluster', properties || {});
  }
}
