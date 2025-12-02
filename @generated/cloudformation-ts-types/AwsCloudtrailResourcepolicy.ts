// This file is auto-generated. Do not edit manually.
// Source: aws-cloudtrail-resourcepolicy.json

/** Resource Type definition for AWS::CloudTrail::ResourcePolicy */
export type AwsCloudtrailResourcepolicy = {
  /** The ARN of the AWS CloudTrail resource to which the policy applies. */
  ResourceArn: string;
  /**
   * A policy document containing permissions to add to the specified resource. In IAM, you must provide
   * policy documents in JSON format. However, in CloudFormation you can provide the policy in JSON or
   * YAML format because CloudFormation converts YAML to JSON before submitting it to IAM.
   */
  ResourcePolicy: Record<string, unknown> | string;
};
