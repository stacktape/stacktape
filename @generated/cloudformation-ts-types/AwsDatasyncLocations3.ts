// This file is auto-generated. Do not edit manually.
// Source: aws-datasync-locations3.json

/** Resource schema for AWS::DataSync::LocationS3 */
export type AwsDatasyncLocations3 = {
  S3Config: {
    /**
     * The ARN of the IAM role of the Amazon S3 bucket.
     * @maxLength 2048
     * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):iam::[0-9]{12}:role/.*$
     */
    BucketAccessRoleArn: string;
  };
  /**
   * The Amazon Resource Name (ARN) of the Amazon S3 bucket.
   * @maxLength 156
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):s3:[a-z\-0-9]*:[0-9]*:.*$
   */
  S3BucketArn?: string;
  /**
   * A subdirectory in the Amazon S3 bucket. This subdirectory in Amazon S3 is used to read data from
   * the S3 source location or write data to the S3 destination.
   * @maxLength 1024
   * @pattern ^[\p{L}\p{M}\p{Z}\p{S}\p{N}\p{P}\p{C}]*$
   */
  Subdirectory?: string;
  /**
   * The Amazon S3 storage class you want to store your files in when this location is used as a task
   * destination.
   * @default "STANDARD"
   * @enum ["STANDARD","STANDARD_IA","ONEZONE_IA","INTELLIGENT_TIERING","GLACIER","GLACIER_INSTANT_RETRIEVAL","DEEP_ARCHIVE"]
   */
  S3StorageClass?: "STANDARD" | "STANDARD_IA" | "ONEZONE_IA" | "INTELLIGENT_TIERING" | "GLACIER" | "GLACIER_INSTANT_RETRIEVAL" | "DEEP_ARCHIVE";
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key for an AWS resource tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s+=._:/-]+$
     */
    Key: string;
    /**
     * The value for an AWS resource tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9\s+=._:@/-]+$
     */
    Value: string;
  }[];
  /**
   * The Amazon Resource Name (ARN) of the Amazon S3 bucket location.
   * @maxLength 128
   * @pattern ^arn:(aws|aws-cn|aws-us-gov|aws-iso|aws-iso-b):datasync:[a-z\-0-9]+:[0-9]{12}:location/loc-[0-9a-z]{17}$
   */
  LocationArn?: string;
  /**
   * The URL of the S3 location that was described.
   * @maxLength 4356
   * @pattern ^(efs|nfs|s3|smb|fsxw)://[a-zA-Z0-9.\-/]+$
   */
  LocationUri?: string;
};
