// This file is auto-generated. Do not edit manually.
// Source: aws-s3-accessgrantslocation.json

/**
 * The AWS::S3::AccessGrantsLocation resource is an Amazon S3 resource type hosted in an access grants
 * instance which can be the target of S3 access grants.
 */
export type AwsS3Accessgrantslocation = {
  /** The Amazon Resource Name (ARN) of the specified Access Grants location. */
  AccessGrantsLocationArn?: string;
  /** The unique identifier for the specified Access Grants location. */
  AccessGrantsLocationId?: string;
  /** The Amazon Resource Name (ARN) of the access grant location's associated IAM role. */
  IamRoleArn?: string;
  /** Descriptor for where the location actually points */
  LocationScope?: string;
  /** @uniqueItems true */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
