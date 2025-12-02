import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ComponentConfigurationUpdate {
  Merge?: Value<string>;
  Reset?: List<Value<string>>;
  constructor(properties: ComponentConfigurationUpdate) {
    Object.assign(this, properties);
  }
}

export class ComponentDeploymentSpecification {
  RunWith?: ComponentRunWith;
  ConfigurationUpdate?: ComponentConfigurationUpdate;
  ComponentVersion?: Value<string>;
  constructor(properties: ComponentDeploymentSpecification) {
    Object.assign(this, properties);
  }
}

export class ComponentRunWith {
  WindowsUser?: Value<string>;
  SystemResourceLimits?: SystemResourceLimits;
  PosixUser?: Value<string>;
  constructor(properties: ComponentRunWith) {
    Object.assign(this, properties);
  }
}

export class DeploymentComponentUpdatePolicy {
  Action?: Value<string>;
  TimeoutInSeconds?: Value<number>;
  constructor(properties: DeploymentComponentUpdatePolicy) {
    Object.assign(this, properties);
  }
}

export class DeploymentConfigurationValidationPolicy {
  TimeoutInSeconds?: Value<number>;
  constructor(properties: DeploymentConfigurationValidationPolicy) {
    Object.assign(this, properties);
  }
}

export class DeploymentIoTJobConfiguration {
  JobExecutionsRolloutConfig?: IoTJobExecutionsRolloutConfig;
  TimeoutConfig?: IoTJobTimeoutConfig;
  AbortConfig?: IoTJobAbortConfig;
  constructor(properties: DeploymentIoTJobConfiguration) {
    Object.assign(this, properties);
  }
}

export class DeploymentPolicies {
  ComponentUpdatePolicy?: DeploymentComponentUpdatePolicy;
  ConfigurationValidationPolicy?: DeploymentConfigurationValidationPolicy;
  FailureHandlingPolicy?: Value<string>;
  constructor(properties: DeploymentPolicies) {
    Object.assign(this, properties);
  }
}

export class IoTJobAbortConfig {
  CriteriaList!: List<IoTJobAbortCriteria>;
  constructor(properties: IoTJobAbortConfig) {
    Object.assign(this, properties);
  }
}

export class IoTJobAbortCriteria {
  FailureType!: Value<string>;
  Action!: Value<string>;
  ThresholdPercentage!: Value<number>;
  MinNumberOfExecutedThings!: Value<number>;
  constructor(properties: IoTJobAbortCriteria) {
    Object.assign(this, properties);
  }
}

export class IoTJobExecutionsRolloutConfig {
  MaximumPerMinute?: Value<number>;
  ExponentialRate?: IoTJobExponentialRolloutRate;
  constructor(properties: IoTJobExecutionsRolloutConfig) {
    Object.assign(this, properties);
  }
}

export class IoTJobExponentialRolloutRate {
  RateIncreaseCriteria!: IoTJobRateIncreaseCriteria;
  BaseRatePerMinute!: Value<number>;
  IncrementFactor!: Value<number>;
  constructor(properties: IoTJobExponentialRolloutRate) {
    Object.assign(this, properties);
  }
}

export class IoTJobRateIncreaseCriteria {
  NumberOfSucceededThings?: Value<number>;
  NumberOfNotifiedThings?: Value<number>;
  constructor(properties: IoTJobRateIncreaseCriteria) {
    Object.assign(this, properties);
  }
}

export class IoTJobTimeoutConfig {
  InProgressTimeoutInMinutes?: Value<number>;
  constructor(properties: IoTJobTimeoutConfig) {
    Object.assign(this, properties);
  }
}

export class SystemResourceLimits {
  Memory?: Value<number>;
  Cpus?: Value<number>;
  constructor(properties: SystemResourceLimits) {
    Object.assign(this, properties);
  }
}
export interface DeploymentProperties {
  Components?: { [key: string]: ComponentDeploymentSpecification };
  DeploymentName?: Value<string>;
  IotJobConfiguration?: DeploymentIoTJobConfiguration;
  DeploymentPolicies?: DeploymentPolicies;
  TargetArn: Value<string>;
  ParentTargetArn?: Value<string>;
  Tags?: { [key: string]: Value<string> };
}
export default class Deployment extends ResourceBase<DeploymentProperties> {
  static ComponentConfigurationUpdate = ComponentConfigurationUpdate;
  static ComponentDeploymentSpecification = ComponentDeploymentSpecification;
  static ComponentRunWith = ComponentRunWith;
  static DeploymentComponentUpdatePolicy = DeploymentComponentUpdatePolicy;
  static DeploymentConfigurationValidationPolicy = DeploymentConfigurationValidationPolicy;
  static DeploymentIoTJobConfiguration = DeploymentIoTJobConfiguration;
  static DeploymentPolicies = DeploymentPolicies;
  static IoTJobAbortConfig = IoTJobAbortConfig;
  static IoTJobAbortCriteria = IoTJobAbortCriteria;
  static IoTJobExecutionsRolloutConfig = IoTJobExecutionsRolloutConfig;
  static IoTJobExponentialRolloutRate = IoTJobExponentialRolloutRate;
  static IoTJobRateIncreaseCriteria = IoTJobRateIncreaseCriteria;
  static IoTJobTimeoutConfig = IoTJobTimeoutConfig;
  static SystemResourceLimits = SystemResourceLimits;
  constructor(properties: DeploymentProperties) {
    super('AWS::GreengrassV2::Deployment', properties);
  }
}
