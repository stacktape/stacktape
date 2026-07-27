// This file is auto-generated. Do not edit manually.
// Source: aws-verifiedpermissions-policytemplate.json

/** Definition of AWS::VerifiedPermissions::PolicyTemplate Resource Type */
export type AwsVerifiedpermissionsPolicytemplate = {
  /**
   * @minLength 0
   * @maxLength 150
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 200
   * @pattern ^[a-zA-Z0-9-]*$
   */
  PolicyStoreId: string;
  /**
   * @minLength 1
   * @maxLength 200
   * @pattern ^[a-zA-Z0-9-]*$
   */
  PolicyTemplateId?: string;
  /**
   * @minLength 1
   * @maxLength 10000
   */
  Statement: string;
};
