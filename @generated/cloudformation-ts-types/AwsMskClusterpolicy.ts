// This file is auto-generated. Do not edit manually.
// Source: aws-msk-clusterpolicy.json

/** Resource Type definition for AWS::MSK::ClusterPolicy */
export type AwsMskClusterpolicy = {
  /** A policy document containing permissions to add to the specified cluster. */
  Policy: Record<string, unknown>;
  /**
   * The arn of the cluster for the resource policy.
   * @pattern ^arn:[\w-]+:kafka:[\w-]+:\d+:cluster.*\Z
   */
  ClusterArn: string;
  /**
   * The current version of the policy attached to the specified cluster
   * @pattern ^(K)([a-zA-Z0-9]+)\Z
   */
  CurrentVersion?: string;
};
