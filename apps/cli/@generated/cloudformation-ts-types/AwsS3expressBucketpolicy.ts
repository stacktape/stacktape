// This file is auto-generated. Do not edit manually.
// Source: aws-s3express-bucketpolicy.json

/** Resource Type definition for AWS::S3Express::BucketPolicy. */
export type AwsS3expressBucketpolicy = {
  /** The name of the S3 directory bucket to which the policy applies. */
  Bucket: string;
  /**
   * A policy document containing permissions to add to the specified bucket. In IAM, you must provide
   * policy documents in JSON format. However, in CloudFormation you can provide the policy in JSON or
   * YAML format because CloudFormation converts YAML to JSON before submitting it to IAM.
   */
  PolicyDocument: Record<string, unknown> | string;
};
