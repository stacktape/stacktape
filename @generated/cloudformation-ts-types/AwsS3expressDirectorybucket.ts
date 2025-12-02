// This file is auto-generated. Do not edit manually.
// Source: aws-s3express-directorybucket.json

/** Resource Type definition for AWS::S3Express::DirectoryBucket. */
export type AwsS3expressDirectorybucket = {
  /**
   * Specifies a name for the bucket. The bucket name must contain only lowercase letters, numbers, and
   * hyphens (-). A directory bucket name must be unique in the chosen Availability Zone or Local Zone.
   * The bucket name must also follow the format 'bucket_base_name--zone_id--x-s3'. The zone_id can be
   * the ID of an Availability Zone or a Local Zone. If you don't specify a name, AWS CloudFormation
   * generates a unique physical ID and uses that ID for the bucket name.
   * @maxLength 63
   * @pattern ^[a-z0-9][a-z0-9//.//-]*[a-z0-9]$
   */
  BucketName?: string;
  /**
   * Specifies the Zone ID of the Availability Zone or Local Zone where the directory bucket will be
   * created. An example Availability Zone ID value is 'use1-az5'.
   */
  LocationName: string;
  /**
   * Returns the code for the Availability Zone or Local Zone where the directory bucket was created. An
   * example for the code of an Availability Zone is 'us-east-1f'.
   */
  AvailabilityZoneName?: string;
  /**
   * Specifies the number of Availability Zone or Local Zone that's used for redundancy for the bucket.
   * @enum ["SingleAvailabilityZone","SingleLocalZone"]
   */
  DataRedundancy: "SingleAvailabilityZone" | "SingleLocalZone";
  /** Returns the Amazon Resource Name (ARN) of the specified bucket. */
  Arn?: string;
  BucketEncryption?: {
    /**
     * Specifies the default server-side-encryption configuration.
     * @uniqueItems true
     */
    ServerSideEncryptionConfiguration: ({
      /**
       * Specifies whether Amazon S3 should use an S3 Bucket Key with server-side encryption using KMS
       * (SSE-KMS) for new objects in the bucket. Existing objects are not affected. Amazon S3 Express One
       * Zone uses an S3 Bucket Key with SSE-KMS and S3 Bucket Key cannot be disabled. It's only allowed to
       * set the BucketKeyEnabled element to true.
       */
      BucketKeyEnabled?: boolean;
      ServerSideEncryptionByDefault?: {
        /**
         * AWS Key Management Service (KMS) customer managed key ID to use for the default encryption. This
         * parameter is allowed only if SSEAlgorithm is set to aws:kms. You can specify this parameter with
         * the key ID or the Amazon Resource Name (ARN) of the KMS key
         */
        KMSMasterKeyID?: unknown | unknown;
        /** @enum ["aws:kms","AES256"] */
        SSEAlgorithm: "aws:kms" | "AES256";
      };
    })[];
  };
  /** Lifecycle rules that define how Amazon S3 Express manages objects during their lifetime. */
  LifecycleConfiguration?: {
    /**
     * A lifecycle rule for individual objects in an Amazon S3 Express bucket.
     * @uniqueItems true
     */
    Rules: ({
      AbortIncompleteMultipartUpload?: {
        /**
         * Specifies the number of days after which Amazon S3 aborts an incomplete multipart upload.
         * @minimum 0
         */
        DaysAfterInitiation: number;
      };
      ExpirationInDays?: number;
      /** @maxLength 255 */
      Id?: string;
      Prefix?: string;
      /** @enum ["Enabled","Disabled"] */
      Status: "Enabled" | "Disabled";
      /**
       * @maxLength 20
       * @pattern [0-9]+
       */
      ObjectSizeGreaterThan?: string;
      /**
       * @maxLength 20
       * @pattern [0-9]+
       */
      ObjectSizeLessThan?: string;
    })[];
  };
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
