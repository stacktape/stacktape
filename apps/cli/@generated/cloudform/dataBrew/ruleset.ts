import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ColumnSelector {
  Regex?: Value<string>;
  Name?: Value<string>;
  constructor(properties: ColumnSelector) {
    Object.assign(this, properties);
  }
}

export class Rule {
  ColumnSelectors?: List<ColumnSelector>;
  Disabled?: Value<boolean>;
  SubstitutionMap?: List<SubstitutionValue>;
  Name!: Value<string>;
  CheckExpression!: Value<string>;
  Threshold?: Threshold;
  constructor(properties: Rule) {
    Object.assign(this, properties);
  }
}

export class SubstitutionValue {
  Value!: Value<string>;
  ValueReference!: Value<string>;
  constructor(properties: SubstitutionValue) {
    Object.assign(this, properties);
  }
}

export class Threshold {
  Type?: Value<string>;
  Value!: Value<number>;
  Unit?: Value<string>;
  constructor(properties: Threshold) {
    Object.assign(this, properties);
  }
}
export interface RulesetProperties {
  Description?: Value<string>;
  TargetArn: Value<string>;
  Rules: List<Rule>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Ruleset extends ResourceBase<RulesetProperties> {
  static ColumnSelector = ColumnSelector;
  static Rule = Rule;
  static SubstitutionValue = SubstitutionValue;
  static Threshold = Threshold;
  constructor(properties: RulesetProperties) {
    super('AWS::DataBrew::Ruleset', properties);
  }
}
