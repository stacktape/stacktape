import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AssociationParameter {
  Value!: List<Value<string>>;
  Key!: Value<string>;
  constructor(properties: AssociationParameter) {
    Object.assign(this, properties);
  }
}

export class BlockDeviceMapping {
  Ebs?: Ebs;
  NoDevice?: { [key: string]: any };
  VirtualName?: Value<string>;
  DeviceName!: Value<string>;
  constructor(properties: BlockDeviceMapping) {
    Object.assign(this, properties);
  }
}

export class CpuOptions {
  ThreadsPerCore?: Value<number>;
  CoreCount?: Value<number>;
  constructor(properties: CpuOptions) {
    Object.assign(this, properties);
  }
}

export class CreditSpecification {
  CPUCredits?: Value<string>;
  constructor(properties: CreditSpecification) {
    Object.assign(this, properties);
  }
}

export class Ebs {
  SnapshotId?: Value<string>;
  VolumeType?: Value<string>;
  KmsKeyId?: Value<string>;
  Encrypted?: Value<boolean>;
  Iops?: Value<number>;
  VolumeSize?: Value<number>;
  DeleteOnTermination?: Value<boolean>;
  constructor(properties: Ebs) {
    Object.assign(this, properties);
  }
}

export class ElasticGpuSpecification {
  Type!: Value<string>;
  constructor(properties: ElasticGpuSpecification) {
    Object.assign(this, properties);
  }
}

export class ElasticInferenceAccelerator {
  Type!: Value<string>;
  Count?: Value<number>;
  constructor(properties: ElasticInferenceAccelerator) {
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

export class InstanceIpv6Address {
  Ipv6Address!: Value<string>;
  constructor(properties: InstanceIpv6Address) {
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

export class LicenseSpecification {
  LicenseConfigurationArn!: Value<string>;
  constructor(properties: LicenseSpecification) {
    Object.assign(this, properties);
  }
}

export class MetadataOptions {
  HttpPutResponseHopLimit?: Value<number>;
  HttpProtocolIpv6?: Value<string>;
  HttpTokens?: Value<string>;
  InstanceMetadataTags?: Value<string>;
  HttpEndpoint?: Value<string>;
  constructor(properties: MetadataOptions) {
    Object.assign(this, properties);
  }
}

export class NetworkInterface {
  Description?: Value<string>;
  PrivateIpAddress?: Value<string>;
  PrivateIpAddresses?: List<PrivateIpAddressSpecification>;
  SecondaryPrivateIpAddressCount?: Value<number>;
  DeviceIndex!: Value<string>;
  GroupSet?: List<Value<string>>;
  Ipv6Addresses?: List<InstanceIpv6Address>;
  SubnetId?: Value<string>;
  AssociatePublicIpAddress?: Value<boolean>;
  NetworkInterfaceId?: Value<string>;
  AssociateCarrierIpAddress?: Value<boolean>;
  EnaSrdSpecification?: EnaSrdSpecification;
  Ipv6AddressCount?: Value<number>;
  DeleteOnTermination?: Value<boolean>;
  constructor(properties: NetworkInterface) {
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

export class PrivateIpAddressSpecification {
  PrivateIpAddress!: Value<string>;
  Primary!: Value<boolean>;
  constructor(properties: PrivateIpAddressSpecification) {
    Object.assign(this, properties);
  }
}

export class SsmAssociation {
  AssociationParameters?: List<AssociationParameter>;
  DocumentName!: Value<string>;
  constructor(properties: SsmAssociation) {
    Object.assign(this, properties);
  }
}

export class State {
  Code?: Value<string>;
  Name?: Value<string>;
  constructor(properties: State) {
    Object.assign(this, properties);
  }
}

export class Volume {
  VolumeId!: Value<string>;
  Device!: Value<string>;
  constructor(properties: Volume) {
    Object.assign(this, properties);
  }
}
export interface InstanceProperties {
  Tenancy?: Value<string>;
  SecurityGroups?: List<Value<string>>;
  PrivateIpAddress?: Value<string>;
  UserData?: Value<string>;
  BlockDeviceMappings?: List<BlockDeviceMapping>;
  IamInstanceProfile?: Value<string>;
  Ipv6Addresses?: List<InstanceIpv6Address>;
  KernelId?: Value<string>;
  SubnetId?: Value<string>;
  EbsOptimized?: Value<boolean>;
  PropagateTagsToVolumeOnCreation?: Value<boolean>;
  ElasticGpuSpecifications?: List<ElasticGpuSpecification>;
  ElasticInferenceAccelerators?: List<ElasticInferenceAccelerator>;
  Volumes?: List<Volume>;
  Ipv6AddressCount?: Value<number>;
  LaunchTemplate?: LaunchTemplateSpecification;
  EnclaveOptions?: EnclaveOptions;
  NetworkInterfaces?: List<NetworkInterface>;
  ImageId?: Value<string>;
  InstanceType?: Value<string>;
  Tags?: List<ResourceTag>;
  Monitoring?: Value<boolean>;
  AdditionalInfo?: Value<string>;
  HibernationOptions?: HibernationOptions;
  LicenseSpecifications?: List<LicenseSpecification>;
  MetadataOptions?: MetadataOptions;
  InstanceInitiatedShutdownBehavior?: Value<string>;
  CpuOptions?: CpuOptions;
  AvailabilityZone?: Value<string>;
  PrivateDnsNameOptions?: PrivateDnsNameOptions;
  HostId?: Value<string>;
  HostResourceGroupArn?: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  DisableApiTermination?: Value<boolean>;
  KeyName?: Value<string>;
  RamdiskId?: Value<string>;
  SourceDestCheck?: Value<boolean>;
  PlacementGroupName?: Value<string>;
  SsmAssociations?: List<SsmAssociation>;
  Affinity?: Value<string>;
  CreditSpecification?: CreditSpecification;
}
export default class Instance extends ResourceBase<InstanceProperties> {
  static AssociationParameter = AssociationParameter;
  static BlockDeviceMapping = BlockDeviceMapping;
  static CpuOptions = CpuOptions;
  static CreditSpecification = CreditSpecification;
  static Ebs = Ebs;
  static ElasticGpuSpecification = ElasticGpuSpecification;
  static ElasticInferenceAccelerator = ElasticInferenceAccelerator;
  static EnaSrdSpecification = EnaSrdSpecification;
  static EnaSrdUdpSpecification = EnaSrdUdpSpecification;
  static EnclaveOptions = EnclaveOptions;
  static HibernationOptions = HibernationOptions;
  static InstanceIpv6Address = InstanceIpv6Address;
  static LaunchTemplateSpecification = LaunchTemplateSpecification;
  static LicenseSpecification = LicenseSpecification;
  static MetadataOptions = MetadataOptions;
  static NetworkInterface = NetworkInterface;
  static PrivateDnsNameOptions = PrivateDnsNameOptions;
  static PrivateIpAddressSpecification = PrivateIpAddressSpecification;
  static SsmAssociation = SsmAssociation;
  static State = State;
  static Volume = Volume;
  constructor(properties?: InstanceProperties) {
    super('AWS::EC2::Instance', properties || {});
  }
}
