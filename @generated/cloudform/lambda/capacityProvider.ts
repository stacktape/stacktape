import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CapacityProviderPermissionsConfig {
  CapacityProviderOperatorRoleArn!: Value<string>;
  constructor(properties: CapacityProviderPermissionsConfig) {
    Object.assign(this, properties);
  }
}

export class CapacityProviderScalingConfig {
  ScalingPolicies?: List<TargetTrackingScalingPolicy>;
  ScalingMode?: Value<string>;
  MaxVCpuCount?: Value<number>;
  constructor(properties: CapacityProviderScalingConfig) {
    Object.assign(this, properties);
  }
}

export class CapacityProviderVpcConfig {
  SubnetIds!: List<Value<string>>;
  SecurityGroupIds!: List<Value<string>>;
  constructor(properties: CapacityProviderVpcConfig) {
    Object.assign(this, properties);
  }
}

export class InstanceRequirements {
  AllowedInstanceTypes?: List<Value<string>>;
  ExcludedInstanceTypes?: List<Value<string>>;
  Architectures?: List<Value<string>>;
  constructor(properties: InstanceRequirements) {
    Object.assign(this, properties);
  }
}

export class TargetTrackingScalingPolicy {
  PredefinedMetricType!: Value<string>;
  TargetValue!: Value<number>;
  constructor(properties: TargetTrackingScalingPolicy) {
    Object.assign(this, properties);
  }
}
export interface CapacityProviderProperties {
  CapacityProviderScalingConfig?: CapacityProviderScalingConfig;
  KmsKeyArn?: Value<string>;
  VpcConfig: CapacityProviderVpcConfig;
  CapacityProviderName?: Value<string>;
  InstanceRequirements?: InstanceRequirements;
  PermissionsConfig: CapacityProviderPermissionsConfig;
  Tags?: List<ResourceTag>;
}
export default class CapacityProvider extends ResourceBase<CapacityProviderProperties> {
  static CapacityProviderPermissionsConfig = CapacityProviderPermissionsConfig;
  static CapacityProviderScalingConfig = CapacityProviderScalingConfig;
  static CapacityProviderVpcConfig = CapacityProviderVpcConfig;
  static InstanceRequirements = InstanceRequirements;
  static TargetTrackingScalingPolicy = TargetTrackingScalingPolicy;
  constructor(properties: CapacityProviderProperties) {
    super('AWS::Lambda::CapacityProvider', properties);
  }
}
