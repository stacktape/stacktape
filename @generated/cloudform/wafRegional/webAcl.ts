import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Action {
  Type!: Value<string>;
  constructor(properties: Action) {
    Object.assign(this, properties);
  }
}

export class Rule {
  Action!: Action;
  Priority!: Value<number>;
  RuleId!: Value<string>;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}
export interface WebACLProperties {
  MetricName: Value<string>;
  DefaultAction: Action;
  Rules?: List<Rule>;
  Name: Value<string>;
}
export default class WebACL extends ResourceBase<WebACLProperties> {
  static Action = Action;
  static Rule = Rule;
  constructor(properties: WebACLProperties) {
    super('AWS::WAFRegional::WebACL', properties);
  }
}
