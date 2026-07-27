// This file is auto-generated. Do not edit manually.
// Source: aws-s3outposts-bucket.json

/** Resource Type Definition for AWS::S3Outposts::Bucket */
export type AwsS3outpostsBucket = {
  /**
   * The Amazon Resource Name (ARN) of the specified bucket.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[^:]+:s3-outposts:[a-zA-Z0-9\-]+:\d{12}:outpost\/[^:]+\/bucket\/[^:]+$
   */
  Arn?: string;
  /**
   * A name for the bucket.
   * @minLength 3
   * @maxLength 63
   * @pattern (?=^.{3,63}$)(?!^(\d+\.)+\d+$)(^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$)
   */
  BucketName: string;
  /**
   * The id of the customer outpost on which the bucket resides.
   * @pattern ^(op-[a-f0-9]{17}|\d{12}|ec2)$
   */
  OutpostId: string;
  /**
   * An arbitrary set of tags (key-value pairs) for this S3Outposts bucket.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 1024
     * @pattern ^(?!aws:.*)([\p{L}\p{Z}\p{N}_.:=+\/\-@%]*)$
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 1024
     * @pattern ^([\p{L}\p{Z}\p{N}_.:=+\/\-@%]*)$
     */
    Value: string;
  }[];
  /** Rules that define how Amazon S3Outposts manages objects during their lifetime. */
  LifecycleConfiguration?: {
    /**
     * A list of lifecycle rules for individual objects in an Amazon S3Outposts bucket.
     * @uniqueItems true
     */
    Rules: (unknown | unknown | unknown)[];
  };
};
