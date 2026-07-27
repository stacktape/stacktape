import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Criteria {
  EstimatedMonthlySavings?: List<DoubleCriteriaCondition>;
  ResourceArn?: List<StringCriteriaCondition>;
  ResourceTag?: List<ResourceTagsCriteriaCondition>;
  RestartNeeded?: List<StringCriteriaCondition>;
  Region?: List<StringCriteriaCondition>;
  LookBackPeriodInDays?: List<IntegerCriteriaCondition>;
  EbsVolumeType?: List<StringCriteriaCondition>;
  EbsVolumeSizeInGib?: List<IntegerCriteriaCondition>;
  constructor(properties: Criteria) {
    Object.assign(this, properties);
  }
}

export class DoubleCriteriaCondition {
  Comparison?: Value<string>;
  Values?: List<Value<number>>;
  constructor(properties: DoubleCriteriaCondition) {
    Object.assign(this, properties);
  }
}

export class IntegerCriteriaCondition {
  Values?: List<Value<number>>;
  Comparison?: Value<string>;
  constructor(properties: IntegerCriteriaCondition) {
    Object.assign(this, properties);
  }
}

export class OrganizationConfiguration {
  RuleApplyOrder?: Value<string>;
  AccountIds?: List<Value<string>>;
  constructor(properties: OrganizationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ResourceTagsCriteriaCondition {
  Comparison?: Value<string>;
  Values?: List<Value<string>>;
  Key?: Value<string>;
  constructor(properties: ResourceTagsCriteriaCondition) {
    Object.assign(this, properties);
  }
}

export class Schedule {
  ScheduleExpression?: Value<string>;
  ExecutionWindowInMinutes?: Value<number>;
  ScheduleExpressionTimezone?: Value<string>;
  constructor(properties: Schedule) {
    Object.assign(this, properties);
  }
}

export class StringCriteriaCondition {
  Values?: List<Value<string>>;
  Comparison?: Value<string>;
  constructor(properties: StringCriteriaCondition) {
    Object.assign(this, properties);
  }
}
export interface AutomationRuleProperties {
  Status: Value<string>;
  RecommendedActionTypes: List<Value<string>>;
  Description?: Value<string>;
  Priority?: Value<string>;
  Schedule: Schedule;
  RuleType: Value<string>;
  Criteria?: Criteria;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  OrganizationConfiguration?: OrganizationConfiguration;
}
export default class AutomationRule extends ResourceBase<AutomationRuleProperties> {
  static Criteria = Criteria;
  static DoubleCriteriaCondition = DoubleCriteriaCondition;
  static IntegerCriteriaCondition = IntegerCriteriaCondition;
  static OrganizationConfiguration = OrganizationConfiguration;
  static ResourceTagsCriteriaCondition = ResourceTagsCriteriaCondition;
  static Schedule = Schedule;
  static StringCriteriaCondition = StringCriteriaCondition;
  constructor(properties: AutomationRuleProperties) {
    super('AWS::ComputeOptimizer::AutomationRule', properties);
  }
}
