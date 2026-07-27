import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Predicate {
  DataId!: Value<string>;
  Negated!: Value<boolean>;
  Type!: Value<string>;
  constructor(properties: Predicate) {
    Object.assign(this, properties);
  }
}
export interface RuleProperties {
  MetricName: Value<string>;
  Name: Value<string>;
  Predicates?: List<Predicate>;
}
export default class Rule extends ResourceBase<RuleProperties> {
  static Predicate = Predicate;
  constructor(properties: RuleProperties) {
    super('AWS::WAF::Rule', properties);
  }
}
