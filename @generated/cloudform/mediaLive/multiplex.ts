import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MultiplexMediaConnectOutputDestinationSettings {
  EntitlementArn?: Value<string>;
  constructor(properties: MultiplexMediaConnectOutputDestinationSettings) {
    Object.assign(this, properties);
  }
}

export class MultiplexOutputDestination {
  MultiplexMediaConnectOutputDestinationSettings?: MultiplexMediaConnectOutputDestinationSettings;
  constructor(properties: MultiplexOutputDestination) {
    Object.assign(this, properties);
  }
}

export class MultiplexSettings {
  TransportStreamBitrate!: Value<number>;
  MaximumVideoBufferDelayMilliseconds?: Value<number>;
  TransportStreamId!: Value<number>;
  TransportStreamReservedBitrate?: Value<number>;
  constructor(properties: MultiplexSettings) {
    Object.assign(this, properties);
  }
}

export class Tags {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: Tags) {
    Object.assign(this, properties);
  }
}
export interface MultiplexProperties {
  MultiplexSettings: MultiplexSettings;
  AvailabilityZones: List<Value<string>>;
  Destinations?: List<MultiplexOutputDestination>;
  Tags?: List<Tags>;
  Name: Value<string>;
}
export default class Multiplex extends ResourceBase<MultiplexProperties> {
  static MultiplexMediaConnectOutputDestinationSettings = MultiplexMediaConnectOutputDestinationSettings;
  static MultiplexOutputDestination = MultiplexOutputDestination;
  static MultiplexSettings = MultiplexSettings;
  static Tags = Tags;
  constructor(properties: MultiplexProperties) {
    super('AWS::MediaLive::Multiplex', properties);
  }
}
