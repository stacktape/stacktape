// This file is auto-generated. Do not edit manually.
// Source: aws-opensearchserverless-securitypolicy.json

/** Amazon OpenSearchServerless security policy resource */
export type AwsOpensearchserverlessSecuritypolicy = {
  /**
   * The description of the policy
   * @minLength 1
   * @maxLength 1000
   */
  Description?: string;
  /**
   * The JSON policy document that is the content for the policy
   * @minLength 1
   * @maxLength 20480
   * @pattern [\u0009\u000A\u000D\u0020-\u007E\u00A1-\u00FF]+
   */
  Policy: string;
  /**
   * The name of the policy
   * @minLength 3
   * @maxLength 32
   * @pattern ^[a-z][a-z0-9-]{2,31}$
   */
  Name: string;
  Type: "encryption" | "network";
};
