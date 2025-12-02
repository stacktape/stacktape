import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Configuration {
  Classification?: Value<string>;
  ConfigurationProperties?: { [key: string]: Value<string> };
  Configurations?: List<Configuration>;
  constructor(properties: Configuration) {
    Object.assign(this, properties);
  }
}

export class EbsBlockDeviceConfig {
  VolumeSpecification!: VolumeSpecification;
  VolumesPerInstance?: Value<number>;
  constructor(properties: EbsBlockDeviceConfig) {
    Object.assign(this, properties);
  }
}

export class EbsConfiguration {
  EbsBlockDeviceConfigs?: List<EbsBlockDeviceConfig>;
  EbsOptimized?: Value<boolean>;
  constructor(properties: EbsConfiguration) {
    Object.assign(this, properties);
  }
}

export class InstanceFleetProvisioningSpecifications {
  OnDemandSpecification?: OnDemandProvisioningSpecification;
  SpotSpecification?: SpotProvisioningSpecification;
  constructor(properties: InstanceFleetProvisioningSpecifications) {
    Object.assign(this, properties);
  }
}

export class InstanceFleetResizingSpecifications {
  OnDemandResizeSpecification?: OnDemandResizingSpecification;
  SpotResizeSpecification?: SpotResizingSpecification;
  constructor(properties: InstanceFleetResizingSpecifications) {
    Object.assign(this, properties);
  }
}

export class InstanceTypeConfig {
  BidPrice?: Value<string>;
  BidPriceAsPercentageOfOnDemandPrice?: Value<number>;
  Configurations?: List<Configuration>;
  CustomAmiId?: Value<string>;
  EbsConfiguration?: EbsConfiguration;
  InstanceType!: Value<string>;
  Priority?: Value<number>;
  WeightedCapacity?: Value<number>;
  constructor(properties: InstanceTypeConfig) {
    Object.assign(this, properties);
  }
}

export class OnDemandCapacityReservationOptions {
  CapacityReservationPreference?: Value<string>;
  CapacityReservationResourceGroupArn?: Value<string>;
  UsageStrategy?: Value<string>;
  constructor(properties: OnDemandCapacityReservationOptions) {
    Object.assign(this, properties);
  }
}

export class OnDemandProvisioningSpecification {
  AllocationStrategy!: Value<string>;
  CapacityReservationOptions?: OnDemandCapacityReservationOptions;
  constructor(properties: OnDemandProvisioningSpecification) {
    Object.assign(this, properties);
  }
}

export class OnDemandResizingSpecification {
  AllocationStrategy?: Value<string>;
  CapacityReservationOptions?: OnDemandCapacityReservationOptions;
  TimeoutDurationMinutes?: Value<number>;
  constructor(properties: OnDemandResizingSpecification) {
    Object.assign(this, properties);
  }
}

export class SpotProvisioningSpecification {
  AllocationStrategy?: Value<string>;
  BlockDurationMinutes?: Value<number>;
  TimeoutAction!: Value<string>;
  TimeoutDurationMinutes!: Value<number>;
  constructor(properties: SpotProvisioningSpecification) {
    Object.assign(this, properties);
  }
}

export class SpotResizingSpecification {
  AllocationStrategy?: Value<string>;
  TimeoutDurationMinutes?: Value<number>;
  constructor(properties: SpotResizingSpecification) {
    Object.assign(this, properties);
  }
}

export class VolumeSpecification {
  Iops?: Value<number>;
  SizeInGB!: Value<number>;
  Throughput?: Value<number>;
  VolumeType!: Value<string>;
  constructor(properties: VolumeSpecification) {
    Object.assign(this, properties);
  }
}
export interface InstanceFleetConfigProperties {
  ClusterId: Value<string>;
  InstanceFleetType: Value<string>;
  InstanceTypeConfigs?: List<InstanceTypeConfig>;
  LaunchSpecifications?: InstanceFleetProvisioningSpecifications;
  Name?: Value<string>;
  ResizeSpecifications?: InstanceFleetResizingSpecifications;
  TargetOnDemandCapacity?: Value<number>;
  TargetSpotCapacity?: Value<number>;
}
export default class InstanceFleetConfig extends ResourceBase<InstanceFleetConfigProperties> {
  static Configuration = Configuration;
  static EbsBlockDeviceConfig = EbsBlockDeviceConfig;
  static EbsConfiguration = EbsConfiguration;
  static InstanceFleetProvisioningSpecifications = InstanceFleetProvisioningSpecifications;
  static InstanceFleetResizingSpecifications = InstanceFleetResizingSpecifications;
  static InstanceTypeConfig = InstanceTypeConfig;
  static OnDemandCapacityReservationOptions = OnDemandCapacityReservationOptions;
  static OnDemandProvisioningSpecification = OnDemandProvisioningSpecification;
  static OnDemandResizingSpecification = OnDemandResizingSpecification;
  static SpotProvisioningSpecification = SpotProvisioningSpecification;
  static SpotResizingSpecification = SpotResizingSpecification;
  static VolumeSpecification = VolumeSpecification;
  constructor(properties: InstanceFleetConfigProperties) {
    super('AWS::EMR::InstanceFleetConfig', properties);
  }
}
