// This file is auto-generated. Do not edit manually.
// Source: aws-verifiedpermissions-policystore.json

/**
 * Represents a policy store that you can place schema, policies, and policy templates in to validate
 * authorization requests
 */
export type AwsVerifiedpermissionsPolicystore = {
  /**
   * @minLength 1
   * @maxLength 2500
   * @pattern ^arn:[^:]*:[^:]*:[^:]*:[^:]*:.*$
   */
  Arn?: string;
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
  PolicyStoreId?: string;
  ValidationSettings: {
    Mode: "OFF" | "STRICT";
  };
  Schema?: {
    CedarJson: string;
  } | {
    CedarFormat: string;
  };
  DeletionProtection?: {
    Mode: "ENABLED" | "DISABLED";
  };
  /**
   * The tags to add to the policy store
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
