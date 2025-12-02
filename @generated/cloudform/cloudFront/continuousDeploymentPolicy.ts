import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ContinuousDeploymentPolicyConfig {
  Type?: Value<string>;
  SingleHeaderPolicyConfig?: SingleHeaderPolicyConfig;
  Enabled!: Value<boolean>;
  StagingDistributionDnsNames!: List<Value<string>>;
  TrafficConfig?: TrafficConfig;
  SingleWeightPolicyConfig?: SingleWeightPolicyConfig;
  constructor(properties: ContinuousDeploymentPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class SessionStickinessConfig {
  IdleTTL!: Value<number>;
  MaximumTTL!: Value<number>;
  constructor(properties: SessionStickinessConfig) {
    Object.assign(this, properties);
  }
}

export class SingleHeaderConfig {
  Header!: Value<string>;
  Value!: Value<string>;
  constructor(properties: SingleHeaderConfig) {
    Object.assign(this, properties);
  }
}

export class SingleHeaderPolicyConfig {
  Header!: Value<string>;
  Value!: Value<string>;
  constructor(properties: SingleHeaderPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class SingleWeightConfig {
  SessionStickinessConfig?: SessionStickinessConfig;
  Weight!: Value<number>;
  constructor(properties: SingleWeightConfig) {
    Object.assign(this, properties);
  }
}

export class SingleWeightPolicyConfig {
  SessionStickinessConfig?: SessionStickinessConfig;
  Weight!: Value<number>;
  constructor(properties: SingleWeightPolicyConfig) {
    Object.assign(this, properties);
  }
}

export class TrafficConfig {
  SingleWeightConfig?: SingleWeightConfig;
  Type!: Value<string>;
  SingleHeaderConfig?: SingleHeaderConfig;
  constructor(properties: TrafficConfig) {
    Object.assign(this, properties);
  }
}
export interface ContinuousDeploymentPolicyProperties {
  ContinuousDeploymentPolicyConfig: ContinuousDeploymentPolicyConfig;
}
export default class ContinuousDeploymentPolicy extends ResourceBase<ContinuousDeploymentPolicyProperties> {
  static ContinuousDeploymentPolicyConfig = ContinuousDeploymentPolicyConfig;
  static SessionStickinessConfig = SessionStickinessConfig;
  static SingleHeaderConfig = SingleHeaderConfig;
  static SingleHeaderPolicyConfig = SingleHeaderPolicyConfig;
  static SingleWeightConfig = SingleWeightConfig;
  static SingleWeightPolicyConfig = SingleWeightPolicyConfig;
  static TrafficConfig = TrafficConfig;
  constructor(properties: ContinuousDeploymentPolicyProperties) {
    super('AWS::CloudFront::ContinuousDeploymentPolicy', properties);
  }
}
