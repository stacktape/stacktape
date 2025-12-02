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
export interface RuleProperties {
  MetricName: Value<string>;
  Predicates?: List<Predicate>;
  Name: Value<string>;
}
export default class Rule extends ResourceBase<RuleProperties> {
  static Predicate = Predicate;
  constructor(properties: RuleProperties) {
    super('AWS::WAFRegional::Rule', properties);
  }
}
