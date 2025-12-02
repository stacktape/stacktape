// This file is auto-generated. Do not edit manually.
// Source: aws-s3tables-tablebucket.json

/**
 * Creates an Amazon S3 Tables table bucket in the same AWS Region where you create the AWS
 * CloudFormation stack.
 */
export type AwsS3tablesTablebucket = {
  TableBucketARN?: string;
  TableBucketName: string;
  UnreferencedFileRemoval?: {
    /**
     * Indicates whether the Unreferenced File Removal maintenance action is enabled.
     * @enum ["Enabled","Disabled"]
     */
    Status?: "Enabled" | "Disabled";
    /**
     * For any object not referenced by your table and older than the UnreferencedDays property, S3
     * creates a delete marker and marks the object version as noncurrent.
     * @minimum 1
     */
    UnreferencedDays?: number;
    /**
     * S3 permanently deletes noncurrent objects after the number of days specified by the NoncurrentDays
     * property.
     * @minimum 1
     */
    NoncurrentDays?: number;
  };
  EncryptionConfiguration?: {
    /**
     * Server-side encryption algorithm
     * @enum ["AES256","aws:kms"]
     */
    SSEAlgorithm?: "AES256" | "aws:kms";
    /** ARN of the KMS key to use for encryption */
    KMSKeyArn?: string;
  };
  MetricsConfiguration?: {
    /**
     * Indicates whether Metrics are enabled.
     * @default "Disabled"
     * @enum ["Enabled","Disabled"]
     */
    Status?: "Enabled" | "Disabled";
  };
  /**
   * User tags (key-value pairs) to associate with the table bucket.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * Tag key must be between 1 to 128 characters in length. Tag key cannot start with 'aws:' and can
     * only contain alphanumeric characters, spaces, _, ., /, =, +, -, and @.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * Tag value must be between 0 to 256 characters in length. Tag value can only contain alphanumeric
     * characters, spaces, _, ., /, =, +, -, and @.
     * @maxLength 256
     */
    Value: string;
  }[];
};
