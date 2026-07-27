// This file is auto-generated. Do not edit manually.
// Source: aws-s3-accessgrantsinstance.json

/**
 * The AWS::S3::AccessGrantsInstance resource is an Amazon S3 resource type that hosts Access Grants
 * and their associated locations
 */
export type AwsS3Accessgrantsinstance = {
  /** The Amazon Resource Name (ARN) of the specified Access Grants instance. */
  AccessGrantsInstanceArn?: string;
  /** The Amazon Resource Name (ARN) of the specified AWS Identity Center. */
  IdentityCenterArn?: string;
  /** A unique identifier for the specified access grants instance. */
  AccessGrantsInstanceId?: string;
  /** @uniqueItems true */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
