import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class OrganizationCustomPolicyRuleMetadata {
  TagKeyScope?: Value<string>;
  TagValueScope?: Value<string>;
  Runtime!: Value<string>;
  PolicyText!: Value<string>;
  Description?: Value<string>;
  ResourceIdScope?: Value<string>;
  OrganizationConfigRuleTriggerTypes?: List<Value<string>>;
  DebugLogDeliveryAccounts?: List<Value<string>>;
  ResourceTypesScope?: List<Value<string>>;
  MaximumExecutionFrequency?: Value<string>;
  InputParameters?: Value<string>;
  constructor(properties: OrganizationCustomPolicyRuleMetadata) {
    Object.assign(this, properties);
  }
}

export class OrganizationCustomRuleMetadata {
  TagKeyScope?: Value<string>;
  TagValueScope?: Value<string>;
  Description?: Value<string>;
  ResourceIdScope?: Value<string>;
  LambdaFunctionArn!: Value<string>;
  OrganizationConfigRuleTriggerTypes!: List<Value<string>>;
  ResourceTypesScope?: List<Value<string>>;
  MaximumExecutionFrequency?: Value<string>;
  InputParameters?: Value<string>;
  constructor(properties: OrganizationCustomRuleMetadata) {
    Object.assign(this, properties);
  }
}

export class OrganizationManagedRuleMetadata {
  TagKeyScope?: Value<string>;
  TagValueScope?: Value<string>;
  Description?: Value<string>;
  ResourceIdScope?: Value<string>;
  RuleIdentifier!: Value<string>;
  ResourceTypesScope?: List<Value<string>>;
  MaximumExecutionFrequency?: Value<string>;
  InputParameters?: Value<string>;
  constructor(properties: OrganizationManagedRuleMetadata) {
    Object.assign(this, properties);
  }
}
export interface OrganizationConfigRuleProperties {
  OrganizationManagedRuleMetadata?: OrganizationManagedRuleMetadata;
  OrganizationConfigRuleName: Value<string>;
  OrganizationCustomRuleMetadata?: OrganizationCustomRuleMetadata;
  ExcludedAccounts?: List<Value<string>>;
  OrganizationCustomPolicyRuleMetadata?: OrganizationCustomPolicyRuleMetadata;
}
export default class OrganizationConfigRule extends ResourceBase<OrganizationConfigRuleProperties> {
  static OrganizationCustomPolicyRuleMetadata = OrganizationCustomPolicyRuleMetadata;
  static OrganizationCustomRuleMetadata = OrganizationCustomRuleMetadata;
  static OrganizationManagedRuleMetadata = OrganizationManagedRuleMetadata;
  constructor(properties: OrganizationConfigRuleProperties) {
    super('AWS::Config::OrganizationConfigRule', properties);
  }
}
