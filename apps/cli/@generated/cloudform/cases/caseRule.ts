import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BooleanCondition {
  NotEqualTo?: BooleanOperands;
  EqualTo?: BooleanOperands;
  constructor(properties: BooleanCondition) {
    Object.assign(this, properties);
  }
}

export class BooleanOperands {
  OperandTwo!: OperandTwo;
  OperandOne!: OperandOne;
  Result!: Value<boolean>;
  constructor(properties: BooleanOperands) {
    Object.assign(this, properties);
  }
}

export class CaseRuleDetails {
  Required?: RequiredCaseRule;
  Hidden?: HiddenCaseRule;
  constructor(properties: CaseRuleDetails) {
    Object.assign(this, properties);
  }
}

export class HiddenCaseRule {
  DefaultValue!: Value<boolean>;
  Conditions!: List<BooleanCondition>;
  constructor(properties: HiddenCaseRule) {
    Object.assign(this, properties);
  }
}

export class OperandOne {
  FieldId!: Value<string>;
  constructor(properties: OperandOne) {
    Object.assign(this, properties);
  }
}

export class OperandTwo {
  DoubleValue?: Value<number>;
  BooleanValue?: Value<boolean>;
  StringValue?: Value<string>;
  EmptyValue?: { [key: string]: any };
  constructor(properties: OperandTwo) {
    Object.assign(this, properties);
  }
}

export class RequiredCaseRule {
  DefaultValue!: Value<boolean>;
  Conditions!: List<BooleanCondition>;
  constructor(properties: RequiredCaseRule) {
    Object.assign(this, properties);
  }
}
export interface CaseRuleProperties {
  Description?: Value<string>;
  DomainId?: Value<string>;
  Rule: CaseRuleDetails;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class CaseRule extends ResourceBase<CaseRuleProperties> {
  static BooleanCondition = BooleanCondition;
  static BooleanOperands = BooleanOperands;
  static CaseRuleDetails = CaseRuleDetails;
  static HiddenCaseRule = HiddenCaseRule;
  static OperandOne = OperandOne;
  static OperandTwo = OperandTwo;
  static RequiredCaseRule = RequiredCaseRule;
  constructor(properties: CaseRuleProperties) {
    super('AWS::Cases::CaseRule', properties);
  }
}
