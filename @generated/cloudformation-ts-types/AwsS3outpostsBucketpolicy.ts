// This file is auto-generated. Do not edit manually.
// Source: aws-s3outposts-bucketpolicy.json

/** Resource Type Definition for AWS::S3Outposts::BucketPolicy */
export type AwsS3outpostsBucketpolicy = {
  /**
   * The Amazon Resource Name (ARN) of the specified bucket.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[^:]+:s3-outposts:[a-zA-Z0-9\-]+:\d{12}:outpost\/[^:]+\/bucket\/[^:]+$
   */
  Bucket: string;
  /** A policy document containing permissions to add to the specified bucket. */
  PolicyDocument: Record<string, unknown>;
};
