// This file is auto-generated. Do not edit manually.
// Source: aws-logs-resourcepolicy.json

/** The resource schema for AWSLogs ResourcePolicy */
export type AwsLogsResourcepolicy = {
  /**
   * A name for resource policy
   * @minLength 1
   * @maxLength 255
   * @pattern ^([^:*\/]+\/?)*[^:*\/]+$
   */
  PolicyName: string;
  /**
   * The policy document
   * @minLength 1
   * @maxLength 5120
   * @pattern [\u0009\u000A\u000D\u0020-\u00FF]+
   */
  PolicyDocument: string;
};
