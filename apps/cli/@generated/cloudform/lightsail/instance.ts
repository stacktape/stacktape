import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AddOn {
  Status?: Value<string>;
  AddOnType!: Value<string>;
  AutoSnapshotAddOnRequest?: AutoSnapshotAddOn;
  constructor(properties: AddOn) {
    Object.assign(this, properties);
  }
}

export class AutoSnapshotAddOn {
  SnapshotTimeOfDay?: Value<string>;
  constructor(properties: AutoSnapshotAddOn) {
    Object.assign(this, properties);
  }
}

export class Disk {
  SizeInGb?: Value<string>;
  Path!: Value<string>;
  AttachmentState?: Value<string>;
  IsSystemDisk?: Value<boolean>;
  AttachedTo?: Value<string>;
  IOPS?: Value<number>;
  DiskName!: Value<string>;
  constructor(properties: Disk) {
    Object.assign(this, properties);
  }
}

export class Hardware {
  CpuCount?: Value<number>;
  RamSizeInGb?: Value<number>;
  Disks?: List<Disk>;
  constructor(properties: Hardware) {
    Object.assign(this, properties);
  }
}

export class Location {
  RegionName?: Value<string>;
  AvailabilityZone?: Value<string>;
  constructor(properties: Location) {
    Object.assign(this, properties);
  }
}

export class MonthlyTransfer {
  GbPerMonthAllocated?: Value<string>;
  constructor(properties: MonthlyTransfer) {
    Object.assign(this, properties);
  }
}

export class Networking {
  Ports!: List<Port>;
  MonthlyTransfer?: MonthlyTransfer;
  constructor(properties: Networking) {
    Object.assign(this, properties);
  }
}

export class Port {
  FromPort?: Value<number>;
  AccessDirection?: Value<string>;
  CidrListAliases?: List<Value<string>>;
  ToPort?: Value<number>;
  Ipv6Cidrs?: List<Value<string>>;
  AccessFrom?: Value<string>;
  Protocol?: Value<string>;
  AccessType?: Value<string>;
  Cidrs?: List<Value<string>>;
  CommonName?: Value<string>;
  constructor(properties: Port) {
    Object.assign(this, properties);
  }
}

export class State {
  Code?: Value<number>;
  Name?: Value<string>;
  constructor(properties: State) {
    Object.assign(this, properties);
  }
}
export interface InstanceProperties {
  InstanceName: Value<string>;
  KeyPairName?: Value<string>;
  BundleId: Value<string>;
  BlueprintId: Value<string>;
  Networking?: Networking;
  UserData?: Value<string>;
  State?: State;
  AvailabilityZone?: Value<string>;
  AddOns?: List<AddOn>;
  Hardware?: Hardware;
  Tags?: List<ResourceTag>;
  Location?: Location;
}
export default class Instance extends ResourceBase<InstanceProperties> {
  static AddOn = AddOn;
  static AutoSnapshotAddOn = AutoSnapshotAddOn;
  static Disk = Disk;
  static Hardware = Hardware;
  static Location = Location;
  static MonthlyTransfer = MonthlyTransfer;
  static Networking = Networking;
  static Port = Port;
  static State = State;
  constructor(properties: InstanceProperties) {
    super('AWS::Lightsail::Instance', properties);
  }
}
