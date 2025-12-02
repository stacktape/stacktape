import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AcceleratorCountRequest {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: AcceleratorCountRequest) {
    Object.assign(this, properties);
  }
}

export class AcceleratorTotalMemoryMiBRequest {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: AcceleratorTotalMemoryMiBRequest) {
    Object.assign(this, properties);
  }
}

export class AvailabilityZoneDistribution {
  CapacityDistributionStrategy?: Value<string>;
  constructor(properties: AvailabilityZoneDistribution) {
    Object.assign(this, properties);
  }
}

export class AvailabilityZoneImpairmentPolicy {
  ZonalShiftEnabled!: Value<boolean>;
  ImpairedZoneHealthCheckBehavior!: Value<string>;
  constructor(properties: AvailabilityZoneImpairmentPolicy) {
    Object.assign(this, properties);
  }
}

export class BaselineEbsBandwidthMbpsRequest {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: BaselineEbsBandwidthMbpsRequest) {
    Object.assign(this, properties);
  }
}

export class BaselinePerformanceFactorsRequest {
  Cpu?: CpuPerformanceFactorRequest;
  constructor(properties: BaselinePerformanceFactorsRequest) {
    Object.assign(this, properties);
  }
}

export class CapacityReservationSpecification {
  CapacityReservationPreference!: Value<string>;
  CapacityReservationTarget?: CapacityReservationTarget;
  constructor(properties: CapacityReservationSpecification) {
    Object.assign(this, properties);
  }
}

export class CapacityReservationTarget {
  CapacityReservationIds?: List<Value<string>>;
  CapacityReservationResourceGroupArns?: List<Value<string>>;
  constructor(properties: CapacityReservationTarget) {
    Object.assign(this, properties);
  }
}

export class CpuPerformanceFactorRequest {
  References?: List<PerformanceFactorReferenceRequest>;
  constructor(properties: CpuPerformanceFactorRequest) {
    Object.assign(this, properties);
  }
}

export class InstanceMaintenancePolicy {
  MaxHealthyPercentage?: Value<number>;
  MinHealthyPercentage?: Value<number>;
  constructor(properties: InstanceMaintenancePolicy) {
    Object.assign(this, properties);
  }
}

export class InstanceRequirements {
  InstanceGenerations?: List<Value<string>>;
  AcceleratorTypes?: List<Value<string>>;
  MemoryGiBPerVCpu?: MemoryGiBPerVCpuRequest;
  AcceleratorManufacturers?: List<Value<string>>;
  VCpuCount!: VCpuCountRequest;
  LocalStorage?: Value<string>;
  CpuManufacturers?: List<Value<string>>;
  BareMetal?: Value<string>;
  RequireHibernateSupport?: Value<boolean>;
  MaxSpotPriceAsPercentageOfOptimalOnDemandPrice?: Value<number>;
  OnDemandMaxPricePercentageOverLowestPrice?: Value<number>;
  MemoryMiB!: MemoryMiBRequest;
  LocalStorageTypes?: List<Value<string>>;
  NetworkInterfaceCount?: NetworkInterfaceCountRequest;
  ExcludedInstanceTypes?: List<Value<string>>;
  AllowedInstanceTypes?: List<Value<string>>;
  AcceleratorCount?: AcceleratorCountRequest;
  NetworkBandwidthGbps?: NetworkBandwidthGbpsRequest;
  BaselinePerformanceFactors?: BaselinePerformanceFactorsRequest;
  BaselineEbsBandwidthMbps?: BaselineEbsBandwidthMbpsRequest;
  SpotMaxPricePercentageOverLowestPrice?: Value<number>;
  AcceleratorNames?: List<Value<string>>;
  AcceleratorTotalMemoryMiB?: AcceleratorTotalMemoryMiBRequest;
  BurstablePerformance?: Value<string>;
  TotalLocalStorageGB?: TotalLocalStorageGBRequest;
  constructor(properties: InstanceRequirements) {
    Object.assign(this, properties);
  }
}

export class InstancesDistribution {
  OnDemandAllocationStrategy?: Value<string>;
  OnDemandBaseCapacity?: Value<number>;
  OnDemandPercentageAboveBaseCapacity?: Value<number>;
  SpotInstancePools?: Value<number>;
  SpotAllocationStrategy?: Value<string>;
  SpotMaxPrice?: Value<string>;
  constructor(properties: InstancesDistribution) {
    Object.assign(this, properties);
  }
}

export class LaunchTemplate {
  LaunchTemplateSpecification!: LaunchTemplateSpecification;
  Overrides?: List<LaunchTemplateOverrides>;
  constructor(properties: LaunchTemplate) {
    Object.assign(this, properties);
  }
}

export class LaunchTemplateOverrides {
  LaunchTemplateSpecification?: LaunchTemplateSpecification;
  WeightedCapacity?: Value<string>;
  InstanceRequirements?: InstanceRequirements;
  InstanceType?: Value<string>;
  constructor(properties: LaunchTemplateOverrides) {
    Object.assign(this, properties);
  }
}

export class LaunchTemplateSpecification {
  LaunchTemplateName?: Value<string>;
  Version!: Value<string>;
  LaunchTemplateId?: Value<string>;
  constructor(properties: LaunchTemplateSpecification) {
    Object.assign(this, properties);
  }
}

export class LifecycleHookSpecification {
  LifecycleHookName!: Value<string>;
  LifecycleTransition!: Value<string>;
  HeartbeatTimeout?: Value<number>;
  NotificationMetadata?: Value<string>;
  DefaultResult?: Value<string>;
  NotificationTargetARN?: Value<string>;
  RoleARN?: Value<string>;
  constructor(properties: LifecycleHookSpecification) {
    Object.assign(this, properties);
  }
}

export class MemoryGiBPerVCpuRequest {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: MemoryGiBPerVCpuRequest) {
    Object.assign(this, properties);
  }
}

export class MemoryMiBRequest {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: MemoryMiBRequest) {
    Object.assign(this, properties);
  }
}

export class MetricsCollection {
  Metrics?: List<Value<string>>;
  Granularity!: Value<string>;
  constructor(properties: MetricsCollection) {
    Object.assign(this, properties);
  }
}

export class MixedInstancesPolicy {
  InstancesDistribution?: InstancesDistribution;
  LaunchTemplate!: LaunchTemplate;
  constructor(properties: MixedInstancesPolicy) {
    Object.assign(this, properties);
  }
}

export class NetworkBandwidthGbpsRequest {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: NetworkBandwidthGbpsRequest) {
    Object.assign(this, properties);
  }
}

export class NetworkInterfaceCountRequest {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: NetworkInterfaceCountRequest) {
    Object.assign(this, properties);
  }
}

export class NotificationConfiguration {
  TopicARN!: List<Value<string>>;
  NotificationTypes?: List<Value<string>>;
  constructor(properties: NotificationConfiguration) {
    Object.assign(this, properties);
  }
}

export class PerformanceFactorReferenceRequest {
  InstanceFamily?: Value<string>;
  constructor(properties: PerformanceFactorReferenceRequest) {
    Object.assign(this, properties);
  }
}

export class TagProperty {
  Value!: Value<string>;
  Key!: Value<string>;
  PropagateAtLaunch!: Value<boolean>;
  constructor(properties: TagProperty) {
    Object.assign(this, properties);
  }
}

export class TotalLocalStorageGBRequest {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: TotalLocalStorageGBRequest) {
    Object.assign(this, properties);
  }
}

export class TrafficSourceIdentifier {
  Type!: Value<string>;
  Identifier!: Value<string>;
  constructor(properties: TrafficSourceIdentifier) {
    Object.assign(this, properties);
  }
}

export class VCpuCountRequest {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: VCpuCountRequest) {
    Object.assign(this, properties);
  }
}
export interface AutoScalingGroupProperties {
  LifecycleHookSpecificationList?: List<LifecycleHookSpecification>;
  LoadBalancerNames?: List<Value<string>>;
  LaunchConfigurationName?: Value<string>;
  ServiceLinkedRoleARN?: Value<string>;
  AvailabilityZoneImpairmentPolicy?: AvailabilityZoneImpairmentPolicy;
  TargetGroupARNs?: List<Value<string>>;
  Cooldown?: Value<string>;
  NotificationConfigurations?: List<NotificationConfiguration>;
  DesiredCapacity?: Value<string>;
  HealthCheckGracePeriod?: Value<number>;
  DefaultInstanceWarmup?: Value<number>;
  SkipZonalShiftValidation?: Value<boolean>;
  NewInstancesProtectedFromScaleIn?: Value<boolean>;
  LaunchTemplate?: LaunchTemplateSpecification;
  MixedInstancesPolicy?: MixedInstancesPolicy;
  VPCZoneIdentifier?: List<Value<string>>;
  Tags?: List<TagProperty>;
  Context?: Value<string>;
  CapacityRebalance?: Value<boolean>;
  InstanceId?: Value<string>;
  AvailabilityZones?: List<Value<string>>;
  AvailabilityZoneDistribution?: AvailabilityZoneDistribution;
  MetricsCollection?: List<MetricsCollection>;
  InstanceMaintenancePolicy?: InstanceMaintenancePolicy;
  MaxSize: Value<string>;
  MinSize: Value<string>;
  TerminationPolicies?: List<Value<string>>;
  AutoScalingGroupName?: Value<string>;
  TrafficSources?: List<TrafficSourceIdentifier>;
  DesiredCapacityType?: Value<string>;
  PlacementGroup?: Value<string>;
  CapacityReservationSpecification?: CapacityReservationSpecification;
  HealthCheckType?: Value<string>;
  MaxInstanceLifetime?: Value<number>;
}
export default class AutoScalingGroup extends ResourceBase<AutoScalingGroupProperties> {
  static AcceleratorCountRequest = AcceleratorCountRequest;
  static AcceleratorTotalMemoryMiBRequest = AcceleratorTotalMemoryMiBRequest;
  static AvailabilityZoneDistribution = AvailabilityZoneDistribution;
  static AvailabilityZoneImpairmentPolicy = AvailabilityZoneImpairmentPolicy;
  static BaselineEbsBandwidthMbpsRequest = BaselineEbsBandwidthMbpsRequest;
  static BaselinePerformanceFactorsRequest = BaselinePerformanceFactorsRequest;
  static CapacityReservationSpecification = CapacityReservationSpecification;
  static CapacityReservationTarget = CapacityReservationTarget;
  static CpuPerformanceFactorRequest = CpuPerformanceFactorRequest;
  static InstanceMaintenancePolicy = InstanceMaintenancePolicy;
  static InstanceRequirements = InstanceRequirements;
  static InstancesDistribution = InstancesDistribution;
  static LaunchTemplate = LaunchTemplate;
  static LaunchTemplateOverrides = LaunchTemplateOverrides;
  static LaunchTemplateSpecification = LaunchTemplateSpecification;
  static LifecycleHookSpecification = LifecycleHookSpecification;
  static MemoryGiBPerVCpuRequest = MemoryGiBPerVCpuRequest;
  static MemoryMiBRequest = MemoryMiBRequest;
  static MetricsCollection = MetricsCollection;
  static MixedInstancesPolicy = MixedInstancesPolicy;
  static NetworkBandwidthGbpsRequest = NetworkBandwidthGbpsRequest;
  static NetworkInterfaceCountRequest = NetworkInterfaceCountRequest;
  static NotificationConfiguration = NotificationConfiguration;
  static PerformanceFactorReferenceRequest = PerformanceFactorReferenceRequest;
  static TagProperty = TagProperty;
  static TotalLocalStorageGBRequest = TotalLocalStorageGBRequest;
  static TrafficSourceIdentifier = TrafficSourceIdentifier;
  static VCpuCountRequest = VCpuCountRequest;
  constructor(properties: AutoScalingGroupProperties) {
    super('AWS::AutoScaling::AutoScalingGroup', properties);
  }
}
