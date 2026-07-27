import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Alarm {
  AlarmName!: Value<string>;
  constructor(properties: Alarm) {
    Object.assign(this, properties);
  }
}

export class AutoRollbackConfig {
  Alarms!: List<Alarm>;
  constructor(properties: AutoRollbackConfig) {
    Object.assign(this, properties);
  }
}

export class BlueGreenUpdatePolicy {
  MaximumExecutionTimeoutInSeconds?: Value<number>;
  TerminationWaitInSeconds?: Value<number>;
  TrafficRoutingConfiguration!: TrafficRoutingConfig;
  constructor(properties: BlueGreenUpdatePolicy) {
    Object.assign(this, properties);
  }
}

export class CapacitySize {
  Type!: Value<string>;
  Value!: Value<number>;
  constructor(properties: CapacitySize) {
    Object.assign(this, properties);
  }
}

export class DeploymentConfig {
  AutoRollbackConfiguration?: AutoRollbackConfig;
  RollingUpdatePolicy?: RollingUpdatePolicy;
  BlueGreenUpdatePolicy?: BlueGreenUpdatePolicy;
  constructor(properties: DeploymentConfig) {
    Object.assign(this, properties);
  }
}

export class RollingUpdatePolicy {
  MaximumExecutionTimeoutInSeconds?: Value<number>;
  MaximumBatchSize!: CapacitySize;
  WaitIntervalInSeconds!: Value<number>;
  RollbackMaximumBatchSize?: CapacitySize;
  constructor(properties: RollingUpdatePolicy) {
    Object.assign(this, properties);
  }
}

export class TrafficRoutingConfig {
  Type!: Value<string>;
  LinearStepSize?: CapacitySize;
  CanarySize?: CapacitySize;
  WaitIntervalInSeconds?: Value<number>;
  constructor(properties: TrafficRoutingConfig) {
    Object.assign(this, properties);
  }
}

export class VariantProperty {
  VariantPropertyType?: Value<string>;
  constructor(properties: VariantProperty) {
    Object.assign(this, properties);
  }
}
export interface EndpointProperties {
  RetainAllVariantProperties?: Value<boolean>;
  EndpointName?: Value<string>;
  ExcludeRetainedVariantProperties?: List<VariantProperty>;
  EndpointConfigName: Value<string>;
  DeploymentConfig?: DeploymentConfig;
  RetainDeploymentConfig?: Value<boolean>;
  Tags?: List<ResourceTag>;
}
export default class Endpoint extends ResourceBase<EndpointProperties> {
  static Alarm = Alarm;
  static AutoRollbackConfig = AutoRollbackConfig;
  static BlueGreenUpdatePolicy = BlueGreenUpdatePolicy;
  static CapacitySize = CapacitySize;
  static DeploymentConfig = DeploymentConfig;
  static RollingUpdatePolicy = RollingUpdatePolicy;
  static TrafficRoutingConfig = TrafficRoutingConfig;
  static VariantProperty = VariantProperty;
  constructor(properties: EndpointProperties) {
    super('AWS::SageMaker::Endpoint', properties);
  }
}
