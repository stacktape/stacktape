import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Location {
  CidrList!: List<Value<string>>;
  LocationName!: Value<string>;
  constructor(properties: Location) {
    Object.assign(this, properties);
  }
}
export interface CidrCollectionProperties {
  Locations?: List<Location>;
  Name: Value<string>;
}
export default class CidrCollection extends ResourceBase<CidrCollectionProperties> {
  static Location = Location;
  constructor(properties: CidrCollectionProperties) {
    super('AWS::Route53::CidrCollection', properties);
  }
}
