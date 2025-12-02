// This file is auto-generated. Do not edit manually.
// Source: aws-secretsmanager-resourcepolicy.json

/** Resource Type definition for AWS::SecretsManager::ResourcePolicy */
export type AwsSecretsmanagerResourcepolicy = {
  /** The Arn of the secret. */
  Id?: string;
  /**
   * The ARN or name of the secret to attach the resource-based policy.
   * @minLength 1
   * @maxLength 2048
   */
  SecretId: string;
  /** A JSON-formatted string for an AWS resource-based policy. */
  ResourcePolicy: string | Record<string, unknown>;
  /** Specifies whether to block resource-based policies that allow broad access to the secret. */
  BlockPublicPolicy?: boolean;
};
