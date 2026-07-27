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

export class Location {
  RegionName?: Value<string>;
  AvailabilityZone?: Value<string>;
  constructor(properties: Location) {
    Object.assign(this, properties);
  }
}
export interface DiskProperties {
  SizeInGb: Value<number>;
  AvailabilityZone?: Value<string>;
  AddOns?: List<AddOn>;
  DiskName: Value<string>;
  Tags?: List<ResourceTag>;
  Location?: Location;
}
export default class Disk extends ResourceBase<DiskProperties> {
  static AddOn = AddOn;
  static AutoSnapshotAddOn = AutoSnapshotAddOn;
  static Location = Location;
  constructor(properties: DiskProperties) {
    super('AWS::Lightsail::Disk', properties);
  }
}
