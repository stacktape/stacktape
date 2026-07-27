// This file is auto-generated. Do not edit manually.
// Source: aws-s3objectlambda-accesspointpolicy.json

/**
 * AWS::S3ObjectLambda::AccessPointPolicy resource is an Amazon S3ObjectLambda policy type that you
 * can use to control permissions for your S3ObjectLambda
 */
export type AwsS3objectlambdaAccesspointpolicy = {
  /**
   * The name of the Amazon S3 ObjectLambdaAccessPoint to which the policy applies.
   * @minLength 3
   * @maxLength 45
   * @pattern ^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$
   */
  ObjectLambdaAccessPoint: string;
  /**
   * A policy document containing permissions to add to the specified ObjectLambdaAccessPoint. For more
   * information, see Access Policy Language Overview
   * (https://docs.aws.amazon.com/AmazonS3/latest/dev/access-policy-language-overview.html) in the
   * Amazon Simple Storage Service Developer Guide.
   */
  PolicyDocument: Record<string, unknown>;
};
