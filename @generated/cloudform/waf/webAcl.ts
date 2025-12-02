import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ActivatedRule {
  Action?: WafAction;
  Priority!: Value<number>;
  RuleId!: Value<string>;
  constructor(properties: ActivatedRule) {
    Object.assign(this, properties);
  }
}

export class WafAction {
  Type!: Value<string>;
  constructor(properties: WafAction) {
    Object.assign(this, properties);
  }
}
export interface WebACLProperties {
  DefaultAction: WafAction;
  MetricName: Value<string>;
  Name: Value<string>;
  Rules?: List<ActivatedRule>;
}
export default class WebACL extends ResourceBase<WebACLProperties> {
  static ActivatedRule = ActivatedRule;
  static WafAction = WafAction;
  constructor(properties: WebACLProperties) {
    super('AWS::WAF::WebACL', properties);
  }
}
