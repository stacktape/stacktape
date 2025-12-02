import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EndpointConfiguration {
  AttachmentArn?: Value<string>;
  EndpointId!: Value<string>;
  Weight?: Value<number>;
  ClientIPPreservationEnabled?: Value<boolean>;
  constructor(properties: EndpointConfiguration) {
    Object.assign(this, properties);
  }
}

export class PortOverride {
  ListenerPort!: Value<number>;
  EndpointPort!: Value<number>;
  constructor(properties: PortOverride) {
    Object.assign(this, properties);
  }
}
export interface EndpointGroupProperties {
  ListenerArn: Value<string>;
  PortOverrides?: List<PortOverride>;
  HealthCheckIntervalSeconds?: Value<number>;
  EndpointGroupRegion: Value<string>;
  HealthCheckPath?: Value<string>;
  TrafficDialPercentage?: Value<number>;
  HealthCheckProtocol?: Value<string>;
  ThresholdCount?: Value<number>;
  HealthCheckPort?: Value<number>;
  EndpointConfigurations?: List<EndpointConfiguration>;
}
export default class EndpointGroup extends ResourceBase<EndpointGroupProperties> {
  static EndpointConfiguration = EndpointConfiguration;
  static PortOverride = PortOverride;
  constructor(properties: EndpointGroupProperties) {
    super('AWS::GlobalAccelerator::EndpointGroup', properties);
  }
}
