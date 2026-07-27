import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DefaultApplication {
  Id?: Value<string>;
  Arn?: Value<string>;
  constructor(properties: DefaultApplication) {
    Object.assign(this, properties);
  }
}

export class LocationConfiguration {
  AlwaysOnCapacity?: Value<number>;
  MaximumCapacity?: Value<number>;
  VpcTransitConfiguration?: VpcTransitConfiguration;
  OnDemandCapacity?: Value<number>;
  LocationName!: Value<string>;
  TargetIdleCapacity?: Value<number>;
  constructor(properties: LocationConfiguration) {
    Object.assign(this, properties);
  }
}

export class VpcTransitConfiguration {
  VpcId!: Value<string>;
  Ipv4CidrBlocks!: List<Value<string>>;
  constructor(properties: VpcTransitConfiguration) {
    Object.assign(this, properties);
  }
}
export interface StreamGroupProperties {
  Description: Value<string>;
  StreamClass: Value<string>;
  LocationConfigurations: List<LocationConfiguration>;
  DefaultApplication?: DefaultApplication;
  Tags?: { [key: string]: Value<string> };
}
export default class StreamGroup extends ResourceBase<StreamGroupProperties> {
  static DefaultApplication = DefaultApplication;
  static LocationConfiguration = LocationConfiguration;
  static VpcTransitConfiguration = VpcTransitConfiguration;
  constructor(properties: StreamGroupProperties) {
    super('AWS::GameLiftStreams::StreamGroup', properties);
  }
}
