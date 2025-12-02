import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Matcher {
  GrpcCode?: Value<string>;
  HttpCode?: Value<string>;
  constructor(properties: Matcher) {
    Object.assign(this, properties);
  }
}

export class TargetDescription {
  Port?: Value<number>;
  AvailabilityZone?: Value<string>;
  Id!: Value<string>;
  constructor(properties: TargetDescription) {
    Object.assign(this, properties);
  }
}

export class TargetGroupAttribute {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: TargetGroupAttribute) {
    Object.assign(this, properties);
  }
}
export interface TargetGroupProperties {
  IpAddressType?: Value<string>;
  HealthCheckIntervalSeconds?: Value<number>;
  Matcher?: Matcher;
  HealthCheckPath?: Value<string>;
  Port?: Value<number>;
  Targets?: List<TargetDescription>;
  HealthCheckEnabled?: Value<boolean>;
  ProtocolVersion?: Value<string>;
  UnhealthyThresholdCount?: Value<number>;
  HealthCheckTimeoutSeconds?: Value<number>;
  Name?: Value<string>;
  VpcId?: Value<string>;
  HealthyThresholdCount?: Value<number>;
  HealthCheckProtocol?: Value<string>;
  TargetGroupAttributes?: List<TargetGroupAttribute>;
  TargetType?: Value<string>;
  HealthCheckPort?: Value<string>;
  Protocol?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class TargetGroup extends ResourceBase<TargetGroupProperties> {
  static Matcher = Matcher;
  static TargetDescription = TargetDescription;
  static TargetGroupAttribute = TargetGroupAttribute;
  constructor(properties?: TargetGroupProperties) {
    super('AWS::ElasticLoadBalancingV2::TargetGroup', properties || {});
  }
}
