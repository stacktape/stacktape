// This file is auto-generated. Do not edit manually.
// Source: aws-s3express-accesspoint.json

/**
 * The AWS::S3Express::AccessPoint resource is an Amazon S3 resource type that you can use to access
 * buckets.
 */
export type AwsS3expressAccesspoint = {
  /**
   * The name you want to assign to this Access Point. If you don't specify a name, AWS CloudFormation
   * generates a unique ID and uses that ID for the access point name. For directory buckets, the access
   * point name must consist of a base name that you provide and suﬃx that includes the ZoneID (AWS
   * Availability Zone or Local Zone) of your bucket location, followed by --xa-s3.
   * @minLength 3
   * @maxLength 50
   * @pattern ^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$
   */
  Name?: string;
  /**
   * The name of the bucket that you want to associate this Access Point with.
   * @minLength 3
   * @maxLength 255
   */
  Bucket: string;
  /**
   * The AWS account ID associated with the S3 bucket associated with this access point.
   * @maxLength 64
   * @pattern ^\d{12}$
   */
  BucketAccountId?: string;
  /**
   * If you include this field, Amazon S3 restricts access to this Access Point to requests from the
   * specified Virtual Private Cloud (VPC).
   */
  VpcConfiguration?: {
    /**
     * If this field is specified, this access point will only allow connections from the specified VPC
     * ID.
     * @minLength 1
     * @maxLength 1024
     */
    VpcId?: string;
  };
  /** The PublicAccessBlock configuration that you want to apply to this Access Point. */
  PublicAccessBlockConfiguration?: {
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
  /**
   * For directory buckets, you can ﬁlter access control to speciﬁc preﬁxes, API operations, or a
   * combination of both.
   */
  Scope?: {
    /**
     * You can specify any amount of preﬁxes, but the total length of characters of all preﬁxes must be
     * less than 256 bytes in size.
     * @uniqueItems false
     */
    Prefixes?: string[];
    /**
     * You can include one or more API operations as permissions
     * @uniqueItems false
     */
    Permissions?: ("GetObject" | "GetObjectAttributes" | "ListMultipartUploadParts" | "ListBucket" | "ListBucketMultipartUploads" | "PutObject" | "DeleteObject" | "AbortMultipartUpload")[];
  };
  /** The Access Point Policy you want to apply to this access point. */
  Policy?: Record<string, unknown>;
  /**
   * Indicates whether this Access Point allows access from the public Internet. If VpcConfiguration is
   * specified for this Access Point, then NetworkOrigin is VPC, and the Access Point doesn't allow
   * access from the public Internet. Otherwise, NetworkOrigin is Internet, and the Access Point allows
   * access from the public Internet, subject to the Access Point and bucket access policies.
   * @enum ["Internet","VPC"]
   */
  NetworkOrigin?: "Internet" | "VPC";
  /** The Amazon Resource Name (ARN) of the specified accesspoint. */
  Arn?: string;
  /** @uniqueItems true */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:.*)([\p{L}\p{Z}\p{N}_.:=+\/\-@%]*)$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:=+\/\-@%]*)$
     */
    Value: string;
  }[];
};
