// This file is auto-generated. Do not edit manually.
// Source: aws-ssm-resourcepolicy.json

/** Resource Type definition for AWS::SSM::ResourcePolicy */
export type AwsSsmResourcepolicy = {
  /** Arn of OpsItemGroup etc. */
  ResourceArn: string;
  /** Actual policy statement. */
  Policy: Record<string, unknown> | string;
  /** An unique identifier within the policies of a resource. */
  PolicyId?: string;
  /** A snapshot identifier for the policy over time. */
  PolicyHash?: string;
};
