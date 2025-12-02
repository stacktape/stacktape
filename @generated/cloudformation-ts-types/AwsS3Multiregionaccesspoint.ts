// This file is auto-generated. Do not edit manually.
// Source: aws-s3-multiregionaccesspoint.json

/**
 * AWS::S3::MultiRegionAccessPoint is an Amazon S3 resource type that dynamically routes S3 requests
 * to easily satisfy geographic compliance requirements based on customer-defined routing policies.
 */
export type AwsS3Multiregionaccesspoint = {
  /**
   * The PublicAccessBlock configuration that you want to apply to this Multi Region Access Point. You
   * can enable the configuration options in any combination. For more information about when Amazon S3
   * considers a bucket or object public, see
   * https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html#access-control-block-public-access-policy-status
   * 'The Meaning of Public' in the Amazon Simple Storage Service Developer Guide.
   */
  PublicAccessBlockConfiguration?: {
    /**
     * Specifies whether Amazon S3 should restrict public bucket policies for this bucket. Setting this
     * element to TRUE restricts access to this bucket to only AWS services and authorized users within
     * this account if the bucket has a public policy.
     * Enabling this setting doesn't affect previously stored bucket policies, except that public and
     * cross-account access within any public bucket policy, including non-public delegation to specific
     * accounts, is blocked.
     */
    RestrictPublicBuckets?: boolean;
    /**
     * Specifies whether Amazon S3 should block public bucket policies for buckets in this account.
     * Setting this element to TRUE causes Amazon S3 to reject calls to PUT Bucket policy if the specified
     * bucket policy allows public access. Enabling this setting doesn't affect existing bucket policies.
     */
    BlockPublicPolicy?: boolean;
    /**
     * Specifies whether Amazon S3 should block public access control lists (ACLs) for buckets in this
     * account. Setting this element to TRUE causes the following behavior:
     * - PUT Bucket acl and PUT Object acl calls fail if the specified ACL is public.
     * - PUT Object calls fail if the request includes a public ACL.
     * . - PUT Bucket calls fail if the request includes a public ACL.
     * Enabling this setting doesn't affect existing policies or ACLs.
     */
    BlockPublicAcls?: boolean;
    /**
     * Specifies whether Amazon S3 should ignore public ACLs for buckets in this account. Setting this
     * element to TRUE causes Amazon S3 to ignore all public ACLs on buckets in this account and any
     * objects that they contain. Enabling this setting doesn't affect the persistence of any existing
     * ACLs and doesn't prevent new public ACLs from being set.
     */
    IgnorePublicAcls?: boolean;
  };
  /**
   * The alias is a unique identifier to, and is part of the public DNS name for this Multi Region
   * Access Point
   */
  Alias?: string;
  /** The timestamp of the when the Multi Region Access Point is created */
  CreatedAt?: string;
  /**
   * The list of buckets that you want to associate this Multi Region Access Point with.
   * @minItems 1
   * @uniqueItems true
   */
  Regions: {
    /**
     * @minLength 3
     * @maxLength 63
     * @pattern ^[a-z0-9][a-z0-9//.//-]*[a-z0-9]$
     */
    Bucket: string;
    /**
     * @minLength 12
     * @maxLength 12
     * @pattern ^[0-9]{12}$
     */
    BucketAccountId?: string;
  }[];
  /**
   * The name you want to assign to this Multi Region Access Point.
   * @minLength 3
   * @maxLength 50
   * @pattern ^[a-z0-9][-a-z0-9]{1,48}[a-z0-9]$
   */
  Name?: string;
};
