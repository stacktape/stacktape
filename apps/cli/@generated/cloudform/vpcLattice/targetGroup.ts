import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class HealthCheckConfig {
  Path?: Value<string>;
  HealthCheckIntervalSeconds?: Value<number>;
  Matcher?: Matcher;
  HealthyThresholdCount?: Value<number>;
  Port?: Value<number>;
  Enabled?: Value<boolean>;
  Protocol?: Value<string>;
  ProtocolVersion?: Value<string>;
  UnhealthyThresholdCount?: Value<number>;
  HealthCheckTimeoutSeconds?: Value<number>;
  constructor(properties: HealthCheckConfig) {
    Object.assign(this, properties);
  }
}

export class Matcher {
  HttpCode!: Value<string>;
  constructor(properties: Matcher) {
    Object.assign(this, properties);
  }
}

export class Target {
  Port?: Value<number>;
  Id!: Value<string>;
  constructor(properties: Target) {
    Object.assign(this, properties);
  }
}

export class TargetGroupConfig {
  IpAddressType?: Value<string>;
  Port?: Value<number>;
  HealthCheck?: HealthCheckConfig;
  LambdaEventStructureVersion?: Value<string>;
  VpcIdentifier?: Value<string>;
  Protocol?: Value<string>;
  ProtocolVersion?: Value<string>;
  constructor(properties: TargetGroupConfig) {
    Object.assign(this, properties);
  }
}
export interface TargetGroupProperties {
  Type: Value<string>;
  Config?: TargetGroupConfig;
  Targets?: List<Target>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class TargetGroup extends ResourceBase<TargetGroupProperties> {
  static HealthCheckConfig = HealthCheckConfig;
  static Matcher = Matcher;
  static Target = Target;
  static TargetGroupConfig = TargetGroupConfig;
  constructor(properties: TargetGroupProperties) {
    super('AWS::VpcLattice::TargetGroup', properties);
  }
}
