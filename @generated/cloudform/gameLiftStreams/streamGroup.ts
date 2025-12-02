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
  OnDemandCapacity?: Value<number>;
  LocationName!: Value<string>;
  constructor(properties: LocationConfiguration) {
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
  constructor(properties: StreamGroupProperties) {
    super('AWS::GameLiftStreams::StreamGroup', properties);
  }
}
