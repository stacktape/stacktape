import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class MinimumHealthyHosts {
  Type!: Value<string>;
  Value!: Value<number>;
  constructor(properties: MinimumHealthyHosts) {
    Object.assign(this, properties);
  }
}

export class MinimumHealthyHostsPerZone {
  Type!: Value<string>;
  Value!: Value<number>;
  constructor(properties: MinimumHealthyHostsPerZone) {
    Object.assign(this, properties);
  }
}

export class TimeBasedCanary {
  CanaryPercentage!: Value<number>;
  CanaryInterval!: Value<number>;
  constructor(properties: TimeBasedCanary) {
    Object.assign(this, properties);
  }
}

export class TimeBasedLinear {
  LinearInterval!: Value<number>;
  LinearPercentage!: Value<number>;
  constructor(properties: TimeBasedLinear) {
    Object.assign(this, properties);
  }
}

export class TrafficRoutingConfig {
  Type!: Value<string>;
  TimeBasedLinear?: TimeBasedLinear;
  TimeBasedCanary?: TimeBasedCanary;
  constructor(properties: TrafficRoutingConfig) {
    Object.assign(this, properties);
  }
}

export class ZonalConfig {
  MonitorDurationInSeconds?: Value<number>;
  MinimumHealthyHostsPerZone?: MinimumHealthyHostsPerZone;
  FirstZoneMonitorDurationInSeconds?: Value<number>;
  constructor(properties: ZonalConfig) {
    Object.assign(this, properties);
  }
}
export interface DeploymentConfigProperties {
  ComputePlatform?: Value<string>;
  ZonalConfig?: ZonalConfig;
  DeploymentConfigName?: Value<string>;
  TrafficRoutingConfig?: TrafficRoutingConfig;
  MinimumHealthyHosts?: MinimumHealthyHosts;
}
export default class DeploymentConfig extends ResourceBase<DeploymentConfigProperties> {
  static MinimumHealthyHosts = MinimumHealthyHosts;
  static MinimumHealthyHostsPerZone = MinimumHealthyHostsPerZone;
  static TimeBasedCanary = TimeBasedCanary;
  static TimeBasedLinear = TimeBasedLinear;
  static TrafficRoutingConfig = TrafficRoutingConfig;
  static ZonalConfig = ZonalConfig;
  constructor(properties?: DeploymentConfigProperties) {
    super('AWS::CodeDeploy::DeploymentConfig', properties || {});
  }
}
