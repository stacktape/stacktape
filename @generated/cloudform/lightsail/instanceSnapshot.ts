import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Location {
  RegionName?: Value<string>;
  AvailabilityZone?: Value<string>;
  constructor(properties: Location) {
    Object.assign(this, properties);
  }
}
export interface InstanceSnapshotProperties {
  InstanceName: Value<string>;
  InstanceSnapshotName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class InstanceSnapshot extends ResourceBase<InstanceSnapshotProperties> {
  static Location = Location;
  constructor(properties: InstanceSnapshotProperties) {
    super('AWS::Lightsail::InstanceSnapshot', properties);
  }
}
