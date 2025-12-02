import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AcceleratorCount {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: AcceleratorCount) {
    Object.assign(this, properties);
  }
}

export class AcceleratorTotalMemoryMiB {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: AcceleratorTotalMemoryMiB) {
    Object.assign(this, properties);
  }
}

export class BaselineEbsBandwidthMbps {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: BaselineEbsBandwidthMbps) {
    Object.assign(this, properties);
  }
}

export class BaselinePerformanceFactors {
  Cpu?: Cpu;
  constructor(properties: BaselinePerformanceFactors) {
    Object.assign(this, properties);
  }
}

export class BlockDeviceMapping {
  Ebs?: Ebs;
  NoDevice?: Value<string>;
  VirtualName?: Value<string>;
  DeviceName?: Value<string>;
  constructor(properties: BlockDeviceMapping) {
    Object.assign(this, properties);
  }
}

export class CapacityReservationSpecification {
  CapacityReservationPreference?: Value<string>;
  CapacityReservationTarget?: CapacityReservationTarget;
  constructor(properties: CapacityReservationSpecification) {
    Object.assign(this, properties);
  }
}

export class CapacityReservationTarget {
  CapacityReservationResourceGroupArn?: Value<string>;
  CapacityReservationId?: Value<string>;
  constructor(properties: CapacityReservationTarget) {
    Object.assign(this, properties);
  }
}

export class ConnectionTrackingSpecification {
  UdpTimeout?: Value<number>;
  TcpEstablishedTimeout?: Value<number>;
  UdpStreamTimeout?: Value<number>;
  constructor(properties: ConnectionTrackingSpecification) {
    Object.assign(this, properties);
  }
}

export class Cpu {
  References?: List<Reference>;
  constructor(properties: Cpu) {
    Object.assign(this, properties);
  }
}

export class CpuOptions {
  ThreadsPerCore?: Value<number>;
  AmdSevSnp?: Value<string>;
  CoreCount?: Value<number>;
  constructor(properties: CpuOptions) {
    Object.assign(this, properties);
  }
}

export class CreditSpecification {
  CpuCredits?: Value<string>;
  constructor(properties: CreditSpecification) {
    Object.assign(this, properties);
  }
}

export class Ebs {
  SnapshotId?: Value<string>;
  VolumeType?: Value<string>;
  KmsKeyId?: Value<string>;
  Encrypted?: Value<boolean>;
  Throughput?: Value<number>;
  Iops?: Value<number>;
  VolumeInitializationRate?: Value<number>;
  VolumeSize?: Value<number>;
  DeleteOnTermination?: Value<boolean>;
  constructor(properties: Ebs) {
    Object.assign(this, properties);
  }
}

export class EnaSrdSpecification {
  EnaSrdEnabled?: Value<boolean>;
  EnaSrdUdpSpecification?: EnaSrdUdpSpecification;
  constructor(properties: EnaSrdSpecification) {
    Object.assign(this, properties);
  }
}

export class EnaSrdUdpSpecification {
  EnaSrdUdpEnabled?: Value<boolean>;
  constructor(properties: EnaSrdUdpSpecification) {
    Object.assign(this, properties);
  }
}

export class EnclaveOptions {
  Enabled?: Value<boolean>;
  constructor(properties: EnclaveOptions) {
    Object.assign(this, properties);
  }
}

export class HibernationOptions {
  Configured?: Value<boolean>;
  constructor(properties: HibernationOptions) {
    Object.assign(this, properties);
  }
}

export class IamInstanceProfile {
  Arn?: Value<string>;
  Name?: Value<string>;
  constructor(properties: IamInstanceProfile) {
    Object.assign(this, properties);
  }
}

export class InstanceMarketOptions {
  SpotOptions?: SpotOptions;
  MarketType?: Value<string>;
  constructor(properties: InstanceMarketOptions) {
    Object.assign(this, properties);
  }
}

export class InstanceRequirements {
  InstanceGenerations?: List<Value<string>>;
  MemoryGiBPerVCpu?: MemoryGiBPerVCpu;
  AcceleratorTypes?: List<Value<string>>;
  VCpuCount?: VCpuCount;
  AcceleratorManufacturers?: List<Value<string>>;
  LocalStorage?: Value<string>;
  CpuManufacturers?: List<Value<string>>;
  BareMetal?: Value<string>;
  RequireHibernateSupport?: Value<boolean>;
  MaxSpotPriceAsPercentageOfOptimalOnDemandPrice?: Value<number>;
  OnDemandMaxPricePercentageOverLowestPrice?: Value<number>;
  MemoryMiB?: MemoryMiB;
  LocalStorageTypes?: List<Value<string>>;
  NetworkInterfaceCount?: NetworkInterfaceCount;
  ExcludedInstanceTypes?: List<Value<string>>;
  AllowedInstanceTypes?: List<Value<string>>;
  AcceleratorCount?: AcceleratorCount;
  NetworkBandwidthGbps?: NetworkBandwidthGbps;
  BaselinePerformanceFactors?: BaselinePerformanceFactors;
  SpotMaxPricePercentageOverLowestPrice?: Value<number>;
  BaselineEbsBandwidthMbps?: BaselineEbsBandwidthMbps;
  AcceleratorNames?: List<Value<string>>;
  AcceleratorTotalMemoryMiB?: AcceleratorTotalMemoryMiB;
  BurstablePerformance?: Value<string>;
  TotalLocalStorageGB?: TotalLocalStorageGB;
  constructor(properties: InstanceRequirements) {
    Object.assign(this, properties);
  }
}

export class Ipv4PrefixSpecification {
  Ipv4Prefix?: Value<string>;
  constructor(properties: Ipv4PrefixSpecification) {
    Object.assign(this, properties);
  }
}

export class Ipv6Add {
  Ipv6Address?: Value<string>;
  constructor(properties: Ipv6Add) {
    Object.assign(this, properties);
  }
}

export class Ipv6PrefixSpecification {
  Ipv6Prefix?: Value<string>;
  constructor(properties: Ipv6PrefixSpecification) {
    Object.assign(this, properties);
  }
}

export class LaunchTemplateData {
  SecurityGroups?: List<Value<string>>;
  TagSpecifications?: List<TagSpecification>;
  NetworkPerformanceOptions?: NetworkPerformanceOptions;
  UserData?: Value<string>;
  BlockDeviceMappings?: List<BlockDeviceMapping>;
  MaintenanceOptions?: MaintenanceOptions;
  IamInstanceProfile?: IamInstanceProfile;
  KernelId?: Value<string>;
  EbsOptimized?: Value<boolean>;
  Placement?: Placement;
  NetworkInterfaces?: List<NetworkInterface>;
  EnclaveOptions?: EnclaveOptions;
  ImageId?: Value<string>;
  InstanceType?: Value<string>;
  Monitoring?: Monitoring;
  HibernationOptions?: HibernationOptions;
  MetadataOptions?: MetadataOptions;
  LicenseSpecifications?: List<LicenseSpecification>;
  InstanceInitiatedShutdownBehavior?: Value<string>;
  DisableApiStop?: Value<boolean>;
  CpuOptions?: CpuOptions;
  PrivateDnsNameOptions?: PrivateDnsNameOptions;
  SecurityGroupIds?: List<Value<string>>;
  KeyName?: Value<string>;
  DisableApiTermination?: Value<boolean>;
  InstanceMarketOptions?: InstanceMarketOptions;
  InstanceRequirements?: InstanceRequirements;
  RamDiskId?: Value<string>;
  CapacityReservationSpecification?: CapacityReservationSpecification;
  CreditSpecification?: CreditSpecification;
  constructor(properties: LaunchTemplateData) {
    Object.assign(this, properties);
  }
}

export class LaunchTemplateTagSpecification {
  ResourceType?: Value<string>;
  Tags?: List<ResourceTag>;
  constructor(properties: LaunchTemplateTagSpecification) {
    Object.assign(this, properties);
  }
}

export class LicenseSpecification {
  LicenseConfigurationArn?: Value<string>;
  constructor(properties: LicenseSpecification) {
    Object.assign(this, properties);
  }
}

export class MaintenanceOptions {
  AutoRecovery?: Value<string>;
  constructor(properties: MaintenanceOptions) {
    Object.assign(this, properties);
  }
}

export class MemoryGiBPerVCpu {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: MemoryGiBPerVCpu) {
    Object.assign(this, properties);
  }
}

export class MemoryMiB {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: MemoryMiB) {
    Object.assign(this, properties);
  }
}

export class MetadataOptions {
  HttpPutResponseHopLimit?: Value<number>;
  HttpTokens?: Value<string>;
  HttpProtocolIpv6?: Value<string>;
  InstanceMetadataTags?: Value<string>;
  HttpEndpoint?: Value<string>;
  constructor(properties: MetadataOptions) {
    Object.assign(this, properties);
  }
}

export class Monitoring {
  Enabled?: Value<boolean>;
  constructor(properties: Monitoring) {
    Object.assign(this, properties);
  }
}

export class NetworkBandwidthGbps {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: NetworkBandwidthGbps) {
    Object.assign(this, properties);
  }
}

export class NetworkInterface {
  Description?: Value<string>;
  PrivateIpAddress?: Value<string>;
  PrivateIpAddresses?: List<PrivateIpAdd>;
  SecondaryPrivateIpAddressCount?: Value<number>;
  Ipv6PrefixCount?: Value<number>;
  Ipv4Prefixes?: List<Ipv4PrefixSpecification>;
  DeviceIndex?: Value<number>;
  PrimaryIpv6?: Value<boolean>;
  Ipv4PrefixCount?: Value<number>;
  EnaQueueCount?: Value<number>;
  Ipv6Prefixes?: List<Ipv6PrefixSpecification>;
  SubnetId?: Value<string>;
  Ipv6Addresses?: List<Ipv6Add>;
  AssociatePublicIpAddress?: Value<boolean>;
  NetworkInterfaceId?: Value<string>;
  NetworkCardIndex?: Value<number>;
  InterfaceType?: Value<string>;
  AssociateCarrierIpAddress?: Value<boolean>;
  EnaSrdSpecification?: EnaSrdSpecification;
  Ipv6AddressCount?: Value<number>;
  Groups?: List<Value<string>>;
  DeleteOnTermination?: Value<boolean>;
  ConnectionTrackingSpecification?: ConnectionTrackingSpecification;
  constructor(properties: NetworkInterface) {
    Object.assign(this, properties);
  }
}

export class NetworkInterfaceCount {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: NetworkInterfaceCount) {
    Object.assign(this, properties);
  }
}

export class NetworkPerformanceOptions {
  BandwidthWeighting?: Value<string>;
  constructor(properties: NetworkPerformanceOptions) {
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
  GroupId?: Value<string>;
  constructor(properties: Placement) {
    Object.assign(this, properties);
  }
}

export class PrivateDnsNameOptions {
  EnableResourceNameDnsARecord?: Value<boolean>;
  HostnameType?: Value<string>;
  EnableResourceNameDnsAAAARecord?: Value<boolean>;
  constructor(properties: PrivateDnsNameOptions) {
    Object.assign(this, properties);
  }
}

export class PrivateIpAdd {
  PrivateIpAddress?: Value<string>;
  Primary?: Value<boolean>;
  constructor(properties: PrivateIpAdd) {
    Object.assign(this, properties);
  }
}

export class Reference {
  InstanceFamily?: Value<string>;
  constructor(properties: Reference) {
    Object.assign(this, properties);
  }
}

export class SpotOptions {
  SpotInstanceType?: Value<string>;
  InstanceInterruptionBehavior?: Value<string>;
  MaxPrice?: Value<string>;
  BlockDurationMinutes?: Value<number>;
  ValidUntil?: Value<string>;
  constructor(properties: SpotOptions) {
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

export class TotalLocalStorageGB {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: TotalLocalStorageGB) {
    Object.assign(this, properties);
  }
}

export class VCpuCount {
  Min?: Value<number>;
  Max?: Value<number>;
  constructor(properties: VCpuCount) {
    Object.assign(this, properties);
  }
}
export interface LaunchTemplateProperties {
  LaunchTemplateName?: Value<string>;
  LaunchTemplateData: LaunchTemplateData;
  VersionDescription?: Value<string>;
  TagSpecifications?: List<LaunchTemplateTagSpecification>;
}
export default class LaunchTemplate extends ResourceBase<LaunchTemplateProperties> {
  static AcceleratorCount = AcceleratorCount;
  static AcceleratorTotalMemoryMiB = AcceleratorTotalMemoryMiB;
  static BaselineEbsBandwidthMbps = BaselineEbsBandwidthMbps;
  static BaselinePerformanceFactors = BaselinePerformanceFactors;
  static BlockDeviceMapping = BlockDeviceMapping;
  static CapacityReservationSpecification = CapacityReservationSpecification;
  static CapacityReservationTarget = CapacityReservationTarget;
  static ConnectionTrackingSpecification = ConnectionTrackingSpecification;
  static Cpu = Cpu;
  static CpuOptions = CpuOptions;
  static CreditSpecification = CreditSpecification;
  static Ebs = Ebs;
  static EnaSrdSpecification = EnaSrdSpecification;
  static EnaSrdUdpSpecification = EnaSrdUdpSpecification;
  static EnclaveOptions = EnclaveOptions;
  static HibernationOptions = HibernationOptions;
  static IamInstanceProfile = IamInstanceProfile;
  static InstanceMarketOptions = InstanceMarketOptions;
  static InstanceRequirements = InstanceRequirements;
  static Ipv4PrefixSpecification = Ipv4PrefixSpecification;
  static Ipv6Add = Ipv6Add;
  static Ipv6PrefixSpecification = Ipv6PrefixSpecification;
  static LaunchTemplateData = LaunchTemplateData;
  static LaunchTemplateTagSpecification = LaunchTemplateTagSpecification;
  static LicenseSpecification = LicenseSpecification;
  static MaintenanceOptions = MaintenanceOptions;
  static MemoryGiBPerVCpu = MemoryGiBPerVCpu;
  static MemoryMiB = MemoryMiB;
  static MetadataOptions = MetadataOptions;
  static Monitoring = Monitoring;
  static NetworkBandwidthGbps = NetworkBandwidthGbps;
  static NetworkInterface = NetworkInterface;
  static NetworkInterfaceCount = NetworkInterfaceCount;
  static NetworkPerformanceOptions = NetworkPerformanceOptions;
  static Placement = Placement;
  static PrivateDnsNameOptions = PrivateDnsNameOptions;
  static PrivateIpAdd = PrivateIpAdd;
  static Reference = Reference;
  static SpotOptions = SpotOptions;
  static TagSpecification = TagSpecification;
  static TotalLocalStorageGB = TotalLocalStorageGB;
  static VCpuCount = VCpuCount;
  constructor(properties: LaunchTemplateProperties) {
    super('AWS::EC2::LaunchTemplate', properties);
  }
}
