// This file is auto-generated. Do not edit manually.
// Source: aws-ivs-storageconfiguration.json

/** Resource Type definition for AWS::IVS::StorageConfiguration */
export type AwsIvsStorageconfiguration = {
  /**
   * Storage Configuration ARN is automatically generated on creation and assigned as the unique
   * identifier.
   * @minLength 0
   * @maxLength 128
   * @pattern ^arn:aws[-a-z]*:ivs:[a-z0-9-]+:[0-9]+:storage-configuration/[a-zA-Z0-9-]+$
   */
  Arn?: string;
  /**
   * Storage Configuration Name.
   * @minLength 0
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_]*$
   */
  Name?: string;
  S3: {
    /**
     * Location (S3 bucket name) where recorded videos will be stored. Note that the StorageConfiguration
     * and S3 bucket must be in the same region as the Composition.
     * @minLength 3
     * @maxLength 63
     * @pattern ^[a-z0-9-.]+$
     */
    BucketName: string;
  };
  /**
   * A list of key-value pairs that contain metadata for the asset model.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
