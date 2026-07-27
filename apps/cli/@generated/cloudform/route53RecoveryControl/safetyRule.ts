import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AssertionRule {
  AssertedControls!: List<Value<string>>;
  WaitPeriodMs!: Value<number>;
  constructor(properties: AssertionRule) {
    Object.assign(this, properties);
  }
}

export class GatingRule {
  TargetControls!: List<Value<string>>;
  GatingControls!: List<Value<string>>;
  WaitPeriodMs!: Value<number>;
  constructor(properties: GatingRule) {
    Object.assign(this, properties);
  }
}

export class RuleConfig {
  Type!: Value<string>;
  Inverted!: Value<boolean>;
  Threshold!: Value<number>;
  constructor(properties: RuleConfig) {
    Object.assign(this, properties);
  }
}
export interface SafetyRuleProperties {
  ControlPanelArn: Value<string>;
  AssertionRule?: AssertionRule;
  RuleConfig: RuleConfig;
  GatingRule?: GatingRule;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class SafetyRule extends ResourceBase<SafetyRuleProperties> {
  static AssertionRule = AssertionRule;
  static GatingRule = GatingRule;
  static RuleConfig = RuleConfig;
  constructor(properties: SafetyRuleProperties) {
    super('AWS::Route53RecoveryControl::SafetyRule', properties);
  }
}
