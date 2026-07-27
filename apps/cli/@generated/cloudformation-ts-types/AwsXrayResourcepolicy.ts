// This file is auto-generated. Do not edit manually.
// Source: aws-xray-resourcepolicy.json

/**
 * This schema provides construct and validation rules for AWS-XRay Resource Policy resource
 * parameters.
 */
export type AwsXrayResourcepolicy = {
  /**
   * The name of the resource policy. Must be unique within a specific AWS account.
   * @minLength 1
   * @maxLength 128
   * @pattern [\w+=,.@-]+
   */
  PolicyName: string;
  /**
   * The resource policy document, which can be up to 5kb in size.
   * @minLength 1
   * @maxLength 5120
   */
  PolicyDocument: string;
  /** A flag to indicate whether to bypass the resource policy lockout safety check */
  BypassPolicyLockoutCheck?: boolean;
};
