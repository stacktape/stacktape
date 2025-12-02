// This file is auto-generated. Do not edit manually.
// Source: aws-opensearchserverless-lifecyclepolicy.json

/** Amazon OpenSearchServerless lifecycle policy resource */
export type AwsOpensearchserverlessLifecyclepolicy = {
  /**
   * The name of the policy
   * @minLength 3
   * @maxLength 32
   * @pattern ^[a-z][a-z0-9-]+$
   */
  Name: string;
  Type: "retention";
  /**
   * The description of the policy
   * @minLength 0
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
};
