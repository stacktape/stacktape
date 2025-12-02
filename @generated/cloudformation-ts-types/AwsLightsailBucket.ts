// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-bucket.json

/** Resource Type definition for AWS::Lightsail::Bucket */
export type AwsLightsailBucket = {
  /**
   * The name for the bucket.
   * @minLength 3
   * @maxLength 54
   * @pattern ^[a-z0-9][a-z0-9-]{1,52}[a-z0-9]$
   */
  BucketName: string;
  /** The ID of the bundle to use for the bucket. */
  BundleId: string;
  BucketArn?: string;
  /** Specifies whether to enable or disable versioning of objects in the bucket. */
  ObjectVersioning?: boolean;
  AccessRules?: {
    /** Specifies the anonymous access to all objects in a bucket. */
    GetObject?: string;
    /**
     * A Boolean value that indicates whether the access control list (ACL) permissions that are applied
     * to individual objects override the getObject option that is currently specified.
     */
    AllowPublicOverrides?: boolean;
  };
  /**
   * The names of the Lightsail resources for which to set bucket access.
   * @uniqueItems true
   */
  ResourcesReceivingAccess?: string[];
  /**
   * An array of strings to specify the AWS account IDs that can access the bucket.
   * @uniqueItems true
   */
  ReadOnlyAccessAccounts?: string[];
  /**
   * An array of key-value pairs to apply to this resource.
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
    Value?: string;
  }[];
  /** The URL of the bucket. */
  Url?: string;
  /**
   * Indicates whether the bundle that is currently applied to a bucket can be changed to another
   * bundle. You can update a bucket's bundle only one time within a monthly AWS billing cycle.
   */
  AbleToUpdateBundle?: boolean;
};
