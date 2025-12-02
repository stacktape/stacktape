import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CorsRule {
  AllowedMethods?: List<Value<string>>;
  AllowedOrigins?: List<Value<string>>;
  ExposeHeaders?: List<Value<string>>;
  MaxAgeSeconds?: Value<number>;
  AllowedHeaders?: List<Value<string>>;
  constructor(properties: CorsRule) {
    Object.assign(this, properties);
  }
}

export class MetricPolicy {
  ContainerLevelMetrics!: Value<string>;
  MetricPolicyRules?: List<MetricPolicyRule>;
  constructor(properties: MetricPolicy) {
    Object.assign(this, properties);
  }
}

export class MetricPolicyRule {
  ObjectGroup!: Value<string>;
  ObjectGroupName!: Value<string>;
  constructor(properties: MetricPolicyRule) {
    Object.assign(this, properties);
  }
}
export interface ContainerProperties {
  Policy?: Value<string>;
  MetricPolicy?: MetricPolicy;
  ContainerName: Value<string>;
  CorsPolicy?: List<CorsRule>;
  LifecyclePolicy?: Value<string>;
  AccessLoggingEnabled?: Value<boolean>;
  Tags?: List<ResourceTag>;
}
export default class Container extends ResourceBase<ContainerProperties> {
  static CorsRule = CorsRule;
  static MetricPolicy = MetricPolicy;
  static MetricPolicyRule = MetricPolicyRule;
  constructor(properties: ContainerProperties) {
    super('AWS::MediaStore::Container', properties);
  }
}
