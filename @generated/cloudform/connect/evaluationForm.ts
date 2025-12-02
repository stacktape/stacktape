import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutoEvaluationConfiguration {
  Enabled?: Value<boolean>;
  constructor(properties: AutoEvaluationConfiguration) {
    Object.assign(this, properties);
  }
}

export class AutomaticFailConfiguration {
  TargetSection?: Value<string>;
  constructor(properties: AutomaticFailConfiguration) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormBaseItem {
  Section!: EvaluationFormSection;
  constructor(properties: EvaluationFormBaseItem) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormItem {
  Question?: EvaluationFormQuestion;
  Section?: EvaluationFormSection;
  constructor(properties: EvaluationFormItem) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormItemEnablementCondition {
  Operator?: Value<string>;
  Operands!: List<EvaluationFormItemEnablementConditionOperand>;
  constructor(properties: EvaluationFormItemEnablementCondition) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormItemEnablementConditionOperand {
  Expression?: EvaluationFormItemEnablementExpression;
  constructor(properties: EvaluationFormItemEnablementConditionOperand) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormItemEnablementConfiguration {
  Condition!: EvaluationFormItemEnablementCondition;
  Action!: Value<string>;
  DefaultAction?: Value<string>;
  constructor(properties: EvaluationFormItemEnablementConfiguration) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormItemEnablementExpression {
  Values!: List<EvaluationFormItemEnablementSourceValue>;
  Source!: EvaluationFormItemEnablementSource;
  Comparator!: Value<string>;
  constructor(properties: EvaluationFormItemEnablementExpression) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormItemEnablementSource {
  Type!: Value<string>;
  RefId?: Value<string>;
  constructor(properties: EvaluationFormItemEnablementSource) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormItemEnablementSourceValue {
  Type?: Value<string>;
  RefId?: Value<string>;
  constructor(properties: EvaluationFormItemEnablementSourceValue) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormNumericQuestionAutomation {
  AnswerSource?: EvaluationFormQuestionAutomationAnswerSource;
  PropertyValue?: NumericQuestionPropertyValueAutomation;
  constructor(properties: EvaluationFormNumericQuestionAutomation) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormNumericQuestionOption {
  Score?: Value<number>;
  AutomaticFailConfiguration?: AutomaticFailConfiguration;
  MinValue!: Value<number>;
  MaxValue!: Value<number>;
  AutomaticFail?: Value<boolean>;
  constructor(properties: EvaluationFormNumericQuestionOption) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormNumericQuestionProperties {
  Options?: List<EvaluationFormNumericQuestionOption>;
  Automation?: EvaluationFormNumericQuestionAutomation;
  MinValue!: Value<number>;
  MaxValue!: Value<number>;
  constructor(properties: EvaluationFormNumericQuestionProperties) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormQuestion {
  NotApplicableEnabled?: Value<boolean>;
  Enablement?: EvaluationFormItemEnablementConfiguration;
  Title!: Value<string>;
  QuestionType!: Value<string>;
  Instructions?: Value<string>;
  RefId!: Value<string>;
  QuestionTypeProperties?: EvaluationFormQuestionTypeProperties;
  Weight?: Value<number>;
  constructor(properties: EvaluationFormQuestion) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormQuestionAutomationAnswerSource {
  SourceType!: Value<string>;
  constructor(properties: EvaluationFormQuestionAutomationAnswerSource) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormQuestionTypeProperties {
  Numeric?: EvaluationFormNumericQuestionProperties;
  SingleSelect?: EvaluationFormSingleSelectQuestionProperties;
  Text?: EvaluationFormTextQuestionProperties;
  constructor(properties: EvaluationFormQuestionTypeProperties) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormSection {
  Title!: Value<string>;
  Instructions?: Value<string>;
  Items?: List<EvaluationFormItem>;
  RefId!: Value<string>;
  Weight?: Value<number>;
  constructor(properties: EvaluationFormSection) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormSingleSelectQuestionAutomation {
  Options!: List<EvaluationFormSingleSelectQuestionAutomationOption>;
  AnswerSource?: EvaluationFormQuestionAutomationAnswerSource;
  DefaultOptionRefId?: Value<string>;
  constructor(properties: EvaluationFormSingleSelectQuestionAutomation) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormSingleSelectQuestionAutomationOption {
  RuleCategory!: SingleSelectQuestionRuleCategoryAutomation;
  constructor(properties: EvaluationFormSingleSelectQuestionAutomationOption) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormSingleSelectQuestionOption {
  Score?: Value<number>;
  AutomaticFailConfiguration?: AutomaticFailConfiguration;
  Text!: Value<string>;
  RefId!: Value<string>;
  AutomaticFail?: Value<boolean>;
  constructor(properties: EvaluationFormSingleSelectQuestionOption) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormSingleSelectQuestionProperties {
  DisplayAs?: Value<string>;
  Options!: List<EvaluationFormSingleSelectQuestionOption>;
  Automation?: EvaluationFormSingleSelectQuestionAutomation;
  constructor(properties: EvaluationFormSingleSelectQuestionProperties) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormTextQuestionAutomation {
  AnswerSource?: EvaluationFormQuestionAutomationAnswerSource;
  constructor(properties: EvaluationFormTextQuestionAutomation) {
    Object.assign(this, properties);
  }
}

export class EvaluationFormTextQuestionProperties {
  Automation?: EvaluationFormTextQuestionAutomation;
  constructor(properties: EvaluationFormTextQuestionProperties) {
    Object.assign(this, properties);
  }
}

export class NumericQuestionPropertyValueAutomation {
  Label!: Value<string>;
  constructor(properties: NumericQuestionPropertyValueAutomation) {
    Object.assign(this, properties);
  }
}

export class ScoringStrategy {
  Status!: Value<string>;
  Mode!: Value<string>;
  constructor(properties: ScoringStrategy) {
    Object.assign(this, properties);
  }
}

export class SingleSelectQuestionRuleCategoryAutomation {
  Condition!: Value<string>;
  Category!: Value<string>;
  OptionRefId!: Value<string>;
  constructor(properties: SingleSelectQuestionRuleCategoryAutomation) {
    Object.assign(this, properties);
  }
}
export interface EvaluationFormProperties {
  ScoringStrategy?: ScoringStrategy;
  Status: Value<string>;
  AutoEvaluationConfiguration?: AutoEvaluationConfiguration;
  Description?: Value<string>;
  InstanceArn: Value<string>;
  Title: Value<string>;
  Items: List<EvaluationFormBaseItem>;
  Tags?: List<ResourceTag>;
}
export default class EvaluationForm extends ResourceBase<EvaluationFormProperties> {
  static AutoEvaluationConfiguration = AutoEvaluationConfiguration;
  static AutomaticFailConfiguration = AutomaticFailConfiguration;
  static EvaluationFormBaseItem = EvaluationFormBaseItem;
  static EvaluationFormItem = EvaluationFormItem;
  static EvaluationFormItemEnablementCondition = EvaluationFormItemEnablementCondition;
  static EvaluationFormItemEnablementConditionOperand = EvaluationFormItemEnablementConditionOperand;
  static EvaluationFormItemEnablementConfiguration = EvaluationFormItemEnablementConfiguration;
  static EvaluationFormItemEnablementExpression = EvaluationFormItemEnablementExpression;
  static EvaluationFormItemEnablementSource = EvaluationFormItemEnablementSource;
  static EvaluationFormItemEnablementSourceValue = EvaluationFormItemEnablementSourceValue;
  static EvaluationFormNumericQuestionAutomation = EvaluationFormNumericQuestionAutomation;
  static EvaluationFormNumericQuestionOption = EvaluationFormNumericQuestionOption;
  static EvaluationFormNumericQuestionProperties = EvaluationFormNumericQuestionProperties;
  static EvaluationFormQuestion = EvaluationFormQuestion;
  static EvaluationFormQuestionAutomationAnswerSource = EvaluationFormQuestionAutomationAnswerSource;
  static EvaluationFormQuestionTypeProperties = EvaluationFormQuestionTypeProperties;
  static EvaluationFormSection = EvaluationFormSection;
  static EvaluationFormSingleSelectQuestionAutomation = EvaluationFormSingleSelectQuestionAutomation;
  static EvaluationFormSingleSelectQuestionAutomationOption = EvaluationFormSingleSelectQuestionAutomationOption;
  static EvaluationFormSingleSelectQuestionOption = EvaluationFormSingleSelectQuestionOption;
  static EvaluationFormSingleSelectQuestionProperties = EvaluationFormSingleSelectQuestionProperties;
  static EvaluationFormTextQuestionAutomation = EvaluationFormTextQuestionAutomation;
  static EvaluationFormTextQuestionProperties = EvaluationFormTextQuestionProperties;
  static NumericQuestionPropertyValueAutomation = NumericQuestionPropertyValueAutomation;
  static ScoringStrategy = ScoringStrategy;
  static SingleSelectQuestionRuleCategoryAutomation = SingleSelectQuestionRuleCategoryAutomation;
  constructor(properties: EvaluationFormProperties) {
    super('AWS::Connect::EvaluationForm', properties);
  }
}
