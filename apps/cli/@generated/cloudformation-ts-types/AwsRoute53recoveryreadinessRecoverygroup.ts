// This file is auto-generated. Do not edit manually.
// Source: aws-route53recoveryreadiness-recoverygroup.json

/** AWS Route53 Recovery Readiness Recovery Group Schema and API specifications. */
export type AwsRoute53recoveryreadinessRecoverygroup = {
  /**
   * The name of the recovery group to create.
   * @minLength 1
   * @maxLength 64
   * @pattern [a-zA-Z0-9_]+
   */
  RecoveryGroupName?: string;
  /**
   * A list of the cell Amazon Resource Names (ARNs) in the recovery group.
   * @maxItems 5
   */
  Cells?: string[];
  /**
   * A collection of tags associated with a resource.
   * @maxLength 256
   */
  RecoveryGroupArn?: string;
  /** A collection of tags associated with a resource. */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
