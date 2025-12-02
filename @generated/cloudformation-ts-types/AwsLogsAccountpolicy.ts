// This file is auto-generated. Do not edit manually.
// Source: aws-logs-accountpolicy.json

/** The AWS::Logs::AccountPolicy resource specifies a CloudWatch Logs AccountPolicy. */
export type AwsLogsAccountpolicy = {
  /**
   * User account id
   * @pattern ^\d{12}$
   */
  AccountId?: string;
  /**
   * The name of the account policy
   * @minLength 1
   * @maxLength 256
   * @pattern ^[^:*]{1,256}$
   */
  PolicyName: string;
  /**
   * The body of the policy document you want to use for this topic.
   * You can only add one policy per PolicyType.
   * The policy must be in JSON string format.
   * Length Constraints: Maximum length of 30720
   * @minLength 1
   * @maxLength 30720
   */
  PolicyDocument: string;
  /**
   * Type of the policy.
   * @enum ["DATA_PROTECTION_POLICY","SUBSCRIPTION_FILTER_POLICY","FIELD_INDEX_POLICY","TRANSFORMER_POLICY","METRIC_EXTRACTION_POLICY"]
   */
  PolicyType: "DATA_PROTECTION_POLICY" | "SUBSCRIPTION_FILTER_POLICY" | "FIELD_INDEX_POLICY" | "TRANSFORMER_POLICY" | "METRIC_EXTRACTION_POLICY";
  /**
   * Scope for policy application
   * @enum ["ALL"]
   */
  Scope?: "ALL";
  /**
   * Log group  selection criteria to apply policy only to a subset of log groups. SelectionCriteria
   * string can be up to 25KB and cloudwatchlogs determines the length of selectionCriteria by using its
   * UTF-8 bytes
   */
  SelectionCriteria?: string;
};
