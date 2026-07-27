// This file is auto-generated. Do not edit manually.
// Source: aws-s3objectlambda-accesspoint.json

/**
 * The AWS::S3ObjectLambda::AccessPoint resource is an Amazon S3ObjectLambda resource type that you
 * can use to add computation to S3 actions
 */
export type AwsS3objectlambdaAccesspoint = {
  /**
   * The name you want to assign to this Object lambda Access Point.
   * @minLength 3
   * @maxLength 45
   * @pattern ^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$
   */
  Name?: string;
  Alias?: {
    /**
     * The status of the Object Lambda alias.
     * @pattern ^[A-Z]*$
     */
    Status?: string;
    /**
     * The value of the Object Lambda alias.
     * @pattern ^[a-z0-9\-]*$
     */
    Value: string;
  };
  /** @pattern arn:[^:]+:s3-object-lambda:[^:]*:\d{12}:accesspoint/.* */
  Arn?: string;
  /** The date and time when the Object lambda Access Point was created. */
  CreationDate?: string;
  /**
   * The PublicAccessBlock configuration that you want to apply to this Access Point. You can enable the
   * configuration options in any combination. For more information about when Amazon S3 considers a
   * bucket or object public, see
   * https://docs.aws.amazon.com/AmazonS3/latest/dev/access-control-block-public-access.html#access-control-block-public-access-policy-status
   * 'The Meaning of Public' in the Amazon Simple Storage Service Developer Guide.
   */
  PublicAccessBlockConfiguration?: {
    /**
     * Specifies whether Amazon S3 should block public access control lists (ACLs) to this object lambda
     * access point. Setting this element to TRUE causes the following behavior:
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
    /**
     * Specifies whether Amazon S3 should block public bucket policies for buckets in this account.
     * Setting this element to TRUE causes Amazon S3 to reject calls to PUT Bucket policy if the specified
     * bucket policy allows public access. Enabling this setting doesn't affect existing bucket policies.
     */
    BlockPublicPolicy?: boolean;
    /**
     * Specifies whether Amazon S3 should restrict public bucket policies for this bucket. Setting this
     * element to TRUE restricts access to this bucket to only AWS services and authorized users within
     * this account if the bucket has a public policy.
     * Enabling this setting doesn't affect previously stored bucket policies, except that public and
     * cross-account access within any public bucket policy, including non-public delegation to specific
     * accounts, is blocked.
     */
    RestrictPublicBuckets?: boolean;
  };
  PolicyStatus?: {
    /**
     * Specifies whether the Object lambda Access Point Policy is Public or not. Object lambda Access
     * Points are private by default.
     */
    IsPublic?: boolean;
  };
  /**
   * The Object lambda Access Point Configuration that configures transformations to be applied on the
   * objects on specified S3 Actions
   */
  ObjectLambdaConfiguration: {
    /**
     * @minLength 1
     * @maxLength 2048
     */
    SupportingAccessPoint: string;
    /** @uniqueItems true */
    AllowedFeatures?: string[];
    CloudWatchMetricsEnabled?: boolean;
    /** @uniqueItems true */
    TransformationConfigurations: {
      /** @uniqueItems true */
      Actions: string[];
      ContentTransformation: unknown;
    }[];
  };
};
