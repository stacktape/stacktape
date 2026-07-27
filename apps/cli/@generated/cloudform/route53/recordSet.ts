import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AliasTarget {
  DNSName!: Value<string>;
  EvaluateTargetHealth?: Value<boolean>;
  HostedZoneId!: Value<string>;
  constructor(properties: AliasTarget) {
    Object.assign(this, properties);
  }
}

export class CidrRoutingConfig {
  CollectionId!: Value<string>;
  LocationName!: Value<string>;
  constructor(properties: CidrRoutingConfig) {
    Object.assign(this, properties);
  }
}

export class Coordinates {
  Latitude!: Value<string>;
  Longitude!: Value<string>;
  constructor(properties: Coordinates) {
    Object.assign(this, properties);
  }
}

export class GeoLocation {
  ContinentCode?: Value<string>;
  CountryCode?: Value<string>;
  SubdivisionCode?: Value<string>;
  constructor(properties: GeoLocation) {
    Object.assign(this, properties);
  }
}

export class GeoProximityLocation {
  AWSRegion?: Value<string>;
  Bias?: Value<number>;
  Coordinates?: Coordinates;
  LocalZoneGroup?: Value<string>;
  constructor(properties: GeoProximityLocation) {
    Object.assign(this, properties);
  }
}
export interface RecordSetProperties {
  AliasTarget?: AliasTarget;
  CidrRoutingConfig?: CidrRoutingConfig;
  Comment?: Value<string>;
  Failover?: Value<string>;
  GeoLocation?: GeoLocation;
  GeoProximityLocation?: GeoProximityLocation;
  HealthCheckId?: Value<string>;
  HostedZoneId?: Value<string>;
  HostedZoneName?: Value<string>;
  MultiValueAnswer?: Value<boolean>;
  Name: Value<string>;
  Region?: Value<string>;
  ResourceRecords?: List<Value<string>>;
  SetIdentifier?: Value<string>;
  TTL?: Value<string>;
  Type: Value<string>;
  Weight?: Value<number>;
}
export default class RecordSet extends ResourceBase<RecordSetProperties> {
  static AliasTarget = AliasTarget;
  static CidrRoutingConfig = CidrRoutingConfig;
  static Coordinates = Coordinates;
  static GeoLocation = GeoLocation;
  static GeoProximityLocation = GeoProximityLocation;
  constructor(properties: RecordSetProperties) {
    super('AWS::Route53::RecordSet', properties);
  }
}
