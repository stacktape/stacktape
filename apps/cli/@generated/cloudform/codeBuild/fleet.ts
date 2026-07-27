import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ComputeConfiguration {
  disk?: Value<number>;
  memory?: Value<number>;
  vCpu?: Value<number>;
  instanceType?: Value<string>;
  machineType?: Value<string>;
  constructor(properties: ComputeConfiguration) {
    Object.assign(this, properties);
  }
}

export class FleetProxyRule {
  Type?: Value<string>;
  Effect?: Value<string>;
  Entities?: List<Value<string>>;
  constructor(properties: FleetProxyRule) {
    Object.assign(this, properties);
  }
}

export class ProxyConfiguration {
  DefaultBehavior?: Value<string>;
  OrderedProxyRules?: List<FleetProxyRule>;
  constructor(properties: ProxyConfiguration) {
    Object.assign(this, properties);
  }
}

export class ScalingConfigurationInput {
  TargetTrackingScalingConfigs?: List<TargetTrackingScalingConfiguration>;
  ScalingType?: Value<string>;
  MaxCapacity?: Value<number>;
  constructor(properties: ScalingConfigurationInput) {
    Object.assign(this, properties);
  }
}

export class TargetTrackingScalingConfiguration {
  TargetValue?: Value<number>;
  MetricType?: Value<string>;
  constructor(properties: TargetTrackingScalingConfiguration) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  Subnets?: List<Value<string>>;
  VpcId?: Value<string>;
  SecurityGroupIds?: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface FleetProperties {
  FleetServiceRole?: Value<string>;
  EnvironmentType?: Value<string>;
  OverflowBehavior?: Value<string>;
  ImageId?: Value<string>;
  ScalingConfiguration?: ScalingConfigurationInput;
  BaseCapacity?: Value<number>;
  FleetProxyConfiguration?: ProxyConfiguration;
  ComputeConfiguration?: ComputeConfiguration;
  ComputeType?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
  FleetVpcConfig?: VpcConfig;
}
export default class Fleet extends ResourceBase<FleetProperties> {
  static ComputeConfiguration = ComputeConfiguration;
  static FleetProxyRule = FleetProxyRule;
  static ProxyConfiguration = ProxyConfiguration;
  static ScalingConfigurationInput = ScalingConfigurationInput;
  static TargetTrackingScalingConfiguration = TargetTrackingScalingConfiguration;
  static VpcConfig = VpcConfig;
  constructor(properties?: FleetProperties) {
    super('AWS::CodeBuild::Fleet', properties || {});
  }
}
