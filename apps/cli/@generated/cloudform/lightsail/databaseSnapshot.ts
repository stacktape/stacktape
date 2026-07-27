import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Location {
  RegionName?: Value<string>;
  AvailabilityZone?: Value<string>;
  constructor(properties: Location) {
    Object.assign(this, properties);
  }
}
export interface DatabaseSnapshotProperties {
  RelationalDatabaseName: Value<string>;
  RelationalDatabaseSnapshotName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DatabaseSnapshot extends ResourceBase<DatabaseSnapshotProperties> {
  static Location = Location;
  constructor(properties: DatabaseSnapshotProperties) {
    super('AWS::Lightsail::DatabaseSnapshot', properties);
  }
}
