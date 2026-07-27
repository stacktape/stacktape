import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AlarmIdentifier {
  Region!: Value<string>;
  Name!: Value<string>;
  constructor(properties: AlarmIdentifier) {
    Object.assign(this, properties);
  }
}

export class HealthCheckConfig {
  EnableSNI?: Value<boolean>;
  ChildHealthChecks?: List<Value<string>>;
  MeasureLatency?: Value<boolean>;
  Port?: Value<number>;
  Regions?: List<Value<string>>;
  InsufficientDataHealthStatus?: Value<string>;
  SearchString?: Value<string>;
  Type!: Value<string>;
  ResourcePath?: Value<string>;
  RoutingControlArn?: Value<string>;
  FullyQualifiedDomainName?: Value<string>;
  Inverted?: Value<boolean>;
  HealthThreshold?: Value<number>;
  RequestInterval?: Value<number>;
  AlarmIdentifier?: AlarmIdentifier;
  FailureThreshold?: Value<number>;
  IPAddress?: Value<string>;
  constructor(properties: HealthCheckConfig) {
    Object.assign(this, properties);
  }
}

export class HealthCheckTag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: HealthCheckTag) {
    Object.assign(this, properties);
  }
}
export interface HealthCheckProperties {
  HealthCheckConfig: HealthCheckConfig;
  HealthCheckTags?: List<HealthCheckTag>;
}
export default class HealthCheck extends ResourceBase<HealthCheckProperties> {
  static AlarmIdentifier = AlarmIdentifier;
  static HealthCheckConfig = HealthCheckConfig;
  static HealthCheckTag = HealthCheckTag;
  constructor(properties: HealthCheckProperties) {
    super('AWS::Route53::HealthCheck', properties);
  }
}
