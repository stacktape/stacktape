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

export class AutoScalingGroupProvider {
  ManagedScaling?: ManagedScaling;
  AutoScalingGroupArn!: Value<string>;
  ManagedTerminationProtection?: Value<string>;
  ManagedDraining?: Value<string>;
  constructor(properties: AutoScalingGroupProvider) {
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

export class InstanceLaunchTemplate {
  Ec2InstanceProfileArn!: Value<string>;
  StorageConfiguration?: ManagedInstancesStorageConfiguration;
  NetworkConfiguration!: ManagedInstancesNetworkConfiguration;
  InstanceRequirements?: InstanceRequirementsRequest;
  Monitoring?: Value<string>;
  constructor(properties: InstanceLaunchTemplate) {
    Object.assign(this, properties);
  }
}

export class InstanceRequirementsRequest {
  LocalStorageTypes?: List<Value<string>>;
  InstanceGenerations?: List<Value<string>>;
  NetworkInterfaceCount?: NetworkInterfaceCountRequest;
  MemoryGiBPerVCpu?: MemoryGiBPerVCpuRequest;
  AcceleratorTypes?: List<Value<string>>;
  VCpuCount!: VCpuCountRangeRequest;
  ExcludedInstanceTypes?: List<Value<string>>;
  AcceleratorManufacturers?: List<Value<string>>;
  AllowedInstanceTypes?: List<Value<string>>;
  LocalStorage?: Value<string>;
  CpuManufacturers?: List<Value<string>>;
  NetworkBandwidthGbps?: NetworkBandwidthGbpsRequest;
  AcceleratorCount?: AcceleratorCountRequest;
  BareMetal?: Value<string>;
  RequireHibernateSupport?: Value<boolean>;
  MaxSpotPriceAsPercentageOfOptimalOnDemandPrice?: Value<number>;
  SpotMaxPricePercentageOverLowestPrice?: Value<number>;
  BaselineEbsBandwidthMbps?: BaselineEbsBandwidthMbpsRequest;
  OnDemandMaxPricePercentageOverLowestPrice?: Value<number>;
  AcceleratorNames?: List<Value<string>>;
  AcceleratorTotalMemoryMiB?: AcceleratorTotalMemoryMiBRequest;
  BurstablePerformance?: Value<string>;
  MemoryMiB!: MemoryMiBRequest;
  TotalLocalStorageGB?: TotalLocalStorageGBRequest;
  constructor(properties: InstanceRequirementsRequest) {
    Object.assign(this, properties);
  }
}

export class ManagedInstancesNetworkConfiguration {
  SecurityGroups?: List<Value<string>>;
  Subnets!: List<Value<string>>;
  constructor(properties: ManagedInstancesNetworkConfiguration) {
    Object.assign(this, properties);
  }
}

export class ManagedInstancesProvider {
  InfrastructureRoleArn!: Value<string>;
  PropagateTags?: Value<string>;
  InstanceLaunchTemplate!: InstanceLaunchTemplate;
  constructor(properties: ManagedInstancesProvider) {
    Object.assign(this, properties);
  }
}

export class ManagedInstancesStorageConfiguration {
  StorageSizeGiB!: Value<number>;
  constructor(properties: ManagedInstancesStorageConfiguration) {
    Object.assign(this, properties);
  }
}

export class ManagedScaling {
  Status?: Value<string>;
  MinimumScalingStepSize?: Value<number>;
  InstanceWarmupPeriod?: Value<number>;
  TargetCapacity?: Value<number>;
  MaximumScalingStepSize?: Value<number>;
  constructor(properties: ManagedScaling) {
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
  Min!: Value<number>;
  Max?: Value<number>;
  constructor(properties: MemoryMiBRequest) {
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

export class TotalLocalStorageGBRequest {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: TotalLocalStorageGBRequest) {
    Object.assign(this, properties);
  }
}

export class VCpuCountRangeRequest {
  Min!: Value<number>;
  Max?: Value<number>;
  constructor(properties: VCpuCountRangeRequest) {
    Object.assign(this, properties);
  }
}
export interface CapacityProviderProperties {
  AutoScalingGroupProvider?: AutoScalingGroupProvider;
  ClusterName?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
  ManagedInstancesProvider?: ManagedInstancesProvider;
}
export default class CapacityProvider extends ResourceBase<CapacityProviderProperties> {
  static AcceleratorCountRequest = AcceleratorCountRequest;
  static AcceleratorTotalMemoryMiBRequest = AcceleratorTotalMemoryMiBRequest;
  static AutoScalingGroupProvider = AutoScalingGroupProvider;
  static BaselineEbsBandwidthMbpsRequest = BaselineEbsBandwidthMbpsRequest;
  static InstanceLaunchTemplate = InstanceLaunchTemplate;
  static InstanceRequirementsRequest = InstanceRequirementsRequest;
  static ManagedInstancesNetworkConfiguration = ManagedInstancesNetworkConfiguration;
  static ManagedInstancesProvider = ManagedInstancesProvider;
  static ManagedInstancesStorageConfiguration = ManagedInstancesStorageConfiguration;
  static ManagedScaling = ManagedScaling;
  static MemoryGiBPerVCpuRequest = MemoryGiBPerVCpuRequest;
  static MemoryMiBRequest = MemoryMiBRequest;
  static NetworkBandwidthGbpsRequest = NetworkBandwidthGbpsRequest;
  static NetworkInterfaceCountRequest = NetworkInterfaceCountRequest;
  static TotalLocalStorageGBRequest = TotalLocalStorageGBRequest;
  static VCpuCountRangeRequest = VCpuCountRangeRequest;
  constructor(properties?: CapacityProviderProperties) {
    super('AWS::ECS::CapacityProvider', properties || {});
  }
}
