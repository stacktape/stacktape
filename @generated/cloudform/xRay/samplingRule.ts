import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SamplingRuleInner {
  Priority!: Value<number>;
  ReservoirSize!: Value<number>;
  RuleARN?: Value<string>;
  URLPath!: Value<string>;
  Attributes?: { [key: string]: Value<string> };
  FixedRate!: Value<number>;
  Host!: Value<string>;
  ResourceARN!: Value<string>;
  HTTPMethod!: Value<string>;
  ServiceName!: Value<string>;
  Version?: Value<number>;
  ServiceType!: Value<string>;
  RuleName?: Value<string>;
  constructor(properties: SamplingRuleInner) {
    Object.assign(this, properties);
  }
}
export interface SamplingRuleProperties {
  SamplingRule?: SamplingRule;
  Tags?: List<ResourceTag>;
}
export default class SamplingRule extends ResourceBase<SamplingRuleProperties> {
  static SamplingRule = SamplingRuleInner;
  constructor(properties?: SamplingRuleProperties) {
    super('AWS::XRay::SamplingRule', properties || {});
  }
}
