// This file is auto-generated. Do not edit manually.
// Source: aws-config-organizationconfigrule.json

/** Resource Type definition for AWS::Config::OrganizationConfigRule */
export type AwsConfigOrganizationconfigrule = {
  OrganizationCustomRuleMetadata?: {
    TagKeyScope?: string;
    TagValueScope?: string;
    Description?: string;
    ResourceIdScope?: string;
    LambdaFunctionArn: string;
    /** @uniqueItems false */
    OrganizationConfigRuleTriggerTypes: string[];
    /** @uniqueItems false */
    ResourceTypesScope?: string[];
    MaximumExecutionFrequency?: string;
    InputParameters?: string;
  };
  OrganizationManagedRuleMetadata?: {
    TagKeyScope?: string;
    TagValueScope?: string;
    Description?: string;
    ResourceIdScope?: string;
    RuleIdentifier: string;
    /** @uniqueItems false */
    ResourceTypesScope?: string[];
    MaximumExecutionFrequency?: string;
    InputParameters?: string;
  };
  /** @uniqueItems false */
  ExcludedAccounts?: string[];
  OrganizationConfigRuleName: string;
  Id?: string;
  OrganizationCustomPolicyRuleMetadata?: {
    TagKeyScope?: string;
    TagValueScope?: string;
    Runtime: string;
    PolicyText: string;
    Description?: string;
    ResourceIdScope?: string;
    /** @uniqueItems false */
    OrganizationConfigRuleTriggerTypes?: string[];
    /** @uniqueItems false */
    DebugLogDeliveryAccounts?: string[];
    /** @uniqueItems false */
    ResourceTypesScope?: string[];
    MaximumExecutionFrequency?: string;
    InputParameters?: string;
  };
};
