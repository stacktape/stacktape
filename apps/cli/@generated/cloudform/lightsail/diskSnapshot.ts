import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Location {
  RegionName?: Value<string>;
  AvailabilityZone?: Value<string>;
  constructor(properties: Location) {
    Object.assign(this, properties);
  }
}
export interface DiskSnapshotProperties {
  DiskSnapshotName: Value<string>;
  DiskName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DiskSnapshot extends ResourceBase<DiskSnapshotProperties> {
  static Location = Location;
  constructor(properties: DiskSnapshotProperties) {
    super('AWS::Lightsail::DiskSnapshot', properties);
  }
}
