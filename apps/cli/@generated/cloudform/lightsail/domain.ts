import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DomainEntry {
  Target!: Value<string>;
  Type!: Value<string>;
  Id?: Value<string>;
  IsAlias?: Value<boolean>;
  Name!: Value<string>;
  constructor(properties: DomainEntry) {
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
export interface DomainProperties {
  DomainName: Value<string>;
  DomainEntries?: List<DomainEntry>;
  Tags?: List<ResourceTag>;
}
export default class Domain extends ResourceBase<DomainProperties> {
  static DomainEntry = DomainEntry;
  static Location = Location;
  constructor(properties: DomainProperties) {
    super('AWS::Lightsail::Domain', properties);
  }
}
