import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Predicate {
  Type!: Value<string>;
  DataId!: Value<string>;
  Negated!: Value<boolean>;
  constructor(properties: Predicate) {
    Object.assign(this, properties);
  }
}
export interface RateBasedRuleProperties {
  MetricName: Value<string>;
  RateLimit: Value<number>;
  MatchPredicates?: List<Predicate>;
  RateKey: Value<string>;
  Name: Value<string>;
}
export default class RateBasedRule extends ResourceBase<RateBasedRuleProperties> {
  static Predicate = Predicate;
  constructor(properties: RateBasedRuleProperties) {
    super('AWS::WAFRegional::RateBasedRule', properties);
  }
}
