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

export class BlockDeviceMapping {
  Ebs?: EbsBlockDevice;
  NoDevice?: Value<string>;
  VirtualName?: Value<string>;
  DeviceName?: Value<string>;
  constructor(properties: BlockDeviceMapping) {
    Object.assign(this, properties);
  }
}

export class CapacityRebalance {
  TerminationDelay?: Value<number>;
  ReplacementStrategy?: Value<string>;
  constructor(properties: CapacityRebalance) {
    Object.assign(this, properties);
  }
}

export class CapacityReservationOptionsRequest {
  UsageStrategy?: Value<string>;
  constructor(properties: CapacityReservationOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class CpuPerformanceFactorRequest {
  References?: List<PerformanceFactorReferenceRequest>;
  constructor(properties: CpuPerformanceFactorRequest) {
    Object.assign(this, properties);
  }
}

export class EbsBlockDevice {
  SnapshotId?: Value<string>;
  VolumeType?: Value<string>;
  KmsKeyId?: Value<string>;
  Encrypted?: Value<boolean>;
  Iops?: Value<number>;
  VolumeSize?: Value<number>;
  DeleteOnTermination?: Value<boolean>;
  constructor(properties: EbsBlockDevice) {
    Object.assign(this, properties);
  }
}

export class FleetLaunchTemplateConfigRequest {
  LaunchTemplateSpecification?: FleetLaunchTemplateSpecificationRequest;
  Overrides?: List<FleetLaunchTemplateOverridesRequest>;
  constructor(properties: FleetLaunchTemplateConfigRequest) {
    Object.assign(this, properties);
  }
}

export class FleetLaunchTemplateOverridesRequest {
  MetadataOptions?: InstanceMetadataOptionsRequest;
  Priority?: Value<number>;
  AvailabilityZoneId?: Value<string>;
  BlockDeviceMappings?: List<BlockDeviceMapping>;
  AvailabilityZone?: Value<string>;
  IamInstanceProfile?: IamInstanceProfileSpecification;
  SubnetId?: Value<string>;
  KeyName?: Value<string>;
  WeightedCapacity?: Value<number>;
  Placement?: Placement;
  NetworkInterfaces?: List<NetworkInterfaceSpecificationRequest>;
  InstanceRequirements?: InstanceRequirementsRequest;
  InstanceType?: Value<string>;
  MaxPrice?: Value<string>;
  constructor(properties: FleetLaunchTemplateOverridesRequest) {
    Object.assign(this, properties);
  }
}

export class FleetLaunchTemplateSpecificationRequest {
  LaunchTemplateName?: Value<string>;
  Version!: Value<string>;
  LaunchTemplateId?: Value<string>;
  LaunchTemplateSpecificationUserData?: Value<string>;
  constructor(properties: FleetLaunchTemplateSpecificationRequest) {
    Object.assign(this, properties);
  }
}

export class IamInstanceProfileSpecification {
  Arn?: Value<string>;
  Name?: Value<string>;
  constructor(properties: IamInstanceProfileSpecification) {
    Object.assign(this, properties);
  }
}

export class InstanceMetadataOptionsRequest {
  HttpPutResponseHopLimit?: Value<number>;
  HttpTokens?: Value<string>;
  HttpEndpoint?: Value<string>;
  constructor(properties: InstanceMetadataOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class InstanceRequirementsRequest {
  InstanceGenerations?: List<Value<string>>;
  RequireEncryptionInTransit?: Value<boolean>;
  MemoryGiBPerVCpu?: MemoryGiBPerVCpuRequest;
  AcceleratorTypes?: List<Value<string>>;
  VCpuCount?: VCpuCountRangeRequest;
  AcceleratorManufacturers?: List<Value<string>>;
  LocalStorage?: Value<string>;
  CpuManufacturers?: List<Value<string>>;
  BareMetal?: Value<string>;
  RequireHibernateSupport?: Value<boolean>;
  MaxSpotPriceAsPercentageOfOptimalOnDemandPrice?: Value<number>;
  OnDemandMaxPricePercentageOverLowestPrice?: Value<number>;
  MemoryMiB?: MemoryMiBRequest;
  LocalStorageTypes?: List<Value<string>>;
  NetworkInterfaceCount?: NetworkInterfaceCountRequest;
  ExcludedInstanceTypes?: List<Value<string>>;
  AllowedInstanceTypes?: List<Value<string>>;
  NetworkBandwidthGbps?: NetworkBandwidthGbpsRequest;
  AcceleratorCount?: AcceleratorCountRequest;
  BaselinePerformanceFactors?: BaselinePerformanceFactorsRequest;
  SpotMaxPricePercentageOverLowestPrice?: Value<number>;
  BaselineEbsBandwidthMbps?: BaselineEbsBandwidthMbpsRequest;
  AcceleratorNames?: List<Value<string>>;
  AcceleratorTotalMemoryMiB?: AcceleratorTotalMemoryMiBRequest;
  BurstablePerformance?: Value<string>;
  TotalLocalStorageGB?: TotalLocalStorageGBRequest;
  constructor(properties: InstanceRequirementsRequest) {
    Object.assign(this, properties);
  }
}

export class Ipv6AddressRequest {
  Ipv6Address?: Value<string>;
  constructor(properties: Ipv6AddressRequest) {
    Object.assign(this, properties);
  }
}

export class MaintenanceStrategies {
  CapacityRebalance?: CapacityRebalance;
  constructor(properties: MaintenanceStrategies) {
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

export class NetworkInterfaceSpecificationRequest {
  Description?: Value<string>;
  PrivateIpAddress?: Value<string>;
  PrivateIpAddresses?: List<PrivateIpAddressSpecificationRequest>;
  SecondaryPrivateIpAddressCount?: Value<number>;
  DeviceIndex?: Value<number>;
  Ipv6Addresses?: List<Ipv6AddressRequest>;
  SubnetId?: Value<string>;
  AssociatePublicIpAddress?: Value<boolean>;
  NetworkCardIndex?: Value<number>;
  NetworkInterfaceId?: Value<string>;
  InterfaceType?: Value<string>;
  Groups?: List<Value<string>>;
  Ipv6AddressCount?: Value<number>;
  DeleteOnTermination?: Value<boolean>;
  constructor(properties: NetworkInterfaceSpecificationRequest) {
    Object.assign(this, properties);
  }
}

export class OnDemandOptionsRequest {
  SingleAvailabilityZone?: Value<boolean>;
  AllocationStrategy?: Value<string>;
  SingleInstanceType?: Value<boolean>;
  MinTargetCapacity?: Value<number>;
  MaxTotalPrice?: Value<string>;
  CapacityReservationOptions?: CapacityReservationOptionsRequest;
  constructor(properties: OnDemandOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class PerformanceFactorReferenceRequest {
  InstanceFamily?: Value<string>;
  constructor(properties: PerformanceFactorReferenceRequest) {
    Object.assign(this, properties);
  }
}

export class Placement {
  GroupName?: Value<string>;
  Tenancy?: Value<string>;
  SpreadDomain?: Value<string>;
  PartitionNumber?: Value<number>;
  AvailabilityZone?: Value<string>;
  Affinity?: Value<string>;
  HostId?: Value<string>;
  HostResourceGroupArn?: Value<string>;
  constructor(properties: Placement) {
    Object.assign(this, properties);
  }
}

export class PrivateIpAddressSpecificationRequest {
  PrivateIpAddress?: Value<string>;
  Primary?: Value<boolean>;
  constructor(properties: PrivateIpAddressSpecificationRequest) {
    Object.assign(this, properties);
  }
}

export class ReservedCapacityOptionsRequest {
  ReservationTypes?: List<Value<string>>;
  constructor(properties: ReservedCapacityOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class SpotOptionsRequest {
  SingleAvailabilityZone?: Value<boolean>;
  AllocationStrategy?: Value<string>;
  SingleInstanceType?: Value<boolean>;
  MinTargetCapacity?: Value<number>;
  MaxTotalPrice?: Value<string>;
  MaintenanceStrategies?: MaintenanceStrategies;
  InstanceInterruptionBehavior?: Value<string>;
  InstancePoolsToUseCount?: Value<number>;
  constructor(properties: SpotOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class TagSpecification {
  ResourceType?: Value<string>;
  Tags?: List<ResourceTag>;
  constructor(properties: TagSpecification) {
    Object.assign(this, properties);
  }
}

export class TargetCapacitySpecificationRequest {
  DefaultTargetCapacityType?: Value<string>;
  TotalTargetCapacity!: Value<number>;
  OnDemandTargetCapacity?: Value<number>;
  SpotTargetCapacity?: Value<number>;
  TargetCapacityUnitType?: Value<string>;
  constructor(properties: TargetCapacitySpecificationRequest) {
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
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: VCpuCountRangeRequest) {
    Object.assign(this, properties);
  }
}
export interface EC2FleetProperties {
  Context?: Value<string>;
  TargetCapacitySpecification: TargetCapacitySpecificationRequest;
  OnDemandOptions?: OnDemandOptionsRequest;
  ExcessCapacityTerminationPolicy?: Value<string>;
  TagSpecifications?: List<TagSpecification>;
  SpotOptions?: SpotOptionsRequest;
  LaunchTemplateConfigs: List<FleetLaunchTemplateConfigRequest>;
  TerminateInstancesWithExpiration?: Value<boolean>;
  ValidUntil?: Value<string>;
  Type?: Value<string>;
  ReservedCapacityOptions?: ReservedCapacityOptionsRequest;
  ValidFrom?: Value<string>;
  ReplaceUnhealthyInstances?: Value<boolean>;
}
export default class EC2Fleet extends ResourceBase<EC2FleetProperties> {
  static AcceleratorCountRequest = AcceleratorCountRequest;
  static AcceleratorTotalMemoryMiBRequest = AcceleratorTotalMemoryMiBRequest;
  static BaselineEbsBandwidthMbpsRequest = BaselineEbsBandwidthMbpsRequest;
  static BaselinePerformanceFactorsRequest = BaselinePerformanceFactorsRequest;
  static BlockDeviceMapping = BlockDeviceMapping;
  static CapacityRebalance = CapacityRebalance;
  static CapacityReservationOptionsRequest = CapacityReservationOptionsRequest;
  static CpuPerformanceFactorRequest = CpuPerformanceFactorRequest;
  static EbsBlockDevice = EbsBlockDevice;
  static FleetLaunchTemplateConfigRequest = FleetLaunchTemplateConfigRequest;
  static FleetLaunchTemplateOverridesRequest = FleetLaunchTemplateOverridesRequest;
  static FleetLaunchTemplateSpecificationRequest = FleetLaunchTemplateSpecificationRequest;
  static IamInstanceProfileSpecification = IamInstanceProfileSpecification;
  static InstanceMetadataOptionsRequest = InstanceMetadataOptionsRequest;
  static InstanceRequirementsRequest = InstanceRequirementsRequest;
  static Ipv6AddressRequest = Ipv6AddressRequest;
  static MaintenanceStrategies = MaintenanceStrategies;
  static MemoryGiBPerVCpuRequest = MemoryGiBPerVCpuRequest;
  static MemoryMiBRequest = MemoryMiBRequest;
  static NetworkBandwidthGbpsRequest = NetworkBandwidthGbpsRequest;
  static NetworkInterfaceCountRequest = NetworkInterfaceCountRequest;
  static NetworkInterfaceSpecificationRequest = NetworkInterfaceSpecificationRequest;
  static OnDemandOptionsRequest = OnDemandOptionsRequest;
  static PerformanceFactorReferenceRequest = PerformanceFactorReferenceRequest;
  static Placement = Placement;
  static PrivateIpAddressSpecificationRequest = PrivateIpAddressSpecificationRequest;
  static ReservedCapacityOptionsRequest = ReservedCapacityOptionsRequest;
  static SpotOptionsRequest = SpotOptionsRequest;
  static TagSpecification = TagSpecification;
  static TargetCapacitySpecificationRequest = TargetCapacitySpecificationRequest;
  static TotalLocalStorageGBRequest = TotalLocalStorageGBRequest;
  static VCpuCountRangeRequest = VCpuCountRangeRequest;
  constructor(properties: EC2FleetProperties) {
    super('AWS::EC2::EC2Fleet', properties);
  }
}
