import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BlockDeviceMapping {
  Ebs?: EbsBlockDevice;
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

export class CpuOptionsRequest {
  ThreadsPerCore?: Value<number>;
  CoreCount?: Value<number>;
  constructor(properties: CpuOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class CreditSpecificationRequest {
  CpuCredits?: Value<string>;
  constructor(properties: CreditSpecificationRequest) {
    Object.assign(this, properties);
  }
}

export class EC2ManagedInstance {
  InstanceId?: Value<string>;
  constructor(properties: EC2ManagedInstance) {
    Object.assign(this, properties);
  }
}

export class EbsBlockDevice {
  VolumeType?: Value<string>;
  KmsKeyId?: Value<string>;
  Encrypted?: Value<boolean>;
  Throughput?: Value<number>;
  Iops?: Value<number>;
  VolumeSize?: Value<number>;
  constructor(properties: EbsBlockDevice) {
    Object.assign(this, properties);
  }
}

export class EnclaveOptionsRequest {
  Enabled?: Value<boolean>;
  constructor(properties: EnclaveOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class HibernationOptionsRequest {
  Configured?: Value<boolean>;
  constructor(properties: HibernationOptionsRequest) {
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

export class InstanceMaintenanceOptionsRequest {
  AutoRecovery?: Value<string>;
  constructor(properties: InstanceMaintenanceOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class InstanceMarketOptionsRequest {
  SpotOptions?: SpotMarketOptions;
  MarketType?: Value<string>;
  constructor(properties: InstanceMarketOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class InstanceMetadataOptionsRequest {
  HttpPutResponseHopLimit?: Value<number>;
  HttpProtocolIpv6?: Value<string>;
  HttpTokens?: Value<string>;
  InstanceMetadataTags?: Value<string>;
  HttpEndpoint?: Value<string>;
  constructor(properties: InstanceMetadataOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class InstanceNetworkInterfaceSpecification {
  Description?: Value<string>;
  DeviceIndex?: Value<number>;
  Groups?: List<Value<string>>;
  SubnetId?: Value<string>;
  constructor(properties: InstanceNetworkInterfaceSpecification) {
    Object.assign(this, properties);
  }
}

export class InstanceNetworkPerformanceOptionsRequest {
  BandwidthWeighting?: Value<string>;
  constructor(properties: InstanceNetworkPerformanceOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class LicenseConfigurationRequest {
  LicenseConfigurationArn?: Value<string>;
  constructor(properties: LicenseConfigurationRequest) {
    Object.assign(this, properties);
  }
}

export class ManagedInstance {
  NetworkPerformanceOptions?: InstanceNetworkPerformanceOptionsRequest;
  TagSpecifications?: List<TagSpecification>;
  UserData?: Value<string>;
  BlockDeviceMappings?: List<BlockDeviceMapping>;
  MaintenanceOptions?: InstanceMaintenanceOptionsRequest;
  IamInstanceProfile?: IamInstanceProfileSpecification;
  SubnetId?: Value<string>;
  EbsOptimized?: Value<boolean>;
  Placement?: Placement;
  Ipv6AddressCount?: Value<number>;
  EnclaveOptions?: EnclaveOptionsRequest;
  NetworkInterfaces?: List<InstanceNetworkInterfaceSpecification>;
  ImageId!: Value<string>;
  InstanceType!: Value<string>;
  Monitoring?: RunInstancesMonitoringEnabled;
  HibernationOptions?: HibernationOptionsRequest;
  LicenseSpecifications?: List<LicenseConfigurationRequest>;
  MetadataOptions?: InstanceMetadataOptionsRequest;
  DisableApiStop?: Value<boolean>;
  CpuOptions?: CpuOptionsRequest;
  PrivateDnsNameOptions?: PrivateDnsNameOptionsRequest;
  EnablePrimaryIpv6?: Value<boolean>;
  KeyName?: Value<string>;
  InstanceMarketOptions?: InstanceMarketOptionsRequest;
  CapacityReservationSpecification?: CapacityReservationSpecification;
  CreditSpecification?: CreditSpecificationRequest;
  constructor(properties: ManagedInstance) {
    Object.assign(this, properties);
  }
}

export class Placement {
  GroupName?: Value<string>;
  Tenancy?: Value<string>;
  PartitionNumber?: Value<number>;
  AvailabilityZone?: Value<string>;
  GroupId?: Value<string>;
  constructor(properties: Placement) {
    Object.assign(this, properties);
  }
}

export class PrivateDnsNameOptionsRequest {
  EnableResourceNameDnsARecord?: Value<boolean>;
  HostnameType?: Value<string>;
  EnableResourceNameDnsAAAARecord?: Value<boolean>;
  constructor(properties: PrivateDnsNameOptionsRequest) {
    Object.assign(this, properties);
  }
}

export class RunInstancesMonitoringEnabled {
  Enabled?: Value<boolean>;
  constructor(properties: RunInstancesMonitoringEnabled) {
    Object.assign(this, properties);
  }
}

export class SpotMarketOptions {
  ValidUntilUtc?: Value<string>;
  SpotInstanceType?: Value<string>;
  InstanceInterruptionBehavior?: Value<string>;
  MaxPrice?: Value<string>;
  constructor(properties: SpotMarketOptions) {
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
export interface WorkspaceInstanceProperties {
  ManagedInstance?: ManagedInstance;
  Tags?: List<ResourceTag>;
}
export default class WorkspaceInstance extends ResourceBase<WorkspaceInstanceProperties> {
  static BlockDeviceMapping = BlockDeviceMapping;
  static CapacityReservationSpecification = CapacityReservationSpecification;
  static CapacityReservationTarget = CapacityReservationTarget;
  static CpuOptionsRequest = CpuOptionsRequest;
  static CreditSpecificationRequest = CreditSpecificationRequest;
  static EC2ManagedInstance = EC2ManagedInstance;
  static EbsBlockDevice = EbsBlockDevice;
  static EnclaveOptionsRequest = EnclaveOptionsRequest;
  static HibernationOptionsRequest = HibernationOptionsRequest;
  static IamInstanceProfileSpecification = IamInstanceProfileSpecification;
  static InstanceMaintenanceOptionsRequest = InstanceMaintenanceOptionsRequest;
  static InstanceMarketOptionsRequest = InstanceMarketOptionsRequest;
  static InstanceMetadataOptionsRequest = InstanceMetadataOptionsRequest;
  static InstanceNetworkInterfaceSpecification = InstanceNetworkInterfaceSpecification;
  static InstanceNetworkPerformanceOptionsRequest = InstanceNetworkPerformanceOptionsRequest;
  static LicenseConfigurationRequest = LicenseConfigurationRequest;
  static ManagedInstance = ManagedInstance;
  static Placement = Placement;
  static PrivateDnsNameOptionsRequest = PrivateDnsNameOptionsRequest;
  static RunInstancesMonitoringEnabled = RunInstancesMonitoringEnabled;
  static SpotMarketOptions = SpotMarketOptions;
  static TagSpecification = TagSpecification;
  constructor(properties?: WorkspaceInstanceProperties) {
    super('AWS::WorkspacesInstances::WorkspaceInstance', properties || {});
  }
}
