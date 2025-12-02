import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AcceleratorCapabilities {
  Selections!: List<AcceleratorSelection>;
  Count?: AcceleratorCountRange;
  constructor(properties: AcceleratorCapabilities) {
    Object.assign(this, properties);
  }
}

export class AcceleratorCountRange {
  Min!: Value<number>;
  Max?: Value<number>;
  constructor(properties: AcceleratorCountRange) {
    Object.assign(this, properties);
  }
}

export class AcceleratorSelection {
  Runtime?: Value<string>;
  Name!: Value<string>;
  constructor(properties: AcceleratorSelection) {
    Object.assign(this, properties);
  }
}

export class AcceleratorTotalMemoryMiBRange {
  Min!: Value<number>;
  Max?: Value<number>;
  constructor(properties: AcceleratorTotalMemoryMiBRange) {
    Object.assign(this, properties);
  }
}

export class CustomerManagedFleetConfiguration {
  StorageProfileId?: Value<string>;
  Mode!: Value<string>;
  WorkerCapabilities!: CustomerManagedWorkerCapabilities;
  TagPropagationMode?: Value<string>;
  constructor(properties: CustomerManagedFleetConfiguration) {
    Object.assign(this, properties);
  }
}

export class CustomerManagedWorkerCapabilities {
  CustomAttributes?: List<FleetAttributeCapability>;
  AcceleratorCount?: AcceleratorCountRange;
  CustomAmounts?: List<FleetAmountCapability>;
  AcceleratorTypes?: List<Value<string>>;
  AcceleratorTotalMemoryMiB?: AcceleratorTotalMemoryMiBRange;
  VCpuCount!: VCpuCountRange;
  MemoryMiB!: MemoryMiBRange;
  OsFamily!: Value<string>;
  CpuArchitectureType!: Value<string>;
  constructor(properties: CustomerManagedWorkerCapabilities) {
    Object.assign(this, properties);
  }
}

export class Ec2EbsVolume {
  SizeGiB?: Value<number>;
  ThroughputMiB?: Value<number>;
  Iops?: Value<number>;
  constructor(properties: Ec2EbsVolume) {
    Object.assign(this, properties);
  }
}

export class FleetAmountCapability {
  Min!: Value<number>;
  Max?: Value<number>;
  Name!: Value<string>;
  constructor(properties: FleetAmountCapability) {
    Object.assign(this, properties);
  }
}

export class FleetAttributeCapability {
  Values!: List<Value<string>>;
  Name!: Value<string>;
  constructor(properties: FleetAttributeCapability) {
    Object.assign(this, properties);
  }
}

export class FleetCapabilities {
  Amounts?: List<FleetAmountCapability>;
  Attributes?: List<FleetAttributeCapability>;
  constructor(properties: FleetCapabilities) {
    Object.assign(this, properties);
  }
}

export class FleetConfiguration {
  ServiceManagedEc2?: ServiceManagedEc2FleetConfiguration;
  CustomerManaged?: CustomerManagedFleetConfiguration;
  constructor(properties: FleetConfiguration) {
    Object.assign(this, properties);
  }
}

export class HostConfiguration {
  ScriptTimeoutSeconds?: Value<number>;
  ScriptBody!: Value<string>;
  constructor(properties: HostConfiguration) {
    Object.assign(this, properties);
  }
}

export class MemoryMiBRange {
  Min!: Value<number>;
  Max?: Value<number>;
  constructor(properties: MemoryMiBRange) {
    Object.assign(this, properties);
  }
}

export class ServiceManagedEc2FleetConfiguration {
  StorageProfileId?: Value<string>;
  InstanceMarketOptions!: ServiceManagedEc2InstanceMarketOptions;
  InstanceCapabilities!: ServiceManagedEc2InstanceCapabilities;
  VpcConfiguration?: VpcConfiguration;
  constructor(properties: ServiceManagedEc2FleetConfiguration) {
    Object.assign(this, properties);
  }
}

export class ServiceManagedEc2InstanceCapabilities {
  AllowedInstanceTypes?: List<Value<string>>;
  CustomAttributes?: List<FleetAttributeCapability>;
  AcceleratorCapabilities?: AcceleratorCapabilities;
  CustomAmounts?: List<FleetAmountCapability>;
  VCpuCount!: VCpuCountRange;
  ExcludedInstanceTypes?: List<Value<string>>;
  MemoryMiB!: MemoryMiBRange;
  OsFamily!: Value<string>;
  CpuArchitectureType!: Value<string>;
  RootEbsVolume?: Ec2EbsVolume;
  constructor(properties: ServiceManagedEc2InstanceCapabilities) {
    Object.assign(this, properties);
  }
}

export class ServiceManagedEc2InstanceMarketOptions {
  Type!: Value<string>;
  constructor(properties: ServiceManagedEc2InstanceMarketOptions) {
    Object.assign(this, properties);
  }
}

export class VCpuCountRange {
  Min!: Value<number>;
  Max?: Value<number>;
  constructor(properties: VCpuCountRange) {
    Object.assign(this, properties);
  }
}

export class VpcConfiguration {
  ResourceConfigurationArns?: List<Value<string>>;
  constructor(properties: VpcConfiguration) {
    Object.assign(this, properties);
  }
}
export interface FleetProperties {
  Description?: Value<string>;
  Configuration: FleetConfiguration;
  HostConfiguration?: HostConfiguration;
  MaxWorkerCount: Value<number>;
  DisplayName: Value<string>;
  MinWorkerCount?: Value<number>;
  FarmId: Value<string>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Fleet extends ResourceBase<FleetProperties> {
  static AcceleratorCapabilities = AcceleratorCapabilities;
  static AcceleratorCountRange = AcceleratorCountRange;
  static AcceleratorSelection = AcceleratorSelection;
  static AcceleratorTotalMemoryMiBRange = AcceleratorTotalMemoryMiBRange;
  static CustomerManagedFleetConfiguration = CustomerManagedFleetConfiguration;
  static CustomerManagedWorkerCapabilities = CustomerManagedWorkerCapabilities;
  static Ec2EbsVolume = Ec2EbsVolume;
  static FleetAmountCapability = FleetAmountCapability;
  static FleetAttributeCapability = FleetAttributeCapability;
  static FleetCapabilities = FleetCapabilities;
  static FleetConfiguration = FleetConfiguration;
  static HostConfiguration = HostConfiguration;
  static MemoryMiBRange = MemoryMiBRange;
  static ServiceManagedEc2FleetConfiguration = ServiceManagedEc2FleetConfiguration;
  static ServiceManagedEc2InstanceCapabilities = ServiceManagedEc2InstanceCapabilities;
  static ServiceManagedEc2InstanceMarketOptions = ServiceManagedEc2InstanceMarketOptions;
  static VCpuCountRange = VCpuCountRange;
  static VpcConfiguration = VpcConfiguration;
  constructor(properties: FleetProperties) {
    super('AWS::Deadline::Fleet', properties);
  }
}
