import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EndpointEventBus {
  EventBusArn!: Value<string>;
  constructor(properties: EndpointEventBus) {
    Object.assign(this, properties);
  }
}

export class FailoverConfig {
  Secondary!: Secondary;
  Primary!: Primary;
  constructor(properties: FailoverConfig) {
    Object.assign(this, properties);
  }
}

export class Primary {
  HealthCheck!: Value<string>;
  constructor(properties: Primary) {
    Object.assign(this, properties);
  }
}

export class ReplicationConfig {
  State!: Value<string>;
  constructor(properties: ReplicationConfig) {
    Object.assign(this, properties);
  }
}

export class RoutingConfig {
  FailoverConfig!: FailoverConfig;
  constructor(properties: RoutingConfig) {
    Object.assign(this, properties);
  }
}

export class Secondary {
  Route!: Value<string>;
  constructor(properties: Secondary) {
    Object.assign(this, properties);
  }
}
export interface EndpointProperties {
  EventBuses: List<EndpointEventBus>;
  Description?: Value<string>;
  ReplicationConfig?: ReplicationConfig;
  RoutingConfig: RoutingConfig;
  RoleArn?: Value<string>;
  Name?: Value<string>;
}
export default class Endpoint extends ResourceBase<EndpointProperties> {
  static EndpointEventBus = EndpointEventBus;
  static FailoverConfig = FailoverConfig;
  static Primary = Primary;
  static ReplicationConfig = ReplicationConfig;
  static RoutingConfig = RoutingConfig;
  static Secondary = Secondary;
  constructor(properties: EndpointProperties) {
    super('AWS::Events::Endpoint', properties);
  }
}
