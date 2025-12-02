import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ConfiguredTableAssociationAnalysisRule {
  Policy!: ConfiguredTableAssociationAnalysisRulePolicy;
  Type!: Value<string>;
  constructor(properties: ConfiguredTableAssociationAnalysisRule) {
    Object.assign(this, properties);
  }
}

export class ConfiguredTableAssociationAnalysisRuleAggregation {
  AllowedResultReceivers?: List<Value<string>>;
  AllowedAdditionalAnalyses?: List<Value<string>>;
  constructor(properties: ConfiguredTableAssociationAnalysisRuleAggregation) {
    Object.assign(this, properties);
  }
}

export class ConfiguredTableAssociationAnalysisRuleCustom {
  AllowedResultReceivers?: List<Value<string>>;
  AllowedAdditionalAnalyses?: List<Value<string>>;
  constructor(properties: ConfiguredTableAssociationAnalysisRuleCustom) {
    Object.assign(this, properties);
  }
}

export class ConfiguredTableAssociationAnalysisRuleList {
  AllowedResultReceivers?: List<Value<string>>;
  AllowedAdditionalAnalyses?: List<Value<string>>;
  constructor(properties: ConfiguredTableAssociationAnalysisRuleList) {
    Object.assign(this, properties);
  }
}

export class ConfiguredTableAssociationAnalysisRulePolicy {
  V1!: ConfiguredTableAssociationAnalysisRulePolicyV1;
  constructor(properties: ConfiguredTableAssociationAnalysisRulePolicy) {
    Object.assign(this, properties);
  }
}

export class ConfiguredTableAssociationAnalysisRulePolicyV1 {
  Aggregation?: ConfiguredTableAssociationAnalysisRuleAggregation;
  List?: ConfiguredTableAssociationAnalysisRuleList;
  Custom?: ConfiguredTableAssociationAnalysisRuleCustom;
  constructor(properties: ConfiguredTableAssociationAnalysisRulePolicyV1) {
    Object.assign(this, properties);
  }
}
export interface ConfiguredTableAssociationProperties {
  MembershipIdentifier: Value<string>;
  Description?: Value<string>;
  ConfiguredTableAssociationAnalysisRules?: List<ConfiguredTableAssociationAnalysisRule>;
  ConfiguredTableIdentifier: Value<string>;
  Tags?: List<ResourceTag>;
  RoleArn: Value<string>;
  Name: Value<string>;
}
export default class ConfiguredTableAssociation extends ResourceBase<ConfiguredTableAssociationProperties> {
  static ConfiguredTableAssociationAnalysisRule = ConfiguredTableAssociationAnalysisRule;
  static ConfiguredTableAssociationAnalysisRuleAggregation = ConfiguredTableAssociationAnalysisRuleAggregation;
  static ConfiguredTableAssociationAnalysisRuleCustom = ConfiguredTableAssociationAnalysisRuleCustom;
  static ConfiguredTableAssociationAnalysisRuleList = ConfiguredTableAssociationAnalysisRuleList;
  static ConfiguredTableAssociationAnalysisRulePolicy = ConfiguredTableAssociationAnalysisRulePolicy;
  static ConfiguredTableAssociationAnalysisRulePolicyV1 = ConfiguredTableAssociationAnalysisRulePolicyV1;
  constructor(properties: ConfiguredTableAssociationProperties) {
    super('AWS::CleanRooms::ConfiguredTableAssociation', properties);
  }
}
