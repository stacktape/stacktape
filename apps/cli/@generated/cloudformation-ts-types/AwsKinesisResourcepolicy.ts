// This file is auto-generated. Do not edit manually.
// Source: aws-kinesis-resourcepolicy.json

/** Resource Type definition for AWS::Kinesis::ResourcePolicy */
export type AwsKinesisResourcepolicy = {
  /**
   * The ARN of the AWS Kinesis resource to which the policy applies.
   * @minLength 1
   * @maxLength 2048
   * @pattern arn:aws.*:kinesis:.*:\d{12}:stream/\S+
   */
  ResourceArn: unknown | unknown;
  /**
   * A policy document containing permissions to add to the specified resource. In IAM, you must provide
   * policy documents in JSON format. However, in CloudFormation you can provide the policy in JSON or
   * YAML format because CloudFormation converts YAML to JSON before submitting it to IAM.
   */
  ResourcePolicy: Record<string, unknown>;
};
