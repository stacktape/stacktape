// This file is auto-generated. Do not edit manually.
// Source: aws-route53recoveryreadiness-readinesscheck.json

/** Aws Route53 Recovery Readiness Check Schema and API specification. */
export type AwsRoute53recoveryreadinessReadinesscheck = {
  /**
   * The name of the resource set to check.
   * @minLength 1
   * @maxLength 64
   * @pattern [a-zA-Z0-9_]+
   */
  ResourceSetName?: string;
  /**
   * Name of the ReadinessCheck to create.
   * @minLength 1
   * @maxLength 64
   * @pattern [a-zA-Z0-9_]+
   */
  ReadinessCheckName?: string;
  /**
   * The Amazon Resource Name (ARN) of the readiness check.
   * @maxLength 256
   */
  ReadinessCheckArn?: string;
  /** A collection of tags associated with a resource. */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
