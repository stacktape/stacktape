/* eslint-disable */
// Generated file - Do not edit manually
// CloudFormation resource types
// Import: import type { CloudFormationResource } from 'stacktape/cloudformation'

// ==========================================
// CLOUDFORMATION PROPERTIES INTERFACES
// ==========================================

/**
 * The ``AWS::S3::Bucket`` resource creates an Amazon S3 bucket in the same AWS Region where you
 * create the AWS CloudFormation stack.
 * To control how AWS CloudFormation handles the bucket when the stack is deleted, you can set a
 * deletion policy for your bucket. You can choose to *retain* the bucket or to *delete* the bucket.
 * For more information, see [DeletionPolicy
 * Attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-deletionpolicy.html).
 * You can only delete empty buckets. Deletion fails for buckets that have contents.
 */
export type AwsS3Bucket = {
  /**
   * Configures the transfer acceleration state for an Amazon S3 bucket. For more information, see
   * [Amazon S3 Transfer
   * Acceleration](https://docs.aws.amazon.com/AmazonS3/latest/dev/transfer-acceleration.html) in the
   * *Amazon S3 User Guide*.
   */
  AccelerateConfiguration?: {
    /**
     * Specifies the transfer acceleration status of the bucket.
     * @enum ["Enabled","Suspended"]
     */
    AccelerationStatus: "Enabled" | "Suspended";
  };
  /**
   * This is a legacy property, and it is not recommended for most use cases. A majority of modern use
   * cases in Amazon S3 no longer require the use of ACLs, and we recommend that you keep ACLs disabled.
   * For more information, see [Controlling object
   * ownership](https://docs.aws.amazon.com//AmazonS3/latest/userguide/about-object-ownership.html) in
   * the *Amazon S3 User Guide*.
   * A canned access control list (ACL) that grants predefined permissions to the bucket. For more
   * information about canned ACLs, see [Canned
   * ACL](https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html#canned-acl) in the *Amazon
   * S3 User Guide*.
   * S3 buckets are created with ACLs disabled by default. Therefore, unless you explicitly set the
   * [AWS::S3::OwnershipControls](https://docs.aws.amazon.com//AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-ownershipcontrols.html)
   * property to enable ACLs, your resource will fail to deploy with any value other than Private. Use
   * cases requiring ACLs are uncommon.
   * The majority of access control configurations can be successfully and more easily achieved with
   * bucket policies. For more information, see
   * [AWS::S3::BucketPolicy](https://docs.aws.amazon.com//AWSCloudFormation/latest/UserGuide/aws-properties-s3-policy.html).
   * For examples of common policy configurations, including S3 Server Access Logs buckets and more, see
   * [Bucket policy
   * examples](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html) in
   * the *Amazon S3 User Guide*.
   * @enum ["AuthenticatedRead","AwsExecRead","BucketOwnerFullControl","BucketOwnerRead","LogDeliveryWrite","Private","PublicRead","PublicReadWrite"]
   */
  AccessControl?: "AuthenticatedRead" | "AwsExecRead" | "BucketOwnerFullControl" | "BucketOwnerRead" | "LogDeliveryWrite" | "Private" | "PublicRead" | "PublicReadWrite";
  /**
   * Specifies the configuration and any analyses for the analytics filter of an Amazon S3 bucket.
   * @uniqueItems true
   */
  AnalyticsConfigurations?: ({
    /**
     * The tags to use when evaluating an analytics filter.
     * The analytics only includes objects that meet the filter's criteria. If no filter is specified,
     * all of the contents of the bucket are included in the analysis.
     * @uniqueItems true
     */
    TagFilters?: {
      /** The tag value. */
      Value: string;
      /** The tag key. */
      Key: string;
    }[];
    /**
     * Contains data related to access patterns to be collected and made available to analyze the
     * tradeoffs between different storage classes.
     */
    StorageClassAnalysis: {
      /**
       * Specifies how data related to the storage class analysis for an Amazon S3 bucket should be
       * exported.
       */
      DataExport?: {
        /** The place to store the data for an analysis. */
        Destination: {
          /** The Amazon Resource Name (ARN) of the bucket to which data is exported. */
          BucketArn: string;
          /**
           * The account ID that owns the destination S3 bucket. If no account ID is provided, the owner is not
           * validated before exporting data.
           * Although this value is optional, we strongly recommend that you set it to help prevent problems
           * if the destination bucket ownership changes.
           */
          BucketAccountId?: string;
          /**
           * Specifies the file format used when exporting data to Amazon S3.
           * *Allowed values*: ``CSV`` | ``ORC`` | ``Parquet``
           * @enum ["CSV","ORC","Parquet"]
           */
          Format: "CSV" | "ORC" | "Parquet";
          /** The prefix to use when exporting data. The prefix is prepended to all results. */
          Prefix?: string;
        };
        /** The version of the output schema to use when exporting data. Must be ``V_1``. */
        OutputSchemaVersion: string;
      };
    };
    /** The ID that identifies the analytics configuration. */
    Id: string;
    /** The prefix that an object must have to be included in the analytics results. */
    Prefix?: string;
  })[];
  /**
   * Specifies default encryption for a bucket using server-side encryption with Amazon S3-managed keys
   * (SSE-S3), AWS KMS-managed keys (SSE-KMS), or dual-layer server-side encryption with KMS-managed
   * keys (DSSE-KMS). For information about the Amazon S3 default encryption feature, see [Amazon S3
   * Default Encryption for S3
   * Buckets](https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-encryption.html) in the *Amazon S3
   * User Guide*.
   */
  BucketEncryption?: {
    /**
     * Specifies the default server-side-encryption configuration.
     * @uniqueItems true
     */
    ServerSideEncryptionConfiguration: ({
      /**
       * Specifies whether Amazon S3 should use an S3 Bucket Key with server-side encryption using KMS
       * (SSE-KMS) for new objects in the bucket. Existing objects are not affected. Setting the
       * ``BucketKeyEnabled`` element to ``true`` causes Amazon S3 to use an S3 Bucket Key. By default, S3
       * Bucket Key is not enabled.
       * For more information, see [Amazon S3 Bucket
       * Keys](https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-key.html) in the *Amazon S3 User
       * Guide*.
       */
      BucketKeyEnabled?: boolean;
      /**
       * Specifies the default server-side encryption to apply to new objects in the bucket. If a PUT Object
       * request doesn't specify any server-side encryption, this default encryption will be applied.
       */
      ServerSideEncryptionByDefault?: {
        /**
         * AWS Key Management Service (KMS) customer managed key ID to use for the default encryption.
         * +  *General purpose buckets* - This parameter is allowed if and only if ``SSEAlgorithm`` is set
         * to ``aws:kms`` or ``aws:kms:dsse``.
         * +  *Directory buckets* - This parameter is allowed if and only if ``SSEAlgorithm`` is set to
         * ``aws:kms``.
         * You can specify the key ID, key alias, or the Amazon Resource Name (ARN) of the KMS key.
         * +  Key ID: ``1234abcd-12ab-34cd-56ef-1234567890ab``
         * +  Key ARN: ``arn:aws:kms:us-east-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab``
         * +  Key Alias: ``alias/alias-name``
         * If you are using encryption with cross-account or AWS service operations, you must use a fully
         * qualified KMS key ARN. For more information, see [Using encryption for cross-account
         * operations](https://docs.aws.amazon.com/AmazonS3/latest/dev/bucket-encryption.html#bucket-encryption-update-bucket-policy).
         * +  *General purpose buckets* - If you're specifying a customer managed KMS key, we recommend
         * using a fully qualified KMS key ARN. If you use a KMS key alias instead, then KMS resolves the key
         * within the requester’s account. This behavior can result in data that's encrypted with a KMS key
         * that belongs to the requester, and not the bucket owner. Also, if you use a key ID, you can run
         * into a LogDestination undeliverable error when creating a VPC flow log.
         * +  *Directory buckets* - When you specify an [customer managed
         * key](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#customer-cmk) for
         * encryption in your directory bucket, only use the key ID or key ARN. The key alias format of the
         * KMS key isn't supported.
         * Amazon S3 only supports symmetric encryption KMS keys. For more information, see [Asymmetric
         * keys in KMS](https://docs.aws.amazon.com//kms/latest/developerguide/symmetric-asymmetric.html) in
         * the *Key Management Service Developer Guide*.
         */
        KMSMasterKeyID?: string;
        /**
         * Server-side encryption algorithm to use for the default encryption.
         * For directory buckets, there are only two supported values for server-side encryption: ``AES256``
         * and ``aws:kms``.
         * @enum ["aws:kms","AES256","aws:kms:dsse"]
         */
        SSEAlgorithm: "aws:kms" | "AES256" | "aws:kms:dsse";
      };
      BlockedEncryptionTypes?: {
        EncryptionType?: ("NONE" | "SSE-C")[];
      };
    })[];
  };
  /**
   * A name for the bucket. If you don't specify a name, AWS CloudFormation generates a unique ID and
   * uses that ID for the bucket name. The bucket name must contain only lowercase letters, numbers,
   * periods (.), and dashes (-) and must follow [Amazon S3 bucket restrictions and
   * limitations](https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html). For more
   * information, see [Rules for naming Amazon S3
   * buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html) in the
   * *Amazon S3 User Guide*.
   * If you specify a name, you can't perform updates that require replacement of this resource. You
   * can perform updates that require no or some interruption. If you need to replace the resource,
   * specify a new name.
   */
  BucketName?: string;
  /**
   * Describes the cross-origin access configuration for objects in an Amazon S3 bucket. For more
   * information, see [Enabling Cross-Origin Resource
   * Sharing](https://docs.aws.amazon.com/AmazonS3/latest/dev/cors.html) in the *Amazon S3 User Guide*.
   */
  CorsConfiguration?: {
    /**
     * A set of origins and methods (cross-origin access that you want to allow). You can add up to 100
     * rules to the configuration.
     * @uniqueItems true
     */
    CorsRules: ({
      /**
       * Headers that are specified in the ``Access-Control-Request-Headers`` header. These headers are
       * allowed in a preflight OPTIONS request. In response to any preflight OPTIONS request, Amazon S3
       * returns any requested headers that are allowed.
       * @uniqueItems true
       */
      AllowedHeaders?: string[];
      /**
       * An HTTP method that you allow the origin to run.
       * *Allowed values*: ``GET`` | ``PUT`` | ``HEAD`` | ``POST`` | ``DELETE``
       * @uniqueItems true
       */
      AllowedMethods: ("GET" | "PUT" | "HEAD" | "POST" | "DELETE")[];
      /**
       * One or more origins you want customers to be able to access the bucket from.
       * @uniqueItems true
       */
      AllowedOrigins: string[];
      /**
       * One or more headers in the response that you want customers to be able to access from their
       * applications (for example, from a JavaScript ``XMLHttpRequest`` object).
       * @uniqueItems true
       */
      ExposedHeaders?: string[];
      /**
       * A unique identifier for this rule. The value must be no more than 255 characters.
       * @maxLength 255
       */
      Id?: string;
      /**
       * The time in seconds that your browser is to cache the preflight response for the specified
       * resource.
       * @minimum 0
       */
      MaxAge?: number;
    })[];
  };
  /**
   * Defines how Amazon S3 handles Intelligent-Tiering storage.
   * @uniqueItems true
   */
  IntelligentTieringConfigurations?: ({
    /** The ID used to identify the S3 Intelligent-Tiering configuration. */
    Id: string;
    /** An object key name prefix that identifies the subset of objects to which the rule applies. */
    Prefix?: string;
    /**
     * Specifies the status of the configuration.
     * @enum ["Disabled","Enabled"]
     */
    Status: "Disabled" | "Enabled";
    /**
     * A container for a key-value pair.
     * @uniqueItems true
     */
    TagFilters?: {
      /** The tag value. */
      Value: string;
      /** The tag key. */
      Key: string;
    }[];
    /**
     * Specifies a list of S3 Intelligent-Tiering storage class tiers in the configuration. At least one
     * tier must be defined in the list. At most, you can specify two tiers in the list, one for each
     * available AccessTier: ``ARCHIVE_ACCESS`` and ``DEEP_ARCHIVE_ACCESS``.
     * You only need Intelligent Tiering Configuration enabled on a bucket if you want to automatically
     * move objects stored in the Intelligent-Tiering storage class to Archive Access or Deep Archive
     * Access tiers.
     * @uniqueItems true
     */
    Tierings: ({
      /**
       * S3 Intelligent-Tiering access tier. See [Storage class for automatically optimizing frequently and
       * infrequently accessed
       * objects](https://docs.aws.amazon.com/AmazonS3/latest/dev/storage-class-intro.html#sc-dynamic-data-access)
       * for a list of access tiers in the S3 Intelligent-Tiering storage class.
       * @enum ["ARCHIVE_ACCESS","DEEP_ARCHIVE_ACCESS"]
       */
      AccessTier: "ARCHIVE_ACCESS" | "DEEP_ARCHIVE_ACCESS";
      /**
       * The number of consecutive days of no access after which an object will be eligible to be
       * transitioned to the corresponding tier. The minimum number of days specified for Archive Access
       * tier must be at least 90 days and Deep Archive Access tier must be at least 180 days. The maximum
       * can be up to 2 years (730 days).
       */
      Days: number;
    })[];
  })[];
  /**
   * Specifies the S3 Inventory configuration for an Amazon S3 bucket. For more information, see [GET
   * Bucket
   * inventory](https://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketGETInventoryConfig.html) in
   * the *Amazon S3 API Reference*.
   * @uniqueItems true
   */
  InventoryConfigurations?: ({
    /** Contains information about where to publish the inventory results. */
    Destination: {
      /** The Amazon Resource Name (ARN) of the bucket to which data is exported. */
      BucketArn: string;
      /**
       * The account ID that owns the destination S3 bucket. If no account ID is provided, the owner is not
       * validated before exporting data.
       * Although this value is optional, we strongly recommend that you set it to help prevent problems
       * if the destination bucket ownership changes.
       */
      BucketAccountId?: string;
      /**
       * Specifies the file format used when exporting data to Amazon S3.
       * *Allowed values*: ``CSV`` | ``ORC`` | ``Parquet``
       * @enum ["CSV","ORC","Parquet"]
       */
      Format: "CSV" | "ORC" | "Parquet";
      /** The prefix to use when exporting data. The prefix is prepended to all results. */
      Prefix?: string;
    };
    /**
     * Specifies whether the inventory is enabled or disabled. If set to ``True``, an inventory list is
     * generated. If set to ``False``, no inventory list is generated.
     */
    Enabled: boolean;
    /** The ID used to identify the inventory configuration. */
    Id: string;
    /**
     * Object versions to include in the inventory list. If set to ``All``, the list includes all the
     * object versions, which adds the version-related fields ``VersionId``, ``IsLatest``, and
     * ``DeleteMarker`` to the list. If set to ``Current``, the list does not contain these
     * version-related fields.
     * @enum ["All","Current"]
     */
    IncludedObjectVersions: "All" | "Current";
    /**
     * Contains the optional fields that are included in the inventory results.
     * @uniqueItems true
     */
    OptionalFields?: ("Size" | "LastModifiedDate" | "StorageClass" | "ETag" | "IsMultipartUploaded" | "ReplicationStatus" | "EncryptionStatus" | "ObjectLockRetainUntilDate" | "ObjectLockMode" | "ObjectLockLegalHoldStatus" | "IntelligentTieringAccessTier" | "BucketKeyStatus" | "ChecksumAlgorithm" | "ObjectAccessControlList" | "ObjectOwner")[];
    /** Specifies the inventory filter prefix. */
    Prefix?: string;
    /**
     * Specifies the schedule for generating inventory results.
     * @enum ["Daily","Weekly"]
     */
    ScheduleFrequency: "Daily" | "Weekly";
  })[];
  /**
   * Specifies the lifecycle configuration for objects in an Amazon S3 bucket. For more information, see
   * [Object Lifecycle
   * Management](https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lifecycle-mgmt.html) in the
   * *Amazon S3 User Guide*.
   */
  LifecycleConfiguration?: {
    /**
     * A lifecycle rule for individual objects in an Amazon S3 bucket.
     * @uniqueItems true
     */
    Rules: ({
      /** Specifies a lifecycle rule that stops incomplete multipart uploads to an Amazon S3 bucket. */
      AbortIncompleteMultipartUpload?: {
        /**
         * Specifies the number of days after which Amazon S3 stops an incomplete multipart upload.
         * @minimum 0
         */
        DaysAfterInitiation: number;
      };
      /**
       * Indicates when objects are deleted from Amazon S3 and Amazon S3 Glacier. The date value must be in
       * ISO 8601 format. The time is always midnight UTC. If you specify an expiration and transition time,
       * you must use the same time unit for both properties (either in days or by date). The expiration
       * time must also be later than the transition time.
       */
      ExpirationDate?: string;
      /**
       * Indicates the number of days after creation when objects are deleted from Amazon S3 and Amazon S3
       * Glacier. If you specify an expiration and transition time, you must use the same time unit for both
       * properties (either in days or by date). The expiration time must also be later than the transition
       * time.
       */
      ExpirationInDays?: number;
      /**
       * Indicates whether Amazon S3 will remove a delete marker without any noncurrent versions. If set to
       * true, the delete marker will be removed if there are no noncurrent versions. This cannot be
       * specified with ``ExpirationInDays``, ``ExpirationDate``, or ``TagFilters``.
       */
      ExpiredObjectDeleteMarker?: boolean;
      /**
       * Unique identifier for the rule. The value can't be longer than 255 characters.
       * @maxLength 255
       */
      Id?: string;
      /**
       * (Deprecated.) For buckets with versioning enabled (or suspended), specifies the time, in days,
       * between when a new version of the object is uploaded to the bucket and when old versions of the
       * object expire. When object versions expire, Amazon S3 permanently deletes them. If you specify a
       * transition and expiration time, the expiration time must be later than the transition time.
       */
      NoncurrentVersionExpirationInDays?: number;
      /**
       * Specifies when noncurrent object versions expire. Upon expiration, S3 permanently deletes the
       * noncurrent object versions. You set this lifecycle configuration action on a bucket that has
       * versioning enabled (or suspended) to request that S3 delete noncurrent object versions at a
       * specific period in the object's lifetime.
       */
      NoncurrentVersionExpiration?: {
        /**
         * Specifies the number of days an object is noncurrent before S3 can perform the associated action.
         * For information about the noncurrent days calculations, see [How Amazon S3 Calculates When an
         * Object Became
         * Noncurrent](https://docs.aws.amazon.com/AmazonS3/latest/dev/intro-lifecycle-rules.html#non-current-days-calculations)
         * in the *Amazon S3 User Guide*.
         */
        NoncurrentDays: number;
        /**
         * Specifies how many noncurrent versions S3 will retain. If there are this many more recent
         * noncurrent versions, S3 will take the associated action. For more information about noncurrent
         * versions, see [Lifecycle configuration
         * elements](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html) in the
         * *Amazon S3 User Guide*.
         */
        NewerNoncurrentVersions?: number;
      };
      /**
       * (Deprecated.) For buckets with versioning enabled (or suspended), specifies when non-current
       * objects transition to a specified storage class. If you specify a transition and expiration time,
       * the expiration time must be later than the transition time. If you specify this property, don't
       * specify the ``NoncurrentVersionTransitions`` property.
       */
      NoncurrentVersionTransition?: {
        /**
         * The class of storage used to store the object.
         * @enum ["DEEP_ARCHIVE","GLACIER","Glacier","GLACIER_IR","INTELLIGENT_TIERING","ONEZONE_IA","STANDARD_IA"]
         */
        StorageClass: "DEEP_ARCHIVE" | "GLACIER" | "Glacier" | "GLACIER_IR" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA";
        /**
         * Specifies the number of days an object is noncurrent before Amazon S3 can perform the associated
         * action. For information about the noncurrent days calculations, see [How Amazon S3 Calculates How
         * Long an Object Has Been
         * Noncurrent](https://docs.aws.amazon.com/AmazonS3/latest/dev/intro-lifecycle-rules.html#non-current-days-calculations)
         * in the *Amazon S3 User Guide*.
         */
        TransitionInDays: number;
        /**
         * Specifies how many noncurrent versions S3 will retain. If there are this many more recent
         * noncurrent versions, S3 will take the associated action. For more information about noncurrent
         * versions, see [Lifecycle configuration
         * elements](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html) in the
         * *Amazon S3 User Guide*.
         */
        NewerNoncurrentVersions?: number;
      };
      /**
       * For buckets with versioning enabled (or suspended), one or more transition rules that specify when
       * non-current objects transition to a specified storage class. If you specify a transition and
       * expiration time, the expiration time must be later than the transition time. If you specify this
       * property, don't specify the ``NoncurrentVersionTransition`` property.
       * @uniqueItems true
       */
      NoncurrentVersionTransitions?: ({
        /**
         * The class of storage used to store the object.
         * @enum ["DEEP_ARCHIVE","GLACIER","Glacier","GLACIER_IR","INTELLIGENT_TIERING","ONEZONE_IA","STANDARD_IA"]
         */
        StorageClass: "DEEP_ARCHIVE" | "GLACIER" | "Glacier" | "GLACIER_IR" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA";
        /**
         * Specifies the number of days an object is noncurrent before Amazon S3 can perform the associated
         * action. For information about the noncurrent days calculations, see [How Amazon S3 Calculates How
         * Long an Object Has Been
         * Noncurrent](https://docs.aws.amazon.com/AmazonS3/latest/dev/intro-lifecycle-rules.html#non-current-days-calculations)
         * in the *Amazon S3 User Guide*.
         */
        TransitionInDays: number;
        /**
         * Specifies how many noncurrent versions S3 will retain. If there are this many more recent
         * noncurrent versions, S3 will take the associated action. For more information about noncurrent
         * versions, see [Lifecycle configuration
         * elements](https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html) in the
         * *Amazon S3 User Guide*.
         */
        NewerNoncurrentVersions?: number;
      })[];
      /**
       * Object key prefix that identifies one or more objects to which this rule applies.
       * Replacement must be made for object keys containing special characters (such as carriage returns)
       * when using XML requests. For more information, see [XML related object key
       * constraints](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints).
       */
      Prefix?: string;
      /**
       * If ``Enabled``, the rule is currently being applied. If ``Disabled``, the rule is not currently
       * being applied.
       * @enum ["Enabled","Disabled"]
       */
      Status: "Enabled" | "Disabled";
      /**
       * Tags to use to identify a subset of objects to which the lifecycle rule applies.
       * @uniqueItems true
       */
      TagFilters?: {
        /** The tag value. */
        Value: string;
        /** The tag key. */
        Key: string;
      }[];
      /**
       * Specifies the minimum object size in bytes for this rule to apply to. Objects must be larger than
       * this value in bytes. For more information about size based rules, see [Lifecycle configuration
       * using size-based
       * rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html#lc-size-rules)
       * in the *Amazon S3 User Guide*.
       * @maxLength 20
       * @pattern [0-9]+
       */
      ObjectSizeGreaterThan?: string;
      /**
       * Specifies the maximum object size in bytes for this rule to apply to. Objects must be smaller than
       * this value in bytes. For more information about sized based rules, see [Lifecycle configuration
       * using size-based
       * rules](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html#lc-size-rules)
       * in the *Amazon S3 User Guide*.
       * @maxLength 20
       * @pattern [0-9]+
       */
      ObjectSizeLessThan?: string;
      /**
       * (Deprecated.) Specifies when an object transitions to a specified storage class. If you specify an
       * expiration and transition time, you must use the same time unit for both properties (either in days
       * or by date). The expiration time must also be later than the transition time. If you specify this
       * property, don't specify the ``Transitions`` property.
       */
      Transition?: {
        /**
         * The storage class to which you want the object to transition.
         * @enum ["DEEP_ARCHIVE","GLACIER","Glacier","GLACIER_IR","INTELLIGENT_TIERING","ONEZONE_IA","STANDARD_IA"]
         */
        StorageClass: "DEEP_ARCHIVE" | "GLACIER" | "Glacier" | "GLACIER_IR" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA";
        /**
         * Indicates when objects are transitioned to the specified storage class. The date value must be in
         * ISO 8601 format. The time is always midnight UTC.
         */
        TransitionDate?: string;
        /**
         * Indicates the number of days after creation when objects are transitioned to the specified storage
         * class. If the specified storage class is ``INTELLIGENT_TIERING``, ``GLACIER_IR``, ``GLACIER``, or
         * ``DEEP_ARCHIVE``, valid values are ``0`` or positive integers. If the specified storage class is
         * ``STANDARD_IA`` or ``ONEZONE_IA``, valid values are positive integers greater than ``30``. Be aware
         * that some storage classes have a minimum storage duration and that you're charged for transitioning
         * objects before their minimum storage duration. For more information, see [Constraints and
         * considerations for
         * transitions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html#lifecycle-configuration-constraints)
         * in the *Amazon S3 User Guide*.
         */
        TransitionInDays?: number;
      };
      /**
       * One or more transition rules that specify when an object transitions to a specified storage class.
       * If you specify an expiration and transition time, you must use the same time unit for both
       * properties (either in days or by date). The expiration time must also be later than the transition
       * time. If you specify this property, don't specify the ``Transition`` property.
       * @uniqueItems true
       */
      Transitions?: ({
        /**
         * The storage class to which you want the object to transition.
         * @enum ["DEEP_ARCHIVE","GLACIER","Glacier","GLACIER_IR","INTELLIGENT_TIERING","ONEZONE_IA","STANDARD_IA"]
         */
        StorageClass: "DEEP_ARCHIVE" | "GLACIER" | "Glacier" | "GLACIER_IR" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "STANDARD_IA";
        /**
         * Indicates when objects are transitioned to the specified storage class. The date value must be in
         * ISO 8601 format. The time is always midnight UTC.
         */
        TransitionDate?: string;
        /**
         * Indicates the number of days after creation when objects are transitioned to the specified storage
         * class. If the specified storage class is ``INTELLIGENT_TIERING``, ``GLACIER_IR``, ``GLACIER``, or
         * ``DEEP_ARCHIVE``, valid values are ``0`` or positive integers. If the specified storage class is
         * ``STANDARD_IA`` or ``ONEZONE_IA``, valid values are positive integers greater than ``30``. Be aware
         * that some storage classes have a minimum storage duration and that you're charged for transitioning
         * objects before their minimum storage duration. For more information, see [Constraints and
         * considerations for
         * transitions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html#lifecycle-configuration-constraints)
         * in the *Amazon S3 User Guide*.
         */
        TransitionInDays?: number;
      })[];
    })[];
    /**
     * Indicates which default minimum object size behavior is applied to the lifecycle configuration.
     * This parameter applies to general purpose buckets only. It isn't supported for directory bucket
     * lifecycle configurations.
     * +  ``all_storage_classes_128K`` - Objects smaller than 128 KB will not transition to any storage
     * class by default.
     * +  ``varies_by_storage_class`` - Objects smaller than 128 KB will transition to Glacier Flexible
     * Retrieval or Glacier Deep Archive storage classes. By default, all other storage classes will
     * prevent transitions smaller than 128 KB.
     * To customize the minimum object size for any transition you can add a filter that specifies a
     * custom ``ObjectSizeGreaterThan`` or ``ObjectSizeLessThan`` in the body of your transition rule.
     * Custom filters always take precedence over the default transition behavior.
     * @enum ["varies_by_storage_class","all_storage_classes_128K"]
     */
    TransitionDefaultMinimumObjectSize?: "varies_by_storage_class" | "all_storage_classes_128K";
  };
  /** Settings that define where logs are stored. */
  LoggingConfiguration?: {
    /**
     * The name of the bucket where Amazon S3 should store server access log files. You can store log
     * files in any bucket that you own. By default, logs are stored in the bucket where the
     * ``LoggingConfiguration`` property is defined.
     */
    DestinationBucketName?: string;
    /**
     * A prefix for all log object keys. If you store log files from multiple Amazon S3 buckets in a
     * single bucket, you can use a prefix to distinguish which log files came from which bucket.
     */
    LogFilePrefix?: string;
    /**
     * Amazon S3 key format for log objects. Only one format, either PartitionedPrefix or SimplePrefix, is
     * allowed.
     */
    TargetObjectKeyFormat?: unknown | unknown;
  };
  /**
   * Specifies a metrics configuration for the CloudWatch request metrics (specified by the metrics
   * configuration ID) from an Amazon S3 bucket. If you're updating an existing metrics configuration,
   * note that this is a full replacement of the existing metrics configuration. If you don't include
   * the elements you want to keep, they are erased. For more information, see
   * [PutBucketMetricsConfiguration](https://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTMetricConfiguration.html).
   * @uniqueItems true
   */
  MetricsConfigurations?: {
    /**
     * The access point that was used while performing operations on the object. The metrics configuration
     * only includes objects that meet the filter's criteria.
     */
    AccessPointArn?: string;
    /**
     * The ID used to identify the metrics configuration. This can be any value you choose that helps you
     * identify your metrics configuration.
     */
    Id: string;
    /** The prefix that an object must have to be included in the metrics results. */
    Prefix?: string;
    /**
     * Specifies a list of tag filters to use as a metrics configuration filter. The metrics configuration
     * includes only objects that meet the filter's criteria.
     * @uniqueItems true
     */
    TagFilters?: {
      /** The tag value. */
      Value: string;
      /** The tag key. */
      Key: string;
    }[];
  }[];
  /** The metadata table configuration of an S3 general purpose bucket. */
  MetadataTableConfiguration?: {
    /**
     * The destination information for the metadata table configuration. The destination table bucket must
     * be in the same Region and AWS-account as the general purpose bucket. The specified metadata table
     * name must be unique within the ``aws_s3_metadata`` namespace in the destination table bucket.
     */
    S3TablesDestination: {
      /**
       * The Amazon Resource Name (ARN) for the table bucket that's specified as the destination in the
       * metadata table configuration. The destination table bucket must be in the same Region and
       * AWS-account as the general purpose bucket.
       */
      TableBucketArn: string;
      /**
       * The name for the metadata table in your metadata table configuration. The specified metadata table
       * name must be unique within the ``aws_s3_metadata`` namespace in the destination table bucket.
       */
      TableName: string;
      /**
       * The table bucket namespace for the metadata table in your metadata table configuration. This value
       * is always ``aws_s3_metadata``.
       */
      TableNamespace?: string;
      /**
       * The Amazon Resource Name (ARN) for the metadata table in the metadata table configuration. The
       * specified metadata table name must be unique within the ``aws_s3_metadata`` namespace in the
       * destination table bucket.
       */
      TableArn?: string;
    };
  };
  /** The S3 Metadata configuration for a general purpose bucket. */
  MetadataConfiguration?: {
    /** The destination information for the S3 Metadata configuration. */
    Destination?: {
      /**
       * The type of the table bucket where the metadata configuration is stored. The ``aws`` value
       * indicates an AWS managed table bucket, and the ``customer`` value indicates a customer-managed
       * table bucket. V2 metadata configurations are stored in AWS managed table buckets, and V1 metadata
       * configurations are stored in customer-managed table buckets.
       * @enum ["aws","customer"]
       */
      TableBucketType: "aws" | "customer";
      /** The Amazon Resource Name (ARN) of the table bucket where the metadata configuration is stored. */
      TableBucketArn?: string;
      /**
       * The namespace in the table bucket where the metadata tables for a metadata configuration are
       * stored.
       */
      TableNamespace?: string;
    };
    /** The journal table configuration for a metadata configuration. */
    JournalTableConfiguration: {
      /** The name of the journal table. */
      TableName?: string;
      /** The Amazon Resource Name (ARN) for the journal table. */
      TableArn?: string;
      /** The journal table record expiration settings for the journal table. */
      RecordExpiration: {
        /**
         * Specifies whether journal table record expiration is enabled or disabled.
         * @enum ["ENABLED","DISABLED"]
         */
        Expiration: "ENABLED" | "DISABLED";
        /**
         * If you enable journal table record expiration, you can set the number of days to retain your
         * journal table records. Journal table records must be retained for a minimum of 7 days. To set this
         * value, specify any whole number from ``7`` to ``2147483647``. For example, to retain your journal
         * table records for one year, set this value to ``365``.
         */
        Days?: number;
      };
      /** The encryption configuration for the journal table. */
      EncryptionConfiguration?: {
        /**
         * The encryption type specified for a metadata table. To specify server-side encryption with KMSlong
         * (KMS) keys (SSE-KMS), use the ``aws:kms`` value. To specify server-side encryption with Amazon S3
         * managed keys (SSE-S3), use the ``AES256`` value.
         * @enum ["aws:kms","AES256"]
         */
        SseAlgorithm: "aws:kms" | "AES256";
        /**
         * If server-side encryption with KMSlong (KMS) keys (SSE-KMS) is specified, you must also specify the
         * KMS key Amazon Resource Name (ARN). You must specify a customer-managed KMS key that's located in
         * the same Region as the general purpose bucket that corresponds to the metadata table configuration.
         */
        KmsKeyArn?: string;
      };
    };
    /** The inventory table configuration for a metadata configuration. */
    InventoryTableConfiguration?: {
      /** The name of the inventory table. */
      TableName?: string;
      /** The Amazon Resource Name (ARN) for the inventory table. */
      TableArn?: string;
      /**
       * The configuration state of the inventory table, indicating whether the inventory table is enabled
       * or disabled.
       * @enum ["ENABLED","DISABLED"]
       */
      ConfigurationState: "ENABLED" | "DISABLED";
      /** The encryption configuration for the inventory table. */
      EncryptionConfiguration?: {
        /**
         * The encryption type specified for a metadata table. To specify server-side encryption with KMSlong
         * (KMS) keys (SSE-KMS), use the ``aws:kms`` value. To specify server-side encryption with Amazon S3
         * managed keys (SSE-S3), use the ``AES256`` value.
         * @enum ["aws:kms","AES256"]
         */
        SseAlgorithm: "aws:kms" | "AES256";
        /**
         * If server-side encryption with KMSlong (KMS) keys (SSE-KMS) is specified, you must also specify the
         * KMS key Amazon Resource Name (ARN). You must specify a customer-managed KMS key that's located in
         * the same Region as the general purpose bucket that corresponds to the metadata table configuration.
         */
        KmsKeyArn?: string;
      };
    };
  };
  /** Configuration that defines how Amazon S3 handles bucket notifications. */
  NotificationConfiguration?: {
    /** Enables delivery of events to Amazon EventBridge. */
    EventBridgeConfiguration?: {
      /**
       * Enables delivery of events to Amazon EventBridge.
       * @default "true"
       */
      EventBridgeEnabled: boolean;
    };
    /**
     * Describes the LAMlong functions to invoke and the events for which to invoke them.
     * @uniqueItems true
     */
    LambdaConfigurations?: {
      /**
       * The Amazon S3 bucket event for which to invoke the LAMlong function. For more information, see
       * [Supported Event Types](https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html) in
       * the *Amazon S3 User Guide*.
       */
      Event: string;
      /**
       * The filtering rules that determine which objects invoke the AWS Lambda function. For example, you
       * can create a filter so that only image files with a ``.jpg`` extension invoke the function when
       * they are added to the Amazon S3 bucket.
       */
      Filter?: {
        /** A container for object key name prefix and suffix filtering rules. */
        S3Key: {
          /**
           * A list of containers for the key-value pair that defines the criteria for the filter rule.
           * @uniqueItems true
           */
          Rules: {
            /**
             * The object key name prefix or suffix identifying one or more objects to which the filtering rule
             * applies. The maximum length is 1,024 characters. Overlapping prefixes and suffixes are not
             * supported. For more information, see [Configuring Event
             * Notifications](https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html) in the
             * *Amazon S3 User Guide*.
             * @maxLength 1024
             */
            Name: string;
            /** The value that the filter searches for in object key names. */
            Value: string;
          }[];
        };
      };
      /**
       * The Amazon Resource Name (ARN) of the LAMlong function that Amazon S3 invokes when the specified
       * event type occurs.
       */
      Function: string;
    }[];
    /**
     * The Amazon Simple Queue Service queues to publish messages to and the events for which to publish
     * messages.
     * @uniqueItems true
     */
    QueueConfigurations?: {
      /**
       * The Amazon S3 bucket event about which you want to publish messages to Amazon SQS. For more
       * information, see [Supported Event
       * Types](https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html) in the *Amazon S3
       * User Guide*.
       */
      Event: string;
      /**
       * The filtering rules that determine which objects trigger notifications. For example, you can create
       * a filter so that Amazon S3 sends notifications only when image files with a ``.jpg`` extension are
       * added to the bucket. For more information, see [Configuring event notifications using object key
       * name
       * filtering](https://docs.aws.amazon.com/AmazonS3/latest/user-guide/notification-how-to-filtering.html)
       * in the *Amazon S3 User Guide*.
       */
      Filter?: {
        /** A container for object key name prefix and suffix filtering rules. */
        S3Key: {
          /**
           * A list of containers for the key-value pair that defines the criteria for the filter rule.
           * @uniqueItems true
           */
          Rules: {
            /**
             * The object key name prefix or suffix identifying one or more objects to which the filtering rule
             * applies. The maximum length is 1,024 characters. Overlapping prefixes and suffixes are not
             * supported. For more information, see [Configuring Event
             * Notifications](https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html) in the
             * *Amazon S3 User Guide*.
             * @maxLength 1024
             */
            Name: string;
            /** The value that the filter searches for in object key names. */
            Value: string;
          }[];
        };
      };
      /**
       * The Amazon Resource Name (ARN) of the Amazon SQS queue to which Amazon S3 publishes a message when
       * it detects events of the specified type. FIFO queues are not allowed when enabling an SQS queue as
       * the event notification destination.
       */
      Queue: string;
    }[];
    /**
     * The topic to which notifications are sent and the events for which notifications are generated.
     * @uniqueItems true
     */
    TopicConfigurations?: {
      /**
       * The Amazon S3 bucket event about which to send notifications. For more information, see [Supported
       * Event Types](https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html) in the *Amazon
       * S3 User Guide*.
       */
      Event: string;
      /**
       * The filtering rules that determine for which objects to send notifications. For example, you can
       * create a filter so that Amazon S3 sends notifications only when image files with a ``.jpg``
       * extension are added to the bucket.
       */
      Filter?: {
        /** A container for object key name prefix and suffix filtering rules. */
        S3Key: {
          /**
           * A list of containers for the key-value pair that defines the criteria for the filter rule.
           * @uniqueItems true
           */
          Rules: {
            /**
             * The object key name prefix or suffix identifying one or more objects to which the filtering rule
             * applies. The maximum length is 1,024 characters. Overlapping prefixes and suffixes are not
             * supported. For more information, see [Configuring Event
             * Notifications](https://docs.aws.amazon.com/AmazonS3/latest/dev/NotificationHowTo.html) in the
             * *Amazon S3 User Guide*.
             * @maxLength 1024
             */
            Name: string;
            /** The value that the filter searches for in object key names. */
            Value: string;
          }[];
        };
      };
      /**
       * The Amazon Resource Name (ARN) of the Amazon SNS topic to which Amazon S3 publishes a message when
       * it detects events of the specified type.
       */
      Topic: string;
    }[];
  };
  /**
   * This operation is not supported for directory buckets.
   * Places an Object Lock configuration on the specified bucket. The rule specified in the Object
   * Lock configuration will be applied by default to every new object placed in the specified bucket.
   * For more information, see [Locking
   * Objects](https://docs.aws.amazon.com/AmazonS3/latest/dev/object-lock.html).
   * +  The ``DefaultRetention`` settings require both a mode and a period.
   * +  The ``DefaultRetention`` period can be either ``Days`` or ``Years`` but you must select one.
   * You cannot specify ``Days`` and ``Years`` at the same time.
   * +  You can enable Object Lock for new or existing buckets. For more information, see [Configuring
   * Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html).
   * You must URL encode any signed header values that contain spaces. For example, if your header
   * value is ``my file.txt``, containing two spaces after ``my``, you must URL encode this value to
   * ``my%20%20file.txt``.
   */
  ObjectLockConfiguration?: {
    /**
     * Indicates whether this bucket has an Object Lock configuration enabled. Enable
     * ``ObjectLockEnabled`` when you apply ``ObjectLockConfiguration`` to a bucket.
     */
    ObjectLockEnabled?: string;
    /**
     * Specifies the Object Lock rule for the specified object. Enable this rule when you apply
     * ``ObjectLockConfiguration`` to a bucket. If Object Lock is turned on, bucket settings require both
     * ``Mode`` and a period of either ``Days`` or ``Years``. You cannot specify ``Days`` and ``Years`` at
     * the same time. For more information, see
     * [ObjectLockRule](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-objectlockrule.html)
     * and
     * [DefaultRetention](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-defaultretention.html).
     */
    Rule?: {
      /**
       * The default Object Lock retention mode and period that you want to apply to new objects placed in
       * the specified bucket. If Object Lock is turned on, bucket settings require both ``Mode`` and a
       * period of either ``Days`` or ``Years``. You cannot specify ``Days`` and ``Years`` at the same time.
       * For more information about allowable values for mode and period, see
       * [DefaultRetention](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-bucket-defaultretention.html).
       */
      DefaultRetention?: {
        /**
         * The number of years that you want to specify for the default retention period. If Object Lock is
         * turned on, you must specify ``Mode`` and specify either ``Days`` or ``Years``.
         */
        Years?: number;
        /**
         * The number of days that you want to specify for the default retention period. If Object Lock is
         * turned on, you must specify ``Mode`` and specify either ``Days`` or ``Years``.
         */
        Days?: number;
        /**
         * The default Object Lock retention mode you want to apply to new objects placed in the specified
         * bucket. If Object Lock is turned on, you must specify ``Mode`` and specify either ``Days`` or
         * ``Years``.
         * @enum ["COMPLIANCE","GOVERNANCE"]
         */
        Mode?: "COMPLIANCE" | "GOVERNANCE";
      };
    };
  };
  /**
   * Indicates whether this bucket has an Object Lock configuration enabled. Enable
   * ``ObjectLockEnabled`` when you apply ``ObjectLockConfiguration`` to a bucket.
   */
  ObjectLockEnabled?: boolean;
  /** Configuration that defines how Amazon S3 handles Object Ownership rules. */
  OwnershipControls?: {
    /**
     * Specifies the container element for Object Ownership rules.
     * @uniqueItems true
     */
    Rules: ({
      /**
       * Specifies an object ownership rule.
       * @enum ["ObjectWriter","BucketOwnerPreferred","BucketOwnerEnforced"]
       */
      ObjectOwnership?: "ObjectWriter" | "BucketOwnerPreferred" | "BucketOwnerEnforced";
    })[];
  };
  /** Configuration that defines how Amazon S3 handles public access. */
  PublicAccessBlockConfiguration?: {
    /**
     * Specifies whether Amazon S3 should block public access control lists (ACLs) for this bucket and
     * objects in this bucket. Setting this element to ``TRUE`` causes the following behavior:
     * +  PUT Bucket ACL and PUT Object ACL calls fail if the specified ACL is public.
     * +  PUT Object calls fail if the request includes a public ACL.
     * +  PUT Bucket calls fail if the request includes a public ACL.
     * Enabling this setting doesn't affect existing policies or ACLs.
     */
    BlockPublicAcls?: boolean;
    /**
     * Specifies whether Amazon S3 should block public bucket policies for this bucket. Setting this
     * element to ``TRUE`` causes Amazon S3 to reject calls to PUT Bucket policy if the specified bucket
     * policy allows public access.
     * Enabling this setting doesn't affect existing bucket policies.
     */
    BlockPublicPolicy?: boolean;
    /**
     * Specifies whether Amazon S3 should ignore public ACLs for this bucket and objects in this bucket.
     * Setting this element to ``TRUE`` causes Amazon S3 to ignore all public ACLs on this bucket and
     * objects in this bucket.
     * Enabling this setting doesn't affect the persistence of any existing ACLs and doesn't prevent new
     * public ACLs from being set.
     */
    IgnorePublicAcls?: boolean;
    /**
     * Specifies whether Amazon S3 should restrict public bucket policies for this bucket. Setting this
     * element to ``TRUE`` restricts access to this bucket to only AWS-service principals and authorized
     * users within this account if the bucket has a public policy.
     * Enabling this setting doesn't affect previously stored bucket policies, except that public and
     * cross-account access within any public bucket policy, including non-public delegation to specific
     * accounts, is blocked.
     */
    RestrictPublicBuckets?: boolean;
  };
  /**
   * Configuration for replicating objects in an S3 bucket. To enable replication, you must also enable
   * versioning by using the ``VersioningConfiguration`` property.
   * Amazon S3 can store replicated objects in a single destination bucket or multiple destination
   * buckets. The destination bucket or buckets must already exist.
   */
  ReplicationConfiguration?: {
    /**
     * The Amazon Resource Name (ARN) of the IAMlong (IAM) role that Amazon S3 assumes when replicating
     * objects. For more information, see [How to Set Up
     * Replication](https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-how-setup.html) in the
     * *Amazon S3 User Guide*.
     */
    Role: string;
    /**
     * A container for one or more replication rules. A replication configuration must have at least one
     * rule and can contain a maximum of 1,000 rules.
     * @uniqueItems true
     */
    Rules: ({
      /**
       * Specifies whether Amazon S3 replicates delete markers. If you specify a ``Filter`` in your
       * replication configuration, you must also include a ``DeleteMarkerReplication`` element. If your
       * ``Filter`` includes a ``Tag`` element, the ``DeleteMarkerReplication````Status`` must be set to
       * Disabled, because Amazon S3 does not support replicating delete markers for tag-based rules. For an
       * example configuration, see [Basic Rule
       * Configuration](https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-add-config.html#replication-config-min-rule-config).
       * For more information about delete marker replication, see [Basic Rule
       * Configuration](https://docs.aws.amazon.com/AmazonS3/latest/dev/delete-marker-replication.html).
       * If you are using an earlier version of the replication configuration, Amazon S3 handles
       * replication of delete markers differently. For more information, see [Backward
       * Compatibility](https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-add-config.html#replication-backward-compat-considerations).
       */
      DeleteMarkerReplication?: {
        /**
         * Indicates whether to replicate delete markers.
         * @enum ["Disabled","Enabled"]
         */
        Status?: "Disabled" | "Enabled";
      };
      /**
       * A container for information about the replication destination and its configurations including
       * enabling the S3 Replication Time Control (S3 RTC).
       */
      Destination: {
        /**
         * Specify this only in a cross-account scenario (where source and destination bucket owners are not
         * the same), and you want to change replica ownership to the AWS-account that owns the destination
         * bucket. If this is not specified in the replication configuration, the replicas are owned by same
         * AWS-account that owns the source object.
         */
        AccessControlTranslation?: {
          /**
           * Specifies the replica ownership. For default and valid values, see [PUT bucket
           * replication](https://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTreplication.html) in the
           * *Amazon S3 API Reference*.
           */
          Owner: string;
        };
        /**
         * Destination bucket owner account ID. In a cross-account scenario, if you direct Amazon S3 to change
         * replica ownership to the AWS-account that owns the destination bucket by specifying the
         * ``AccessControlTranslation`` property, this is the account ID of the destination bucket owner. For
         * more information, see [Cross-Region Replication Additional Configuration: Change Replica
         * Owner](https://docs.aws.amazon.com/AmazonS3/latest/dev/crr-change-owner.html) in the *Amazon S3
         * User Guide*.
         * If you specify the ``AccessControlTranslation`` property, the ``Account`` property is required.
         */
        Account?: string;
        /** The Amazon Resource Name (ARN) of the bucket where you want Amazon S3 to store the results. */
        Bucket: string;
        /** Specifies encryption-related information. */
        EncryptionConfiguration?: {
          /**
           * Specifies the ID (Key ARN or Alias ARN) of the customer managed AWS KMS key stored in AWS Key
           * Management Service (KMS) for the destination bucket. Amazon S3 uses this key to encrypt replica
           * objects. Amazon S3 only supports symmetric encryption KMS keys. For more information, see
           * [Asymmetric keys in
           * KMS](https://docs.aws.amazon.com//kms/latest/developerguide/symmetric-asymmetric.html) in the *Key
           * Management Service Developer Guide*.
           */
          ReplicaKmsKeyID: string;
        };
        /**
         * A container specifying replication metrics-related settings enabling replication metrics and
         * events.
         */
        Metrics?: {
          /**
           * A container specifying the time threshold for emitting the
           * ``s3:Replication:OperationMissedThreshold`` event.
           */
          EventThreshold?: {
            /**
             * Contains an integer specifying time in minutes.
             * Valid value: 15
             */
            Minutes: number;
          };
          /**
           * Specifies whether the replication metrics are enabled.
           * @enum ["Disabled","Enabled"]
           */
          Status: "Disabled" | "Enabled";
        };
        /**
         * A container specifying S3 Replication Time Control (S3 RTC), including whether S3 RTC is enabled
         * and the time when all objects and operations on objects must be replicated. Must be specified
         * together with a ``Metrics`` block.
         */
        ReplicationTime?: {
          /**
           * Specifies whether the replication time is enabled.
           * @enum ["Disabled","Enabled"]
           */
          Status: "Disabled" | "Enabled";
          /**
           * A container specifying the time by which replication should be complete for all objects and
           * operations on objects.
           */
          Time: {
            /**
             * Contains an integer specifying time in minutes.
             * Valid value: 15
             */
            Minutes: number;
          };
        };
        /**
         * The storage class to use when replicating objects, such as S3 Standard or reduced redundancy. By
         * default, Amazon S3 uses the storage class of the source object to create the object replica.
         * For valid values, see the ``StorageClass`` element of the [PUT Bucket
         * replication](https://docs.aws.amazon.com/AmazonS3/latest/API/RESTBucketPUTreplication.html) action
         * in the *Amazon S3 API Reference*.
         * ``FSX_OPENZFS`` is not an accepted value when replicating objects.
         * @enum ["DEEP_ARCHIVE","GLACIER","GLACIER_IR","INTELLIGENT_TIERING","ONEZONE_IA","REDUCED_REDUNDANCY","STANDARD","STANDARD_IA"]
         */
        StorageClass?: "DEEP_ARCHIVE" | "GLACIER" | "GLACIER_IR" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "REDUCED_REDUNDANCY" | "STANDARD" | "STANDARD_IA";
      };
      /**
       * A filter that identifies the subset of objects to which the replication rule applies. A ``Filter``
       * must specify exactly one ``Prefix``, ``TagFilter``, or an ``And`` child element. The use of the
       * filter field indicates that this is a V2 replication configuration. This field isn't supported in a
       * V1 replication configuration.
       * V1 replication configuration only supports filtering by key prefix. To filter using a V1
       * replication configuration, add the ``Prefix`` directly as a child element of the ``Rule`` element.
       */
      Filter?: {
        /**
         * A container for specifying rule filters. The filters determine the subset of objects to which the
         * rule applies. This element is required only if you specify more than one filter. For example:
         * +  If you specify both a ``Prefix`` and a ``TagFilter``, wrap these filters in an ``And`` tag.
         * +  If you specify a filter based on multiple tags, wrap the ``TagFilter`` elements in an ``And``
         * tag.
         */
        And?: {
          /** An object key name prefix that identifies the subset of objects to which the rule applies. */
          Prefix?: string;
          /**
           * An array of tags containing key and value pairs.
           * @uniqueItems true
           */
          TagFilters?: {
            /** The tag value. */
            Value: string;
            /** The tag key. */
            Key: string;
          }[];
        };
        /**
         * An object key name prefix that identifies the subset of objects to which the rule applies.
         * Replacement must be made for object keys containing special characters (such as carriage returns)
         * when using XML requests. For more information, see [XML related object key
         * constraints](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints).
         */
        Prefix?: string;
        /**
         * A container for specifying a tag key and value.
         * The rule applies only to objects that have the tag in their tag set.
         */
        TagFilter?: {
          /** The tag value. */
          Value: string;
          /** The tag key. */
          Key: string;
        };
      };
      /**
       * A unique identifier for the rule. The maximum value is 255 characters. If you don't specify a
       * value, AWS CloudFormation generates a random ID. When using a V2 replication configuration this
       * property is capitalized as "ID".
       * @maxLength 255
       */
      Id?: string;
      /**
       * An object key name prefix that identifies the object or objects to which the rule applies. The
       * maximum prefix length is 1,024 characters. To include all objects in a bucket, specify an empty
       * string. To filter using a V1 replication configuration, add the ``Prefix`` directly as a child
       * element of the ``Rule`` element.
       * Replacement must be made for object keys containing special characters (such as carriage returns)
       * when using XML requests. For more information, see [XML related object key
       * constraints](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints).
       * @maxLength 1024
       */
      Prefix?: string;
      /**
       * The priority indicates which rule has precedence whenever two or more replication rules conflict.
       * Amazon S3 will attempt to replicate objects according to all replication rules. However, if there
       * are two or more rules with the same destination bucket, then objects will be replicated according
       * to the rule with the highest priority. The higher the number, the higher the priority.
       * For more information, see
       * [Replication](https://docs.aws.amazon.com/AmazonS3/latest/dev/replication.html) in the *Amazon S3
       * User Guide*.
       */
      Priority?: number;
      /**
       * A container that describes additional filters for identifying the source objects that you want to
       * replicate. You can choose to enable or disable the replication of these objects.
       */
      SourceSelectionCriteria?: {
        /** A filter that you can specify for selection for modifications on replicas. */
        ReplicaModifications?: {
          /**
           * Specifies whether Amazon S3 replicates modifications on replicas.
           * *Allowed values*: ``Enabled`` | ``Disabled``
           * @enum ["Enabled","Disabled"]
           */
          Status: "Enabled" | "Disabled";
        };
        /** A container for filter information for the selection of Amazon S3 objects encrypted with AWS KMS. */
        SseKmsEncryptedObjects?: {
          /**
           * Specifies whether Amazon S3 replicates objects created with server-side encryption using an AWS KMS
           * key stored in AWS Key Management Service.
           * @enum ["Disabled","Enabled"]
           */
          Status: "Disabled" | "Enabled";
        };
      };
      /**
       * Specifies whether the rule is enabled.
       * @enum ["Disabled","Enabled"]
       */
      Status: "Disabled" | "Enabled";
    })[];
  };
  /** An arbitrary set of tags (key-value pairs) for this S3 bucket. */
  Tags?: {
    /**
     * Name of the object key.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * Value of the tag.
     * @maxLength 256
     */
    Value: string;
  }[];
  /** @enum ["Enabled","Disabled"] */
  AbacStatus?: "Enabled" | "Disabled";
  /**
   * Enables multiple versions of all objects in this bucket. You might enable versioning to prevent
   * objects from being deleted or overwritten by mistake or to archive objects so that you can retrieve
   * previous versions of them.
   * When you enable versioning on a bucket for the first time, it might take a short amount of time
   * for the change to be fully propagated. We recommend that you wait for 15 minutes after enabling
   * versioning before issuing write operations (``PUT`` or ``DELETE``) on objects in the bucket.
   */
  VersioningConfiguration?: {
    /**
     * The versioning state of the bucket.
     * @default "Suspended"
     * @enum ["Enabled","Suspended"]
     */
    Status: "Enabled" | "Suspended";
  };
  /**
   * Information used to configure the bucket as a static website. For more information, see [Hosting
   * Websites on Amazon S3](https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html).
   */
  WebsiteConfiguration?: {
    /** The name of the error document for the website. */
    ErrorDocument?: string;
    /** The name of the index document for the website. */
    IndexDocument?: string;
    /** Rules that define when a redirect is applied and the redirect behavior. */
    RoutingRules?: ({
      /**
       * Container for redirect information. You can redirect requests to another host, to another page, or
       * with another protocol. In the event of an error, you can specify a different error code to return.
       */
      RedirectRule: {
        /** The host name to use in the redirect request. */
        HostName?: string;
        /** The HTTP redirect code to use on the response. Not required if one of the siblings is present. */
        HttpRedirectCode?: string;
        /**
         * Protocol to use when redirecting requests. The default is the protocol that is used in the original
         * request.
         * @enum ["http","https"]
         */
        Protocol?: "http" | "https";
        /**
         * The object key prefix to use in the redirect request. For example, to redirect requests for all
         * pages with prefix ``docs/`` (objects in the ``docs/`` folder) to ``documents/``, you can set a
         * condition block with ``KeyPrefixEquals`` set to ``docs/`` and in the Redirect set
         * ``ReplaceKeyPrefixWith`` to ``/documents``. Not required if one of the siblings is present. Can be
         * present only if ``ReplaceKeyWith`` is not provided.
         * Replacement must be made for object keys containing special characters (such as carriage returns)
         * when using XML requests. For more information, see [XML related object key
         * constraints](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints).
         */
        ReplaceKeyPrefixWith?: string;
        /**
         * The specific object key to use in the redirect request. For example, redirect request to
         * ``error.html``. Not required if one of the siblings is present. Can be present only if
         * ``ReplaceKeyPrefixWith`` is not provided.
         * Replacement must be made for object keys containing special characters (such as carriage returns)
         * when using XML requests. For more information, see [XML related object key
         * constraints](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html#object-key-xml-related-constraints).
         */
        ReplaceKeyWith?: string;
      };
      /**
       * A container for describing a condition that must be met for the specified redirect to apply. For
       * example, 1. If request is for pages in the ``/docs`` folder, redirect to the ``/documents`` folder.
       * 2. If request results in HTTP error 4xx, redirect request to another host where you might process
       * the error.
       */
      RoutingRuleCondition?: {
        /**
         * The object key name prefix when the redirect is applied. For example, to redirect requests for
         * ``ExamplePage.html``, the key prefix will be ``ExamplePage.html``. To redirect request for all
         * pages with the prefix ``docs/``, the key prefix will be ``docs/``, which identifies all objects in
         * the docs/ folder.
         * Required when the parent element ``Condition`` is specified and sibling
         * ``HttpErrorCodeReturnedEquals`` is not specified. If both conditions are specified, both must be
         * true for the redirect to be applied.
         */
        KeyPrefixEquals?: string;
        /**
         * The HTTP error code when the redirect is applied. In the event of an error, if the error code
         * equals this value, then the specified redirect is applied.
         * Required when parent element ``Condition`` is specified and sibling ``KeyPrefixEquals`` is not
         * specified. If both are specified, then both must be true for the redirect to be applied.
         */
        HttpErrorCodeReturnedEquals?: string;
      };
    })[];
    /**
     * The redirect behavior for every request to this bucket's website endpoint.
     * If you specify this property, you can't specify any other property.
     */
    RedirectAllRequestsTo?: {
      /** Name of the host where requests are redirected. */
      HostName: string;
      /**
       * Protocol to use when redirecting requests. The default is the protocol that is used in the original
       * request.
       * @enum ["http","https"]
       */
      Protocol?: "http" | "https";
    };
  };
  Arn?: string;
  DomainName?: string;
  DualStackDomainName?: string;
  RegionalDomainName?: string;
  WebsiteURL?: string;
};


/**
 * Applies an Amazon S3 bucket policy to an Amazon S3 bucket. If you are using an identity other than
 * the root user of the AWS-account that owns the bucket, the calling identity must have the
 * ``PutBucketPolicy`` permissions on the specified bucket and belong to the bucket owner's account in
 * order to use this operation.
 * If you don't have ``PutBucketPolicy`` permissions, Amazon S3 returns a ``403 Access Denied``
 * error. If you have the correct permissions, but you're not using an identity that belongs to the
 * bucket owner's account, Amazon S3 returns a ``405 Method Not Allowed`` error.
 * As a security precaution, the root user of the AWS-account that owns a bucket can always use
 * this operation, even if the policy explicitly denies the root user the ability to perform this
 * action.
 * When using the ``AWS::S3::BucketPolicy`` resource, you can create, update, and delete bucket
 * policies for S3 buckets located in Regions that are different from the stack's Region. However, the
 * CloudFormation stacks should be deployed in the US East (N. Virginia) or ``us-east-1`` Region. This
 * cross-region bucket policy modification functionality is supported for backward compatibility with
 * existing workflows.
 * If the [DeletionPolicy
 * attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-deletionpolicy.html)
 * is not specified or set to ``Delete``, the bucket policy will be removed when the stack is deleted.
 * If set to ``Retain``, the bucket policy will be preserved even after the stack is deleted.
 * For example, a CloudFormation stack in ``us-east-1`` can use the ``AWS::S3::BucketPolicy``
 * resource to manage the bucket policy for an S3 bucket in ``us-west-2``. The retention or removal of
 * the bucket policy during the stack deletion is determined by the ``DeletionPolicy`` attribute
 * specified in the stack template.
 * For more information, see [Bucket policy
 * examples](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html).
 * The following operations are related to ``PutBucketPolicy``:
 * +   [CreateBucket](https://docs.aws.amazon.com/AmazonS3/latest/API/API_CreateBucket.html)
 * +   [DeleteBucket](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteBucket.html)
 */
export type AwsS3Bucketpolicy = {
  /** The name of the Amazon S3 bucket to which the policy applies. */
  Bucket: string;
  /**
   * A policy document containing permissions to add to the specified bucket. In IAM, you must provide
   * policy documents in JSON format. However, in CloudFormation you can provide the policy in JSON or
   * YAML format because CloudFormation converts YAML to JSON before submitting it to IAM. For more
   * information, see the AWS::IAM::Policy
   * [PolicyDocument](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-policy.html#cfn-iam-policy-policydocument)
   * resource description in this guide and [Access Policy Language
   * Overview](https://docs.aws.amazon.com/AmazonS3/latest/dev/access-policy-language-overview.html) in
   * the *Amazon S3 User Guide*.
   */
  PolicyDocument: Record<string, unknown> | string;
};


/**
 * The request to create a new origin access identity (OAI). An origin access identity is a special
 * CloudFront user that you can associate with Amazon S3 origins, so that you can secure all or just
 * some of your Amazon S3 content. For more information, see [Restricting Access to Amazon S3 Content
 * by Using an Origin Access
 * Identity](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
 * in the *Amazon CloudFront Developer Guide*.
 */
export type AwsCloudfrontCloudfrontoriginaccessidentity = {
  /** The current configuration information for the identity. */
  CloudFrontOriginAccessIdentityConfig: {
    /** A comment to describe the origin access identity. The comment cannot be longer than 128 characters. */
    Comment: string;
  };
  Id?: string;
  S3CanonicalUserId?: string;
};


/**
 * A cache policy.
 * When it's attached to a cache behavior, the cache policy determines the following:
 * +  The values that CloudFront includes in the cache key. These values can include HTTP headers,
 * cookies, and URL query strings. CloudFront uses the cache key to find an object in its cache that
 * it can return to the viewer.
 * +  The default, minimum, and maximum time to live (TTL) values that you want objects to stay in
 * the CloudFront cache.
 * The headers, cookies, and query strings that are included in the cache key are also included in
 * requests that CloudFront sends to the origin. CloudFront sends a request when it can't find a valid
 * object in its cache that matches the request's cache key. If you want to send values to the origin
 * but *not* include them in the cache key, use ``OriginRequestPolicy``.
 */
export type AwsCloudfrontCachepolicy = {
  /** The cache policy configuration. */
  CachePolicyConfig: {
    /** A comment to describe the cache policy. The comment cannot be longer than 128 characters. */
    Comment?: string;
    /**
     * The default amount of time, in seconds, that you want objects to stay in the CloudFront cache
     * before CloudFront sends another request to the origin to see if the object has been updated.
     * CloudFront uses this value as the object's time to live (TTL) only when the origin does *not* send
     * ``Cache-Control`` or ``Expires`` headers with the object. For more information, see [Managing How
     * Long Content Stays in an Edge Cache
     * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
     * in the *Amazon CloudFront Developer Guide*.
     * The default value for this field is 86400 seconds (one day). If the value of ``MinTTL`` is more
     * than 86400 seconds, then the default value for this field is the same as the value of ``MinTTL``.
     * @minimum 0
     */
    DefaultTTL: number;
    /**
     * The maximum amount of time, in seconds, that objects stay in the CloudFront cache before CloudFront
     * sends another request to the origin to see if the object has been updated. CloudFront uses this
     * value only when the origin sends ``Cache-Control`` or ``Expires`` headers with the object. For more
     * information, see [Managing How Long Content Stays in an Edge Cache
     * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
     * in the *Amazon CloudFront Developer Guide*.
     * The default value for this field is 31536000 seconds (one year). If the value of ``MinTTL`` or
     * ``DefaultTTL`` is more than 31536000 seconds, then the default value for this field is the same as
     * the value of ``DefaultTTL``.
     * @minimum 0
     */
    MaxTTL: number;
    /**
     * The minimum amount of time, in seconds, that you want objects to stay in the CloudFront cache
     * before CloudFront sends another request to the origin to see if the object has been updated. For
     * more information, see [Managing How Long Content Stays in an Edge Cache
     * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
     * in the *Amazon CloudFront Developer Guide*.
     * @minimum 0
     */
    MinTTL: number;
    /** A unique name to identify the cache policy. */
    Name: string;
    /**
     * The HTTP headers, cookies, and URL query strings to include in the cache key. The values included
     * in the cache key are also included in requests that CloudFront sends to the origin.
     */
    ParametersInCacheKeyAndForwardedToOrigin: {
      /**
       * An object that determines whether any cookies in viewer requests (and if so, which cookies) are
       * included in the cache key and in requests that CloudFront sends to the origin.
       */
      CookiesConfig: {
        /**
         * Determines whether any cookies in viewer requests are included in the cache key and in requests
         * that CloudFront sends to the origin. Valid values are:
         * +  ``none`` – No cookies in viewer requests are included in the cache key or in requests that
         * CloudFront sends to the origin. Even when this field is set to ``none``, any cookies that are
         * listed in an ``OriginRequestPolicy``*are* included in origin requests.
         * +  ``whitelist`` – Only the cookies in viewer requests that are listed in the ``CookieNames``
         * type are included in the cache key and in requests that CloudFront sends to the origin.
         * +  ``allExcept`` – All cookies in viewer requests are included in the cache key and in requests
         * that CloudFront sends to the origin, *except* for those that are listed in the ``CookieNames``
         * type, which are not included.
         * +  ``all`` – All cookies in viewer requests are included in the cache key and in requests that
         * CloudFront sends to the origin.
         * @pattern ^(none|whitelist|allExcept|all)$
         */
        CookieBehavior: string;
        /**
         * Contains a list of cookie names.
         * @uniqueItems false
         */
        Cookies?: string[];
      };
      /**
       * A flag that can affect whether the ``Accept-Encoding`` HTTP header is included in the cache key and
       * included in requests that CloudFront sends to the origin.
       * This field is related to the ``EnableAcceptEncodingGzip`` field. If one or both of these fields is
       * ``true``*and* the viewer request includes the ``Accept-Encoding`` header, then CloudFront does the
       * following:
       * +  Normalizes the value of the viewer's ``Accept-Encoding`` header
       * +  Includes the normalized header in the cache key
       * +  Includes the normalized header in the request to the origin, if a request is necessary
       * For more information, see [Compression
       * support](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-policy-compressed-objects)
       * in the *Amazon CloudFront Developer Guide*.
       * If you set this value to ``true``, and this cache behavior also has an origin request policy
       * attached, do not include the ``Accept-Encoding`` header in the origin request policy. CloudFront
       * always includes the ``Accept-Encoding`` header in origin requests when the value of this field is
       * ``true``, so including this header in an origin request policy has no effect.
       * If both of these fields are ``false``, then CloudFront treats the ``Accept-Encoding`` header the
       * same as any other HTTP header in the viewer request. By default, it's not included in the cache key
       * and it's not included in origin requests. In this case, you can manually add ``Accept-Encoding`` to
       * the headers whitelist like any other HTTP header.
       */
      EnableAcceptEncodingBrotli?: boolean;
      /**
       * A flag that can affect whether the ``Accept-Encoding`` HTTP header is included in the cache key and
       * included in requests that CloudFront sends to the origin.
       * This field is related to the ``EnableAcceptEncodingBrotli`` field. If one or both of these fields
       * is ``true``*and* the viewer request includes the ``Accept-Encoding`` header, then CloudFront does
       * the following:
       * +  Normalizes the value of the viewer's ``Accept-Encoding`` header
       * +  Includes the normalized header in the cache key
       * +  Includes the normalized header in the request to the origin, if a request is necessary
       * For more information, see [Compression
       * support](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-policy-compressed-objects)
       * in the *Amazon CloudFront Developer Guide*.
       * If you set this value to ``true``, and this cache behavior also has an origin request policy
       * attached, do not include the ``Accept-Encoding`` header in the origin request policy. CloudFront
       * always includes the ``Accept-Encoding`` header in origin requests when the value of this field is
       * ``true``, so including this header in an origin request policy has no effect.
       * If both of these fields are ``false``, then CloudFront treats the ``Accept-Encoding`` header the
       * same as any other HTTP header in the viewer request. By default, it's not included in the cache key
       * and it's not included in origin requests. In this case, you can manually add ``Accept-Encoding`` to
       * the headers whitelist like any other HTTP header.
       */
      EnableAcceptEncodingGzip: boolean;
      /**
       * An object that determines whether any HTTP headers (and if so, which headers) are included in the
       * cache key and in requests that CloudFront sends to the origin.
       */
      HeadersConfig: {
        /**
         * Determines whether any HTTP headers are included in the cache key and in requests that CloudFront
         * sends to the origin. Valid values are:
         * +  ``none`` – No HTTP headers are included in the cache key or in requests that CloudFront sends
         * to the origin. Even when this field is set to ``none``, any headers that are listed in an
         * ``OriginRequestPolicy``*are* included in origin requests.
         * +  ``whitelist`` – Only the HTTP headers that are listed in the ``Headers`` type are included in
         * the cache key and in requests that CloudFront sends to the origin.
         * @pattern ^(none|whitelist)$
         */
        HeaderBehavior: string;
        /**
         * Contains a list of HTTP header names.
         * @uniqueItems false
         */
        Headers?: string[];
      };
      /**
       * An object that determines whether any URL query strings in viewer requests (and if so, which query
       * strings) are included in the cache key and in requests that CloudFront sends to the origin.
       */
      QueryStringsConfig: {
        /**
         * Determines whether any URL query strings in viewer requests are included in the cache key and in
         * requests that CloudFront sends to the origin. Valid values are:
         * +  ``none`` – No query strings in viewer requests are included in the cache key or in requests
         * that CloudFront sends to the origin. Even when this field is set to ``none``, any query strings
         * that are listed in an ``OriginRequestPolicy``*are* included in origin requests.
         * +  ``whitelist`` – Only the query strings in viewer requests that are listed in the
         * ``QueryStringNames`` type are included in the cache key and in requests that CloudFront sends to
         * the origin.
         * +  ``allExcept`` – All query strings in viewer requests are included in the cache key and in
         * requests that CloudFront sends to the origin, *except* those that are listed in the
         * ``QueryStringNames`` type, which are not included.
         * +  ``all`` – All query strings in viewer requests are included in the cache key and in requests
         * that CloudFront sends to the origin.
         * @pattern ^(none|whitelist|allExcept|all)$
         */
        QueryStringBehavior: string;
        /**
         * Contains a list of query string names.
         * @uniqueItems false
         */
        QueryStrings?: string[];
      };
    };
  };
  Id?: string;
  LastModifiedTime?: string;
};


/**
 * An origin request policy.
 * When it's attached to a cache behavior, the origin request policy determines the values that
 * CloudFront includes in requests that it sends to the origin. Each request that CloudFront sends to
 * the origin includes the following:
 * +  The request body and the URL path (without the domain name) from the viewer request.
 * +  The headers that CloudFront automatically includes in every origin request, including
 * ``Host``, ``User-Agent``, and ``X-Amz-Cf-Id``.
 * +  All HTTP headers, cookies, and URL query strings that are specified in the cache policy or the
 * origin request policy. These can include items from the viewer request and, in the case of headers,
 * additional ones that are added by CloudFront.
 * CloudFront sends a request when it can't find an object in its cache that matches the request. If
 * you want to send values to the origin and also include them in the cache key, use ``CachePolicy``.
 */
export type AwsCloudfrontOriginrequestpolicy = {
  Id?: string;
  LastModifiedTime?: string;
  /** The origin request policy configuration. */
  OriginRequestPolicyConfig: {
    /** A comment to describe the origin request policy. The comment cannot be longer than 128 characters. */
    Comment?: string;
    /** The cookies from viewer requests to include in origin requests. */
    CookiesConfig: {
      /**
       * Determines whether cookies in viewer requests are included in requests that CloudFront sends to the
       * origin. Valid values are:
       * +  ``none`` – No cookies in viewer requests are included in requests that CloudFront sends to the
       * origin. Even when this field is set to ``none``, any cookies that are listed in a
       * ``CachePolicy``*are* included in origin requests.
       * +  ``whitelist`` – Only the cookies in viewer requests that are listed in the ``CookieNames``
       * type are included in requests that CloudFront sends to the origin.
       * +  ``all`` – All cookies in viewer requests are included in requests that CloudFront sends to the
       * origin.
       * +  ``allExcept`` – All cookies in viewer requests are included in requests that CloudFront sends
       * to the origin, *except* for those listed in the ``CookieNames`` type, which are not included.
       * @pattern ^(none|whitelist|all|allExcept)$
       */
      CookieBehavior: string;
      /**
       * Contains a list of cookie names.
       * @uniqueItems false
       */
      Cookies?: string[];
    };
    /**
     * The HTTP headers to include in origin requests. These can include headers from viewer requests and
     * additional headers added by CloudFront.
     */
    HeadersConfig: {
      /**
       * Determines whether any HTTP headers are included in requests that CloudFront sends to the origin.
       * Valid values are:
       * +  ``none`` – No HTTP headers in viewer requests are included in requests that CloudFront sends
       * to the origin. Even when this field is set to ``none``, any headers that are listed in a
       * ``CachePolicy``*are* included in origin requests.
       * +  ``whitelist`` – Only the HTTP headers that are listed in the ``Headers`` type are included in
       * requests that CloudFront sends to the origin.
       * +  ``allViewer`` – All HTTP headers in viewer requests are included in requests that CloudFront
       * sends to the origin.
       * +  ``allViewerAndWhitelistCloudFront`` – All HTTP headers in viewer requests and the additional
       * CloudFront headers that are listed in the ``Headers`` type are included in requests that CloudFront
       * sends to the origin. The additional headers are added by CloudFront.
       * +  ``allExcept`` – All HTTP headers in viewer requests are included in requests that CloudFront
       * sends to the origin, *except* for those listed in the ``Headers`` type, which are not included.
       * @pattern ^(none|whitelist|allViewer|allViewerAndWhitelistCloudFront|allExcept)$
       */
      HeaderBehavior: string;
      /**
       * Contains a list of HTTP header names.
       * @uniqueItems false
       */
      Headers?: string[];
    };
    /** A unique name to identify the origin request policy. */
    Name: string;
    /** The URL query strings from viewer requests to include in origin requests. */
    QueryStringsConfig: {
      /**
       * Determines whether any URL query strings in viewer requests are included in requests that
       * CloudFront sends to the origin. Valid values are:
       * +  ``none`` – No query strings in viewer requests are included in requests that CloudFront sends
       * to the origin. Even when this field is set to ``none``, any query strings that are listed in a
       * ``CachePolicy``*are* included in origin requests.
       * +  ``whitelist`` – Only the query strings in viewer requests that are listed in the
       * ``QueryStringNames`` type are included in requests that CloudFront sends to the origin.
       * +  ``all`` – All query strings in viewer requests are included in requests that CloudFront sends
       * to the origin.
       * +  ``allExcept`` – All query strings in viewer requests are included in requests that CloudFront
       * sends to the origin, *except* for those listed in the ``QueryStringNames`` type, which are not
       * included.
       * @pattern ^(none|whitelist|all|allExcept)$
       */
      QueryStringBehavior: string;
      /**
       * Contains a list of query string names.
       * @uniqueItems false
       */
      QueryStrings?: string[];
    };
  };
};


/**
 * A distribution tells CloudFront where you want content to be delivered from, and the details about
 * how to track and manage content delivery.
 */
export type AwsCloudfrontDistribution = {
  /** The distribution's configuration. */
  DistributionConfig: {
    /**
     * This field only supports standard distributions. You can't specify this field for multi-tenant
     * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
     * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
     * in the *Amazon CloudFront Developer Guide*.
     * A complex type that contains information about CNAMEs (alternate domain names), if any, for this
     * distribution.
     * @uniqueItems false
     */
    Aliases?: string[];
    /**
     * To use this field for a multi-tenant distribution, use a connection group instead. For more
     * information, see
     * [ConnectionGroup](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_ConnectionGroup.html).
     * ID of the Anycast static IP list that is associated with the distribution.
     */
    AnycastIpListId?: string;
    /**
     * An alias for the CF distribution's domain name.
     * This property is legacy. We recommend that you use
     * [Aliases](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-distributionconfig.html#cfn-cloudfront-distribution-distributionconfig-aliases)
     * instead.
     * @uniqueItems false
     */
    CNAMEs?: string[];
    /**
     * A complex type that contains zero or more ``CacheBehavior`` elements.
     * @uniqueItems false
     */
    CacheBehaviors?: {
      /**
       * A complex type that controls which HTTP methods CloudFront processes and forwards to your Amazon S3
       * bucket or your custom origin. There are three choices:
       * +  CloudFront forwards only ``GET`` and ``HEAD`` requests.
       * +  CloudFront forwards only ``GET``, ``HEAD``, and ``OPTIONS`` requests.
       * +  CloudFront forwards ``GET, HEAD, OPTIONS, PUT, PATCH, POST``, and ``DELETE`` requests.
       * If you pick the third choice, you may need to restrict access to your Amazon S3 bucket or to your
       * custom origin so users can't perform operations that you don't want them to. For example, you might
       * not want users to have permissions to delete objects from your origin.
       * @default ["GET","HEAD"]
       * @uniqueItems false
       */
      AllowedMethods?: string[];
      /**
       * The unique identifier of the cache policy that is attached to this cache behavior. For more
       * information, see [Creating cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
       * or [Using the managed cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * A ``CacheBehavior`` must include either a ``CachePolicyId`` or ``ForwardedValues``. We recommend
       * that you use a ``CachePolicyId``.
       */
      CachePolicyId?: string;
      /**
       * A complex type that controls whether CloudFront caches the response to requests using the specified
       * HTTP methods. There are two choices:
       * +  CloudFront caches responses to ``GET`` and ``HEAD`` requests.
       * +  CloudFront caches responses to ``GET``, ``HEAD``, and ``OPTIONS`` requests.
       * If you pick the second choice for your Amazon S3 Origin, you may need to forward
       * Access-Control-Request-Method, Access-Control-Request-Headers, and Origin headers for the responses
       * to be cached correctly.
       * @default ["GET","HEAD"]
       * @uniqueItems false
       */
      CachedMethods?: string[];
      /**
       * Whether you want CloudFront to automatically compress certain files for this cache behavior. If so,
       * specify true; if not, specify false. For more information, see [Serving Compressed
       * Files](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html)
       * in the *Amazon CloudFront Developer Guide*.
       * @default false
       */
      Compress?: boolean;
      /**
       * This field only supports standard distributions. You can't specify this field for multi-tenant
       * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
       * in the *Amazon CloudFront Developer Guide*.
       * This field is deprecated. We recommend that you use the ``DefaultTTL`` field in a cache policy
       * instead of this field. For more information, see [Creating cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
       * or [Using the managed cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * The default amount of time that you want objects to stay in CloudFront caches before CloudFront
       * forwards another request to your origin to determine whether the object has been updated. The value
       * that you specify applies only when your origin does not add HTTP headers such as ``Cache-Control
       * max-age``, ``Cache-Control s-maxage``, and ``Expires`` to objects. For more information, see
       * [Managing How Long Content Stays in an Edge Cache
       * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
       * in the *Amazon CloudFront Developer Guide*.
       * @default 86400
       */
      DefaultTTL?: number;
      /**
       * The value of ``ID`` for the field-level encryption configuration that you want CloudFront to use
       * for encrypting specific fields of data for this cache behavior.
       * @default ""
       */
      FieldLevelEncryptionId?: string;
      /**
       * This field is deprecated. We recommend that you use a cache policy or an origin request policy
       * instead of this field. For more information, see [Working with
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/working-with-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * If you want to include values in the cache key, use a cache policy. For more information, see
       * [Creating cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
       * or [Using the managed cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * If you want to send values to the origin but not include them in the cache key, use an origin
       * request policy. For more information, see [Creating origin request
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
       * or [Using the managed origin request
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * A ``CacheBehavior`` must include either a ``CachePolicyId`` or ``ForwardedValues``. We recommend
       * that you use a ``CachePolicyId``.
       * A complex type that specifies how CloudFront handles query strings, cookies, and HTTP headers.
       */
      ForwardedValues?: {
        /**
         * This field is deprecated. We recommend that you use a cache policy or an origin request policy
         * instead of this field.
         * If you want to include cookies in the cache key, use a cache policy. For more information, see
         * [Creating cache
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * If you want to send cookies to the origin but not include them in the cache key, use an origin
         * request policy. For more information, see [Creating origin request
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * A complex type that specifies whether you want CloudFront to forward cookies to the origin and, if
         * so, which ones. For more information about forwarding cookies to the origin, see [How CloudFront
         * Forwards, Caches, and Logs
         * Cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Cookies.html) in the
         * *Amazon CloudFront Developer Guide*.
         * @default {"Forward":"none"}
         */
        Cookies?: {
          /**
           * This field is deprecated. We recommend that you use a cache policy or an origin request policy
           * instead of this field.
           * If you want to include cookies in the cache key, use a cache policy. For more information, see
           * [Creating cache
           * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
           * in the *Amazon CloudFront Developer Guide*.
           * If you want to send cookies to the origin but not include them in the cache key, use origin
           * request policy. For more information, see [Creating origin request
           * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
           * in the *Amazon CloudFront Developer Guide*.
           * Specifies which cookies to forward to the origin for this cache behavior: all, none, or the list
           * of cookies specified in the ``WhitelistedNames`` complex type.
           * Amazon S3 doesn't process cookies. When the cache behavior is forwarding requests to an Amazon S3
           * origin, specify none for the ``Forward`` element.
           */
          Forward: string;
          /**
           * This field is deprecated. We recommend that you use a cache policy or an origin request policy
           * instead of this field.
           * If you want to include cookies in the cache key, use a cache policy. For more information, see
           * [Creating cache
           * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
           * in the *Amazon CloudFront Developer Guide*.
           * If you want to send cookies to the origin but not include them in the cache key, use an origin
           * request policy. For more information, see [Creating origin request
           * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
           * in the *Amazon CloudFront Developer Guide*.
           * Required if you specify ``whitelist`` for the value of ``Forward``. A complex type that specifies
           * how many different cookies you want CloudFront to forward to the origin for this cache behavior
           * and, if you want to forward selected cookies, the names of those cookies.
           * If you specify ``all`` or ``none`` for the value of ``Forward``, omit ``WhitelistedNames``. If you
           * change the value of ``Forward`` from ``whitelist`` to ``all`` or ``none`` and you don't delete the
           * ``WhitelistedNames`` element and its child elements, CloudFront deletes them automatically.
           * For the current limit on the number of cookie names that you can whitelist for each cache
           * behavior, see [CloudFront
           * Limits](https://docs.aws.amazon.com/general/latest/gr/xrefaws_service_limits.html#limits_cloudfront)
           * in the *General Reference*.
           * @uniqueItems false
           */
          WhitelistedNames?: string[];
        };
        /**
         * This field is deprecated. We recommend that you use a cache policy or an origin request policy
         * instead of this field.
         * If you want to include headers in the cache key, use a cache policy. For more information, see
         * [Creating cache
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * If you want to send headers to the origin but not include them in the cache key, use an origin
         * request policy. For more information, see [Creating origin request
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * A complex type that specifies the ``Headers``, if any, that you want CloudFront to forward to the
         * origin for this cache behavior (whitelisted headers). For the headers that you specify, CloudFront
         * also caches separate versions of a specified object that is based on the header values in viewer
         * requests.
         * For more information, see [Caching Content Based on Request
         * Headers](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html) in
         * the *Amazon CloudFront Developer Guide*.
         * @uniqueItems false
         */
        Headers?: string[];
        /**
         * This field is deprecated. We recommend that you use a cache policy or an origin request policy
         * instead of this field.
         * If you want to include query strings in the cache key, use a cache policy. For more information,
         * see [Creating cache
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * If you want to send query strings to the origin but not include them in the cache key, use an
         * origin request policy. For more information, see [Creating origin request
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * Indicates whether you want CloudFront to forward query strings to the origin that is associated
         * with this cache behavior and cache based on the query string parameters. CloudFront behavior
         * depends on the value of ``QueryString`` and on the values that you specify for
         * ``QueryStringCacheKeys``, if any:
         * If you specify true for ``QueryString`` and you don't specify any values for
         * ``QueryStringCacheKeys``, CloudFront forwards all query string parameters to the origin and caches
         * based on all query string parameters. Depending on how many query string parameters and values you
         * have, this can adversely affect performance because CloudFront must forward more requests to the
         * origin.
         * If you specify true for ``QueryString`` and you specify one or more values for
         * ``QueryStringCacheKeys``, CloudFront forwards all query string parameters to the origin, but it
         * only caches based on the query string parameters that you specify.
         * If you specify false for ``QueryString``, CloudFront doesn't forward any query string parameters
         * to the origin, and doesn't cache based on query string parameters.
         * For more information, see [Configuring CloudFront to Cache Based on Query String
         * Parameters](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/QueryStringParameters.html)
         * in the *Amazon CloudFront Developer Guide*.
         */
        QueryString: boolean;
        /**
         * This field is deprecated. We recommend that you use a cache policy or an origin request policy
         * instead of this field.
         * If you want to include query strings in the cache key, use a cache policy. For more information,
         * see [Creating cache
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * If you want to send query strings to the origin but not include them in the cache key, use an
         * origin request policy. For more information, see [Creating origin request
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * A complex type that contains information about the query string parameters that you want
         * CloudFront to use for caching for this cache behavior.
         * @uniqueItems false
         */
        QueryStringCacheKeys?: string[];
      };
      /**
       * A list of CloudFront functions that are associated with this cache behavior. CloudFront functions
       * must be published to the ``LIVE`` stage to associate them with a cache behavior.
       * @uniqueItems false
       */
      FunctionAssociations?: {
        /**
         * The event type of the function, either ``viewer-request`` or ``viewer-response``. You cannot use
         * origin-facing event types (``origin-request`` and ``origin-response``) with a CloudFront function.
         */
        EventType?: string;
        /** The Amazon Resource Name (ARN) of the function. */
        FunctionARN?: string;
      }[];
      /** The gRPC configuration for your cache behavior. */
      GrpcConfig?: {
        /**
         * Enables your CloudFront distribution to receive gRPC requests and to proxy them directly to your
         * origins.
         */
        Enabled: boolean;
      };
      /**
       * A complex type that contains zero or more Lambda@Edge function associations for a cache behavior.
       * @uniqueItems false
       */
      LambdaFunctionAssociations?: {
        /**
         * Specifies the event type that triggers a Lambda@Edge function invocation. You can specify the
         * following values:
         * +  ``viewer-request``: The function executes when CloudFront receives a request from a viewer and
         * before it checks to see whether the requested object is in the edge cache.
         * +  ``origin-request``: The function executes only when CloudFront sends a request to your origin.
         * When the requested object is in the edge cache, the function doesn't execute.
         * +  ``origin-response``: The function executes after CloudFront receives a response from the
         * origin and before it caches the object in the response. When the requested object is in the edge
         * cache, the function doesn't execute.
         * +  ``viewer-response``: The function executes before CloudFront returns the requested object to
         * the viewer. The function executes regardless of whether the object was already in the edge cache.
         * If the origin returns an HTTP status code other than HTTP 200 (OK), the function doesn't execute.
         */
        EventType?: string;
        /**
         * A flag that allows a Lambda@Edge function to have read access to the body content. For more
         * information, see [Accessing the Request Body by Choosing the Include Body
         * Option](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-include-body-access.html)
         * in the Amazon CloudFront Developer Guide.
         */
        IncludeBody?: boolean;
        /**
         * The ARN of the Lambda@Edge function. You must specify the ARN of a function version; you can't
         * specify an alias or $LATEST.
         */
        LambdaFunctionARN?: string;
      }[];
      /**
       * This field only supports standard distributions. You can't specify this field for multi-tenant
       * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
       * in the *Amazon CloudFront Developer Guide*.
       * This field is deprecated. We recommend that you use the ``MaxTTL`` field in a cache policy
       * instead of this field. For more information, see [Creating cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
       * or [Using the managed cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * The maximum amount of time that you want objects to stay in CloudFront caches before CloudFront
       * forwards another request to your origin to determine whether the object has been updated. The value
       * that you specify applies only when your origin adds HTTP headers such as ``Cache-Control max-age``,
       * ``Cache-Control s-maxage``, and ``Expires`` to objects. For more information, see [Managing How
       * Long Content Stays in an Edge Cache
       * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
       * in the *Amazon CloudFront Developer Guide*.
       * @default 31536000
       */
      MaxTTL?: number;
      /**
       * This field only supports standard distributions. You can't specify this field for multi-tenant
       * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
       * in the *Amazon CloudFront Developer Guide*.
       * This field is deprecated. We recommend that you use the ``MinTTL`` field in a cache policy
       * instead of this field. For more information, see [Creating cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
       * or [Using the managed cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * The minimum amount of time that you want objects to stay in CloudFront caches before CloudFront
       * forwards another request to your origin to determine whether the object has been updated. For more
       * information, see [Managing How Long Content Stays in an Edge Cache
       * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
       * in the *Amazon CloudFront Developer Guide*.
       * You must specify ``0`` for ``MinTTL`` if you configure CloudFront to forward all headers to your
       * origin (under ``Headers``, if you specify ``1`` for ``Quantity`` and ``*`` for ``Name``).
       * @default 0
       */
      MinTTL?: number;
      /**
       * The unique identifier of the origin request policy that is attached to this cache behavior. For
       * more information, see [Creating origin request
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
       * or [Using the managed origin request
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       */
      OriginRequestPolicyId?: string;
      /**
       * The pattern (for example, ``images/*.jpg``) that specifies which requests to apply the behavior to.
       * When CloudFront receives a viewer request, the requested path is compared with path patterns in the
       * order in which cache behaviors are listed in the distribution.
       * You can optionally include a slash (``/``) at the beginning of the path pattern. For example,
       * ``/images/*.jpg``. CloudFront behavior is the same with or without the leading ``/``.
       * The path pattern for the default cache behavior is ``*`` and cannot be changed. If the request
       * for an object does not match the path pattern for any cache behaviors, CloudFront applies the
       * behavior in the default cache behavior.
       * For more information, see [Path
       * Pattern](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesPathPattern)
       * in the *Amazon CloudFront Developer Guide*.
       */
      PathPattern: string;
      /**
       * The Amazon Resource Name (ARN) of the real-time log configuration that is attached to this cache
       * behavior. For more information, see [Real-time
       * logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/real-time-logs.html) in
       * the *Amazon CloudFront Developer Guide*.
       */
      RealtimeLogConfigArn?: string;
      /** The identifier for a response headers policy. */
      ResponseHeadersPolicyId?: string;
      /**
       * This field only supports standard distributions. You can't specify this field for multi-tenant
       * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
       * in the *Amazon CloudFront Developer Guide*.
       * Indicates whether you want to distribute media files in the Microsoft Smooth Streaming format
       * using the origin that is associated with this cache behavior. If so, specify ``true``; if not,
       * specify ``false``. If you specify ``true`` for ``SmoothStreaming``, you can still distribute other
       * content using this cache behavior if the content matches the value of ``PathPattern``.
       * @default false
       */
      SmoothStreaming?: boolean;
      /**
       * The value of ``ID`` for the origin that you want CloudFront to route requests to when they match
       * this cache behavior.
       */
      TargetOriginId: string;
      /**
       * A list of key groups that CloudFront can use to validate signed URLs or signed cookies.
       * When a cache behavior contains trusted key groups, CloudFront requires signed URLs or signed
       * cookies for all requests that match the cache behavior. The URLs or cookies must be signed with a
       * private key whose corresponding public key is in the key group. The signed URL or cookie contains
       * information about which public key CloudFront should use to verify the signature. For more
       * information, see [Serving private
       * content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html) in
       * the *Amazon CloudFront Developer Guide*.
       * @uniqueItems false
       */
      TrustedKeyGroups?: string[];
      /**
       * We recommend using ``TrustedKeyGroups`` instead of ``TrustedSigners``.
       * This field only supports standard distributions. You can't specify this field for multi-tenant
       * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
       * in the *Amazon CloudFront Developer Guide*.
       * A list of AWS-account IDs whose public keys CloudFront can use to validate signed URLs or signed
       * cookies.
       * When a cache behavior contains trusted signers, CloudFront requires signed URLs or signed cookies
       * for all requests that match the cache behavior. The URLs or cookies must be signed with the private
       * key of a CloudFront key pair in the trusted signer's AWS-account. The signed URL or cookie contains
       * information about which public key CloudFront should use to verify the signature. For more
       * information, see [Serving private
       * content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html) in
       * the *Amazon CloudFront Developer Guide*.
       * @uniqueItems false
       */
      TrustedSigners?: string[];
      /**
       * The protocol that viewers can use to access the files in the origin specified by ``TargetOriginId``
       * when a request matches the path pattern in ``PathPattern``. You can specify the following options:
       * +  ``allow-all``: Viewers can use HTTP or HTTPS.
       * +  ``redirect-to-https``: If a viewer submits an HTTP request, CloudFront returns an HTTP status
       * code of 301 (Moved Permanently) to the viewer along with the HTTPS URL. The viewer then resubmits
       * the request using the new URL.
       * +  ``https-only``: If a viewer sends an HTTP request, CloudFront returns an HTTP status code of
       * 403 (Forbidden).
       * For more information about requiring the HTTPS protocol, see [Requiring HTTPS Between Viewers and
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-viewers-to-cloudfront.html)
       * in the *Amazon CloudFront Developer Guide*.
       * The only way to guarantee that viewers retrieve an object that was fetched from the origin using
       * HTTPS is never to use any other protocol to fetch the object. If you have recently changed from
       * HTTP to HTTPS, we recommend that you clear your objects' cache because cached objects are protocol
       * agnostic. That means that an edge location will return an object from the cache regardless of
       * whether the current request protocol matches the protocol used previously. For more information,
       * see [Managing Cache
       * Expiration](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html) in
       * the *Amazon CloudFront Developer Guide*.
       */
      ViewerProtocolPolicy: string;
    }[];
    /**
     * A comment to describe the distribution. The comment cannot be longer than 128 characters.
     * @default ""
     */
    Comment?: string;
    /**
     * This field specifies whether the connection mode is through a standard distribution (direct) or a
     * multi-tenant distribution with distribution tenants (tenant-only).
     */
    ConnectionMode?: "direct" | "tenant-only";
    ConnectionFunctionAssociation?: {
      Id: string;
    };
    /**
     * This field only supports standard distributions. You can't specify this field for multi-tenant
     * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
     * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
     * in the *Amazon CloudFront Developer Guide*.
     * The identifier of a continuous deployment policy. For more information, see
     * ``CreateContinuousDeploymentPolicy``.
     */
    ContinuousDeploymentPolicyId?: string;
    /**
     * A complex type that controls the following:
     * +  Whether CloudFront replaces HTTP status codes in the 4xx and 5xx range with custom error
     * messages before returning the response to the viewer.
     * +  How long CloudFront caches HTTP status codes in the 4xx and 5xx range.
     * For more information about custom error pages, see [Customizing Error
     * Responses](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages.html)
     * in the *Amazon CloudFront Developer Guide*.
     * @uniqueItems false
     */
    CustomErrorResponses?: {
      /**
       * The minimum amount of time, in seconds, that you want CloudFront to cache the HTTP status code
       * specified in ``ErrorCode``. When this time period has elapsed, CloudFront queries your origin to
       * see whether the problem that caused the error has been resolved and the requested object is now
       * available.
       * For more information, see [Customizing Error
       * Responses](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/custom-error-pages.html)
       * in the *Amazon CloudFront Developer Guide*.
       * @default 300
       */
      ErrorCachingMinTTL?: number;
      /** The HTTP status code for which you want to specify a custom error page and/or a caching duration. */
      ErrorCode: number;
      /**
       * The HTTP status code that you want CloudFront to return to the viewer along with the custom error
       * page. There are a variety of reasons that you might want CloudFront to return a status code
       * different from the status code that your origin returned to CloudFront, for example:
       * +  Some Internet devices (some firewalls and corporate proxies, for example) intercept HTTP 4xx
       * and 5xx and prevent the response from being returned to the viewer. If you substitute ``200``, the
       * response typically won't be intercepted.
       * +  If you don't care about distinguishing among different client errors or server errors, you can
       * specify ``400`` or ``500`` as the ``ResponseCode`` for all 4xx or 5xx errors.
       * +  You might want to return a ``200`` status code (OK) and static website so your customers don't
       * know that your website is down.
       * If you specify a value for ``ResponseCode``, you must also specify a value for
       * ``ResponsePagePath``.
       */
      ResponseCode?: number;
      /**
       * The path to the custom error page that you want CloudFront to return to a viewer when your origin
       * returns the HTTP status code specified by ``ErrorCode``, for example,
       * ``/4xx-errors/403-forbidden.html``. If you want to store your objects and your custom error pages
       * in different locations, your distribution must include a cache behavior for which the following is
       * true:
       * +  The value of ``PathPattern`` matches the path to your custom error messages. For example,
       * suppose you saved custom error pages for 4xx errors in an Amazon S3 bucket in a directory named
       * ``/4xx-errors``. Your distribution must include a cache behavior for which the path pattern routes
       * requests for your custom error pages to that location, for example, ``/4xx-errors/*``.
       * +  The value of ``TargetOriginId`` specifies the value of the ``ID`` element for the origin that
       * contains your custom error pages.
       * If you specify a value for ``ResponsePagePath``, you must also specify a value for
       * ``ResponseCode``.
       * We recommend that you store custom error pages in an Amazon S3 bucket. If you store custom error
       * pages on an HTTP server and the server starts to return 5xx errors, CloudFront can't get the files
       * that you want to return to viewers because the origin server is unavailable.
       */
      ResponsePagePath?: string;
    }[];
    /**
     * The user-defined HTTP server that serves as the origin for content that CF distributes.
     * This property is legacy. We recommend that you use
     * [Origin](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-origin.html)
     * instead.
     */
    CustomOrigin?: {
      /** The domain name assigned to your CF distribution. */
      DNSName: string;
      /**
       * The HTTP port that CF uses to connect to the origin. Specify the HTTP port that the origin listens
       * on.
       * @default 80
       */
      HTTPPort?: number;
      /**
       * The HTTPS port that CF uses to connect to the origin. Specify the HTTPS port that the origin
       * listens on.
       * @default 443
       */
      HTTPSPort?: number;
      /** Specifies the protocol (HTTP or HTTPS) that CF uses to connect to the origin. */
      OriginProtocolPolicy: string;
      /**
       * The minimum SSL/TLS protocol version that CF uses when communicating with your origin server over
       * HTTPs.
       * For more information, see [Minimum Origin SSL
       * Protocol](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesOriginSSLProtocols)
       * in the *Developer Guide*.
       * @uniqueItems false
       */
      OriginSSLProtocols: string[];
    };
    /**
     * A complex type that describes the default cache behavior if you don't specify a ``CacheBehavior``
     * element or if files don't match any of the values of ``PathPattern`` in ``CacheBehavior`` elements.
     * You must create exactly one default cache behavior.
     */
    DefaultCacheBehavior: {
      /**
       * A complex type that controls which HTTP methods CloudFront processes and forwards to your Amazon S3
       * bucket or your custom origin. There are three choices:
       * +  CloudFront forwards only ``GET`` and ``HEAD`` requests.
       * +  CloudFront forwards only ``GET``, ``HEAD``, and ``OPTIONS`` requests.
       * +  CloudFront forwards ``GET, HEAD, OPTIONS, PUT, PATCH, POST``, and ``DELETE`` requests.
       * If you pick the third choice, you may need to restrict access to your Amazon S3 bucket or to your
       * custom origin so users can't perform operations that you don't want them to. For example, you might
       * not want users to have permissions to delete objects from your origin.
       * @default ["GET","HEAD"]
       * @uniqueItems false
       */
      AllowedMethods?: string[];
      /**
       * The unique identifier of the cache policy that is attached to the default cache behavior. For more
       * information, see [Creating cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
       * or [Using the managed cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * A ``DefaultCacheBehavior`` must include either a ``CachePolicyId`` or ``ForwardedValues``. We
       * recommend that you use a ``CachePolicyId``.
       * @default ""
       */
      CachePolicyId?: string;
      /**
       * A complex type that controls whether CloudFront caches the response to requests using the specified
       * HTTP methods. There are two choices:
       * +  CloudFront caches responses to ``GET`` and ``HEAD`` requests.
       * +  CloudFront caches responses to ``GET``, ``HEAD``, and ``OPTIONS`` requests.
       * If you pick the second choice for your Amazon S3 Origin, you may need to forward
       * Access-Control-Request-Method, Access-Control-Request-Headers, and Origin headers for the responses
       * to be cached correctly.
       * @default ["GET","HEAD"]
       * @uniqueItems false
       */
      CachedMethods?: string[];
      /**
       * Whether you want CloudFront to automatically compress certain files for this cache behavior. If so,
       * specify ``true``; if not, specify ``false``. For more information, see [Serving Compressed
       * Files](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ServingCompressedFiles.html)
       * in the *Amazon CloudFront Developer Guide*.
       * @default false
       */
      Compress?: boolean;
      /**
       * This field only supports standard distributions. You can't specify this field for multi-tenant
       * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
       * in the *Amazon CloudFront Developer Guide*.
       * This field is deprecated. We recommend that you use the ``DefaultTTL`` field in a cache policy
       * instead of this field. For more information, see [Creating cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
       * or [Using the managed cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * The default amount of time that you want objects to stay in CloudFront caches before CloudFront
       * forwards another request to your origin to determine whether the object has been updated. The value
       * that you specify applies only when your origin does not add HTTP headers such as ``Cache-Control
       * max-age``, ``Cache-Control s-maxage``, and ``Expires`` to objects. For more information, see
       * [Managing How Long Content Stays in an Edge Cache
       * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
       * in the *Amazon CloudFront Developer Guide*.
       * @default 86400
       */
      DefaultTTL?: number;
      /**
       * The value of ``ID`` for the field-level encryption configuration that you want CloudFront to use
       * for encrypting specific fields of data for the default cache behavior.
       * @default ""
       */
      FieldLevelEncryptionId?: string;
      /**
       * This field is deprecated. We recommend that you use a cache policy or an origin request policy
       * instead of this field. For more information, see [Working with
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/working-with-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * If you want to include values in the cache key, use a cache policy. For more information, see
       * [Creating cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
       * or [Using the managed cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * If you want to send values to the origin but not include them in the cache key, use an origin
       * request policy. For more information, see [Creating origin request
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
       * or [Using the managed origin request
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * A ``DefaultCacheBehavior`` must include either a ``CachePolicyId`` or ``ForwardedValues``. We
       * recommend that you use a ``CachePolicyId``.
       * A complex type that specifies how CloudFront handles query strings, cookies, and HTTP headers.
       */
      ForwardedValues?: {
        /**
         * This field is deprecated. We recommend that you use a cache policy or an origin request policy
         * instead of this field.
         * If you want to include cookies in the cache key, use a cache policy. For more information, see
         * [Creating cache
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * If you want to send cookies to the origin but not include them in the cache key, use an origin
         * request policy. For more information, see [Creating origin request
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * A complex type that specifies whether you want CloudFront to forward cookies to the origin and, if
         * so, which ones. For more information about forwarding cookies to the origin, see [How CloudFront
         * Forwards, Caches, and Logs
         * Cookies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Cookies.html) in the
         * *Amazon CloudFront Developer Guide*.
         * @default {"Forward":"none"}
         */
        Cookies?: {
          /**
           * This field is deprecated. We recommend that you use a cache policy or an origin request policy
           * instead of this field.
           * If you want to include cookies in the cache key, use a cache policy. For more information, see
           * [Creating cache
           * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
           * in the *Amazon CloudFront Developer Guide*.
           * If you want to send cookies to the origin but not include them in the cache key, use origin
           * request policy. For more information, see [Creating origin request
           * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
           * in the *Amazon CloudFront Developer Guide*.
           * Specifies which cookies to forward to the origin for this cache behavior: all, none, or the list
           * of cookies specified in the ``WhitelistedNames`` complex type.
           * Amazon S3 doesn't process cookies. When the cache behavior is forwarding requests to an Amazon S3
           * origin, specify none for the ``Forward`` element.
           */
          Forward: string;
          /**
           * This field is deprecated. We recommend that you use a cache policy or an origin request policy
           * instead of this field.
           * If you want to include cookies in the cache key, use a cache policy. For more information, see
           * [Creating cache
           * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
           * in the *Amazon CloudFront Developer Guide*.
           * If you want to send cookies to the origin but not include them in the cache key, use an origin
           * request policy. For more information, see [Creating origin request
           * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
           * in the *Amazon CloudFront Developer Guide*.
           * Required if you specify ``whitelist`` for the value of ``Forward``. A complex type that specifies
           * how many different cookies you want CloudFront to forward to the origin for this cache behavior
           * and, if you want to forward selected cookies, the names of those cookies.
           * If you specify ``all`` or ``none`` for the value of ``Forward``, omit ``WhitelistedNames``. If you
           * change the value of ``Forward`` from ``whitelist`` to ``all`` or ``none`` and you don't delete the
           * ``WhitelistedNames`` element and its child elements, CloudFront deletes them automatically.
           * For the current limit on the number of cookie names that you can whitelist for each cache
           * behavior, see [CloudFront
           * Limits](https://docs.aws.amazon.com/general/latest/gr/xrefaws_service_limits.html#limits_cloudfront)
           * in the *General Reference*.
           * @uniqueItems false
           */
          WhitelistedNames?: string[];
        };
        /**
         * This field is deprecated. We recommend that you use a cache policy or an origin request policy
         * instead of this field.
         * If you want to include headers in the cache key, use a cache policy. For more information, see
         * [Creating cache
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * If you want to send headers to the origin but not include them in the cache key, use an origin
         * request policy. For more information, see [Creating origin request
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * A complex type that specifies the ``Headers``, if any, that you want CloudFront to forward to the
         * origin for this cache behavior (whitelisted headers). For the headers that you specify, CloudFront
         * also caches separate versions of a specified object that is based on the header values in viewer
         * requests.
         * For more information, see [Caching Content Based on Request
         * Headers](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/header-caching.html) in
         * the *Amazon CloudFront Developer Guide*.
         * @uniqueItems false
         */
        Headers?: string[];
        /**
         * This field is deprecated. We recommend that you use a cache policy or an origin request policy
         * instead of this field.
         * If you want to include query strings in the cache key, use a cache policy. For more information,
         * see [Creating cache
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * If you want to send query strings to the origin but not include them in the cache key, use an
         * origin request policy. For more information, see [Creating origin request
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * Indicates whether you want CloudFront to forward query strings to the origin that is associated
         * with this cache behavior and cache based on the query string parameters. CloudFront behavior
         * depends on the value of ``QueryString`` and on the values that you specify for
         * ``QueryStringCacheKeys``, if any:
         * If you specify true for ``QueryString`` and you don't specify any values for
         * ``QueryStringCacheKeys``, CloudFront forwards all query string parameters to the origin and caches
         * based on all query string parameters. Depending on how many query string parameters and values you
         * have, this can adversely affect performance because CloudFront must forward more requests to the
         * origin.
         * If you specify true for ``QueryString`` and you specify one or more values for
         * ``QueryStringCacheKeys``, CloudFront forwards all query string parameters to the origin, but it
         * only caches based on the query string parameters that you specify.
         * If you specify false for ``QueryString``, CloudFront doesn't forward any query string parameters
         * to the origin, and doesn't cache based on query string parameters.
         * For more information, see [Configuring CloudFront to Cache Based on Query String
         * Parameters](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/QueryStringParameters.html)
         * in the *Amazon CloudFront Developer Guide*.
         */
        QueryString: boolean;
        /**
         * This field is deprecated. We recommend that you use a cache policy or an origin request policy
         * instead of this field.
         * If you want to include query strings in the cache key, use a cache policy. For more information,
         * see [Creating cache
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * If you want to send query strings to the origin but not include them in the cache key, use an
         * origin request policy. For more information, see [Creating origin request
         * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
         * in the *Amazon CloudFront Developer Guide*.
         * A complex type that contains information about the query string parameters that you want
         * CloudFront to use for caching for this cache behavior.
         * @uniqueItems false
         */
        QueryStringCacheKeys?: string[];
      };
      /**
       * A list of CloudFront functions that are associated with this cache behavior. Your functions must be
       * published to the ``LIVE`` stage to associate them with a cache behavior.
       * @uniqueItems false
       */
      FunctionAssociations?: {
        /**
         * The event type of the function, either ``viewer-request`` or ``viewer-response``. You cannot use
         * origin-facing event types (``origin-request`` and ``origin-response``) with a CloudFront function.
         */
        EventType?: string;
        /** The Amazon Resource Name (ARN) of the function. */
        FunctionARN?: string;
      }[];
      /** The gRPC configuration for your cache behavior. */
      GrpcConfig?: {
        /**
         * Enables your CloudFront distribution to receive gRPC requests and to proxy them directly to your
         * origins.
         */
        Enabled: boolean;
      };
      /**
       * A complex type that contains zero or more Lambda@Edge function associations for a cache behavior.
       * @uniqueItems false
       */
      LambdaFunctionAssociations?: {
        /**
         * Specifies the event type that triggers a Lambda@Edge function invocation. You can specify the
         * following values:
         * +  ``viewer-request``: The function executes when CloudFront receives a request from a viewer and
         * before it checks to see whether the requested object is in the edge cache.
         * +  ``origin-request``: The function executes only when CloudFront sends a request to your origin.
         * When the requested object is in the edge cache, the function doesn't execute.
         * +  ``origin-response``: The function executes after CloudFront receives a response from the
         * origin and before it caches the object in the response. When the requested object is in the edge
         * cache, the function doesn't execute.
         * +  ``viewer-response``: The function executes before CloudFront returns the requested object to
         * the viewer. The function executes regardless of whether the object was already in the edge cache.
         * If the origin returns an HTTP status code other than HTTP 200 (OK), the function doesn't execute.
         */
        EventType?: string;
        /**
         * A flag that allows a Lambda@Edge function to have read access to the body content. For more
         * information, see [Accessing the Request Body by Choosing the Include Body
         * Option](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/lambda-include-body-access.html)
         * in the Amazon CloudFront Developer Guide.
         */
        IncludeBody?: boolean;
        /**
         * The ARN of the Lambda@Edge function. You must specify the ARN of a function version; you can't
         * specify an alias or $LATEST.
         */
        LambdaFunctionARN?: string;
      }[];
      /**
       * This field only supports standard distributions. You can't specify this field for multi-tenant
       * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
       * in the *Amazon CloudFront Developer Guide*.
       * This field is deprecated. We recommend that you use the ``MaxTTL`` field in a cache policy
       * instead of this field. For more information, see [Creating cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
       * or [Using the managed cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * The maximum amount of time that you want objects to stay in CloudFront caches before CloudFront
       * forwards another request to your origin to determine whether the object has been updated. The value
       * that you specify applies only when your origin adds HTTP headers such as ``Cache-Control max-age``,
       * ``Cache-Control s-maxage``, and ``Expires`` to objects. For more information, see [Managing How
       * Long Content Stays in an Edge Cache
       * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
       * in the *Amazon CloudFront Developer Guide*.
       * @default 31536000
       */
      MaxTTL?: number;
      /**
       * This field only supports standard distributions. You can't specify this field for multi-tenant
       * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
       * in the *Amazon CloudFront Developer Guide*.
       * This field is deprecated. We recommend that you use the ``MinTTL`` field in a cache policy
       * instead of this field. For more information, see [Creating cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html#cache-key-create-cache-policy)
       * or [Using the managed cache
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * The minimum amount of time that you want objects to stay in CloudFront caches before CloudFront
       * forwards another request to your origin to determine whether the object has been updated. For more
       * information, see [Managing How Long Content Stays in an Edge Cache
       * (Expiration)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html)
       * in the *Amazon CloudFront Developer Guide*.
       * You must specify ``0`` for ``MinTTL`` if you configure CloudFront to forward all headers to your
       * origin (under ``Headers``, if you specify ``1`` for ``Quantity`` and ``*`` for ``Name``).
       * @default 0
       */
      MinTTL?: number;
      /**
       * The unique identifier of the origin request policy that is attached to the default cache behavior.
       * For more information, see [Creating origin request
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html#origin-request-create-origin-request-policy)
       * or [Using the managed origin request
       * policies](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-origin-request-policies.html)
       * in the *Amazon CloudFront Developer Guide*.
       * @default ""
       */
      OriginRequestPolicyId?: string;
      /**
       * The Amazon Resource Name (ARN) of the real-time log configuration that is attached to this cache
       * behavior. For more information, see [Real-time
       * logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/real-time-logs.html) in
       * the *Amazon CloudFront Developer Guide*.
       * @default ""
       */
      RealtimeLogConfigArn?: string;
      /**
       * The identifier for a response headers policy.
       * @default ""
       */
      ResponseHeadersPolicyId?: string;
      /**
       * This field only supports standard distributions. You can't specify this field for multi-tenant
       * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
       * in the *Amazon CloudFront Developer Guide*.
       * Indicates whether you want to distribute media files in the Microsoft Smooth Streaming format
       * using the origin that is associated with this cache behavior. If so, specify ``true``; if not,
       * specify ``false``. If you specify ``true`` for ``SmoothStreaming``, you can still distribute other
       * content using this cache behavior if the content matches the value of ``PathPattern``.
       * @default false
       */
      SmoothStreaming?: boolean;
      /**
       * The value of ``ID`` for the origin that you want CloudFront to route requests to when they use the
       * default cache behavior.
       */
      TargetOriginId: string;
      /**
       * A list of key groups that CloudFront can use to validate signed URLs or signed cookies.
       * When a cache behavior contains trusted key groups, CloudFront requires signed URLs or signed
       * cookies for all requests that match the cache behavior. The URLs or cookies must be signed with a
       * private key whose corresponding public key is in the key group. The signed URL or cookie contains
       * information about which public key CloudFront should use to verify the signature. For more
       * information, see [Serving private
       * content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html) in
       * the *Amazon CloudFront Developer Guide*.
       * @uniqueItems false
       */
      TrustedKeyGroups?: string[];
      /**
       * We recommend using ``TrustedKeyGroups`` instead of ``TrustedSigners``.
       * This field only supports standard distributions. You can't specify this field for multi-tenant
       * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
       * in the *Amazon CloudFront Developer Guide*.
       * A list of AWS-account IDs whose public keys CloudFront can use to validate signed URLs or signed
       * cookies.
       * When a cache behavior contains trusted signers, CloudFront requires signed URLs or signed cookies
       * for all requests that match the cache behavior. The URLs or cookies must be signed with the private
       * key of a CloudFront key pair in a trusted signer's AWS-account. The signed URL or cookie contains
       * information about which public key CloudFront should use to verify the signature. For more
       * information, see [Serving private
       * content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html) in
       * the *Amazon CloudFront Developer Guide*.
       * @uniqueItems false
       */
      TrustedSigners?: string[];
      /**
       * The protocol that viewers can use to access the files in the origin specified by ``TargetOriginId``
       * when a request matches the path pattern in ``PathPattern``. You can specify the following options:
       * +  ``allow-all``: Viewers can use HTTP or HTTPS.
       * +  ``redirect-to-https``: If a viewer submits an HTTP request, CloudFront returns an HTTP status
       * code of 301 (Moved Permanently) to the viewer along with the HTTPS URL. The viewer then resubmits
       * the request using the new URL.
       * +  ``https-only``: If a viewer sends an HTTP request, CloudFront returns an HTTP status code of
       * 403 (Forbidden).
       * For more information about requiring the HTTPS protocol, see [Requiring HTTPS Between Viewers and
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-viewers-to-cloudfront.html)
       * in the *Amazon CloudFront Developer Guide*.
       * The only way to guarantee that viewers retrieve an object that was fetched from the origin using
       * HTTPS is never to use any other protocol to fetch the object. If you have recently changed from
       * HTTP to HTTPS, we recommend that you clear your objects' cache because cached objects are protocol
       * agnostic. That means that an edge location will return an object from the cache regardless of
       * whether the current request protocol matches the protocol used previously. For more information,
       * see [Managing Cache
       * Expiration](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html) in
       * the *Amazon CloudFront Developer Guide*.
       */
      ViewerProtocolPolicy: string;
    };
    /**
     * When a viewer requests the root URL for your distribution, the default root object is the object
     * that you want CloudFront to request from your origin. For example, if your root URL is
     * ``https://www.example.com``, you can specify CloudFront to return the ``index.html`` file as the
     * default root object. You can specify a default root object so that viewers see a specific file or
     * object, instead of another object in your distribution (for example,
     * ``https://www.example.com/product-description.html``). A default root object avoids exposing the
     * contents of your distribution.
     * You can specify the object name or a path to the object name (for example, ``index.html`` or
     * ``exampleFolderName/index.html``). Your string can't begin with a forward slash (``/``). Only
     * specify the object name or the path to the object.
     * If you don't want to specify a default root object when you create a distribution, include an
     * empty ``DefaultRootObject`` element.
     * To delete the default root object from an existing distribution, update the distribution
     * configuration and include an empty ``DefaultRootObject`` element.
     * To replace the default root object, update the distribution configuration and specify the new
     * object.
     * For more information about the default root object, see [Specify a default root
     * object](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DefaultRootObject.html)
     * in the *Amazon CloudFront Developer Guide*.
     * @default ""
     */
    DefaultRootObject?: string;
    /** From this field, you can enable or disable the selected distribution. */
    Enabled: boolean;
    /**
     * (Optional) Specify the HTTP version(s) that you want viewers to use to communicate with CF. The
     * default value for new distributions is ``http1.1``.
     * For viewers and CF to use HTTP/2, viewers must support TLSv1.2 or later, and must support Server
     * Name Indication (SNI).
     * For viewers and CF to use HTTP/3, viewers must support TLSv1.3 and Server Name Indication (SNI).
     * CF supports HTTP/3 connection migration to allow the viewer to switch networks without losing
     * connection. For more information about connection migration, see [Connection
     * Migration](https://docs.aws.amazon.com/https://www.rfc-editor.org/rfc/rfc9000.html#name-connection-migration)
     * at RFC 9000. For more information about supported TLSv1.3 ciphers, see [Supported protocols and
     * ciphers between viewers and
     * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html).
     * @default "http1.1"
     */
    HttpVersion?: string;
    /**
     * To use this field for a multi-tenant distribution, use a connection group instead. For more
     * information, see
     * [ConnectionGroup](https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_ConnectionGroup.html).
     * If you want CloudFront to respond to IPv6 DNS requests with an IPv6 address for your
     * distribution, specify ``true``. If you specify ``false``, CloudFront responds to IPv6 DNS requests
     * with the DNS response code ``NOERROR`` and with no IP addresses. This allows viewers to submit a
     * second request, for an IPv4 address for your distribution.
     * In general, you should enable IPv6 if you have users on IPv6 networks who want to access your
     * content. However, if you're using signed URLs or signed cookies to restrict access to your content,
     * and if you're using a custom policy that includes the ``IpAddress`` parameter to restrict the IP
     * addresses that can access your content, don't enable IPv6. If you want to restrict access to some
     * content by IP address and not restrict access to other content (or restrict access but not by IP
     * address), you can create two distributions. For more information, see [Creating a Signed URL Using
     * a Custom
     * Policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-creating-signed-url-custom-policy.html)
     * in the *Amazon CloudFront Developer Guide*.
     * If you're using an R53AWSIntlong alias resource record set to route traffic to your CloudFront
     * distribution, you need to create a second alias resource record set when both of the following are
     * true:
     * +  You enable IPv6 for the distribution
     * +  You're using alternate domain names in the URLs for your objects
     * For more information, see [Routing Traffic to an Amazon CloudFront Web Distribution by Using Your
     * Domain
     * Name](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html)
     * in the *Developer Guide*.
     * If you created a CNAME resource record set, either with R53AWSIntlong or with another DNS service,
     * you don't need to make any changes. A CNAME record will route traffic to your distribution
     * regardless of the IP address format of the viewer request.
     */
    IPV6Enabled?: boolean;
    /**
     * A complex type that controls whether access logs are written for the distribution.
     * For more information about logging, see [Access
     * Logs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html) in the
     * *Amazon CloudFront Developer Guide*.
     */
    Logging?: {
      /**
       * The Amazon S3 bucket to store the access logs in, for example,
       * ``amzn-s3-demo-bucket.s3.amazonaws.com``.
       */
      Bucket?: string;
      /**
       * Specifies whether you want CloudFront to include cookies in access logs, specify ``true`` for
       * ``IncludeCookies``. If you choose to include cookies in logs, CloudFront logs all cookies
       * regardless of how you configure the cache behaviors for this distribution. If you don't want to
       * include cookies when you create a distribution or if you want to disable include cookies for an
       * existing distribution, specify ``false`` for ``IncludeCookies``.
       * @default false
       */
      IncludeCookies?: boolean;
      /**
       * An optional string that you want CloudFront to prefix to the access log ``filenames`` for this
       * distribution, for example, ``myprefix/``. If you want to enable logging, but you don't want to
       * specify a prefix, you still must include an empty ``Prefix`` element in the ``Logging`` element.
       * @default ""
       */
      Prefix?: string;
    };
    /**
     * A complex type that contains information about origin groups for this distribution.
     * Specify a value for either the ``Origins`` or ``OriginGroups`` property.
     */
    OriginGroups?: {
      /**
       * The items (origin groups) in a distribution.
       * @uniqueItems false
       */
      Items?: ({
        /** A complex type that contains information about the failover criteria for an origin group. */
        FailoverCriteria: {
          /**
           * The status codes that, when returned from the primary origin, will trigger CloudFront to failover
           * to the second origin.
           */
          StatusCodes: {
            /**
             * The items (status codes) for an origin group.
             * @uniqueItems false
             */
            Items: number[];
            /** The number of status codes. */
            Quantity: number;
          };
        };
        /** The origin group's ID. */
        Id: string;
        /** A complex type that contains information about the origins in an origin group. */
        Members: {
          /**
           * Items (origins) in an origin group.
           * @uniqueItems false
           */
          Items: {
            /** The ID for an origin in an origin group. */
            OriginId: string;
          }[];
          /** The number of origins in an origin group. */
          Quantity: number;
        };
        /**
         * The selection criteria for the origin group. For more information, see [Create an origin
         * group](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/high_availability_origin_failover.html#concept_origin_groups.creating)
         * in the *Amazon CloudFront Developer Guide*.
         */
        SelectionCriteria?: "default" | "media-quality-based";
      })[];
      /** The number of origin groups. */
      Quantity: number;
    };
    /**
     * A complex type that contains information about origins for this distribution.
     * Specify a value for either the ``Origins`` or ``OriginGroups`` property.
     * @uniqueItems false
     */
    Origins?: ({
      /**
       * The number of times that CloudFront attempts to connect to the origin. The minimum number is 1, the
       * maximum is 3, and the default (if you don't specify otherwise) is 3.
       * For a custom origin (including an Amazon S3 bucket that's configured with static website hosting),
       * this value also specifies the number of times that CloudFront attempts to get a response from the
       * origin, in the case of an [Origin Response
       * Timeout](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesOriginResponseTimeout).
       * For more information, see [Origin Connection
       * Attempts](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#origin-connection-attempts)
       * in the *Amazon CloudFront Developer Guide*.
       */
      ConnectionAttempts?: number;
      /**
       * The number of seconds that CloudFront waits when trying to establish a connection to the origin.
       * The minimum timeout is 1 second, the maximum is 10 seconds, and the default (if you don't specify
       * otherwise) is 10 seconds.
       * For more information, see [Origin Connection
       * Timeout](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#origin-connection-timeout)
       * in the *Amazon CloudFront Developer Guide*.
       */
      ConnectionTimeout?: number;
      /**
       * The time (in seconds) that a request from CloudFront to the origin can stay open and wait for a
       * response. If the complete response isn't received from the origin by this time, CloudFront ends the
       * connection.
       * The value for ``ResponseCompletionTimeout`` must be equal to or greater than the value for
       * ``OriginReadTimeout``. If you don't set a value for ``ResponseCompletionTimeout``, CloudFront
       * doesn't enforce a maximum value.
       * For more information, see [Response completion
       * timeout](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html#response-completion-timeout)
       * in the *Amazon CloudFront Developer Guide*.
       */
      ResponseCompletionTimeout?: number;
      /**
       * Use this type to specify an origin that is not an Amazon S3 bucket, with one exception. If the
       * Amazon S3 bucket is configured with static website hosting, use this type. If the Amazon S3 bucket
       * is not configured with static website hosting, use the ``S3OriginConfig`` type instead.
       */
      CustomOriginConfig?: {
        /**
         * The HTTP port that CloudFront uses to connect to the origin. Specify the HTTP port that the origin
         * listens on.
         * @default 80
         */
        HTTPPort?: number;
        /**
         * The HTTPS port that CloudFront uses to connect to the origin. Specify the HTTPS port that the
         * origin listens on.
         * @default 443
         */
        HTTPSPort?: number;
        /**
         * Specifies how long, in seconds, CloudFront persists its connection to the origin. The minimum
         * timeout is 1 second, the maximum is 120 seconds, and the default (if you don't specify otherwise)
         * is 5 seconds.
         * For more information, see [Keep-alive timeout (custom origins
         * only)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html#DownloadDistValuesOriginKeepaliveTimeout)
         * in the *Amazon CloudFront Developer Guide*.
         * @default 5
         */
        OriginKeepaliveTimeout?: number;
        /**
         * Specifies the protocol (HTTP or HTTPS) that CloudFront uses to connect to the origin. Valid values
         * are:
         * +  ``http-only`` – CloudFront always uses HTTP to connect to the origin.
         * +  ``match-viewer`` – CloudFront connects to the origin using the same protocol that the viewer
         * used to connect to CloudFront.
         * +  ``https-only`` – CloudFront always uses HTTPS to connect to the origin.
         */
        OriginProtocolPolicy: string;
        /**
         * Specifies how long, in seconds, CloudFront waits for a response from the origin. This is also known
         * as the *origin response timeout*. The minimum timeout is 1 second, the maximum is 120 seconds, and
         * the default (if you don't specify otherwise) is 30 seconds.
         * For more information, see [Response
         * timeout](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html#DownloadDistValuesOriginResponseTimeout)
         * in the *Amazon CloudFront Developer Guide*.
         * @default 30
         */
        OriginReadTimeout?: number;
        /**
         * Specifies the minimum SSL/TLS protocol that CloudFront uses when connecting to your origin over
         * HTTPS. Valid values include ``SSLv3``, ``TLSv1``, ``TLSv1.1``, and ``TLSv1.2``.
         * For more information, see [Minimum Origin SSL
         * Protocol](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html#DownloadDistValuesOriginSSLProtocols)
         * in the *Amazon CloudFront Developer Guide*.
         * @default ["TLSv1","SSLv3"]
         * @uniqueItems false
         */
        OriginSSLProtocols?: string[];
        /**
         * Specifies which IP protocol CloudFront uses when connecting to your origin. If your origin uses
         * both IPv4 and IPv6 protocols, you can choose ``dualstack`` to help optimize reliability.
         * @enum ["ipv4","ipv6","dualstack"]
         */
        IpAddressType?: "ipv4" | "ipv6" | "dualstack";
      };
      /**
       * The domain name for the origin.
       * For more information, see [Origin Domain
       * Name](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesDomainName)
       * in the *Amazon CloudFront Developer Guide*.
       */
      DomainName: string;
      /**
       * A unique identifier for the origin. This value must be unique within the distribution.
       * Use this value to specify the ``TargetOriginId`` in a ``CacheBehavior`` or
       * ``DefaultCacheBehavior``.
       */
      Id: string;
      /**
       * The unique identifier of an origin access control for this origin.
       * For more information, see [Restricting access to an Amazon S3
       * origin](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
       * in the *Amazon CloudFront Developer Guide*.
       */
      OriginAccessControlId?: string;
      /**
       * A list of HTTP header names and values that CloudFront adds to the requests that it sends to the
       * origin.
       * For more information, see [Adding Custom Headers to Origin
       * Requests](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/add-origin-custom-headers.html)
       * in the *Amazon CloudFront Developer Guide*.
       * @uniqueItems false
       */
      OriginCustomHeaders?: {
        /**
         * The name of a header that you want CloudFront to send to your origin. For more information, see
         * [Adding Custom Headers to Origin
         * Requests](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/forward-custom-headers.html)
         * in the *Amazon CloudFront Developer Guide*.
         */
        HeaderName: string;
        /** The value for the header that you specified in the ``HeaderName`` field. */
        HeaderValue: string;
      }[];
      /**
       * An optional path that CloudFront appends to the origin domain name when CloudFront requests content
       * from the origin.
       * For more information, see [Origin
       * Path](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValuesOriginPath)
       * in the *Amazon CloudFront Developer Guide*.
       * @default ""
       */
      OriginPath?: string;
      /**
       * CloudFront Origin Shield. Using Origin Shield can help reduce the load on your origin.
       * For more information, see [Using Origin
       * Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html) in
       * the *Amazon CloudFront Developer Guide*.
       */
      OriginShield?: {
        /**
         * A flag that specifies whether Origin Shield is enabled.
         * When it's enabled, CloudFront routes all requests through Origin Shield, which can help protect
         * your origin. When it's disabled, CloudFront might send requests directly to your origin from
         * multiple edge locations or regional edge caches.
         */
        Enabled?: boolean;
        /**
         * The AWS-Region for Origin Shield.
         * Specify the AWS-Region that has the lowest latency to your origin. To specify a region, use the
         * region code, not the region name. For example, specify the US East (Ohio) region as ``us-east-2``.
         * When you enable CloudFront Origin Shield, you must specify the AWS-Region for Origin Shield. For
         * the list of AWS-Regions that you can specify, and for help choosing the best Region for your
         * origin, see [Choosing the for Origin
         * Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html#choose-origin-shield-region)
         * in the *Amazon CloudFront Developer Guide*.
         */
        OriginShieldRegion?: string;
      };
      /**
       * Use this type to specify an origin that is an Amazon S3 bucket that is not configured with static
       * website hosting. To specify any other type of origin, including an Amazon S3 bucket that is
       * configured with static website hosting, use the ``CustomOriginConfig`` type instead.
       */
      S3OriginConfig?: {
        /**
         * If you're using origin access control (OAC) instead of origin access identity, specify an empty
         * ``OriginAccessIdentity`` element. For more information, see [Restricting access to
         * an](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-origin.html)
         * in the *Amazon CloudFront Developer Guide*.
         * The CloudFront origin access identity to associate with the origin. Use an origin access identity
         * to configure the origin so that viewers can *only* access objects in an Amazon S3 bucket through
         * CloudFront. The format of the value is:
         * ``origin-access-identity/cloudfront/ID-of-origin-access-identity``
         * The ``ID-of-origin-access-identity`` is the value that CloudFront returned in the ``ID`` element
         * when you created the origin access identity.
         * If you want viewers to be able to access objects using either the CloudFront URL or the Amazon S3
         * URL, specify an empty ``OriginAccessIdentity`` element.
         * To delete the origin access identity from an existing distribution, update the distribution
         * configuration and include an empty ``OriginAccessIdentity`` element.
         * To replace the origin access identity, update the distribution configuration and specify the new
         * origin access identity.
         * For more information about the origin access identity, see [Serving Private Content through
         * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html)
         * in the *Amazon CloudFront Developer Guide*.
         * @default ""
         */
        OriginAccessIdentity?: string;
        /**
         * Specifies how long, in seconds, CloudFront waits for a response from the origin. This is also known
         * as the *origin response timeout*. The minimum timeout is 1 second, the maximum is 120 seconds, and
         * the default (if you don't specify otherwise) is 30 seconds.
         * For more information, see [Response
         * timeout](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html#DownloadDistValuesOriginResponseTimeout)
         * in the *Amazon CloudFront Developer Guide*.
         * @default 30
         */
        OriginReadTimeout?: number;
      };
      /** The VPC origin configuration. */
      VpcOriginConfig?: {
        /**
         * Specifies how long, in seconds, CloudFront persists its connection to the origin. The minimum
         * timeout is 1 second, the maximum is 120 seconds, and the default (if you don't specify otherwise)
         * is 5 seconds.
         * For more information, see [Keep-alive timeout (custom origins
         * only)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html#DownloadDistValuesOriginKeepaliveTimeout)
         * in the *Amazon CloudFront Developer Guide*.
         * @default 5
         */
        OriginKeepaliveTimeout?: number;
        /**
         * Specifies how long, in seconds, CloudFront waits for a response from the origin. This is also known
         * as the *origin response timeout*. The minimum timeout is 1 second, the maximum is 120 seconds, and
         * the default (if you don't specify otherwise) is 30 seconds.
         * For more information, see [Response
         * timeout](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DownloadDistValuesOrigin.html#DownloadDistValuesOriginResponseTimeout)
         * in the *Amazon CloudFront Developer Guide*.
         * @default 30
         */
        OriginReadTimeout?: number;
        OwnerAccountId?: string;
        /** The VPC origin ID. */
        VpcOriginId: string;
      };
    })[];
    /**
     * This field only supports standard distributions. You can't specify this field for multi-tenant
     * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
     * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
     * in the *Amazon CloudFront Developer Guide*.
     * The price class that corresponds with the maximum price that you want to pay for CloudFront
     * service. If you specify ``PriceClass_All``, CloudFront responds to requests for your objects from
     * all CloudFront edge locations.
     * If you specify a price class other than ``PriceClass_All``, CloudFront serves your objects from
     * the CloudFront edge location that has the lowest latency among the edge locations in your price
     * class. Viewers who are in or near regions that are excluded from your specified price class may
     * encounter slower performance.
     * For more information about price classes, see [Choosing the Price Class for a CloudFront
     * Distribution](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PriceClass.html)
     * in the *Amazon CloudFront Developer Guide*. For information about CloudFront pricing, including how
     * price classes (such as Price Class 100) map to CloudFront regions, see [Amazon CloudFront
     * Pricing](https://docs.aws.amazon.com/cloudfront/pricing/).
     * @default "PriceClass_All"
     */
    PriceClass?: string;
    /**
     * A complex type that identifies ways in which you want to restrict distribution of your content.
     * @default {"GeoRestriction":{"RestrictionType":"none"}}
     */
    Restrictions?: {
      /**
       * A complex type that controls the countries in which your content is distributed. CF determines the
       * location of your users using ``MaxMind`` GeoIP databases. To disable geo restriction, remove the
       * [Restrictions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-distributionconfig.html#cfn-cloudfront-distribution-distributionconfig-restrictions)
       * property from your stack template.
       */
      GeoRestriction: {
        /**
         * A complex type that contains a ``Location`` element for each country in which you want CloudFront
         * either to distribute your content (``whitelist``) or not distribute your content (``blacklist``).
         * The ``Location`` element is a two-letter, uppercase country code for a country that you want to
         * include in your ``blacklist`` or ``whitelist``. Include one ``Location`` element for each country.
         * CloudFront and ``MaxMind`` both use ``ISO 3166`` country codes. For the current list of countries
         * and the corresponding codes, see ``ISO 3166-1-alpha-2`` code on the *International Organization for
         * Standardization* website. You can also refer to the country list on the CloudFront console, which
         * includes both country names and codes.
         * @uniqueItems false
         */
        Locations?: string[];
        /**
         * The method that you want to use to restrict distribution of your content by country:
         * +  ``none``: No geo restriction is enabled, meaning access to content is not restricted by client
         * geo location.
         * +  ``blacklist``: The ``Location`` elements specify the countries in which you don't want
         * CloudFront to distribute your content.
         * +  ``whitelist``: The ``Location`` elements specify the countries in which you want CloudFront to
         * distribute your content.
         */
        RestrictionType: string;
      };
    };
    /**
     * The origin as an S3 bucket.
     * This property is legacy. We recommend that you use
     * [Origin](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-cloudfront-distribution-origin.html)
     * instead.
     */
    S3Origin?: {
      /** The domain name assigned to your CF distribution. */
      DNSName: string;
      /**
       * The CF origin access identity to associate with the distribution. Use an origin access identity to
       * configure the distribution so that end users can only access objects in an S3 through CF.
       * This property is legacy. We recommend that you use
       * [OriginAccessControl](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cloudfront-originaccesscontrol.html)
       * instead.
       * @default ""
       */
      OriginAccessIdentity?: string;
    };
    /**
     * This field only supports standard distributions. You can't specify this field for multi-tenant
     * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
     * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
     * in the *Amazon CloudFront Developer Guide*.
     * A Boolean that indicates whether this is a staging distribution. When this value is ``true``,
     * this is a staging distribution. When this value is ``false``, this is not a staging distribution.
     */
    Staging?: boolean;
    /**
     * This field only supports multi-tenant distributions. You can't specify this field for standard
     * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
     * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
     * in the *Amazon CloudFront Developer Guide*.
     * A distribution tenant configuration.
     */
    TenantConfig?: {
      ParameterDefinitions?: {
        /** The name of the parameter. */
        Name: string;
        /** The value that you assigned to the parameter. */
        Definition: {
          StringSchema?: {
            Comment?: string;
            DefaultValue?: string;
            Required: boolean;
          };
        };
      }[];
    };
    ViewerMtlsConfig?: {
      /** @default "required" */
      Mode?: "required" | "optional";
      TrustStoreConfig?: {
        TrustStoreId: string;
        AdvertiseTrustStoreCaNames?: boolean;
        IgnoreCertificateExpiry?: boolean;
      };
    };
    /**
     * A complex type that determines the distribution's SSL/TLS configuration for communicating with
     * viewers.
     * @default {"CloudFrontDefaultCertificate":true}
     */
    ViewerCertificate?: {
      /**
       * In CloudFormation, this field name is ``AcmCertificateArn``. Note the different capitalization.
       * If the distribution uses ``Aliases`` (alternate domain names or CNAMEs) and the SSL/TLS
       * certificate is stored in
       * [(ACM)](https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html), provide the Amazon
       * Resource Name (ARN) of the ACM certificate. CloudFront only supports ACM certificates in the US
       * East (N. Virginia) Region (``us-east-1``).
       * If you specify an ACM certificate ARN, you must also specify values for ``MinimumProtocolVersion``
       * and ``SSLSupportMethod``. (In CloudFormation, the field name is ``SslSupportMethod``. Note the
       * different capitalization.)
       */
      AcmCertificateArn?: string;
      /**
       * If the distribution uses the CloudFront domain name such as ``d111111abcdef8.cloudfront.net``, set
       * this field to ``true``.
       * If the distribution uses ``Aliases`` (alternate domain names or CNAMEs), omit this field and
       * specify values for the following fields:
       * +  ``AcmCertificateArn`` or ``IamCertificateId`` (specify a value for one, not both)
       * +   ``MinimumProtocolVersion``
       * +   ``SslSupportMethod``
       */
      CloudFrontDefaultCertificate?: boolean;
      /**
       * This field only supports standard distributions. You can't specify this field for multi-tenant
       * distributions. For more information, see [Unsupported features for SaaS Manager for Amazon
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-config-options.html#unsupported-saas)
       * in the *Amazon CloudFront Developer Guide*.
       * In CloudFormation, this field name is ``IamCertificateId``. Note the different capitalization.
       * If the distribution uses ``Aliases`` (alternate domain names or CNAMEs) and the SSL/TLS
       * certificate is stored in
       * [(IAM)](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_server-certs.html), provide
       * the ID of the IAM certificate.
       * If you specify an IAM certificate ID, you must also specify values for ``MinimumProtocolVersion``
       * and ``SSLSupportMethod``. (In CloudFormation, the field name is ``SslSupportMethod``. Note the
       * different capitalization.)
       */
      IamCertificateId?: string;
      /**
       * If the distribution uses ``Aliases`` (alternate domain names or CNAMEs), specify the security
       * policy that you want CloudFront to use for HTTPS connections with viewers. The security policy
       * determines two settings:
       * +  The minimum SSL/TLS protocol that CloudFront can use to communicate with viewers.
       * +  The ciphers that CloudFront can use to encrypt the content that it returns to viewers.
       * For more information, see [Security
       * Policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html#DownloadDistValues-security-policy)
       * and [Supported Protocols and Ciphers Between Viewers and
       * CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/secure-connections-supported-viewer-protocols-ciphers.html#secure-connections-supported-ciphers)
       * in the *Amazon CloudFront Developer Guide*.
       * On the CloudFront console, this setting is called *Security Policy*.
       * When you're using SNI only (you set ``SSLSupportMethod`` to ``sni-only``), you must specify
       * ``TLSv1`` or higher. (In CloudFormation, the field name is ``SslSupportMethod``. Note the different
       * capitalization.)
       * If the distribution uses the CloudFront domain name such as ``d111111abcdef8.cloudfront.net`` (you
       * set ``CloudFrontDefaultCertificate`` to ``true``), CloudFront automatically sets the security
       * policy to ``TLSv1`` regardless of the value that you set here.
       */
      MinimumProtocolVersion?: string;
      /**
       * In CloudFormation, this field name is ``SslSupportMethod``. Note the different capitalization.
       * If the distribution uses ``Aliases`` (alternate domain names or CNAMEs), specify which viewers
       * the distribution accepts HTTPS connections from.
       * +  ``sni-only`` – The distribution accepts HTTPS connections from only viewers that support
       * [server name indication
       * (SNI)](https://docs.aws.amazon.com/https://en.wikipedia.org/wiki/Server_Name_Indication). This is
       * recommended. Most browsers and clients support SNI.
       * +  ``vip`` – The distribution accepts HTTPS connections from all viewers including those that
       * don't support SNI. This is not recommended, and results in additional monthly charges from
       * CloudFront.
       * +  ``static-ip`` - Do not specify this value unless your distribution has been enabled for this
       * feature by the CloudFront team. If you have a use case that requires static IP addresses for a
       * distribution, contact CloudFront through the [Center](https://docs.aws.amazon.com/support/home).
       * If the distribution uses the CloudFront domain name such as ``d111111abcdef8.cloudfront.net``,
       * don't set a value for this field.
       */
      SslSupportMethod?: string;
    };
    /**
     * Multi-tenant distributions only support WAF V2 web ACLs.
     * A unique identifier that specifies the WAF web ACL, if any, to associate with this distribution.
     * To specify a web ACL created using the latest version of WAF, use the ACL ARN, for example
     * ``arn:aws:wafv2:us-east-1:123456789012:global/webacl/ExampleWebACL/a1b2c3d4-5678-90ab-cdef-EXAMPLE11111``.
     * To specify a web ACL created using WAF Classic, use the ACL ID, for example
     * ``a1b2c3d4-5678-90ab-cdef-EXAMPLE11111``.
     * WAF is a web application firewall that lets you monitor the HTTP and HTTPS requests that are
     * forwarded to CloudFront, and lets you control access to your content. Based on conditions that you
     * specify, such as the IP addresses that requests originate from or the values of query strings,
     * CloudFront responds to requests either with the requested content or with an HTTP 403 status code
     * (Forbidden). You can also configure CloudFront to return a custom error page when a request is
     * blocked. For more information about WAF, see the [Developer
     * Guide](https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html).
     * @default ""
     */
    WebACLId?: string;
  };
  DomainName?: string;
  Id?: string;
  /**
   * A complex type that contains zero or more ``Tag`` elements.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * A string that contains ``Tag`` key.
     * The string length should be between 1 and 128 characters. Valid characters include ``a-z``,
     * ``A-Z``, ``0-9``, space, and the special characters ``_ - . : / = + @``.
     */
    Key: string;
    /**
     * A string that contains an optional ``Tag`` value.
     * The string length should be between 0 and 256 characters. Valid characters include ``a-z``,
     * ``A-Z``, ``0-9``, space, and the special characters ``_ - . : / = + @``.
     */
    Value: string;
  }[];
};


/** Resource Type definition for AWS::CloudFormation::CustomResource */
export type AwsCloudformationCustomresource = {
  ServiceToken: string;
  ServiceTimeout?: number;
  Id?: string;
};


/** Resource Type definition for AWS::Route53::RecordSet */
export type AwsRoute53Recordset = {
  HealthCheckId?: string;
  AliasTarget?: {
    DNSName: string;
    HostedZoneId: string;
    EvaluateTargetHealth?: boolean;
  };
  Comment?: string;
  HostedZoneName?: string;
  /** @uniqueItems false */
  ResourceRecords?: string[];
  HostedZoneId?: string;
  SetIdentifier?: string;
  TTL?: string;
  Weight?: number;
  Name: string;
  Type: string;
  CidrRoutingConfig?: {
    CollectionId: string;
    LocationName: string;
  };
  Failover?: string;
  GeoProximityLocation?: {
    AWSRegion?: string;
    LocalZoneGroup?: string;
    Bias?: number;
    Coordinates?: {
      Longitude: string;
      Latitude: string;
    };
  };
  Region?: string;
  GeoLocation?: {
    ContinentCode?: string;
    CountryCode?: string;
    SubdivisionCode?: string;
  };
  Id?: string;
  MultiValueAnswer?: boolean;
};


/**
 * Creates a new role for your AWS-account.
 * For more information about roles, see [IAM
 * roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html) in the *IAM User Guide*. For
 * information about quotas for role names and the number of roles you can create, see [IAM and
 * quotas](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html) in the *IAM
 * User Guide*.
 */
export type AwsIamRole = {
  Arn?: string;
  /**
   * The trust policy that is associated with this role. Trust policies define which entities can assume
   * the role. You can associate only one trust policy with a role. For an example of a policy that can
   * be used to assume a role, see [Template
   * Examples](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-role.html#aws-resource-iam-role--examples).
   * For more information about the elements that you can use in an IAM policy, see [Policy Elements
   * Reference](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html) in
   * the *User Guide*.
   */
  AssumeRolePolicyDocument: Record<string, unknown> | string;
  /** A description of the role that you provide. */
  Description?: string;
  /**
   * A list of Amazon Resource Names (ARNs) of the IAM managed policies that you want to attach to the
   * role.
   * For more information about ARNs, see [Amazon Resource Names (ARNs) and Service
   * Namespaces](https://docs.aws.amazon.com/general/latest/gr/aws-arns-and-namespaces.html) in the
   * *General Reference*.
   * @uniqueItems true
   */
  ManagedPolicyArns?: string[];
  /**
   * The maximum session duration (in seconds) that you want to set for the specified role. If you do
   * not specify a value for this setting, the default value of one hour is applied. This setting can
   * have a value from 1 hour to 12 hours.
   * Anyone who assumes the role from the CLI or API can use the ``DurationSeconds`` API parameter or
   * the ``duration-seconds``CLI parameter to request a longer session. The ``MaxSessionDuration``
   * setting determines the maximum duration that can be requested using the ``DurationSeconds``
   * parameter. If users don't specify a value for the ``DurationSeconds`` parameter, their security
   * credentials are valid for one hour by default. This applies when you use the ``AssumeRole*`` API
   * operations or the ``assume-role*``CLI operations but does not apply when you use those operations
   * to create a console URL. For more information, see [Using IAM
   * roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use.html) in the *IAM User Guide*.
   */
  MaxSessionDuration?: number;
  /**
   * The path to the role. For more information about paths, see [IAM
   * Identifiers](https://docs.aws.amazon.com/IAM/latest/UserGuide/Using_Identifiers.html) in the *IAM
   * User Guide*.
   * This parameter is optional. If it is not included, it defaults to a slash (/).
   * This parameter allows (through its [regex
   * pattern](https://docs.aws.amazon.com/http://wikipedia.org/wiki/regex)) a string of characters
   * consisting of either a forward slash (/) by itself or a string that must begin and end with forward
   * slashes. In addition, it can contain any ASCII character from the ! (``\u0021``) through the DEL
   * character (``\u007F``), including most punctuation characters, digits, and upper and lowercased
   * letters.
   * @default "/"
   */
  Path?: string;
  /**
   * The ARN of the policy used to set the permissions boundary for the role.
   * For more information about permissions boundaries, see [Permissions boundaries for IAM
   * identities](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html) in
   * the *IAM User Guide*.
   */
  PermissionsBoundary?: string;
  /**
   * Adds or updates an inline policy document that is embedded in the specified IAM role.
   * When you embed an inline policy in a role, the inline policy is used as part of the role's access
   * (permissions) policy. The role's trust policy is created at the same time as the role. You can
   * update a role's trust policy later. For more information about IAM roles, go to [Using Roles to
   * Delegate Permissions and Federate
   * Identities](https://docs.aws.amazon.com/IAM/latest/UserGuide/roles-toplevel.html).
   * A role can also have an attached managed policy. For information about policies, see [Managed
   * Policies and Inline
   * Policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/policies-managed-vs-inline.html) in the
   * *User Guide*.
   * For information about limits on the number of inline policies that you can embed with a role, see
   * [Limitations on
   * Entities](https://docs.aws.amazon.com/IAM/latest/UserGuide/LimitationsOnEntities.html) in the *User
   * Guide*.
   * If an external policy (such as ``AWS::IAM::Policy`` or ``AWS::IAM::ManagedPolicy``) has a ``Ref``
   * to a role and if a resource (such as ``AWS::ECS::Service``) also has a ``Ref`` to the same role,
   * add a ``DependsOn`` attribute to the resource to make the resource depend on the external policy.
   * This dependency ensures that the role's policy is available throughout the resource's lifecycle.
   * For example, when you delete a stack with an ``AWS::ECS::Service`` resource, the ``DependsOn``
   * attribute ensures that CFN deletes the ``AWS::ECS::Service`` resource before deleting its role's
   * policy.
   * @uniqueItems false
   */
  Policies?: ({
    /**
     * The entire contents of the policy that defines permissions. For more information, see [Overview of
     * JSON
     * policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html#access_policies-json).
     */
    PolicyDocument: string | Record<string, unknown>;
    /** The friendly name (not ARN) identifying the policy. */
    PolicyName: string;
  })[];
  RoleId?: string;
  /**
   * A name for the IAM role, up to 64 characters in length. For valid values, see the ``RoleName``
   * parameter for the
   * [CreateRole](https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateRole.html) action in the
   * *User Guide*.
   * This parameter allows (per its [regex
   * pattern](https://docs.aws.amazon.com/http://wikipedia.org/wiki/regex)) a string of characters
   * consisting of upper and lowercase alphanumeric characters with no spaces. You can also include any
   * of the following characters: _+=,.@-. The role name must be unique within the account. Role names
   * are not distinguished by case. For example, you cannot create roles named both "Role1" and "role1".
   * If you don't specify a name, CFN generates a unique physical ID and uses that ID for the role
   * name.
   * If you specify a name, you must specify the ``CAPABILITY_NAMED_IAM`` value to acknowledge your
   * template's capabilities. For more information, see [Acknowledging Resources in
   * Templates](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-iam-template.html#using-iam-capabilities).
   * Naming an IAM resource can cause an unrecoverable error if you reuse the same template in
   * multiple Regions. To prevent this, we recommend using ``Fn::Join`` and ``AWS::Region`` to create a
   * Region-specific name, as in the following example: ``{"Fn::Join": ["", [{"Ref": "AWS::Region"},
   * {"Ref": "MyResourceName"}]]}``.
   */
  RoleName?: string;
  /**
   * A list of tags that are attached to the role. For more information about tagging, see [Tagging IAM
   * resources](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_tags.html) in the *IAM User Guide*.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name that can be used to look up or retrieve the associated value. For example,
     * ``Department`` or ``Cost Center`` are common choices.
     */
    Key: string;
    /**
     * The value associated with this tag. For example, tags with a key name of ``Department`` could have
     * values such as ``Human Resources``, ``Accounting``, and ``Support``. Tags with a key name of ``Cost
     * Center`` might have values that consist of the number associated with the different cost centers in
     * your company. Typically, many resources have tags with the same key name but with different values.
     */
    Value: string;
  }[];
};


/**
 * The ``AWS::Lambda::Function`` resource creates a Lambda function. To create a function, you need a
 * [deployment package](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-package.html) and
 * an [execution role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html).
 * The deployment package is a .zip file archive or container image that contains your function code.
 * The execution role grants the function permission to use AWS services, such as Amazon CloudWatch
 * Logs for log streaming and AWS X-Ray for request tracing.
 * You set the package type to ``Image`` if the deployment package is a [container
 * image](https://docs.aws.amazon.com/lambda/latest/dg/lambda-images.html). For these functions,
 * include the URI of the container image in the ECR registry in the [ImageUri property of the Code
 * property](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html#cfn-lambda-function-code-imageuri).
 * You do not need to specify the handler and runtime properties.
 * You set the package type to ``Zip`` if the deployment package is a [.zip file
 * archive](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-package.html#gettingstarted-package-zip).
 * For these functions, specify the S3 location of your .zip file in the ``Code`` property.
 * Alternatively, for Node.js and Python functions, you can define your function inline in the
 * [ZipFile property of the Code
 * property](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html#cfn-lambda-function-code-zipfile).
 * In both cases, you must also specify the handler and runtime properties.
 * You can use [code
 * signing](https://docs.aws.amazon.com/lambda/latest/dg/configuration-codesigning.html) if your
 * deployment package is a .zip file archive. To enable code signing for this function, specify the
 * ARN of a code-signing configuration. When a user attempts to deploy a code package with
 * ``UpdateFunctionCode``, Lambda checks that the code package has a valid signature from a trusted
 * publisher. The code-signing configuration includes a set of signing profiles, which define the
 * trusted publishers for this function.
 * When you update a ``AWS::Lambda::Function`` resource, CFNshort calls the
 * [UpdateFunctionConfiguration](https://docs.aws.amazon.com/lambda/latest/api/API_UpdateFunctionConfiguration.html)
 * and
 * [UpdateFunctionCode](https://docs.aws.amazon.com/lambda/latest/api/API_UpdateFunctionCode.html)LAM
 * APIs under the hood. Because these calls happen sequentially, and invocations can happen between
 * these calls, your function may encounter errors in the time between the calls. For example, if you
 * remove an environment variable, and the code that references that environment variable in the same
 * CFNshort update, you may see invocation errors related to a missing environment variable. To work
 * around this, you can invoke your function against a version or alias by default, rather than the
 * ``$LATEST`` version.
 * Note that you configure [provisioned
 * concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html) on a
 * ``AWS::Lambda::Version`` or a ``AWS::Lambda::Alias``.
 * For a complete introduction to Lambda functions, see [What is
 * Lambda?](https://docs.aws.amazon.com/lambda/latest/dg/lambda-welcome.html) in the *Lambda developer
 * guide.*
 */
export type AwsLambdaFunction = {
  /**
   * A description of the function.
   * @maxLength 256
   */
  Description?: string;
  /**
   * Set ``Mode`` to ``Active`` to sample and trace a subset of incoming requests with
   * [X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html).
   */
  TracingConfig?: {
    /**
     * The tracing mode.
     * @enum ["Active","PassThrough"]
     */
    Mode?: "Active" | "PassThrough";
  };
  /**
   * For network connectivity to AWS resources in a VPC, specify a list of security groups and subnets
   * in the VPC. When you connect a function to a VPC, it can access resources and the internet only
   * through that VPC. For more information, see [Configuring a Lambda function to access resources in a
   * VPC](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html).
   */
  VpcConfig?: {
    /** Allows outbound IPv6 traffic on VPC functions that are connected to dual-stack subnets. */
    Ipv6AllowedForDualStack?: boolean;
    /**
     * A list of VPC security group IDs.
     * @maxItems 5
     * @uniqueItems false
     */
    SecurityGroupIds?: string[];
    /**
     * A list of VPC subnet IDs.
     * @maxItems 16
     * @uniqueItems false
     */
    SubnetIds?: string[];
  };
  /**
   * Sets the runtime management configuration for a function's version. For more information, see
   * [Runtime updates](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-update.html).
   */
  RuntimeManagementConfig?: {
    /**
     * Specify the runtime update mode.
     * +  *Auto (default)* - Automatically update to the most recent and secure runtime version using a
     * [Two-phase runtime version
     * rollout](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-update.html#runtime-management-two-phase).
     * This is the best choice for most customers to ensure they always benefit from runtime updates.
     * +  *FunctionUpdate* - LAM updates the runtime of you function to the most recent and secure
     * runtime version when you update your function. This approach synchronizes runtime updates with
     * function deployments, giving you control over when runtime updates are applied and allowing you to
     * detect and mitigate rare runtime update incompatibilities early. When using this setting, you need
     * to regularly update your functions to keep their runtime up-to-date.
     * +  *Manual* - You specify a runtime version in your function configuration. The function will use
     * this runtime version indefinitely. In the rare case where a new runtime version is incompatible
     * with an existing function, this allows you to roll back your function to an earlier runtime
     * version. For more information, see [Roll back a runtime
     * version](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-update.html#runtime-management-rollback).
     * *Valid Values*: ``Auto`` | ``FunctionUpdate`` | ``Manual``
     * @enum ["Auto","FunctionUpdate","Manual"]
     */
    UpdateRuntimeOn: "Auto" | "FunctionUpdate" | "Manual";
    /**
     * The ARN of the runtime version you want the function to use.
     * This is only required if you're using the *Manual* runtime update mode.
     */
    RuntimeVersionArn?: string;
  };
  /**
   * The number of simultaneous executions to reserve for the function.
   * @minimum 0
   */
  ReservedConcurrentExecutions?: number;
  /** The function's [SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html) setting. */
  SnapStart?: {
    /**
     * Set ``ApplyOn`` to ``PublishedVersions`` to create a snapshot of the initialized execution
     * environment when you publish a function version.
     * @enum ["PublishedVersions","None"]
     */
    ApplyOn: "PublishedVersions" | "None";
  };
  /**
   * Connection settings for an Amazon EFS file system. To connect a function to a file system, a mount
   * target must be available in every Availability Zone that your function connects to. If your
   * template contains an
   * [AWS::EFS::MountTarget](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-efs-mounttarget.html)
   * resource, you must also specify a ``DependsOn`` attribute to ensure that the mount target is
   * created or updated before the function.
   * For more information about using the ``DependsOn`` attribute, see [DependsOn
   * Attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-dependson.html).
   * @maxItems 1
   */
  FileSystemConfigs?: {
    /**
     * The Amazon Resource Name (ARN) of the Amazon EFS access point that provides access to the file
     * system.
     * @maxLength 200
     * @pattern ^arn:aws[a-zA-Z-]*:elasticfilesystem:(eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}:\d{12}:access-point/fsap-[a-f0-9]{17}$
     */
    Arn: string;
    /**
     * The path where the function can access the file system, starting with ``/mnt/``.
     * @maxLength 160
     * @pattern ^/mnt/[a-zA-Z0-9-_.]+$
     */
    LocalMountPath: string;
  }[];
  /**
   * The name of the Lambda function, up to 64 characters in length. If you don't specify a name, CFN
   * generates one.
   * If you specify a name, you cannot perform updates that require replacement of this resource. You
   * can perform updates that require no or some interruption. If you must replace the resource, specify
   * a new name.
   * @minLength 1
   */
  FunctionName?: string;
  /**
   * The identifier of the function's
   * [runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html). Runtime is required
   * if the deployment package is a .zip file archive. Specifying a runtime results in an error if
   * you're deploying a function using a container image.
   * The following list includes deprecated runtimes. Lambda blocks creating new functions and updating
   * existing functions shortly after each runtime is deprecated. For more information, see [Runtime use
   * after
   * deprecation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html#runtime-deprecation-levels).
   * For a list of all currently supported runtimes, see [Supported
   * runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html#runtimes-supported).
   */
  Runtime?: string;
  /**
   * The ARN of the KMSlong (KMS) customer managed key that's used to encrypt the following resources:
   * +  The function's [environment
   * variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-encryption).
   * +  The function's [Lambda
   * SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart-security.html) snapshots.
   * +  When used with ``SourceKMSKeyArn``, the unzipped version of the .zip deployment package that's
   * used for function invocations. For more information, see [Specifying a customer managed key for
   * Lambda](https://docs.aws.amazon.com/lambda/latest/dg/encrypt-zip-package.html#enable-zip-custom-encryption).
   * +  The optimized version of the container image that's used for function invocations. Note that
   * this is not the same key that's used to protect your container image in the Amazon Elastic
   * Container Registry (Amazon ECR). For more information, see [Function
   * lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html#images-lifecycle).
   * If you don't provide a customer managed key, Lambda uses an [owned
   * key](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-owned-cmk) or an
   * [](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk).
   * @pattern ^(arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()$
   */
  KmsKeyArn?: string;
  /**
   * The type of deployment package. Set to ``Image`` for container image and set ``Zip`` for .zip file
   * archive.
   * @enum ["Image","Zip"]
   */
  PackageType?: "Image" | "Zip";
  /**
   * To enable code signing for this function, specify the ARN of a code-signing configuration. A
   * code-signing configuration includes a set of signing profiles, which define the trusted publishers
   * for this function.
   * @pattern arn:(aws[a-zA-Z-]*)?:lambda:(eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}:\d{12}:code-signing-config:csc-[a-z0-9]{17}
   */
  CodeSigningConfigArn?: string;
  /**
   * A list of [function layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html)
   * to add to the function's execution environment. Specify each layer by its ARN, including the
   * version.
   * @uniqueItems false
   */
  Layers?: string[];
  TenancyConfig?: {
    /**
     * Determines how your Lambda function isolates execution environments between tenants.
     * @enum ["PER_TENANT"]
     */
    TenantIsolationMode: "PER_TENANT";
  };
  /**
   * A list of [tags](https://docs.aws.amazon.com/lambda/latest/dg/tagging.html) to apply to the
   * function.
   * You must have the ``lambda:TagResource``, ``lambda:UntagResource``, and ``lambda:ListTags``
   * permissions for your
   * [principal](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html) to
   * manage the CFN stack. If you don't have these permissions, there might be unexpected behavior with
   * stack-level tags propagating to the resource during resource creation and update.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The value for this tag.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
    /**
     * The key for this tag.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
  /**
   * Configuration values that override the container image Dockerfile settings. For more information,
   * see [Container image
   * settings](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html#images-parms).
   */
  ImageConfig?: {
    /** Specifies the working directory. The length of the directory string cannot exceed 1,000 characters. */
    WorkingDirectory?: string;
    /**
     * Specifies parameters that you want to pass in with ENTRYPOINT. You can specify a maximum of 1,500
     * parameters in the list.
     * @maxItems 1500
     * @uniqueItems true
     */
    Command?: string[];
    /**
     * Specifies the entry point to their application, which is typically the location of the runtime
     * executable. You can specify a maximum of 1,500 string entries in the list.
     * @maxItems 1500
     * @uniqueItems true
     */
    EntryPoint?: string[];
  };
  /**
   * The amount of [memory available to the
   * function](https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html#configuration-memory-console)
   * at runtime. Increasing the function memory also increases its CPU allocation. The default value is
   * 128 MB. The value can be any multiple of 1 MB. Note that new AWS accounts have reduced concurrency
   * and memory quotas. AWS raises these quotas automatically based on your usage. You can also request
   * a quota increase.
   */
  MemorySize?: number;
  /**
   * A dead-letter queue configuration that specifies the queue or topic where Lambda sends asynchronous
   * events when they fail processing. For more information, see [Dead-letter
   * queues](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html#invocation-dlq).
   */
  DeadLetterConfig?: {
    /**
     * The Amazon Resource Name (ARN) of an Amazon SQS queue or Amazon SNS topic.
     * @pattern ^(arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()$
     */
    TargetArn?: string;
  };
  /**
   * The amount of time (in seconds) that Lambda allows a function to run before stopping it. The
   * default is 3 seconds. The maximum allowed value is 900 seconds. For more information, see [Lambda
   * execution environment](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-context.html).
   * @minimum 1
   */
  Timeout?: number;
  /**
   * The name of the method within your code that Lambda calls to run your function. Handler is required
   * if the deployment package is a .zip file archive. The format includes the file name. It can also
   * include namespaces and other qualifiers, depending on the runtime. For more information, see
   * [Lambda programming model](https://docs.aws.amazon.com/lambda/latest/dg/foundation-progmodel.html).
   * @maxLength 128
   * @pattern ^[^\s]+$
   */
  Handler?: string;
  SnapStartResponse?: {
    /**
     * When you provide a [qualified Amazon Resource Name
     * (ARN)](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html#versioning-versions-using),
     * this response element indicates whether SnapStart is activated for the specified function version.
     * @enum ["On","Off"]
     */
    OptimizationStatus?: "On" | "Off";
    /**
     * When set to ``PublishedVersions``, Lambda creates a snapshot of the execution environment when you
     * publish a function version.
     * @enum ["PublishedVersions","None"]
     */
    ApplyOn?: "PublishedVersions" | "None";
  };
  /**
   * The code for the function. You can define your function code in multiple ways:
   * +  For .zip deployment packages, you can specify the S3 location of the .zip file in the
   * ``S3Bucket``, ``S3Key``, and ``S3ObjectVersion`` properties.
   * +  For .zip deployment packages, you can alternatively define the function code inline in the
   * ``ZipFile`` property. This method works only for Node.js and Python functions.
   * +  For container images, specify the URI of your container image in the ECR registry in the
   * ``ImageUri`` property.
   */
  Code: {
    /**
     * The ARN of the KMSlong (KMS) customer managed key that's used to encrypt your function's .zip
     * deployment package. If you don't provide a customer managed key, Lambda uses an [owned
     * key](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-owned-cmk).
     * @pattern ^(arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()$
     */
    SourceKMSKeyArn?: string;
    /**
     * For versioned objects, the version of the deployment package object to use.
     * @minLength 1
     * @maxLength 1024
     */
    S3ObjectVersion?: string;
    /**
     * An Amazon S3 bucket in the same AWS-Region as your function. The bucket can be in a different
     * AWS-account.
     * @minLength 3
     * @maxLength 63
     * @pattern ^[0-9A-Za-z\.\-_]*(?<!\.)$
     */
    S3Bucket?: string;
    /**
     * (Node.js and Python) The source code of your Lambda function. If you include your function source
     * inline with this parameter, CFN places it in a file named ``index`` and zips it to create a
     * [deployment package](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-package.html).
     * This zip file cannot exceed 4MB. For the ``Handler`` property, the first part of the handler
     * identifier must be ``index``. For example, ``index.handler``.
     * When you specify source code inline for a Node.js function, the ``index`` file that CFN creates
     * uses the extension ``.js``. This means that LAM treats the file as a CommonJS module. ES modules
     * aren't supported for inline functions.
     * For JSON, you must escape quotes and special characters such as newline (``\n``) with a
     * backslash.
     * If you specify a function that interacts with an AWS CloudFormation custom resource, you don't
     * have to write your own functions to send responses to the custom resource that invoked the
     * function. AWS CloudFormation provides a response module
     * ([cfn-response](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-lambda-function-code-cfnresponsemodule.html))
     * that simplifies sending responses. See [Using Lambda with
     * CloudFormation](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudformation.html) for
     * details.
     */
    ZipFile?: string;
    /**
     * The Amazon S3 key of the deployment package.
     * @minLength 1
     * @maxLength 1024
     */
    S3Key?: string;
    /**
     * URI of a [container image](https://docs.aws.amazon.com/lambda/latest/dg/lambda-images.html) in the
     * Amazon ECR registry.
     */
    ImageUri?: string;
  };
  /**
   * The Amazon Resource Name (ARN) of the function's execution role.
   * @pattern ^arn:(aws[a-zA-Z-]*)?:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$
   */
  Role: string;
  /** The function's Amazon CloudWatch Logs configuration settings. */
  LoggingConfig?: {
    /**
     * The format in which Lambda sends your function's application and system logs to CloudWatch. Select
     * between plain text and structured JSON.
     * @enum ["Text","JSON"]
     */
    LogFormat?: "Text" | "JSON";
    /**
     * Set this property to filter the application logs for your function that Lambda sends to CloudWatch.
     * Lambda only sends application logs at the selected level of detail and lower, where ``TRACE`` is
     * the highest level and ``FATAL`` is the lowest.
     * @enum ["TRACE","DEBUG","INFO","WARN","ERROR","FATAL"]
     */
    ApplicationLogLevel?: "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
    /**
     * The name of the Amazon CloudWatch log group the function sends logs to. By default, Lambda
     * functions send logs to a default log group named ``/aws/lambda/<function name>``. To use a
     * different log group, enter an existing log group or enter a new log group name.
     * @minLength 1
     * @maxLength 512
     * @pattern [\.\-_/#A-Za-z0-9]+
     */
    LogGroup?: string;
    /**
     * Set this property to filter the system logs for your function that Lambda sends to CloudWatch.
     * Lambda only sends system logs at the selected level of detail and lower, where ``DEBUG`` is the
     * highest level and ``WARN`` is the lowest.
     * @enum ["DEBUG","INFO","WARN"]
     */
    SystemLogLevel?: "DEBUG" | "INFO" | "WARN";
  };
  /**
   * The status of your function's recursive loop detection configuration.
   * When this value is set to ``Allow``and Lambda detects your function being invoked as part of a
   * recursive loop, it doesn't take any action.
   * When this value is set to ``Terminate`` and Lambda detects your function being invoked as part of
   * a recursive loop, it stops your function being invoked and notifies you.
   */
  RecursiveLoop?: "Allow" | "Terminate";
  /** Environment variables that are accessible from function code during execution. */
  Environment?: {
    /**
     * Environment variable key-value pairs. For more information, see [Using Lambda environment
     * variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html).
     * If the value of the environment variable is a time or a duration, enclose the value in quotes.
     */
    Variables?: Record<string, string>;
  };
  Arn?: string;
  /**
   * The size of the function's ``/tmp`` directory in MB. The default value is 512, but it can be any
   * whole number between 512 and 10,240 MB.
   */
  EphemeralStorage?: {
    /**
     * The size of the function's ``/tmp`` directory.
     * @minimum 512
     * @maximum 10240
     */
    Size: number;
  };
  /**
   * The instruction set architecture that the function supports. Enter a string array with one of the
   * valid values (arm64 or x86_64). The default value is ``x86_64``.
   * @minItems 1
   * @maxItems 1
   * @uniqueItems true
   */
  Architectures?: ("x86_64" | "arm64")[];
};


/**
 * The ``AWS::EFS::AccessPoint`` resource creates an EFS access point. An access point is an
 * application-specific view into an EFS file system that applies an operating system user and group,
 * and a file system path, to any file system request made through the access point. The operating
 * system user and group override any identity information provided by the NFS client. The file system
 * path is exposed as the access point's root directory. Applications using the access point can only
 * access data in its own directory and below. To learn more, see [Mounting a file system using EFS
 * access points](https://docs.aws.amazon.com/efs/latest/ug/efs-access-points.html).
 * This operation requires permissions for the ``elasticfilesystem:CreateAccessPoint`` action.
 */
export type AwsEfsAccesspoint = {
  AccessPointId?: string;
  Arn?: string;
  /** The opaque string specified in the request to ensure idempotent creation. */
  ClientToken?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * For more information, see
   * [Tag](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html).
   * @uniqueItems true
   */
  AccessPointTags?: {
    /**
     * The tag key (String). The key can't start with ``aws:``.
     * @minLength 1
     * @maxLength 128
     */
    Key?: string;
    /**
     * The value of the tag key.
     * @minLength 1
     * @maxLength 256
     */
    Value?: string;
  }[];
  /**
   * The ID of the EFS file system that the access point applies to. Accepts only the ID format for
   * input when specifying a file system, for example ``fs-0123456789abcedf2``.
   */
  FileSystemId: string;
  /**
   * The full POSIX identity, including the user ID, group ID, and secondary group IDs on the access
   * point that is used for all file operations by NFS clients using the access point.
   */
  PosixUser?: {
    /** The POSIX user ID used for all file system operations using this access point. */
    Uid: string;
    /** The POSIX group ID used for all file system operations using this access point. */
    Gid: string;
    /** Secondary POSIX group IDs used for all file system operations using this access point. */
    SecondaryGids?: string[];
  };
  /**
   * The directory on the EFS file system that the access point exposes as the root directory to NFS
   * clients using the access point.
   */
  RootDirectory?: {
    /**
     * Specifies the path on the EFS file system to expose as the root directory to NFS clients using the
     * access point to access the EFS file system. A path can have up to four subdirectories. If the
     * specified path does not exist, you are required to provide the ``CreationInfo``.
     * @minLength 1
     * @maxLength 100
     */
    Path?: string;
    /**
     * (Optional) Specifies the POSIX IDs and permissions to apply to the access point's
     * ``RootDirectory``. If the ``RootDirectory`` > ``Path`` specified does not exist, EFS creates the
     * root directory using the ``CreationInfo`` settings when a client connects to an access point. When
     * specifying the ``CreationInfo``, you must provide values for all properties.
     * If you do not provide ``CreationInfo`` and the specified ``RootDirectory`` > ``Path`` does not
     * exist, attempts to mount the file system using the access point will fail.
     */
    CreationInfo?: {
      /**
       * Specifies the POSIX user ID to apply to the ``RootDirectory``. Accepts values from 0 to 2^32
       * (4294967295).
       */
      OwnerUid: string;
      /**
       * Specifies the POSIX group ID to apply to the ``RootDirectory``. Accepts values from 0 to 2^32
       * (4294967295).
       */
      OwnerGid: string;
      /**
       * Specifies the POSIX permissions to apply to the ``RootDirectory``, in the format of an octal number
       * representing the file's mode bits.
       * @pattern ^[0-7]{3,4}$
       */
      Permissions: string;
    };
  };
};


/** Resource Type definition for AWS::EC2::SecurityGroup */
export type AwsEc2Securitygroup = {
  /** A description for the security group. */
  GroupDescription: string;
  /** The name of the security group. */
  GroupName?: string;
  /** The ID of the VPC for the security group. */
  VpcId?: string;
  /** The group name or group ID depending on whether the SG is created in default or specific VPC */
  Id?: string;
  /**
   * The inbound rules associated with the security group. There is a short interruption during which
   * you cannot connect to the security group.
   * @uniqueItems false
   */
  SecurityGroupIngress?: {
    CidrIp?: string;
    CidrIpv6?: string;
    Description?: string;
    FromPort?: number;
    SourceSecurityGroupName?: string;
    ToPort?: number;
    SourceSecurityGroupOwnerId?: string;
    IpProtocol: string;
    SourceSecurityGroupId?: string;
    SourcePrefixListId?: string;
  }[];
  /**
   * [VPC only] The outbound rules associated with the security group. There is a short interruption
   * during which you cannot connect to the security group.
   * @uniqueItems false
   */
  SecurityGroupEgress?: {
    CidrIp?: string;
    CidrIpv6?: string;
    Description?: string;
    FromPort?: number;
    ToPort?: number;
    IpProtocol: string;
    DestinationSecurityGroupId?: string;
    DestinationPrefixListId?: string;
  }[];
  /**
   * Any tags assigned to the security group.
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  /** The group ID of the specified security group. */
  GroupId?: string;
};


/** Resource Type definition for AWS::Lambda::Url */
export type AwsLambdaUrl = {
  /**
   * The Amazon Resource Name (ARN) of the function associated with the Function URL.
   * @pattern ^(arn:(aws[a-zA-Z-]*)?:lambda:)?([a-z]{2}((-gov)|(-iso(b?)))?-[a-z]+-\d{1}:)?(\d{12}:)?(function:)?([a-zA-Z0-9-_]+)(:((?!\d+)[0-9a-zA-Z-_]+))?$
   */
  TargetFunctionArn: string;
  /**
   * The alias qualifier for the target function. If TargetFunctionArn is unqualified then Qualifier
   * must be passed.
   * @minLength 1
   * @maxLength 128
   * @pattern ((?!^[0-9]+$)([a-zA-Z0-9-_]+))
   */
  Qualifier?: string;
  /**
   * Can be either AWS_IAM if the requests are authorized via IAM, or NONE if no authorization is
   * configured on the Function URL.
   * @enum ["AWS_IAM","NONE"]
   */
  AuthType: "AWS_IAM" | "NONE";
  /**
   * The invocation mode for the function's URL. Set to BUFFERED if you want to buffer responses before
   * returning them to the client. Set to RESPONSE_STREAM if you want to stream responses, allowing
   * faster time to first byte and larger response payload sizes. If not set, defaults to BUFFERED.
   * @enum ["BUFFERED","RESPONSE_STREAM"]
   */
  InvokeMode?: "BUFFERED" | "RESPONSE_STREAM";
  /**
   * The full Amazon Resource Name (ARN) of the function associated with the Function URL.
   * @pattern ^(arn:(aws[a-zA-Z-]*)?:lambda:)?([a-z]{2}((-gov)|(-iso(b?)))?-[a-z]+-\d{1}:)?(\d{12}:)?(function:)?([a-zA-Z0-9-_]+)(:((?!\d+)[0-9a-zA-Z-_]+))?$
   */
  FunctionArn?: string;
  /** The generated url for this resource. */
  FunctionUrl?: string;
  Cors?: {
    /** Specifies whether credentials are included in the CORS request. */
    AllowCredentials?: boolean;
    /** Represents a collection of allowed headers. */
    AllowHeaders?: string[];
    /** Represents a collection of allowed HTTP methods. */
    AllowMethods?: ("GET" | "PUT" | "HEAD" | "POST" | "PATCH" | "DELETE" | "*")[];
    /** Represents a collection of allowed origins. */
    AllowOrigins?: string[];
    /** Represents a collection of exposed headers. */
    ExposeHeaders?: string[];
    /**
     * @minimum 0
     * @maximum 86400
     */
    MaxAge?: number;
  };
};


/**
 * The ``AWS::Lambda::Permission`` resource grants an AWS service or another account permission to use
 * a function. You can apply the policy at the function level, or specify a qualifier to restrict
 * access to a single version or alias. If you use a qualifier, the invoker must use the full Amazon
 * Resource Name (ARN) of that version or alias to invoke the function.
 * To grant permission to another account, specify the account ID as the ``Principal``. To grant
 * permission to an organization defined in AOlong, specify the organization ID as the
 * ``PrincipalOrgID``. For AWS services, the principal is a domain-style identifier defined by the
 * service, like ``s3.amazonaws.com`` or ``sns.amazonaws.com``. For AWS services, you can also specify
 * the ARN of the associated resource as the ``SourceArn``. If you grant permission to a service
 * principal without specifying the source, other accounts could potentially configure resources in
 * their account to invoke your Lambda function.
 * If your function has a function URL, you can specify the ``FunctionUrlAuthType`` parameter. This
 * adds a condition to your permission that only applies when your function URL's ``AuthType`` matches
 * the specified ``FunctionUrlAuthType``. For more information about the ``AuthType`` parameter, see
 * [Control access to function URLs](https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html).
 * This resource adds a statement to a resource-based permission policy for the function. For more
 * information about function policies, see [Lambda Function
 * Policies](https://docs.aws.amazon.com/lambda/latest/dg/access-control-resource-based.html).
 */
export type AwsLambdaPermission = {
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^.*$
   */
  Id?: string;
  /**
   * The action that the principal can use on the function. For example, ``lambda:InvokeFunction`` or
   * ``lambda:GetFunction``.
   * @minLength 1
   * @maxLength 256
   * @pattern ^(lambda:[*]|lambda:[a-zA-Z]+|[*])$
   */
  Action: string;
  /**
   * For Alexa Smart Home functions, a token that the invoker must supply.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9._\-]+$
   */
  EventSourceToken?: string;
  /**
   * The name or ARN of the Lambda function, version, or alias.
   * **Name formats**
   * +  *Function name* – ``my-function`` (name-only), ``my-function:v1`` (with alias).
   * +  *Function ARN* – ``arn:aws:lambda:us-west-2:123456789012:function:my-function``.
   * +  *Partial ARN* – ``123456789012:function:my-function``.
   * You can append a version number or alias to any of the formats. The length constraint applies only
   * to the full ARN. If you specify only the function name, it is limited to 64 characters in length.
   * @minLength 1
   * @maxLength 140
   * @pattern ^(arn:(aws[a-zA-Z-]*)?:lambda:)?((eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}:)?(\d{12}:)?(function:)?([a-zA-Z0-9-_]+)(:(\$LATEST|[a-zA-Z0-9-_]+))?$
   */
  FunctionName: string;
  /**
   * The type of authentication that your function URL uses. Set to ``AWS_IAM`` if you want to restrict
   * access to authenticated users only. Set to ``NONE`` if you want to bypass IAM authentication to
   * create a public endpoint. For more information, see [Control access to Lambda function
   * URLs](https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html).
   * @enum ["AWS_IAM","NONE"]
   */
  FunctionUrlAuthType?: "AWS_IAM" | "NONE";
  /**
   * Restricts the ``lambda:InvokeFunction`` action to function URL calls. When specified, this option
   * prevents the principal from invoking the function by any means other than the function URL. For
   * more information, see [Control access to Lambda function
   * URLs](https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html).
   */
  InvokedViaFunctionUrl?: boolean;
  /**
   * The AWS-service, AWS-account, IAM user, or IAM role that invokes the function. If you specify a
   * service, use ``SourceArn`` or ``SourceAccount`` to limit who can invoke the function through that
   * service.
   * @minLength 1
   * @maxLength 256
   * @pattern ^.*$
   */
  Principal: string;
  /**
   * The identifier for your organization in AOlong. Use this to grant permissions to all the
   * AWS-accounts under this organization.
   * @minLength 12
   * @maxLength 34
   * @pattern ^o-[a-z0-9]{10,32}$
   */
  PrincipalOrgID?: string;
  /**
   * For AWS-service, the ID of the AWS-account that owns the resource. Use this together with
   * ``SourceArn`` to ensure that the specified account owns the resource. It is possible for an Amazon
   * S3 bucket to be deleted by its owner and recreated by another account.
   * @minLength 12
   * @maxLength 12
   * @pattern ^\d{12}$
   */
  SourceAccount?: string;
  /**
   * For AWS-services, the ARN of the AWS resource that invokes the function. For example, an Amazon S3
   * bucket or Amazon SNS topic.
   * Note that Lambda configures the comparison using the ``StringLike`` operator.
   * @minLength 12
   * @maxLength 1024
   * @pattern ^arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-])+:((eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1})?:(\d{12})?:(.*)$
   */
  SourceArn?: string;
};


/**
 * The ``AWS::Logs::LogGroup`` resource specifies a log group. A log group defines common properties
 * for log streams, such as their retention and access control rules. Each log stream must belong to
 * one log group.
 * You can create up to 1,000,000 log groups per Region per account. You must use the following
 * guidelines when naming a log group:
 * +  Log group names must be unique within a Region for an AWS account.
 * +  Log group names can be between 1 and 512 characters long.
 * +  Log group names consist of the following characters: a-z, A-Z, 0-9, '_' (underscore), '-'
 * (hyphen), '/' (forward slash), and '.' (period).
 */
export type AwsLogsLoggroup = {
  /**
   * The name of the log group. If you don't specify a name, CFNlong generates a unique ID for the log
   * group.
   * @minLength 1
   * @maxLength 512
   * @pattern ^[.\-_/#A-Za-z0-9]{1,512}\Z
   */
  LogGroupName?: string;
  /**
   * The Amazon Resource Name (ARN) of the KMS key to use when encrypting log data.
   * To associate an KMS key with the log group, specify the ARN of that KMS key here. If you do so,
   * ingested data is encrypted using this key. This association is stored as long as the data encrypted
   * with the KMS key is still within CWL. This enables CWL to decrypt this data whenever it is
   * requested.
   * If you attempt to associate a KMS key with the log group but the KMS key doesn't exist or is
   * deactivated, you will receive an ``InvalidParameterException`` error.
   * Log group data is always encrypted in CWL. If you omit this key, the encryption does not use KMS.
   * For more information, see [Encrypt log data in
   * using](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/encrypt-log-data-kms.html)
   * @maxLength 256
   * @pattern ^arn:[a-z0-9-]+:kms:[a-z0-9-]+:\d{12}:(key|alias)/.+\Z
   */
  KmsKeyId?: string;
  /**
   * Creates a data protection policy and assigns it to the log group. A data protection policy can help
   * safeguard sensitive data that's ingested by the log group by auditing and masking the sensitive log
   * data. When a user who does not have permission to view masked data views a log event that includes
   * masked data, the sensitive data is replaced by asterisks.
   */
  DataProtectionPolicy?: Record<string, unknown>;
  /**
   * Creates or updates a *field index policy* for the specified log group. Only log groups in the
   * Standard log class support field index policies. For more information about log classes, see [Log
   * classes](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CloudWatch_Logs_Log_Classes.html).
   * You can use field index policies to create *field indexes* on fields found in log events in the
   * log group. Creating field indexes lowers the costs for CWL Insights queries that reference those
   * field indexes, because these queries attempt to skip the processing of log events that are known to
   * not match the indexed field. Good fields to index are fields that you often need to query for and
   * fields that have high cardinality of values Common examples of indexes include request ID, session
   * ID, userID, and instance IDs. For more information, see [Create field indexes to improve query
   * performance and reduce
   * costs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CloudWatchLogs-Field-Indexing.html).
   * Currently, this array supports only one field index policy object.
   * @uniqueItems true
   */
  FieldIndexPolicies?: Record<string, unknown>[];
  /**
   * Specifies the log group class for this log group. There are two classes:
   * +  The ``Standard`` log class supports all CWL features.
   * +  The ``Infrequent Access`` log class supports a subset of CWL features and incurs lower costs.
   * For details about the features supported by each class, see [Log
   * classes](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CloudWatch_Logs_Log_Classes.html)
   * @default "STANDARD"
   * @enum ["STANDARD","INFREQUENT_ACCESS","DELIVERY"]
   */
  LogGroupClass?: "STANDARD" | "INFREQUENT_ACCESS" | "DELIVERY";
  /**
   * The number of days to retain the log events in the specified log group. Possible values are: 1, 3,
   * 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, and
   * 3653.
   * To set a log group so that its log events do not expire, do not specify this property.
   * @enum [1,3,5,7,14,30,60,90,120,150,180,365,400,545,731,1096,1827,2192,2557,2922,3288,3653]
   */
  RetentionInDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1096 | 1827 | 2192 | 2557 | 2922 | 3288 | 3653;
  /**
   * An array of key-value pairs to apply to the log group.
   * For more information, see
   * [Tag](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html).
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value of this key-value pair.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  Arn?: string;
  /**
   * Creates or updates a resource policy for the specified log group that allows other services to put
   * log events to this account. A LogGroup can have 1 resource policy.
   */
  ResourcePolicyDocument?: Record<string, unknown>;
};


/**
 * The AWS::Lambda::EventInvokeConfig resource configures options for asynchronous invocation on a
 * version or an alias.
 */
export type AwsLambdaEventinvokeconfig = {
  DestinationConfig?: {
    OnFailure?: {
      /**
       * The Amazon Resource Name (ARN) of the destination resource.
       * @minLength 0
       * @maxLength 350
       * @pattern ^$|arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-])+:([a-z]+(-[a-z]+)+-\d{1})?:(\d{12})?:(.*)
       */
      Destination: string;
    };
    OnSuccess?: {
      /**
       * The Amazon Resource Name (ARN) of the destination resource.
       * @minLength 0
       * @maxLength 350
       * @pattern ^$|arn:(aws[a-zA-Z0-9-]*):([a-zA-Z0-9\-])+:([a-z]+(-[a-z]+)+-\d{1})?:(\d{12})?:(.*)
       */
      Destination: string;
    };
  };
  /**
   * The name of the Lambda function.
   * @pattern ^(arn:(aws[a-zA-Z-]*)?:lambda:)?([a-z]+(-[a-z]+)+-\d{1}:)?(\d{12}:)?(function:)?([a-zA-Z0-9-_]+)(:(\$LATEST|[a-zA-Z0-9-_]+))?$
   */
  FunctionName: string;
  /**
   * The maximum age of a request that Lambda sends to a function for processing.
   * @minimum 60
   * @maximum 21600
   */
  MaximumEventAgeInSeconds?: number;
  /**
   * The maximum number of times to retry when the function returns an error.
   * @minimum 0
   * @maximum 2
   */
  MaximumRetryAttempts?: number;
  /**
   * The identifier of a version or alias.
   * @pattern ^(|[a-zA-Z0-9$_-]{1,129})$
   */
  Qualifier: string;
};


/** The AWS::CodeDeploy::Application resource creates an AWS CodeDeploy application */
export type AwsCodedeployApplication = {
  /**
   * A name for the application. If you don't specify a name, AWS CloudFormation generates a unique
   * physical ID and uses that ID for the application name.
   */
  ApplicationName?: string;
  /** The compute platform that CodeDeploy deploys the application to. */
  ComputePlatform?: string;
  /**
   * The metadata that you apply to CodeDeploy applications to help you organize and categorize them.
   * Each tag consists of a key and an optional value, both of which you define.
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};


/** Resource Type definition for AWS::CodeDeploy::DeploymentGroup */
export type AwsCodedeployDeploymentgroup = {
  OnPremisesTagSet?: {
    /** @uniqueItems true */
    OnPremisesTagSetList?: {
      /** @uniqueItems true */
      OnPremisesTagGroup?: {
        Value?: string;
        Type?: string;
        Key?: string;
      }[];
    }[];
  };
  ApplicationName: string;
  DeploymentStyle?: {
    DeploymentOption?: string;
    DeploymentType?: string;
  };
  ServiceRoleArn: string;
  BlueGreenDeploymentConfiguration?: {
    GreenFleetProvisioningOption?: {
      Action?: string;
    };
    DeploymentReadyOption?: {
      WaitTimeInMinutes?: number;
      ActionOnTimeout?: string;
    };
    TerminateBlueInstancesOnDeploymentSuccess?: {
      TerminationWaitTimeInMinutes?: number;
      Action?: string;
    };
  };
  /** @uniqueItems true */
  AutoScalingGroups?: string[];
  Ec2TagSet?: {
    /** @uniqueItems true */
    Ec2TagSetList?: {
      /** @uniqueItems true */
      Ec2TagGroup?: {
        Value?: string;
        Type?: string;
        Key?: string;
      }[];
    }[];
  };
  OutdatedInstancesStrategy?: string;
  /** @uniqueItems true */
  TriggerConfigurations?: {
    TriggerTargetArn?: string;
    TriggerName?: string;
    /** @uniqueItems true */
    TriggerEvents?: string[];
  }[];
  Deployment?: {
    Description?: string;
    Revision: {
      S3Location?: {
        BundleType?: string;
        Bucket: string;
        ETag?: string;
        Version?: string;
        Key: string;
      };
      GitHubLocation?: {
        Repository: string;
        CommitId: string;
      };
      RevisionType?: string;
    };
    IgnoreApplicationStopFailures?: boolean;
  };
  DeploymentConfigName?: string;
  AlarmConfiguration?: {
    /** @uniqueItems true */
    Alarms?: {
      Name?: string;
    }[];
    IgnorePollAlarmFailure?: boolean;
    Enabled?: boolean;
  };
  /** @uniqueItems true */
  Ec2TagFilters?: {
    Value?: string;
    Type?: string;
    Key?: string;
  }[];
  TerminationHookEnabled?: boolean;
  /** @uniqueItems true */
  ECSServices?: {
    ServiceName: string;
    ClusterName: string;
  }[];
  AutoRollbackConfiguration?: {
    /** @uniqueItems true */
    Events?: string[];
    Enabled?: boolean;
  };
  LoadBalancerInfo?: {
    /** @uniqueItems true */
    TargetGroupInfoList?: {
      Name?: string;
    }[];
    /** @uniqueItems true */
    ElbInfoList?: {
      Name?: string;
    }[];
    /** @uniqueItems true */
    TargetGroupPairInfoList?: {
      ProdTrafficRoute?: {
        /** @uniqueItems true */
        ListenerArns?: string[];
      };
      TestTrafficRoute?: {
        /** @uniqueItems true */
        ListenerArns?: string[];
      };
      /** @uniqueItems true */
      TargetGroups?: {
        Name?: string;
      }[];
    }[];
  };
  Id?: string;
  DeploymentGroupName?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  /** @uniqueItems true */
  OnPremisesInstanceTagFilters?: {
    Value?: string;
    Type?: string;
    Key?: string;
  }[];
};


/** Resource Type definition for AWS::Lambda::Alias */
export type AwsLambdaAlias = {
  /** The name of the Lambda function. */
  FunctionName: string;
  /** Lambda Alias ARN generated by the service. */
  AliasArn?: string;
  /** Specifies a provisioned concurrency configuration for a function's alias. */
  ProvisionedConcurrencyConfig?: {
    /** The amount of provisioned concurrency to allocate for the alias. */
    ProvisionedConcurrentExecutions: number;
  };
  /** A description of the alias. */
  Description?: string;
  /** The function version that the alias invokes. */
  FunctionVersion: string;
  /** The routing configuration of the alias. */
  RoutingConfig?: {
    /**
     * The second version, and the percentage of traffic that's routed to it.
     * @uniqueItems true
     */
    AdditionalVersionWeights?: {
      /** The percentage of traffic that the alias routes to the second version. */
      FunctionWeight: number;
      /** The qualifier of the second version. */
      FunctionVersion: string;
    }[];
  };
  /** The name of the alias. */
  Name: string;
};


/**
 * The ``AWS::RDS::DBSubnetGroup`` resource creates a database subnet group. Subnet groups must
 * contain at least two subnets in two different Availability Zones in the same region.
 * For more information, see [Working with DB subnet
 * groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html#USER_VPC.Subnets)
 * in the *Amazon RDS User Guide*.
 */
export type AwsRdsDbsubnetgroup = {
  /** The description for the DB subnet group. */
  DBSubnetGroupDescription: string;
  /**
   * The name for the DB subnet group. This value is stored as a lowercase string.
   * Constraints:
   * +  Must contain no more than 255 letters, numbers, periods, underscores, spaces, or hyphens.
   * +  Must not be default.
   * +  First character must be a letter.
   * Example: ``mydbsubnetgroup``
   */
  DBSubnetGroupName?: string;
  /**
   * The EC2 Subnet IDs for the DB subnet group.
   * @uniqueItems false
   */
  SubnetIds: string[];
  /**
   * Tags to assign to the DB subnet group.
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * A key is the required name of the tag. The string value can be from 1 to 128 Unicode characters in
     * length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set of
     * Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A value is the optional value of the tag. The string value can be from 1 to 256 Unicode characters
     * in length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set
     * of Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};


/**
 * The ``AWS::RDS::DBCluster`` resource creates an Amazon Aurora DB cluster or Multi-AZ DB cluster.
 * For more information about creating an Aurora DB cluster, see [Creating an Amazon Aurora DB
 * cluster](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.CreateInstance.html)
 * in the *Amazon Aurora User Guide*.
 * For more information about creating a Multi-AZ DB cluster, see [Creating a Multi-AZ DB
 * cluster](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/create-multi-az-db-cluster.html) in
 * the *Amazon RDS User Guide*.
 * You can only create this resource in AWS Regions where Amazon Aurora or Multi-AZ DB clusters are
 * supported.
 * *Updating DB clusters*
 * When properties labeled "*Update
 * requires:*[Replacement](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-update-behaviors.html#update-replacement)"
 * are updated, AWS CloudFormation first creates a replacement DB cluster, then changes references
 * from other dependent resources to point to the replacement DB cluster, and finally deletes the old
 * DB cluster.
 * We highly recommend that you take a snapshot of the database before updating the stack. If you
 * don't, you lose the data when AWS CloudFormation replaces your DB cluster. To preserve your data,
 * perform the following procedure:
 * 1.  Deactivate any applications that are using the DB cluster so that there's no activity on the
 * DB instance.
 * 1.  Create a snapshot of the DB cluster. For more information, see [Creating a DB cluster
 * snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_CreateSnapshotCluster.html).
 * 1.  If you want to restore your DB cluster using a DB cluster snapshot, modify the updated
 * template with your DB cluster changes and add the ``SnapshotIdentifier`` property with the ID of
 * the DB cluster snapshot that you want to use.
 * After you restore a DB cluster with a ``SnapshotIdentifier`` property, you must specify the same
 * ``SnapshotIdentifier`` property for any future updates to the DB cluster. When you specify this
 * property for an update, the DB cluster is not restored from the DB cluster snapshot again, and the
 * data in the database is not changed. However, if you don't specify the ``SnapshotIdentifier``
 * property, an empty DB cluster is created, and the original DB cluster is deleted. If you specify a
 * property that is different from the previous snapshot restore property, a new DB cluster is
 * restored from the specified ``SnapshotIdentifier`` property, and the original DB cluster is
 * deleted.
 * 1.  Update the stack.
 * Currently, when you are updating the stack for an Aurora Serverless DB cluster, you can't include
 * changes to any other properties when you specify one of the following properties:
 * ``PreferredBackupWindow``, ``PreferredMaintenanceWindow``, and ``Port``. This limitation doesn't
 * apply to provisioned DB clusters.
 * For more information about updating other properties of this resource, see ``ModifyDBCluster``.
 * For more information about updating stacks, see [CloudFormation Stacks
 * Updates](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks.html).
 * *Deleting DB clusters*
 * The default ``DeletionPolicy`` for ``AWS::RDS::DBCluster`` resources is ``Snapshot``. For more
 * information about how AWS CloudFormation deletes resources, see [DeletionPolicy
 * Attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-deletionpolicy.html).
 */
export type AwsRdsDbcluster = {
  Endpoint?: {
    /** Specifies the connection endpoint for the primary instance of the DB cluster. */
    Address?: string;
    /** Specifies the port that the database engine is listening on. */
    Port?: string;
  };
  ReadEndpoint?: {
    /** The host address of the reader endpoint. */
    Address?: string;
  };
  /**
   * The amount of storage in gibibytes (GiB) to allocate to each DB instance in the Multi-AZ DB
   * cluster.
   * Valid for Cluster Type: Multi-AZ DB clusters only
   * This setting is required to create a Multi-AZ DB cluster.
   */
  AllocatedStorage?: number;
  /**
   * Provides a list of the AWS Identity and Access Management (IAM) roles that are associated with the
   * DB cluster. IAM roles that are associated with a DB cluster grant permission for the DB cluster to
   * access other Amazon Web Services on your behalf.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   * @uniqueItems true
   */
  AssociatedRoles?: {
    /**
     * The name of the feature associated with the AWS Identity and Access Management (IAM) role. IAM
     * roles that are associated with a DB cluster grant permission for the DB cluster to access other AWS
     * services on your behalf. For the list of supported feature names, see the ``SupportedFeatureNames``
     * description in
     * [DBEngineVersion](https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_DBEngineVersion.html)
     * in the *Amazon RDS API Reference*.
     */
    FeatureName?: string;
    /** The Amazon Resource Name (ARN) of the IAM role that is associated with the DB cluster. */
    RoleArn: string;
  }[];
  /**
   * A list of Availability Zones (AZs) where instances in the DB cluster can be created. For
   * information on AWS Regions and Availability Zones, see [Choosing the Regions and Availability
   * Zones](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.RegionsAndAvailabilityZones.html)
   * in the *Amazon Aurora User Guide*.
   * Valid for: Aurora DB clusters only
   * @uniqueItems true
   */
  AvailabilityZones?: string[];
  /**
   * Specifies whether minor engine upgrades are applied automatically to the DB cluster during the
   * maintenance window. By default, minor engine upgrades are applied automatically.
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB cluster.
   * For more information about automatic minor version upgrades, see [Automatically upgrading the
   * minor engine
   * version](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Upgrading.html#USER_UpgradeDBInstance.Upgrading.AutoMinorVersionUpgrades).
   */
  AutoMinorVersionUpgrade?: boolean;
  /**
   * The target backtrack window, in seconds. To disable backtracking, set this value to ``0``.
   * Valid for Cluster Type: Aurora MySQL DB clusters only
   * Default: ``0``
   * Constraints:
   * +  If specified, this value must be set to a number from 0 to 259,200 (72 hours).
   * @minimum 0
   */
  BacktrackWindow?: number;
  /**
   * The number of days for which automated backups are retained.
   * Default: 1
   * Constraints:
   * +  Must be a value from 1 to 35
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   * @default 1
   * @minimum 1
   */
  BackupRetentionPeriod?: number;
  /**
   * Specifies the scalability mode of the Aurora DB cluster. When set to ``limitless``, the cluster
   * operates as an Aurora Limitless Database, allowing you to create a DB shard group for horizontal
   * scaling (sharding) capabilities. When set to ``standard`` (the default), the cluster uses normal DB
   * instance creation.
   * *Important:* Automated backup retention isn't supported with Aurora Limitless Database clusters.
   * If you set this property to ``limitless``, you cannot set ``DeleteAutomatedBackups`` to ``false``.
   * To create a backup, use manual snapshots instead.
   */
  ClusterScalabilityType?: string;
  /**
   * A value that indicates whether to copy all tags from the DB cluster to snapshots of the DB cluster.
   * The default is not to copy them.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  CopyTagsToSnapshot?: boolean;
  /**
   * The mode of Database Insights to enable for the DB cluster.
   * If you set this value to ``advanced``, you must also set the ``PerformanceInsightsEnabled``
   * parameter to ``true`` and the ``PerformanceInsightsRetentionPeriod`` parameter to 465.
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB clusters
   */
  DatabaseInsightsMode?: string;
  /**
   * The name of your database. If you don't provide a name, then Amazon RDS won't create a database in
   * this DB cluster. For naming constraints, see [Naming
   * Constraints](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_Limits.html#RDS_Limits.Constraints)
   * in the *Amazon Aurora User Guide*.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  DatabaseName?: string;
  DBClusterArn?: string;
  /**
   * The compute and memory capacity of each DB instance in the Multi-AZ DB cluster, for example
   * ``db.m6gd.xlarge``. Not all DB instance classes are available in all AWS-Regions, or for all
   * database engines.
   * For the full list of DB instance classes and availability for your engine, see [DB instance
   * class](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html) in the
   * *Amazon RDS User Guide*.
   * This setting is required to create a Multi-AZ DB cluster.
   * Valid for Cluster Type: Multi-AZ DB clusters only
   */
  DBClusterInstanceClass?: string;
  DBClusterResourceId?: string;
  /**
   * The name of the DB parameter group to apply to all instances of the DB cluster.
   * When you apply a parameter group using the ``DBInstanceParameterGroupName`` parameter, the DB
   * cluster isn't rebooted automatically. Also, parameter changes are applied immediately rather than
   * during the next maintenance window.
   * Valid for Cluster Type: Aurora DB clusters only
   * Default: The existing name setting
   * Constraints:
   * +  The DB parameter group must be in the same DB parameter group family as this DB cluster.
   * +  The ``DBInstanceParameterGroupName`` parameter is valid in combination with the
   * ``AllowMajorVersionUpgrade`` parameter for a major version upgrade only.
   */
  DBInstanceParameterGroupName?: string;
  /** Reserved for future use. */
  DBSystemId?: string;
  /**
   * If you are configuring an Aurora global database cluster and want your Aurora DB cluster to be a
   * secondary member in the global database cluster, specify the global cluster ID of the global
   * database cluster. To define the primary database cluster of the global cluster, use the
   * [AWS::RDS::GlobalCluster](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-globalcluster.html)
   * resource.
   * If you aren't configuring a global database cluster, don't specify this property.
   * To remove the DB cluster from a global database cluster, specify an empty value for the
   * ``GlobalClusterIdentifier`` property.
   * For information about Aurora global databases, see [Working with Amazon Aurora Global
   * Databases](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html)
   * in the *Amazon Aurora User Guide*.
   * Valid for: Aurora DB clusters only
   * @minLength 0
   * @maxLength 63
   * @pattern ^$|^[a-zA-Z]{1}(?:-?[a-zA-Z0-9]){0,62}$
   */
  GlobalClusterIdentifier?: string;
  /**
   * The DB cluster identifier. This parameter is stored as a lowercase string.
   * Constraints:
   * +  Must contain from 1 to 63 letters, numbers, or hyphens.
   * +  First character must be a letter.
   * +  Can't end with a hyphen or contain two consecutive hyphens.
   * Example: ``my-cluster1``
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z]{1}(?:-?[a-zA-Z0-9]){0,62}$
   */
  DBClusterIdentifier?: string;
  /**
   * The name of the DB cluster parameter group to associate with this DB cluster.
   * If you apply a parameter group to an existing DB cluster, then its DB instances might need to
   * reboot. This can result in an outage while the DB instances are rebooting.
   * If you apply a change to parameter group associated with a stopped DB cluster, then the update
   * stack waits until the DB cluster is started.
   * To list all of the available DB cluster parameter group names, use the following command:
   * ``aws rds describe-db-cluster-parameter-groups --query
   * "DBClusterParameterGroups[].DBClusterParameterGroupName" --output text``
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  DBClusterParameterGroupName?: string;
  /**
   * A DB subnet group that you want to associate with this DB cluster.
   * If you are restoring a DB cluster to a point in time with ``RestoreType`` set to
   * ``copy-on-write``, and don't specify a DB subnet group name, then the DB cluster is restored with a
   * default DB subnet group.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  DBSubnetGroupName?: string;
  /**
   * Specifies whether to remove automated backups immediately after the DB cluster is deleted. This
   * parameter isn't case-sensitive. The default is to remove automated backups immediately after the DB
   * cluster is deleted, unless the AWS Backup policy specifies a point-in-time restore rule.
   */
  DeleteAutomatedBackups?: boolean;
  /**
   * A value that indicates whether the DB cluster has deletion protection enabled. The database can't
   * be deleted when deletion protection is enabled. By default, deletion protection is disabled.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  DeletionProtection?: boolean;
  /**
   * Indicates the directory ID of the Active Directory to create the DB cluster.
   * For Amazon Aurora DB clusters, Amazon RDS can use Kerberos authentication to authenticate users
   * that connect to the DB cluster.
   * For more information, see [Kerberos
   * authentication](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/kerberos-authentication.html)
   * in the *Amazon Aurora User Guide*.
   * Valid for: Aurora DB clusters only
   */
  Domain?: string;
  /**
   * Specifies the name of the IAM role to use when making API calls to the Directory Service.
   * Valid for: Aurora DB clusters only
   */
  DomainIAMRoleName?: string;
  /**
   * The list of log types that need to be enabled for exporting to CloudWatch Logs. The values in the
   * list depend on the DB engine being used. For more information, see [Publishing Database Logs to
   * Amazon CloudWatch
   * Logs](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_LogAccess.html#USER_LogAccess.Procedural.UploadtoCloudWatch)
   * in the *Amazon Aurora User Guide*.
   * *Aurora MySQL*
   * Valid values: ``audit``, ``error``, ``general``, ``slowquery``
   * *Aurora PostgreSQL*
   * Valid values: ``postgresql``
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   * @uniqueItems true
   */
  EnableCloudwatchLogsExports?: string[];
  /**
   * Specifies whether to enable this DB cluster to forward write operations to the primary cluster of a
   * global cluster (Aurora global database). By default, write operations are not allowed on Aurora DB
   * clusters that are secondary clusters in an Aurora global database.
   * You can set this value only on Aurora DB clusters that are members of an Aurora global database.
   * With this parameter enabled, a secondary cluster can forward writes to the current primary cluster,
   * and the resulting changes are replicated back to this cluster. For the primary DB cluster of an
   * Aurora global database, this value is used immediately if the primary is demoted by a global
   * cluster API operation, but it does nothing until then.
   * Valid for Cluster Type: Aurora DB clusters only
   */
  EnableGlobalWriteForwarding?: boolean;
  /**
   * Specifies whether to enable the HTTP endpoint for the DB cluster. By default, the HTTP endpoint
   * isn't enabled.
   * When enabled, the HTTP endpoint provides a connectionless web service API (RDS Data API) for
   * running SQL queries on the DB cluster. You can also query your database from inside the RDS console
   * with the RDS query editor.
   * For more information, see [Using RDS Data
   * API](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html) in the *Amazon
   * Aurora User Guide*.
   * Valid for Cluster Type: Aurora DB clusters only
   */
  EnableHttpEndpoint?: boolean;
  /**
   * A value that indicates whether to enable mapping of AWS Identity and Access Management (IAM)
   * accounts to database accounts. By default, mapping is disabled.
   * For more information, see [IAM Database
   * Authentication](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.IAMDBAuth.html)
   * in the *Amazon Aurora User Guide.*
   * Valid for: Aurora DB clusters only
   */
  EnableIAMDatabaseAuthentication?: boolean;
  /**
   * Specifies whether read replicas can forward write operations to the writer DB instance in the DB
   * cluster. By default, write operations aren't allowed on reader DB instances.
   * Valid for: Aurora DB clusters only
   */
  EnableLocalWriteForwarding?: boolean;
  /**
   * The name of the database engine to be used for this DB cluster.
   * Valid Values:
   * +   ``aurora-mysql``
   * +   ``aurora-postgresql``
   * +   ``mysql``
   * +   ``postgres``
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  Engine?: string;
  /**
   * The life cycle type for this DB cluster.
   * By default, this value is set to ``open-source-rds-extended-support``, which enrolls your DB
   * cluster into Amazon RDS Extended Support. At the end of standard support, you can avoid charges for
   * Extended Support by setting the value to ``open-source-rds-extended-support-disabled``. In this
   * case, creating the DB cluster will fail if the DB major version is past its end of standard support
   * date.
   * You can use this setting to enroll your DB cluster into Amazon RDS Extended Support. With RDS
   * Extended Support, you can run the selected major engine version on your DB cluster past the end of
   * standard support for that engine version. For more information, see the following sections:
   * +  Amazon Aurora - [Amazon RDS Extended Support with Amazon
   * Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/extended-support.html) in the
   * *Amazon Aurora User Guide*
   * +  Amazon RDS - [Amazon RDS Extended Support with Amazon
   * RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/extended-support.html) in the *Amazon
   * RDS User Guide*
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB clusters
   * Valid Values: ``open-source-rds-extended-support | open-source-rds-extended-support-disabled``
   * Default: ``open-source-rds-extended-support``
   */
  EngineLifecycleSupport?: string;
  /**
   * The DB engine mode of the DB cluster, either ``provisioned`` or ``serverless``.
   * The ``serverless`` engine mode only applies for Aurora Serverless v1 DB clusters. Aurora
   * Serverless v2 DB clusters use the ``provisioned`` engine mode.
   * For information about limitations and requirements for Serverless DB clusters, see the following
   * sections in the *Amazon Aurora User Guide*:
   * +   [Limitations of Aurora Serverless
   * v1](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.html#aurora-serverless.limitations)
   * +   [Requirements for Aurora Serverless
   * v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.requirements.html)
   * Valid for Cluster Type: Aurora DB clusters only
   */
  EngineMode?: string;
  /**
   * The version number of the database engine to use.
   * To list all of the available engine versions for Aurora MySQL version 2 (5.7-compatible) and
   * version 3 (8.0-compatible), use the following command:
   * ``aws rds describe-db-engine-versions --engine aurora-mysql --query
   * "DBEngineVersions[].EngineVersion"``
   * You can supply either ``5.7`` or ``8.0`` to use the default engine version for Aurora MySQL
   * version 2 or version 3, respectively.
   * To list all of the available engine versions for Aurora PostgreSQL, use the following command:
   * ``aws rds describe-db-engine-versions --engine aurora-postgresql --query
   * "DBEngineVersions[].EngineVersion"``
   * To list all of the available engine versions for RDS for MySQL, use the following command:
   * ``aws rds describe-db-engine-versions --engine mysql --query "DBEngineVersions[].EngineVersion"``
   * To list all of the available engine versions for RDS for PostgreSQL, use the following command:
   * ``aws rds describe-db-engine-versions --engine postgres --query
   * "DBEngineVersions[].EngineVersion"``
   * *Aurora MySQL*
   * For information, see [Database engine updates for Amazon Aurora
   * MySQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Updates.html) in
   * the *Amazon Aurora User Guide*.
   * *Aurora PostgreSQL*
   * For information, see [Amazon Aurora PostgreSQL releases and engine
   * versions](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Updates.20180305.html)
   * in the *Amazon Aurora User Guide*.
   * *MySQL*
   * For information, see [Amazon RDS for
   * MySQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html#MySQL.Concepts.VersionMgmt)
   * in the *Amazon RDS User Guide*.
   * *PostgreSQL*
   * For information, see [Amazon RDS for
   * PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html#PostgreSQL.Concepts)
   * in the *Amazon RDS User Guide*.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  EngineVersion?: string;
  /**
   * Specifies whether to manage the master user password with AWS Secrets Manager.
   * For more information, see [Password management with Secrets
   * Manager](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html) in the
   * *Amazon RDS User Guide* and [Password management with Secrets
   * Manager](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-secrets-manager.html) in
   * the *Amazon Aurora User Guide.*
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB clusters
   * Constraints:
   * +  Can't manage the master user password with AWS Secrets Manager if ``MasterUserPassword`` is
   * specified.
   */
  ManageMasterUserPassword?: boolean;
  /**
   * The amount of Provisioned IOPS (input/output operations per second) to be initially allocated for
   * each DB instance in the Multi-AZ DB cluster.
   * For information about valid IOPS values, see [Provisioned IOPS
   * storage](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html#USER_PIOPS) in
   * the *Amazon RDS User Guide*.
   * This setting is required to create a Multi-AZ DB cluster.
   * Valid for Cluster Type: Multi-AZ DB clusters only
   * Constraints:
   * +  Must be a multiple between .5 and 50 of the storage amount for the DB cluster.
   */
  Iops?: number;
  /**
   * The Amazon Resource Name (ARN) of the AWS KMS key that is used to encrypt the database instances in
   * the DB cluster, such as
   * ``arn:aws:kms:us-east-1:012345678910:key/abcd1234-a123-456a-a12b-a123b4cd56ef``. If you enable the
   * ``StorageEncrypted`` property but don't specify this property, the default KMS key is used. If you
   * specify this property, you must set the ``StorageEncrypted`` property to ``true``.
   * If you specify the ``SnapshotIdentifier`` property, the ``StorageEncrypted`` property value is
   * inherited from the snapshot, and if the DB cluster is encrypted, the specified ``KmsKeyId``
   * property is used.
   * If you create a read replica of an encrypted DB cluster in another AWS Region, make sure to set
   * ``KmsKeyId`` to a KMS key identifier that is valid in the destination AWS Region. This KMS key is
   * used to encrypt the read replica in that AWS Region.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  KmsKeyId?: string;
  /**
   * Specifies the authentication type for the master user. With IAM master user authentication, you can
   * configure the master DB user with IAM database authentication when you create a DB cluster.
   * You can specify one of the following values:
   * +  ``password`` - Use standard database authentication with a password.
   * +  ``iam-db-auth`` - Use IAM database authentication for the master user.
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB clusters
   * This option is only valid for RDS for MySQL, RDS for MariaDB, RDS for PostgreSQL, Aurora MySQL,
   * and Aurora PostgreSQL engines.
   */
  MasterUserAuthenticationType?: string;
  /**
   * The name of the master user for the DB cluster.
   * If you specify the ``SourceDBClusterIdentifier``, ``SnapshotIdentifier``, or
   * ``GlobalClusterIdentifier`` property, don't specify this property. The value is inherited from the
   * source DB cluster, the snapshot, or the primary DB cluster for the global database cluster,
   * respectively.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   * @minLength 1
   * @pattern ^[a-zA-Z]{1}[a-zA-Z0-9_]*$
   */
  MasterUsername?: string;
  /**
   * The master password for the DB instance.
   * If you specify the ``SourceDBClusterIdentifier``, ``SnapshotIdentifier``, or
   * ``GlobalClusterIdentifier`` property, don't specify this property. The value is inherited from the
   * source DB cluster, the snapshot, or the primary DB cluster for the global database cluster,
   * respectively.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  MasterUserPassword?: string;
  /**
   * The secret managed by RDS in AWS Secrets Manager for the master user password.
   * When you restore a DB cluster from a snapshot, Amazon RDS generates a new secret instead of
   * reusing the secret specified in the ``SecretArn`` property. This ensures that the restored DB
   * cluster is securely managed with a dedicated secret. To maintain consistent integration with your
   * application, you might need to update resource configurations to reference the newly created
   * secret.
   * For more information, see [Password management with Secrets
   * Manager](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html) in the
   * *Amazon RDS User Guide* and [Password management with Secrets
   * Manager](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-secrets-manager.html) in
   * the *Amazon Aurora User Guide.*
   */
  MasterUserSecret?: {
    /**
     * The Amazon Resource Name (ARN) of the secret. This parameter is a return value that you can
     * retrieve using the ``Fn::GetAtt`` intrinsic function. For more information, see [Return
     * values](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbcluster.html#aws-resource-rds-dbcluster-return-values).
     */
    SecretArn?: string;
    /** The AWS KMS key identifier that is used to encrypt the secret. */
    KmsKeyId?: string;
  };
  /**
   * The interval, in seconds, between points when Enhanced Monitoring metrics are collected for the DB
   * cluster. To turn off collecting Enhanced Monitoring metrics, specify ``0``.
   * If ``MonitoringRoleArn`` is specified, also set ``MonitoringInterval`` to a value other than
   * ``0``.
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB clusters
   * Valid Values: ``0 | 1 | 5 | 10 | 15 | 30 | 60``
   * Default: ``0``
   */
  MonitoringInterval?: number;
  /**
   * The Amazon Resource Name (ARN) for the IAM role that permits RDS to send Enhanced Monitoring
   * metrics to Amazon CloudWatch Logs. An example is ``arn:aws:iam:123456789012:role/emaccess``. For
   * information on creating a monitoring role, see [Setting up and enabling Enhanced
   * Monitoring](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.html#USER_Monitoring.OS.Enabling)
   * in the *Amazon RDS User Guide*.
   * If ``MonitoringInterval`` is set to a value other than ``0``, supply a ``MonitoringRoleArn``
   * value.
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB clusters
   */
  MonitoringRoleArn?: string;
  /**
   * The network type of the DB cluster.
   * Valid values:
   * +   ``IPV4``
   * +   ``DUAL``
   * The network type is determined by the ``DBSubnetGroup`` specified for the DB cluster. A
   * ``DBSubnetGroup`` can support only the IPv4 protocol or the IPv4 and IPv6 protocols (``DUAL``).
   * For more information, see [Working with a DB instance in a
   * VPC](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html)
   * in the *Amazon Aurora User Guide.*
   * Valid for: Aurora DB clusters only
   */
  NetworkType?: string;
  /**
   * Specifies whether to turn on Performance Insights for the DB cluster.
   * For more information, see [Using Amazon Performance
   * Insights](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.html) in the
   * *Amazon RDS User Guide*.
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB clusters
   */
  PerformanceInsightsEnabled?: boolean;
  /**
   * The AWS KMS key identifier for encryption of Performance Insights data.
   * The AWS KMS key identifier is the key ARN, key ID, alias ARN, or alias name for the KMS key.
   * If you don't specify a value for ``PerformanceInsightsKMSKeyId``, then Amazon RDS uses your
   * default KMS key. There is a default KMS key for your AWS-account. Your AWS-account has a different
   * default KMS key for each AWS-Region.
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB clusters
   */
  PerformanceInsightsKmsKeyId?: string;
  /**
   * The number of days to retain Performance Insights data. When creating a DB cluster without enabling
   * Performance Insights, you can't specify the parameter ``PerformanceInsightsRetentionPeriod``.
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB clusters
   * Valid Values:
   * +   ``7``
   * +  *month* * 31, where *month* is a number of months from 1-23. Examples: ``93`` (3 months * 31),
   * ``341`` (11 months * 31), ``589`` (19 months * 31)
   * +   ``731``
   * Default: ``7`` days
   * If you specify a retention period that isn't valid, such as ``94``, Amazon RDS issues an error.
   */
  PerformanceInsightsRetentionPeriod?: number;
  /**
   * The port number on which the DB instances in the DB cluster accept connections.
   * Default:
   * +  When ``EngineMode`` is ``provisioned``, ``3306`` (for both Aurora MySQL and Aurora PostgreSQL)
   * +  When ``EngineMode`` is ``serverless``:
   * +  ``3306`` when ``Engine`` is ``aurora`` or ``aurora-mysql``
   * +  ``5432`` when ``Engine`` is ``aurora-postgresql``
   * The ``No interruption`` on update behavior only applies to DB clusters. If you are updating a DB
   * instance, see
   * [Port](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-rds-database-instance.html#cfn-rds-dbinstance-port)
   * for the AWS::RDS::DBInstance resource.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  Port?: number;
  /**
   * The daily time range during which automated backups are created. For more information, see [Backup
   * Window](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Managing.Backups.html#Aurora.Managing.Backups.BackupWindow)
   * in the *Amazon Aurora User Guide.*
   * Constraints:
   * +  Must be in the format ``hh24:mi-hh24:mi``.
   * +  Must be in Universal Coordinated Time (UTC).
   * +  Must not conflict with the preferred maintenance window.
   * +  Must be at least 30 minutes.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  PreferredBackupWindow?: string;
  /**
   * The weekly time range during which system maintenance can occur, in Universal Coordinated Time
   * (UTC).
   * Format: ``ddd:hh24:mi-ddd:hh24:mi``
   * The default is a 30-minute window selected at random from an 8-hour block of time for each AWS
   * Region, occurring on a random day of the week. To see the time blocks available, see [Maintaining
   * an Amazon Aurora DB
   * cluster](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_UpgradeDBInstance.Maintenance.html#AdjustingTheMaintenanceWindow.Aurora)
   * in the *Amazon Aurora User Guide.*
   * Valid Days: Mon, Tue, Wed, Thu, Fri, Sat, Sun.
   * Constraints: Minimum 30-minute window.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  PreferredMaintenanceWindow?: string;
  /**
   * Specifies whether the DB cluster is publicly accessible.
   * Valid for Cluster Type: Multi-AZ DB clusters only
   * When the DB cluster is publicly accessible and you connect from outside of the DB cluster's
   * virtual private cloud (VPC), its domain name system (DNS) endpoint resolves to the public IP
   * address. When you connect from within the same VPC as the DB cluster, the endpoint resolves to the
   * private IP address. Access to the DB cluster is controlled by its security group settings.
   * When the DB cluster isn't publicly accessible, it is an internal DB cluster with a DNS name that
   * resolves to a private IP address.
   * The default behavior when ``PubliclyAccessible`` is not specified depends on whether a
   * ``DBSubnetGroup`` is specified.
   * If ``DBSubnetGroup`` isn't specified, ``PubliclyAccessible`` defaults to ``true``.
   * If ``DBSubnetGroup`` is specified, ``PubliclyAccessible`` defaults to ``false`` unless the value
   * of ``DBSubnetGroup`` is ``default``, in which case ``PubliclyAccessible`` defaults to ``true``.
   * If ``PubliclyAccessible`` is true and the VPC that the ``DBSubnetGroup`` is in doesn't have an
   * internet gateway attached to it, Amazon RDS returns an error.
   */
  PubliclyAccessible?: boolean;
  /**
   * The Amazon Resource Name (ARN) of the source DB instance or DB cluster if this DB cluster is
   * created as a read replica.
   * Valid for: Aurora DB clusters only
   */
  ReplicationSourceIdentifier?: string;
  /**
   * The date and time to restore the DB cluster to.
   * Valid Values: Value must be a time in Universal Coordinated Time (UTC) format
   * Constraints:
   * +  Must be before the latest restorable time for the DB instance
   * +  Must be specified if ``UseLatestRestorableTime`` parameter isn't provided
   * +  Can't be specified if the ``UseLatestRestorableTime`` parameter is enabled
   * +  Can't be specified if the ``RestoreType`` parameter is ``copy-on-write``
   * This property must be used with ``SourceDBClusterIdentifier`` property. The resulting cluster will
   * have the identifier that matches the value of the ``DBclusterIdentifier`` property.
   * Example: ``2015-03-07T23:45:00Z``
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  RestoreToTime?: string;
  /**
   * The type of restore to be performed. You can specify one of the following values:
   * +  ``full-copy`` - The new DB cluster is restored as a full copy of the source DB cluster.
   * +  ``copy-on-write`` - The new DB cluster is restored as a clone of the source DB cluster.
   * If you don't specify a ``RestoreType`` value, then the new DB cluster is restored as a full copy
   * of the source DB cluster.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  RestoreType?: string;
  /**
   * The scaling configuration of an Aurora Serverless V2 DB cluster.
   * This property is only supported for Aurora Serverless v2. For Aurora Serverless v1, Use the
   * ``ScalingConfiguration`` property.
   * Valid for: Aurora Serverless v2 DB clusters only
   */
  ServerlessV2ScalingConfiguration?: {
    /**
     * The minimum number of Aurora capacity units (ACUs) for a DB instance in an Aurora Serverless v2
     * cluster. You can specify ACU values in half-step increments, such as 8, 8.5, 9, and so on. For
     * Aurora versions that support the Aurora Serverless v2 auto-pause feature, the smallest value that
     * you can use is 0. For versions that don't support Aurora Serverless v2 auto-pause, the smallest
     * value that you can use is 0.5.
     */
    MinCapacity?: number;
    /**
     * The maximum number of Aurora capacity units (ACUs) for a DB instance in an Aurora Serverless v2
     * cluster. You can specify ACU values in half-step increments, such as 40, 40.5, 41, and so on. The
     * largest value that you can use is 128.
     * The maximum capacity must be higher than 0.5 ACUs. For more information, see [Choosing the maximum
     * Aurora Serverless v2 capacity setting for a
     * cluster](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html#aurora-serverless-v2.max_capacity_considerations)
     * in the *Amazon Aurora User Guide*.
     * Aurora automatically sets certain parameters for Aurora Serverless V2 DB instances to values that
     * depend on the maximum ACU value in the capacity range. When you update the maximum capacity value,
     * the ``ParameterApplyStatus`` value for the DB instance changes to ``pending-reboot``. You can
     * update the parameter values by rebooting the DB instance after changing the capacity range.
     */
    MaxCapacity?: number;
    /**
     * Specifies the number of seconds an Aurora Serverless v2 DB instance must be idle before Aurora
     * attempts to automatically pause it.
     * Specify a value between 300 seconds (five minutes) and 86,400 seconds (one day). The default is
     * 300 seconds.
     */
    SecondsUntilAutoPause?: number;
  };
  /**
   * The scaling configuration of an Aurora Serverless v1 DB cluster.
   * This property is only supported for Aurora Serverless v1. For Aurora Serverless v2, Use the
   * ``ServerlessV2ScalingConfiguration`` property.
   * Valid for: Aurora Serverless v1 DB clusters only
   */
  ScalingConfiguration?: {
    /**
     * Indicates whether to allow or disallow automatic pause for an Aurora DB cluster in ``serverless``
     * DB engine mode. A DB cluster can be paused only when it's idle (it has no connections).
     * If a DB cluster is paused for more than seven days, the DB cluster might be backed up with a
     * snapshot. In this case, the DB cluster is restored when there is a request to connect to it.
     */
    AutoPause?: boolean;
    /**
     * The maximum capacity for an Aurora DB cluster in ``serverless`` DB engine mode.
     * For Aurora MySQL, valid capacity values are ``1``, ``2``, ``4``, ``8``, ``16``, ``32``, ``64``,
     * ``128``, and ``256``.
     * For Aurora PostgreSQL, valid capacity values are ``2``, ``4``, ``8``, ``16``, ``32``, ``64``,
     * ``192``, and ``384``.
     * The maximum capacity must be greater than or equal to the minimum capacity.
     */
    MaxCapacity?: number;
    /**
     * The minimum capacity for an Aurora DB cluster in ``serverless`` DB engine mode.
     * For Aurora MySQL, valid capacity values are ``1``, ``2``, ``4``, ``8``, ``16``, ``32``, ``64``,
     * ``128``, and ``256``.
     * For Aurora PostgreSQL, valid capacity values are ``2``, ``4``, ``8``, ``16``, ``32``, ``64``,
     * ``192``, and ``384``.
     * The minimum capacity must be less than or equal to the maximum capacity.
     */
    MinCapacity?: number;
    /**
     * The amount of time, in seconds, that Aurora Serverless v1 tries to find a scaling point to perform
     * seamless scaling before enforcing the timeout action. The default is 300.
     * Specify a value between 60 and 600 seconds.
     */
    SecondsBeforeTimeout?: number;
    /**
     * The time, in seconds, before an Aurora DB cluster in ``serverless`` mode is paused.
     * Specify a value between 300 and 86,400 seconds.
     */
    SecondsUntilAutoPause?: number;
    /**
     * The action to take when the timeout is reached, either ``ForceApplyCapacityChange`` or
     * ``RollbackCapacityChange``.
     * ``ForceApplyCapacityChange`` sets the capacity to the specified value as soon as possible.
     * ``RollbackCapacityChange``, the default, ignores the capacity change if a scaling point isn't
     * found in the timeout period.
     * If you specify ``ForceApplyCapacityChange``, connections that prevent Aurora Serverless v1 from
     * finding a scaling point might be dropped.
     * For more information, see [Autoscaling for Aurora Serverless
     * v1](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless.how-it-works.html#aurora-serverless.how-it-works.auto-scaling)
     * in the *Amazon Aurora User Guide*.
     */
    TimeoutAction?: string;
  };
  /**
   * The identifier for the DB snapshot or DB cluster snapshot to restore from.
   * You can use either the name or the Amazon Resource Name (ARN) to specify a DB cluster snapshot.
   * However, you can use only the ARN to specify a DB snapshot.
   * After you restore a DB cluster with a ``SnapshotIdentifier`` property, you must specify the same
   * ``SnapshotIdentifier`` property for any future updates to the DB cluster. When you specify this
   * property for an update, the DB cluster is not restored from the snapshot again, and the data in the
   * database is not changed. However, if you don't specify the ``SnapshotIdentifier`` property, an
   * empty DB cluster is created, and the original DB cluster is deleted. If you specify a property that
   * is different from the previous snapshot restore property, a new DB cluster is restored from the
   * specified ``SnapshotIdentifier`` property, and the original DB cluster is deleted.
   * If you specify the ``SnapshotIdentifier`` property to restore a DB cluster (as opposed to
   * specifying it for DB cluster updates), then don't specify the following properties:
   * +   ``GlobalClusterIdentifier``
   * +   ``MasterUsername``
   * +   ``MasterUserPassword``
   * +   ``ReplicationSourceIdentifier``
   * +   ``RestoreType``
   * +   ``SourceDBClusterIdentifier``
   * +   ``SourceRegion``
   * +  ``StorageEncrypted`` (for an encrypted snapshot)
   * +   ``UseLatestRestorableTime``
   * Constraints:
   * +  Must match the identifier of an existing Snapshot.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  SnapshotIdentifier?: string;
  /**
   * When restoring a DB cluster to a point in time, the identifier of the source DB cluster from which
   * to restore.
   * Constraints:
   * +  Must match the identifier of an existing DBCluster.
   * +  Cannot be specified if ``SourceDbClusterResourceId`` is specified. You must specify either
   * ``SourceDBClusterIdentifier`` or ``SourceDbClusterResourceId``, but not both.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  SourceDBClusterIdentifier?: string;
  /** The resource ID of the source DB cluster from which to restore. */
  SourceDbClusterResourceId?: string;
  /**
   * The AWS Region which contains the source DB cluster when replicating a DB cluster. For example,
   * ``us-east-1``.
   * Valid for: Aurora DB clusters only
   */
  SourceRegion?: string;
  /**
   * Indicates whether the DB cluster is encrypted.
   * If you specify the ``KmsKeyId`` property, then you must enable encryption.
   * If you specify the ``SourceDBClusterIdentifier`` property, don't specify this property. The value
   * is inherited from the source DB cluster, and if the DB cluster is encrypted, the specified
   * ``KmsKeyId`` property is used.
   * If you specify the ``SnapshotIdentifier`` and the specified snapshot is encrypted, don't specify
   * this property. The value is inherited from the snapshot, and the specified ``KmsKeyId`` property is
   * used.
   * If you specify the ``SnapshotIdentifier`` and the specified snapshot isn't encrypted, you can use
   * this property to specify that the restored DB cluster is encrypted. Specify the ``KmsKeyId``
   * property for the KMS key to use for encryption. If you don't want the restored DB cluster to be
   * encrypted, then don't set this property or set it to ``false``.
   * If you specify both the ``StorageEncrypted`` and ``SnapshotIdentifier`` properties without
   * specifying the ``KmsKeyId`` property, then the restored DB cluster inherits the encryption settings
   * from the DB snapshot that provide.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  StorageEncrypted?: boolean;
  StorageThroughput?: number;
  /**
   * The storage type to associate with the DB cluster.
   * For information on storage types for Aurora DB clusters, see [Storage configurations for Amazon
   * Aurora DB
   * clusters](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html#aurora-storage-type).
   * For information on storage types for Multi-AZ DB clusters, see [Settings for creating Multi-AZ DB
   * clusters](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/create-multi-az-db-cluster.html#create-multi-az-db-cluster-settings).
   * This setting is required to create a Multi-AZ DB cluster.
   * When specified for a Multi-AZ DB cluster, a value for the ``Iops`` parameter is required.
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB clusters
   * Valid Values:
   * +  Aurora DB clusters - ``aurora | aurora-iopt1``
   * +  Multi-AZ DB clusters - ``io1 | io2 | gp3``
   * Default:
   * +  Aurora DB clusters - ``aurora``
   * +  Multi-AZ DB clusters - ``io1``
   * When you create an Aurora DB cluster with the storage type set to ``aurora-iopt1``, the storage
   * type is returned in the response. The storage type isn't returned when you set it to ``aurora``.
   */
  StorageType?: string;
  /**
   * Tags to assign to the DB cluster.
   * Valid for Cluster Type: Aurora DB clusters and Multi-AZ DB clusters
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * A key is the required name of the tag. The string value can be from 1 to 128 Unicode characters in
     * length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set of
     * Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A value is the optional value of the tag. The string value can be from 1 to 256 Unicode characters
     * in length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set
     * of Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
  /**
   * A value that indicates whether to restore the DB cluster to the latest restorable backup time. By
   * default, the DB cluster is not restored to the latest restorable backup time.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   */
  UseLatestRestorableTime?: boolean;
  /**
   * A list of EC2 VPC security groups to associate with this DB cluster.
   * If you plan to update the resource, don't specify VPC security groups in a shared VPC.
   * Valid for: Aurora DB clusters and Multi-AZ DB clusters
   * @uniqueItems true
   */
  VpcSecurityGroupIds?: string[];
};


/**
 * The ``AWS::RDS::DBClusterParameterGroup`` resource creates a new Amazon RDS DB cluster parameter
 * group.
 * For information about configuring parameters for Amazon Aurora DB clusters, see [Working with
 * parameter
 * groups](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html)
 * in the *Amazon Aurora User Guide*.
 * If you apply a parameter group to a DB cluster, then its DB instances might need to reboot. This
 * can result in an outage while the DB instances are rebooting.
 * If you apply a change to parameter group associated with a stopped DB cluster, then the updated
 * stack waits until the DB cluster is started.
 */
export type AwsRdsDbclusterparametergroup = {
  /** The description for the DB cluster parameter group. */
  Description: string;
  /**
   * The DB cluster parameter group family name. A DB cluster parameter group can be associated with one
   * and only one DB cluster parameter group family, and can be applied only to a DB cluster running a
   * database engine and engine version compatible with that DB cluster parameter group family.
   * *Aurora MySQL*
   * Example: ``aurora-mysql5.7``, ``aurora-mysql8.0``
   * *Aurora PostgreSQL*
   * Example: ``aurora-postgresql14``
   * *RDS for MySQL*
   * Example: ``mysql8.0``
   * *RDS for PostgreSQL*
   * Example: ``postgres13``
   * To list all of the available parameter group families for a DB engine, use the following command:
   * ``aws rds describe-db-engine-versions --query "DBEngineVersions[].DBParameterGroupFamily"
   * --engine <engine>``
   * For example, to list all of the available parameter group families for the Aurora PostgreSQL DB
   * engine, use the following command:
   * ``aws rds describe-db-engine-versions --query "DBEngineVersions[].DBParameterGroupFamily"
   * --engine aurora-postgresql``
   * The output contains duplicates.
   * The following are the valid DB engine values:
   * +   ``aurora-mysql``
   * +   ``aurora-postgresql``
   * +   ``mysql``
   * +   ``postgres``
   */
  Family: string;
  /** Provides a list of parameters for the DB cluster parameter group. */
  Parameters: Record<string, unknown>;
  /**
   * The name of the DB cluster parameter group.
   * Constraints:
   * +  Must not match the name of an existing DB cluster parameter group.
   * This value is stored as a lowercase string.
   * @pattern ^[a-zA-Z]{1}(?:-?[a-zA-Z0-9])*$
   */
  DBClusterParameterGroupName?: string;
  /**
   * Tags to assign to the DB cluster parameter group.
   * @maxItems 50
   */
  Tags?: {
    /**
     * A key is the required name of the tag. The string value can be from 1 to 128 Unicode characters in
     * length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set of
     * Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A value is the optional value of the tag. The string value can be from 1 to 256 Unicode characters
     * in length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set
     * of Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};


/**
 * The ``AWS::RDS::DBInstance`` resource creates an Amazon DB instance. The new DB instance can be an
 * RDS DB instance, or it can be a DB instance in an Aurora DB cluster.
 * For more information about creating an RDS DB instance, see [Creating an Amazon RDS DB
 * instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateDBInstance.html) in the
 * *Amazon RDS User Guide*.
 * For more information about creating a DB instance in an Aurora DB cluster, see [Creating an Amazon
 * Aurora DB
 * cluster](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.CreateInstance.html)
 * in the *Amazon Aurora User Guide*.
 * If you import an existing DB instance, and the template configuration doesn't match the actual
 * configuration of the DB instance, AWS CloudFormation applies the changes in the template during the
 * import operation.
 * If a DB instance is deleted or replaced during an update, AWS CloudFormation deletes all
 * automated snapshots. However, it retains manual DB snapshots. During an update that requires
 * replacement, you can apply a stack policy to prevent DB instances from being replaced. For more
 * information, see [Prevent Updates to Stack
 * Resources](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/protect-stack-resources.html).
 * *Updating DB instances*
 * When properties labeled "*Update
 * requires:*[Replacement](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-update-behaviors.html#update-replacement)"
 * are updated, AWS CloudFormation first creates a replacement DB instance, then changes references
 * from other dependent resources to point to the replacement DB instance, and finally deletes the old
 * DB instance.
 * We highly recommend that you take a snapshot of the database before updating the stack. If you
 * don't, you lose the data when AWS CloudFormation replaces your DB instance. To preserve your data,
 * perform the following procedure:
 * 1.  Deactivate any applications that are using the DB instance so that there's no activity on the
 * DB instance.
 * 1.  Create a snapshot of the DB instance. For more information, see [Creating a DB
 * Snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CreateSnapshot.html).
 * 1.  If you want to restore your instance using a DB snapshot, modify the updated template with
 * your DB instance changes and add the ``DBSnapshotIdentifier`` property with the ID of the DB
 * snapshot that you want to use.
 * After you restore a DB instance with a ``DBSnapshotIdentifier`` property, you can delete the
 * ``DBSnapshotIdentifier`` property. When you specify this property for an update, the DB instance is
 * not restored from the DB snapshot again, and the data in the database is not changed. However, if
 * you don't specify the ``DBSnapshotIdentifier`` property, an empty DB instance is created, and the
 * original DB instance is deleted. If you specify a property that is different from the previous
 * snapshot restore property, a new DB instance is restored from the specified
 * ``DBSnapshotIdentifier`` property, and the original DB instance is deleted.
 * 1.  Update the stack.
 * For more information about updating other properties of this resource, see ``ModifyDBInstance``.
 * For more information about updating stacks, see [CloudFormation Stacks
 * Updates](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks.html).
 * *Deleting DB instances*
 * For DB instances that are part of an Aurora DB cluster, you can set a deletion policy for your DB
 * instance to control how AWS CloudFormation handles the DB instance when the stack is deleted. For
 * Amazon RDS DB instances, you can choose to *retain* the DB instance, to *delete* the DB instance,
 * or to *create a snapshot* of the DB instance. The default AWS CloudFormation behavior depends on
 * the ``DBClusterIdentifier`` property:
 * 1.  For ``AWS::RDS::DBInstance`` resources that don't specify the ``DBClusterIdentifier``
 * property, AWS CloudFormation saves a snapshot of the DB instance.
 * 1.   For ``AWS::RDS::DBInstance`` resources that do specify the ``DBClusterIdentifier`` property,
 * AWS CloudFormation deletes the DB instance.
 * For more information, see [DeletionPolicy
 * Attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-deletionpolicy.html).
 */
export type AwsRdsDbinstance = {
  /**
   * The amount of storage in gibibytes (GiB) to be initially allocated for the database instance.
   * If any value is set in the ``Iops`` parameter, ``AllocatedStorage`` must be at least 100 GiB,
   * which corresponds to the minimum Iops value of 1,000. If you increase the ``Iops`` value (in 1,000
   * IOPS increments), then you must also increase the ``AllocatedStorage`` value (in 100-GiB
   * increments).
   * *Amazon Aurora*
   * Not applicable. Aurora cluster volumes automatically grow as the amount of data in your database
   * increases, though you are only charged for the space that you use in an Aurora cluster volume.
   * *Db2*
   * Constraints to the amount of storage for each storage type are the following:
   * +  General Purpose (SSD) storage (gp3): Must be an integer from 20 to 64000.
   * +  Provisioned IOPS storage (io1): Must be an integer from 100 to 64000.
   * *MySQL*
   * Constraints to the amount of storage for each storage type are the following:
   * +  General Purpose (SSD) storage (gp2): Must be an integer from 20 to 65536.
   * +  Provisioned IOPS storage (io1): Must be an integer from 100 to 65536.
   * +  Magnetic storage (standard): Must be an integer from 5 to 3072.
   * *MariaDB*
   * Constraints to the amount of storage for each storage type are the following:
   * +  General Purpose (SSD) storage (gp2): Must be an integer from 20 to 65536.
   * +  Provisioned IOPS storage (io1): Must be an integer from 100 to 65536.
   * +  Magnetic storage (standard): Must be an integer from 5 to 3072.
   * *PostgreSQL*
   * Constraints to the amount of storage for each storage type are the following:
   * +  General Purpose (SSD) storage (gp2): Must be an integer from 20 to 65536.
   * +  Provisioned IOPS storage (io1): Must be an integer from 100 to 65536.
   * +  Magnetic storage (standard): Must be an integer from 5 to 3072.
   * *Oracle*
   * Constraints to the amount of storage for each storage type are the following:
   * +  General Purpose (SSD) storage (gp2): Must be an integer from 20 to 65536.
   * +  Provisioned IOPS storage (io1): Must be an integer from 100 to 65536.
   * +  Magnetic storage (standard): Must be an integer from 10 to 3072.
   * *SQL Server*
   * Constraints to the amount of storage for each storage type are the following:
   * +  General Purpose (SSD) storage (gp2):
   * +  Enterprise and Standard editions: Must be an integer from 20 to 16384.
   * +  Web and Express editions: Must be an integer from 20 to 16384.
   * +  Provisioned IOPS storage (io1):
   * +  Enterprise and Standard editions: Must be an integer from 20 to 16384.
   * +  Web and Express editions: Must be an integer from 20 to 16384.
   * +  Magnetic storage (standard):
   * +  Enterprise and Standard editions: Must be an integer from 20 to 1024.
   * +  Web and Express editions: Must be an integer from 20 to 1024.
   * @pattern ^[0-9]*$
   */
  AllocatedStorage?: string;
  /**
   * A value that indicates whether major version upgrades are allowed. Changing this parameter doesn't
   * result in an outage and the change is asynchronously applied as soon as possible.
   * Constraints: Major version upgrades must be allowed when specifying a value for the
   * ``EngineVersion`` parameter that is a different major version than the DB instance's current
   * version.
   */
  AllowMajorVersionUpgrade?: boolean;
  /**
   * The IAMlong (IAM) roles associated with the DB instance.
   * *Amazon Aurora*
   * Not applicable. The associated roles are managed by the DB cluster.
   */
  AssociatedRoles?: {
    /**
     * The name of the feature associated with the AWS Identity and Access Management (IAM) role. IAM
     * roles that are associated with a DB instance grant permission for the DB instance to access other
     * AWS services on your behalf. For the list of supported feature names, see the
     * ``SupportedFeatureNames`` description in
     * [DBEngineVersion](https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_DBEngineVersion.html)
     * in the *Amazon RDS API Reference*.
     */
    FeatureName: string;
    /** The Amazon Resource Name (ARN) of the IAM role that is associated with the DB instance. */
    RoleArn: string;
  }[];
  /**
   * A value that indicates whether minor engine upgrades are applied automatically to the DB instance
   * during the maintenance window. By default, minor engine upgrades are applied automatically.
   */
  AutoMinorVersionUpgrade?: boolean;
  /** The AWS-Region associated with the automated backup. */
  AutomaticBackupReplicationRegion?: string;
  /**
   * The AWS KMS key identifier for encryption of the replicated automated backups. The KMS key ID is
   * the Amazon Resource Name (ARN) for the KMS encryption key in the destination AWS-Region, for
   * example, ``arn:aws:kms:us-east-1:123456789012:key/AKIAIOSFODNN7EXAMPLE``.
   */
  AutomaticBackupReplicationKmsKeyId?: string;
  /**
   * The retention period for automated backups in a different AWS Region. Use this parameter to set a
   * unique retention period that only applies to cross-Region automated backups. To enable automated
   * backups in a different Region, specify a positive value for the
   * ``AutomaticBackupReplicationRegion`` parameter.
   * If not specified, this parameter defaults to the value of the ``BackupRetentionPeriod`` parameter.
   * The maximum allowed value is 35.
   * @minimum 1
   */
  AutomaticBackupReplicationRetentionPeriod?: number;
  AutomaticRestartTime?: string;
  /**
   * The Availability Zone (AZ) where the database will be created. For information on AWS-Regions and
   * Availability Zones, see [Regions and Availability
   * Zones](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html).
   * For Amazon Aurora, each Aurora DB cluster hosts copies of its storage in three separate
   * Availability Zones. Specify one of these Availability Zones. Aurora automatically chooses an
   * appropriate Availability Zone if you don't specify one.
   * Default: A random, system-chosen Availability Zone in the endpoint's AWS-Region.
   * Constraints:
   * +  The ``AvailabilityZone`` parameter can't be specified if the DB instance is a Multi-AZ
   * deployment.
   * +  The specified Availability Zone must be in the same AWS-Region as the current endpoint.
   * Example: ``us-east-1d``
   */
  AvailabilityZone?: string;
  /**
   * The number of days for which automated backups are retained. Setting this parameter to a positive
   * number enables backups. Setting this parameter to 0 disables automated backups.
   * *Amazon Aurora*
   * Not applicable. The retention period for automated backups is managed by the DB cluster.
   * Default: 1
   * Constraints:
   * +  Must be a value from 0 to 35
   * +  Can't be set to 0 if the DB instance is a source to read replicas
   * @minimum 0
   */
  BackupRetentionPeriod?: number;
  /**
   * The location for storing automated backups and manual snapshots.
   * Valid Values:
   * +  ``local`` (Dedicated Local Zone)
   * +  ``outposts`` (AWS Outposts)
   * +  ``region`` (AWS-Region)
   * Default: ``region``
   * For more information, see [Working with Amazon RDS on
   * Outposts](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-on-outposts.html) in the
   * *Amazon RDS User Guide*.
   */
  BackupTarget?: string;
  /**
   * The identifier of the CA certificate for this DB instance.
   * For more information, see [Using SSL/TLS to encrypt a connection to a DB
   * instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL.html) in the
   * *Amazon RDS User Guide* and [Using SSL/TLS to encrypt a connection to a DB
   * cluster](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.SSL.html) in the
   * *Amazon Aurora User Guide*.
   */
  CACertificateIdentifier?: string;
  CertificateDetails?: {
    /** The CA identifier of the CA certificate used for the DB instance's server certificate. */
    CAIdentifier?: string;
    /** The expiration date of the DB instance’s server certificate. */
    ValidTill?: string;
  };
  /**
   * Specifies whether the DB instance is restarted when you rotate your SSL/TLS certificate.
   * By default, the DB instance is restarted when you rotate your SSL/TLS certificate. The certificate
   * is not updated until the DB instance is restarted.
   * Set this parameter only if you are *not* using SSL/TLS to connect to the DB instance.
   * If you are using SSL/TLS to connect to the DB instance, follow the appropriate instructions for
   * your DB engine to rotate your SSL/TLS certificate:
   * +  For more information about rotating your SSL/TLS certificate for RDS DB engines, see [Rotating
   * Your SSL/TLS
   * Certificate.](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.SSL-certificate-rotation.html)
   * in the *Amazon RDS User Guide.*
   * +  For more information about rotating your SSL/TLS certificate for Aurora DB engines, see
   * [Rotating Your SSL/TLS
   * Certificate](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.SSL-certificate-rotation.html)
   * in the *Amazon Aurora User Guide*.
   * This setting doesn't apply to RDS Custom DB instances.
   */
  CertificateRotationRestart?: boolean;
  /**
   * For supported engines, indicates that the DB instance should be associated with the specified
   * character set.
   * *Amazon Aurora*
   * Not applicable. The character set is managed by the DB cluster. For more information, see
   * [AWS::RDS::DBCluster](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbcluster.html).
   */
  CharacterSetName?: string;
  /**
   * Specifies whether to copy tags from the DB instance to snapshots of the DB instance. By default,
   * tags are not copied.
   * This setting doesn't apply to Amazon Aurora DB instances. Copying tags to snapshots is managed by
   * the DB cluster. Setting this value for an Aurora DB instance has no effect on the DB cluster
   * setting.
   */
  CopyTagsToSnapshot?: boolean;
  /**
   * The instance profile associated with the underlying Amazon EC2 instance of an RDS Custom DB
   * instance.
   * This setting is required for RDS Custom.
   * Constraints:
   * +  The profile must exist in your account.
   * +  The profile must have an IAM role that Amazon EC2 has permissions to assume.
   * +  The instance profile name and the associated IAM role name must start with the prefix
   * ``AWSRDSCustom``.
   * For the list of permissions required for the IAM role, see [Configure IAM and your
   * VPC](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/custom-setup-orcl.html#custom-setup-orcl.iam-vpc)
   * in the *Amazon RDS User Guide*.
   */
  CustomIAMInstanceProfile?: string;
  /**
   * The mode of Database Insights to enable for the DB instance.
   * Aurora DB instances inherit this value from the DB cluster, so you can't change this value.
   */
  DatabaseInsightsMode?: string;
  /**
   * The identifier of the DB cluster that this DB instance will belong to.
   * This setting doesn't apply to RDS Custom DB instances.
   */
  DBClusterIdentifier?: string;
  /**
   * The identifier for the Multi-AZ DB cluster snapshot to restore from.
   * For more information on Multi-AZ DB clusters, see [Multi-AZ DB cluster
   * deployments](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts.html)
   * in the *Amazon RDS User Guide*.
   * Constraints:
   * +  Must match the identifier of an existing Multi-AZ DB cluster snapshot.
   * +  Can't be specified when ``DBSnapshotIdentifier`` is specified.
   * +  Must be specified when ``DBSnapshotIdentifier`` isn't specified.
   * +  If you are restoring from a shared manual Multi-AZ DB cluster snapshot, the
   * ``DBClusterSnapshotIdentifier`` must be the ARN of the shared snapshot.
   * +  Can't be the identifier of an Aurora DB cluster snapshot.
   */
  DBClusterSnapshotIdentifier?: string;
  DBInstanceArn?: string;
  /**
   * The compute and memory capacity of the DB instance, for example ``db.m5.large``. Not all DB
   * instance classes are available in all AWS-Regions, or for all database engines. For the full list
   * of DB instance classes, and availability for your engine, see [DB instance
   * classes](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html) in
   * the *Amazon RDS User Guide* or [Aurora DB instance
   * classes](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.DBInstanceClass.html)
   * in the *Amazon Aurora User Guide*.
   */
  DBInstanceClass?: string;
  /**
   * A name for the DB instance. If you specify a name, AWS CloudFormation converts it to lowercase. If
   * you don't specify a name, AWS CloudFormation generates a unique physical ID and uses that ID for
   * the DB instance. For more information, see [Name
   * Type](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-name.html).
   * For information about constraints that apply to DB instance identifiers, see [Naming constraints
   * in Amazon
   * RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html#RDS_Limits.Constraints)
   * in the *Amazon RDS User Guide*.
   * If you specify a name, you can't perform updates that require replacement of this resource. You
   * can perform updates that require no or some interruption. If you must replace the resource, specify
   * a new name.
   * @minLength 1
   * @maxLength 63
   * @pattern ^$|^[a-zA-Z]{1}(?:-?[a-zA-Z0-9]){0,62}$
   */
  DBInstanceIdentifier?: string;
  DBInstanceStatus?: string;
  DbiResourceId?: string;
  /**
   * The meaning of this parameter differs according to the database engine you use.
   * If you specify the ``DBSnapshotIdentifier`` property, this property only applies to RDS for
   * Oracle.
   * *Amazon Aurora*
   * Not applicable. The database name is managed by the DB cluster.
   * *Db2*
   * The name of the database to create when the DB instance is created. If this parameter isn't
   * specified, no database is created in the DB instance.
   * Constraints:
   * +  Must contain 1 to 64 letters or numbers.
   * +  Must begin with a letter. Subsequent characters can be letters, underscores, or digits (0-9).
   * +  Can't be a word reserved by the specified database engine.
   * *MySQL*
   * The name of the database to create when the DB instance is created. If this parameter is not
   * specified, no database is created in the DB instance.
   * Constraints:
   * +  Must contain 1 to 64 letters or numbers.
   * +  Can't be a word reserved by the specified database engine
   * *MariaDB*
   * The name of the database to create when the DB instance is created. If this parameter is not
   * specified, no database is created in the DB instance.
   * Constraints:
   * +  Must contain 1 to 64 letters or numbers.
   * +  Can't be a word reserved by the specified database engine
   * *PostgreSQL*
   * The name of the database to create when the DB instance is created. If this parameter is not
   * specified, the default ``postgres`` database is created in the DB instance.
   * Constraints:
   * +  Must begin with a letter. Subsequent characters can be letters, underscores, or digits (0-9).
   * +  Must contain 1 to 63 characters.
   * +  Can't be a word reserved by the specified database engine
   * *Oracle*
   * The Oracle System ID (SID) of the created DB instance. If you specify ``null``, the default value
   * ``ORCL`` is used. You can't specify the string NULL, or any other reserved word, for ``DBName``.
   * Default: ``ORCL``
   * Constraints:
   * +  Can't be longer than 8 characters
   * *SQL Server*
   * Not applicable. Must be null.
   */
  DBName?: string;
  /**
   * The name of an existing DB parameter group or a reference to an
   * [AWS::RDS::DBParameterGroup](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-rds-dbparametergroup.html)
   * resource created in the template.
   * To list all of the available DB parameter group names, use the following command:
   * ``aws rds describe-db-parameter-groups --query "DBParameterGroups[].DBParameterGroupName"
   * --output text``
   * If any of the data members of the referenced parameter group are changed during an update, the DB
   * instance might need to be restarted, which causes some interruption. If the parameter group
   * contains static parameters, whether they were changed or not, an update triggers a reboot.
   * If you don't specify a value for ``DBParameterGroupName`` property, the default DB parameter
   * group for the specified engine and engine version is used.
   */
  DBParameterGroupName?: string;
  /**
   * A list of the DB security groups to assign to the DB instance. The list can include both the name
   * of existing DB security groups or references to AWS::RDS::DBSecurityGroup resources created in the
   * template.
   * If you set DBSecurityGroups, you must not set VPCSecurityGroups, and vice versa. Also, note that
   * the DBSecurityGroups property exists only for backwards compatibility with older regions and is no
   * longer recommended for providing security information to an RDS DB instance. Instead, use
   * VPCSecurityGroups.
   * If you specify this property, AWS CloudFormation sends only the following properties (if
   * specified) to Amazon RDS during create operations:
   * +   ``AllocatedStorage``
   * +   ``AutoMinorVersionUpgrade``
   * +   ``AvailabilityZone``
   * +   ``BackupRetentionPeriod``
   * +   ``CharacterSetName``
   * +   ``DBInstanceClass``
   * +   ``DBName``
   * +   ``DBParameterGroupName``
   * +   ``DBSecurityGroups``
   * +   ``DBSubnetGroupName``
   * +   ``Engine``
   * +   ``EngineVersion``
   * +   ``Iops``
   * +   ``LicenseModel``
   * +   ``MasterUsername``
   * +   ``MasterUserPassword``
   * +   ``MultiAZ``
   * +   ``OptionGroupName``
   * +   ``PreferredBackupWindow``
   * +   ``PreferredMaintenanceWindow``
   * All other properties are ignored. Specify a virtual private cloud (VPC) security group if you want
   * to submit other properties, such as ``StorageType``, ``StorageEncrypted``, or ``KmsKeyId``. If
   * you're already using the ``DBSecurityGroups`` property, you can't use these other properties by
   * updating your DB instance to use a VPC security group. You must recreate the DB instance.
   * @uniqueItems true
   */
  DBSecurityGroups?: string[];
  /**
   * The name or Amazon Resource Name (ARN) of the DB snapshot that's used to restore the DB instance.
   * If you're restoring from a shared manual DB snapshot, you must specify the ARN of the snapshot.
   * By specifying this property, you can create a DB instance from the specified DB snapshot. If the
   * ``DBSnapshotIdentifier`` property is an empty string or the ``AWS::RDS::DBInstance`` declaration
   * has no ``DBSnapshotIdentifier`` property, AWS CloudFormation creates a new database. If the
   * property contains a value (other than an empty string), AWS CloudFormation creates a database from
   * the specified snapshot. If a snapshot with the specified name doesn't exist, AWS CloudFormation
   * can't create the database and it rolls back the stack.
   * Some DB instance properties aren't valid when you restore from a snapshot, such as the
   * ``MasterUsername`` and ``MasterUserPassword`` properties, and the point-in-time recovery properties
   * ``RestoreTime`` and ``UseLatestRestorableTime``. For information about the properties that you can
   * specify, see the
   * [RestoreDBInstanceFromDBSnapshot](https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_RestoreDBInstanceFromDBSnapshot.html)
   * action in the *Amazon RDS API Reference*.
   * After you restore a DB instance with a ``DBSnapshotIdentifier`` property, you must specify the
   * same ``DBSnapshotIdentifier`` property for any future updates to the DB instance. When you specify
   * this property for an update, the DB instance is not restored from the DB snapshot again, and the
   * data in the database is not changed. However, if you don't specify the ``DBSnapshotIdentifier``
   * property, an empty DB instance is created, and the original DB instance is deleted. If you specify
   * a property that is different from the previous snapshot restore property, a new DB instance is
   * restored from the specified ``DBSnapshotIdentifier`` property, and the original DB instance is
   * deleted.
   * If you specify the ``DBSnapshotIdentifier`` property to restore a DB instance (as opposed to
   * specifying it for DB instance updates), then don't specify the following properties:
   * +   ``CharacterSetName``
   * +   ``DBClusterIdentifier``
   * +   ``DBName``
   * +   ``KmsKeyId``
   * +   ``MasterUsername``
   * +   ``MasterUserPassword``
   * +   ``PromotionTier``
   * +   ``SourceDBInstanceIdentifier``
   * +   ``SourceRegion``
   * +  ``StorageEncrypted`` (for an unencrypted snapshot)
   * +   ``Timezone``
   * *Amazon Aurora*
   * Not applicable. Snapshot restore is managed by the DB cluster.
   */
  DBSnapshotIdentifier?: string;
  /**
   * A DB subnet group to associate with the DB instance. If you update this value, the new subnet group
   * must be a subnet group in a new VPC.
   * If you don't specify a DB subnet group, RDS uses the default DB subnet group if one exists. If a
   * default DB subnet group does not exist, and you don't specify a ``DBSubnetGroupName``, the DB
   * instance fails to launch.
   * For more information about using Amazon RDS in a VPC, see [Amazon VPC and Amazon
   * RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.html) in the *Amazon RDS User
   * Guide*.
   * This setting doesn't apply to Amazon Aurora DB instances. The DB subnet group is managed by the DB
   * cluster. If specified, the setting must match the DB cluster setting.
   */
  DBSubnetGroupName?: string;
  /**
   * The Oracle system identifier (SID), which is the name of the Oracle database instance that manages
   * your database files. In this context, the term "Oracle database instance" refers exclusively to the
   * system global area (SGA) and Oracle background processes. If you don't specify a SID, the value
   * defaults to ``RDSCDB``. The Oracle SID is also the name of your CDB.
   */
  DBSystemId?: string;
  /** Indicates whether the DB instance has a dedicated log volume (DLV) enabled. */
  DedicatedLogVolume?: boolean;
  /**
   * A value that indicates whether to remove automated backups immediately after the DB instance is
   * deleted. This parameter isn't case-sensitive. The default is to remove automated backups
   * immediately after the DB instance is deleted.
   * *Amazon Aurora*
   * Not applicable. When you delete a DB cluster, all automated backups for that DB cluster are
   * deleted and can't be recovered. Manual DB cluster snapshots of the DB cluster are not deleted.
   */
  DeleteAutomatedBackups?: boolean;
  /**
   * Specifies whether the DB instance has deletion protection enabled. The database can't be deleted
   * when deletion protection is enabled. By default, deletion protection isn't enabled. For more
   * information, see [Deleting a DB
   * Instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html).
   * This setting doesn't apply to Amazon Aurora DB instances. You can enable or disable deletion
   * protection for the DB cluster. For more information, see ``CreateDBCluster``. DB instances in a DB
   * cluster can be deleted even when deletion protection is enabled for the DB cluster.
   */
  DeletionProtection?: boolean;
  /**
   * The Active Directory directory ID to create the DB instance in. Currently, only Db2, MySQL,
   * Microsoft SQL Server, Oracle, and PostgreSQL DB instances can be created in an Active Directory
   * Domain.
   * For more information, see [Kerberos
   * Authentication](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/kerberos-authentication.html)
   * in the *Amazon RDS User Guide*.
   */
  Domain?: string;
  /**
   * The ARN for the Secrets Manager secret with the credentials for the user joining the domain.
   * Example: ``arn:aws:secretsmanager:region:account-number:secret:myselfmanagedADtestsecret-123456``
   */
  DomainAuthSecretArn?: string;
  /**
   * The IPv4 DNS IP addresses of your primary and secondary Active Directory domain controllers.
   * Constraints:
   * +  Two IP addresses must be provided. If there isn't a secondary domain controller, use the IP
   * address of the primary domain controller for both entries in the list.
   * Example: ``123.124.125.126,234.235.236.237``
   */
  DomainDnsIps?: string[];
  /**
   * The fully qualified domain name (FQDN) of an Active Directory domain.
   * Constraints:
   * +  Can't be longer than 64 characters.
   * Example: ``mymanagedADtest.mymanagedAD.mydomain``
   */
  DomainFqdn?: string;
  /**
   * The name of the IAM role to use when making API calls to the Directory Service.
   * This setting doesn't apply to the following DB instances:
   * +  Amazon Aurora (The domain is managed by the DB cluster.)
   * +  RDS Custom
   */
  DomainIAMRoleName?: string;
  /**
   * The Active Directory organizational unit for your DB instance to join.
   * Constraints:
   * +  Must be in the distinguished name format.
   * +  Can't be longer than 64 characters.
   * Example: ``OU=mymanagedADtestOU,DC=mymanagedADtest,DC=mymanagedAD,DC=mydomain``
   */
  DomainOu?: string;
  /**
   * The list of log types that need to be enabled for exporting to CloudWatch Logs. The values in the
   * list depend on the DB engine being used. For more information, see [Publishing Database Logs to
   * Amazon CloudWatch
   * Logs](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.html#USER_LogAccess.Procedural.UploadtoCloudWatch)
   * in the *Amazon Relational Database Service User Guide*.
   * *Amazon Aurora*
   * Not applicable. CloudWatch Logs exports are managed by the DB cluster.
   * *Db2*
   * Valid values: ``diag.log``, ``notify.log``
   * *MariaDB*
   * Valid values: ``audit``, ``error``, ``general``, ``slowquery``
   * *Microsoft SQL Server*
   * Valid values: ``agent``, ``error``
   * *MySQL*
   * Valid values: ``audit``, ``error``, ``general``, ``slowquery``
   * *Oracle*
   * Valid values: ``alert``, ``audit``, ``listener``, ``trace``, ``oemagent``
   * *PostgreSQL*
   * Valid values: ``postgresql``, ``upgrade``
   */
  EnableCloudwatchLogsExports?: string[];
  /**
   * A value that indicates whether to enable mapping of AWS Identity and Access Management (IAM)
   * accounts to database accounts. By default, mapping is disabled.
   * This property is supported for RDS for MariaDB, RDS for MySQL, and RDS for PostgreSQL. For more
   * information, see [IAM Database Authentication for MariaDB, MySQL, and
   * PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html) in
   * the *Amazon RDS User Guide.*
   * *Amazon Aurora*
   * Not applicable. Mapping AWS IAM accounts to database accounts is managed by the DB cluster.
   */
  EnableIAMDatabaseAuthentication?: boolean;
  /**
   * Specifies whether to enable Performance Insights for the DB instance. For more information, see
   * [Using Amazon Performance
   * Insights](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.html) in the
   * *Amazon RDS User Guide*.
   * This setting doesn't apply to RDS Custom DB instances.
   */
  EnablePerformanceInsights?: boolean;
  Endpoint?: {
    /** Specifies the DNS address of the DB instance. */
    Address?: string;
    /** Specifies the port that the database engine is listening on. */
    Port?: string;
    /** Specifies the ID that Amazon Route 53 assigns when you create a hosted zone. */
    HostedZoneId?: string;
  };
  /**
   * The name of the database engine to use for this DB instance. Not every database engine is available
   * in every AWS Region.
   * This property is required when creating a DB instance.
   * You can convert an Oracle database from the non-CDB architecture to the container database (CDB)
   * architecture by updating the ``Engine`` value in your templates from ``oracle-ee`` to
   * ``oracle-ee-cdb`` or from ``oracle-se2`` to ``oracle-se2-cdb``. Converting to the CDB architecture
   * requires an interruption.
   * Valid Values:
   * +  ``aurora-mysql`` (for Aurora MySQL DB instances)
   * +  ``aurora-postgresql`` (for Aurora PostgreSQL DB instances)
   * +  ``custom-oracle-ee`` (for RDS Custom for Oracle DB instances)
   * +  ``custom-oracle-ee-cdb`` (for RDS Custom for Oracle DB instances)
   * +  ``custom-sqlserver-ee`` (for RDS Custom for SQL Server DB instances)
   * +  ``custom-sqlserver-se`` (for RDS Custom for SQL Server DB instances)
   * +  ``custom-sqlserver-web`` (for RDS Custom for SQL Server DB instances)
   * +   ``db2-ae``
   * +   ``db2-se``
   * +   ``mariadb``
   * +   ``mysql``
   * +   ``oracle-ee``
   * +   ``oracle-ee-cdb``
   * +   ``oracle-se2``
   * +   ``oracle-se2-cdb``
   * +   ``postgres``
   * +   ``sqlserver-ee``
   * +   ``sqlserver-se``
   * +   ``sqlserver-ex``
   * +   ``sqlserver-web``
   */
  Engine?: string;
  /**
   * The life cycle type for this DB instance.
   * By default, this value is set to ``open-source-rds-extended-support``, which enrolls your DB
   * instance into Amazon RDS Extended Support. At the end of standard support, you can avoid charges
   * for Extended Support by setting the value to ``open-source-rds-extended-support-disabled``. In this
   * case, creating the DB instance will fail if the DB major version is past its end of standard
   * support date.
   * This setting applies only to RDS for MySQL and RDS for PostgreSQL. For Amazon Aurora DB
   * instances, the life cycle type is managed by the DB cluster.
   * You can use this setting to enroll your DB instance into Amazon RDS Extended Support. With RDS
   * Extended Support, you can run the selected major engine version on your DB instance past the end of
   * standard support for that engine version. For more information, see [Amazon RDS Extended Support
   * with Amazon RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/extended-support.html) in
   * the *Amazon RDS User Guide*.
   * Valid Values: ``open-source-rds-extended-support | open-source-rds-extended-support-disabled``
   * Default: ``open-source-rds-extended-support``
   */
  EngineLifecycleSupport?: string;
  /**
   * The version number of the database engine to use.
   * For a list of valid engine versions, use the ``DescribeDBEngineVersions`` action.
   * The following are the database engines and links to information about the major and minor versions
   * that are available with Amazon RDS. Not every database engine is available for every AWS Region.
   * *Amazon Aurora*
   * Not applicable. The version number of the database engine to be used by the DB instance is managed
   * by the DB cluster.
   * *Db2*
   * See [Amazon RDS for
   * Db2](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Db2.html#Db2.Concepts.VersionMgmt)
   * in the *Amazon RDS User Guide.*
   * *MariaDB*
   * See [MariaDB on Amazon RDS
   * Versions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MariaDB.html#MariaDB.Concepts.VersionMgmt)
   * in the *Amazon RDS User Guide.*
   * *Microsoft SQL Server*
   * See [Microsoft SQL Server Versions on Amazon
   * RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_SQLServer.html#SQLServer.Concepts.General.VersionSupport)
   * in the *Amazon RDS User Guide.*
   * *MySQL*
   * See [MySQL on Amazon RDS
   * Versions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_MySQL.html#MySQL.Concepts.VersionMgmt)
   * in the *Amazon RDS User Guide.*
   * *Oracle*
   * See [Oracle Database Engine Release
   * Notes](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.Oracle.PatchComposition.html)
   * in the *Amazon RDS User Guide.*
   * *PostgreSQL*
   * See [Supported PostgreSQL Database
   * Versions](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html#PostgreSQL.Concepts.General.DBVersions)
   * in the *Amazon RDS User Guide.*
   */
  EngineVersion?: string;
  /**
   * Specifies whether to manage the master user password with AWS Secrets Manager.
   * For more information, see [Password management with Secrets
   * Manager](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html) in the
   * *Amazon RDS User Guide.*
   * Constraints:
   * +  Can't manage the master user password with AWS Secrets Manager if ``MasterUserPassword`` is
   * specified.
   */
  ManageMasterUserPassword?: boolean;
  InstanceCreateTime?: string;
  /**
   * The number of I/O operations per second (IOPS) that the database provisions. The value must be
   * equal to or greater than 1000.
   * If you specify this property, you must follow the range of allowed ratios of your requested IOPS
   * rate to the amount of storage that you allocate (IOPS to allocated storage). For example, you can
   * provision an Oracle database instance with 1000 IOPS and 200 GiB of storage (a ratio of 5:1), or
   * specify 2000 IOPS with 200 GiB of storage (a ratio of 10:1). For more information, see [Amazon RDS
   * Provisioned IOPS Storage to Improve
   * Performance](https://docs.aws.amazon.com/AmazonRDS/latest/DeveloperGuide/CHAP_Storage.html#USER_PIOPS)
   * in the *Amazon RDS User Guide*.
   * If you specify ``io1`` for the ``StorageType`` property, then you must also specify the ``Iops``
   * property.
   * Constraints:
   * +  For RDS for Db2, MariaDB, MySQL, Oracle, and PostgreSQL - Must be a multiple between .5 and 50
   * of the storage amount for the DB instance.
   * +  For RDS for SQL Server - Must be a multiple between 1 and 50 of the storage amount for the DB
   * instance.
   */
  Iops?: number;
  IsStorageConfigUpgradeAvailable?: boolean;
  /**
   * The ARN of the AWS KMS key that's used to encrypt the DB instance, such as
   * ``arn:aws:kms:us-east-1:012345678910:key/abcd1234-a123-456a-a12b-a123b4cd56ef``. If you enable the
   * StorageEncrypted property but don't specify this property, AWS CloudFormation uses the default KMS
   * key. If you specify this property, you must set the StorageEncrypted property to true.
   * If you specify the ``SourceDBInstanceIdentifier`` or ``SourceDbiResourceId`` property, don't
   * specify this property. The value is inherited from the source DB instance, and if the DB instance
   * is encrypted, the specified ``KmsKeyId`` property is used. However, if the source DB instance is in
   * a different AWS Region, you must specify a KMS key ID.
   * If you specify the ``SourceDBInstanceAutomatedBackupsArn`` property, don't specify this property.
   * The value is inherited from the source DB instance automated backup, and if the automated backup is
   * encrypted, the specified ``KmsKeyId`` property is used.
   * If you create an encrypted read replica in a different AWS Region, then you must specify a KMS key
   * for the destination AWS Region. KMS encryption keys are specific to the region that they're created
   * in, and you can't use encryption keys from one region in another region.
   * If you specify the ``DBSnapshotIdentifier`` property, don't specify this property. The
   * ``StorageEncrypted`` property value is inherited from the snapshot. If the DB instance is
   * encrypted, the specified ``KmsKeyId`` property is also inherited from the snapshot.
   * If you specify ``DBSecurityGroups``, AWS CloudFormation ignores this property. To specify both a
   * security group and this property, you must use a VPC security group. For more information about
   * Amazon RDS and VPC, see [Using Amazon RDS with Amazon
   * VPC](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.html) in the *Amazon RDS User
   * Guide*.
   * *Amazon Aurora*
   * Not applicable. The KMS key identifier is managed by the DB cluster.
   */
  KmsKeyId?: string;
  LatestRestorableTime?: string;
  /**
   * License model information for this DB instance.
   * Valid Values:
   * +  Aurora MySQL - ``general-public-license``
   * +  Aurora PostgreSQL - ``postgresql-license``
   * +  RDS for Db2 - ``bring-your-own-license``. For more information about RDS for Db2 licensing,
   * see [](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/db2-licensing.html) in the *Amazon
   * RDS User Guide.*
   * +  RDS for MariaDB - ``general-public-license``
   * +  RDS for Microsoft SQL Server - ``license-included``
   * +  RDS for MySQL - ``general-public-license``
   * +  RDS for Oracle - ``bring-your-own-license`` or ``license-included``
   * +  RDS for PostgreSQL - ``postgresql-license``
   * If you've specified ``DBSecurityGroups`` and then you update the license model, AWS
   * CloudFormation replaces the underlying DB instance. This will incur some interruptions to database
   * availability.
   */
  LicenseModel?: string;
  ListenerEndpoint?: {
    /** Specifies the DNS address of the DB instance. */
    Address?: string;
    /** Specifies the port that the database engine is listening on. */
    Port?: string;
    /** Specifies the ID that Amazon Route 53 assigns when you create a hosted zone. */
    HostedZoneId?: string;
  };
  /**
   * Specifies the authentication type for the master user. With IAM master user authentication, you can
   * configure the master DB user with IAM database authentication when you create a DB instance.
   * You can specify one of the following values:
   * +  ``password`` - Use standard database authentication with a password.
   * +  ``iam-db-auth`` - Use IAM database authentication for the master user.
   * This option is only valid for RDS for MySQL, RDS for MariaDB, RDS for PostgreSQL, Aurora MySQL,
   * and Aurora PostgreSQL engines.
   */
  MasterUserAuthenticationType?: string;
  /**
   * The master user name for the DB instance.
   * If you specify the ``SourceDBInstanceIdentifier`` or ``DBSnapshotIdentifier`` property, don't
   * specify this property. The value is inherited from the source DB instance or snapshot.
   * When migrating a self-managed Db2 database, we recommend that you use the same master username as
   * your self-managed Db2 instance name.
   * *Amazon Aurora*
   * Not applicable. The name for the master user is managed by the DB cluster.
   * *RDS for Db2*
   * Constraints:
   * +  Must be 1 to 16 letters or numbers.
   * +  First character must be a letter.
   * +  Can't be a reserved word for the chosen database engine.
   * *RDS for MariaDB*
   * Constraints:
   * +  Must be 1 to 16 letters or numbers.
   * +  Can't be a reserved word for the chosen database engine.
   * *RDS for Microsoft SQL Server*
   * Constraints:
   * +  Must be 1 to 128 letters or numbers.
   * +  First character must be a letter.
   * +  Can't be a reserved word for the chosen database engine.
   * *RDS for MySQL*
   * Constraints:
   * +  Must be 1 to 16 letters or numbers.
   * +  First character must be a letter.
   * +  Can't be a reserved word for the chosen database engine.
   * *RDS for Oracle*
   * Constraints:
   * +  Must be 1 to 30 letters or numbers.
   * +  First character must be a letter.
   * +  Can't be a reserved word for the chosen database engine.
   * *RDS for PostgreSQL*
   * Constraints:
   * +  Must be 1 to 63 letters or numbers.
   * +  First character must be a letter.
   * +  Can't be a reserved word for the chosen database engine.
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z][a-zA-Z0-9_]{0,127}$
   */
  MasterUsername?: string;
  /**
   * The password for the master user. The password can include any printable ASCII character except
   * "/", """, or "@".
   * *Amazon Aurora*
   * Not applicable. The password for the master user is managed by the DB cluster.
   * *RDS for Db2*
   * Must contain from 8 to 255 characters.
   * *RDS for MariaDB*
   * Constraints: Must contain from 8 to 41 characters.
   * *RDS for Microsoft SQL Server*
   * Constraints: Must contain from 8 to 128 characters.
   * *RDS for MySQL*
   * Constraints: Must contain from 8 to 41 characters.
   * *RDS for Oracle*
   * Constraints: Must contain from 8 to 30 characters.
   * *RDS for PostgreSQL*
   * Constraints: Must contain from 8 to 128 characters.
   */
  MasterUserPassword?: string;
  /**
   * The secret managed by RDS in AWS Secrets Manager for the master user password.
   * For more information, see [Password management with Secrets
   * Manager](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html) in the
   * *Amazon RDS User Guide.*
   */
  MasterUserSecret?: {
    /**
     * The Amazon Resource Name (ARN) of the secret. This parameter is a return value that you can
     * retrieve using the ``Fn::GetAtt`` intrinsic function. For more information, see [Return
     * values](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbinstance.html#aws-resource-rds-dbinstance-return-values).
     */
    SecretArn?: string;
    /** The AWS KMS key identifier that is used to encrypt the secret. */
    KmsKeyId?: string;
  };
  /**
   * The upper limit in gibibytes (GiB) to which Amazon RDS can automatically scale the storage of the
   * DB instance.
   * For more information about this setting, including limitations that apply to it, see [Managing
   * capacity automatically with Amazon RDS storage
   * autoscaling](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.StorageTypes.html#USER_PIOPS.Autoscaling)
   * in the *Amazon RDS User Guide*.
   * This setting doesn't apply to the following DB instances:
   * +  Amazon Aurora (Storage is managed by the DB cluster.)
   * +  RDS Custom
   */
  MaxAllocatedStorage?: number;
  /**
   * The interval, in seconds, between points when Enhanced Monitoring metrics are collected for the DB
   * instance. To disable collection of Enhanced Monitoring metrics, specify ``0``.
   * If ``MonitoringRoleArn`` is specified, then you must set ``MonitoringInterval`` to a value other
   * than ``0``.
   * This setting doesn't apply to RDS Custom DB instances.
   * Valid Values: ``0 | 1 | 5 | 10 | 15 | 30 | 60``
   * Default: ``0``
   */
  MonitoringInterval?: number;
  /**
   * The ARN for the IAM role that permits RDS to send enhanced monitoring metrics to Amazon CloudWatch
   * Logs. For example, ``arn:aws:iam:123456789012:role/emaccess``. For information on creating a
   * monitoring role, see [Setting Up and Enabling Enhanced
   * Monitoring](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.html#USER_Monitoring.OS.Enabling)
   * in the *Amazon RDS User Guide*.
   * If ``MonitoringInterval`` is set to a value other than ``0``, then you must supply a
   * ``MonitoringRoleArn`` value.
   * This setting doesn't apply to RDS Custom DB instances.
   */
  MonitoringRoleArn?: string;
  /**
   * Specifies whether the DB instance is a Multi-AZ deployment. You can't set the ``AvailabilityZone``
   * parameter if the DB instance is a Multi-AZ deployment.
   * This setting doesn't apply to Amazon Aurora because the DB instance Availability Zones (AZs) are
   * managed by the DB cluster.
   */
  MultiAZ?: boolean;
  /**
   * The name of the NCHAR character set for the Oracle DB instance.
   * This setting doesn't apply to RDS Custom DB instances.
   */
  NcharCharacterSetName?: string;
  /**
   * The network type of the DB instance.
   * Valid values:
   * +   ``IPV4``
   * +   ``DUAL``
   * The network type is determined by the ``DBSubnetGroup`` specified for the DB instance. A
   * ``DBSubnetGroup`` can support only the IPv4 protocol or the IPv4 and IPv6 protocols (``DUAL``).
   * For more information, see [Working with a DB instance in a
   * VPC](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html)
   * in the *Amazon RDS User Guide.*
   */
  NetworkType?: string;
  /**
   * Indicates that the DB instance should be associated with the specified option group.
   * Permanent options, such as the TDE option for Oracle Advanced Security TDE, can't be removed from
   * an option group. Also, that option group can't be removed from a DB instance once it is associated
   * with a DB instance.
   */
  OptionGroupName?: string;
  PercentProgress?: string;
  /**
   * The AWS KMS key identifier for encryption of Performance Insights data.
   * The KMS key identifier is the key ARN, key ID, alias ARN, or alias name for the KMS key.
   * If you do not specify a value for ``PerformanceInsightsKMSKeyId``, then Amazon RDS uses your
   * default KMS key. There is a default KMS key for your AWS account. Your AWS account has a different
   * default KMS key for each AWS Region.
   * For information about enabling Performance Insights, see
   * [EnablePerformanceInsights](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-rds-database-instance.html#cfn-rds-dbinstance-enableperformanceinsights).
   */
  PerformanceInsightsKMSKeyId?: string;
  /**
   * The number of days to retain Performance Insights data. When creating a DB instance without
   * enabling Performance Insights, you can't specify the parameter
   * ``PerformanceInsightsRetentionPeriod``.
   * This setting doesn't apply to RDS Custom DB instances.
   * Valid Values:
   * +   ``7``
   * +  *month* * 31, where *month* is a number of months from 1-23. Examples: ``93`` (3 months * 31),
   * ``341`` (11 months * 31), ``589`` (19 months * 31)
   * +   ``731``
   * Default: ``7`` days
   * If you specify a retention period that isn't valid, such as ``94``, Amazon RDS returns an error.
   */
  PerformanceInsightsRetentionPeriod?: number;
  /**
   * The port number on which the database accepts connections.
   * This setting doesn't apply to Aurora DB instances. The port number is managed by the cluster.
   * Valid Values: ``1150-65535``
   * Default:
   * +  RDS for Db2 - ``50000``
   * +  RDS for MariaDB - ``3306``
   * +  RDS for Microsoft SQL Server - ``1433``
   * +  RDS for MySQL - ``3306``
   * +  RDS for Oracle - ``1521``
   * +  RDS for PostgreSQL - ``5432``
   * Constraints:
   * +  For RDS for Microsoft SQL Server, the value can't be ``1234``, ``1434``, ``3260``, ``3343``,
   * ``3389``, ``47001``, or ``49152-49156``.
   * @pattern ^\d*$
   */
  Port?: string;
  /**
   * The daily time range during which automated backups are created if automated backups are enabled,
   * using the ``BackupRetentionPeriod`` parameter. For more information, see [Backup
   * Window](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html#USER_WorkingWithAutomatedBackups.BackupWindow)
   * in the *Amazon RDS User Guide.*
   * Constraints:
   * +  Must be in the format ``hh24:mi-hh24:mi``.
   * +  Must be in Universal Coordinated Time (UTC).
   * +  Must not conflict with the preferred maintenance window.
   * +  Must be at least 30 minutes.
   * *Amazon Aurora*
   * Not applicable. The daily time range for creating automated backups is managed by the DB cluster.
   */
  PreferredBackupWindow?: string;
  /**
   * The weekly time range during which system maintenance can occur, in Universal Coordinated Time
   * (UTC).
   * Format: ``ddd:hh24:mi-ddd:hh24:mi``
   * The default is a 30-minute window selected at random from an 8-hour block of time for each AWS
   * Region, occurring on a random day of the week. To see the time blocks available, see [Maintaining a
   * DB
   * instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Maintenance.html#AdjustingTheMaintenanceWindow)
   * in the *Amazon RDS User Guide.*
   * This property applies when AWS CloudFormation initially creates the DB instance. If you use AWS
   * CloudFormation to update the DB instance, those updates are applied immediately.
   * Constraints: Minimum 30-minute window.
   */
  PreferredMaintenanceWindow?: string;
  /**
   * The number of CPU cores and the number of threads per core for the DB instance class of the DB
   * instance.
   * This setting doesn't apply to Amazon Aurora or RDS Custom DB instances.
   */
  ProcessorFeatures?: ({
    /**
     * The name of the processor feature. Valid names are ``coreCount`` and ``threadsPerCore``.
     * @enum ["coreCount","threadsPerCore"]
     */
    Name?: "coreCount" | "threadsPerCore";
    /** The value of a processor feature. */
    Value?: string;
  })[];
  /**
   * The order of priority in which an Aurora Replica is promoted to the primary instance after a
   * failure of the existing primary instance. For more information, see [Fault Tolerance for an Aurora
   * DB
   * Cluster](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html#Aurora.Managing.FaultTolerance)
   * in the *Amazon Aurora User Guide*.
   * This setting doesn't apply to RDS Custom DB instances.
   * Default: ``1``
   * Valid Values: ``0 - 15``
   * @minimum 0
   */
  PromotionTier?: number;
  /**
   * Indicates whether the DB instance is an internet-facing instance. If you specify true, AWS
   * CloudFormation creates an instance with a publicly resolvable DNS name, which resolves to a public
   * IP address. If you specify false, AWS CloudFormation creates an internal instance with a DNS name
   * that resolves to a private IP address.
   * The default behavior value depends on your VPC setup and the database subnet group. For more
   * information, see the ``PubliclyAccessible`` parameter in the
   * [CreateDBInstance](https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_CreateDBInstance.html)
   * in the *Amazon RDS API Reference*.
   */
  PubliclyAccessible?: boolean;
  ReadReplicaDBClusterIdentifiers?: string[];
  ReadReplicaDBInstanceIdentifiers?: string[];
  /**
   * The open mode of an Oracle read replica. For more information, see [Working with Oracle Read
   * Replicas for Amazon
   * RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/oracle-read-replicas.html) in the
   * *Amazon RDS User Guide*.
   * This setting is only supported in RDS for Oracle.
   * Default: ``open-read-only``
   * Valid Values: ``open-read-only`` or ``mounted``
   */
  ReplicaMode?: string;
  /**
   * The date and time to restore from. This parameter applies to point-in-time recovery. For more
   * information, see [Restoring a DB instance to a specified
   * time](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html) in the in the *Amazon
   * RDS User Guide*.
   * Constraints:
   * +  Must be a time in Universal Coordinated Time (UTC) format.
   * +  Must be before the latest restorable time for the DB instance.
   * +  Can't be specified if the ``UseLatestRestorableTime`` parameter is enabled.
   * Example: ``2009-09-07T23:45:00Z``
   */
  RestoreTime?: string;
  ResumeFullAutomationModeTime?: string;
  SecondaryAvailabilityZone?: string;
  /**
   * The identifier of the Multi-AZ DB cluster that will act as the source for the read replica. Each DB
   * cluster can have up to 15 read replicas.
   * Constraints:
   * +  Must be the identifier of an existing Multi-AZ DB cluster.
   * +  Can't be specified if the ``SourceDBInstanceIdentifier`` parameter is also specified.
   * +  The specified DB cluster must have automatic backups enabled, that is, its backup retention
   * period must be greater than 0.
   * +  The source DB cluster must be in the same AWS-Region as the read replica. Cross-Region
   * replication isn't supported.
   */
  SourceDBClusterIdentifier?: string;
  /** The resource ID of the source DB instance from which to restore. */
  SourceDbiResourceId?: string;
  /**
   * The Amazon Resource Name (ARN) of the replicated automated backups from which to restore, for
   * example, ``arn:aws:rds:us-east-1:123456789012:auto-backup:ab-L2IJCEXJP7XQ7HOJ4SIEXAMPLE``.
   * This setting doesn't apply to RDS Custom.
   */
  SourceDBInstanceAutomatedBackupsArn?: string;
  /**
   * If you want to create a read replica DB instance, specify the ID of the source DB instance. Each DB
   * instance can have a limited number of read replicas. For more information, see [Working with Read
   * Replicas](https://docs.aws.amazon.com/AmazonRDS/latest/DeveloperGuide/USER_ReadRepl.html) in the
   * *Amazon RDS User Guide*.
   * For information about constraints that apply to DB instance identifiers, see [Naming constraints
   * in Amazon
   * RDS](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html#RDS_Limits.Constraints)
   * in the *Amazon RDS User Guide*.
   * The ``SourceDBInstanceIdentifier`` property determines whether a DB instance is a read replica. If
   * you remove the ``SourceDBInstanceIdentifier`` property from your template and then update your
   * stack, AWS CloudFormation promotes the read replica to a standalone DB instance.
   * If you specify the ``UseLatestRestorableTime`` or ``RestoreTime`` properties in conjunction with
   * the ``SourceDBInstanceIdentifier`` property, RDS restores the DB instance to the requested point in
   * time, thereby creating a new DB instance.
   * +  If you specify a source DB instance that uses VPC security groups, we recommend that you
   * specify the ``VPCSecurityGroups`` property. If you don't specify the property, the read replica
   * inherits the value of the ``VPCSecurityGroups`` property from the source DB when you create the
   * replica. However, if you update the stack, AWS CloudFormation reverts the replica's
   * ``VPCSecurityGroups`` property to the default value because it's not defined in the stack's
   * template. This change might cause unexpected issues.
   * +  Read replicas don't support deletion policies. AWS CloudFormation ignores any deletion policy
   * that's associated with a read replica.
   * +  If you specify ``SourceDBInstanceIdentifier``, don't specify the ``DBSnapshotIdentifier``
   * property. You can't create a read replica from a snapshot.
   * +  Don't set the ``BackupRetentionPeriod``, ``DBName``, ``MasterUsername``,
   * ``MasterUserPassword``, and ``PreferredBackupWindow`` properties. The database attributes are
   * inherited from the source DB instance, and backups are disabled for read replicas.
   * +  If the source DB instance is in a different region than the read replica, specify the source
   * region in ``SourceRegion``, and specify an ARN for a valid DB instance in
   * ``SourceDBInstanceIdentifier``. For more information, see [Constructing a Amazon RDS Amazon
   * Resource Name
   * (ARN)](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Tagging.html#USER_Tagging.ARN)
   * in the *Amazon RDS User Guide*.
   * +  For DB instances in Amazon Aurora clusters, don't specify this property. Amazon RDS
   * automatically assigns writer and reader DB instances.
   */
  SourceDBInstanceIdentifier?: string;
  /** The ID of the region that contains the source DB instance for the read replica. */
  SourceRegion?: string;
  StatusInfos?: {
    /**
     * Details of the error if there is an error for the instance. If the instance isn't in an error
     * state, this value is blank.
     */
    Message?: string;
    /** Indicates whether the instance is operating normally (TRUE) or is in an error state (FALSE). */
    Normal?: boolean;
    /**
     * The status of the DB instance. For a StatusType of read replica, the values can be replicating,
     * replication stop point set, replication stop point reached, error, stopped, or terminated.
     */
    Status?: string;
    /** This value is currently "read replication." */
    StatusType?: string;
  }[];
  /**
   * A value that indicates whether the DB instance is encrypted. By default, it isn't encrypted.
   * If you specify the ``KmsKeyId`` property, then you must enable encryption.
   * If you specify the ``SourceDBInstanceIdentifier`` or ``SourceDbiResourceId`` property, don't
   * specify this property. The value is inherited from the source DB instance, and if the DB instance
   * is encrypted, the specified ``KmsKeyId`` property is used.
   * If you specify the ``SourceDBInstanceAutomatedBackupsArn`` property, don't specify this property.
   * The value is inherited from the source DB instance automated backup.
   * If you specify ``DBSnapshotIdentifier`` property, don't specify this property. The value is
   * inherited from the snapshot.
   * *Amazon Aurora*
   * Not applicable. The encryption for DB instances is managed by the DB cluster.
   */
  StorageEncrypted?: boolean;
  /**
   * The storage type to associate with the DB instance.
   * If you specify ``io1``, ``io2``, or ``gp3``, you must also include a value for the ``Iops``
   * parameter.
   * This setting doesn't apply to Amazon Aurora DB instances. Storage is managed by the DB cluster.
   * Valid Values: ``gp2 | gp3 | io1 | io2 | standard``
   * Default: ``io1``, if the ``Iops`` parameter is specified. Otherwise, ``gp3``.
   */
  StorageType?: string;
  /**
   * Specifies the storage throughput value, in mebibyte per second (MiBps), for the DB instance. This
   * setting applies only to the ``gp3`` storage type.
   * This setting doesn't apply to RDS Custom or Amazon Aurora.
   */
  StorageThroughput?: number;
  /**
   * Tags to assign to the DB instance.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * A key is the required name of the tag. The string value can be from 1 to 128 Unicode characters in
     * length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set of
     * Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A value is the optional value of the tag. The string value can be from 1 to 256 Unicode characters
     * in length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set
     * of Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
  TdeCredentialArn?: string;
  TdeCredentialPassword?: string;
  /**
   * The time zone of the DB instance. The time zone parameter is currently supported only by [RDS for
   * Db2](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/db2-time-zone) and [RDS for SQL
   * Server](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_SQLServer.html#SQLServer.Concepts.General.TimeZone).
   */
  Timezone?: string;
  /**
   * Specifies whether the DB instance class of the DB instance uses its default processor features.
   * This setting doesn't apply to RDS Custom DB instances.
   */
  UseDefaultProcessorFeatures?: boolean;
  /**
   * Specifies whether the DB instance is restored from the latest backup time. By default, the DB
   * instance isn't restored from the latest backup time. This parameter applies to point-in-time
   * recovery. For more information, see [Restoring a DB instance to a specified
   * time](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html) in the in the *Amazon
   * RDS User Guide*.
   * Constraints:
   * +  Can't be specified if the ``RestoreTime`` parameter is provided.
   */
  UseLatestRestorableTime?: boolean;
  /**
   * A list of the VPC security group IDs to assign to the DB instance. The list can include both the
   * physical IDs of existing VPC security groups and references to
   * [AWS::EC2::SecurityGroup](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-security-group.html)
   * resources created in the template.
   * If you plan to update the resource, don't specify VPC security groups in a shared VPC.
   * If you set ``VPCSecurityGroups``, you must not set
   * [DBSecurityGroups](https://docs.aws.amazon.com//AWSCloudFormation/latest/UserGuide/aws-properties-rds-database-instance.html#cfn-rds-dbinstance-dbsecuritygroups),
   * and vice versa.
   * You can migrate a DB instance in your stack from an RDS DB security group to a VPC security
   * group, but keep the following in mind:
   * +  You can't revert to using an RDS security group after you establish a VPC security group
   * membership.
   * +  When you migrate your DB instance to VPC security groups, if your stack update rolls back
   * because the DB instance update fails or because an update fails in another AWS CloudFormation
   * resource, the rollback fails because it can't revert to an RDS security group.
   * +  To use the properties that are available when you use a VPC security group, you must recreate
   * the DB instance. If you don't, AWS CloudFormation submits only the property values that are listed
   * in the
   * [DBSecurityGroups](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-rds-database-instance.html#cfn-rds-dbinstance-dbsecuritygroups)
   * property.
   * To avoid this situation, migrate your DB instance to using VPC security groups only when that is
   * the only change in your stack template.
   * *Amazon Aurora*
   * Not applicable. The associated list of EC2 VPC security groups is managed by the DB cluster. If
   * specified, the setting must match the DB cluster setting.
   * @uniqueItems true
   */
  VPCSecurityGroups?: string[];
  /**
   * Specifies whether changes to the DB instance and any pending modifications are applied immediately,
   * regardless of the ``PreferredMaintenanceWindow`` setting. If set to ``false``, changes are applied
   * during the next maintenance window. Until RDS applies the changes, the DB instance remains in a
   * drift state. As a result, the configuration doesn't fully reflect the requested modifications and
   * temporarily diverges from the intended state.
   * In addition to the settings described in [Modifying a DB
   * instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.DBInstance.Modifying.html),
   * this property also determines whether the DB instance reboots when a static parameter is modified
   * in the associated DB parameter group.
   * Default: ``true``
   */
  ApplyImmediately?: boolean;
};


/**
 * The ``AWS::RDS::DBParameterGroup`` resource creates a custom parameter group for an RDS database
 * family.
 * This type can be declared in a template and referenced in the ``DBParameterGroupName`` property of
 * an ``AWS::RDS::DBInstance`` resource.
 * For information about configuring parameters for Amazon RDS DB instances, see [Working with
 * parameter
 * groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html) in
 * the *Amazon RDS User Guide*.
 * For information about configuring parameters for Amazon Aurora DB instances, see [Working with
 * parameter
 * groups](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html)
 * in the *Amazon Aurora User Guide*.
 * Applying a parameter group to a DB instance may require the DB instance to reboot, resulting in a
 * database outage for the duration of the reboot.
 */
export type AwsRdsDbparametergroup = {
  /**
   * The name of the DB parameter group.
   * Constraints:
   * +  Must be 1 to 255 letters, numbers, or hyphens.
   * +  First character must be a letter
   * +  Can't end with a hyphen or contain two consecutive hyphens
   * If you don't specify a value for ``DBParameterGroupName`` property, a name is automatically
   * created for the DB parameter group.
   * This value is stored as a lowercase string.
   * @pattern ^[a-zA-Z]{1}(?:-?[a-zA-Z0-9])*$
   */
  DBParameterGroupName?: string;
  /** Provides the customer-specified description for this DB parameter group. */
  Description: string;
  /**
   * The DB parameter group family name. A DB parameter group can be associated with one and only one DB
   * parameter group family, and can be applied only to a DB instance running a database engine and
   * engine version compatible with that DB parameter group family.
   * To list all of the available parameter group families for a DB engine, use the following command:
   * ``aws rds describe-db-engine-versions --query "DBEngineVersions[].DBParameterGroupFamily"
   * --engine <engine>``
   * For example, to list all of the available parameter group families for the MySQL DB engine, use
   * the following command:
   * ``aws rds describe-db-engine-versions --query "DBEngineVersions[].DBParameterGroupFamily"
   * --engine mysql``
   * The output contains duplicates.
   * The following are the valid DB engine values:
   * +   ``aurora-mysql``
   * +   ``aurora-postgresql``
   * +   ``db2-ae``
   * +   ``db2-se``
   * +   ``mysql``
   * +   ``oracle-ee``
   * +   ``oracle-ee-cdb``
   * +   ``oracle-se2``
   * +   ``oracle-se2-cdb``
   * +   ``postgres``
   * +   ``sqlserver-ee``
   * +   ``sqlserver-se``
   * +   ``sqlserver-ex``
   * +   ``sqlserver-web``
   */
  Family: string;
  /**
   * A mapping of parameter names and values for the parameter update. You must specify at least one
   * parameter name and value.
   * For more information about parameter groups, see [Working with parameter
   * groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html) in
   * the *Amazon RDS User Guide*, or [Working with parameter
   * groups](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html)
   * in the *Amazon Aurora User Guide*.
   * AWS CloudFormation doesn't support specifying an apply method for each individual parameter. The
   * default apply method for each parameter is used.
   */
  Parameters?: Record<string, unknown>;
  /**
   * Tags to assign to the DB parameter group.
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * A key is the required name of the tag. The string value can be from 1 to 128 Unicode characters in
     * length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set of
     * Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A value is the optional value of the tag. The string value can be from 1 to 256 Unicode characters
     * in length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set
     * of Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};


/**
 * The ``AWS::RDS::OptionGroup`` resource creates or updates an option group, to enable and configure
 * features that are specific to a particular DB engine.
 */
export type AwsRdsOptiongroup = {
  /**
   * The name of the option group to be created.
   * Constraints:
   * +  Must be 1 to 255 letters, numbers, or hyphens
   * +  First character must be a letter
   * +  Can't end with a hyphen or contain two consecutive hyphens
   * Example: ``myoptiongroup``
   * If you don't specify a value for ``OptionGroupName`` property, a name is automatically created for
   * the option group.
   * This value is stored as a lowercase string.
   */
  OptionGroupName?: string;
  /** The description of the option group. */
  OptionGroupDescription: string;
  /**
   * Specifies the name of the engine that this option group should be associated with.
   * Valid Values:
   * +   ``mariadb``
   * +   ``mysql``
   * +   ``oracle-ee``
   * +   ``oracle-ee-cdb``
   * +   ``oracle-se2``
   * +   ``oracle-se2-cdb``
   * +   ``postgres``
   * +   ``sqlserver-ee``
   * +   ``sqlserver-se``
   * +   ``sqlserver-ex``
   * +   ``sqlserver-web``
   */
  EngineName: string;
  /** Specifies the major version of the engine that this option group should be associated with. */
  MajorEngineVersion: string;
  /** A list of all available options for an option group. */
  OptionConfigurations?: {
    /**
     * A list of DB security groups used for this option.
     * @uniqueItems true
     */
    DBSecurityGroupMemberships?: string[];
    /** The configuration of options to include in a group. */
    OptionName: string;
    /** The option settings to include in an option group. */
    OptionSettings?: {
      /** The name of the option that has settings that you can set. */
      Name?: string;
      /** The current value of the option setting. */
      Value?: string;
    }[];
    /** The version for the option. */
    OptionVersion?: string;
    /** The optional port for the option. */
    Port?: number;
    /**
     * A list of VPC security group names used for this option.
     * @uniqueItems true
     */
    VpcSecurityGroupMemberships?: string[];
  }[];
  /** Tags to assign to the option group. */
  Tags?: {
    /**
     * A key is the required name of the tag. The string value can be from 1 to 128 Unicode characters in
     * length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set of
     * Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A value is the optional value of the tag. The string value can be from 1 to 256 Unicode characters
     * in length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set
     * of Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};


/** Version: None. Resource Type definition for AWS::DynamoDB::GlobalTable */
export type AwsDynamodbGlobaltable = {
  /** @enum ["EVENTUAL","STRONG"] */
  MultiRegionConsistency?: "EVENTUAL" | "STRONG";
  TableId?: string;
  SSESpecification?: {
    SSEEnabled: boolean;
    SSEType?: string;
  };
  StreamSpecification?: {
    StreamViewType: string;
  };
  WarmThroughput?: unknown | unknown;
  /**
   * @minItems 1
   * @uniqueItems true
   */
  Replicas: ({
    SSESpecification?: {
      KMSMasterKeyId: unknown | unknown | unknown;
    };
    KinesisStreamSpecification?: {
      /** @enum ["MICROSECOND","MILLISECOND"] */
      ApproximateCreationDateTimePrecision?: "MICROSECOND" | "MILLISECOND";
      StreamArn: string;
    };
    ContributorInsightsSpecification?: {
      /** @enum ["ACCESSED_AND_THROTTLED_KEYS","THROTTLED_KEYS"] */
      Mode?: "ACCESSED_AND_THROTTLED_KEYS" | "THROTTLED_KEYS";
      Enabled: boolean;
    };
    PointInTimeRecoverySpecification?: {
      PointInTimeRecoveryEnabled?: boolean;
      /**
       * @minimum 1
       * @maximum 35
       */
      RecoveryPeriodInDays?: number;
    };
    ReplicaStreamSpecification?: {
      ResourcePolicy: {
        PolicyDocument: Record<string, unknown>;
      };
    };
    /** @uniqueItems true */
    GlobalSecondaryIndexes?: ({
      /**
       * @minLength 3
       * @maxLength 255
       */
      IndexName: string;
      ContributorInsightsSpecification?: {
        /** @enum ["ACCESSED_AND_THROTTLED_KEYS","THROTTLED_KEYS"] */
        Mode?: "ACCESSED_AND_THROTTLED_KEYS" | "THROTTLED_KEYS";
        Enabled: boolean;
      };
      ReadProvisionedThroughputSettings?: {
        /** @minimum 1 */
        ReadCapacityUnits?: number;
        ReadCapacityAutoScalingSettings?: {
          /** @minimum 1 */
          MinCapacity: number;
          /** @minimum 1 */
          SeedCapacity?: number;
          TargetTrackingScalingPolicyConfiguration: {
            /** @minimum 0 */
            ScaleOutCooldown?: number;
            TargetValue: number;
            DisableScaleIn?: boolean;
            /** @minimum 0 */
            ScaleInCooldown?: number;
          };
          /** @minimum 1 */
          MaxCapacity: number;
        };
      };
      ReadOnDemandThroughputSettings?: {
        /** @minimum 1 */
        MaxReadRequestUnits?: number;
      };
    })[];
    Region: string;
    ResourcePolicy?: {
      PolicyDocument: Record<string, unknown>;
    };
    ReadProvisionedThroughputSettings?: {
      /** @minimum 1 */
      ReadCapacityUnits?: number;
      ReadCapacityAutoScalingSettings?: {
        /** @minimum 1 */
        MinCapacity: number;
        /** @minimum 1 */
        SeedCapacity?: number;
        TargetTrackingScalingPolicyConfiguration: {
          /** @minimum 0 */
          ScaleOutCooldown?: number;
          TargetValue: number;
          DisableScaleIn?: boolean;
          /** @minimum 0 */
          ScaleInCooldown?: number;
        };
        /** @minimum 1 */
        MaxCapacity: number;
      };
    };
    TableClass?: string;
    DeletionProtectionEnabled?: boolean;
    /** @uniqueItems true */
    Tags?: {
      Value: string;
      Key: string;
    }[];
    ReadOnDemandThroughputSettings?: {
      /** @minimum 1 */
      MaxReadRequestUnits?: number;
    };
  })[];
  WriteProvisionedThroughputSettings?: {
    WriteCapacityAutoScalingSettings?: {
      /** @minimum 1 */
      MinCapacity: number;
      /** @minimum 1 */
      SeedCapacity?: number;
      TargetTrackingScalingPolicyConfiguration: {
        /** @minimum 0 */
        ScaleOutCooldown?: number;
        TargetValue: number;
        DisableScaleIn?: boolean;
        /** @minimum 0 */
        ScaleInCooldown?: number;
      };
      /** @minimum 1 */
      MaxCapacity: number;
    };
  };
  WriteOnDemandThroughputSettings?: {
    /** @minimum 1 */
    MaxWriteRequestUnits?: number;
  };
  /**
   * @minItems 1
   * @maxItems 1
   * @uniqueItems true
   */
  GlobalTableWitnesses?: {
    Region?: string;
  }[];
  TableName?: string;
  /**
   * @minItems 1
   * @uniqueItems true
   */
  AttributeDefinitions: {
    AttributeType: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    AttributeName: string;
  }[];
  BillingMode?: string;
  /** @uniqueItems true */
  GlobalSecondaryIndexes?: ({
    /**
     * @minLength 3
     * @maxLength 255
     */
    IndexName: string;
    Projection: {
      /**
       * @maxItems 20
       * @uniqueItems true
       */
      NonKeyAttributes?: string[];
      ProjectionType?: string;
    };
    /**
     * @minItems 1
     * @maxItems 8
     * @uniqueItems true
     */
    KeySchema: {
      KeyType: string;
      /**
       * @minLength 1
       * @maxLength 255
       */
      AttributeName: string;
    }[];
    WarmThroughput?: unknown | unknown;
    WriteProvisionedThroughputSettings?: {
      WriteCapacityAutoScalingSettings?: {
        /** @minimum 1 */
        MinCapacity: number;
        /** @minimum 1 */
        SeedCapacity?: number;
        TargetTrackingScalingPolicyConfiguration: {
          /** @minimum 0 */
          ScaleOutCooldown?: number;
          TargetValue: number;
          DisableScaleIn?: boolean;
          /** @minimum 0 */
          ScaleInCooldown?: number;
        };
        /** @minimum 1 */
        MaxCapacity: number;
      };
    };
    WriteOnDemandThroughputSettings?: {
      /** @minimum 1 */
      MaxWriteRequestUnits?: number;
    };
  })[];
  /**
   * @minItems 1
   * @maxItems 2
   * @uniqueItems true
   */
  KeySchema: {
    KeyType: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    AttributeName: string;
  }[];
  /** @uniqueItems true */
  LocalSecondaryIndexes?: {
    /**
     * @minLength 3
     * @maxLength 255
     */
    IndexName: string;
    Projection: {
      /**
       * @maxItems 20
       * @uniqueItems true
       */
      NonKeyAttributes?: string[];
      ProjectionType?: string;
    };
    /**
     * @maxItems 2
     * @uniqueItems true
     */
    KeySchema: {
      KeyType: string;
      /**
       * @minLength 1
       * @maxLength 255
       */
      AttributeName: string;
    }[];
  }[];
  Arn?: string;
  StreamArn?: string;
  TimeToLiveSpecification?: {
    Enabled: boolean;
    AttributeName?: string;
  };
};


/**
 * The ``AWS::ApiGatewayV2::Api`` resource creates an API. WebSocket APIs and HTTP APIs are supported.
 * For more information about WebSocket APIs, see [About WebSocket APIs in API
 * Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-overview.html)
 * in the *API Gateway Developer Guide*. For more information about HTTP APIs, see [HTTP
 * APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html) in the *API
 * Gateway Developer Guide.*
 */
export type AwsApigatewayv2Api = {
  /**
   * The route selection expression for the API. For HTTP APIs, the ``routeSelectionExpression`` must be
   * ``${request.method} ${request.path}``. If not provided, this will be the default for HTTP APIs.
   * This property is required for WebSocket APIs.
   */
  RouteSelectionExpression?: string;
  /**
   * The OpenAPI definition. Supported only for HTTP APIs. To import an HTTP API, you must specify a
   * ``Body`` or ``BodyS3Location``. If you specify a ``Body`` or ``BodyS3Location``, don't specify
   * CloudFormation resources such as ``AWS::ApiGatewayV2::Authorizer`` or ``AWS::ApiGatewayV2::Route``.
   * API Gateway doesn't support the combination of OpenAPI and CloudFormation resources.
   */
  Body?: Record<string, unknown>;
  /**
   * The S3 location of an OpenAPI definition. Supported only for HTTP APIs. To import an HTTP API, you
   * must specify a ``Body`` or ``BodyS3Location``. If you specify a ``Body`` or ``BodyS3Location``,
   * don't specify CloudFormation resources such as ``AWS::ApiGatewayV2::Authorizer`` or
   * ``AWS::ApiGatewayV2::Route``. API Gateway doesn't support the combination of OpenAPI and
   * CloudFormation resources.
   */
  BodyS3Location?: {
    /** The Etag of the S3 object. */
    Etag?: string;
    /**
     * The S3 bucket that contains the OpenAPI definition to import. Required if you specify a
     * ``BodyS3Location`` for an API.
     */
    Bucket?: string;
    /** The version of the S3 object. */
    Version?: string;
    /** The key of the S3 object. Required if you specify a ``BodyS3Location`` for an API. */
    Key?: string;
  };
  /**
   * Specifies how to interpret the base path of the API during import. Valid values are ``ignore``,
   * ``prepend``, and ``split``. The default value is ``ignore``. To learn more, see [Set the OpenAPI
   * basePath
   * Property](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-import-api-basePath.html).
   * Supported only for HTTP APIs.
   */
  BasePath?: string;
  /**
   * This property is part of quick create. It specifies the credentials required for the integration,
   * if any. For a Lambda integration, three options are available. To specify an IAM Role for API
   * Gateway to assume, use the role's Amazon Resource Name (ARN). To require that the caller's identity
   * be passed through from the request, specify ``arn:aws:iam::*:user/*``. To use resource-based
   * permissions on supported AWS services, specify ``null``. Currently, this property is not used for
   * HTTP integrations. Supported only for HTTP APIs.
   */
  CredentialsArn?: string;
  /**
   * A CORS configuration. Supported only for HTTP APIs. See [Configuring
   * CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html) for more
   * information.
   */
  CorsConfiguration?: {
    /**
     * Represents a collection of allowed origins. Supported only for HTTP APIs.
     * @uniqueItems false
     */
    AllowOrigins?: string[];
    /** Specifies whether credentials are included in the CORS request. Supported only for HTTP APIs. */
    AllowCredentials?: boolean;
    /**
     * Represents a collection of exposed headers. Supported only for HTTP APIs.
     * @uniqueItems false
     */
    ExposeHeaders?: string[];
    /**
     * Represents a collection of allowed headers. Supported only for HTTP APIs.
     * @uniqueItems false
     */
    AllowHeaders?: string[];
    /**
     * The number of seconds that the browser should cache preflight request results. Supported only for
     * HTTP APIs.
     */
    MaxAge?: number;
    /**
     * Represents a collection of allowed HTTP methods. Supported only for HTTP APIs.
     * @uniqueItems false
     */
    AllowMethods?: string[];
  };
  /**
   * This property is part of quick create. If you don't specify a ``routeKey``, a default route of
   * ``$default`` is created. The ``$default`` route acts as a catch-all for any request made to your
   * API, for a particular stage. The ``$default`` route key can't be modified. You can add routes after
   * creating the API, and you can update the route keys of additional routes. Supported only for HTTP
   * APIs.
   */
  RouteKey?: string;
  /**
   * This property is part of quick create. Quick create produces an API with an integration, a default
   * catch-all route, and a default stage which is configured to automatically deploy changes. For HTTP
   * integrations, specify a fully qualified URL. For Lambda integrations, specify a function ARN. The
   * type of the integration will be HTTP_PROXY or AWS_PROXY, respectively. Supported only for HTTP
   * APIs.
   */
  Target?: string;
  /**
   * Specifies whether to rollback the API creation when a warning is encountered. By default, API
   * creation continues if a warning is encountered.
   */
  FailOnWarnings?: boolean;
  ApiEndpoint?: string;
  /** The description of the API. */
  Description?: string;
  /**
   * Specifies whether clients can invoke your API by using the default ``execute-api`` endpoint. By
   * default, clients can invoke your API with the default
   * https://{api_id}.execute-api.{region}.amazonaws.com endpoint. To require that clients use a custom
   * domain name to invoke your API, disable the default endpoint.
   */
  DisableExecuteApiEndpoint?: boolean;
  /** Avoid validating models when creating a deployment. Supported only for WebSocket APIs. */
  DisableSchemaValidation?: boolean;
  /**
   * The name of the API. Required unless you specify an OpenAPI definition for ``Body`` or
   * ``S3BodyLocation``.
   */
  Name?: string;
  /** A version identifier for the API. */
  Version?: string;
  /**
   * The API protocol. Valid values are ``WEBSOCKET`` or ``HTTP``. Required unless you specify an
   * OpenAPI definition for ``Body`` or ``S3BodyLocation``.
   */
  ProtocolType?: string;
  ApiId?: string;
  /** The collection of tags. Each tag element is associated with a given resource. */
  Tags?: Record<string, string>;
  /**
   * An API key selection expression. Supported only for WebSocket APIs. See [API Key Selection
   * Expressions](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-selection-expressions.html#apigateway-websocket-api-apikey-selection-expressions).
   */
  ApiKeySelectionExpression?: string;
  IpAddressType?: string;
};


/** Resource Type definition for AWS::ApiGatewayV2::Stage */
export type AwsApigatewayv2Stage = {
  DeploymentId?: string;
  Description?: string;
  AutoDeploy?: boolean;
  RouteSettings?: Record<string, unknown>;
  StageName: string;
  StageVariables?: Record<string, unknown>;
  AccessPolicyId?: string;
  ClientCertificateId?: string;
  AccessLogSettings?: {
    DestinationArn?: string;
    Format?: string;
  };
  Id?: string;
  ApiId: string;
  DefaultRouteSettings?: {
    DetailedMetricsEnabled?: boolean;
    LoggingLevel?: string;
    DataTraceEnabled?: boolean;
    ThrottlingBurstLimit?: number;
    ThrottlingRateLimit?: number;
  };
  Tags?: Record<string, unknown>;
};


/**
 * The ``AWS::ApiGatewayV2::VpcLink`` resource creates a VPC link. Supported only for HTTP APIs. The
 * VPC link status must transition from ``PENDING`` to ``AVAILABLE`` to successfully create a VPC
 * link, which can take up to 10 minutes. To learn more, see [Working with VPC Links for HTTP
 * APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vpc-links.html) in the
 * *API Gateway Developer Guide*.
 */
export type AwsApigatewayv2Vpclink = {
  VpcLinkId?: string;
  /**
   * A list of subnet IDs to include in the VPC link.
   * @uniqueItems false
   */
  SubnetIds: string[];
  /**
   * A list of security group IDs for the VPC link.
   * @uniqueItems false
   */
  SecurityGroupIds?: string[];
  /** The collection of tags. Each tag element is associated with a given resource. */
  Tags?: Record<string, string>;
  /** The name of the VPC link. */
  Name: string;
};


/**
 * The ``AWS::ApiGatewayV2::DomainName`` resource specifies a custom domain name for your API in
 * Amazon API Gateway (API Gateway).
 * You can use a custom domain name to provide a URL that's more intuitive and easier to recall. For
 * more information about using custom domain names, see [Set up Custom Domain Name for an API in API
 * Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html)
 * in the *API Gateway Developer Guide*.
 */
export type AwsApigatewayv2Domainname = {
  /** The mutual TLS authentication configuration for a custom domain name. */
  MutualTlsAuthentication?: {
    /**
     * The version of the S3 object that contains your truststore. To specify a version, you must have
     * versioning enabled for the S3 bucket.
     */
    TruststoreVersion?: string;
    /**
     * An Amazon S3 URL that specifies the truststore for mutual TLS authentication, for example,
     * ``s3://bucket-name/key-name``. The truststore can contain certificates from public or private
     * certificate authorities. To update the truststore, upload a new version to S3, and then update your
     * custom domain name to use the new version. To update the truststore, you must have permissions to
     * access the S3 object.
     */
    TruststoreUri?: string;
  };
  RegionalHostedZoneId?: string;
  RegionalDomainName?: string;
  DomainNameArn?: string;
  /**
   * The custom domain name for your API in Amazon API Gateway. Uppercase letters and the underscore
   * (``_``) character are not supported.
   */
  DomainName: string;
  /**
   * The domain name configurations.
   * @uniqueItems false
   */
  DomainNameConfigurations?: {
    /**
     * The Amazon resource name (ARN) for the public certificate issued by ACMlong. This ARN is used to
     * validate custom domain ownership. It's required only if you configure mutual TLS and use either an
     * ACM-imported or a private CA certificate ARN as the regionalCertificateArn.
     */
    OwnershipVerificationCertificateArn?: string;
    /** The endpoint type. */
    EndpointType?: string;
    /**
     * The user-friendly name of the certificate that will be used by the edge-optimized endpoint for this
     * domain name.
     */
    CertificateName?: string;
    /**
     * The Transport Layer Security (TLS) version of the security policy for this domain name. The valid
     * values are ``TLS_1_0`` and ``TLS_1_2``.
     */
    SecurityPolicy?: string;
    /**
     * An AWS-managed certificate that will be used by the edge-optimized endpoint for this domain name.
     * AWS Certificate Manager is the only supported source.
     */
    CertificateArn?: string;
    IpAddressType?: string;
  }[];
  /**
   * @default "API_MAPPING_ONLY"
   * @enum ["API_MAPPING_ONLY","ROUTING_RULE_THEN_API_MAPPING","ROUTING_RULE_ONLY"]
   */
  RoutingMode?: "API_MAPPING_ONLY" | "ROUTING_RULE_THEN_API_MAPPING" | "ROUTING_RULE_ONLY";
  /** The collection of tags associated with a domain name. */
  Tags?: Record<string, string>;
};


/**
 * The ``AWS::ApiGatewayV2::ApiMapping`` resource contains an API mapping. An API mapping relates a
 * path of your custom domain name to a stage of your API. A custom domain name can have multiple API
 * mappings, but the paths can't overlap. A custom domain can map only to APIs of the same protocol
 * type. For more information, see
 * [CreateApiMapping](https://docs.aws.amazon.com/apigatewayv2/latest/api-reference/domainnames-domainname-apimappings.html#CreateApiMapping)
 * in the *Amazon API Gateway V2 API Reference*.
 */
export type AwsApigatewayv2Apimapping = {
  ApiMappingId?: string;
  /** The domain name. */
  DomainName: string;
  /** The API stage. */
  Stage: string;
  /** The API mapping key. */
  ApiMappingKey?: string;
  /** The identifier of the API. */
  ApiId: string;
};


/**
 * Creates a new instance profile. For information about instance profiles, see [Using instance
 * profiles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html).
 * For information about the number of instance profiles you can create, see [object
 * quotas](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html) in the *User
 * Guide*.
 */
export type AwsIamInstanceprofile = {
  /**
   * The path to the instance profile. For more information about paths, see [IAM
   * Identifiers](https://docs.aws.amazon.com/IAM/latest/UserGuide/Using_Identifiers.html) in the *IAM
   * User Guide*.
   * This parameter is optional. If it is not included, it defaults to a slash (/).
   * This parameter allows (through its [regex
   * pattern](https://docs.aws.amazon.com/http://wikipedia.org/wiki/regex)) a string of characters
   * consisting of either a forward slash (/) by itself or a string that must begin and end with forward
   * slashes. In addition, it can contain any ASCII character from the ! (``\u0021``) through the DEL
   * character (``\u007F``), including most punctuation characters, digits, and upper and lowercased
   * letters.
   */
  Path?: string;
  /**
   * The name of the role to associate with the instance profile. Only one role can be assigned to an
   * EC2 instance at a time, and all applications on the instance share the same role and permissions.
   * @uniqueItems true
   */
  Roles: string[];
  /**
   * The name of the instance profile to create.
   * This parameter allows (through its [regex
   * pattern](https://docs.aws.amazon.com/http://wikipedia.org/wiki/regex)) a string of characters
   * consisting of upper and lowercase alphanumeric characters with no spaces. You can also include any
   * of the following characters: _+=,.@-
   */
  InstanceProfileName?: string;
  Arn?: string;
};


/**
 * Specifies the properties for creating a launch template.
 * The minimum required properties for specifying a launch template are as follows:
 * +  You must specify at least one property for the launch template data.
 * +  You can optionally specify a name for the launch template. If you do not specify a name, CFN
 * creates a name for you.
 * A launch template can contain some or all of the configuration information to launch an instance.
 * When you launch an instance using a launch template, instance properties that are not specified in
 * the launch template use default values, except the ``ImageId`` property, which has no default
 * value. If you do not specify an AMI ID for the launch template ``ImageId`` property, you must
 * specify an AMI ID for the instance ``ImageId`` property.
 * For more information, see [Launch an instance from a launch
 * template](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-templates.html) in the
 * *Amazon EC2 User Guide*.
 */
export type AwsEc2Launchtemplate = {
  /** A name for the launch template. */
  LaunchTemplateName?: string;
  /** The information for the launch template. */
  LaunchTemplateData: {
    /**
     * The names of the security groups. For a nondefault VPC, you must use security group IDs instead.
     * If you specify a network interface, you must specify any security groups as part of the network
     * interface instead of using this parameter.
     * @uniqueItems false
     */
    SecurityGroups?: string[];
    /**
     * The tags to apply to resources that are created during instance launch.
     * To tag the launch template itself, use
     * [TagSpecifications](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-launchtemplate.html#cfn-ec2-launchtemplate-tagspecifications).
     * @uniqueItems false
     */
    TagSpecifications?: ({
      /**
       * The type of resource to tag. You can specify tags for the following resource types only:
       * ``instance`` | ``volume`` | ``network-interface`` | ``spot-instances-request``. If the instance
       * does not include the resource type that you specify, the instance launch fails. For example, not
       * all instance types include a volume.
       * To tag a resource after it has been created, see
       * [CreateTags](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateTags.html).
       */
      ResourceType?: string;
      /**
       * The tags to apply to the resource.
       * @uniqueItems false
       */
      Tags?: {
        /** The tag value. */
        Value: string;
        /** The tag key. */
        Key: string;
      }[];
    })[];
    /**
     * The settings for the network performance options for the instance. For more information, see [EC2
     * instance bandwidth weighting
     * configuration](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-bandwidth-weighting.html).
     */
    NetworkPerformanceOptions?: {
      /**
       * Specify the bandwidth weighting option to boost the associated type of baseline bandwidth, as
       * follows:
       * + default This option uses the standard bandwidth configuration for your instance type. + vpc-1
       * This option boosts your networking baseline bandwidth and reduces your EBS baseline bandwidth. +
       * ebs-1 This option boosts your EBS baseline bandwidth and reduces your networking baseline
       * bandwidth.
       */
      BandwidthWeighting?: string;
    };
    /**
     * The user data to make available to the instance. You must provide base64-encoded text. User data is
     * limited to 16 KB. For more information, see [Run commands when you launch an EC2 instance with user
     * data input](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html) in the *Amazon EC2
     * User Guide*.
     * If you are creating the launch template for use with BATCH, the user data must be provided in the
     * [MIME multi-part archive
     * format](https://docs.aws.amazon.com/https://cloudinit.readthedocs.io/en/latest/topics/format.html#mime-multi-part-archive).
     * For more information, see [Amazon EC2 user data in launch
     * templates](https://docs.aws.amazon.com/batch/latest/userguide/launch-templates.html#lt-user-data)
     * in the *User Guide*.
     */
    UserData?: string;
    /**
     * The block device mapping.
     * @uniqueItems false
     */
    BlockDeviceMappings?: {
      /** Parameters used to automatically set up EBS volumes when the instance is launched. */
      Ebs?: {
        /** The ID of the snapshot. */
        SnapshotId?: string;
        /**
         * The volume type. For more information, see [Amazon EBS volume
         * types](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html) in the *Amazon EBS
         * User Guide*.
         */
        VolumeType?: string;
        /**
         * Identifier (key ID, key alias, key ARN, or alias ARN) of the customer managed KMS key to use for
         * EBS encryption.
         */
        KmsKeyId?: string;
        /**
         * Indicates whether the EBS volume is encrypted. Encrypted volumes can only be attached to instances
         * that support Amazon EBS encryption. If you are creating a volume from a snapshot, you can't specify
         * an encryption value.
         */
        Encrypted?: boolean;
        /**
         * The throughput to provision for a ``gp3`` volume, with a maximum of 2,000 MiB/s.
         * Valid Range: Minimum value of 125. Maximum value of 2,000.
         */
        Throughput?: number;
        /**
         * The number of I/O operations per second (IOPS). For ``gp3``, ``io1``, and ``io2`` volumes, this
         * represents the number of IOPS that are provisioned for the volume. For ``gp2`` volumes, this
         * represents the baseline performance of the volume and the rate at which the volume accumulates I/O
         * credits for bursting.
         * The following are the supported values for each volume type:
         * +  ``gp3``: 3,000 - 80,000 IOPS
         * +  ``io1``: 100 - 64,000 IOPS
         * +  ``io2``: 100 - 256,000 IOPS
         * For ``io2`` volumes, you can achieve up to 256,000 IOPS on [instances built on the Nitro
         * System](https://docs.aws.amazon.com/ec2/latest/instancetypes/ec2-nitro-instances.html). On other
         * instances, you can achieve performance up to 32,000 IOPS.
         * This parameter is supported for ``io1``, ``io2``, and ``gp3`` volumes only.
         */
        Iops?: number;
        /**
         * Specifies the Amazon EBS Provisioned Rate for Volume Initialization (volume initialization rate),
         * in MiB/s, at which to download the snapshot blocks from Amazon S3 to the volume. This is also known
         * as *volume initialization*. Specifying a volume initialization rate ensures that the volume is
         * initialized at a predictable and consistent rate after creation.
         * This parameter is supported only for volumes created from snapshots. Omit this parameter if:
         * +  You want to create the volume using fast snapshot restore. You must specify a snapshot that is
         * enabled for fast snapshot restore. In this case, the volume is fully initialized at creation.
         * If you specify a snapshot that is enabled for fast snapshot restore and a volume initialization
         * rate, the volume will be initialized at the specified rate instead of fast snapshot restore.
         * +  You want to create a volume that is initialized at the default rate.
         * For more information, see [Initialize Amazon EBS
         * volumes](https://docs.aws.amazon.com/ebs/latest/userguide/initalize-volume.html) in the *Amazon EC2
         * User Guide*.
         * Valid range: 100 - 300 MiB/s
         */
        VolumeInitializationRate?: number;
        /**
         * The size of the volume, in GiBs. You must specify either a snapshot ID or a volume size. The
         * following are the supported volumes sizes for each volume type:
         * +  ``gp2``: 1 - 16,384 GiB
         * +  ``gp3``: 1 - 65,536 GiB
         * +  ``io1``: 4 - 16,384 GiB
         * +  ``io2``: 4 - 65,536 GiB
         * +  ``st1`` and ``sc1``: 125 - 16,384 GiB
         * +  ``standard``: 1 - 1024 GiB
         */
        VolumeSize?: number;
        /** Indicates whether the EBS volume is deleted on instance termination. */
        DeleteOnTermination?: boolean;
      };
      /** To omit the device from the block device mapping, specify an empty string. */
      NoDevice?: string;
      /**
       * The virtual device name (ephemeralN). Instance store volumes are numbered starting from 0. An
       * instance type with 2 available instance store volumes can specify mappings for ephemeral0 and
       * ephemeral1. The number of available instance store volumes depends on the instance type. After you
       * connect to the instance, you must mount the volume.
       */
      VirtualName?: string;
      /** The device name (for example, /dev/sdh or xvdh). */
      DeviceName?: string;
    }[];
    /** The maintenance options of your instance. */
    MaintenanceOptions?: {
      /** Disables the automatic recovery behavior of your instance or sets it to default. */
      AutoRecovery?: string;
    };
    /** The name or Amazon Resource Name (ARN) of an IAM instance profile. */
    IamInstanceProfile?: {
      /** The Amazon Resource Name (ARN) of the instance profile. */
      Arn?: string;
      /** The name of the instance profile. */
      Name?: string;
    };
    /**
     * The ID of the kernel.
     * We recommend that you use PV-GRUB instead of kernels and RAM disks. For more information, see
     * [User Provided
     * Kernels](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/UserProvidedkernels.html) in the
     * *Amazon EC2 User Guide*.
     */
    KernelId?: string;
    /**
     * Indicates whether the instance is optimized for Amazon EBS I/O. This optimization provides
     * dedicated throughput to Amazon EBS and an optimized configuration stack to provide optimal Amazon
     * EBS I/O performance. This optimization isn't available with all instance types. Additional usage
     * charges apply when using an EBS-optimized instance.
     */
    EbsOptimized?: boolean;
    /** The placement for the instance. */
    Placement?: {
      /** The name of the placement group for the instance. */
      GroupName?: string;
      /**
       * The tenancy of the instance. An instance with a tenancy of dedicated runs on single-tenant
       * hardware.
       */
      Tenancy?: string;
      /** Reserved for future use. */
      SpreadDomain?: string;
      /**
       * The number of the partition the instance should launch in. Valid only if the placement group
       * strategy is set to ``partition``.
       */
      PartitionNumber?: number;
      /**
       * The Availability Zone for the instance.
       * Either ``AvailabilityZone`` or ``AvailabilityZoneId`` can be specified, but not both
       */
      AvailabilityZone?: string;
      /** The affinity setting for an instance on a Dedicated Host. */
      Affinity?: string;
      /** The ID of the Dedicated Host for the instance. */
      HostId?: string;
      /**
       * The ARN of the host resource group in which to launch the instances. If you specify a host resource
       * group ARN, omit the *Tenancy* parameter or set it to ``host``.
       */
      HostResourceGroupArn?: string;
      /**
       * The Group Id of a placement group. You must specify the Placement Group *Group Id* to launch an
       * instance in a shared placement group.
       */
      GroupId?: string;
    };
    /**
     * The network interfaces for the instance.
     * @uniqueItems false
     */
    NetworkInterfaces?: ({
      /** A description for the network interface. */
      Description?: string;
      /** The primary private IPv4 address of the network interface. */
      PrivateIpAddress?: string;
      /**
       * One or more private IPv4 addresses.
       * @uniqueItems false
       */
      PrivateIpAddresses?: {
        /** The private IPv4 address. */
        PrivateIpAddress?: string;
        /**
         * Indicates whether the private IPv4 address is the primary private IPv4 address. Only one IPv4
         * address can be designated as primary.
         */
        Primary?: boolean;
      }[];
      /** The number of secondary private IPv4 addresses to assign to a network interface. */
      SecondaryPrivateIpAddressCount?: number;
      /**
       * The number of IPv6 prefixes to be automatically assigned to the network interface. You cannot use
       * this option if you use the ``Ipv6Prefix`` option.
       */
      Ipv6PrefixCount?: number;
      /**
       * One or more IPv4 prefixes to be assigned to the network interface. You cannot use this option if
       * you use the ``Ipv4PrefixCount`` option.
       * @uniqueItems false
       */
      Ipv4Prefixes?: {
        /**
         * The IPv4 prefix. For information, see [Assigning prefixes to network
         * interfaces](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-prefix-eni.html) in the *Amazon
         * EC2 User Guide*.
         */
        Ipv4Prefix?: string;
      }[];
      /**
       * The device index for the network interface attachment. The primary network interface has a device
       * index of 0. If the network interface is of type ``interface``, you must specify a device index.
       * If you create a launch template that includes secondary network interfaces but no primary network
       * interface, and you specify it using the ``LaunchTemplate`` property of ``AWS::EC2::Instance``, then
       * you must include a primary network interface using the ``NetworkInterfaces`` property of
       * ``AWS::EC2::Instance``.
       */
      DeviceIndex?: number;
      /**
       * The primary IPv6 address of the network interface. When you enable an IPv6 GUA address to be a
       * primary IPv6, the first IPv6 GUA will be made the primary IPv6 address until the instance is
       * terminated or the network interface is detached. For more information about primary IPv6 addresses,
       * see [RunInstances](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_RunInstances.html).
       */
      PrimaryIpv6?: boolean;
      /**
       * The number of IPv4 prefixes to be automatically assigned to the network interface. You cannot use
       * this option if you use the ``Ipv4Prefix`` option.
       */
      Ipv4PrefixCount?: number;
      /** The number of ENA queues to be created with the instance. */
      EnaQueueCount?: number;
      /**
       * One or more IPv6 prefixes to be assigned to the network interface. You cannot use this option if
       * you use the ``Ipv6PrefixCount`` option.
       * @uniqueItems false
       */
      Ipv6Prefixes?: {
        /** The IPv6 prefix. */
        Ipv6Prefix?: string;
      }[];
      /** The ID of the subnet for the network interface. */
      SubnetId?: string;
      /**
       * One or more specific IPv6 addresses from the IPv6 CIDR block range of your subnet. You can't use
       * this option if you're specifying a number of IPv6 addresses.
       * @uniqueItems false
       */
      Ipv6Addresses?: {
        /**
         * One or more specific IPv6 addresses from the IPv6 CIDR block range of your subnet. You can't use
         * this option if you're specifying a number of IPv6 addresses.
         */
        Ipv6Address?: string;
      }[];
      /**
       * Associates a public IPv4 address with eth0 for a new network interface.
       * AWS charges for all public IPv4 addresses, including public IPv4 addresses associated with running
       * instances and Elastic IP addresses. For more information, see the *Public IPv4 Address* tab on the
       * [Amazon VPC pricing page](https://docs.aws.amazon.com/vpc/pricing/).
       */
      AssociatePublicIpAddress?: boolean;
      /** The ID of the network interface. */
      NetworkInterfaceId?: string;
      /**
       * The index of the network card. Some instance types support multiple network cards. The primary
       * network interface must be assigned to network card index 0. The default is network card index 0.
       */
      NetworkCardIndex?: number;
      /**
       * The type of network interface. To create an Elastic Fabric Adapter (EFA), specify ``efa`` or
       * ``efa``. For more information, see [Elastic Fabric Adapter for AI/ML and HPC workloads on Amazon
       * EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html) in the *Amazon EC2 User Guide*.
       * If you are not creating an EFA, specify ``interface`` or omit this parameter.
       * If you specify ``efa-only``, do not assign any IP addresses to the network interface. EFA-only
       * network interfaces do not support IP addresses.
       * Valid values: ``interface`` | ``efa`` | ``efa-only``
       */
      InterfaceType?: string;
      /**
       * Associates a Carrier IP address with eth0 for a new network interface.
       * Use this option when you launch an instance in a Wavelength Zone and want to associate a Carrier
       * IP address with the network interface. For more information about Carrier IP addresses, see
       * [Carrier IP
       * addresses](https://docs.aws.amazon.com/wavelength/latest/developerguide/how-wavelengths-work.html#provider-owned-ip)
       * in the *Developer Guide*.
       */
      AssociateCarrierIpAddress?: boolean;
      /** The ENA Express configuration for the network interface. */
      EnaSrdSpecification?: {
        /** Indicates whether ENA Express is enabled for the network interface. */
        EnaSrdEnabled?: boolean;
        /** Configures ENA Express for UDP network traffic. */
        EnaSrdUdpSpecification?: {
          /**
           * Indicates whether UDP traffic to and from the instance uses ENA Express. To specify this setting,
           * you must first enable ENA Express.
           */
          EnaSrdUdpEnabled?: boolean;
        };
      };
      /**
       * The number of IPv6 addresses to assign to a network interface. Amazon EC2 automatically selects the
       * IPv6 addresses from the subnet range. You can't use this option if specifying specific IPv6
       * addresses.
       */
      Ipv6AddressCount?: number;
      /**
       * The IDs of one or more security groups.
       * @uniqueItems false
       */
      Groups?: string[];
      /** Indicates whether the network interface is deleted when the instance is terminated. */
      DeleteOnTermination?: boolean;
      /** A connection tracking specification for the network interface. */
      ConnectionTrackingSpecification?: {
        /**
         * Timeout (in seconds) for idle UDP flows that have seen traffic only in a single direction or a
         * single request-response transaction. Min: 30 seconds. Max: 60 seconds. Default: 30 seconds.
         */
        UdpTimeout?: number;
        /**
         * Timeout (in seconds) for idle TCP connections in an established state. Min: 60 seconds. Max: 432000
         * seconds (5 days). Default: 432000 seconds. Recommended: Less than 432000 seconds.
         */
        TcpEstablishedTimeout?: number;
        /**
         * Timeout (in seconds) for idle UDP flows classified as streams which have seen more than one
         * request-response transaction. Min: 60 seconds. Max: 180 seconds (3 minutes). Default: 180 seconds.
         */
        UdpStreamTimeout?: number;
      };
    })[];
    /**
     * Indicates whether the instance is enabled for AWS Nitro Enclaves. For more information, see [What
     * is Nitro Enclaves?](https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave.html) in the
     * *Nitro Enclaves User Guide*.
     * You can't enable AWS Nitro Enclaves and hibernation on the same instance.
     */
    EnclaveOptions?: {
      /**
       * If this parameter is set to ``true``, the instance is enabled for AWS Nitro Enclaves; otherwise, it
       * is not enabled for AWS Nitro Enclaves.
       */
      Enabled?: boolean;
    };
    /**
     * The ID of the AMI. Alternatively, you can specify a Systems Manager parameter, which will resolve
     * to an AMI ID on launch.
     * Valid formats:
     * +   ``ami-0ac394d6a3example``
     * +   ``resolve:ssm:parameter-name``
     * +   ``resolve:ssm:parameter-name:version-number``
     * +   ``resolve:ssm:parameter-name:label``
     * For more information, see [Use a Systems Manager parameter to find an
     * AMI](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami.html#using-systems-manager-parameter-to-find-AMI)
     * in the *Amazon Elastic Compute Cloud User Guide*.
     */
    ImageId?: string;
    /**
     * The instance type. For more information, see [Amazon EC2 instance
     * types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html) in the *Amazon EC2
     * User Guide*.
     * If you specify ``InstanceType``, you can't specify ``InstanceRequirements``.
     */
    InstanceType?: string;
    /** The monitoring for the instance. */
    Monitoring?: {
      /** Specify ``true`` to enable detailed monitoring. Otherwise, basic monitoring is enabled. */
      Enabled?: boolean;
    };
    /**
     * Indicates whether an instance is enabled for hibernation. This parameter is valid only if the
     * instance meets the [hibernation
     * prerequisites](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-prerequisites.html).
     * For more information, see [Hibernate your Amazon EC2
     * instance](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Hibernate.html) in the *Amazon EC2
     * User Guide*.
     */
    HibernationOptions?: {
      /**
       * If you set this parameter to ``true``, the instance is enabled for hibernation.
       * Default: ``false``
       */
      Configured?: boolean;
    };
    /**
     * The metadata options for the instance. For more information, see [Configure the Instance Metadata
     * Service
     * options](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-options.html)
     * in the *Amazon EC2 User Guide*.
     */
    MetadataOptions?: {
      /**
       * The desired HTTP PUT response hop limit for instance metadata requests. The larger the number, the
       * further instance metadata requests can travel.
       * Default: ``1``
       * Possible values: Integers from 1 to 64
       */
      HttpPutResponseHopLimit?: number;
      /**
       * Indicates whether IMDSv2 is required.
       * +  ``optional`` - IMDSv2 is optional. You can choose whether to send a session token in your
       * instance metadata retrieval requests. If you retrieve IAM role credentials without a session token,
       * you receive the IMDSv1 role credentials. If you retrieve IAM role credentials using a valid session
       * token, you receive the IMDSv2 role credentials.
       * +  ``required`` - IMDSv2 is required. You must send a session token in your instance metadata
       * retrieval requests. With this option, retrieving the IAM role credentials always returns IMDSv2
       * credentials; IMDSv1 credentials are not available.
       * Default: If the value of ``ImdsSupport`` for the Amazon Machine Image (AMI) for your instance is
       * ``v2.0``, the default is ``required``.
       */
      HttpTokens?: string;
      /**
       * Enables or disables the IPv6 endpoint for the instance metadata service.
       * Default: ``disabled``
       */
      HttpProtocolIpv6?: string;
      /**
       * Set to ``enabled`` to allow access to instance tags from the instance metadata. Set to ``disabled``
       * to turn off access to instance tags from the instance metadata. For more information, see [View
       * tags for your EC2 instances using instance
       * metadata](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/work-with-tags-in-IMDS.html).
       * Default: ``disabled``
       */
      InstanceMetadataTags?: string;
      /**
       * Enables or disables the HTTP metadata endpoint on your instances. If the parameter is not
       * specified, the default state is ``enabled``.
       * If you specify a value of ``disabled``, you will not be able to access your instance metadata.
       */
      HttpEndpoint?: string;
    };
    /**
     * The license configurations.
     * @uniqueItems false
     */
    LicenseSpecifications?: {
      /** The Amazon Resource Name (ARN) of the license configuration. */
      LicenseConfigurationArn?: string;
    }[];
    /**
     * Indicates whether an instance stops or terminates when you initiate shutdown from the instance
     * (using the operating system command for system shutdown).
     * Default: ``stop``
     */
    InstanceInitiatedShutdownBehavior?: string;
    /**
     * Indicates whether to enable the instance for stop protection. For more information, see [Enable
     * stop protection for your EC2
     * instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-stop-protection.html) in the
     * *Amazon EC2 User Guide*.
     */
    DisableApiStop?: boolean;
    /**
     * The CPU options for the instance. For more information, see [CPU options for Amazon EC2
     * instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-optimize-cpu.html) in the
     * *Amazon EC2 User Guide*.
     */
    CpuOptions?: {
      /**
       * The number of threads per CPU core. To disable multithreading for the instance, specify a value of
       * ``1``. Otherwise, specify the default value of ``2``.
       */
      ThreadsPerCore?: number;
      /**
       * Indicates whether to enable the instance for AMD SEV-SNP. AMD SEV-SNP is supported with M6a, R6a,
       * and C6a instance types only. For more information, see [AMD SEV-SNP for Amazon EC2
       * instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/sev-snp.html).
       * @enum ["enabled","disabled"]
       */
      AmdSevSnp?: "enabled" | "disabled";
      /** The number of CPU cores for the instance. */
      CoreCount?: number;
    };
    /**
     * The hostname type for EC2 instances launched into this subnet and how DNS A and AAAA record queries
     * should be handled. For more information, see [Amazon EC2 instance hostname
     * types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-naming.html) in the *User
     * Guide*.
     */
    PrivateDnsNameOptions?: {
      /** Indicates whether to respond to DNS queries for instance hostnames with DNS A records. */
      EnableResourceNameDnsARecord?: boolean;
      /**
       * The type of hostname for EC2 instances. For IPv4 only subnets, an instance DNS name must be based
       * on the instance IPv4 address. For IPv6 only subnets, an instance DNS name must be based on the
       * instance ID. For dual-stack subnets, you can specify whether DNS names use the instance IPv4
       * address or the instance ID. For more information, see [Amazon EC2 instance hostname
       * types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-naming.html) in the *User
       * Guide*.
       */
      HostnameType?: string;
      /** Indicates whether to respond to DNS queries for instance hostnames with DNS AAAA records. */
      EnableResourceNameDnsAAAARecord?: boolean;
    };
    /**
     * The IDs of the security groups. You can specify the IDs of existing security groups and references
     * to resources created by the stack template.
     * If you specify a network interface, you must specify any security groups as part of the network
     * interface instead.
     * @uniqueItems false
     */
    SecurityGroupIds?: string[];
    /**
     * The name of the key pair. You can create a key pair using
     * [CreateKeyPair](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateKeyPair.html) or
     * [ImportKeyPair](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_ImportKeyPair.html).
     * If you do not specify a key pair, you can't connect to the instance unless you choose an AMI that
     * is configured to allow users another way to log in.
     */
    KeyName?: string;
    /**
     * Indicates whether termination protection is enabled for the instance. The default is ``false``,
     * which means that you can terminate the instance using the Amazon EC2 console, command line tools,
     * or API. You can enable termination protection when you launch an instance, while the instance is
     * running, or while the instance is stopped.
     */
    DisableApiTermination?: boolean;
    /** The market (purchasing) option for the instances. */
    InstanceMarketOptions?: {
      /** The options for Spot Instances. */
      SpotOptions?: {
        /**
         * The Spot Instance request type.
         * If you are using Spot Instances with an Auto Scaling group, use ``one-time`` requests, as the
         * ASlong service handles requesting new Spot Instances whenever the group is below its desired
         * capacity.
         */
        SpotInstanceType?: string;
        /** The behavior when a Spot Instance is interrupted. The default is ``terminate``. */
        InstanceInterruptionBehavior?: string;
        /**
         * The maximum hourly price you're willing to pay for a Spot Instance. We do not recommend using this
         * parameter because it can lead to increased interruptions. If you do not specify this parameter, you
         * will pay the current Spot price. If you do specify this parameter, it must be more than USD $0.001.
         * Specifying a value below USD $0.001 will result in an ``InvalidParameterValue`` error message when
         * the launch template is used to launch an instance.
         * If you specify a maximum price, your Spot Instances will be interrupted more frequently than if
         * you do not specify this parameter.
         */
        MaxPrice?: string;
        /** Deprecated. */
        BlockDurationMinutes?: number;
        /**
         * The end date of the request, in UTC format (*YYYY-MM-DD*T*HH:MM:SS*Z). Supported only for
         * persistent requests.
         * +  For a persistent request, the request remains active until the ``ValidUntil`` date and time is
         * reached. Otherwise, the request remains active until you cancel it.
         * +  For a one-time request, ``ValidUntil`` is not supported. The request remains active until all
         * instances launch or you cancel the request.
         * Default: 7 days from the current date
         */
        ValidUntil?: string;
      };
      /** The market type. */
      MarketType?: string;
    };
    /**
     * The attributes for the instance types. When you specify instance attributes, Amazon EC2 will
     * identify instance types with these attributes.
     * You must specify ``VCpuCount`` and ``MemoryMiB``. All other attributes are optional. Any
     * unspecified optional attribute is set to its default.
     * When you specify multiple attributes, you get instance types that satisfy all of the specified
     * attributes. If you specify multiple values for an attribute, you get instance types that satisfy
     * any of the specified values.
     * To limit the list of instance types from which Amazon EC2 can identify matching instance types,
     * you can use one of the following parameters, but not both in the same request:
     * +  ``AllowedInstanceTypes`` - The instance types to include in the list. All other instance types
     * are ignored, even if they match your specified attributes.
     * +  ``ExcludedInstanceTypes`` - The instance types to exclude from the list, even if they match
     * your specified attributes.
     * If you specify ``InstanceRequirements``, you can't specify ``InstanceType``.
     * Attribute-based instance type selection is only supported when using Auto Scaling groups, EC2
     * Fleet, and Spot Fleet to launch instances. If you plan to use the launch template in the [launch
     * instance
     * wizard](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-instance-wizard.html), or
     * with the
     * [RunInstances](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_RunInstances.html) API or
     * [AWS::EC2::Instance](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-instance.html)AWS
     * CloudFormation resource, you can't specify ``InstanceRequirements``.
     * For more information, see [Specify attributes for instance type selection for EC2 Fleet or Spot
     * Fleet](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-attribute-based-instance-type-selection.html)
     * and [Spot placement
     * score](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-placement-score.html) in the
     * *Amazon EC2 User Guide*.
     */
    InstanceRequirements?: {
      /**
       * Indicates whether current or previous generation instance types are included. The current
       * generation instance types are recommended for use. Current generation instance types are typically
       * the latest two to three generations in each instance family. For more information, see [Instance
       * types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html) in the *Amazon EC2
       * User Guide*.
       * For current generation instance types, specify ``current``.
       * For previous generation instance types, specify ``previous``.
       * Default: Current and previous generation instance types
       * @uniqueItems false
       */
      InstanceGenerations?: string[];
      /**
       * The minimum and maximum amount of memory per vCPU, in GiB.
       * Default: No minimum or maximum limits
       */
      MemoryGiBPerVCpu?: {
        /** The minimum amount of memory per vCPU, in GiB. To specify no minimum limit, omit this parameter. */
        Min?: number;
        /** The maximum amount of memory per vCPU, in GiB. To specify no maximum limit, omit this parameter. */
        Max?: number;
      };
      /**
       * The accelerator types that must be on the instance type.
       * +  For instance types with FPGA accelerators, specify ``fpga``.
       * +  For instance types with GPU accelerators, specify ``gpu``.
       * +  For instance types with Inference accelerators, specify ``inference``.
       * Default: Any accelerator type
       * @uniqueItems false
       */
      AcceleratorTypes?: string[];
      /** The minimum and maximum number of vCPUs. */
      VCpuCount?: {
        /** The minimum number of vCPUs. To specify no minimum limit, specify ``0``. */
        Min?: number;
        /** The maximum number of vCPUs. To specify no maximum limit, omit this parameter. */
        Max?: number;
      };
      /**
       * Indicates whether instance types must have accelerators by specific manufacturers.
       * +  For instance types with AWS devices, specify ``amazon-web-services``.
       * +  For instance types with AMD devices, specify ``amd``.
       * +  For instance types with Habana devices, specify ``habana``.
       * +  For instance types with NVIDIA devices, specify ``nvidia``.
       * +  For instance types with Xilinx devices, specify ``xilinx``.
       * Default: Any manufacturer
       * @uniqueItems false
       */
      AcceleratorManufacturers?: string[];
      /**
       * Indicates whether instance types with instance store volumes are included, excluded, or required.
       * For more information, [Amazon EC2 instance
       * store](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html) in the *Amazon EC2
       * User Guide*.
       * +  To include instance types with instance store volumes, specify ``included``.
       * +  To require only instance types with instance store volumes, specify ``required``.
       * +  To exclude instance types with instance store volumes, specify ``excluded``.
       * Default: ``included``
       */
      LocalStorage?: string;
      /**
       * The CPU manufacturers to include.
       * +  For instance types with Intel CPUs, specify ``intel``.
       * +  For instance types with AMD CPUs, specify ``amd``.
       * +  For instance types with AWS CPUs, specify ``amazon-web-services``.
       * +  For instance types with Apple CPUs, specify ``apple``.
       * Don't confuse the CPU manufacturer with the CPU architecture. Instances will be launched with a
       * compatible CPU architecture based on the Amazon Machine Image (AMI) that you specify in your launch
       * template.
       * Default: Any manufacturer
       * @uniqueItems false
       */
      CpuManufacturers?: string[];
      /**
       * Indicates whether bare metal instance types must be included, excluded, or required.
       * +  To include bare metal instance types, specify ``included``.
       * +  To require only bare metal instance types, specify ``required``.
       * +  To exclude bare metal instance types, specify ``excluded``.
       * Default: ``excluded``
       */
      BareMetal?: string;
      /**
       * Indicates whether instance types must support hibernation for On-Demand Instances.
       * This parameter is not supported for
       * [GetSpotPlacementScores](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_GetSpotPlacementScores.html).
       * Default: ``false``
       */
      RequireHibernateSupport?: boolean;
      /**
       * [Price protection] The price protection threshold for Spot Instances, as a percentage of an
       * identified On-Demand price. The identified On-Demand price is the price of the lowest priced
       * current generation C, M, or R instance type with your specified attributes. If no current
       * generation C, M, or R instance type matches your attributes, then the identified price is from the
       * lowest priced current generation instance types, and failing that, from the lowest priced previous
       * generation instance types that match your attributes. When Amazon EC2 selects instance types with
       * your attributes, it will exclude instance types whose price exceeds your specified threshold.
       * The parameter accepts an integer, which Amazon EC2 interprets as a percentage.
       * If you set ``TargetCapacityUnitType`` to ``vcpu`` or ``memory-mib``, the price protection
       * threshold is based on the per vCPU or per memory price instead of the per instance price.
       * Only one of ``SpotMaxPricePercentageOverLowestPrice`` or
       * ``MaxSpotPriceAsPercentageOfOptimalOnDemandPrice`` can be specified. If you don't specify either,
       * Amazon EC2 will automatically apply optimal price protection to consistently select from a wide
       * range of instance types. To indicate no price protection threshold for Spot Instances, meaning you
       * want to consider all instance types that match your attributes, include one of these parameters and
       * specify a high value, such as ``999999``.
       */
      MaxSpotPriceAsPercentageOfOptimalOnDemandPrice?: number;
      /**
       * [Price protection] The price protection threshold for On-Demand Instances, as a percentage higher
       * than an identified On-Demand price. The identified On-Demand price is the price of the lowest
       * priced current generation C, M, or R instance type with your specified attributes. When Amazon EC2
       * selects instance types with your attributes, it will exclude instance types whose price exceeds
       * your specified threshold.
       * The parameter accepts an integer, which Amazon EC2 interprets as a percentage.
       * To turn off price protection, specify a high value, such as ``999999``.
       * This parameter is not supported for
       * [GetSpotPlacementScores](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_GetSpotPlacementScores.html)
       * and
       * [GetInstanceTypesFromInstanceRequirements](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_GetInstanceTypesFromInstanceRequirements.html).
       * If you set ``TargetCapacityUnitType`` to ``vcpu`` or ``memory-mib``, the price protection
       * threshold is applied based on the per-vCPU or per-memory price instead of the per-instance price.
       * Default: ``20``
       */
      OnDemandMaxPricePercentageOverLowestPrice?: number;
      /** The minimum and maximum amount of memory, in MiB. */
      MemoryMiB?: {
        /** The minimum amount of memory, in MiB. To specify no minimum limit, specify ``0``. */
        Min?: number;
        /** The maximum amount of memory, in MiB. To specify no maximum limit, omit this parameter. */
        Max?: number;
      };
      /**
       * The type of local storage that is required.
       * +  For instance types with hard disk drive (HDD) storage, specify ``hdd``.
       * +  For instance types with solid state drive (SSD) storage, specify ``ssd``.
       * Default: ``hdd`` and ``ssd``
       * @uniqueItems false
       */
      LocalStorageTypes?: string[];
      /**
       * The minimum and maximum number of network interfaces.
       * Default: No minimum or maximum limits
       */
      NetworkInterfaceCount?: {
        /** The minimum number of network interfaces. To specify no minimum limit, omit this parameter. */
        Min?: number;
        /** The maximum number of network interfaces. To specify no maximum limit, omit this parameter. */
        Max?: number;
      };
      /**
       * The instance types to exclude.
       * You can use strings with one or more wild cards, represented by an asterisk (``*``), to exclude an
       * instance type, size, or generation. The following are examples: ``m5.8xlarge``, ``c5*.*``,
       * ``m5a.*``, ``r*``, ``*3*``.
       * For example, if you specify ``c5*``,Amazon EC2 will exclude the entire C5 instance family, which
       * includes all C5a and C5n instance types. If you specify ``m5a.*``, Amazon EC2 will exclude all the
       * M5a instance types, but not the M5n instance types.
       * If you specify ``ExcludedInstanceTypes``, you can't specify ``AllowedInstanceTypes``.
       * Default: No excluded instance types
       * @uniqueItems false
       */
      ExcludedInstanceTypes?: string[];
      /**
       * The instance types to apply your specified attributes against. All other instance types are
       * ignored, even if they match your specified attributes.
       * You can use strings with one or more wild cards, represented by an asterisk (``*``), to allow an
       * instance type, size, or generation. The following are examples: ``m5.8xlarge``, ``c5*.*``,
       * ``m5a.*``, ``r*``, ``*3*``.
       * For example, if you specify ``c5*``,Amazon EC2 will allow the entire C5 instance family, which
       * includes all C5a and C5n instance types. If you specify ``m5a.*``, Amazon EC2 will allow all the
       * M5a instance types, but not the M5n instance types.
       * If you specify ``AllowedInstanceTypes``, you can't specify ``ExcludedInstanceTypes``.
       * Default: All instance types
       * @uniqueItems false
       */
      AllowedInstanceTypes?: string[];
      /**
       * The minimum and maximum number of accelerators (GPUs, FPGAs, or AWS Inferentia chips) on an
       * instance.
       * To exclude accelerator-enabled instance types, set ``Max`` to ``0``.
       * Default: No minimum or maximum limits
       */
      AcceleratorCount?: {
        /** The minimum number of accelerators. To specify no minimum limit, omit this parameter. */
        Min?: number;
        /**
         * The maximum number of accelerators. To specify no maximum limit, omit this parameter. To exclude
         * accelerator-enabled instance types, set ``Max`` to ``0``.
         */
        Max?: number;
      };
      /**
       * The minimum and maximum amount of network bandwidth, in gigabits per second (Gbps).
       * Default: No minimum or maximum limits
       */
      NetworkBandwidthGbps?: {
        /**
         * The minimum amount of network bandwidth, in Gbps. If this parameter is not specified, there is no
         * minimum limit.
         */
        Min?: number;
        /** The maximum amount of network bandwidth, in Gbps. To specify no maximum limit, omit this parameter. */
        Max?: number;
      };
      /**
       * The baseline performance to consider, using an instance family as a baseline reference. The
       * instance family establishes the lowest acceptable level of performance. Amazon EC2 uses this
       * baseline to guide instance type selection, but there is no guarantee that the selected instance
       * types will always exceed the baseline for every application. Currently, this parameter only
       * supports CPU performance as a baseline performance factor. For more information, see [Performance
       * protection](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-attribute-based-instance-type-selection.html#ec2fleet-abis-performance-protection)
       * in the *Amazon EC2 User Guide*.
       */
      BaselinePerformanceFactors?: {
        /** The CPU performance to consider, using an instance family as the baseline reference. */
        Cpu?: {
          /**
           * The instance family to use as the baseline reference for CPU performance. All instance types that
           * match your specified attributes are compared against the CPU performance of the referenced instance
           * family, regardless of CPU manufacturer or architecture differences.
           */
          References?: ({
            /**
             * The instance family to use as a baseline reference.
             * Ensure that you specify the correct value for the instance family. The instance family is
             * everything before the period (``.``) in the instance type name. For example, in the instance type
             * ``c6i.large``, the instance family is ``c6i``, not ``c6``. For more information, see [Amazon EC2
             * instance type naming
             * conventions](https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-type-names.html) in
             * *Amazon EC2 Instance Types*.
             * The following instance families are *not supported* for performance protection:
             * +   ``c1``
             * +  ``g3`` | ``g3s``
             * +   ``hpc7g``
             * +  ``m1`` | ``m2``
             * +  ``mac1`` | ``mac2`` | ``mac2-m1ultra`` | ``mac2-m2`` | ``mac2-m2pro``
             * +  ``p3dn`` | ``p4d`` | ``p5``
             * +   ``t1``
             * +  ``u-12tb1`` | ``u-18tb1`` | ``u-24tb1`` | ``u-3tb1`` | ``u-6tb1`` | ``u-9tb1`` | ``u7i-12tb``
             * | ``u7in-16tb`` | ``u7in-24tb`` | ``u7in-32tb``
             * If you enable performance protection by specifying a supported instance family, the returned
             * instance types will exclude the above unsupported instance families.
             */
            InstanceFamily?: string;
          })[];
        };
      };
      /**
       * [Price protection] The price protection threshold for Spot Instances, as a percentage higher than
       * an identified Spot price. The identified Spot price is the Spot price of the lowest priced current
       * generation C, M, or R instance type with your specified attributes. If no current generation C, M,
       * or R instance type matches your attributes, then the identified Spot price is from the lowest
       * priced current generation instance types, and failing that, from the lowest priced previous
       * generation instance types that match your attributes. When Amazon EC2 selects instance types with
       * your attributes, it will exclude instance types whose Spot price exceeds your specified threshold.
       * The parameter accepts an integer, which Amazon EC2 interprets as a percentage.
       * If you set ``TargetCapacityUnitType`` to ``vcpu`` or ``memory-mib``, the price protection
       * threshold is applied based on the per-vCPU or per-memory price instead of the per-instance price.
       * This parameter is not supported for
       * [GetSpotPlacementScores](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_GetSpotPlacementScores.html)
       * and
       * [GetInstanceTypesFromInstanceRequirements](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_GetInstanceTypesFromInstanceRequirements.html).
       * Only one of ``SpotMaxPricePercentageOverLowestPrice`` or
       * ``MaxSpotPriceAsPercentageOfOptimalOnDemandPrice`` can be specified. If you don't specify either,
       * Amazon EC2 will automatically apply optimal price protection to consistently select from a wide
       * range of instance types. To indicate no price protection threshold for Spot Instances, meaning you
       * want to consider all instance types that match your attributes, include one of these parameters and
       * specify a high value, such as ``999999``.
       * Default: ``100``
       */
      SpotMaxPricePercentageOverLowestPrice?: number;
      /**
       * The minimum and maximum baseline bandwidth to Amazon EBS, in Mbps. For more information, see
       * [Amazon EBS–optimized
       * instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-optimized.html) in the *Amazon
       * EC2 User Guide*.
       * Default: No minimum or maximum limits
       */
      BaselineEbsBandwidthMbps?: {
        /** The minimum baseline bandwidth, in Mbps. To specify no minimum limit, omit this parameter. */
        Min?: number;
        /** The maximum baseline bandwidth, in Mbps. To specify no maximum limit, omit this parameter. */
        Max?: number;
      };
      /**
       * The accelerators that must be on the instance type.
       * +  For instance types with NVIDIA A10G GPUs, specify ``a10g``.
       * +  For instance types with NVIDIA A100 GPUs, specify ``a100``.
       * +  For instance types with NVIDIA H100 GPUs, specify ``h100``.
       * +  For instance types with AWS Inferentia chips, specify ``inferentia``.
       * +  For instance types with NVIDIA GRID K520 GPUs, specify ``k520``.
       * +  For instance types with NVIDIA K80 GPUs, specify ``k80``.
       * +  For instance types with NVIDIA M60 GPUs, specify ``m60``.
       * +  For instance types with AMD Radeon Pro V520 GPUs, specify ``radeon-pro-v520``.
       * +  For instance types with NVIDIA T4 GPUs, specify ``t4``.
       * +  For instance types with NVIDIA T4G GPUs, specify ``t4g``.
       * +  For instance types with Xilinx VU9P FPGAs, specify ``vu9p``.
       * +  For instance types with NVIDIA V100 GPUs, specify ``v100``.
       * Default: Any accelerator
       * @uniqueItems false
       */
      AcceleratorNames?: string[];
      /**
       * The minimum and maximum amount of total accelerator memory, in MiB.
       * Default: No minimum or maximum limits
       */
      AcceleratorTotalMemoryMiB?: {
        /** The minimum amount of accelerator memory, in MiB. To specify no minimum limit, omit this parameter. */
        Min?: number;
        /** The maximum amount of accelerator memory, in MiB. To specify no maximum limit, omit this parameter. */
        Max?: number;
      };
      /**
       * Indicates whether burstable performance T instance types are included, excluded, or required. For
       * more information, see [Burstable performance
       * instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances.html).
       * +  To include burstable performance instance types, specify ``included``.
       * +  To require only burstable performance instance types, specify ``required``.
       * +  To exclude burstable performance instance types, specify ``excluded``.
       * Default: ``excluded``
       */
      BurstablePerformance?: string;
      /**
       * The minimum and maximum amount of total local storage, in GB.
       * Default: No minimum or maximum limits
       */
      TotalLocalStorageGB?: {
        /** The minimum amount of total local storage, in GB. To specify no minimum limit, omit this parameter. */
        Min?: number;
        /** The maximum amount of total local storage, in GB. To specify no maximum limit, omit this parameter. */
        Max?: number;
      };
    };
    /**
     * The ID of the RAM disk.
     * We recommend that you use PV-GRUB instead of kernels and RAM disks. For more information, see
     * [User provided
     * kernels](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/UserProvidedkernels.html) in the
     * *Amazon EC2 User Guide*.
     */
    RamDiskId?: string;
    /**
     * The Capacity Reservation targeting option. If you do not specify this parameter, the instance's
     * Capacity Reservation preference defaults to ``open``, which enables it to run in any open Capacity
     * Reservation that has matching attributes (instance type, platform, Availability Zone).
     */
    CapacityReservationSpecification?: {
      /**
       * Indicates the instance's Capacity Reservation preferences. Possible preferences include:
       * +  ``capacity-reservations-only`` - The instance will only run in a Capacity Reservation or
       * Capacity Reservation group. If capacity isn't available, the instance will fail to launch.
       * +  ``open`` - The instance can run in any ``open`` Capacity Reservation that has matching
       * attributes (instance type, platform, Availability Zone, tenancy).
       * +  ``none`` - The instance avoids running in a Capacity Reservation even if one is available. The
       * instance runs in On-Demand capacity.
       */
      CapacityReservationPreference?: string;
      /** Information about the target Capacity Reservation or Capacity Reservation group. */
      CapacityReservationTarget?: {
        /** The ARN of the Capacity Reservation resource group in which to run the instance. */
        CapacityReservationResourceGroupArn?: string;
        /** The ID of the Capacity Reservation in which to run the instance. */
        CapacityReservationId?: string;
      };
    };
    /** The credit option for CPU usage of the instance. Valid only for T instances. */
    CreditSpecification?: {
      /**
       * The credit option for CPU usage of a T instance.
       * Valid values: ``standard`` | ``unlimited``
       */
      CpuCredits?: string;
    };
  };
  /** A description for the first version of the launch template. */
  VersionDescription?: string;
  /**
   * The tags to apply to the launch template on creation. To tag the launch template, the resource type
   * must be ``launch-template``.
   * To specify the tags for resources that are created during instance launch, use
   * [TagSpecifications](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-launchtemplate-launchtemplatedata.html#cfn-ec2-launchtemplate-launchtemplatedata-tagspecifications).
   * @uniqueItems false
   */
  TagSpecifications?: {
    /** The type of resource. To tag a launch template, ``ResourceType`` must be ``launch-template``. */
    ResourceType?: string;
    /**
     * The tags for the resource.
     * @uniqueItems false
     */
    Tags?: {
      /** The tag value. */
      Value: string;
      /** The tag key. */
      Key: string;
    }[];
  }[];
  LatestVersionNumber?: string;
  LaunchTemplateId?: string;
  DefaultVersionNumber?: string;
};


/** Resource Type definition for AWS::Batch::ComputeEnvironment */
export type AwsBatchComputeenvironment = {
  ComputeEnvironmentArn?: string;
  ComputeEnvironmentName?: string;
  ComputeResources?: {
    AllocationStrategy?: string;
    BidPercentage?: number;
    DesiredvCpus?: number;
    /** @uniqueItems false */
    Ec2Configuration?: {
      ImageIdOverride?: string;
      ImageType: string;
      ImageKubernetesVersion?: string;
    }[];
    Ec2KeyPair?: string;
    ImageId?: string;
    InstanceRole?: string;
    /** @uniqueItems false */
    InstanceTypes?: string[];
    LaunchTemplate?: {
      LaunchTemplateId?: string;
      LaunchTemplateName?: string;
      Version?: string;
      /** @enum ["EKS_BOOTSTRAP_SH","EKS_NODEADM"] */
      UserdataType?: "EKS_BOOTSTRAP_SH" | "EKS_NODEADM";
      /** @uniqueItems false */
      Overrides?: ({
        LaunchTemplateId?: string;
        LaunchTemplateName?: string;
        Version?: string;
        /** @enum ["EKS_BOOTSTRAP_SH","EKS_NODEADM"] */
        UserdataType?: "EKS_BOOTSTRAP_SH" | "EKS_NODEADM";
        /** @uniqueItems false */
        TargetInstanceTypes?: string[];
      })[];
    };
    MaxvCpus: number;
    MinvCpus?: number;
    PlacementGroup?: string;
    /** @uniqueItems false */
    SecurityGroupIds?: string[];
    SpotIamFleetRole?: string;
    /** @uniqueItems false */
    Subnets: string[];
    /** A key-value pair to associate with a resource. */
    Tags?: Record<string, string>;
    Type: string;
    /** @default false */
    UpdateToLatestImageVersion?: boolean;
  };
  /** @default true */
  ReplaceComputeEnvironment?: boolean;
  ServiceRole?: string;
  State?: string;
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
  Type: string;
  UpdatePolicy?: {
    /** @default false */
    TerminateJobsOnUpdate?: boolean;
    /** @default 30 */
    JobExecutionTimeoutMinutes?: number;
  };
  UnmanagedvCpus?: number;
  EksConfiguration?: {
    /** @default false */
    EksClusterArn: string;
    /** @default false */
    KubernetesNamespace: string;
  };
  Context?: string;
};


/** Resource Type definition for AWS::Batch::JobQueue */
export type AwsBatchJobqueue = {
  /**
   * @minLength 1
   * @maxLength 128
   */
  JobQueueName?: string;
  JobQueueArn?: string;
  JobQueueType?: string;
  /** @uniqueItems false */
  ComputeEnvironmentOrder?: {
    ComputeEnvironment: string;
    Order: number;
  }[];
  /** @uniqueItems false */
  ServiceEnvironmentOrder?: {
    ServiceEnvironment: string;
    Order: number;
  }[];
  /** @uniqueItems false */
  JobStateTimeLimitActions?: ({
    /** @enum ["CANCEL","TERMINATE"] */
    Action: "CANCEL" | "TERMINATE";
    /**
     * @minimum 600
     * @maximum 86400
     */
    MaxTimeSeconds: number;
    Reason: string;
    /** @enum ["RUNNABLE"] */
    State: "RUNNABLE";
  })[];
  /**
   * @minimum 0
   * @maximum 1000
   */
  Priority: number;
  /** @enum ["DISABLED","ENABLED"] */
  State?: "DISABLED" | "ENABLED";
  SchedulingPolicyArn?: string;
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
};


/** Resource Type definition for AWS::Batch::JobDefinition */
export type AwsBatchJobdefinition = {
  ContainerProperties?: {
    /** @uniqueItems false */
    Command?: string[];
    /** @uniqueItems false */
    Environment?: {
      Name?: string;
      Value?: string;
    }[];
    Image: string;
    JobRoleArn?: string;
    Memory?: number;
    /** @uniqueItems false */
    MountPoints?: {
      ContainerPath?: string;
      ReadOnly?: boolean;
      SourceVolume?: string;
    }[];
    Privileged?: boolean;
    ReadonlyRootFilesystem?: boolean;
    /** @uniqueItems false */
    Ulimits?: {
      HardLimit: number;
      Name: string;
      SoftLimit: number;
    }[];
    User?: string;
    Vcpus?: number;
    /** @uniqueItems false */
    Volumes?: {
      Host?: {
        SourcePath?: string;
      };
      EfsVolumeConfiguration?: {
        FileSystemId: string;
        RootDirectory?: string;
        TransitEncryption?: string;
        TransitEncryptionPort?: number;
        AuthorizationConfig?: {
          AccessPointId?: string;
          Iam?: string;
        };
      };
      Name?: string;
    }[];
    /** @uniqueItems false */
    ResourceRequirements?: {
      Type?: string;
      Value?: string;
    }[];
    LinuxParameters?: {
      /** @uniqueItems false */
      Devices?: {
        HostPath?: string;
        ContainerPath?: string;
        /** @uniqueItems false */
        Permissions?: string[];
      }[];
      InitProcessEnabled?: boolean;
      MaxSwap?: number;
      Swappiness?: number;
      SharedMemorySize?: number;
      /** @uniqueItems false */
      Tmpfs?: {
        ContainerPath: string;
        Size: number;
        /** @uniqueItems false */
        MountOptions?: string[];
      }[];
    };
    LogConfiguration?: {
      LogDriver: string;
      Options?: Record<string, string>;
      /** @uniqueItems false */
      SecretOptions?: {
        Name: string;
        ValueFrom: string;
      }[];
    };
    ExecutionRoleArn?: string;
    /** @uniqueItems false */
    Secrets?: {
      Name: string;
      ValueFrom: string;
    }[];
    NetworkConfiguration?: {
      AssignPublicIp?: string;
    };
    FargatePlatformConfiguration?: {
      PlatformVersion?: string;
    };
    EphemeralStorage?: {
      SizeInGiB: number;
    };
    RuntimePlatform?: {
      OperatingSystemFamily?: string;
      CpuArchitecture?: string;
    };
    RepositoryCredentials?: {
      CredentialsParameter: string;
    };
    EnableExecuteCommand?: boolean;
  };
  EcsProperties?: {
    /** @uniqueItems false */
    TaskProperties: {
      /** @uniqueItems false */
      Containers?: {
        /** @uniqueItems false */
        Command?: string[];
        /** @uniqueItems false */
        Environment?: {
          Name?: string;
          Value?: string;
        }[];
        /** @uniqueItems false */
        DependsOn?: {
          ContainerName: string;
          Condition: string;
        }[];
        Name?: string;
        Image: string;
        LinuxParameters?: {
          /** @uniqueItems false */
          Devices?: {
            HostPath?: string;
            ContainerPath?: string;
            /** @uniqueItems false */
            Permissions?: string[];
          }[];
          InitProcessEnabled?: boolean;
          MaxSwap?: number;
          Swappiness?: number;
          SharedMemorySize?: number;
          /** @uniqueItems false */
          Tmpfs?: {
            ContainerPath: string;
            Size: number;
            /** @uniqueItems false */
            MountOptions?: string[];
          }[];
        };
        LogConfiguration?: {
          LogDriver: string;
          Options?: Record<string, string>;
          /** @uniqueItems false */
          SecretOptions?: {
            Name: string;
            ValueFrom: string;
          }[];
        };
        /** @uniqueItems false */
        MountPoints?: {
          ContainerPath?: string;
          ReadOnly?: boolean;
          SourceVolume?: string;
        }[];
        Essential?: boolean;
        Privileged?: boolean;
        ReadonlyRootFilesystem?: boolean;
        /** @uniqueItems false */
        Ulimits?: {
          HardLimit: number;
          Name: string;
          SoftLimit: number;
        }[];
        User?: string;
        /** @uniqueItems false */
        Secrets?: {
          Name: string;
          ValueFrom: string;
        }[];
        RepositoryCredentials?: {
          CredentialsParameter: string;
        };
        /** @uniqueItems false */
        ResourceRequirements?: {
          Type?: string;
          Value?: string;
        }[];
        FirelensConfiguration?: {
          Type: string;
          Options?: Record<string, string>;
        };
      }[];
      EphemeralStorage?: {
        SizeInGiB: number;
      };
      ExecutionRoleArn?: string;
      RuntimePlatform?: {
        OperatingSystemFamily?: string;
        CpuArchitecture?: string;
      };
      NetworkConfiguration?: {
        AssignPublicIp?: string;
      };
      /** @uniqueItems false */
      Volumes?: {
        Host?: {
          SourcePath?: string;
        };
        EfsVolumeConfiguration?: {
          FileSystemId: string;
          RootDirectory?: string;
          TransitEncryption?: string;
          TransitEncryptionPort?: number;
          AuthorizationConfig?: {
            AccessPointId?: string;
            Iam?: string;
          };
        };
        Name?: string;
      }[];
      PidMode?: string;
      IpcMode?: string;
      PlatformVersion?: string;
      TaskRoleArn?: string;
      EnableExecuteCommand?: boolean;
    }[];
  };
  NodeProperties?: {
    NumNodes: number;
    MainNode: number;
    /** @uniqueItems false */
    NodeRangeProperties: {
      TargetNodes: string;
      Container?: {
        /** @uniqueItems false */
        Command?: string[];
        /** @uniqueItems false */
        Environment?: {
          Name?: string;
          Value?: string;
        }[];
        Image: string;
        JobRoleArn?: string;
        Memory?: number;
        /** @uniqueItems false */
        MountPoints?: {
          ContainerPath?: string;
          ReadOnly?: boolean;
          SourceVolume?: string;
        }[];
        Privileged?: boolean;
        ReadonlyRootFilesystem?: boolean;
        /** @uniqueItems false */
        Ulimits?: {
          HardLimit: number;
          Name: string;
          SoftLimit: number;
        }[];
        User?: string;
        Vcpus?: number;
        /** @uniqueItems false */
        Volumes?: {
          Host?: {
            SourcePath?: string;
          };
          EfsVolumeConfiguration?: {
            FileSystemId: string;
            RootDirectory?: string;
            TransitEncryption?: string;
            TransitEncryptionPort?: number;
            AuthorizationConfig?: {
              AccessPointId?: string;
              Iam?: string;
            };
          };
          Name?: string;
        }[];
        InstanceType?: string;
        /** @uniqueItems false */
        ResourceRequirements?: {
          Type?: string;
          Value?: string;
        }[];
        LinuxParameters?: {
          /** @uniqueItems false */
          Devices?: {
            HostPath?: string;
            ContainerPath?: string;
            /** @uniqueItems false */
            Permissions?: string[];
          }[];
          InitProcessEnabled?: boolean;
          MaxSwap?: number;
          Swappiness?: number;
          SharedMemorySize?: number;
          /** @uniqueItems false */
          Tmpfs?: {
            ContainerPath: string;
            Size: number;
            /** @uniqueItems false */
            MountOptions?: string[];
          }[];
        };
        LogConfiguration?: {
          LogDriver: string;
          Options?: Record<string, string>;
          /** @uniqueItems false */
          SecretOptions?: {
            Name: string;
            ValueFrom: string;
          }[];
        };
        ExecutionRoleArn?: string;
        /** @uniqueItems false */
        Secrets?: {
          Name: string;
          ValueFrom: string;
        }[];
        EphemeralStorage?: {
          SizeInGiB: number;
        };
        RuntimePlatform?: {
          OperatingSystemFamily?: string;
          CpuArchitecture?: string;
        };
        RepositoryCredentials?: {
          CredentialsParameter: string;
        };
        EnableExecuteCommand?: boolean;
      };
      EcsProperties?: {
        /** @uniqueItems false */
        TaskProperties: {
          /** @uniqueItems false */
          Containers?: {
            /** @uniqueItems false */
            Command?: string[];
            /** @uniqueItems false */
            Environment?: {
              Name?: string;
              Value?: string;
            }[];
            /** @uniqueItems false */
            DependsOn?: {
              ContainerName: string;
              Condition: string;
            }[];
            Name?: string;
            Image: string;
            LinuxParameters?: {
              /** @uniqueItems false */
              Devices?: {
                HostPath?: string;
                ContainerPath?: string;
                /** @uniqueItems false */
                Permissions?: string[];
              }[];
              InitProcessEnabled?: boolean;
              MaxSwap?: number;
              Swappiness?: number;
              SharedMemorySize?: number;
              /** @uniqueItems false */
              Tmpfs?: {
                ContainerPath: string;
                Size: number;
                /** @uniqueItems false */
                MountOptions?: string[];
              }[];
            };
            LogConfiguration?: {
              LogDriver: string;
              Options?: Record<string, string>;
              /** @uniqueItems false */
              SecretOptions?: {
                Name: string;
                ValueFrom: string;
              }[];
            };
            /** @uniqueItems false */
            MountPoints?: {
              ContainerPath?: string;
              ReadOnly?: boolean;
              SourceVolume?: string;
            }[];
            Essential?: boolean;
            Privileged?: boolean;
            ReadonlyRootFilesystem?: boolean;
            /** @uniqueItems false */
            Ulimits?: {
              HardLimit: number;
              Name: string;
              SoftLimit: number;
            }[];
            User?: string;
            /** @uniqueItems false */
            Secrets?: {
              Name: string;
              ValueFrom: string;
            }[];
            RepositoryCredentials?: {
              CredentialsParameter: string;
            };
            /** @uniqueItems false */
            ResourceRequirements?: {
              Type?: string;
              Value?: string;
            }[];
            FirelensConfiguration?: {
              Type: string;
              Options?: Record<string, string>;
            };
          }[];
          ExecutionRoleArn?: string;
          /** @uniqueItems false */
          Volumes?: {
            Host?: {
              SourcePath?: string;
            };
            EfsVolumeConfiguration?: {
              FileSystemId: string;
              RootDirectory?: string;
              TransitEncryption?: string;
              TransitEncryptionPort?: number;
              AuthorizationConfig?: {
                AccessPointId?: string;
                Iam?: string;
              };
            };
            Name?: string;
          }[];
          PidMode?: string;
          IpcMode?: string;
          TaskRoleArn?: string;
          EnableExecuteCommand?: boolean;
        }[];
      };
      EksProperties?: {
        PodProperties?: {
          ServiceAccountName?: string;
          HostNetwork?: boolean;
          DnsPolicy?: string;
          /** @uniqueItems false */
          InitContainers?: {
            Name?: string;
            Image: string;
            ImagePullPolicy?: string;
            /** @uniqueItems false */
            Command?: string[];
            /** @uniqueItems false */
            Args?: string[];
            /** @uniqueItems false */
            Env?: {
              Name: string;
              Value?: string;
            }[];
            Resources?: {
              Limits?: Record<string, string>;
              Requests?: Record<string, string>;
            };
            /** @uniqueItems false */
            VolumeMounts?: {
              Name?: string;
              MountPath?: string;
              SubPath?: string;
              ReadOnly?: boolean;
            }[];
            SecurityContext?: {
              RunAsUser?: number;
              RunAsGroup?: number;
              Privileged?: boolean;
              AllowPrivilegeEscalation?: boolean;
              ReadOnlyRootFilesystem?: boolean;
              RunAsNonRoot?: boolean;
            };
          }[];
          /** @uniqueItems false */
          Containers?: {
            Name?: string;
            Image: string;
            ImagePullPolicy?: string;
            /** @uniqueItems false */
            Command?: string[];
            /** @uniqueItems false */
            Args?: string[];
            /** @uniqueItems false */
            Env?: {
              Name: string;
              Value?: string;
            }[];
            Resources?: {
              Limits?: Record<string, string>;
              Requests?: Record<string, string>;
            };
            /** @uniqueItems false */
            VolumeMounts?: {
              Name?: string;
              MountPath?: string;
              SubPath?: string;
              ReadOnly?: boolean;
            }[];
            SecurityContext?: {
              RunAsUser?: number;
              RunAsGroup?: number;
              Privileged?: boolean;
              AllowPrivilegeEscalation?: boolean;
              ReadOnlyRootFilesystem?: boolean;
              RunAsNonRoot?: boolean;
            };
          }[];
          /** @uniqueItems false */
          Volumes?: {
            Name: string;
            HostPath?: {
              Path?: string;
            };
            EmptyDir?: {
              Medium?: string;
              SizeLimit?: string;
            };
            Secret?: {
              SecretName: string;
              Optional?: boolean;
            };
            PersistentVolumeClaim?: {
              ClaimName: string;
              ReadOnly?: boolean;
            };
          }[];
          /** @uniqueItems false */
          ImagePullSecrets?: {
            Name?: string;
          }[];
          Metadata?: {
            Labels?: Record<string, string>;
            Annotations?: Record<string, string>;
            Namespace?: string;
          };
          ShareProcessNamespace?: boolean;
        };
      };
      ConsumableResourceProperties?: {
        /** @uniqueItems true */
        ConsumableResourceList: {
          /**
           * The ARN of the consumable resource the job definition should consume.
           * @pattern arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}
           */
          ConsumableResource: string;
          Quantity: number;
        }[];
      };
      /** @uniqueItems false */
      InstanceTypes?: string[];
    }[];
  };
  /** @maxLength 128 */
  JobDefinitionName?: string;
  JobDefinitionArn?: string;
  SchedulingPriority?: number;
  Parameters?: Record<string, string>;
  /** @uniqueItems false */
  PlatformCapabilities?: string[];
  PropagateTags?: boolean;
  RetryStrategy?: {
    Attempts?: number;
    /** @uniqueItems false */
    EvaluateOnExit?: {
      OnExitCode?: string;
      OnStatusReason?: string;
      OnReason?: string;
      Action: string;
    }[];
  };
  ResourceRetentionPolicy?: {
    /** @default false */
    SkipDeregisterOnUpdate?: boolean;
  };
  Timeout?: {
    AttemptDurationSeconds?: number;
  };
  Type: string;
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
  EksProperties?: {
    PodProperties?: {
      ServiceAccountName?: string;
      HostNetwork?: boolean;
      DnsPolicy?: string;
      /** @uniqueItems false */
      InitContainers?: {
        Name?: string;
        Image: string;
        ImagePullPolicy?: string;
        /** @uniqueItems false */
        Command?: string[];
        /** @uniqueItems false */
        Args?: string[];
        /** @uniqueItems false */
        Env?: {
          Name: string;
          Value?: string;
        }[];
        Resources?: {
          Limits?: Record<string, string>;
          Requests?: Record<string, string>;
        };
        /** @uniqueItems false */
        VolumeMounts?: {
          Name?: string;
          MountPath?: string;
          SubPath?: string;
          ReadOnly?: boolean;
        }[];
        SecurityContext?: {
          RunAsUser?: number;
          RunAsGroup?: number;
          Privileged?: boolean;
          AllowPrivilegeEscalation?: boolean;
          ReadOnlyRootFilesystem?: boolean;
          RunAsNonRoot?: boolean;
        };
      }[];
      /** @uniqueItems false */
      Containers?: {
        Name?: string;
        Image: string;
        ImagePullPolicy?: string;
        /** @uniqueItems false */
        Command?: string[];
        /** @uniqueItems false */
        Args?: string[];
        /** @uniqueItems false */
        Env?: {
          Name: string;
          Value?: string;
        }[];
        Resources?: {
          Limits?: Record<string, string>;
          Requests?: Record<string, string>;
        };
        /** @uniqueItems false */
        VolumeMounts?: {
          Name?: string;
          MountPath?: string;
          SubPath?: string;
          ReadOnly?: boolean;
        }[];
        SecurityContext?: {
          RunAsUser?: number;
          RunAsGroup?: number;
          Privileged?: boolean;
          AllowPrivilegeEscalation?: boolean;
          ReadOnlyRootFilesystem?: boolean;
          RunAsNonRoot?: boolean;
        };
      }[];
      /** @uniqueItems false */
      Volumes?: {
        Name: string;
        HostPath?: {
          Path?: string;
        };
        EmptyDir?: {
          Medium?: string;
          SizeLimit?: string;
        };
        Secret?: {
          SecretName: string;
          Optional?: boolean;
        };
        PersistentVolumeClaim?: {
          ClaimName: string;
          ReadOnly?: boolean;
        };
      }[];
      /** @uniqueItems false */
      ImagePullSecrets?: {
        Name?: string;
      }[];
      Metadata?: {
        Labels?: Record<string, string>;
        Annotations?: Record<string, string>;
        Namespace?: string;
      };
      ShareProcessNamespace?: boolean;
    };
  };
  ConsumableResourceProperties?: {
    /** @uniqueItems true */
    ConsumableResourceList: {
      /**
       * The ARN of the consumable resource the job definition should consume.
       * @pattern arn:[a-z0-9-\.]{1,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[^/].{0,1023}
       */
      ConsumableResource: string;
      Quantity: number;
    }[];
  };
};


/** Resource schema for StateMachine */
export type AwsStepfunctionsStatemachine = {
  /**
   * @minLength 1
   * @maxLength 2048
   */
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 80
   */
  Name?: string;
  /**
   * @minLength 1
   * @maxLength 1048576
   */
  DefinitionString?: string;
  /**
   * @minLength 1
   * @maxLength 256
   */
  RoleArn: string;
  /**
   * @minLength 1
   * @maxLength 80
   */
  StateMachineName?: string;
  /** @enum ["STANDARD","EXPRESS"] */
  StateMachineType?: "STANDARD" | "EXPRESS";
  /**
   * @minLength 1
   * @maxLength 256
   */
  StateMachineRevisionId?: string;
  LoggingConfiguration?: {
    /** @enum ["ALL","ERROR","FATAL","OFF"] */
    Level?: "ALL" | "ERROR" | "FATAL" | "OFF";
    IncludeExecutionData?: boolean;
    /** @minItems 1 */
    Destinations?: {
      CloudWatchLogsLogGroup?: {
        /**
         * @minLength 1
         * @maxLength 256
         */
        LogGroupArn?: string;
      };
    }[];
  };
  TracingConfiguration?: {
    Enabled?: boolean;
  };
  EncryptionConfiguration?: {
    /**
     * @minLength 1
     * @maxLength 2048
     */
    KmsKeyId?: string;
    /**
     * @minimum 60
     * @maximum 900
     */
    KmsDataKeyReusePeriodSeconds?: number;
    /** @enum ["CUSTOMER_MANAGED_KMS_KEY","AWS_OWNED_KEY"] */
    Type: "CUSTOMER_MANAGED_KMS_KEY" | "AWS_OWNED_KEY";
  };
  DefinitionS3Location?: {
    Bucket: string;
    Key: string;
    Version?: string;
  };
  DefinitionSubstitutions?: Record<string, string | number | boolean>;
  Definition?: Record<string, unknown>;
  /** @uniqueItems false */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};


/** Resource type definition for AWS::Events::EventBus */
export type AwsEventsEventbus = {
  /**
   * If you are creating a partner event bus, this specifies the partner event source that the new event
   * bus will be matched with.
   */
  EventSourceName?: string;
  /** The name of the event bus. */
  Name: string;
  /**
   * Any tags assigned to the event bus.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /** The description of the event bus. */
  Description?: string;
  /** Kms Key Identifier used to encrypt events at rest in the event bus. */
  KmsKeyIdentifier?: string;
  /** A JSON string that describes the permission policy statement for the event bus. */
  Policy?: Record<string, unknown> | string;
  /** The Amazon Resource Name (ARN) for the event bus. */
  Arn?: string;
  /** Dead Letter Queue for the event bus. */
  DeadLetterConfig?: {
    Arn?: string;
  };
  /** The logging configuration settings for vended logs. */
  LogConfig?: {
    /**
     * Configures whether or not to include event detail, input transformer details, target properties,
     * and target input in the applicable log messages.
     * @enum ["FULL","NONE"]
     */
    IncludeDetail?: "FULL" | "NONE";
    /**
     * Configures the log level of the EventBus and determines which log messages are sent to Ingestion
     * Hub for delivery.
     * @enum ["INFO","ERROR","TRACE","OFF"]
     */
    Level?: "INFO" | "ERROR" | "TRACE" | "OFF";
  };
};


/** Resource Type definition for AWS::Events::Archive */
export type AwsEventsArchive = {
  /**
   * @minLength 1
   * @maxLength 48
   * @pattern [\.\-_A-Za-z0-9]+
   */
  ArchiveName?: string;
  SourceArn: string;
  Description?: string;
  EventPattern?: Record<string, unknown>;
  /** @pattern ^arn:aws([a-z]|\-)*:events:([a-z]|\d|\-)*:([0-9]{12})?:.+\/.+$ */
  Arn?: string;
  RetentionDays?: number;
  /**
   * @minLength 0
   * @maxLength 2048
   */
  KmsKeyIdentifier?: string;
};


/** Resource Type definition for AWS::ElastiCache::ParameterGroup */
export type AwsElasticacheParametergroup = {
  /** The description for this cache parameter group. */
  Description: string;
  /**
   * A comma-delimited list of parameter name/value pairs. For more information see
   * ModifyCacheParameterGroup in the Amazon ElastiCache API Reference Guide.
   */
  Properties?: Record<string, string>;
  /**
   * Tags are composed of a Key/Value pair. You can use tags to categorize and track each parameter
   * group. The tag value null is permitted.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /** The name of the Cache Parameter Group. */
  CacheParameterGroupName?: string;
  /** The name of the cache parameter group family that this cache parameter group is compatible with. */
  CacheParameterGroupFamily: string;
};


/** Resource Type definition for AWS::ElastiCache::SubnetGroup */
export type AwsElasticacheSubnetgroup = {
  /** The description for the cache subnet group. */
  Description: string;
  /**
   * The EC2 subnet IDs for the cache subnet group.
   * @uniqueItems false
   */
  SubnetIds: string[];
  /** The name for the cache subnet group. This value is stored as a lowercase string. */
  CacheSubnetGroupName?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};


/** Resource Type definition for AWS::ElastiCache::ReplicationGroup */
export type AwsElasticacheReplicationgroup = {
  /** @uniqueItems true */
  PreferredCacheClusterAZs?: string[];
  ReaderEndPointPort?: string;
  /** @uniqueItems true */
  NodeGroupConfiguration?: {
    Slots?: string;
    PrimaryAvailabilityZone?: string;
    /** @uniqueItems true */
    ReplicaAvailabilityZones?: string[];
    NodeGroupId?: string;
    ReplicaCount?: number;
  }[];
  /** @uniqueItems true */
  SnapshotArns?: string[];
  ConfigurationEndPointPort?: string;
  Port?: number;
  NumNodeGroups?: number;
  NotificationTopicArn?: string;
  AutomaticFailoverEnabled?: boolean;
  ReplicasPerNodeGroup?: number;
  TransitEncryptionEnabled?: boolean;
  Engine?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  PrimaryEndPointAddress?: string;
  GlobalReplicationGroupId?: string;
  ConfigurationEndPointAddress?: string;
  EngineVersion?: string;
  KmsKeyId?: string;
  PrimaryClusterId?: string;
  ReadEndPointPorts?: string;
  AutoMinorVersionUpgrade?: boolean;
  /** @uniqueItems true */
  SecurityGroupIds?: string[];
  SnapshotWindow?: string;
  TransitEncryptionMode?: string;
  SnapshotRetentionLimit?: number;
  /** @uniqueItems false */
  ReadEndPointAddressesList?: string[];
  SnapshottingClusterId?: string;
  IpDiscovery?: string;
  ReadEndPointAddresses?: string;
  PrimaryEndPointPort?: string;
  /** @uniqueItems true */
  CacheSecurityGroupNames?: string[];
  ClusterMode?: string;
  /** @uniqueItems false */
  ReadEndPointPortsList?: string[];
  SnapshotName?: string;
  ReplicationGroupDescription: string;
  ReaderEndPointAddress?: string;
  MultiAZEnabled?: boolean;
  NetworkType?: string;
  ReplicationGroupId?: string;
  NumCacheClusters?: number;
  CacheSubnetGroupName?: string;
  CacheParameterGroupName?: string;
  PreferredMaintenanceWindow?: string;
  AtRestEncryptionEnabled?: boolean;
  CacheNodeType?: string;
  /** @uniqueItems true */
  UserGroupIds?: string[];
  AuthToken?: string;
  DataTieringEnabled?: boolean;
  /** @uniqueItems true */
  LogDeliveryConfigurations?: {
    LogType: string;
    LogFormat: string;
    DestinationType: string;
    DestinationDetails: {
      CloudWatchLogsDetails?: {
        LogGroup: string;
      };
      KinesisFirehoseDetails?: {
        DeliveryStream: string;
      };
    };
  }[];
};


/**
 * Specifies a route in a route table. For more information, see
 * [Routes](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html#route-table-routes)
 * in the *Amazon VPC User Guide*.
 * You must specify either a destination CIDR block or prefix list ID. You must also specify exactly
 * one of the resources as the target.
 * If you create a route that references a transit gateway in the same template where you create the
 * transit gateway, you must declare a dependency on the transit gateway attachment. The route table
 * cannot use the transit gateway until it has successfully attached to the VPC. Add a [DependsOn
 * Attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-dependson.html)
 * in the ``AWS::EC2::Route`` resource to explicitly declare a dependency on the
 * ``AWS::EC2::TransitGatewayAttachment`` resource.
 */
export type AwsEc2Route = {
  /**
   * The ID of the carrier gateway.
   * You can only use this option when the VPC contains a subnet which is associated with a Wavelength
   * Zone.
   */
  CarrierGatewayId?: string;
  CidrBlock?: string;
  /** The Amazon Resource Name (ARN) of the core network. */
  CoreNetworkArn?: string;
  /**
   * The IPv4 CIDR address block used for the destination match. Routing decisions are based on the most
   * specific match. We modify the specified CIDR block to its canonical form; for example, if you
   * specify ``100.68.0.18/18``, we modify it to ``100.68.0.0/18``.
   */
  DestinationCidrBlock?: string;
  /**
   * The IPv6 CIDR block used for the destination match. Routing decisions are based on the most
   * specific match.
   */
  DestinationIpv6CidrBlock?: string;
  /** The ID of a prefix list used for the destination match. */
  DestinationPrefixListId?: string;
  /** [IPv6 traffic only] The ID of an egress-only internet gateway. */
  EgressOnlyInternetGatewayId?: string;
  /** The ID of an internet gateway or virtual private gateway attached to your VPC. */
  GatewayId?: string;
  /**
   * The ID of a NAT instance in your VPC. The operation fails if you specify an instance ID unless
   * exactly one network interface is attached.
   */
  InstanceId?: string;
  /** The ID of the local gateway. */
  LocalGatewayId?: string;
  /** [IPv4 traffic only] The ID of a NAT gateway. */
  NatGatewayId?: string;
  /** The ID of a network interface. */
  NetworkInterfaceId?: string;
  /** The ID of the route table for the route. */
  RouteTableId: string;
  /** The ID of a transit gateway. */
  TransitGatewayId?: string;
  /** The ID of a VPC endpoint. Supported for Gateway Load Balancer endpoints only. */
  VpcEndpointId?: string;
  /** The ID of a VPC peering connection. */
  VpcPeeringConnectionId?: string;
};


/** Definition of AWS::Cognito::UserPool Resource Type */
export type AwsCognitoUserpool = {
  /**
   * @minLength 1
   * @maxLength 128
   */
  UserPoolName?: string;
  Policies?: {
    PasswordPolicy?: {
      MinimumLength?: number;
      RequireLowercase?: boolean;
      RequireNumbers?: boolean;
      RequireSymbols?: boolean;
      RequireUppercase?: boolean;
      TemporaryPasswordValidityDays?: number;
      PasswordHistorySize?: number;
    };
    SignInPolicy?: {
      AllowedFirstAuthFactors?: string[];
    };
  };
  AccountRecoverySetting?: {
    RecoveryMechanisms?: {
      Name?: string;
      Priority?: number;
    }[];
  };
  AdminCreateUserConfig?: {
    AllowAdminCreateUserOnly?: boolean;
    InviteMessageTemplate?: {
      EmailMessage?: string;
      EmailSubject?: string;
      SMSMessage?: string;
    };
    UnusedAccountValidityDays?: number;
  };
  AliasAttributes?: string[];
  UsernameAttributes?: string[];
  AutoVerifiedAttributes?: string[];
  DeviceConfiguration?: {
    ChallengeRequiredOnNewDevice?: boolean;
    DeviceOnlyRememberedOnUserPrompt?: boolean;
  };
  EmailConfiguration?: {
    ReplyToEmailAddress?: string;
    SourceArn?: string;
    From?: string;
    ConfigurationSet?: string;
    EmailSendingAccount?: string;
  };
  /**
   * @minLength 6
   * @maxLength 20000
   */
  EmailVerificationMessage?: string;
  /**
   * @minLength 1
   * @maxLength 140
   */
  EmailVerificationSubject?: string;
  DeletionProtection?: string;
  LambdaConfig?: {
    CreateAuthChallenge?: string;
    CustomMessage?: string;
    DefineAuthChallenge?: string;
    PostAuthentication?: string;
    PostConfirmation?: string;
    PreAuthentication?: string;
    PreSignUp?: string;
    VerifyAuthChallengeResponse?: string;
    UserMigration?: string;
    PreTokenGeneration?: string;
    CustomEmailSender?: {
      LambdaVersion?: string;
      LambdaArn?: string;
    };
    CustomSMSSender?: {
      LambdaVersion?: string;
      LambdaArn?: string;
    };
    KMSKeyID?: string;
    PreTokenGenerationConfig?: {
      LambdaVersion?: string;
      LambdaArn?: string;
    };
  };
  MfaConfiguration?: string;
  EnabledMfas?: string[];
  /**
   * @minLength 6
   * @maxLength 140
   */
  SmsAuthenticationMessage?: string;
  /**
   * @minLength 6
   * @maxLength 20000
   */
  EmailAuthenticationMessage?: string;
  /**
   * @minLength 1
   * @maxLength 140
   */
  EmailAuthenticationSubject?: string;
  SmsConfiguration?: {
    ExternalId?: string;
    SnsCallerArn?: string;
    SnsRegion?: string;
  };
  /**
   * @minLength 6
   * @maxLength 140
   */
  SmsVerificationMessage?: string;
  /**
   * @minLength 1
   * @maxLength 63
   */
  WebAuthnRelyingPartyID?: string;
  /**
   * @minLength 1
   * @maxLength 9
   */
  WebAuthnUserVerification?: string;
  Schema?: {
    AttributeDataType?: string;
    DeveloperOnlyAttribute?: boolean;
    Mutable?: boolean;
    Name?: string;
    NumberAttributeConstraints?: {
      MaxValue?: string;
      MinValue?: string;
    };
    StringAttributeConstraints?: {
      MaxLength?: string;
      MinLength?: string;
    };
    Required?: boolean;
  }[];
  UsernameConfiguration?: {
    CaseSensitive?: boolean;
  };
  UserAttributeUpdateSettings?: {
    AttributesRequireVerificationBeforeUpdate: string[];
  };
  UserPoolTags?: Record<string, string>;
  VerificationMessageTemplate?: {
    DefaultEmailOption?: string;
    EmailMessage?: string;
    EmailMessageByLink?: string;
    EmailSubject?: string;
    EmailSubjectByLink?: string;
    SmsMessage?: string;
  };
  UserPoolAddOns?: {
    AdvancedSecurityMode?: string;
    AdvancedSecurityAdditionalFlows?: {
      CustomAuthMode?: string;
    };
  };
  ProviderName?: string;
  ProviderURL?: string;
  Arn?: string;
  UserPoolId?: string;
  /** @enum ["LITE","ESSENTIALS","PLUS"] */
  UserPoolTier?: "LITE" | "ESSENTIALS" | "PLUS";
};


/** Resource Type definition for AWS::Cognito::UserPoolClient */
export type AwsCognitoUserpoolclient = {
  /**
   * @minLength 1
   * @maxLength 128
   */
  ClientName?: string;
  ExplicitAuthFlows?: string[];
  GenerateSecret?: boolean;
  ReadAttributes?: string[];
  /**
   * @minimum 3
   * @maximum 15
   */
  AuthSessionValidity?: number;
  /**
   * @minimum 1
   * @maximum 315360000
   */
  RefreshTokenValidity?: number;
  /**
   * @minimum 1
   * @maximum 86400
   */
  AccessTokenValidity?: number;
  /**
   * @minimum 1
   * @maximum 86400
   */
  IdTokenValidity?: number;
  TokenValidityUnits?: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
  };
  RefreshTokenRotation?: {
    /** @enum ["ENABLED","DISABLED"] */
    Feature?: "ENABLED" | "DISABLED";
    /**
     * @minimum 0
     * @maximum 60
     */
    RetryGracePeriodSeconds?: number;
  };
  UserPoolId: string;
  WriteAttributes?: string[];
  AllowedOAuthFlows?: string[];
  AllowedOAuthFlowsUserPoolClient?: boolean;
  AllowedOAuthScopes?: string[];
  CallbackURLs?: string[];
  DefaultRedirectURI?: string;
  LogoutURLs?: string[];
  SupportedIdentityProviders?: string[];
  AnalyticsConfiguration?: {
    ApplicationArn?: string;
    ApplicationId?: string;
    ExternalId?: string;
    RoleArn?: string;
    UserDataShared?: boolean;
  };
  PreventUserExistenceErrors?: string;
  EnableTokenRevocation?: boolean;
  EnablePropagateAdditionalUserContextData?: boolean;
  Name?: string;
  ClientSecret?: string;
  ClientId?: string;
};


/** Resource Type definition for AWS::Cognito::UserPoolDomain */
export type AwsCognitoUserpooldomain = {
  UserPoolId: string;
  Domain: string;
  CustomDomainConfig?: {
    CertificateArn?: string;
  };
  CloudFrontDistribution?: string;
  ManagedLoginVersion?: number;
};


/** Resource Type definition for AWS::Cognito::UserPoolIdentityProvider */
export type AwsCognitoUserpoolidentityprovider = {
  UserPoolId: string;
  ProviderName: string;
  ProviderType: string;
  ProviderDetails: Record<string, string>;
  IdpIdentifiers?: string[];
  AttributeMapping?: Record<string, string>;
};


/** Resource Type definition for AWS::Cognito::UserPoolUICustomizationAttachment */
export type AwsCognitoUserpooluicustomizationattachment = {
  UserPoolId: string;
  ClientId: string;
  CSS?: string;
};


/** Associates WebACL to Application Load Balancer, CloudFront or API Gateway. */
export type AwsWafv2Webaclassociation = {
  ResourceArn: string;
  WebACLArn: string;
};


/** Specifies an Application Load Balancer, a Network Load Balancer, or a Gateway Load Balancer. */
export type AwsElasticloadbalancingv2Loadbalancer = {
  /**
   * The IP address type. Internal load balancers must use ``ipv4``.
   * [Application Load Balancers] The possible values are ``ipv4`` (IPv4 addresses), ``dualstack``
   * (IPv4 and IPv6 addresses), and ``dualstack-without-public-ipv4`` (public IPv6 addresses and private
   * IPv4 and IPv6 addresses).
   * Application Load Balancer authentication supports IPv4 addresses only when connecting to an
   * Identity Provider (IdP) or Amazon Cognito endpoint. Without a public IPv4 address the load balancer
   * can't complete the authentication process, resulting in HTTP 500 errors.
   * [Network Load Balancers and Gateway Load Balancers] The possible values are ``ipv4`` (IPv4
   * addresses) and ``dualstack`` (IPv4 and IPv6 addresses).
   */
  IpAddressType?: string;
  /**
   * [Network Load Balancers with UDP listeners] Indicates whether to use an IPv6 prefix from each
   * subnet for source NAT. The IP address type must be ``dualstack``. The default value is ``off``.
   */
  EnablePrefixForIpv6SourceNat?: string;
  /**
   * [Application Load Balancers and Network Load Balancers] The IDs of the security groups for the load
   * balancer.
   * @uniqueItems true
   */
  SecurityGroups?: string[];
  /**
   * The load balancer attributes. Attributes that you do not modify retain their current values.
   * @uniqueItems true
   */
  LoadBalancerAttributes?: {
    /** The value of the attribute. */
    Value?: string;
    /**
     * The name of the attribute.
     * The following attributes are supported by all load balancers:
     * +  ``deletion_protection.enabled`` - Indicates whether deletion protection is enabled. The value
     * is ``true`` or ``false``. The default is ``false``.
     * +  ``load_balancing.cross_zone.enabled`` - Indicates whether cross-zone load balancing is
     * enabled. The possible values are ``true`` and ``false``. The default for Network Load Balancers and
     * Gateway Load Balancers is ``false``. The default for Application Load Balancers is ``true``, and
     * can't be changed.
     * The following attributes are supported by both Application Load Balancers and Network Load
     * Balancers:
     * +  ``access_logs.s3.enabled`` - Indicates whether access logs are enabled. The value is ``true``
     * or ``false``. The default is ``false``.
     * +  ``access_logs.s3.bucket`` - The name of the S3 bucket for the access logs. This attribute is
     * required if access logs are enabled. The bucket must exist in the same region as the load balancer
     * and have a bucket policy that grants Elastic Load Balancing permissions to write to the bucket.
     * +  ``access_logs.s3.prefix`` - The prefix for the location in the S3 bucket for the access logs.
     * +  ``ipv6.deny_all_igw_traffic`` - Blocks internet gateway (IGW) access to the load balancer. It
     * is set to ``false`` for internet-facing load balancers and ``true`` for internal load balancers,
     * preventing unintended access to your internal load balancer through an internet gateway.
     * +  ``zonal_shift.config.enabled`` - Indicates whether zonal shift is enabled. The possible values
     * are ``true`` and ``false``. The default is ``false``.
     * The following attributes are supported by only Application Load Balancers:
     * +  ``idle_timeout.timeout_seconds`` - The idle timeout value, in seconds. The valid range is
     * 1-4000 seconds. The default is 60 seconds.
     * +  ``client_keep_alive.seconds`` - The client keep alive value, in seconds. The valid range is
     * 60-604800 seconds. The default is 3600 seconds.
     * +  ``connection_logs.s3.enabled`` - Indicates whether connection logs are enabled. The value is
     * ``true`` or ``false``. The default is ``false``.
     * +  ``connection_logs.s3.bucket`` - The name of the S3 bucket for the connection logs. This
     * attribute is required if connection logs are enabled. The bucket must exist in the same region as
     * the load balancer and have a bucket policy that grants Elastic Load Balancing permissions to write
     * to the bucket.
     * +  ``connection_logs.s3.prefix`` - The prefix for the location in the S3 bucket for the
     * connection logs.
     * +  ``routing.http.desync_mitigation_mode`` - Determines how the load balancer handles requests
     * that might pose a security risk to your application. The possible values are ``monitor``,
     * ``defensive``, and ``strictest``. The default is ``defensive``.
     * +  ``routing.http.drop_invalid_header_fields.enabled`` - Indicates whether HTTP headers with
     * invalid header fields are removed by the load balancer (``true``) or routed to targets (``false``).
     * The default is ``false``.
     * +  ``routing.http.preserve_host_header.enabled`` - Indicates whether the Application Load
     * Balancer should preserve the ``Host`` header in the HTTP request and send it to the target without
     * any change. The possible values are ``true`` and ``false``. The default is ``false``.
     * +  ``routing.http.x_amzn_tls_version_and_cipher_suite.enabled`` - Indicates whether the two
     * headers (``x-amzn-tls-version`` and ``x-amzn-tls-cipher-suite``), which contain information about
     * the negotiated TLS version and cipher suite, are added to the client request before sending it to
     * the target. The ``x-amzn-tls-version`` header has information about the TLS protocol version
     * negotiated with the client, and the ``x-amzn-tls-cipher-suite`` header has information about the
     * cipher suite negotiated with the client. Both headers are in OpenSSL format. The possible values
     * for the attribute are ``true`` and ``false``. The default is ``false``.
     * +  ``routing.http.xff_client_port.enabled`` - Indicates whether the ``X-Forwarded-For`` header
     * should preserve the source port that the client used to connect to the load balancer. The possible
     * values are ``true`` and ``false``. The default is ``false``.
     * +  ``routing.http.xff_header_processing.mode`` - Enables you to modify, preserve, or remove the
     * ``X-Forwarded-For`` header in the HTTP request before the Application Load Balancer sends the
     * request to the target. The possible values are ``append``, ``preserve``, and ``remove``. The
     * default is ``append``.
     * +  If the value is ``append``, the Application Load Balancer adds the client IP address (of the
     * last hop) to the ``X-Forwarded-For`` header in the HTTP request before it sends it to targets.
     * +  If the value is ``preserve`` the Application Load Balancer preserves the ``X-Forwarded-For``
     * header in the HTTP request, and sends it to targets without any change.
     * +  If the value is ``remove``, the Application Load Balancer removes the ``X-Forwarded-For``
     * header in the HTTP request before it sends it to targets.
     * +  ``routing.http2.enabled`` - Indicates whether clients can connect to the load balancer using
     * HTTP/2. If ``true``, clients can connect using HTTP/2 or HTTP/1.1. However, all client requests are
     * subject to the stricter HTTP/2 header validation rules. For example, message header names must
     * contain only alphanumeric characters and hyphens. If ``false``, clients must connect using
     * HTTP/1.1. The default is ``true``.
     * +  ``waf.fail_open.enabled`` - Indicates whether to allow a WAF-enabled load balancer to route
     * requests to targets if it is unable to forward the request to AWS WAF. The possible values are
     * ``true`` and ``false``. The default is ``false``.
     * The following attributes are supported by only Network Load Balancers:
     * +  ``dns_record.client_routing_policy`` - Indicates how traffic is distributed among the load
     * balancer Availability Zones. The possible values are ``availability_zone_affinity`` with 100
     * percent zonal affinity, ``partial_availability_zone_affinity`` with 85 percent zonal affinity, and
     * ``any_availability_zone`` with 0 percent zonal affinity.
     * +  ``secondary_ips.auto_assigned.per_subnet`` - The number of secondary IP addresses to configure
     * for your load balancer nodes. Use to address port allocation errors if you can't add targets. The
     * valid range is 0 to 7. The default is 0. After you set this value, you can't decrease it.
     */
    Key?: string;
  }[];
  /** The minimum capacity for a load balancer. */
  MinimumLoadBalancerCapacity?: {
    /** The number of capacity units. */
    CapacityUnits: number;
  };
  /**
   * Indicates whether to enable stabilization when creating or updating an LCU reservation. This
   * ensures that the final stack status reflects the status of the LCU reservation. The default is
   * ``false``.
   * @default false
   */
  EnableCapacityReservationProvisionStabilize?: boolean;
  /**
   * The nodes of an Internet-facing load balancer have public IP addresses. The DNS name of an
   * Internet-facing load balancer is publicly resolvable to the public IP addresses of the nodes.
   * Therefore, Internet-facing load balancers can route requests from clients over the internet.
   * The nodes of an internal load balancer have only private IP addresses. The DNS name of an internal
   * load balancer is publicly resolvable to the private IP addresses of the nodes. Therefore, internal
   * load balancers can route requests only from clients with access to the VPC for the load balancer.
   * The default is an Internet-facing load balancer.
   * You can't specify a scheme for a Gateway Load Balancer.
   */
  Scheme?: string;
  DNSName?: string;
  /**
   * The name of the load balancer. This name must be unique per region per account, can have a maximum
   * of 32 characters, must contain only alphanumeric characters or hyphens, must not begin or end with
   * a hyphen, and must not begin with "internal-".
   * If you don't specify a name, AWS CloudFormation generates a unique physical ID for the load
   * balancer. If you specify a name, you cannot perform updates that require replacement of this
   * resource, but you can perform other updates. To replace the resource, specify a new name.
   */
  Name?: string;
  LoadBalancerName?: string;
  LoadBalancerFullName?: string;
  /**
   * The IDs of the subnets. You can specify only one subnet per Availability Zone. You must specify
   * either subnets or subnet mappings, but not both. To specify an Elastic IP address, specify subnet
   * mappings instead of subnets.
   * [Application Load Balancers] You must specify subnets from at least two Availability Zones.
   * [Application Load Balancers on Outposts] You must specify one Outpost subnet.
   * [Application Load Balancers on Local Zones] You can specify subnets from one or more Local Zones.
   * [Network Load Balancers and Gateway Load Balancers] You can specify subnets from one or more
   * Availability Zones.
   * @uniqueItems true
   */
  Subnets?: string[];
  /** The type of load balancer. The default is ``application``. */
  Type?: string;
  CanonicalHostedZoneID?: string;
  /**
   * The tags to assign to the load balancer.
   * @uniqueItems false
   */
  Tags?: {
    /** The value of the tag. */
    Value?: string;
    /** The key of the tag. */
    Key: string;
  }[];
  LoadBalancerArn?: string;
  /**
   * The IDs of the subnets. You can specify only one subnet per Availability Zone. You must specify
   * either subnets or subnet mappings, but not both.
   * [Application Load Balancers] You must specify subnets from at least two Availability Zones. You
   * can't specify Elastic IP addresses for your subnets.
   * [Application Load Balancers on Outposts] You must specify one Outpost subnet.
   * [Application Load Balancers on Local Zones] You can specify subnets from one or more Local Zones.
   * [Network Load Balancers] You can specify subnets from one or more Availability Zones. You can
   * specify one Elastic IP address per subnet if you need static IP addresses for your internet-facing
   * load balancer. For internal load balancers, you can specify one private IP address per subnet from
   * the IPv4 range of the subnet. For internet-facing load balancer, you can specify one IPv6 address
   * per subnet.
   * [Gateway Load Balancers] You can specify subnets from one or more Availability Zones. You can't
   * specify Elastic IP addresses for your subnets.
   * @uniqueItems true
   */
  SubnetMappings?: {
    /** The ID of the subnet. */
    SubnetId: string;
    /**
     * [Network Load Balancers] The allocation ID of the Elastic IP address for an internet-facing load
     * balancer.
     */
    AllocationId?: string;
    /** [Network Load Balancers] The private IPv4 address for an internal load balancer. */
    PrivateIPv4Address?: string;
    /** [Network Load Balancers] The IPv6 address. */
    IPv6Address?: string;
    /**
     * [Network Load Balancers with UDP listeners] The IPv6 prefix to use for source NAT. Specify an IPv6
     * prefix (/80 netmask) from the subnet CIDR block or ``auto_assigned`` to use an IPv6 prefix selected
     * at random from the subnet CIDR block.
     */
    SourceNatIpv6Prefix?: string;
  }[];
  /**
   * Indicates whether to evaluate inbound security group rules for traffic sent to a Network Load
   * Balancer through privatelink. The default is ``on``.
   * You can't configure this property on a Network Load Balancer unless you associated a security
   * group with the load balancer when you created it.
   */
  EnforceSecurityGroupInboundRulesOnPrivateLinkTraffic?: string;
  /** The ID of the IPv4 IPAM pool. */
  Ipv4IpamPoolId?: string;
};


/**
 * Specifies a listener for an Application Load Balancer, Network Load Balancer, or Gateway Load
 * Balancer.
 */
export type AwsElasticloadbalancingv2Listener = {
  ListenerArn?: string;
  /** The mutual authentication configuration information. */
  MutualAuthentication?: {
    /** Indicates whether expired client certificates are ignored. */
    IgnoreClientCertificateExpiry?: boolean;
    /**
     * The client certificate handling method. Options are ``off``, ``passthrough`` or ``verify``. The
     * default value is ``off``.
     */
    Mode?: string;
    /** The Amazon Resource Name (ARN) of the trust store. */
    TrustStoreArn?: string;
    /** Indicates whether trust store CA certificate names are advertised. */
    AdvertiseTrustStoreCaNames?: string;
  };
  /**
   * The listener attributes. Attributes that you do not modify retain their current values.
   * @uniqueItems true
   */
  ListenerAttributes?: {
    /** The value of the attribute. */
    Value?: string;
    /**
     * The name of the attribute.
     * The following attribute is supported by Network Load Balancers, and Gateway Load Balancers.
     * +  ``tcp.idle_timeout.seconds`` - The tcp idle timeout value, in seconds. The valid range is
     * 60-6000 seconds. The default is 350 seconds.
     * The following attributes are only supported by Application Load Balancers.
     * +  ``routing.http.request.x_amzn_mtls_clientcert_serial_number.header_name`` - Enables you to
     * modify the header name of the *X-Amzn-Mtls-Clientcert-Serial-Number* HTTP request header.
     * +  ``routing.http.request.x_amzn_mtls_clientcert_issuer.header_name`` - Enables you to modify the
     * header name of the *X-Amzn-Mtls-Clientcert-Issuer* HTTP request header.
     * +  ``routing.http.request.x_amzn_mtls_clientcert_subject.header_name`` - Enables you to modify
     * the header name of the *X-Amzn-Mtls-Clientcert-Subject* HTTP request header.
     * +  ``routing.http.request.x_amzn_mtls_clientcert_validity.header_name`` - Enables you to modify
     * the header name of the *X-Amzn-Mtls-Clientcert-Validity* HTTP request header.
     * +  ``routing.http.request.x_amzn_mtls_clientcert_leaf.header_name`` - Enables you to modify the
     * header name of the *X-Amzn-Mtls-Clientcert-Leaf* HTTP request header.
     * +  ``routing.http.request.x_amzn_mtls_clientcert.header_name`` - Enables you to modify the header
     * name of the *X-Amzn-Mtls-Clientcert* HTTP request header.
     * +  ``routing.http.request.x_amzn_tls_version.header_name`` - Enables you to modify the header
     * name of the *X-Amzn-Tls-Version* HTTP request header.
     * +  ``routing.http.request.x_amzn_tls_cipher_suite.header_name`` - Enables you to modify the
     * header name of the *X-Amzn-Tls-Cipher-Suite* HTTP request header.
     * +  ``routing.http.response.server.enabled`` - Enables you to allow or remove the HTTP response
     * server header.
     * +  ``routing.http.response.strict_transport_security.header_value`` - Informs browsers that the
     * site should only be accessed using HTTPS, and that any future attempts to access it using HTTP
     * should automatically be converted to HTTPS.
     * +  ``routing.http.response.access_control_allow_origin.header_value`` - Specifies which origins
     * are allowed to access the server.
     * +  ``routing.http.response.access_control_allow_methods.header_value`` - Returns which HTTP
     * methods are allowed when accessing the server from a different origin.
     * +  ``routing.http.response.access_control_allow_headers.header_value`` - Specifies which headers
     * can be used during the request.
     * +  ``routing.http.response.access_control_allow_credentials.header_value`` - Indicates whether
     * the browser should include credentials such as cookies or authentication when making requests.
     * +  ``routing.http.response.access_control_expose_headers.header_value`` - Returns which headers
     * the browser can expose to the requesting client.
     * +  ``routing.http.response.access_control_max_age.header_value`` - Specifies how long the results
     * of a preflight request can be cached, in seconds.
     * +  ``routing.http.response.content_security_policy.header_value`` - Specifies restrictions
     * enforced by the browser to help minimize the risk of certain types of security threats.
     * +  ``routing.http.response.x_content_type_options.header_value`` - Indicates whether the MIME
     * types advertised in the *Content-Type* headers should be followed and not be changed.
     * +  ``routing.http.response.x_frame_options.header_value`` - Indicates whether the browser is
     * allowed to render a page in a *frame*, *iframe*, *embed* or *object*.
     */
    Key?: string;
  }[];
  /** [TLS listener] The name of the Application-Layer Protocol Negotiation (ALPN) policy. */
  AlpnPolicy?: string[];
  /**
   * [HTTPS and TLS listeners] The security policy that defines which protocols and ciphers are
   * supported. For more information, see [Security
   * policies](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html)
   * in the *Application Load Balancers Guide* and [Security
   * policies](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/describe-ssl-policies.html)
   * in the *Network Load Balancers Guide*.
   * [HTTPS listeners] Updating the security policy can result in interruptions if the load balancer is
   * handling a high volume of traffic. To decrease the possibility of an interruption if your load
   * balancer is handling a high volume of traffic, create an additional load balancer or request an LCU
   * reservation.
   */
  SslPolicy?: string;
  /** The Amazon Resource Name (ARN) of the load balancer. */
  LoadBalancerArn: string;
  /**
   * The actions for the default rule. You cannot define a condition for a default rule.
   * To create additional rules for an Application Load Balancer, use
   * [AWS::ElasticLoadBalancingV2::ListenerRule](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-listenerrule.html).
   * @uniqueItems true
   */
  DefaultActions: ({
    /**
     * The order for the action. This value is required for rules with multiple actions. The action with
     * the lowest value for order is performed first.
     */
    Order?: number;
    /**
     * The Amazon Resource Name (ARN) of the target group. Specify only when ``Type`` is ``forward`` and
     * you want to route to a single target group. To route to multiple target groups, you must use
     * ``ForwardConfig`` instead.
     */
    TargetGroupArn?: string;
    /**
     * [Application Load Balancer] Information for creating an action that returns a custom HTTP response.
     * Specify only when ``Type`` is ``fixed-response``.
     */
    FixedResponseConfig?: {
      /**
       * The content type.
       * Valid Values: text/plain | text/css | text/html | application/javascript | application/json
       */
      ContentType?: string;
      /** The HTTP response code (2XX, 4XX, or 5XX). */
      StatusCode: string;
      /** The message. */
      MessageBody?: string;
    };
    /**
     * [HTTPS listeners] Information for using Amazon Cognito to authenticate users. Specify only when
     * ``Type`` is ``authenticate-cognito``.
     */
    AuthenticateCognitoConfig?: {
      /**
       * The behavior if the user is not authenticated. The following are possible values:
       * +  deny```` - Return an HTTP 401 Unauthorized error.
       * +  allow```` - Allow the request to be forwarded to the target.
       * +  authenticate```` - Redirect the request to the IdP authorization endpoint. This is the default
       * value.
       */
      OnUnauthenticatedRequest?: string;
      /** The ID of the Amazon Cognito user pool client. */
      UserPoolClientId: unknown | unknown;
      /** The domain prefix or fully-qualified domain name of the Amazon Cognito user pool. */
      UserPoolDomain: string;
      /**
       * The maximum duration of the authentication session, in seconds. The default is 604800 seconds (7
       * days).
       */
      SessionTimeout?: string;
      /**
       * The set of user claims to be requested from the IdP. The default is ``openid``.
       * To verify which scope values your IdP supports and how to separate multiple values, see the
       * documentation for your IdP.
       */
      Scope?: string;
      /**
       * The name of the cookie used to maintain session information. The default is
       * AWSELBAuthSessionCookie.
       */
      SessionCookieName?: string;
      /** The Amazon Resource Name (ARN) of the Amazon Cognito user pool. */
      UserPoolArn: string;
      /** The query parameters (up to 10) to include in the redirect request to the authorization endpoint. */
      AuthenticationRequestExtraParams?: Record<string, string>;
    };
    /** The type of action. */
    Type: string;
    /**
     * [Application Load Balancer] Information for creating a redirect action. Specify only when ``Type``
     * is ``redirect``.
     */
    RedirectConfig?: {
      /**
       * The absolute path, starting with the leading "/". This component is not percent-encoded. The path
       * can contain #{host}, #{path}, and #{port}.
       */
      Path?: string;
      /**
       * The query parameters, URL-encoded when necessary, but not percent-encoded. Do not include the
       * leading "?", as it is automatically added. You can specify any of the reserved keywords.
       */
      Query?: string;
      /** The port. You can specify a value from 1 to 65535 or #{port}. */
      Port?: string;
      /** The hostname. This component is not percent-encoded. The hostname can contain #{host}. */
      Host?: string;
      /**
       * The protocol. You can specify HTTP, HTTPS, or #{protocol}. You can redirect HTTP to HTTP, HTTP to
       * HTTPS, and HTTPS to HTTPS. You can't redirect HTTPS to HTTP.
       */
      Protocol?: string;
      /** The HTTP redirect code. The redirect is either permanent (HTTP 301) or temporary (HTTP 302). */
      StatusCode: string;
    };
    JwtValidationConfig?: {
      JwksEndpoint: string;
      Issuer: string;
      /** @uniqueItems true */
      AdditionalClaims?: {
        Format: string;
        /** @uniqueItems true */
        Values: string[];
        Name: string;
      }[];
    };
    /**
     * Information for creating an action that distributes requests among multiple target groups. Specify
     * only when ``Type`` is ``forward``.
     * If you specify both ``ForwardConfig`` and ``TargetGroupArn``, you can specify only one target
     * group using ``ForwardConfig`` and it must be the same target group specified in ``TargetGroupArn``.
     */
    ForwardConfig?: {
      /** Information about the target group stickiness for a rule. */
      TargetGroupStickinessConfig?: {
        /** Indicates whether target group stickiness is enabled. */
        Enabled?: boolean;
        /**
         * [Application Load Balancers] The time period, in seconds, during which requests from a client
         * should be routed to the same target group. The range is 1-604800 seconds (7 days). You must specify
         * this value when enabling target group stickiness.
         */
        DurationSeconds?: number;
      };
      /**
       * Information about how traffic will be distributed between multiple target groups in a forward rule.
       * @uniqueItems true
       */
      TargetGroups?: {
        /** The Amazon Resource Name (ARN) of the target group. */
        TargetGroupArn?: string;
        /** The weight. The range is 0 to 999. */
        Weight?: number;
      }[];
    };
    /**
     * [HTTPS listeners] Information about an identity provider that is compliant with OpenID Connect
     * (OIDC). Specify only when ``Type`` is ``authenticate-oidc``.
     */
    AuthenticateOidcConfig?: unknown | unknown;
  })[];
  /**
   * The port on which the load balancer is listening. You can't specify a port for a Gateway Load
   * Balancer.
   */
  Port?: number;
  /**
   * The default SSL server certificate for a secure listener. You must provide exactly one certificate
   * if the listener protocol is HTTPS or TLS.
   * For an HTTPS listener, update requires some interruptions. For a TLS listener, update requires no
   * interruption.
   * To create a certificate list for a secure listener, use
   * [AWS::ElasticLoadBalancingV2::ListenerCertificate](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-elasticloadbalancingv2-listenercertificate.html).
   * @uniqueItems true
   */
  Certificates?: ({
    /** The Amazon Resource Name (ARN) of the certificate. */
    CertificateArn?: unknown | unknown;
  })[];
  /**
   * The protocol for connections from clients to the load balancer. For Application Load Balancers, the
   * supported protocols are HTTP and HTTPS. For Network Load Balancers, the supported protocols are
   * TCP, TLS, UDP, and TCP_UDP. You can’t specify the UDP or TCP_UDP protocol if dual-stack mode is
   * enabled. You can't specify a protocol for a Gateway Load Balancer.
   */
  Protocol?: string;
};


/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsOpensearchserviceDomain = {
  ClusterConfig?: {
    InstanceCount?: number;
    WarmEnabled?: boolean;
    WarmCount?: number;
    DedicatedMasterEnabled?: boolean;
    ZoneAwarenessConfig?: {
      AvailabilityZoneCount?: number;
    };
    DedicatedMasterCount?: number;
    InstanceType?: string;
    WarmType?: string;
    ZoneAwarenessEnabled?: boolean;
    DedicatedMasterType?: string;
    MultiAZWithStandbyEnabled?: boolean;
    ColdStorageOptions?: {
      Enabled?: boolean;
    };
    NodeOptions?: {
      /** @enum ["coordinator"] */
      NodeType?: "coordinator";
      NodeConfig?: {
        Enabled?: boolean;
        Type?: string;
        Count?: number;
      };
    }[];
  };
  DomainName?: string;
  AccessPolicies?: Record<string, unknown>;
  IPAddressType?: string;
  EngineVersion?: string;
  AdvancedOptions?: Record<string, string>;
  LogPublishingOptions?: Record<string, {
    CloudWatchLogsLogGroupArn?: string;
    Enabled?: boolean;
  }>;
  SnapshotOptions?: {
    AutomatedSnapshotStartHour?: number;
  };
  VPCOptions?: {
    /** @uniqueItems true */
    SecurityGroupIds?: string[];
    /** @uniqueItems true */
    SubnetIds?: string[];
  };
  NodeToNodeEncryptionOptions?: {
    Enabled?: boolean;
  };
  DomainEndpointOptions?: {
    CustomEndpointCertificateArn?: string;
    CustomEndpointEnabled?: boolean;
    EnforceHTTPS?: boolean;
    CustomEndpoint?: string;
    TLSSecurityPolicy?: string;
  };
  CognitoOptions?: {
    Enabled?: boolean;
    IdentityPoolId?: string;
    UserPoolId?: string;
    RoleArn?: string;
  };
  AdvancedSecurityOptions?: {
    Enabled?: boolean;
    MasterUserOptions?: {
      MasterUserPassword?: string;
      MasterUserName?: string;
      MasterUserARN?: string;
    };
    InternalUserDatabaseEnabled?: boolean;
    AnonymousAuthEnabled?: boolean;
    SAMLOptions?: {
      Enabled?: boolean;
      Idp?: {
        /**
         * @minLength 1
         * @maxLength 1048576
         */
        MetadataContent: string;
        EntityId: string;
      };
      MasterUserName?: string;
      MasterBackendRole?: string;
      SubjectKey?: string;
      RolesKey?: string;
      SessionTimeoutMinutes?: number;
    };
    JWTOptions?: {
      Enabled?: boolean;
      PublicKey?: string;
      SubjectKey?: string;
      RolesKey?: string;
    };
    IAMFederationOptions?: {
      Enabled?: boolean;
      RolesKey?: string;
      SubjectKey?: string;
    };
    AnonymousAuthDisableDate?: string;
  };
  DomainEndpoint?: string;
  DomainEndpointV2?: string;
  DomainEndpoints?: Record<string, string>;
  EBSOptions?: {
    EBSEnabled?: boolean;
    VolumeType?: string;
    Iops?: number;
    VolumeSize?: number;
    Throughput?: number;
  };
  Id?: string;
  Arn?: string;
  DomainArn?: string;
  EncryptionAtRestOptions?: {
    KmsKeyId?: string;
    Enabled?: boolean;
  };
  /**
   * An arbitrary set of tags (key-value pairs) for this Domain.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key of the tag.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
    /**
     * The value of the tag.
     * @minLength 0
     * @maxLength 128
     */
    Key: string;
  }[];
  ServiceSoftwareOptions?: {
    CurrentVersion?: string;
    NewVersion?: string;
    UpdateAvailable?: boolean;
    Cancellable?: boolean;
    UpdateStatus?: string;
    Description?: string;
    AutomatedUpdateDate?: string;
    OptionalDeployment?: boolean;
  };
  OffPeakWindowOptions?: {
    Enabled?: boolean;
    OffPeakWindow?: {
      WindowStartTime?: {
        /**
         * @minimum 0
         * @maximum 23
         */
        Hours: number;
        /**
         * @minimum 0
         * @maximum 59
         */
        Minutes: number;
      };
    };
  };
  SoftwareUpdateOptions?: {
    AutoSoftwareUpdateEnabled?: boolean;
  };
  SkipShardMigrationWait?: boolean;
  IdentityCenterOptions?: {
    /** Whether Identity Center is enabled. */
    EnabledAPIAccess?: boolean;
    /** The ARN of the Identity Center instance. */
    IdentityCenterInstanceARN?: string;
    /** The subject key for Identity Center options. */
    SubjectKey?: "UserName" | "UserId" | "Email";
    /** The roles key for Identity Center options. */
    RolesKey?: "GroupName" | "GroupId";
    /** The ARN of the Identity Center application. */
    IdentityCenterApplicationARN?: string;
    /** The IdentityStoreId for Identity Center options. */
    IdentityStoreId?: string;
  };
  AIMLOptions?: {
    S3VectorsEngine?: {
      /** Whether to enable S3 vectors engine. */
      Enabled: boolean;
    };
  };
};


/**
 * The ``AWS::EFS::FileSystem`` resource creates a new, empty file system in EFSlong (EFS). You must
 * create a mount target
 * ([AWS::EFS::MountTarget](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-efs-mounttarget.html))
 * to mount your EFS file system on an EC2 or other AWS cloud compute resource.
 */
export type AwsEfsFilesystem = {
  FileSystemId?: string;
  Arn?: string;
  /**
   * A Boolean value that, if true, creates an encrypted file system. When creating an encrypted file
   * system, you have the option of specifying a KmsKeyId for an existing kms-key-long. If you don't
   * specify a kms-key, then the default kms-key for EFS, ``/aws/elasticfilesystem``, is used to protect
   * the encrypted file system.
   */
  Encrypted?: boolean;
  /**
   * Use to create one or more tags associated with the file system. Each tag is a user-defined
   * key-value pair. Name your file system on creation by including a ``"Key":"Name","Value":"{value}"``
   * key-value pair. Each key must be unique. For more information, see [Tagging
   * resources](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html) in the *General
   * Reference Guide*.
   * @uniqueItems true
   */
  FileSystemTags?: {
    /** The tag key (String). The key can't start with ``aws:``. */
    Key: string;
    /** The value of the tag key. */
    Value: string;
  }[];
  /**
   * The ID of the kms-key-long to be used to protect the encrypted file system. This parameter is only
   * required if you want to use a nondefault kms-key. If this parameter is not specified, the default
   * kms-key for EFS is used. This ID can be in one of the following formats:
   * +  Key ID - A unique identifier of the key, for example ``1234abcd-12ab-34cd-56ef-1234567890ab``.
   * +  ARN - An Amazon Resource Name (ARN) for the key, for example
   * ``arn:aws:kms:us-west-2:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab``.
   * +  Key alias - A previously created display name for a key, for example ``alias/projectKey1``.
   * +  Key alias ARN - An ARN for a key alias, for example
   * ``arn:aws:kms:us-west-2:444455556666:alias/projectKey1``.
   * If ``KmsKeyId`` is specified, the ``Encrypted`` parameter must be set to true.
   */
  KmsKeyId?: string;
  /**
   * An array of ``LifecyclePolicy`` objects that define the file system's ``LifecycleConfiguration``
   * object. A ``LifecycleConfiguration`` object informs Lifecycle management of the following:
   * +  When to move files in the file system from primary storage to IA storage.
   * +  When to move files in the file system from primary storage or IA storage to Archive storage.
   * +  When to move files that are in IA or Archive storage to primary storage.
   * EFS requires that each ``LifecyclePolicy`` object have only a single transition. This means that
   * in a request body, ``LifecyclePolicies`` needs to be structured as an array of ``LifecyclePolicy``
   * objects, one object for each transition, ``TransitionToIA``,
   * ``TransitionToArchive````TransitionToPrimaryStorageClass``. See the example requests in the
   * following section for more information.
   * @uniqueItems true
   */
  LifecyclePolicies?: {
    /**
     * The number of days after files were last accessed in primary storage (the Standard storage class)
     * at which to move them to Infrequent Access (IA) storage. Metadata operations such as listing the
     * contents of a directory don't count as file access events.
     */
    TransitionToIA?: string;
    /**
     * Whether to move files back to primary (Standard) storage after they are accessed in IA or Archive
     * storage. Metadata operations such as listing the contents of a directory don't count as file access
     * events.
     */
    TransitionToPrimaryStorageClass?: string;
    /**
     * The number of days after files were last accessed in primary storage (the Standard storage class)
     * at which to move them to Archive storage. Metadata operations such as listing the contents of a
     * directory don't count as file access events.
     */
    TransitionToArchive?: string;
  }[];
  /** Describes the protection on the file system. */
  FileSystemProtection?: {
    /**
     * The status of the file system's replication overwrite protection.
     * +  ``ENABLED`` – The file system cannot be used as the destination file system in a replication
     * configuration. The file system is writeable. Replication overwrite protection is ``ENABLED`` by
     * default.
     * +  ``DISABLED`` – The file system can be used as the destination file system in a replication
     * configuration. The file system is read-only and can only be modified by EFS replication.
     * +  ``REPLICATING`` – The file system is being used as the destination file system in a
     * replication configuration. The file system is read-only and is modified only by EFS replication.
     * If the replication configuration is deleted, the file system's replication overwrite protection is
     * re-enabled, the file system becomes writeable.
     * @enum ["DISABLED","ENABLED"]
     */
    ReplicationOverwriteProtection?: "DISABLED" | "ENABLED";
  };
  /**
   * The performance mode of the file system. We recommend ``generalPurpose`` performance mode for all
   * file systems. File systems using the ``maxIO`` performance mode can scale to higher levels of
   * aggregate throughput and operations per second with a tradeoff of slightly higher latencies for
   * most file operations. The performance mode can't be changed after the file system has been created.
   * The ``maxIO`` mode is not supported on One Zone file systems.
   * Due to the higher per-operation latencies with Max I/O, we recommend using General Purpose
   * performance mode for all file systems.
   * Default is ``generalPurpose``.
   */
  PerformanceMode?: string;
  /**
   * The throughput, measured in mebibytes per second (MiBps), that you want to provision for a file
   * system that you're creating. Required if ``ThroughputMode`` is set to ``provisioned``. Valid values
   * are 1-3414 MiBps, with the upper limit depending on Region. To increase this limit, contact SUP.
   * For more information, see [Amazon EFS quotas that you can
   * increase](https://docs.aws.amazon.com/efs/latest/ug/limits.html#soft-limits) in the *Amazon EFS
   * User Guide*.
   */
  ProvisionedThroughputInMibps?: number;
  /**
   * Specifies the throughput mode for the file system. The mode can be ``bursting``, ``provisioned``,
   * or ``elastic``. If you set ``ThroughputMode`` to ``provisioned``, you must also set a value for
   * ``ProvisionedThroughputInMibps``. After you create the file system, you can decrease your file
   * system's Provisioned throughput or change between the throughput modes, with certain time
   * restrictions. For more information, see [Specifying throughput with provisioned
   * mode](https://docs.aws.amazon.com/efs/latest/ug/performance.html#provisioned-throughput) in the
   * *Amazon EFS User Guide*.
   * Default is ``bursting``.
   */
  ThroughputMode?: string;
  /**
   * The ``FileSystemPolicy`` for the EFS file system. A file system policy is an IAM resource policy
   * used to control NFS access to an EFS file system. For more information, see [Using to control NFS
   * access to Amazon EFS](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html) in
   * the *Amazon EFS User Guide*.
   */
  FileSystemPolicy?: Record<string, unknown>;
  /**
   * (Optional) A boolean that specifies whether or not to bypass the ``FileSystemPolicy`` lockout
   * safety check. The lockout safety check determines whether the policy in the request will lock out,
   * or prevent, the IAM principal that is making the request from making future ``PutFileSystemPolicy``
   * requests on this file system. Set ``BypassPolicyLockoutSafetyCheck`` to ``True`` only when you
   * intend to prevent the IAM principal that is making the request from making subsequent
   * ``PutFileSystemPolicy`` requests on this file system. The default value is ``False``.
   */
  BypassPolicyLockoutSafetyCheck?: boolean;
  /** Use the ``BackupPolicy`` to turn automatic backups on or off for the file system. */
  BackupPolicy?: {
    /**
     * Set the backup policy status for the file system.
     * +  *ENABLED* - Turns automatic backups on for the file system.
     * +  *DISABLED* - Turns automatic backups off for the file system.
     * @enum ["DISABLED","ENABLED"]
     */
    Status: "DISABLED" | "ENABLED";
  };
  /**
   * For One Zone file systems, specify the AWS Availability Zone in which to create the file system.
   * Use the format ``us-east-1a`` to specify the Availability Zone. For more information about One Zone
   * file systems, see [EFS file system
   * types](https://docs.aws.amazon.com/efs/latest/ug/availability-durability.html#file-system-type) in
   * the *Amazon EFS User Guide*.
   * One Zone file systems are not available in all Availability Zones in AWS-Regions where Amazon EFS
   * is available.
   */
  AvailabilityZoneName?: string;
  /** Describes the replication configuration for a specific file system. */
  ReplicationConfiguration?: {
    /**
     * An array of destination objects. Only one destination object is supported.
     * @minItems 1
     * @maxItems 1
     * @uniqueItems true
     */
    Destinations?: {
      /**
       * Describes the status of the replication configuration. For more information about replication
       * status, see [Viewing replication
       * details](https://docs.aws.amazon.com//efs/latest/ug/awsbackup.html#restoring-backup-efsmonitoring-replication-status.html)
       * in the *Amazon EFS User Guide*.
       */
      Status?: string;
      /**
       * Message that provides details about the ``PAUSED`` or ``ERRROR`` state of the replication
       * destination configuration. For more information about replication status messages, see [Viewing
       * replication
       * details](https://docs.aws.amazon.com//efs/latest/ug/awsbackup.html#restoring-backup-efsmonitoring-replication-status.html)
       * in the *Amazon EFS User Guide*.
       */
      StatusMessage?: string;
      /**
       * The ID of the destination Amazon EFS file system.
       * @pattern ^(arn:aws[-a-z]*:elasticfilesystem:[0-9a-z-:]+:file-system/fs-[0-9a-f]{8,40}|fs-[0-9a-f]{8,40})$
       */
      FileSystemId?: string;
      /**
       * The AWS-Region in which the destination file system is located.
       * For One Zone file systems, the replication configuration must specify the AWS-Region in which the
       * destination file system is located.
       */
      Region?: string;
      /** The Amazon Resource Name (ARN) of the current source file system in the replication configuration. */
      RoleArn?: string;
      /**
       * For One Zone file systems, the replication configuration must specify the Availability Zone in
       * which the destination file system is located.
       * Use the format ``us-east-1a`` to specify the Availability Zone. For more information about One
       * Zone file systems, see [EFS file system
       * types](https://docs.aws.amazon.com/efs/latest/ug/storage-classes.html) in the *Amazon EFS User
       * Guide*.
       * One Zone file system type is not available in all Availability Zones in AWS-Regions where Amazon
       * EFS is available.
       */
      AvailabilityZoneName?: string;
      /** The ID of an kms-key-long used to protect the encrypted file system. */
      KmsKeyId?: string;
    }[];
  };
};


/**
 * The ``AWS::EFS::MountTarget`` resource is an Amazon EFS resource that creates a mount target for an
 * EFS file system. You can then mount the file system on Amazon EC2 instances or other resources by
 * using the mount target.
 */
export type AwsEfsMounttarget = {
  Id?: string;
  /**
   * If the ``IpAddressType`` for the mount target is IPv4 ( ``IPV4_ONLY`` or ``DUAL_STACK``), then
   * specify the IPv4 address to use. If you do not specify an ``IpAddress``, then Amazon EFS selects an
   * unused IP address from the subnet specified for ``SubnetId``.
   */
  IpAddress?: string;
  /**
   * If the ``IPAddressType`` for the mount target is IPv6 (``IPV6_ONLY`` or ``DUAL_STACK``), then
   * specify the IPv6 address to use. If you do not specify an ``Ipv6Address``, then Amazon EFS selects
   * an unused IP address from the subnet specified for ``SubnetId``.
   */
  Ipv6Address?: string;
  /**
   * The IP address type for the mount target. The possible values are ``IPV4_ONLY`` (only IPv4
   * addresses), ``IPV6_ONLY`` (only IPv6 addresses), and ``DUAL_STACK`` (dual-stack, both IPv4 and IPv6
   * addresses). If you don’t specify an ``IpAddressType``, then ``IPV4_ONLY`` is used.
   * The ``IPAddressType`` must match the IP type of the subnet. Additionally, the ``IPAddressType``
   * parameter overrides the value set as the default IP address for the subnet in the VPC. For example,
   * if the ``IPAddressType`` is ``IPV4_ONLY`` and ``AssignIpv6AddressOnCreation`` is ``true``, then
   * IPv4 is used for the mount target. For more information, see [Modify the IP addressing attributes
   * of your subnet](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-public-ip.html).
   * @enum ["IPV4_ONLY","IPV6_ONLY","DUAL_STACK"]
   */
  IpAddressType?: "IPV4_ONLY" | "IPV6_ONLY" | "DUAL_STACK";
  /** The ID of the file system for which to create the mount target. */
  FileSystemId: string;
  /**
   * VPC security group IDs, of the form ``sg-xxxxxxxx``. These must be for the same VPC as the subnet
   * specified. The maximum number of security groups depends on account quota. For more information,
   * see [Amazon VPC Quotas](https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html) in
   * the *Amazon VPC User Guide* (see the *Security Groups* table). If you don't specify a security
   * group, then Amazon EFS uses the default security group for the subnet's VPC.
   * @uniqueItems true
   */
  SecurityGroups: string[];
  /**
   * The ID of the subnet to add the mount target in. For One Zone file systems, use the subnet that is
   * associated with the file system's Availability Zone. The subnet type must be the same type as the
   * ``IpAddressType``.
   */
  SubnetId: string;
};


/**
 * Creates a CF function.
 * To create a function, you provide the function code and some configuration information about the
 * function. The response contains an Amazon Resource Name (ARN) that uniquely identifies the
 * function, and the function’s stage.
 * By default, when you create a function, it’s in the ``DEVELOPMENT`` stage. In this stage, you can
 * [test the
 * function](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/test-function.html) in
 * the CF console (or with ``TestFunction`` in the CF API).
 * When you’re ready to use your function with a CF distribution, publish the function to the
 * ``LIVE`` stage. You can do this in the CF console, with ``PublishFunction`` in the CF API, or by
 * updating the ``AWS::CloudFront::Function`` resource with the ``AutoPublish`` property set to
 * ``true``. When the function is published to the ``LIVE`` stage, you can attach it to a
 * distribution’s cache behavior, using the function’s ARN.
 * To automatically publish the function to the ``LIVE`` stage when it’s created, set the
 * ``AutoPublish`` property to ``true``.
 */
export type AwsCloudfrontFunction = {
  /**
   * A flag that determines whether to automatically publish the function to the ``LIVE`` stage when
   * it’s created. To automatically publish to the ``LIVE`` stage, set this property to ``true``.
   */
  AutoPublish?: boolean;
  FunctionARN?: string;
  /**
   * The function code. For more information about writing a CloudFront function, see [Writing function
   * code for CloudFront
   * Functions](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/writing-function-code.html)
   * in the *Amazon CloudFront Developer Guide*.
   */
  FunctionCode: string;
  /** Contains configuration information about a CloudFront function. */
  FunctionConfig: {
    /** A comment to describe the function. */
    Comment: string;
    /** The function's runtime environment version. */
    Runtime: string;
    /**
     * The configuration for the key value store associations.
     * @uniqueItems true
     */
    KeyValueStoreAssociations?: {
      /** The Amazon Resource Name (ARN) of the key value store association. */
      KeyValueStoreARN: string;
    }[];
  };
  /** Contains metadata about a CloudFront function. */
  FunctionMetadata?: {
    /** The Amazon Resource Name (ARN) of the function. The ARN uniquely identifies the function. */
    FunctionARN?: string;
  };
  /** A name to identify the function. */
  Name: string;
  Stage?: string;
};


/**
 * The ``AWS::SQS::Queue`` resource creates an SQS standard or FIFO queue.
 * Keep the following caveats in mind:
 * +  If you don't specify the ``FifoQueue`` property, SQS creates a standard queue.
 * You can't change the queue type after you create it and you can't convert an existing standard
 * queue into a FIFO queue. You must either create a new FIFO queue for your application or delete
 * your existing standard queue and recreate it as a FIFO queue. For more information, see [Moving
 * from a standard queue to a FIFO
 * queue](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-moving.html)
 * in the *Developer Guide*.
 * +  If you don't provide a value for a property, the queue is created with the default value for
 * the property.
 * +  If you delete a queue, you must wait at least 60 seconds before creating a queue with the same
 * name.
 * +  To successfully create a new queue, you must provide a queue name that adheres to the [limits
 * related to
 * queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/limits-queues.html)
 * and is unique within the scope of your queues.
 * For more information about creating FIFO (first-in-first-out) queues, see [Creating an queue
 * ()](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/create-queue-cloudformation.html)
 * in the *Developer Guide*.
 */
export type AwsSqsQueue = {
  QueueUrl?: string;
  Arn?: string;
  /**
   * For first-in-first-out (FIFO) queues, specifies whether to enable content-based deduplication.
   * During the deduplication interval, SQS treats messages that are sent with identical content as
   * duplicates and delivers only one copy of the message. For more information, see the
   * ``ContentBasedDeduplication`` attribute for the ``CreateQueue`` action in the *API Reference*.
   */
  ContentBasedDeduplication?: boolean;
  /**
   * For high throughput for FIFO queues, specifies whether message deduplication occurs at the message
   * group or queue level. Valid values are ``messageGroup`` and ``queue``.
   * To enable high throughput for a FIFO queue, set this attribute to ``messageGroup`` *and* set the
   * ``FifoThroughputLimit`` attribute to ``perMessageGroupId``. If you set these attributes to anything
   * other than these values, normal throughput is in effect and deduplication occurs as specified. For
   * more information, see [High throughput for FIFO
   * queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/high-throughput-fifo.html)
   * and [Quotas related to
   * messages](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html)
   * in the *Developer Guide*.
   */
  DeduplicationScope?: string;
  /**
   * The time in seconds for which the delivery of all messages in the queue is delayed. You can specify
   * an integer value of ``0`` to ``900`` (15 minutes). The default value is ``0``.
   */
  DelaySeconds?: number;
  /**
   * If set to true, creates a FIFO queue. If you don't specify this property, SQS creates a standard
   * queue. For more information, see [Amazon SQS FIFO
   * queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html)
   * in the *Developer Guide*.
   */
  FifoQueue?: boolean;
  /**
   * For high throughput for FIFO queues, specifies whether the FIFO queue throughput quota applies to
   * the entire queue or per message group. Valid values are ``perQueue`` and ``perMessageGroupId``.
   * To enable high throughput for a FIFO queue, set this attribute to ``perMessageGroupId`` *and* set
   * the ``DeduplicationScope`` attribute to ``messageGroup``. If you set these attributes to anything
   * other than these values, normal throughput is in effect and deduplication occurs as specified. For
   * more information, see [High throughput for FIFO
   * queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/high-throughput-fifo.html)
   * and [Quotas related to
   * messages](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html)
   * in the *Developer Guide*.
   */
  FifoThroughputLimit?: string;
  /**
   * The length of time in seconds for which SQS can reuse a data key to encrypt or decrypt messages
   * before calling KMS again. The value must be an integer between 60 (1 minute) and 86,400 (24 hours).
   * The default is 300 (5 minutes).
   * A shorter time period provides better security, but results in more calls to KMS, which might
   * incur charges after Free Tier. For more information, see [Encryption at
   * rest](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-server-side-encryption.html#sqs-how-does-the-data-key-reuse-period-work)
   * in the *Developer Guide*.
   */
  KmsDataKeyReusePeriodSeconds?: number;
  /**
   * The ID of an AWS Key Management Service (KMS) for SQS, or a custom KMS. To use the AWS managed KMS
   * for SQS, specify a (default) alias ARN, alias name (for example ``alias/aws/sqs``), key ARN, or key
   * ID. For more information, see the following:
   * +   [Encryption at
   * rest](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-server-side-encryption.html)
   * in the *Developer Guide*
   * +
   * [CreateQueue](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_CreateQueue.html)
   * in the *API Reference*
   * +   [Request
   * Parameters](https://docs.aws.amazon.com/kms/latest/APIReference/API_DescribeKey.html#API_DescribeKey_RequestParameters)
   * in the *Key Management Service API Reference*
   * +   The Key Management Service (KMS) section of the [Security best practices for Key Management
   * Service](https://docs.aws.amazon.com/kms/latest/developerguide/best-practices.html) in the *Key
   * Management Service Developer Guide*
   */
  KmsMasterKeyId?: string;
  /**
   * Enables server-side queue encryption using SQS owned encryption keys. Only one server-side
   * encryption option is supported per queue (for example,
   * [SSE-KMS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-sse-existing-queue.html)
   * or
   * [SSE-SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-sqs-sse-queue.html)).
   * When ``SqsManagedSseEnabled`` is not defined, ``SSE-SQS`` encryption is enabled by default.
   */
  SqsManagedSseEnabled?: boolean;
  /**
   * The limit of how many bytes that a message can contain before SQS rejects it. You can specify an
   * integer value from ``1,024`` bytes (1 KiB) to ``262,144`` bytes (256 KiB). The default value is
   * ``262,144`` (256 KiB).
   */
  MaximumMessageSize?: number;
  /**
   * The number of seconds that SQS retains a message. You can specify an integer value from ``60``
   * seconds (1 minute) to ``1,209,600`` seconds (14 days). The default value is ``345,600`` seconds (4
   * days).
   */
  MessageRetentionPeriod?: number;
  /**
   * A name for the queue. To create a FIFO queue, the name of your FIFO queue must end with the
   * ``.fifo`` suffix. For more information, see [Amazon SQS FIFO
   * queues](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html)
   * in the *Developer Guide*.
   * If you don't specify a name, CFN generates a unique physical ID and uses that ID for the queue
   * name. For more information, see [Name
   * type](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-name.html) in
   * the *User Guide*.
   * If you specify a name, you can't perform updates that require replacement of this resource. You
   * can perform updates that require no or some interruption. If you must replace the resource, specify
   * a new name.
   */
  QueueName?: string;
  /**
   * Specifies the duration, in seconds, that the ReceiveMessage action call waits until a message is in
   * the queue in order to include it in the response, rather than returning an empty response if a
   * message isn't yet available. You can specify an integer from 1 to 20. Short polling is used as the
   * default or when you specify 0 for this property. For more information, see [Consuming messages
   * using long
   * polling](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html#sqs-long-polling)
   * in the *Developer Guide*.
   */
  ReceiveMessageWaitTimeSeconds?: number;
  /**
   * The string that includes the parameters for the permissions for the dead-letter queue redrive
   * permission and which source queues can specify dead-letter queues as a JSON object. The parameters
   * are as follows:
   * +   ``redrivePermission``: The permission type that defines which source queues can specify the
   * current queue as the dead-letter queue. Valid values are:
   * +   ``allowAll``: (Default) Any source queues in this AWS account in the same Region can specify
   * this queue as the dead-letter queue.
   * +   ``denyAll``: No source queues can specify this queue as the dead-letter queue.
   * +   ``byQueue``: Only queues specified by the ``sourceQueueArns`` parameter can specify this
   * queue as the dead-letter queue.
   * +   ``sourceQueueArns``: The Amazon Resource Names (ARN)s of the source queues that can specify
   * this queue as the dead-letter queue and redrive messages. You can specify this parameter only when
   * the ``redrivePermission`` parameter is set to ``byQueue``. You can specify up to 10 source queue
   * ARNs. To allow more than 10 source queues to specify dead-letter queues, set the
   * ``redrivePermission`` parameter to ``allowAll``.
   */
  RedriveAllowPolicy?: Record<string, unknown> | string;
  /**
   * The string that includes the parameters for the dead-letter queue functionality of the source queue
   * as a JSON object. The parameters are as follows:
   * +   ``deadLetterTargetArn``: The Amazon Resource Name (ARN) of the dead-letter queue to which SQS
   * moves messages after the value of ``maxReceiveCount`` is exceeded.
   * +   ``maxReceiveCount``: The number of times a message is received by a consumer of the source
   * queue before being moved to the dead-letter queue. When the ``ReceiveCount`` for a message exceeds
   * the ``maxReceiveCount`` for a queue, SQS moves the message to the dead-letter-queue.
   * The dead-letter queue of a FIFO queue must also be a FIFO queue. Similarly, the dead-letter queue
   * of a standard queue must also be a standard queue.
   * *JSON*
   * ``{ "deadLetterTargetArn" : String, "maxReceiveCount" : Integer }``
   * *YAML*
   * ``deadLetterTargetArn : String``
   * ``maxReceiveCount : Integer``
   */
  RedrivePolicy?: Record<string, unknown> | string;
  /**
   * The tags that you attach to this queue. For more information, see [Resource
   * tag](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-resource-tags.html)
   * in the *User Guide*.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value: string;
  }[];
  /**
   * The length of time during which a message will be unavailable after a message is delivered from the
   * queue. This blocks other components from receiving the same message and gives the initial component
   * time to process and delete the message from the queue.
   * Values must be from 0 to 43,200 seconds (12 hours). If you don't specify a value, AWS
   * CloudFormation uses the default value of 30 seconds.
   * For more information about SQS queue visibility timeouts, see [Visibility
   * timeout](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html)
   * in the *Developer Guide*.
   */
  VisibilityTimeout?: number;
};


/**
 * The ``AWS::SQS::QueuePolicy`` type applies a policy to SQS queues. For an example snippet, see
 * [Declaring an
 * policy](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/quickref-iam.html#scenario-sqs-policy)
 * in the *User Guide*.
 */
export type AwsSqsQueuepolicy = {
  Id?: string;
  /**
   * A policy document that contains the permissions for the specified SQS queues. For more information
   * about SQS policies, see [Using custom policies with the access policy
   * language](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-creating-custom-policies.html)
   * in the *Developer Guide*.
   */
  PolicyDocument: Record<string, unknown> | string;
  /**
   * The URLs of the queues to which you want to add the policy. You can use the ``Ref`` function to
   * specify an ``AWS::SQS::Queue`` resource.
   * @uniqueItems false
   */
  Queues: string[];
};


/**
 * The ``AWS::ApplicationAutoScaling::ScalableTarget`` resource specifies a resource that Application
 * Auto Scaling can scale, such as an AWS::DynamoDB::Table or AWS::ECS::Service resource.
 * For more information, see [Getting
 * started](https://docs.aws.amazon.com/autoscaling/application/userguide/getting-started.html) in the
 * *Application Auto Scaling User Guide*.
 * If the resource that you want Application Auto Scaling to scale is not yet created in your
 * account, add a dependency on the resource when registering it as a scalable target using the
 * [DependsOn](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-dependson.html)
 * attribute.
 */
export type AwsApplicationautoscalingScalabletarget = {
  /**
   * The scheduled actions for the scalable target. Duplicates aren't allowed.
   * @uniqueItems true
   */
  ScheduledActions?: ({
    /**
     * The time zone used when referring to the date and time of a scheduled action, when the scheduled
     * action uses an at or cron expression.
     */
    Timezone?: string;
    /**
     * The name of the scheduled action. This name must be unique among all other scheduled actions on the
     * specified scalable target.
     */
    ScheduledActionName: string;
    /** The date and time that the action is scheduled to end, in UTC. */
    EndTime?: string;
    /**
     * The schedule for this action. The following formats are supported:
     * +  At expressions - "``at(yyyy-mm-ddThh:mm:ss)``"
     * +  Rate expressions - "``rate(valueunit)``"
     * +  Cron expressions - "``cron(fields)``"
     * At expressions are useful for one-time schedules. Cron expressions are useful for scheduled
     * actions that run periodically at a specified date and time, and rate expressions are useful for
     * scheduled actions that run at a regular interval.
     * At and cron expressions use Universal Coordinated Time (UTC) by default.
     * The cron format consists of six fields separated by white spaces: [Minutes] [Hours] [Day_of_Month]
     * [Month] [Day_of_Week] [Year].
     * For rate expressions, *value* is a positive integer and *unit* is ``minute`` | ``minutes`` |
     * ``hour`` | ``hours`` | ``day`` | ``days``.
     */
    Schedule: string;
    /** The date and time that the action is scheduled to begin, in UTC. */
    StartTime?: string;
    /**
     * The new minimum and maximum capacity. You can set both values or just one. At the scheduled time,
     * if the current capacity is below the minimum capacity, Application Auto Scaling scales out to the
     * minimum capacity. If the current capacity is above the maximum capacity, Application Auto Scaling
     * scales in to the maximum capacity.
     */
    ScalableTargetAction?: {
      /** The minimum capacity. */
      MinCapacity?: number;
      /** The maximum capacity. */
      MaxCapacity?: number;
    };
  })[];
  /**
   * The identifier of the resource associated with the scalable target. This string consists of the
   * resource type and unique identifier.
   * +  ECS service - The resource type is ``service`` and the unique identifier is the cluster name
   * and service name. Example: ``service/my-cluster/my-service``.
   * +  Spot Fleet - The resource type is ``spot-fleet-request`` and the unique identifier is the Spot
   * Fleet request ID. Example: ``spot-fleet-request/sfr-73fbd2ce-aa30-494c-8788-1cee4EXAMPLE``.
   * +  EMR cluster - The resource type is ``instancegroup`` and the unique identifier is the cluster
   * ID and instance group ID. Example: ``instancegroup/j-2EEZNYKUA1NTV/ig-1791Y4E1L8YI0``.
   * +  AppStream 2.0 fleet - The resource type is ``fleet`` and the unique identifier is the fleet
   * name. Example: ``fleet/sample-fleet``.
   * +  DynamoDB table - The resource type is ``table`` and the unique identifier is the table name.
   * Example: ``table/my-table``.
   * +  DynamoDB global secondary index - The resource type is ``index`` and the unique identifier is
   * the index name. Example: ``table/my-table/index/my-table-index``.
   * +  Aurora DB cluster - The resource type is ``cluster`` and the unique identifier is the cluster
   * name. Example: ``cluster:my-db-cluster``.
   * +  SageMaker endpoint variant - The resource type is ``variant`` and the unique identifier is the
   * resource ID. Example: ``endpoint/my-end-point/variant/KMeansClustering``.
   * +  Custom resources are not supported with a resource type. This parameter must specify the
   * ``OutputValue`` from the CloudFormation template stack used to access the resources. The unique
   * identifier is defined by the service provider. More information is available in our [GitHub
   * repository](https://docs.aws.amazon.com/https://github.com/aws/aws-auto-scaling-custom-resource).
   * +  Amazon Comprehend document classification endpoint - The resource type and unique identifier
   * are specified using the endpoint ARN. Example:
   * ``arn:aws:comprehend:us-west-2:123456789012:document-classifier-endpoint/EXAMPLE``.
   * +  Amazon Comprehend entity recognizer endpoint - The resource type and unique identifier are
   * specified using the endpoint ARN. Example:
   * ``arn:aws:comprehend:us-west-2:123456789012:entity-recognizer-endpoint/EXAMPLE``.
   * +  Lambda provisioned concurrency - The resource type is ``function`` and the unique identifier
   * is the function name with a function version or alias name suffix that is not ``$LATEST``. Example:
   * ``function:my-function:prod`` or ``function:my-function:1``.
   * +  Amazon Keyspaces table - The resource type is ``table`` and the unique identifier is the table
   * name. Example: ``keyspace/mykeyspace/table/mytable``.
   * +  Amazon MSK cluster - The resource type and unique identifier are specified using the cluster
   * ARN. Example:
   * ``arn:aws:kafka:us-east-1:123456789012:cluster/demo-cluster-1/6357e0b2-0e6a-4b86-a0b4-70df934c2e31-5``.
   * +  Amazon ElastiCache replication group - The resource type is ``replication-group`` and the
   * unique identifier is the replication group name. Example: ``replication-group/mycluster``.
   * +  Amazon ElastiCache cache cluster - The resource type is ``cache-cluster`` and the unique
   * identifier is the cache cluster name. Example: ``cache-cluster/mycluster``.
   * +  Neptune cluster - The resource type is ``cluster`` and the unique identifier is the cluster
   * name. Example: ``cluster:mycluster``.
   * +  SageMaker serverless endpoint - The resource type is ``variant`` and the unique identifier is
   * the resource ID. Example: ``endpoint/my-end-point/variant/KMeansClustering``.
   * +  SageMaker inference component - The resource type is ``inference-component`` and the unique
   * identifier is the resource ID. Example: ``inference-component/my-inference-component``.
   * +  Pool of WorkSpaces - The resource type is ``workspacespool`` and the unique identifier is the
   * pool ID. Example: ``workspacespool/wspool-123456``.
   */
  ResourceId: string;
  /** The namespace of the AWS service that provides the resource, or a ``custom-resource``. */
  ServiceNamespace: string;
  /**
   * The scalable dimension associated with the scalable target. This string consists of the service
   * namespace, resource type, and scaling property.
   * +  ``ecs:service:DesiredCount`` - The task count of an ECS service.
   * +  ``elasticmapreduce:instancegroup:InstanceCount`` - The instance count of an EMR Instance
   * Group.
   * +  ``ec2:spot-fleet-request:TargetCapacity`` - The target capacity of a Spot Fleet.
   * +  ``appstream:fleet:DesiredCapacity`` - The capacity of an AppStream 2.0 fleet.
   * +  ``dynamodb:table:ReadCapacityUnits`` - The provisioned read capacity for a DynamoDB table.
   * +  ``dynamodb:table:WriteCapacityUnits`` - The provisioned write capacity for a DynamoDB table.
   * +  ``dynamodb:index:ReadCapacityUnits`` - The provisioned read capacity for a DynamoDB global
   * secondary index.
   * +  ``dynamodb:index:WriteCapacityUnits`` - The provisioned write capacity for a DynamoDB global
   * secondary index.
   * +  ``rds:cluster:ReadReplicaCount`` - The count of Aurora Replicas in an Aurora DB cluster.
   * Available for Aurora MySQL-compatible edition and Aurora PostgreSQL-compatible edition.
   * +  ``sagemaker:variant:DesiredInstanceCount`` - The number of EC2 instances for a SageMaker model
   * endpoint variant.
   * +  ``custom-resource:ResourceType:Property`` - The scalable dimension for a custom resource
   * provided by your own application or service.
   * +  ``comprehend:document-classifier-endpoint:DesiredInferenceUnits`` - The number of inference
   * units for an Amazon Comprehend document classification endpoint.
   * +  ``comprehend:entity-recognizer-endpoint:DesiredInferenceUnits`` - The number of inference
   * units for an Amazon Comprehend entity recognizer endpoint.
   * +  ``lambda:function:ProvisionedConcurrency`` - The provisioned concurrency for a Lambda
   * function.
   * +  ``cassandra:table:ReadCapacityUnits`` - The provisioned read capacity for an Amazon Keyspaces
   * table.
   * +  ``cassandra:table:WriteCapacityUnits`` - The provisioned write capacity for an Amazon
   * Keyspaces table.
   * +  ``kafka:broker-storage:VolumeSize`` - The provisioned volume size (in GiB) for brokers in an
   * Amazon MSK cluster.
   * +  ``elasticache:cache-cluster:Nodes`` - The number of nodes for an Amazon ElastiCache cache
   * cluster.
   * +  ``elasticache:replication-group:NodeGroups`` - The number of node groups for an Amazon
   * ElastiCache replication group.
   * +  ``elasticache:replication-group:Replicas`` - The number of replicas per node group for an
   * Amazon ElastiCache replication group.
   * +  ``neptune:cluster:ReadReplicaCount`` - The count of read replicas in an Amazon Neptune DB
   * cluster.
   * +  ``sagemaker:variant:DesiredProvisionedConcurrency`` - The provisioned concurrency for a
   * SageMaker serverless endpoint.
   * +  ``sagemaker:inference-component:DesiredCopyCount`` - The number of copies across an endpoint
   * for a SageMaker inference component.
   * +  ``workspaces:workspacespool:DesiredUserSessions`` - The number of user sessions for the
   * WorkSpaces in the pool.
   */
  ScalableDimension: string;
  /**
   * An embedded object that contains attributes and attribute values that are used to suspend and
   * resume automatic scaling. Setting the value of an attribute to ``true`` suspends the specified
   * scaling activities. Setting it to ``false`` (default) resumes the specified scaling activities.
   * *Suspension Outcomes*
   * +  For ``DynamicScalingInSuspended``, while a suspension is in effect, all scale-in activities
   * that are triggered by a scaling policy are suspended.
   * +  For ``DynamicScalingOutSuspended``, while a suspension is in effect, all scale-out activities
   * that are triggered by a scaling policy are suspended.
   * +  For ``ScheduledScalingSuspended``, while a suspension is in effect, all scaling activities
   * that involve scheduled actions are suspended.
   */
  SuspendedState?: {
    /**
     * Whether scale out by a target tracking scaling policy or a step scaling policy is suspended. Set
     * the value to ``true`` if you don't want Application Auto Scaling to add capacity when a scaling
     * policy is triggered. The default is ``false``.
     */
    DynamicScalingOutSuspended?: boolean;
    /**
     * Whether scheduled scaling is suspended. Set the value to ``true`` if you don't want Application
     * Auto Scaling to add or remove capacity by initiating scheduled actions. The default is ``false``.
     */
    ScheduledScalingSuspended?: boolean;
    /**
     * Whether scale in by a target tracking scaling policy or a step scaling policy is suspended. Set the
     * value to ``true`` if you don't want Application Auto Scaling to remove capacity when a scaling
     * policy is triggered. The default is ``false``.
     */
    DynamicScalingInSuspended?: boolean;
  };
  Id?: string;
  /**
   * The minimum value that you plan to scale in to. When a scaling policy is in effect, Application
   * Auto Scaling can scale in (contract) as needed to the minimum capacity limit in response to
   * changing demand.
   */
  MinCapacity: number;
  /**
   * Specify the Amazon Resource Name (ARN) of an Identity and Access Management (IAM) role that allows
   * Application Auto Scaling to modify the scalable target on your behalf. This can be either an IAM
   * service role that Application Auto Scaling can assume to make calls to other AWS resources on your
   * behalf, or a service-linked role for the specified service. For more information, see [How
   * Application Auto Scaling works with
   * IAM](https://docs.aws.amazon.com/autoscaling/application/userguide/security_iam_service-with-iam.html)
   * in the *Application Auto Scaling User Guide*.
   * To automatically create a service-linked role (recommended), specify the full ARN of the
   * service-linked role in your stack template. To find the exact ARN of the service-linked role for
   * your AWS or custom resource, see the [Service-linked
   * roles](https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-service-linked-roles.html)
   * topic in the *Application Auto Scaling User Guide*. Look for the ARN in the table at the bottom of
   * the page.
   */
  RoleARN?: string;
  /**
   * The maximum value that you plan to scale out to. When a scaling policy is in effect, Application
   * Auto Scaling can scale out (expand) as needed to the maximum capacity limit in response to changing
   * demand.
   */
  MaxCapacity: number;
};


/**
 * The ``AWS::ApplicationAutoScaling::ScalingPolicy`` resource defines a scaling policy that
 * Application Auto Scaling uses to adjust the capacity of a scalable target.
 * For more information, see [Target tracking scaling
 * policies](https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-target-tracking.html)
 * and [Step scaling
 * policies](https://docs.aws.amazon.com/autoscaling/application/userguide/application-auto-scaling-step-scaling-policies.html)
 * in the *Application Auto Scaling User Guide*.
 */
export type AwsApplicationautoscalingScalingpolicy = {
  /**
   * The scaling policy type.
   * The following policy types are supported:
   * ``TargetTrackingScaling``—Not supported for Amazon EMR
   * ``StepScaling``—Not supported for DynamoDB, Amazon Comprehend, Lambda, Amazon Keyspaces, Amazon
   * MSK, Amazon ElastiCache, or Neptune.
   * ``PredictiveScaling``—Only supported for Amazon ECS
   */
  PolicyType: string;
  /**
   * The identifier of the resource associated with the scaling policy. This string consists of the
   * resource type and unique identifier.
   * +  ECS service - The resource type is ``service`` and the unique identifier is the cluster name
   * and service name. Example: ``service/my-cluster/my-service``.
   * +  Spot Fleet - The resource type is ``spot-fleet-request`` and the unique identifier is the Spot
   * Fleet request ID. Example: ``spot-fleet-request/sfr-73fbd2ce-aa30-494c-8788-1cee4EXAMPLE``.
   * +  EMR cluster - The resource type is ``instancegroup`` and the unique identifier is the cluster
   * ID and instance group ID. Example: ``instancegroup/j-2EEZNYKUA1NTV/ig-1791Y4E1L8YI0``.
   * +  AppStream 2.0 fleet - The resource type is ``fleet`` and the unique identifier is the fleet
   * name. Example: ``fleet/sample-fleet``.
   * +  DynamoDB table - The resource type is ``table`` and the unique identifier is the table name.
   * Example: ``table/my-table``.
   * +  DynamoDB global secondary index - The resource type is ``index`` and the unique identifier is
   * the index name. Example: ``table/my-table/index/my-table-index``.
   * +  Aurora DB cluster - The resource type is ``cluster`` and the unique identifier is the cluster
   * name. Example: ``cluster:my-db-cluster``.
   * +  SageMaker endpoint variant - The resource type is ``variant`` and the unique identifier is the
   * resource ID. Example: ``endpoint/my-end-point/variant/KMeansClustering``.
   * +  Custom resources are not supported with a resource type. This parameter must specify the
   * ``OutputValue`` from the CloudFormation template stack used to access the resources. The unique
   * identifier is defined by the service provider. More information is available in our [GitHub
   * repository](https://docs.aws.amazon.com/https://github.com/aws/aws-auto-scaling-custom-resource).
   * +  Amazon Comprehend document classification endpoint - The resource type and unique identifier
   * are specified using the endpoint ARN. Example:
   * ``arn:aws:comprehend:us-west-2:123456789012:document-classifier-endpoint/EXAMPLE``.
   * +  Amazon Comprehend entity recognizer endpoint - The resource type and unique identifier are
   * specified using the endpoint ARN. Example:
   * ``arn:aws:comprehend:us-west-2:123456789012:entity-recognizer-endpoint/EXAMPLE``.
   * +  Lambda provisioned concurrency - The resource type is ``function`` and the unique identifier
   * is the function name with a function version or alias name suffix that is not ``$LATEST``. Example:
   * ``function:my-function:prod`` or ``function:my-function:1``.
   * +  Amazon Keyspaces table - The resource type is ``table`` and the unique identifier is the table
   * name. Example: ``keyspace/mykeyspace/table/mytable``.
   * +  Amazon MSK cluster - The resource type and unique identifier are specified using the cluster
   * ARN. Example:
   * ``arn:aws:kafka:us-east-1:123456789012:cluster/demo-cluster-1/6357e0b2-0e6a-4b86-a0b4-70df934c2e31-5``.
   * +  Amazon ElastiCache replication group - The resource type is ``replication-group`` and the
   * unique identifier is the replication group name. Example: ``replication-group/mycluster``.
   * +  Amazon ElastiCache cache cluster - The resource type is ``cache-cluster`` and the unique
   * identifier is the cache cluster name. Example: ``cache-cluster/mycluster``.
   * +  Neptune cluster - The resource type is ``cluster`` and the unique identifier is the cluster
   * name. Example: ``cluster:mycluster``.
   * +  SageMaker serverless endpoint - The resource type is ``variant`` and the unique identifier is
   * the resource ID. Example: ``endpoint/my-end-point/variant/KMeansClustering``.
   * +  SageMaker inference component - The resource type is ``inference-component`` and the unique
   * identifier is the resource ID. Example: ``inference-component/my-inference-component``.
   * +  Pool of WorkSpaces - The resource type is ``workspacespool`` and the unique identifier is the
   * pool ID. Example: ``workspacespool/wspool-123456``.
   */
  ResourceId?: string;
  /**
   * The CloudFormation-generated ID of an Application Auto Scaling scalable target. For more
   * information about the ID, see the Return Value section of the
   * ``AWS::ApplicationAutoScaling::ScalableTarget`` resource.
   * You must specify either the ``ScalingTargetId`` property, or the ``ResourceId``,
   * ``ScalableDimension``, and ``ServiceNamespace`` properties, but not both.
   */
  ScalingTargetId?: string;
  /**
   * The name of the scaling policy.
   * Updates to the name of a target tracking scaling policy are not supported, unless you also update
   * the metric used for scaling. To change only a target tracking scaling policy's name, first delete
   * the policy by removing the existing ``AWS::ApplicationAutoScaling::ScalingPolicy`` resource from
   * the template and updating the stack. Then, recreate the resource with the same settings and a
   * different name.
   */
  PolicyName: string;
  /** The namespace of the AWS service that provides the resource, or a ``custom-resource``. */
  ServiceNamespace?: string;
  /**
   * The scalable dimension. This string consists of the service namespace, resource type, and scaling
   * property.
   * +  ``ecs:service:DesiredCount`` - The task count of an ECS service.
   * +  ``elasticmapreduce:instancegroup:InstanceCount`` - The instance count of an EMR Instance
   * Group.
   * +  ``ec2:spot-fleet-request:TargetCapacity`` - The target capacity of a Spot Fleet.
   * +  ``appstream:fleet:DesiredCapacity`` - The capacity of an AppStream 2.0 fleet.
   * +  ``dynamodb:table:ReadCapacityUnits`` - The provisioned read capacity for a DynamoDB table.
   * +  ``dynamodb:table:WriteCapacityUnits`` - The provisioned write capacity for a DynamoDB table.
   * +  ``dynamodb:index:ReadCapacityUnits`` - The provisioned read capacity for a DynamoDB global
   * secondary index.
   * +  ``dynamodb:index:WriteCapacityUnits`` - The provisioned write capacity for a DynamoDB global
   * secondary index.
   * +  ``rds:cluster:ReadReplicaCount`` - The count of Aurora Replicas in an Aurora DB cluster.
   * Available for Aurora MySQL-compatible edition and Aurora PostgreSQL-compatible edition.
   * +  ``sagemaker:variant:DesiredInstanceCount`` - The number of EC2 instances for a SageMaker model
   * endpoint variant.
   * +  ``custom-resource:ResourceType:Property`` - The scalable dimension for a custom resource
   * provided by your own application or service.
   * +  ``comprehend:document-classifier-endpoint:DesiredInferenceUnits`` - The number of inference
   * units for an Amazon Comprehend document classification endpoint.
   * +  ``comprehend:entity-recognizer-endpoint:DesiredInferenceUnits`` - The number of inference
   * units for an Amazon Comprehend entity recognizer endpoint.
   * +  ``lambda:function:ProvisionedConcurrency`` - The provisioned concurrency for a Lambda
   * function.
   * +  ``cassandra:table:ReadCapacityUnits`` - The provisioned read capacity for an Amazon Keyspaces
   * table.
   * +  ``cassandra:table:WriteCapacityUnits`` - The provisioned write capacity for an Amazon
   * Keyspaces table.
   * +  ``kafka:broker-storage:VolumeSize`` - The provisioned volume size (in GiB) for brokers in an
   * Amazon MSK cluster.
   * +  ``elasticache:cache-cluster:Nodes`` - The number of nodes for an Amazon ElastiCache cache
   * cluster.
   * +  ``elasticache:replication-group:NodeGroups`` - The number of node groups for an Amazon
   * ElastiCache replication group.
   * +  ``elasticache:replication-group:Replicas`` - The number of replicas per node group for an
   * Amazon ElastiCache replication group.
   * +  ``neptune:cluster:ReadReplicaCount`` - The count of read replicas in an Amazon Neptune DB
   * cluster.
   * +  ``sagemaker:variant:DesiredProvisionedConcurrency`` - The provisioned concurrency for a
   * SageMaker serverless endpoint.
   * +  ``sagemaker:inference-component:DesiredCopyCount`` - The number of copies across an endpoint
   * for a SageMaker inference component.
   * +  ``workspaces:workspacespool:DesiredUserSessions`` - The number of user sessions for the
   * WorkSpaces in the pool.
   */
  ScalableDimension?: string;
  /** A target tracking scaling policy. */
  TargetTrackingScalingPolicyConfiguration?: {
    /**
     * The amount of time, in seconds, to wait for a previous scale-out activity to take effect. For more
     * information and for default values, see [Define cooldown
     * periods](https://docs.aws.amazon.com/autoscaling/application/userguide/target-tracking-scaling-policy-overview.html#target-tracking-cooldown)
     * in the *Application Auto Scaling User Guide*.
     */
    ScaleOutCooldown?: number;
    /**
     * The target value for the metric. Although this property accepts numbers of type Double, it won't
     * accept values that are either too small or too large. Values must be in the range of -2^360 to
     * 2^360. The value must be a valid number based on the choice of metric. For example, if the metric
     * is CPU utilization, then the target value is a percent value that represents how much of the CPU
     * can be used before scaling out.
     */
    TargetValue: number;
    /** A customized metric. You can specify either a predefined metric or a customized metric. */
    CustomizedMetricSpecification?: {
      /**
       * The name of the metric. To get the exact metric name, namespace, and dimensions, inspect the
       * [Metric](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Metric.html) object
       * that's returned by a call to
       * [ListMetrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_ListMetrics.html).
       */
      MetricName?: string;
      /**
       * The metrics to include in the target tracking scaling policy, as a metric data query. This can
       * include both raw metric and metric math expressions.
       * @uniqueItems false
       */
      Metrics?: {
        /**
         * Indicates whether to return the timestamps and raw data values of this metric.
         * If you use any math expressions, specify ``true`` for this value for only the final math
         * expression that the metric specification is based on. You must specify ``false`` for ``ReturnData``
         * for all the other metrics and expressions used in the metric specification.
         * If you are only retrieving metrics and not performing any math expressions, do not specify
         * anything for ``ReturnData``. This sets it to its default (``true``).
         */
        ReturnData?: boolean;
        /**
         * The math expression to perform on the returned data, if this object is performing a math
         * expression. This expression can use the ``Id`` of the other metrics to refer to those metrics, and
         * can also use the ``Id`` of other expressions to use the result of those expressions.
         * Conditional: Within each ``TargetTrackingMetricDataQuery`` object, you must specify either
         * ``Expression`` or ``MetricStat``, but not both.
         */
        Expression?: string;
        /**
         * A human-readable label for this metric or expression. This is especially useful if this is a math
         * expression, so that you know what the value represents.
         */
        Label?: string;
        /**
         * Information about the metric data to return.
         * Conditional: Within each ``MetricDataQuery`` object, you must specify either ``Expression`` or
         * ``MetricStat``, but not both.
         */
        MetricStat?: {
          /**
           * The statistic to return. It can include any CloudWatch statistic or extended statistic. For a list
           * of valid values, see the table in
           * [Statistics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Statistic)
           * in the *Amazon CloudWatch User Guide*.
           * The most commonly used metric for scaling is ``Average``.
           */
          Stat?: string;
          /**
           * The CloudWatch metric to return, including the metric name, namespace, and dimensions. To get the
           * exact metric name, namespace, and dimensions, inspect the
           * [Metric](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Metric.html) object
           * that is returned by a call to
           * [ListMetrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_ListMetrics.html).
           */
          Metric?: {
            /** The name of the metric. */
            MetricName?: string;
            /**
             * The dimensions for the metric. For the list of available dimensions, see the AWS documentation
             * available from the table in [services that publish CloudWatch
             * metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/aws-services-cloudwatch-metrics.html)
             * in the *Amazon CloudWatch User Guide*.
             * Conditional: If you published your metric with dimensions, you must specify the same dimensions in
             * your scaling policy.
             * @uniqueItems false
             */
            Dimensions?: {
              /** The value of the dimension. */
              Value?: string;
              /** The name of the dimension. */
              Name?: string;
            }[];
            /**
             * The namespace of the metric. For more information, see the table in [services that publish
             * CloudWatch
             * metrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/aws-services-cloudwatch-metrics.html)
             * in the *Amazon CloudWatch User Guide*.
             */
            Namespace?: string;
          };
          /**
           * The unit to use for the returned data points. For a complete list of the units that CloudWatch
           * supports, see the
           * [MetricDatum](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricDatum.html)
           * data type in the *Amazon CloudWatch API Reference*.
           */
          Unit?: string;
        };
        /**
         * A short name that identifies the object's results in the response. This name must be unique among
         * all ``MetricDataQuery`` objects specified for a single scaling policy. If you are performing math
         * expressions on this set of data, this name represents that data and can serve as a variable in the
         * mathematical expression. The valid characters are letters, numbers, and underscores. The first
         * character must be a lowercase letter.
         */
        Id?: string;
      }[];
      /** The statistic of the metric. */
      Statistic?: string;
      /**
       * The dimensions of the metric.
       * Conditional: If you published your metric with dimensions, you must specify the same dimensions in
       * your scaling policy.
       * @uniqueItems false
       */
      Dimensions?: {
        /** The value of the dimension. */
        Value: string;
        /** The name of the dimension. */
        Name: string;
      }[];
      /**
       * The unit of the metric. For a complete list of the units that CloudWatch supports, see the
       * [MetricDatum](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricDatum.html)
       * data type in the *Amazon CloudWatch API Reference*.
       */
      Unit?: string;
      /** The namespace of the metric. */
      Namespace?: string;
    };
    /**
     * Indicates whether scale in by the target tracking scaling policy is disabled. If the value is
     * ``true``, scale in is disabled and the target tracking scaling policy won't remove capacity from
     * the scalable target. Otherwise, scale in is enabled and the target tracking scaling policy can
     * remove capacity from the scalable target. The default value is ``false``.
     */
    DisableScaleIn?: boolean;
    /**
     * The amount of time, in seconds, after a scale-in activity completes before another scale-in
     * activity can start. For more information and for default values, see [Define cooldown
     * periods](https://docs.aws.amazon.com/autoscaling/application/userguide/target-tracking-scaling-policy-overview.html#target-tracking-cooldown)
     * in the *Application Auto Scaling User Guide*.
     */
    ScaleInCooldown?: number;
    /** A predefined metric. You can specify either a predefined metric or a customized metric. */
    PredefinedMetricSpecification?: {
      /**
       * The metric type. The ``ALBRequestCountPerTarget`` metric type applies only to Spot fleet requests
       * and ECS services.
       */
      PredefinedMetricType: string;
      /**
       * Identifies the resource associated with the metric type. You can't specify a resource label unless
       * the metric type is ``ALBRequestCountPerTarget`` and there is a target group attached to the Spot
       * Fleet or ECS service.
       * You create the resource label by appending the final portion of the load balancer ARN and the
       * final portion of the target group ARN into a single value, separated by a forward slash (/). The
       * format of the resource label is:
       * ``app/my-alb/778d41231b141a0f/targetgroup/my-alb-target-group/943f017f100becff``.
       * Where:
       * +  app/<load-balancer-name>/<load-balancer-id> is the final portion of the load balancer ARN
       * +  targetgroup/<target-group-name>/<target-group-id> is the final portion of the target group
       * ARN.
       * To find the ARN for an Application Load Balancer, use the
       * [DescribeLoadBalancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_DescribeLoadBalancers.html)
       * API operation. To find the ARN for the target group, use the
       * [DescribeTargetGroups](https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_DescribeTargetGroups.html)
       * API operation.
       */
      ResourceLabel?: string;
    };
  };
  Arn?: string;
  /** A step scaling policy. */
  StepScalingPolicyConfiguration?: {
    /**
     * The aggregation type for the CloudWatch metrics. Valid values are ``Minimum``, ``Maximum``, and
     * ``Average``. If the aggregation type is null, the value is treated as ``Average``.
     */
    MetricAggregationType?: string;
    /**
     * The amount of time, in seconds, to wait for a previous scaling activity to take effect. If not
     * specified, the default value is 300. For more information, see [Cooldown
     * period](https://docs.aws.amazon.com/autoscaling/application/userguide/step-scaling-policy-overview.html#step-scaling-cooldown)
     * in the *Application Auto Scaling User Guide*.
     */
    Cooldown?: number;
    /**
     * A set of adjustments that enable you to scale based on the size of the alarm breach.
     * At least one step adjustment is required if you are adding a new step scaling policy
     * configuration.
     * @uniqueItems true
     */
    StepAdjustments?: {
      /**
       * The upper bound for the difference between the alarm threshold and the CloudWatch metric. If the
       * metric value is above the breach threshold, the upper bound is exclusive (the metric must be less
       * than the threshold plus the upper bound). Otherwise, it is inclusive (the metric must be less than
       * or equal to the threshold plus the upper bound). A null value indicates positive infinity.
       * You must specify at least one upper or lower bound.
       */
      MetricIntervalUpperBound?: number;
      /**
       * The lower bound for the difference between the alarm threshold and the CloudWatch metric. If the
       * metric value is above the breach threshold, the lower bound is inclusive (the metric must be
       * greater than or equal to the threshold plus the lower bound). Otherwise, it is exclusive (the
       * metric must be greater than the threshold plus the lower bound). A null value indicates negative
       * infinity.
       * You must specify at least one upper or lower bound.
       */
      MetricIntervalLowerBound?: number;
      /**
       * The amount by which to scale. The adjustment is based on the value that you specified in the
       * ``AdjustmentType`` property (either an absolute number or a percentage). A positive value adds to
       * the current capacity and a negative number subtracts from the current capacity.
       */
      ScalingAdjustment: number;
    }[];
    /**
     * The minimum value to scale by when the adjustment type is ``PercentChangeInCapacity``. For example,
     * suppose that you create a step scaling policy to scale out an Amazon ECS service by 25 percent and
     * you specify a ``MinAdjustmentMagnitude`` of 2. If the service has 4 tasks and the scaling policy is
     * performed, 25 percent of 4 is 1. However, because you specified a ``MinAdjustmentMagnitude`` of 2,
     * Application Auto Scaling scales out the service by 2 tasks.
     */
    MinAdjustmentMagnitude?: number;
    /**
     * Specifies whether the ``ScalingAdjustment`` value in the ``StepAdjustment`` property is an absolute
     * number or a percentage of the current capacity.
     */
    AdjustmentType?: string;
  };
  /** The predictive scaling policy configuration. */
  PredictiveScalingPolicyConfiguration?: {
    /**
     * Defines the behavior that should be applied if the forecast capacity approaches or exceeds the
     * maximum capacity. Defaults to ``HonorMaxCapacity`` if not specified.
     */
    MaxCapacityBreachBehavior?: string;
    /**
     * The size of the capacity buffer to use when the forecast capacity is close to or exceeds the
     * maximum capacity. The value is specified as a percentage relative to the forecast capacity. For
     * example, if the buffer is 10, this means a 10 percent buffer, such that if the forecast capacity is
     * 50, and the maximum capacity is 40, then the effective maximum capacity is 55.
     * Required if the ``MaxCapacityBreachBehavior`` property is set to ``IncreaseMaxCapacity``, and
     * cannot be used otherwise.
     */
    MaxCapacityBuffer?: number;
    /** The predictive scaling mode. Defaults to ``ForecastOnly`` if not specified. */
    Mode?: string;
    /**
     * This structure includes the metrics and target utilization to use for predictive scaling.
     * This is an array, but we currently only support a single metric specification. That is, you can
     * specify a target value and a single metric pair, or a target value and one scaling metric and one
     * load metric.
     * @uniqueItems true
     */
    MetricSpecifications: {
      /** The customized load metric specification. */
      CustomizedLoadMetricSpecification?: {
        /** @uniqueItems true */
        MetricDataQueries: {
          /**
           * Indicates whether to return the timestamps and raw data values of this metric.
           * If you use any math expressions, specify ``true`` for this value for only the final math
           * expression that the metric specification is based on. You must specify ``false`` for ``ReturnData``
           * for all the other metrics and expressions used in the metric specification.
           * If you are only retrieving metrics and not performing any math expressions, do not specify
           * anything for ``ReturnData``. This sets it to its default (``true``).
           */
          ReturnData?: boolean;
          /**
           * The math expression to perform on the returned data, if this object is performing a math
           * expression. This expression can use the ``Id`` of the other metrics to refer to those metrics, and
           * can also use the ``Id`` of other expressions to use the result of those expressions.
           * Conditional: Within each ``MetricDataQuery`` object, you must specify either ``Expression`` or
           * ``MetricStat``, but not both.
           */
          Expression?: string;
          /**
           * A human-readable label for this metric or expression. This is especially useful if this is a math
           * expression, so that you know what the value represents.
           */
          Label?: string;
          /**
           * Information about the metric data to return.
           * Conditional: Within each ``MetricDataQuery`` object, you must specify either ``Expression`` or
           * ``MetricStat``, but not both.
           */
          MetricStat?: {
            /**
             * The statistic to return. It can include any CloudWatch statistic or extended statistic. For a list
             * of valid values, see the table in
             * [Statistics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Statistic)
             * in the *Amazon CloudWatch User Guide*.
             * The most commonly used metrics for predictive scaling are ``Average`` and ``Sum``.
             */
            Stat?: string;
            /**
             * The CloudWatch metric to return, including the metric name, namespace, and dimensions. To get the
             * exact metric name, namespace, and dimensions, inspect the
             * [Metric](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Metric.html) object
             * that is returned by a call to
             * [ListMetrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_ListMetrics.html).
             */
            Metric?: {
              /** The name of the metric. */
              MetricName?: string;
              /**
               * Describes the dimensions of the metric.
               * @uniqueItems false
               */
              Dimensions?: {
                /** The value of the dimension. */
                Value?: string;
                /** The name of the dimension. */
                Name?: string;
              }[];
              /** The namespace of the metric. */
              Namespace?: string;
            };
            /**
             * The unit to use for the returned data points. For a complete list of the units that CloudWatch
             * supports, see the
             * [MetricDatum](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricDatum.html)
             * data type in the *Amazon CloudWatch API Reference*.
             */
            Unit?: string;
          };
          /**
           * A short name that identifies the object's results in the response. This name must be unique among
           * all ``MetricDataQuery`` objects specified for a single scaling policy. If you are performing math
           * expressions on this set of data, this name represents that data and can serve as a variable in the
           * mathematical expression. The valid characters are letters, numbers, and underscores. The first
           * character must be a lowercase letter.
           */
          Id?: string;
        }[];
      };
      /** The predefined load metric specification. */
      PredefinedLoadMetricSpecification?: {
        /** The metric type. */
        PredefinedMetricType: string;
        /** A label that uniquely identifies a target group. */
        ResourceLabel?: string;
      };
      /** Specifies the target utilization. */
      TargetValue: number;
      /** The predefined scaling metric specification. */
      PredefinedScalingMetricSpecification?: {
        /** The metric type. */
        PredefinedMetricType: string;
        /**
         * A label that uniquely identifies a specific target group from which to determine the average
         * request count.
         */
        ResourceLabel?: string;
      };
      /** The customized capacity metric specification. */
      CustomizedCapacityMetricSpecification?: {
        /**
         * One or more metric data queries to provide data points for a metric specification.
         * @uniqueItems true
         */
        MetricDataQueries: {
          /**
           * Indicates whether to return the timestamps and raw data values of this metric.
           * If you use any math expressions, specify ``true`` for this value for only the final math
           * expression that the metric specification is based on. You must specify ``false`` for ``ReturnData``
           * for all the other metrics and expressions used in the metric specification.
           * If you are only retrieving metrics and not performing any math expressions, do not specify
           * anything for ``ReturnData``. This sets it to its default (``true``).
           */
          ReturnData?: boolean;
          /**
           * The math expression to perform on the returned data, if this object is performing a math
           * expression. This expression can use the ``Id`` of the other metrics to refer to those metrics, and
           * can also use the ``Id`` of other expressions to use the result of those expressions.
           * Conditional: Within each ``MetricDataQuery`` object, you must specify either ``Expression`` or
           * ``MetricStat``, but not both.
           */
          Expression?: string;
          /**
           * A human-readable label for this metric or expression. This is especially useful if this is a math
           * expression, so that you know what the value represents.
           */
          Label?: string;
          /**
           * Information about the metric data to return.
           * Conditional: Within each ``MetricDataQuery`` object, you must specify either ``Expression`` or
           * ``MetricStat``, but not both.
           */
          MetricStat?: {
            /**
             * The statistic to return. It can include any CloudWatch statistic or extended statistic. For a list
             * of valid values, see the table in
             * [Statistics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Statistic)
             * in the *Amazon CloudWatch User Guide*.
             * The most commonly used metrics for predictive scaling are ``Average`` and ``Sum``.
             */
            Stat?: string;
            /**
             * The CloudWatch metric to return, including the metric name, namespace, and dimensions. To get the
             * exact metric name, namespace, and dimensions, inspect the
             * [Metric](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Metric.html) object
             * that is returned by a call to
             * [ListMetrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_ListMetrics.html).
             */
            Metric?: {
              /** The name of the metric. */
              MetricName?: string;
              /**
               * Describes the dimensions of the metric.
               * @uniqueItems false
               */
              Dimensions?: {
                /** The value of the dimension. */
                Value?: string;
                /** The name of the dimension. */
                Name?: string;
              }[];
              /** The namespace of the metric. */
              Namespace?: string;
            };
            /**
             * The unit to use for the returned data points. For a complete list of the units that CloudWatch
             * supports, see the
             * [MetricDatum](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricDatum.html)
             * data type in the *Amazon CloudWatch API Reference*.
             */
            Unit?: string;
          };
          /**
           * A short name that identifies the object's results in the response. This name must be unique among
           * all ``MetricDataQuery`` objects specified for a single scaling policy. If you are performing math
           * expressions on this set of data, this name represents that data and can serve as a variable in the
           * mathematical expression. The valid characters are letters, numbers, and underscores. The first
           * character must be a lowercase letter.
           */
          Id?: string;
        }[];
      };
      /** The customized scaling metric specification. */
      CustomizedScalingMetricSpecification?: {
        /**
         * One or more metric data queries to provide data points for a metric specification.
         * @uniqueItems true
         */
        MetricDataQueries: {
          /**
           * Indicates whether to return the timestamps and raw data values of this metric.
           * If you use any math expressions, specify ``true`` for this value for only the final math
           * expression that the metric specification is based on. You must specify ``false`` for ``ReturnData``
           * for all the other metrics and expressions used in the metric specification.
           * If you are only retrieving metrics and not performing any math expressions, do not specify
           * anything for ``ReturnData``. This sets it to its default (``true``).
           */
          ReturnData?: boolean;
          /**
           * The math expression to perform on the returned data, if this object is performing a math
           * expression. This expression can use the ``Id`` of the other metrics to refer to those metrics, and
           * can also use the ``Id`` of other expressions to use the result of those expressions.
           * Conditional: Within each ``MetricDataQuery`` object, you must specify either ``Expression`` or
           * ``MetricStat``, but not both.
           */
          Expression?: string;
          /**
           * A human-readable label for this metric or expression. This is especially useful if this is a math
           * expression, so that you know what the value represents.
           */
          Label?: string;
          /**
           * Information about the metric data to return.
           * Conditional: Within each ``MetricDataQuery`` object, you must specify either ``Expression`` or
           * ``MetricStat``, but not both.
           */
          MetricStat?: {
            /**
             * The statistic to return. It can include any CloudWatch statistic or extended statistic. For a list
             * of valid values, see the table in
             * [Statistics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Statistic)
             * in the *Amazon CloudWatch User Guide*.
             * The most commonly used metrics for predictive scaling are ``Average`` and ``Sum``.
             */
            Stat?: string;
            /**
             * The CloudWatch metric to return, including the metric name, namespace, and dimensions. To get the
             * exact metric name, namespace, and dimensions, inspect the
             * [Metric](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Metric.html) object
             * that is returned by a call to
             * [ListMetrics](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_ListMetrics.html).
             */
            Metric?: {
              /** The name of the metric. */
              MetricName?: string;
              /**
               * Describes the dimensions of the metric.
               * @uniqueItems false
               */
              Dimensions?: {
                /** The value of the dimension. */
                Value?: string;
                /** The name of the dimension. */
                Name?: string;
              }[];
              /** The namespace of the metric. */
              Namespace?: string;
            };
            /**
             * The unit to use for the returned data points. For a complete list of the units that CloudWatch
             * supports, see the
             * [MetricDatum](https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricDatum.html)
             * data type in the *Amazon CloudWatch API Reference*.
             */
            Unit?: string;
          };
          /**
           * A short name that identifies the object's results in the response. This name must be unique among
           * all ``MetricDataQuery`` objects specified for a single scaling policy. If you are performing math
           * expressions on this set of data, this name represents that data and can serve as a variable in the
           * mathematical expression. The valid characters are letters, numbers, and underscores. The first
           * character must be a lowercase letter.
           */
          Id?: string;
        }[];
      };
      /**
       * The predefined metric pair specification that determines the appropriate scaling metric and load
       * metric to use.
       */
      PredefinedMetricPairSpecification?: {
        /**
         * Indicates which metrics to use. There are two different types of metrics for each metric type: one
         * is a load metric and one is a scaling metric.
         */
        PredefinedMetricType: string;
        /**
         * A label that uniquely identifies a specific target group from which to determine the total and
         * average request count.
         */
        ResourceLabel?: string;
      };
    }[];
    /**
     * The amount of time, in seconds, that the start time can be advanced.
     * The value must be less than the forecast interval duration of 3600 seconds (60 minutes). Defaults
     * to 300 seconds if not specified.
     */
    SchedulingBufferTime?: number;
  };
};


/**
 * The ``AWS::AutoScaling::AutoScalingGroup`` resource defines an Amazon EC2 Auto Scaling group, which
 * is a collection of Amazon EC2 instances that are treated as a logical grouping for the purposes of
 * automatic scaling and management.
 * For more information about Amazon EC2 Auto Scaling, see the [Amazon EC2 Auto Scaling User
 * Guide](https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html).
 * Amazon EC2 Auto Scaling configures instances launched as part of an Auto Scaling group using
 * either a [launch
 * template](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-launchtemplate.html)
 * or a launch configuration. We strongly recommend that you do not use launch configurations. For
 * more information, see [Launch
 * configurations](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html)
 * in the *Amazon EC2 Auto Scaling User Guide*.
 * For help migrating from launch configurations to launch templates, see [Migrate CloudFormation
 * stacks from launch configurations to launch
 * templates](https://docs.aws.amazon.com/autoscaling/ec2/userguide/migrate-launch-configurations-with-cloudformation.html)
 * in the *Amazon EC2 Auto Scaling User Guide*.
 */
export type AwsAutoscalingAutoscalinggroup = {
  /**
   * One or more lifecycle hooks to add to the Auto Scaling group before instances are launched.
   * @uniqueItems false
   */
  LifecycleHookSpecificationList?: ({
    /** The name of the lifecycle hook. */
    LifecycleHookName: string;
    /**
     * The lifecycle transition. For Auto Scaling groups, there are two major lifecycle transitions.
     * +  To create a lifecycle hook for scale-out events, specify
     * ``autoscaling:EC2_INSTANCE_LAUNCHING``.
     * +  To create a lifecycle hook for scale-in events, specify
     * ``autoscaling:EC2_INSTANCE_TERMINATING``.
     */
    LifecycleTransition: string;
    /**
     * The maximum time, in seconds, that can elapse before the lifecycle hook times out. The range is
     * from ``30`` to ``7200`` seconds. The default value is ``3600`` seconds (1 hour).
     */
    HeartbeatTimeout?: number;
    /**
     * Additional information that you want to include any time Amazon EC2 Auto Scaling sends a message to
     * the notification target.
     */
    NotificationMetadata?: string;
    /**
     * The action the Auto Scaling group takes when the lifecycle hook timeout elapses or if an unexpected
     * failure occurs. The default value is ``ABANDON``.
     * Valid values: ``CONTINUE`` | ``ABANDON``
     */
    DefaultResult?: string;
    /**
     * The Amazon Resource Name (ARN) of the notification target that Amazon EC2 Auto Scaling sends
     * notifications to when an instance is in a wait state for the lifecycle hook. You can specify an
     * Amazon SNS topic or an Amazon SQS queue.
     */
    NotificationTargetARN?: string;
    /**
     * The ARN of the IAM role that allows the Auto Scaling group to publish to the specified notification
     * target. For information about creating this role, see [Prepare to add a lifecycle hook to your Auto
     * Scaling
     * group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/prepare-for-lifecycle-notifications.html)
     * in the *Amazon EC2 Auto Scaling User Guide*.
     * Valid only if the notification target is an Amazon SNS topic or an Amazon SQS queue.
     */
    RoleARN?: string;
  })[];
  /**
   * A list of Classic Load Balancers associated with this Auto Scaling group. For Application Load
   * Balancers, Network Load Balancers, and Gateway Load Balancers, specify the ``TargetGroupARNs``
   * property instead.
   * @uniqueItems false
   */
  LoadBalancerNames?: string[];
  /**
   * The name of the launch configuration to use to launch instances.
   * Required only if you don't specify ``LaunchTemplate``, ``MixedInstancesPolicy``, or
   * ``InstanceId``.
   */
  LaunchConfigurationName?: string;
  /**
   * The Amazon Resource Name (ARN) of the service-linked role that the Auto Scaling group uses to call
   * other AWS service on your behalf. By default, Amazon EC2 Auto Scaling uses a service-linked role
   * named ``AWSServiceRoleForAutoScaling``, which it creates if it does not exist. For more
   * information, see [Service-linked
   * roles](https://docs.aws.amazon.com/autoscaling/ec2/userguide/autoscaling-service-linked-role.html)
   * in the *Amazon EC2 Auto Scaling User Guide*.
   */
  ServiceLinkedRoleARN?: string;
  /** The Availability Zone impairment policy. */
  AvailabilityZoneImpairmentPolicy?: {
    /** If ``true``, enable zonal shift for your Auto Scaling group. */
    ZonalShiftEnabled: boolean;
    /**
     * Specifies the health check behavior for the impaired Availability Zone in an active zonal shift. If
     * you select ``Replace unhealthy``, instances that appear unhealthy will be replaced in all
     * Availability Zones. If you select ``Ignore unhealthy``, instances will not be replaced in the
     * Availability Zone with the active zonal shift. For more information, see [Auto Scaling group zonal
     * shift](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-zonal-shift.html) in
     * the *Amazon EC2 Auto Scaling User Guide*.
     * @enum ["IgnoreUnhealthy","ReplaceUnhealthy"]
     */
    ImpairedZoneHealthCheckBehavior: "IgnoreUnhealthy" | "ReplaceUnhealthy";
  };
  /**
   * The Amazon Resource Names (ARN) of the Elastic Load Balancing target groups to associate with the
   * Auto Scaling group. Instances are registered as targets with the target groups. The target groups
   * receive incoming traffic and route requests to one or more registered targets. For more
   * information, see [Use Elastic Load Balancing to distribute traffic across the instances in your
   * Auto Scaling
   * group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/autoscaling-load-balancer.html) in the
   * *Amazon EC2 Auto Scaling User Guide*.
   * @uniqueItems false
   */
  TargetGroupARNs?: string[];
  /**
   * *Only needed if you use simple scaling policies.*
   * The amount of time, in seconds, between one scaling activity ending and another one starting due
   * to simple scaling policies. For more information, see [Scaling cooldowns for Amazon EC2 Auto
   * Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scaling-cooldowns.html)
   * in the *Amazon EC2 Auto Scaling User Guide*.
   * Default: ``300`` seconds
   */
  Cooldown?: string;
  /**
   * Configures an Auto Scaling group to send notifications when specified events take place.
   * @uniqueItems false
   */
  NotificationConfigurations?: ({
    /** The Amazon Resource Name (ARN) of the Amazon SNS topic. */
    TopicARN: string | unknown[];
    /**
     * A list of event types that send a notification. Event types can include any of the following types.
     * *Allowed values*:
     * +   ``autoscaling:EC2_INSTANCE_LAUNCH``
     * +   ``autoscaling:EC2_INSTANCE_LAUNCH_ERROR``
     * +   ``autoscaling:EC2_INSTANCE_TERMINATE``
     * +   ``autoscaling:EC2_INSTANCE_TERMINATE_ERROR``
     * +   ``autoscaling:TEST_NOTIFICATION``
     * @uniqueItems false
     */
    NotificationTypes?: string[];
  })[];
  /**
   * The desired capacity is the initial capacity of the Auto Scaling group at the time of its creation
   * and the capacity it attempts to maintain. It can scale beyond this capacity if you configure
   * automatic scaling.
   * The number must be greater than or equal to the minimum size of the group and less than or equal
   * to the maximum size of the group. If you do not specify a desired capacity when creating the stack,
   * the default is the minimum size of the group.
   * CloudFormation marks the Auto Scaling group as successful (by setting its status to
   * CREATE_COMPLETE) when the desired capacity is reached. However, if a maximum Spot price is set in
   * the launch template or launch configuration that you specified, then desired capacity is not used
   * as a criteria for success. Whether your request is fulfilled depends on Spot Instance capacity and
   * your maximum price.
   * @pattern ^[0-9]+$
   */
  DesiredCapacity?: string;
  /**
   * The amount of time, in seconds, that Amazon EC2 Auto Scaling waits before checking the health
   * status of an EC2 instance that has come into service and marking it unhealthy due to a failed
   * health check. This is useful if your instances do not immediately pass their health checks after
   * they enter the ``InService`` state. For more information, see [Set the health check grace period
   * for an Auto Scaling
   * group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/health-check-grace-period.html) in the
   * *Amazon EC2 Auto Scaling User Guide*.
   * Default: ``0`` seconds
   */
  HealthCheckGracePeriod?: number;
  /**
   * The amount of time, in seconds, until a new instance is considered to have finished initializing
   * and resource consumption to become stable after it enters the ``InService`` state.
   * During an instance refresh, Amazon EC2 Auto Scaling waits for the warm-up period after it replaces
   * an instance before it moves on to replacing the next instance. Amazon EC2 Auto Scaling also waits
   * for the warm-up period before aggregating the metrics for new instances with existing instances in
   * the Amazon CloudWatch metrics that are used for scaling, resulting in more reliable usage data. For
   * more information, see [Set the default instance warmup for an Auto Scaling
   * group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-default-instance-warmup.html)
   * in the *Amazon EC2 Auto Scaling User Guide*.
   * To manage various warm-up settings at the group level, we recommend that you set the default
   * instance warmup, *even if it is set to 0 seconds*. To remove a value that you previously set,
   * include the property but specify ``-1`` for the value. However, we strongly recommend keeping the
   * default instance warmup enabled by specifying a value of ``0`` or other nominal value.
   * Default: None
   */
  DefaultInstanceWarmup?: number;
  SkipZonalShiftValidation?: boolean;
  /**
   * Indicates whether newly launched instances are protected from termination by Amazon EC2 Auto
   * Scaling when scaling in. For more information about preventing instances from terminating on scale
   * in, see [Use instance scale-in
   * protection](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-instance-protection.html)
   * in the *Amazon EC2 Auto Scaling User Guide*.
   */
  NewInstancesProtectedFromScaleIn?: boolean;
  /**
   * Information used to specify the launch template and version to use to launch instances. You can
   * alternatively associate a launch template to the Auto Scaling group by specifying a
   * ``MixedInstancesPolicy``. For more information about creating launch templates, see [Create a
   * launch template for an Auto Scaling
   * group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-launch-template.html) in the
   * *Amazon EC2 Auto Scaling User Guide*.
   * If you omit this property, you must specify ``MixedInstancesPolicy``, ``LaunchConfigurationName``,
   * or ``InstanceId``.
   */
  LaunchTemplate?: {
    /**
     * The name of the launch template.
     * You must specify the ``LaunchTemplateName`` or the ``LaunchTemplateID``, but not both.
     */
    LaunchTemplateName?: string;
    /**
     * The version number of the launch template.
     * Specifying ``$Latest`` or ``$Default`` for the template version number is not supported. However,
     * you can specify ``LatestVersionNumber`` or ``DefaultVersionNumber`` using the ``Fn::GetAtt``
     * intrinsic function. For more information, see
     * [Fn::GetAtt](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html).
     * For an example of using the ``Fn::GetAtt`` function, see the
     * [Examples](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-autoscaling-autoscalinggroup.html#aws-resource-autoscaling-autoscalinggroup--examples)
     * section of the ``AWS::AutoScaling::AutoScalingGroup`` resource.
     */
    Version: string;
    /**
     * The ID of the launch template.
     * You must specify the ``LaunchTemplateID`` or the ``LaunchTemplateName``, but not both.
     */
    LaunchTemplateId?: string;
  };
  /**
   * An embedded object that specifies a mixed instances policy.
   * The policy includes properties that not only define the distribution of On-Demand Instances and
   * Spot Instances, the maximum price to pay for Spot Instances (optional), and how the Auto Scaling
   * group allocates instance types to fulfill On-Demand and Spot capacities, but also the properties
   * that specify the instance configuration information—the launch template and instance types. The
   * policy can also include a weight for each instance type and different launch templates for
   * individual instance types.
   * For more information, see [Auto Scaling groups with multiple instance types and purchase
   * options](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups.html)
   * in the *Amazon EC2 Auto Scaling User Guide*.
   */
  MixedInstancesPolicy?: {
    /** The instances distribution. */
    InstancesDistribution?: {
      /**
       * The allocation strategy to apply to your On-Demand Instances when they are launched. Possible
       * instance types are determined by the launch template overrides that you specify.
       * The following lists the valid values:
       * + lowest-price Uses price to determine which instance types are the highest priority, launching
       * the lowest priced instance types within an Availability Zone first. This is the default value for
       * Auto Scaling groups that specify InstanceRequirements. + prioritized You set the order of instance
       * types for the launch template overrides from highest to lowest priority (from first to last in the
       * list). Amazon EC2 Auto Scaling launches your highest priority instance types first. If all your
       * On-Demand capacity cannot be fulfilled using your highest priority instance type, then Amazon EC2
       * Auto Scaling launches the remaining capacity using the second priority instance type, and so on.
       * This is the default value for Auto Scaling groups that don't specify InstanceRequirements and
       * cannot be used for groups that do.
       */
      OnDemandAllocationStrategy?: string;
      /**
       * The minimum amount of the Auto Scaling group's capacity that must be fulfilled by On-Demand
       * Instances. This base portion is launched first as your group scales.
       * This number has the same unit of measurement as the group's desired capacity. If you change the
       * default unit of measurement (number of instances) by specifying weighted capacity values in your
       * launch template overrides list, or by changing the default desired capacity type setting of the
       * group, you must specify this number using the same unit of measurement.
       * Default: 0
       * An update to this setting means a gradual replacement of instances to adjust the current
       * On-Demand Instance levels. When replacing instances, Amazon EC2 Auto Scaling launches new instances
       * before terminating the previous ones.
       */
      OnDemandBaseCapacity?: number;
      /**
       * Controls the percentages of On-Demand Instances and Spot Instances for your additional capacity
       * beyond ``OnDemandBaseCapacity``. Expressed as a number (for example, 20 specifies 20% On-Demand
       * Instances, 80% Spot Instances). If set to 100, only On-Demand Instances are used.
       * Default: 100
       * An update to this setting means a gradual replacement of instances to adjust the current
       * On-Demand and Spot Instance levels for your additional capacity higher than the base capacity. When
       * replacing instances, Amazon EC2 Auto Scaling launches new instances before terminating the previous
       * ones.
       */
      OnDemandPercentageAboveBaseCapacity?: number;
      /**
       * The number of Spot Instance pools across which to allocate your Spot Instances. The Spot pools are
       * determined from the different instance types in the overrides. Valid only when the
       * ``SpotAllocationStrategy`` is ``lowest-price``. Value must be in the range of 1–20.
       * Default: 2
       */
      SpotInstancePools?: number;
      /**
       * The allocation strategy to apply to your Spot Instances when they are launched. Possible instance
       * types are determined by the launch template overrides that you specify.
       * The following lists the valid values:
       * + capacity-optimized Requests Spot Instances using pools that are optimally chosen based on the
       * available Spot capacity. This strategy has the lowest risk of interruption. To give certain
       * instance types a higher chance of launching first, use capacity-optimized-prioritized. +
       * capacity-optimized-prioritized You set the order of instance types for the launch template
       * overrides from highest to lowest priority (from first to last in the list). Amazon EC2 Auto Scaling
       * honors the instance type priorities on a best effort basis but optimizes for capacity first. Note
       * that if the On-Demand allocation strategy is set to prioritized, the same priority is applied when
       * fulfilling On-Demand capacity. This is not a valid value for Auto Scaling groups that specify
       * InstanceRequirements. + lowest-price Requests Spot Instances using the lowest priced pools within
       * an Availability Zone, across the number of Spot pools that you specify for the SpotInstancePools
       * property. To ensure that your desired capacity is met, you might receive Spot Instances from
       * several pools. This is the default value, but it might lead to high interruption rates because this
       * strategy only considers instance price and not available capacity. + price-capacity-optimized
       * (recommended) The price and capacity optimized allocation strategy looks at both price and capacity
       * to select the Spot Instance pools that are the least likely to be interrupted and have the lowest
       * possible price.
       */
      SpotAllocationStrategy?: string;
      /**
       * The maximum price per unit hour that you are willing to pay for a Spot Instance. If your maximum
       * price is lower than the Spot price for the instance types that you selected, your Spot Instances
       * are not launched. We do not recommend specifying a maximum price because it can lead to increased
       * interruptions. When Spot Instances launch, you pay the current Spot price. To remove a maximum
       * price that you previously set, include the property but specify an empty string ("") for the value.
       * If you specify a maximum price, your instances will be interrupted more frequently than if you do
       * not specify one.
       * Valid Range: Minimum value of 0.001
       */
      SpotMaxPrice?: string;
    };
    /**
     * One or more launch templates and the instance types (overrides) that are used to launch EC2
     * instances to fulfill On-Demand and Spot capacities.
     */
    LaunchTemplate: {
      /** The launch template. */
      LaunchTemplateSpecification: {
        /**
         * The name of the launch template.
         * You must specify the ``LaunchTemplateName`` or the ``LaunchTemplateID``, but not both.
         */
        LaunchTemplateName?: string;
        /**
         * The version number of the launch template.
         * Specifying ``$Latest`` or ``$Default`` for the template version number is not supported. However,
         * you can specify ``LatestVersionNumber`` or ``DefaultVersionNumber`` using the ``Fn::GetAtt``
         * intrinsic function. For more information, see
         * [Fn::GetAtt](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html).
         * For an example of using the ``Fn::GetAtt`` function, see the
         * [Examples](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-autoscaling-autoscalinggroup.html#aws-resource-autoscaling-autoscalinggroup--examples)
         * section of the ``AWS::AutoScaling::AutoScalingGroup`` resource.
         */
        Version: string;
        /**
         * The ID of the launch template.
         * You must specify the ``LaunchTemplateID`` or the ``LaunchTemplateName``, but not both.
         */
        LaunchTemplateId?: string;
      };
      /**
       * Any properties that you specify override the same properties in the launch template.
       * @uniqueItems false
       */
      Overrides?: ({
        /**
         * Provides a launch template for the specified instance type or set of instance requirements. For
         * example, some instance types might require a launch template with a different AMI. If not provided,
         * Amazon EC2 Auto Scaling uses the launch template that's specified in the ``LaunchTemplate``
         * definition. For more information, see [Specifying a different launch template for an instance
         * type](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups-launch-template-overrides.html)
         * in the *Amazon EC2 Auto Scaling User Guide*.
         * You can specify up to 20 launch templates per Auto Scaling group. The launch templates specified
         * in the overrides and in the ``LaunchTemplate`` definition count towards this limit.
         */
        LaunchTemplateSpecification?: {
          /**
           * The name of the launch template.
           * You must specify the ``LaunchTemplateName`` or the ``LaunchTemplateID``, but not both.
           */
          LaunchTemplateName?: string;
          /**
           * The version number of the launch template.
           * Specifying ``$Latest`` or ``$Default`` for the template version number is not supported. However,
           * you can specify ``LatestVersionNumber`` or ``DefaultVersionNumber`` using the ``Fn::GetAtt``
           * intrinsic function. For more information, see
           * [Fn::GetAtt](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-getatt.html).
           * For an example of using the ``Fn::GetAtt`` function, see the
           * [Examples](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-autoscaling-autoscalinggroup.html#aws-resource-autoscaling-autoscalinggroup--examples)
           * section of the ``AWS::AutoScaling::AutoScalingGroup`` resource.
           */
          Version: string;
          /**
           * The ID of the launch template.
           * You must specify the ``LaunchTemplateID`` or the ``LaunchTemplateName``, but not both.
           */
          LaunchTemplateId?: string;
        };
        /**
         * If you provide a list of instance types to use, you can specify the number of capacity units
         * provided by each instance type in terms of virtual CPUs, memory, storage, throughput, or other
         * relative performance characteristic. When a Spot or On-Demand Instance is launched, the capacity
         * units count toward the desired capacity. Amazon EC2 Auto Scaling launches instances until the
         * desired capacity is totally fulfilled, even if this results in an overage. For example, if there
         * are two units remaining to fulfill capacity, and Amazon EC2 Auto Scaling can only launch an
         * instance with a ``WeightedCapacity`` of five units, the instance is launched, and the desired
         * capacity is exceeded by three units. For more information, see [Configure instance weighting for
         * Amazon EC2 Auto
         * Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-mixed-instances-groups-instance-weighting.html)
         * in the *Amazon EC2 Auto Scaling User Guide*. Value must be in the range of 1-999.
         * If you specify a value for ``WeightedCapacity`` for one instance type, you must specify a value
         * for ``WeightedCapacity`` for all of them.
         * Every Auto Scaling group has three size parameters (``DesiredCapacity``, ``MaxSize``, and
         * ``MinSize``). Usually, you set these sizes based on a specific number of instances. However, if you
         * configure a mixed instances policy that defines weights for the instance types, you must specify
         * these sizes with the same units that you use for weighting instances.
         */
        WeightedCapacity?: string;
        /**
         * The instance requirements. Amazon EC2 Auto Scaling uses your specified requirements to identify
         * instance types. Then, it uses your On-Demand and Spot allocation strategies to launch instances
         * from these instance types.
         * You can specify up to four separate sets of instance requirements per Auto Scaling group. This is
         * useful for provisioning instances from different Amazon Machine Images (AMIs) in the same Auto
         * Scaling group. To do this, create the AMIs and create a new launch template for each AMI. Then,
         * create a compatible set of instance requirements for each launch template.
         * If you specify ``InstanceRequirements``, you can't specify ``InstanceType``.
         */
        InstanceRequirements?: {
          /**
           * Indicates whether current or previous generation instance types are included.
           * +  For current generation instance types, specify ``current``. The current generation includes
           * EC2 instance types currently recommended for use. This typically includes the latest two to three
           * generations in each instance family. For more information, see [Instance
           * types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html) in the *Amazon EC2
           * User Guide*.
           * +  For previous generation instance types, specify ``previous``.
           * Default: Any current or previous generation
           * @uniqueItems true
           */
          InstanceGenerations?: string[];
          /**
           * Lists the accelerator types that must be on an instance type.
           * +  For instance types with GPU accelerators, specify ``gpu``.
           * +  For instance types with FPGA accelerators, specify ``fpga``.
           * +  For instance types with inference accelerators, specify ``inference``.
           * Default: Any accelerator type
           * @uniqueItems true
           */
          AcceleratorTypes?: string[];
          /**
           * The minimum and maximum amount of memory per vCPU for an instance type, in GiB.
           * Default: No minimum or maximum limits
           */
          MemoryGiBPerVCpu?: {
            /** The memory minimum in GiB. */
            Min?: number;
            /** The memory maximum in GiB. */
            Max?: number;
          };
          /**
           * Indicates whether instance types must have accelerators by specific manufacturers.
           * +  For instance types with NVIDIA devices, specify ``nvidia``.
           * +  For instance types with AMD devices, specify ``amd``.
           * +  For instance types with AWS devices, specify ``amazon-web-services``.
           * +  For instance types with Xilinx devices, specify ``xilinx``.
           * Default: Any manufacturer
           * @uniqueItems true
           */
          AcceleratorManufacturers?: string[];
          /** The minimum and maximum number of vCPUs for an instance type. */
          VCpuCount: {
            /** The minimum number of vCPUs. */
            Min?: number;
            /** The maximum number of vCPUs. */
            Max?: number;
          };
          /**
           * Indicates whether instance types with instance store volumes are included, excluded, or required.
           * For more information, see [Amazon EC2 instance
           * store](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html) in the *Amazon EC2
           * User Guide*.
           * Default: ``included``
           */
          LocalStorage?: string;
          /**
           * Lists which specific CPU manufacturers to include.
           * +  For instance types with Intel CPUs, specify ``intel``.
           * +  For instance types with AMD CPUs, specify ``amd``.
           * +  For instance types with AWS CPUs, specify ``amazon-web-services``.
           * +  For instance types with Apple CPUs, specify ``apple``.
           * Don't confuse the CPU hardware manufacturer with the CPU hardware architecture. Instances will be
           * launched with a compatible CPU architecture based on the Amazon Machine Image (AMI) that you
           * specify in your launch template.
           * Default: Any manufacturer
           * @uniqueItems true
           */
          CpuManufacturers?: string[];
          /**
           * Indicates whether bare metal instance types are included, excluded, or required.
           * Default: ``excluded``
           */
          BareMetal?: string;
          /**
           * Indicates whether instance types must provide On-Demand Instance hibernation support.
           * Default: ``false``
           */
          RequireHibernateSupport?: boolean;
          /**
           * [Price protection] The price protection threshold for Spot Instances, as a percentage of an
           * identified On-Demand price. The identified On-Demand price is the price of the lowest priced
           * current generation C, M, or R instance type with your specified attributes. If no current
           * generation C, M, or R instance type matches your attributes, then the identified price is from
           * either the lowest priced current generation instance types or, failing that, the lowest priced
           * previous generation instance types that match your attributes. When Amazon EC2 Auto Scaling selects
           * instance types with your attributes, we will exclude instance types whose price exceeds your
           * specified threshold.
           * The parameter accepts an integer, which Amazon EC2 Auto Scaling interprets as a percentage.
           * If you set ``DesiredCapacityType`` to ``vcpu`` or ``memory-mib``, the price protection threshold
           * is based on the per-vCPU or per-memory price instead of the per instance price.
           * Only one of ``SpotMaxPricePercentageOverLowestPrice`` or
           * ``MaxSpotPriceAsPercentageOfOptimalOnDemandPrice`` can be specified. If you don't specify either,
           * Amazon EC2 Auto Scaling will automatically apply optimal price protection to consistently select
           * from a wide range of instance types. To indicate no price protection threshold for Spot Instances,
           * meaning you want to consider all instance types that match your attributes, include one of these
           * parameters and specify a high value, such as ``999999``.
           */
          MaxSpotPriceAsPercentageOfOptimalOnDemandPrice?: number;
          /**
           * [Price protection] The price protection threshold for On-Demand Instances, as a percentage higher
           * than an identified On-Demand price. The identified On-Demand price is the price of the lowest
           * priced current generation C, M, or R instance type with your specified attributes. If no current
           * generation C, M, or R instance type matches your attributes, then the identified price is from
           * either the lowest priced current generation instance types or, failing that, the lowest priced
           * previous generation instance types that match your attributes. When Amazon EC2 Auto Scaling selects
           * instance types with your attributes, we will exclude instance types whose price exceeds your
           * specified threshold.
           * The parameter accepts an integer, which Amazon EC2 Auto Scaling interprets as a percentage.
           * To turn off price protection, specify a high value, such as ``999999``.
           * If you set ``DesiredCapacityType`` to ``vcpu`` or ``memory-mib``, the price protection threshold
           * is applied based on the per-vCPU or per-memory price instead of the per instance price.
           * Default: ``20``
           */
          OnDemandMaxPricePercentageOverLowestPrice?: number;
          /** The minimum and maximum instance memory size for an instance type, in MiB. */
          MemoryMiB: {
            /** The memory minimum in MiB. */
            Min?: number;
            /** The memory maximum in MiB. */
            Max?: number;
          };
          /**
           * Indicates the type of local storage that is required.
           * +  For instance types with hard disk drive (HDD) storage, specify ``hdd``.
           * +  For instance types with solid state drive (SSD) storage, specify ``ssd``.
           * Default: Any local storage type
           * @uniqueItems true
           */
          LocalStorageTypes?: string[];
          /**
           * The minimum and maximum number of network interfaces for an instance type.
           * Default: No minimum or maximum limits
           */
          NetworkInterfaceCount?: {
            /** The minimum number of network interfaces. */
            Min?: number;
            /** The maximum number of network interfaces. */
            Max?: number;
          };
          /**
           * The instance types to exclude. You can use strings with one or more wild cards, represented by an
           * asterisk (``*``), to exclude an instance family, type, size, or generation. The following are
           * examples: ``m5.8xlarge``, ``c5*.*``, ``m5a.*``, ``r*``, ``*3*``.
           * For example, if you specify ``c5*``, you are excluding the entire C5 instance family, which
           * includes all C5a and C5n instance types. If you specify ``m5a.*``, Amazon EC2 Auto Scaling will
           * exclude all the M5a instance types, but not the M5n instance types.
           * If you specify ``ExcludedInstanceTypes``, you can't specify ``AllowedInstanceTypes``.
           * Default: No excluded instance types
           * @uniqueItems true
           */
          ExcludedInstanceTypes?: string[];
          /**
           * The instance types to apply your specified attributes against. All other instance types are
           * ignored, even if they match your specified attributes.
           * You can use strings with one or more wild cards, represented by an asterisk (``*``), to allow an
           * instance type, size, or generation. The following are examples: ``m5.8xlarge``, ``c5*.*``,
           * ``m5a.*``, ``r*``, ``*3*``.
           * For example, if you specify ``c5*``, Amazon EC2 Auto Scaling will allow the entire C5 instance
           * family, which includes all C5a and C5n instance types. If you specify ``m5a.*``, Amazon EC2 Auto
           * Scaling will allow all the M5a instance types, but not the M5n instance types.
           * If you specify ``AllowedInstanceTypes``, you can't specify ``ExcludedInstanceTypes``.
           * Default: All instance types
           * @uniqueItems true
           */
          AllowedInstanceTypes?: string[];
          /**
           * The minimum and maximum number of accelerators (GPUs, FPGAs, or AWS Inferentia chips) for an
           * instance type.
           * To exclude accelerator-enabled instance types, set ``Max`` to ``0``.
           * Default: No minimum or maximum limits
           */
          AcceleratorCount?: {
            /** The minimum value. */
            Min?: number;
            /** The maximum value. */
            Max?: number;
          };
          /**
           * The minimum and maximum amount of network bandwidth, in gigabits per second (Gbps).
           * Default: No minimum or maximum limits
           */
          NetworkBandwidthGbps?: {
            /** The minimum amount of network bandwidth, in gigabits per second (Gbps). */
            Min?: number;
            /** The maximum amount of network bandwidth, in gigabits per second (Gbps). */
            Max?: number;
          };
          /** The baseline performance factors for the instance requirements. */
          BaselinePerformanceFactors?: {
            /** The CPU performance to consider, using an instance family as the baseline reference. */
            Cpu?: {
              /**
               * Specify an instance family to use as the baseline reference for CPU performance. All instance types
               * that match your specified attributes will be compared against the CPU performance of the referenced
               * instance family, regardless of CPU manufacturer or architecture differences.
               * Currently only one instance family can be specified in the list.
               */
              References?: ({
                /**
                 * The instance family to use as a baseline reference.
                 * Make sure that you specify the correct value for the instance family. The instance family is
                 * everything before the period (.) in the instance type name. For example, in the instance
                 * ``c6i.large``, the instance family is ``c6i``, not ``c6``. For more information, see [Amazon EC2
                 * instance type naming
                 * conventions](https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-type-names.html) in
                 * *Amazon EC2 Instance Types*.
                 * The following instance types are *not supported* for performance protection.
                 * +   ``c1``
                 * +   ``g3| g3s``
                 * +   ``hpc7g``
                 * +   ``m1| m2``
                 * +   ``mac1 | mac2 | mac2-m1ultra | mac2-m2 | mac2-m2pro``
                 * +   ``p3dn | p4d | p5``
                 * +   ``t1``
                 * +   ``u-12tb1 | u-18tb1 | u-24tb1 | u-3tb1 | u-6tb1 | u-9tb1 | u7i-12tb | u7in-16tb | u7in-24tb |
                 * u7in-32tb``
                 * If you performance protection by specifying a supported instance family, the returned instance
                 * types will exclude the preceding unsupported instance families.
                 * If you specify an unsupported instance family as a value for baseline performance, the API returns
                 * an empty response.
                 */
                InstanceFamily?: string;
              })[];
            };
          };
          /**
           * The minimum and maximum baseline bandwidth performance for an instance type, in Mbps. For more
           * information, see [Amazon EBS–optimized
           * instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-optimized.html) in the *Amazon
           * EC2 User Guide*.
           * Default: No minimum or maximum limits
           */
          BaselineEbsBandwidthMbps?: {
            /** The minimum value in Mbps. */
            Min?: number;
            /** The maximum value in Mbps. */
            Max?: number;
          };
          /**
           * [Price protection] The price protection threshold for Spot Instances, as a percentage higher than
           * an identified Spot price. The identified Spot price is the price of the lowest priced current
           * generation C, M, or R instance type with your specified attributes. If no current generation C, M,
           * or R instance type matches your attributes, then the identified price is from either the lowest
           * priced current generation instance types or, failing that, the lowest priced previous generation
           * instance types that match your attributes. When Amazon EC2 Auto Scaling selects instance types with
           * your attributes, we will exclude instance types whose price exceeds your specified threshold.
           * The parameter accepts an integer, which Amazon EC2 Auto Scaling interprets as a percentage.
           * If you set ``DesiredCapacityType`` to ``vcpu`` or ``memory-mib``, the price protection threshold
           * is based on the per-vCPU or per-memory price instead of the per instance price.
           * Only one of ``SpotMaxPricePercentageOverLowestPrice`` or
           * ``MaxSpotPriceAsPercentageOfOptimalOnDemandPrice`` can be specified. If you don't specify either,
           * Amazon EC2 Auto Scaling will automatically apply optimal price protection to consistently select
           * from a wide range of instance types. To indicate no price protection threshold for Spot Instances,
           * meaning you want to consider all instance types that match your attributes, include one of these
           * parameters and specify a high value, such as ``999999``.
           */
          SpotMaxPricePercentageOverLowestPrice?: number;
          /**
           * Lists the accelerators that must be on an instance type.
           * +  For instance types with NVIDIA A100 GPUs, specify ``a100``.
           * +  For instance types with NVIDIA V100 GPUs, specify ``v100``.
           * +  For instance types with NVIDIA K80 GPUs, specify ``k80``.
           * +  For instance types with NVIDIA T4 GPUs, specify ``t4``.
           * +  For instance types with NVIDIA M60 GPUs, specify ``m60``.
           * +  For instance types with AMD Radeon Pro V520 GPUs, specify ``radeon-pro-v520``.
           * +  For instance types with Xilinx VU9P FPGAs, specify ``vu9p``.
           * Default: Any accelerator
           * @uniqueItems true
           */
          AcceleratorNames?: string[];
          /**
           * The minimum and maximum total memory size for the accelerators on an instance type, in MiB.
           * Default: No minimum or maximum limits
           */
          AcceleratorTotalMemoryMiB?: {
            /** The memory minimum in MiB. */
            Min?: number;
            /** The memory maximum in MiB. */
            Max?: number;
          };
          /**
           * Indicates whether burstable performance instance types are included, excluded, or required. For
           * more information, see [Burstable performance
           * instances](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances.html)
           * in the *Amazon EC2 User Guide*.
           * Default: ``excluded``
           */
          BurstablePerformance?: string;
          /**
           * The minimum and maximum total local storage size for an instance type, in GB.
           * Default: No minimum or maximum limits
           */
          TotalLocalStorageGB?: {
            /** The storage minimum in GB. */
            Min?: number;
            /** The storage maximum in GB. */
            Max?: number;
          };
        };
        /**
         * The instance type, such as ``m3.xlarge``. You must specify an instance type that is supported in
         * your requested Region and Availability Zones. For more information, see [Instance
         * types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html) in the *Amazon EC2
         * User Guide*.
         * You can specify up to 40 instance types per Auto Scaling group.
         */
        InstanceType?: string;
      })[];
    };
  };
  /**
   * A list of subnet IDs for a virtual private cloud (VPC) where instances in the Auto Scaling group
   * can be created.
   * If this resource specifies public subnets and is also in a VPC that is defined in the same stack
   * template, you must use the [DependsOn
   * attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-dependson.html)
   * to declare a dependency on the [VPC-gateway
   * attachment](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-vpc-gateway-attachment.html).
   * When you update ``VPCZoneIdentifier``, this retains the same Auto Scaling group and replaces old
   * instances with new ones, according to the specified subnets. You can optionally specify how
   * CloudFormation handles these updates by using an [UpdatePolicy
   * attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-updatepolicy.html).
   * Required to launch instances into a nondefault VPC. If you specify ``VPCZoneIdentifier`` with
   * ``AvailabilityZones``, the subnets that you specify for this property must reside in those
   * Availability Zones.
   * @uniqueItems false
   */
  VPCZoneIdentifier?: string[];
  /**
   * One or more tags. You can tag your Auto Scaling group and propagate the tags to the Amazon EC2
   * instances it launches. Tags are not propagated to Amazon EBS volumes. To add tags to Amazon EBS
   * volumes, specify the tags in a launch template but use caution. If the launch template specifies an
   * instance tag with a key that is also specified for the Auto Scaling group, Amazon EC2 Auto Scaling
   * overrides the value of that instance tag with the value specified by the Auto Scaling group. For
   * more information, see [Tag Auto Scaling groups and
   * instances](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-tagging.html) in
   * the *Amazon EC2 Auto Scaling User Guide*.
   */
  Tags?: {
    /** The tag value. */
    Value: string;
    /** The tag key. */
    Key: string;
    /**
     * Set to ``true`` if you want CloudFormation to copy the tag to EC2 instances that are launched as
     * part of the Auto Scaling group. Set to ``false`` if you want the tag attached only to the Auto
     * Scaling group and not copied to any instances launched as part of the Auto Scaling group.
     */
    PropagateAtLaunch: boolean;
  }[];
  /** Reserved. */
  Context?: string;
  /**
   * Indicates whether Capacity Rebalancing is enabled. Otherwise, Capacity Rebalancing is disabled.
   * When you turn on Capacity Rebalancing, Amazon EC2 Auto Scaling attempts to launch a Spot Instance
   * whenever Amazon EC2 notifies that a Spot Instance is at an elevated risk of interruption. After
   * launching a new instance, it then terminates an old instance. For more information, see [Use
   * Capacity Rebalancing to handle Amazon EC2 Spot
   * Interruptions](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-capacity-rebalancing.html)
   * in the in the *Amazon EC2 Auto Scaling User Guide*.
   */
  CapacityRebalance?: boolean;
  /**
   * The ID of the instance used to base the launch configuration on. For more information, see [Create
   * an Auto Scaling group using an EC2
   * instance](https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-asg-from-instance.html) in
   * the *Amazon EC2 Auto Scaling User Guide*.
   * If you specify ``LaunchTemplate``, ``MixedInstancesPolicy``, or ``LaunchConfigurationName``, don't
   * specify ``InstanceId``.
   */
  InstanceId?: string;
  AutoScalingGroupARN?: string;
  /**
   * A list of Availability Zones where instances in the Auto Scaling group can be created. Used for
   * launching into the default VPC subnet in each Availability Zone when not using the
   * ``VPCZoneIdentifier`` property, or for attaching a network interface when an existing network
   * interface ID is specified in a launch template.
   * @uniqueItems false
   */
  AvailabilityZones?: string[];
  NotificationConfiguration?: {
    /** The Amazon Resource Name (ARN) of the Amazon SNS topic. */
    TopicARN: string | unknown[];
    /**
     * A list of event types that send a notification. Event types can include any of the following types.
     * *Allowed values*:
     * +   ``autoscaling:EC2_INSTANCE_LAUNCH``
     * +   ``autoscaling:EC2_INSTANCE_LAUNCH_ERROR``
     * +   ``autoscaling:EC2_INSTANCE_TERMINATE``
     * +   ``autoscaling:EC2_INSTANCE_TERMINATE_ERROR``
     * +   ``autoscaling:TEST_NOTIFICATION``
     * @uniqueItems false
     */
    NotificationTypes?: string[];
  };
  /** The instance capacity distribution across Availability Zones. */
  AvailabilityZoneDistribution?: {
    /**
     * If launches fail in an Availability Zone, the following strategies are available. The default is
     * ``balanced-best-effort``.
     * +  ``balanced-only`` - If launches fail in an Availability Zone, Auto Scaling will continue to
     * attempt to launch in the unhealthy zone to preserve a balanced distribution.
     * +  ``balanced-best-effort`` - If launches fail in an Availability Zone, Auto Scaling will attempt
     * to launch in another healthy Availability Zone instead.
     * @enum ["balanced-best-effort","balanced-only"]
     */
    CapacityDistributionStrategy?: "balanced-best-effort" | "balanced-only";
  };
  /**
   * Enables the monitoring of group metrics of an Auto Scaling group. By default, these metrics are
   * disabled.
   * @uniqueItems false
   */
  MetricsCollection?: {
    /**
     * Identifies the metrics to enable.
     * You can specify one or more of the following metrics:
     * +   ``GroupMinSize``
     * +   ``GroupMaxSize``
     * +   ``GroupDesiredCapacity``
     * +   ``GroupInServiceInstances``
     * +   ``GroupPendingInstances``
     * +   ``GroupStandbyInstances``
     * +   ``GroupTerminatingInstances``
     * +   ``GroupTotalInstances``
     * +   ``GroupInServiceCapacity``
     * +   ``GroupPendingCapacity``
     * +   ``GroupStandbyCapacity``
     * +   ``GroupTerminatingCapacity``
     * +   ``GroupTotalCapacity``
     * +   ``WarmPoolDesiredCapacity``
     * +   ``WarmPoolWarmedCapacity``
     * +   ``WarmPoolPendingCapacity``
     * +   ``WarmPoolTerminatingCapacity``
     * +   ``WarmPoolTotalCapacity``
     * +   ``GroupAndWarmPoolDesiredCapacity``
     * +   ``GroupAndWarmPoolTotalCapacity``
     * If you specify ``Granularity`` and don't specify any metrics, all metrics are enabled.
     * For more information, see [Amazon CloudWatch metrics for Amazon EC2 Auto
     * Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-metrics.html) in
     * the *Amazon EC2 Auto Scaling User Guide*.
     * @uniqueItems false
     */
    Metrics?: string[];
    /**
     * The frequency at which Amazon EC2 Auto Scaling sends aggregated data to CloudWatch. The only valid
     * value is ``1Minute``.
     */
    Granularity: string;
  }[];
  /**
   * An instance maintenance policy. For more information, see [Set instance maintenance
   * policy](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-instance-maintenance-policy.html)
   * in the *Amazon EC2 Auto Scaling User Guide*.
   */
  InstanceMaintenancePolicy?: {
    /**
     * Specifies the upper threshold as a percentage of the desired capacity of the Auto Scaling group. It
     * represents the maximum percentage of the group that can be in service and healthy, or pending, to
     * support your workload when replacing instances. Value range is 100 to 200. To clear a previously
     * set value, specify a value of ``-1``.
     * Both ``MinHealthyPercentage`` and ``MaxHealthyPercentage`` must be specified, and the difference
     * between them cannot be greater than 100. A large range increases the number of instances that can
     * be replaced at the same time.
     */
    MaxHealthyPercentage?: number;
    /**
     * Specifies the lower threshold as a percentage of the desired capacity of the Auto Scaling group. It
     * represents the minimum percentage of the group to keep in service, healthy, and ready to use to
     * support your workload when replacing instances. Value range is 0 to 100. To clear a previously set
     * value, specify a value of ``-1``.
     */
    MinHealthyPercentage?: number;
  };
  /**
   * The maximum size of the group.
   * With a mixed instances policy that uses instance weighting, Amazon EC2 Auto Scaling may need to
   * go above ``MaxSize`` to meet your capacity requirements. In this event, Amazon EC2 Auto Scaling
   * will never go above ``MaxSize`` by more than your largest instance weight (weights that define how
   * many units each instance contributes to the desired capacity of the group).
   * @pattern ^[0-9]+$
   */
  MaxSize: string;
  /**
   * The minimum size of the group.
   * @pattern ^[0-9]+$
   */
  MinSize: string;
  /**
   * A policy or a list of policies that are used to select the instance to terminate. These policies
   * are executed in the order that you list them. For more information, see [Configure termination
   * policies for Amazon EC2 Auto
   * Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-termination-policies.html)
   * in the *Amazon EC2 Auto Scaling User Guide*.
   * Valid values: ``Default`` | ``AllocationStrategy`` | ``ClosestToNextInstanceHour`` |
   * ``NewestInstance`` | ``OldestInstance`` | ``OldestLaunchConfiguration`` | ``OldestLaunchTemplate``
   * | ``arn:aws:lambda:region:account-id:function:my-function:my-alias``
   * @uniqueItems false
   */
  TerminationPolicies?: string[];
  /**
   * The name of the Auto Scaling group. This name must be unique per Region per account.
   * The name can contain any ASCII character 33 to 126 including most punctuation characters, digits,
   * and upper and lowercased letters.
   * You cannot use a colon (:) in the name.
   */
  AutoScalingGroupName?: string;
  /**
   * The traffic sources associated with this Auto Scaling group.
   * @uniqueItems true
   */
  TrafficSources?: {
    /**
     * Provides additional context for the value of ``Identifier``.
     * The following lists the valid values:
     * +  ``elb`` if ``Identifier`` is the name of a Classic Load Balancer.
     * +  ``elbv2`` if ``Identifier`` is the ARN of an Application Load Balancer, Gateway Load Balancer,
     * or Network Load Balancer target group.
     * +  ``vpc-lattice`` if ``Identifier`` is the ARN of a VPC Lattice target group.
     * Required if the identifier is the name of a Classic Load Balancer.
     */
    Type: string;
    /**
     * Identifies the traffic source.
     * For Application Load Balancers, Gateway Load Balancers, Network Load Balancers, and VPC Lattice,
     * this will be the Amazon Resource Name (ARN) for a target group in this account and Region. For
     * Classic Load Balancers, this will be the name of the Classic Load Balancer in this account and
     * Region.
     * For example:
     * +  Application Load Balancer ARN:
     * ``arn:aws:elasticloadbalancing:us-west-2:123456789012:targetgroup/my-targets/1234567890123456``
     * +  Classic Load Balancer name: ``my-classic-load-balancer``
     * +  VPC Lattice ARN:
     * ``arn:aws:vpc-lattice:us-west-2:123456789012:targetgroup/tg-1234567890123456``
     * To get the ARN of a target group for a Application Load Balancer, Gateway Load Balancer, or
     * Network Load Balancer, or the name of a Classic Load Balancer, use the Elastic Load Balancing
     * [DescribeTargetGroups](https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_DescribeTargetGroups.html)
     * and
     * [DescribeLoadBalancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/APIReference/API_DescribeLoadBalancers.html)
     * API operations.
     * To get the ARN of a target group for VPC Lattice, use the VPC Lattice
     * [GetTargetGroup](https://docs.aws.amazon.com/vpc-lattice/latest/APIReference/API_GetTargetGroup.html)
     * API operation.
     */
    Identifier: string;
  }[];
  /**
   * The unit of measurement for the value specified for desired capacity. Amazon EC2 Auto Scaling
   * supports ``DesiredCapacityType`` for attribute-based instance type selection only. For more
   * information, see [Create a mixed instances group using attribute-based instance type
   * selection](https://docs.aws.amazon.com/autoscaling/ec2/userguide/create-mixed-instances-group-attribute-based-instance-type-selection.html)
   * in the *Amazon EC2 Auto Scaling User Guide*.
   * By default, Amazon EC2 Auto Scaling specifies ``units``, which translates into number of
   * instances.
   * Valid values: ``units`` | ``vcpu`` | ``memory-mib``
   */
  DesiredCapacityType?: string;
  /**
   * The name of the placement group into which to launch your instances. For more information, see
   * [Placement groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html) in
   * the *Amazon EC2 User Guide*.
   * A *cluster* placement group is a logical grouping of instances within a single Availability Zone.
   * You cannot specify multiple Availability Zones and a cluster placement group.
   */
  PlacementGroup?: string;
  /** The capacity reservation specification. */
  CapacityReservationSpecification?: {
    /**
     * The capacity reservation preference. The following options are available:
     * +  ``capacity-reservations-only`` - Auto Scaling will only launch instances into a Capacity
     * Reservation or Capacity Reservation resource group. If capacity isn't available, instances will
     * fail to launch.
     * +  ``capacity-reservations-first`` - Auto Scaling will try to launch instances into a Capacity
     * Reservation or Capacity Reservation resource group first. If capacity isn't available, instances
     * will run in On-Demand capacity.
     * +  ``none`` - Auto Scaling will not launch instances into a Capacity Reservation. Instances will
     * run in On-Demand capacity.
     * +  ``default`` - Auto Scaling uses the Capacity Reservation preference from your launch template
     * or an open Capacity Reservation.
     */
    CapacityReservationPreference: string;
    /** Describes a target Capacity Reservation or Capacity Reservation resource group. */
    CapacityReservationTarget?: {
      /** The Capacity Reservation IDs to launch instances into. */
      CapacityReservationIds?: string[];
      /** The resource group ARNs of the Capacity Reservation to launch instances into. */
      CapacityReservationResourceGroupArns?: string[];
    };
  };
  /**
   * A comma-separated value string of one or more health check types.
   * The valid values are ``EC2``, ``EBS``, ``ELB``, and ``VPC_LATTICE``. ``EC2`` is the default health
   * check and cannot be disabled. For more information, see [Health checks for instances in an Auto
   * Scaling
   * group](https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-health-checks.html)
   * in the *Amazon EC2 Auto Scaling User Guide*.
   * Only specify ``EC2`` if you must clear a value that was previously set.
   */
  HealthCheckType?: string;
  /**
   * The maximum amount of time, in seconds, that an instance can be in service. The default is null. If
   * specified, the value must be either 0 or a number equal to or greater than 86,400 seconds (1 day).
   * For more information, see [Replace Auto Scaling instances based on maximum instance
   * lifetime](https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-max-instance-lifetime.html) in
   * the *Amazon EC2 Auto Scaling User Guide*.
   */
  MaxInstanceLifetime?: number;
};


/** Resource Type definition for AWS::ECS::CapacityProvider. */
export type AwsEcsCapacityprovider = {
  AutoScalingGroupProvider?: {
    ManagedScaling?: {
      /** @enum ["DISABLED","ENABLED"] */
      Status?: "DISABLED" | "ENABLED";
      MinimumScalingStepSize?: number;
      InstanceWarmupPeriod?: number;
      TargetCapacity?: number;
      MaximumScalingStepSize?: number;
    };
    AutoScalingGroupArn: string;
    /** @enum ["DISABLED","ENABLED"] */
    ManagedTerminationProtection?: "DISABLED" | "ENABLED";
    /** @enum ["DISABLED","ENABLED"] */
    ManagedDraining?: "DISABLED" | "ENABLED";
  };
  ClusterName?: string;
  Tags?: {
    /** @minLength 1 */
    Value?: string;
    /** @minLength 1 */
    Key?: string;
  }[];
  Name?: string;
  ManagedInstancesProvider?: {
    InfrastructureRoleArn: string;
    /** @enum ["CAPACITY_PROVIDER","NONE"] */
    PropagateTags?: "CAPACITY_PROVIDER" | "NONE";
    /**
     * Defines how Amazon ECS Managed Instances optimizes the infrastructure in your capacity provider.
     * Configure it to turn on or off the infrastructure optimization in your capacity provider, and to
     * control the idle EC2 instances optimization delay.
     */
    InfrastructureOptimization?: {
      /**
       * This parameter defines the number of seconds Amazon ECS Managed Instances waits before optimizing
       * EC2 instances that have become idle or underutilized. A longer delay increases the likelihood of
       * placing new tasks on idle instances, reducing startup time. A shorter delay helps reduce
       * infrastructure costs by optimizing idle instances more quickly. Valid values are: Not set (null) -
       * Uses the default optimization behavior, `-1` - Disables automatic infrastructure optimization, `0`
       * to `3600` (inclusive) - Specifies the number of seconds to wait before optimizing instances.
       * @minimum -1
       * @maximum 3600
       */
      ScaleInAfter?: number;
    };
    InstanceLaunchTemplate: {
      Ec2InstanceProfileArn: string;
      StorageConfiguration?: {
        StorageSizeGiB: number;
      };
      NetworkConfiguration: {
        SecurityGroups?: string[];
        Subnets: string[];
      };
      InstanceRequirements?: {
        /** @uniqueItems false */
        LocalStorageTypes?: ("hdd" | "ssd")[];
        /** @uniqueItems false */
        InstanceGenerations?: ("current" | "previous")[];
        NetworkInterfaceCount?: {
          Min?: number;
          Max?: number;
        };
        MemoryGiBPerVCpu?: {
          Min?: number;
          Max?: number;
        };
        /** @uniqueItems false */
        AcceleratorTypes?: ("gpu" | "fpga" | "inference")[];
        VCpuCount: {
          Min: number;
          Max?: number;
        };
        /** @uniqueItems false */
        ExcludedInstanceTypes?: string[];
        /** @uniqueItems false */
        AcceleratorManufacturers?: ("amazon-web-services" | "amd" | "habana" | "nvidia" | "xilinx")[];
        /** @uniqueItems false */
        AllowedInstanceTypes?: string[];
        /** @enum ["included","required","excluded"] */
        LocalStorage?: "included" | "required" | "excluded";
        /** @uniqueItems false */
        CpuManufacturers?: ("intel" | "amd" | "amazon-web-services")[];
        NetworkBandwidthGbps?: {
          Min?: number;
          Max?: number;
        };
        AcceleratorCount?: {
          Min?: number;
          Max?: number;
        };
        /** @enum ["included","required","excluded"] */
        BareMetal?: "included" | "required" | "excluded";
        RequireHibernateSupport?: boolean;
        MaxSpotPriceAsPercentageOfOptimalOnDemandPrice?: number;
        SpotMaxPricePercentageOverLowestPrice?: number;
        BaselineEbsBandwidthMbps?: {
          Min?: number;
          Max?: number;
        };
        OnDemandMaxPricePercentageOverLowestPrice?: number;
        /** @uniqueItems false */
        AcceleratorNames?: ("a10g" | "a100" | "h100" | "inferentia" | "k520" | "k80" | "m60" | "radeon-pro-v520" | "t4" | "t4g" | "vu9p" | "v100" | "l40s")[];
        AcceleratorTotalMemoryMiB?: {
          Min?: number;
          Max?: number;
        };
        /** @enum ["included","required","excluded"] */
        BurstablePerformance?: "included" | "required" | "excluded";
        MemoryMiB: {
          Min: number;
          Max?: number;
        };
        TotalLocalStorageGB?: {
          Min?: number;
          Max?: number;
        };
      };
      Monitoring?: "BASIC" | "DETAILED";
    };
  };
};


/** Associate a set of ECS Capacity Providers with a specified ECS Cluster */
export type AwsEcsClustercapacityproviderassociations = {
  DefaultCapacityProviderStrategy: ({
    CapacityProvider: "FARGATE" | "FARGATE_SPOT" | string;
    /**
     * @minimum 0
     * @maximum 100000
     */
    Base?: number;
    /**
     * @minimum 0
     * @maximum 1000
     */
    Weight?: number;
  })[];
  CapacityProviders?: ("FARGATE" | "FARGATE_SPOT" | string)[];
  Cluster: string;
};


/** Definition of AWS::Scheduler::Schedule Resource Type */
export type AwsSchedulerSchedule = {
  /**
   * The Amazon Resource Name (ARN) of the schedule.
   * @minLength 1
   * @maxLength 1224
   * @pattern ^arn:aws[a-z-]*:scheduler:[a-z0-9\-]+:\d{12}:schedule\/[0-9a-zA-Z-_.]+\/[0-9a-zA-Z-_.]+$
   */
  Arn?: string;
  /**
   * The description of the schedule.
   * @minLength 0
   * @maxLength 512
   */
  Description?: string;
  /**
   * The date, in UTC, before which the schedule can invoke its target. Depending on the schedule's
   * recurrence expression, invocations might stop on, or before, the EndDate you specify.
   */
  EndDate?: string;
  FlexibleTimeWindow: {
    Mode: "OFF" | "FLEXIBLE";
    /**
     * The maximum time window during which a schedule can be invoked.
     * @minimum 1
     * @maximum 1440
     */
    MaximumWindowInMinutes?: number;
  };
  /**
   * The name of the schedule group to associate with this schedule. If you omit this, the default
   * schedule group is used.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9a-zA-Z-_.]+$
   */
  GroupName?: string;
  /**
   * The ARN for a KMS Key that will be used to encrypt customer data.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^arn:aws[a-z-]*:kms:[a-z0-9\-]+:\d{12}:(key|alias)\/[0-9a-zA-Z-_]*$
   */
  KmsKeyArn?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[0-9a-zA-Z-_.]+$
   */
  Name?: string;
  /**
   * The scheduling expression.
   * @minLength 1
   * @maxLength 256
   */
  ScheduleExpression: string;
  /**
   * The timezone in which the scheduling expression is evaluated.
   * @minLength 1
   * @maxLength 50
   */
  ScheduleExpressionTimezone?: string;
  /**
   * The date, in UTC, after which the schedule can begin invoking its target. Depending on the
   * schedule's recurrence expression, invocations might occur on, or after, the StartDate you specify.
   */
  StartDate?: string;
  State?: "ENABLED" | "DISABLED";
  Target: {
    /**
     * The Amazon Resource Name (ARN) of the target.
     * @minLength 1
     * @maxLength 1600
     */
    Arn: string;
    /**
     * The Amazon Resource Name (ARN) of the IAM role to be used for this target when the schedule is
     * triggered.
     * @minLength 1
     * @maxLength 1600
     * @pattern ^arn:aws[a-z-]*:iam::\d{12}:role\/[\w+=,.@\/-]+$
     */
    RoleArn: string;
    DeadLetterConfig?: {
      /**
       * The ARN of the SQS queue specified as the target for the dead-letter queue.
       * @minLength 1
       * @maxLength 1600
       * @pattern ^arn:aws[a-z-]*:sqs:[a-z0-9\-]+:\d{12}:[a-zA-Z0-9\-_]+$
       */
      Arn?: string;
    };
    RetryPolicy?: {
      /**
       * The maximum amount of time, in seconds, to continue to make retry attempts.
       * @minimum 60
       * @maximum 86400
       */
      MaximumEventAgeInSeconds?: number;
      /**
       * The maximum number of retry attempts to make before the request fails. Retry attempts with
       * exponential backoff continue until either the maximum number of attempts is made or until the
       * duration of the MaximumEventAgeInSeconds is reached.
       * @minimum 0
       * @maximum 185
       */
      MaximumRetryAttempts?: number;
    };
    /**
     * The text, or well-formed JSON, passed to the target. If you are configuring a templated Lambda, AWS
     * Step Functions, or Amazon EventBridge target, the input must be a well-formed JSON. For all other
     * target types, a JSON is not required. If you do not specify anything for this field, EventBridge
     * Scheduler delivers a default notification to the target.
     * @minLength 1
     */
    Input?: string;
    EcsParameters?: {
      /**
       * The ARN of the task definition to use if the event target is an Amazon ECS task.
       * @minLength 1
       * @maxLength 1600
       */
      TaskDefinitionArn: string;
      /**
       * The number of tasks to create based on TaskDefinition. The default is 1.
       * @minimum 1
       * @maximum 10
       */
      TaskCount?: number;
      LaunchType?: "EC2" | "FARGATE" | "EXTERNAL";
      NetworkConfiguration?: {
        AwsvpcConfiguration?: {
          /**
           * Specifies the subnets associated with the task. These subnets must all be in the same VPC. You can
           * specify as many as 16 subnets.
           * @minItems 1
           * @maxItems 16
           */
          Subnets: string[];
          /**
           * Specifies the security groups associated with the task. These security groups must all be in the
           * same VPC. You can specify as many as five security groups. If you do not specify a security group,
           * the default security group for the VPC is used.
           * @minItems 1
           * @maxItems 5
           */
          SecurityGroups?: string[];
          AssignPublicIp?: "ENABLED" | "DISABLED";
        };
      };
      /**
       * Specifies the platform version for the task. Specify only the numeric portion of the platform
       * version, such as 1.1.0.
       * @minLength 1
       * @maxLength 64
       */
      PlatformVersion?: string;
      /**
       * Specifies an ECS task group for the task. The maximum length is 255 characters.
       * @minLength 1
       * @maxLength 255
       */
      Group?: string;
      /**
       * The capacity provider strategy to use for the task.
       * @maxItems 6
       */
      CapacityProviderStrategy?: {
        /**
         * The short name of the capacity provider.
         * @minLength 1
         * @maxLength 255
         */
        CapacityProvider: string;
        /**
         * The weight value designates the relative percentage of the total number of tasks launched that
         * should use the specified capacity provider. The weight value is taken into consideration after the
         * base value, if defined, is satisfied.
         * @default 0
         * @minimum 0
         * @maximum 1000
         */
        Weight?: number;
        /**
         * The base value designates how many tasks, at a minimum, to run on the specified capacity provider.
         * Only one capacity provider in a capacity provider strategy can have a base defined. If no value is
         * specified, the default value of 0 is used.
         * @default 0
         * @minimum 0
         * @maximum 100000
         */
        Base?: number;
      }[];
      /**
       * Specifies whether to enable Amazon ECS managed tags for the task. For more information, see Tagging
       * Your Amazon ECS Resources in the Amazon Elastic Container Service Developer Guide.
       */
      EnableECSManagedTags?: boolean;
      /**
       * Whether or not to enable the execute command functionality for the containers in this task. If
       * true, this enables execute command functionality on all containers in the task.
       */
      EnableExecuteCommand?: boolean;
      /**
       * An array of placement constraint objects to use for the task. You can specify up to 10 constraints
       * per task (including constraints in the task definition and those specified at runtime).
       * @maxItems 10
       */
      PlacementConstraints?: ({
        Type?: "distinctInstance" | "memberOf";
        /**
         * A cluster query language expression to apply to the constraint. You cannot specify an expression if
         * the constraint type is distinctInstance. To learn more, see Cluster Query Language in the Amazon
         * Elastic Container Service Developer Guide.
         * @maxLength 2000
         */
        Expression?: string;
      })[];
      /**
       * The placement strategy objects to use for the task. You can specify a maximum of five strategy
       * rules per task.
       * @maxItems 5
       */
      PlacementStrategy?: ({
        Type?: "random" | "spread" | "binpack";
        /**
         * The field to apply the placement strategy against. For the spread placement strategy, valid values
         * are instanceId (or host, which has the same effect), or any platform or custom attribute that is
         * applied to a container instance, such as attribute:ecs.availability-zone. For the binpack placement
         * strategy, valid values are cpu and memory. For the random placement strategy, this field is not
         * used.
         * @maxLength 255
         */
        Field?: string;
      })[];
      PropagateTags?: "TASK_DEFINITION";
      /**
       * The reference ID to use for the task.
       * @maxLength 1024
       */
      ReferenceId?: string;
      /**
       * The metadata that you apply to the task to help you categorize and organize them. Each tag consists
       * of a key and an optional value, both of which you define. To learn more, see RunTask in the Amazon
       * ECS API Reference.
       * @minItems 0
       * @maxItems 50
       */
      Tags?: Record<string, string>[];
    };
    EventBridgeParameters?: {
      /**
       * Free-form string, with a maximum of 128 characters, used to decide what fields to expect in the
       * event detail.
       * @minLength 1
       * @maxLength 128
       */
      DetailType: string;
      /**
       * The source of the event.
       * @minLength 1
       * @maxLength 256
       * @pattern ^(?=[/\.\-_A-Za-z0-9]+)((?!aws\.).*)|(\$(\.[\w_-]+(\[(\d+|\*)\])*)*)$
       */
      Source: string;
    };
    KinesisParameters?: {
      /**
       * The custom parameter used as the Kinesis partition key. For more information, see Amazon Kinesis
       * Streams Key Concepts in the Amazon Kinesis Streams Developer Guide.
       * @minLength 1
       * @maxLength 256
       */
      PartitionKey: string;
    };
    SageMakerPipelineParameters?: {
      /**
       * List of Parameter names and values for SageMaker Model Building Pipeline execution.
       * @minItems 0
       * @maxItems 200
       */
      PipelineParameterList?: {
        /**
         * Name of parameter to start execution of a SageMaker Model Building Pipeline.
         * @minLength 1
         * @maxLength 256
         * @pattern ^[A-Za-z0-9\-_]*$
         */
        Name: string;
        /**
         * Value of parameter to start execution of a SageMaker Model Building Pipeline.
         * @minLength 1
         * @maxLength 1024
         */
        Value: string;
      }[];
    };
    SqsParameters?: {
      /**
       * The FIFO message group ID to use as the target.
       * @minLength 1
       * @maxLength 128
       */
      MessageGroupId?: string;
    };
  };
};


/** Resource schema for AWS::AutoScaling::WarmPool. */
export type AwsAutoscalingWarmpool = {
  AutoScalingGroupName: string;
  MaxGroupPreparedCapacity?: number;
  MinSize?: number;
  PoolState?: string;
  InstanceReusePolicy?: {
    ReuseOnScaleIn?: boolean;
  };
};


/**
 * The ``AWS::ECS::Cluster`` resource creates an Amazon Elastic Container Service (Amazon ECS)
 * cluster.
 */
export type AwsEcsCluster = {
  /**
   * The settings to use when creating a cluster. This parameter is used to turn on CloudWatch Container
   * Insights with enhanced observability or CloudWatch Container Insights for a cluster.
   * Container Insights with enhanced observability provides all the Container Insights metrics, plus
   * additional task and container metrics. This version supports enhanced observability for Amazon ECS
   * clusters using the Amazon EC2 and Fargate launch types. After you configure Container Insights with
   * enhanced observability on Amazon ECS, Container Insights auto-collects detailed infrastructure
   * telemetry from the cluster level down to the container level in your environment and displays these
   * critical performance data in curated dashboards removing the heavy lifting in observability set-up.
   * For more information, see [Monitor Amazon ECS containers using Container Insights with enhanced
   * observability](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cloudwatch-container-insights.html)
   * in the *Amazon Elastic Container Service Developer Guide*.
   */
  ClusterSettings?: {
    /**
     * The value to set for the cluster setting. The supported values are ``enhanced``, ``enabled``, and
     * ``disabled``.
     * To use Container Insights with enhanced observability, set the ``containerInsights`` account
     * setting to ``enhanced``.
     * To use Container Insights, set the ``containerInsights`` account setting to ``enabled``.
     * If a cluster value is specified, it will override the ``containerInsights`` value set with
     * [PutAccountSetting](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PutAccountSetting.html)
     * or
     * [PutAccountSettingDefault](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PutAccountSettingDefault.html).
     */
    Value?: string;
    /** The name of the cluster setting. The value is ``containerInsights``. */
    Name?: string;
  }[];
  /**
   * The default capacity provider strategy for the cluster. When services or tasks are run in the
   * cluster with no launch type or capacity provider strategy specified, the default capacity provider
   * strategy is used.
   */
  DefaultCapacityProviderStrategy?: {
    /**
     * The short name of the capacity provider. This can be either an AWS managed capacity provider
     * (``FARGATE`` or ``FARGATE_SPOT``) or the name of a custom capacity provider that you created.
     */
    CapacityProvider?: string;
    /**
     * The *weight* value designates the relative percentage of the total number of tasks launched that
     * should use the specified capacity provider. The ``weight`` value is taken into consideration after
     * the ``base`` value, if defined, is satisfied.
     * If no ``weight`` value is specified, the default value of ``0`` is used. When multiple capacity
     * providers are specified within a capacity provider strategy, at least one of the capacity providers
     * must have a weight value greater than zero and any capacity providers with a weight of ``0`` can't
     * be used to place tasks. If you specify multiple capacity providers in a strategy that all have a
     * weight of ``0``, any ``RunTask`` or ``CreateService`` actions using the capacity provider strategy
     * will fail.
     * Weight value characteristics:
     * +  Weight is considered after the base value is satisfied
     * +  The default value is ``0`` if not specified
     * +  The valid range is 0 to 1,000
     * +  At least one capacity provider must have a weight greater than zero
     * +  Capacity providers with weight of ``0`` cannot place tasks
     * Task distribution logic:
     * 1.  Base satisfaction: The minimum number of tasks specified by the base value are placed on that
     * capacity provider
     * 1.  Weight distribution: After base requirements are met, additional tasks are distributed
     * according to weight ratios
     * Examples:
     * Equal Distribution: Two capacity providers both with weight ``1`` will split tasks evenly after
     * base requirements are met.
     * Weighted Distribution: If capacityProviderA has weight ``1`` and capacityProviderB has weight
     * ``4``, then for every 1 task on A, 4 tasks will run on B.
     */
    Weight?: number;
    /**
     * The *base* value designates how many tasks, at a minimum, to run on the specified capacity provider
     * for each service. Only one capacity provider in a capacity provider strategy can have a *base*
     * defined. If no value is specified, the default value of ``0`` is used.
     * Base value characteristics:
     * +  Only one capacity provider in a strategy can have a base defined
     * +  The default value is ``0`` if not specified
     * +  The valid range is 0 to 100,000
     * +  Base requirements are satisfied first before weight distribution
     */
    Base?: number;
  }[];
  /** The execute command and managed storage configuration for the cluster. */
  Configuration?: {
    /** The details of the managed storage configuration. */
    ManagedStorageConfiguration?: {
      /**
       * Specify the KMSlong key ID for Fargate ephemeral storage.
       * When you specify a ``fargateEphemeralStorageKmsKeyId``, AWS Fargate uses the key to encrypt data
       * at rest in ephemeral storage. For more information about Fargate ephemeral storage encryption, see
       * [Customer managed keys for Fargate ephemeral storage for Amazon
       * ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-storage-encryption.html)
       * in the *Amazon Elastic Container Service Developer Guide*.
       * The key must be a single Region key.
       */
      FargateEphemeralStorageKmsKeyId?: string;
      /**
       * Specify a KMSlong key ID to encrypt Amazon ECS managed storage.
       * When you specify a ``kmsKeyId``, Amazon ECS uses the key to encrypt data volumes managed by
       * Amazon ECS that are attached to tasks in the cluster. The following data volumes are managed by
       * Amazon ECS: Amazon EBS. For more information about encryption of Amazon EBS volumes attached to
       * Amazon ECS tasks, see [Encrypt data stored in Amazon EBS volumes for Amazon
       * ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ebs-kms-encryption.html) in the
       * *Amazon Elastic Container Service Developer Guide*.
       * The key must be a single Region key.
       */
      KmsKeyId?: string;
    };
    /** The details of the execute command configuration. */
    ExecuteCommandConfiguration?: {
      /**
       * The log setting to use for redirecting logs for your execute command results. The following log
       * settings are available.
       * +  ``NONE``: The execute command session is not logged.
       * +  ``DEFAULT``: The ``awslogs`` configuration in the task definition is used. If no logging
       * parameter is specified, it defaults to this value. If no ``awslogs`` log driver is configured in
       * the task definition, the output won't be logged.
       * +  ``OVERRIDE``: Specify the logging details as a part of ``logConfiguration``. If the
       * ``OVERRIDE`` logging option is specified, the ``logConfiguration`` is required.
       */
      Logging?: string;
      /** Specify an KMSlong key ID to encrypt the data between the local client and the container. */
      KmsKeyId?: string;
      /**
       * The log configuration for the results of the execute command actions. The logs can be sent to
       * CloudWatch Logs or an Amazon S3 bucket. When ``logging=OVERRIDE`` is specified, a
       * ``logConfiguration`` must be provided.
       */
      LogConfiguration?: {
        /** Determines whether to use encryption on the S3 logs. If not specified, encryption is not used. */
        S3EncryptionEnabled?: boolean;
        /**
         * Determines whether to use encryption on the CloudWatch logs. If not specified, encryption will be
         * off.
         */
        CloudWatchEncryptionEnabled?: boolean;
        /**
         * The name of the CloudWatch log group to send logs to.
         * The CloudWatch log group must already be created.
         */
        CloudWatchLogGroupName?: string;
        /** An optional folder in the S3 bucket to place logs in. */
        S3KeyPrefix?: string;
        /**
         * The name of the S3 bucket to send logs to.
         * The S3 bucket must already be created.
         */
        S3BucketName?: string;
      };
    };
  };
  /**
   * Use this parameter to set a default Service Connect namespace. After you set a default Service
   * Connect namespace, any new services with Service Connect turned on that are created in the cluster
   * are added as client services in the namespace. This setting only applies to new services that set
   * the ``enabled`` parameter to ``true`` in the ``ServiceConnectConfiguration``. You can set the
   * namespace of each service individually in the ``ServiceConnectConfiguration`` to override this
   * default parameter.
   * Tasks that run in a namespace can use short names to connect to services in the namespace. Tasks
   * can connect to services across all of the clusters in the namespace. Tasks connect through a
   * managed proxy container that collects logs and metrics for increased visibility. Only the tasks
   * that Amazon ECS services create are supported with Service Connect. For more information, see
   * [Service Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html)
   * in the *Amazon Elastic Container Service Developer Guide*.
   */
  ServiceConnectDefaults?: {
    /**
     * The namespace name or full Amazon Resource Name (ARN) of the CMAPlong namespace that's used when
     * you create a service and don't specify a Service Connect configuration. The namespace name can
     * include up to 1024 characters. The name is case-sensitive. The name can't include greater than (>),
     * less than (<), double quotation marks ("), or slash (/).
     * If you enter an existing namespace name or ARN, then that namespace will be used. Any namespace
     * type is supported. The namespace must be in this account and this AWS Region.
     * If you enter a new name, a CMAPlong namespace will be created. Amazon ECS creates a CMAP namespace
     * with the "API calls" method of instance discovery only. This instance discovery method is the
     * "HTTP" namespace type in the CLIlong. Other types of instance discovery aren't used by Service
     * Connect.
     * If you update the cluster with an empty string ``""`` for the namespace name, the cluster
     * configuration for Service Connect is removed. Note that the namespace will remain in CMAP and must
     * be deleted separately.
     * For more information about CMAPlong, see [Working with
     * Services](https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-services.html) in the
     * *Developer Guide*.
     */
    Namespace?: string;
  };
  /**
   * The short name of one or more capacity providers to associate with the cluster. A capacity provider
   * must be associated with a cluster before it can be included as part of the default capacity
   * provider strategy of the cluster or used in a capacity provider strategy when calling the
   * [CreateService](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_CreateService.html)
   * or [RunTask](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_RunTask.html) actions.
   * If specifying a capacity provider that uses an Auto Scaling group, the capacity provider must be
   * created but not associated with another cluster. New Auto Scaling group capacity providers can be
   * created with the
   * [CreateCapacityProvider](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_CreateCapacityProvider.html)
   * API operation.
   * To use a FARGATElong capacity provider, specify either the ``FARGATE`` or ``FARGATE_SPOT``
   * capacity providers. The FARGATElong capacity providers are available to all accounts and only need
   * to be associated with a cluster to be used.
   * The
   * [PutCapacityProvider](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PutCapacityProvider.html)
   * API operation is used to update the list of available capacity providers for a cluster after the
   * cluster is created.
   */
  CapacityProviders?: string[];
  /**
   * A user-generated string that you use to identify your cluster. If you don't specify a name, CFNlong
   * generates a unique physical ID for the name.
   */
  ClusterName?: string;
  Arn?: string;
  /**
   * The metadata that you apply to the cluster to help you categorize and organize them. Each tag
   * consists of a key and an optional value. You define both.
   * The following basic restrictions apply to tags:
   * +  Maximum number of tags per resource - 50
   * +  For each resource, each tag key must be unique, and each tag key can have only one value.
   * +  Maximum key length - 128 Unicode characters in UTF-8
   * +  Maximum value length - 256 Unicode characters in UTF-8
   * +  If your tagging schema is used across multiple services and resources, remember that other
   * services may have restrictions on allowed characters. Generally allowed characters are: letters,
   * numbers, and spaces representable in UTF-8, and the following characters: + - = . _ : / @.
   * +  Tag keys and values are case-sensitive.
   * +  Do not use ``aws:``, ``AWS:``, or any upper or lowercase combination of such as a prefix for
   * either keys or values as it is reserved for AWS use. You cannot edit or delete tag keys or values
   * with this prefix. Tags with this prefix do not count against your tags per resource limit.
   */
  Tags?: {
    /**
     * The optional part of a key-value pair that make up a tag. A ``value`` acts as a descriptor within a
     * tag category (key).
     */
    Value?: string;
    /**
     * One part of a key-value pair that make up a tag. A ``key`` is a general label that acts like a
     * category for more specific tag values.
     */
    Key?: string;
  }[];
};


/**
 * The ``AWS::ECS::Service`` resource creates an Amazon Elastic Container Service (Amazon ECS) service
 * that runs and maintains the requested number of tasks and associated load balancers.
 * The stack update fails if you change any properties that require replacement and at least one ECS
 * Service Connect ``ServiceConnectConfiguration`` property is configured. This is because AWS
 * CloudFormation creates the replacement service first, but each ``ServiceConnectService`` must have
 * a name that is unique in the namespace.
 * Starting April 15, 2023, AWS; will not onboard new customers to Amazon Elastic Inference (EI),
 * and will help current customers migrate their workloads to options that offer better price and
 * performance. After April 15, 2023, new customers will not be able to launch instances with Amazon
 * EI accelerators in Amazon SageMaker, ECS, or EC2. However, customers who have used Amazon EI at
 * least once during the past 30-day period are considered current customers and will be able to
 * continue using the service.
 * On June 12, 2025, Amazon ECS launched support for updating capacity provider configuration for
 * ECS services. With this launch, ECS also aligned the CFN update behavior for
 * ``CapacityProviderStrategy`` parameter with the standard practice. For more information, see [adds
 * support for updating capacity provider configuration for ECS
 * services](https://docs.aws.amazon.com/about-aws/whats-new/2025/05/amazon-ecs-capacity-provider-configuration-ecs/).
 * Previously ECS ignored the ``CapacityProviderStrategy`` property if it was set to an empty list for
 * example, ``[]`` in CFN, because updating capacity provider configuration was not supported. Now,
 * with support for capacity provider updates, customers can remove capacity providers from a service
 * by passing an empty list. When you specify an empty list (``[]``) for the
 * ``CapacityProviderStrategy`` property in your CFN template, ECS will remove any capacity providers
 * associated with the service, as follows:
 * +  For services created with a capacity provider strategy after the launch:
 * +  If there's a cluster default strategy set, the service will revert to using that default
 * strategy.
 * +  If no cluster default strategy exists, you will receive the following error:
 * No launch type to fall back to for empty capacity provider strategy. Your service was not created
 * with a launch type.
 * +  For services created with a capacity provider strategy prior to the launch:
 * +  If ``CapacityProviderStrategy`` had ``FARGATE_SPOT`` or ``FARGATE`` capacity providers, the
 * launch type will be updated to ``FARGATE`` and the capacity provider will be removed.
 * +  If the strategy included Auto Scaling group capacity providers, the service will revert to EC2
 * launch type, and the Auto Scaling group capacity providers will not be used.
 * Recommended Actions
 * If you are currently using ``CapacityProviderStrategy: []`` in your CFN templates, you should take
 * one of the following actions:
 * +  If you do not intend to update the Capacity Provider Strategy:
 * +  Remove the ``CapacityProviderStrategy`` property entirely from your CFN template
 * +  Alternatively, use ``!Ref ::NoValue`` for the ``CapacityProviderStrategy`` property in your
 * template
 * +  If you intend to maintain or update the Capacity Provider Strategy, specify the actual
 * Capacity Provider Strategy for the service in your CFN template.
 * If your CFN template had an empty list ([]) for ``CapacityProviderStrategy`` prior to the
 * aforementioned launch on June 12, and you are using the same template with
 * ``CapacityProviderStrategy: []``, you might encounter the following error:
 * Invalid request provided: When switching from launch type to capacity provider strategy on an
 * existing service, or making a change to a capacity provider strategy on a service that is already
 * using one, you must force a new deployment. (Service: Ecs, Status Code: 400, Request ID: xxx) (SDK
 * Attempt Count: 1)" (RequestToken: xxx HandlerErrorCode: InvalidRequest)
 * Note that CFN automatically initiates a new deployment when it detects a parameter change, but
 * customers cannot choose to force a deployment through CFN. This is an invalid input scenario that
 * requires one of the remediation actions listed above.
 * If you are experiencing active production issues related to this change, contact AWS Support or
 * your Technical Account Manager.
 */
export type AwsEcsService = {
  /**
   * The platform version that your tasks in the service are running on. A platform version is specified
   * only for tasks using the Fargate launch type. If one isn't specified, the ``LATEST`` platform
   * version is used. For more information, see [platform
   * versions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/platform_versions.html) in
   * the *Amazon Elastic Container Service Developer Guide*.
   * @default "LATEST"
   */
  PlatformVersion?: string;
  /**
   * Specifies whether to propagate the tags from the task definition to the task. If no value is
   * specified, the tags aren't propagated. Tags can only be propagated to the task during task
   * creation. To add tags to a task after task creation, use the
   * [TagResource](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_TagResource.html) API
   * action.
   * You must set this to a value other than ``NONE`` when you use Cost Explorer. For more information,
   * see [Amazon ECS usage
   * reports](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/usage-reports.html) in the
   * Amazon Elastic Container Service Developer Guide*.
   * The default is ``NONE``.
   * @enum ["SERVICE","TASK_DEFINITION"]
   */
  PropagateTags?: 'SERVICE' | 'TASK_DEFINITION';
  ServiceArn?: string;
  /**
   * The placement strategy objects to use for tasks in your service. You can specify a maximum of 5
   * strategy rules for each service.
   * To remove this property from your service resource, specify an empty ``PlacementStrategy`` array.
   */
  PlacementStrategies?: {
    /**
     * The field to apply the placement strategy against. For the ``spread`` placement strategy, valid
     * values are ``instanceId`` (or ``host``, which has the same effect), or any platform or custom
     * attribute that's applied to a container instance, such as ``attribute:ecs.availability-zone``. For
     * the ``binpack`` placement strategy, valid values are ``cpu`` and ``memory``. For the ``random``
     * placement strategy, this field is not used.
     */
    Field?: string;
    /**
     * The type of placement strategy. The ``random`` placement strategy randomly places tasks on
     * available candidates. The ``spread`` placement strategy spreads placement across available
     * candidates evenly based on the ``field`` parameter. The ``binpack`` strategy places tasks on
     * available candidates that have the least available amount of the resource that's specified with the
     * ``field`` parameter. For example, if you binpack on memory, a task is placed on the instance with
     * the least amount of remaining memory but still enough to run the task.
     * @enum ["binpack","random","spread"]
     */
    Type: 'binpack' | 'random' | 'spread';
  }[];
  /**
   * The details of the service discovery registry to associate with this service. For more information,
   * see [Service
   * discovery](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-discovery.html).
   * Each service may be associated with one service registry. Multiple service registries for each
   * service isn't supported.
   * To remove this property from your service resource, specify an empty ``ServiceRegistry`` array.
   */
  ServiceRegistries?: {
    /**
     * The container name value to be used for your service discovery service. It's already specified in
     * the task definition. If the task definition that your service task specifies uses the ``bridge`` or
     * ``host`` network mode, you must specify a ``containerName`` and ``containerPort`` combination from
     * the task definition. If the task definition that your service task specifies uses the ``awsvpc``
     * network mode and a type SRV DNS record is used, you must specify either a ``containerName`` and
     * ``containerPort`` combination or a ``port`` value. However, you can't specify both.
     */
    ContainerName?: string;
    /**
     * The port value used if your service discovery service specified an SRV record. This field might be
     * used if both the ``awsvpc`` network mode and SRV records are used.
     */
    Port?: number;
    /**
     * The port value to be used for your service discovery service. It's already specified in the task
     * definition. If the task definition your service task specifies uses the ``bridge`` or ``host``
     * network mode, you must specify a ``containerName`` and ``containerPort`` combination from the task
     * definition. If the task definition your service task specifies uses the ``awsvpc`` network mode and
     * a type SRV DNS record is used, you must specify either a ``containerName`` and ``containerPort``
     * combination or a ``port`` value. However, you can't specify both.
     */
    ContainerPort?: number;
    /**
     * The Amazon Resource Name (ARN) of the service registry. The currently supported service registry is
     * CMAP. For more information, see
     * [CreateService](https://docs.aws.amazon.com/cloud-map/latest/api/API_CreateService.html).
     */
    RegistryArn?: string;
  }[];
  /**
   * The configuration for a volume specified in the task definition as a volume that is configured at
   * launch time. Currently, the only supported volume type is an Amazon EBS volume.
   * To remove this property from your service resource, specify an empty
   * ``ServiceVolumeConfiguration`` array.
   */
  VolumeConfigurations?: {
    /**
     * The configuration for the Amazon EBS volume that Amazon ECS creates and manages on your behalf.
     * These settings are used to create each Amazon EBS volume, with one volume created for each task in
     * the service. The Amazon EBS volumes are visible in your account in the Amazon EC2 console once they
     * are created.
     */
    ManagedEBSVolume?: {
      /**
       * The snapshot that Amazon ECS uses to create volumes for attachment to tasks maintained by the
       * service. You must specify either ``snapshotId`` or ``sizeInGiB`` in your volume configuration. This
       * parameter maps 1:1 with the ``SnapshotId`` parameter of the [CreateVolume
       * API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVolume.html) in the *Amazon
       * EC2 API Reference*.
       */
      SnapshotId?: string;
      /**
       * The volume type. This parameter maps 1:1 with the ``VolumeType`` parameter of the [CreateVolume
       * API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVolume.html) in the *Amazon
       * EC2 API Reference*. For more information, see [Amazon EBS volume
       * types](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-volume-types.html) in the *Amazon
       * EC2 User Guide*.
       * The following are the supported volume types.
       * +  General Purpose SSD: ``gp2``|``gp3``
       * +  Provisioned IOPS SSD: ``io1``|``io2``
       * +  Throughput Optimized HDD: ``st1``
       * +  Cold HDD: ``sc1``
       * +  Magnetic: ``standard``
       * The magnetic volume type is not supported on Fargate.
       */
      VolumeType?: string;
      /**
       * The Amazon Resource Name (ARN) identifier of the AWS Key Management Service key to use for Amazon
       * EBS encryption. When a key is specified using this parameter, it overrides Amazon EBS default
       * encryption or any KMS key that you specified for cluster-level managed storage encryption. This
       * parameter maps 1:1 with the ``KmsKeyId`` parameter of the [CreateVolume
       * API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVolume.html) in the *Amazon
       * EC2 API Reference*. For more information about encrypting Amazon EBS volumes attached to tasks, see
       * [Encrypt data stored in Amazon EBS volumes attached to Amazon ECS
       * tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ebs-kms-encryption.html).
       * AWS authenticates the AWS Key Management Service key asynchronously. Therefore, if you specify an
       * ID, alias, or ARN that is invalid, the action can appear to complete, but eventually fails.
       */
      KmsKeyId?: string;
      /**
       * The tags to apply to the volume. Amazon ECS applies service-managed tags by default. This parameter
       * maps 1:1 with the ``TagSpecifications.N`` parameter of the [CreateVolume
       * API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVolume.html) in the *Amazon
       * EC2 API Reference*.
       */
      TagSpecifications?: {
        /**
         * Determines whether to propagate the tags from the task definition to  the Amazon EBS volume. Tags
         * can only propagate to a ``SERVICE`` specified in  ``ServiceVolumeConfiguration``. If no value is
         * specified, the tags aren't  propagated.
         * @enum ["SERVICE","TASK_DEFINITION"]
         */
        PropagateTags?: 'SERVICE' | 'TASK_DEFINITION';
        /** The type of volume resource. */
        ResourceType: string;
        /**
         * The tags applied to this Amazon EBS volume. ``AmazonECSCreated`` and ``AmazonECSManaged`` are
         * reserved tags that can't be used.
         */
        Tags?: {
          /**
           * The optional part of a key-value pair that make up a tag. A ``value`` acts as a descriptor within a
           * tag category (key).
           */
          Value?: string;
          /**
           * One part of a key-value pair that make up a tag. A ``key`` is a general label that acts like a
           * category for more specific tag values.
           */
          Key?: string;
        }[];
      }[];
      /**
       * The filesystem type for the volume. For volumes created from a snapshot, you must specify the same
       * filesystem type that the volume was using when the snapshot was created. If there is a filesystem
       * type mismatch, the tasks will fail to start.
       * The available Linux filesystem types are  ``ext3``, ``ext4``, and ``xfs``. If no value is
       * specified, the ``xfs`` filesystem type is used by default.
       * The available Windows filesystem types are ``NTFS``.
       */
      FilesystemType?: string;
      /**
       * Indicates whether the volume should be encrypted. If you turn on Region-level Amazon EBS encryption
       * by default but set this value as ``false``, the setting is overridden and the volume is encrypted
       * with the KMS key specified for Amazon EBS encryption by default. This parameter maps 1:1 with the
       * ``Encrypted`` parameter of the [CreateVolume
       * API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVolume.html) in the *Amazon
       * EC2 API Reference*.
       */
      Encrypted?: boolean;
      /**
       * The throughput to provision for a volume, in MiB/s, with a maximum of 1,000 MiB/s. This parameter
       * maps 1:1 with the ``Throughput`` parameter of the [CreateVolume
       * API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVolume.html) in the *Amazon
       * EC2 API Reference*.
       * This parameter is only supported for the ``gp3`` volume type.
       */
      Throughput?: number;
      /**
       * The rate, in MiB/s, at which data is fetched from a snapshot of an existing EBS volume to create
       * new volumes for attachment to the tasks maintained by the service. This property can be specified
       * only if you specify a ``snapshotId``. For more information, see [Initialize Amazon EBS
       * volumes](https://docs.aws.amazon.com/ebs/latest/userguide/initalize-volume.html) in the *Amazon EBS
       * User Guide*.
       */
      VolumeInitializationRate?: number;
      /**
       * The number of I/O operations per second (IOPS). For ``gp3``, ``io1``, and ``io2`` volumes, this
       * represents the number of IOPS that are provisioned for the volume. For ``gp2`` volumes, this
       * represents the baseline performance of the volume and the rate at which the volume accumulates I/O
       * credits for bursting.
       * The following are the supported values for each volume type.
       * +  ``gp3``: 3,000 - 16,000 IOPS
       * +  ``io1``: 100 - 64,000 IOPS
       * +  ``io2``: 100 - 256,000 IOPS
       * This parameter is required for ``io1`` and ``io2`` volume types. The default for ``gp3`` volumes
       * is ``3,000 IOPS``. This parameter is not supported for ``st1``, ``sc1``, or ``standard`` volume
       * types.
       * This parameter maps 1:1 with the ``Iops`` parameter of the [CreateVolume
       * API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVolume.html) in the *Amazon
       * EC2 API Reference*.
       */
      Iops?: number;
      /**
       * The size of the volume in GiB. You must specify either a volume size or a snapshot ID. If you
       * specify a snapshot ID, the snapshot size is used for the volume size by default. You can optionally
       * specify a volume size greater than or equal to the snapshot size. This parameter maps 1:1 with the
       * ``Size`` parameter of the [CreateVolume
       * API](https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateVolume.html) in the *Amazon
       * EC2 API Reference*.
       * The following are the supported volume size values for each volume type.
       * +  ``gp2`` and ``gp3``: 1-16,384
       * +  ``io1`` and ``io2``: 4-16,384
       * +  ``st1`` and ``sc1``: 125-16,384
       * +  ``standard``: 1-1,024
       */
      SizeInGiB?: number;
      /**
       * The ARN of the IAM role to associate with this volume. This is the Amazon ECS infrastructure IAM
       * role that is used to manage your AWS infrastructure. We recommend using the Amazon ECS-managed
       * ``AmazonECSInfrastructureRolePolicyForVolumes`` IAM policy with this role. For more information,
       * see [Amazon ECS infrastructure IAM
       * role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/infrastructure_IAM_role.html) in
       * the *Amazon ECS Developer Guide*.
       */
      RoleArn: string;
    };
    /**
     * The name of the volume. This value must match the volume name from the ``Volume`` object in the
     * task definition.
     */
    Name: string;
  }[];
  /**
   * The capacity provider strategy to use for the service.
   * If a ``capacityProviderStrategy`` is specified, the ``launchType`` parameter must be omitted. If
   * no ``capacityProviderStrategy`` or ``launchType`` is specified, the
   * ``defaultCapacityProviderStrategy`` for the cluster is used.
   * A capacity provider strategy can contain a maximum of 20 capacity providers.
   * To remove this property from your service resource, specify an empty
   * ``CapacityProviderStrategyItem`` array.
   */
  CapacityProviderStrategy?: {
    /**
     * The short name of the capacity provider. This can be either an AWS managed capacity provider
     * (``FARGATE`` or ``FARGATE_SPOT``) or the name of a custom capacity provider that you created.
     */
    CapacityProvider?: string;
    /**
     * The *base* value designates how many tasks, at a minimum, to run on the specified capacity provider
     * for each service. Only one capacity provider in a capacity provider strategy can have a *base*
     * defined. If no value is specified, the default value of ``0`` is used.
     * Base value characteristics:
     * +  Only one capacity provider in a strategy can have a base defined
     * +  The default value is ``0`` if not specified
     * +  The valid range is 0 to 100,000
     * +  Base requirements are satisfied first before weight distribution
     */
    Base?: number;
    /**
     * The *weight* value designates the relative percentage of the total number of tasks launched that
     * should use the specified capacity provider. The ``weight`` value is taken into consideration after
     * the ``base`` value, if defined, is satisfied.
     * If no ``weight`` value is specified, the default value of ``0`` is used. When multiple capacity
     * providers are specified within a capacity provider strategy, at least one of the capacity providers
     * must have a weight value greater than zero and any capacity providers with a weight of ``0`` can't
     * be used to place tasks. If you specify multiple capacity providers in a strategy that all have a
     * weight of ``0``, any ``RunTask`` or ``CreateService`` actions using the capacity provider strategy
     * will fail.
     * Weight value characteristics:
     * +  Weight is considered after the base value is satisfied
     * +  The default value is ``0`` if not specified
     * +  The valid range is 0 to 1,000
     * +  At least one capacity provider must have a weight greater than zero
     * +  Capacity providers with weight of ``0`` cannot place tasks
     * Task distribution logic:
     * 1.  Base satisfaction: The minimum number of tasks specified by the base value are placed on that
     * capacity provider
     * 1.  Weight distribution: After base requirements are met, additional tasks are distributed
     * according to weight ratios
     * Examples:
     * Equal Distribution: Two capacity providers both with weight ``1`` will split tasks evenly after
     * base requirements are met.
     * Weighted Distribution: If capacityProviderA has weight ``1`` and capacityProviderB has weight
     * ``4``, then for every 1 task on A, 4 tasks will run on B.
     */
    Weight?: number;
  }[];
  /**
   * The launch type on which to run your service. For more information, see [Amazon ECS Launch
   * Types](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) in the
   * Amazon Elastic Container Service Developer Guide*.
   * If you want to use Managed Instances, you must use the ``capacityProviderStrategy`` request
   * parameter
   * @enum ["EC2","FARGATE","EXTERNAL"]
   */
  LaunchType?: 'EC2' | 'FARGATE' | 'EXTERNAL';
  Name?: string;
  /**
   * Indicates whether to use Availability Zone rebalancing for the service.
   * For more information, see [Balancing an Amazon ECS service across Availability
   * Zones](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-rebalancing.html) in the
   * Amazon Elastic Container Service Developer Guide*.
   * The default behavior of ``AvailabilityZoneRebalancing`` differs between create and update
   * requests:
   * +  For create service requests, when no value is specified for ``AvailabilityZoneRebalancing``,
   * Amazon ECS defaults the value to ``ENABLED``.
   * +  For update service requests, when no value is specified for ``AvailabilityZoneRebalancing``,
   * Amazon ECS defaults to the existing service’s ``AvailabilityZoneRebalancing`` value. If the service
   * never had an ``AvailabilityZoneRebalancing`` value set, Amazon ECS treats this as ``DISABLED``.
   * @default "ENABLED"
   * @enum ["ENABLED","DISABLED"]
   */
  AvailabilityZoneRebalancing?: 'ENABLED' | 'DISABLED';
  /**
   * The scheduling strategy to use for the service. For more information, see
   * [Services](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html).
   * There are two service scheduler strategies available:
   * +  ``REPLICA``-The replica scheduling strategy places and maintains the desired number of tasks
   * across your cluster. By default, the service scheduler spreads tasks across Availability Zones. You
   * can use task placement strategies and constraints to customize task placement decisions. This
   * scheduler strategy is required if the service uses the ``CODE_DEPLOY`` or ``EXTERNAL`` deployment
   * controller types.
   * +  ``DAEMON``-The daemon scheduling strategy deploys exactly one task on each active container
   * instance that meets all of the task placement constraints that you specify in your cluster. The
   * service scheduler also evaluates the task placement constraints for running tasks and will stop
   * tasks that don't meet the placement constraints. When you're using this strategy, you don't need to
   * specify a desired number of tasks, a task placement strategy, or use Service Auto Scaling policies.
   * Tasks using the Fargate launch type or the ``CODE_DEPLOY`` or ``EXTERNAL`` deployment controller
   * types don't support the ``DAEMON`` scheduling strategy.
   * @enum ["DAEMON","REPLICA"]
   */
  SchedulingStrategy?: 'DAEMON' | 'REPLICA';
  /**
   * The network configuration for the service. This parameter is required for task definitions that use
   * the ``awsvpc`` network mode to receive their own elastic network interface, and it is not supported
   * for other network modes. For more information, see [Task
   * Networking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking.html) in
   * the *Amazon Elastic Container Service Developer Guide*.
   */
  NetworkConfiguration?: {
    /**
     * The VPC subnets and security groups that are associated with a task.
     * All specified subnets and security groups must be from the same VPC.
     */
    AwsvpcConfiguration?: {
      /**
       * The IDs of the security groups associated with the task or service. If you don't specify a security
       * group, the default security group for the VPC is used. There's a limit of 5 security groups that
       * can be specified.
       * All specified security groups must be from the same VPC.
       */
      SecurityGroups?: string[];
      /**
       * The IDs of the subnets associated with the task or service. There's a limit of 16 subnets that can
       * be specified.
       * All specified subnets must be from the same VPC.
       */
      Subnets?: string[];
      /**
       * Whether the task's elastic network interface receives a public IP address.
       * Consider the following when you set this value:
       * +  When you use ``create-service`` or ``update-service``, the default is ``DISABLED``.
       * +  When the service ``deploymentController`` is ``ECS``, the value must be ``DISABLED``.
       * @enum ["DISABLED","ENABLED"]
       */
      AssignPublicIp?: 'DISABLED' | 'ENABLED';
    };
  };
  /**
   * The metadata that you apply to the service to help you categorize and organize them. Each tag
   * consists of a key and an optional value, both of which you define. When a service is deleted, the
   * tags are deleted as well.
   * The following basic restrictions apply to tags:
   * +  Maximum number of tags per resource - 50
   * +  For each resource, each tag key must be unique, and each tag key can have only one value.
   * +  Maximum key length - 128 Unicode characters in UTF-8
   * +  Maximum value length - 256 Unicode characters in UTF-8
   * +  If your tagging schema is used across multiple services and resources, remember that other
   * services may have restrictions on allowed characters. Generally allowed characters are: letters,
   * numbers, and spaces representable in UTF-8, and the following characters: + - = . _ : / @.
   * +  Tag keys and values are case-sensitive.
   * +  Do not use ``aws:``, ``AWS:``, or any upper or lowercase combination of such as a prefix for
   * either keys or values as it is reserved for AWS use. You cannot edit or delete tag keys or values
   * with this prefix. Tags with this prefix do not count against your tags per resource limit.
   */
  Tags?: {
    /**
     * The optional part of a key-value pair that make up a tag. A ``value`` acts as a descriptor within a
     * tag category (key).
     */
    Value?: string;
    /**
     * One part of a key-value pair that make up a tag. A ``key`` is a general label that acts like a
     * category for more specific tag values.
     */
    Key?: string;
  }[];
  /**
   * Determines whether to force a new deployment of the service. By default, deployments aren't forced.
   * You can use this option to start a new deployment with no service definition changes. For example,
   * you can update a service's tasks to use a newer Docker image with the same image/tag combination
   * (``my_image:latest``) or to roll Fargate tasks onto a newer platform version.
   */
  ForceNewDeployment?: {
    /**
     * Determines whether to force a new deployment of the service. By default, deployments aren't forced.
     * You can use this option to start a new deployment with no service definition changes. For example,
     * you can update a service's tasks to use a newer Docker image with the same image/tag combination
     * (``my_image:latest``) or to roll Fargate tasks onto a newer platform version.
     */
    EnableForceNewDeployment: boolean;
    /**
     * When you change the``ForceNewDeploymentNonce`` value in your template, it signals ECS to start a
     * new deployment even though no other service parameters have changed. The value must be a unique,
     * time- varying value like a timestamp, random string, or sequence number. Use this property when you
     * want to ensure your tasks pick up the latest version of a Docker image that uses the same tag but
     * has been updated in the registry.
     * @minLength 1
     * @maxLength 255
     */
    ForceNewDeploymentNonce?: string;
  };
  /**
   * The period of time, in seconds, that the Amazon ECS service scheduler ignores unhealthy Elastic
   * Load Balancing, VPC Lattice, and container health checks after a task has first started. If you do
   * not specify a health check grace period value, the default value of 0 is used. If you do not use
   * any of the health checks, then ``healthCheckGracePeriodSeconds`` is unused.
   * If your service has more running tasks than desired, unhealthy tasks in the grace period might be
   * stopped to reach the desired count.
   */
  HealthCheckGracePeriodSeconds?: number;
  /**
   * Specifies whether to turn on Amazon ECS managed tags for the tasks within the service. For more
   * information, see [Tagging your Amazon ECS
   * resources](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-using-tags.html) in the
   * Amazon Elastic Container Service Developer Guide*.
   * When you use Amazon ECS managed tags, you must set the ``propagateTags`` request parameter.
   */
  EnableECSManagedTags?: boolean;
  /**
   * Determines whether the execute command functionality is turned on for the service. If ``true``, the
   * execute command functionality is turned on for all containers in tasks as part of the service.
   */
  EnableExecuteCommand?: boolean;
  /**
   * An array of placement constraint objects to use for tasks in your service. You can specify a
   * maximum of 10 constraints for each task. This limit includes constraints in the task definition and
   * those specified at runtime.
   * To remove this property from your service resource, specify an empty ``PlacementConstraint``
   * array.
   */
  PlacementConstraints?: {
    /**
     * The type of constraint. Use ``distinctInstance`` to ensure that each task in a particular group is
     * running on a different container instance. Use ``memberOf`` to restrict the selection to a group of
     * valid candidates.
     * @enum ["distinctInstance","memberOf"]
     */
    Type: 'distinctInstance' | 'memberOf';
    /**
     * A cluster query language expression to apply to the constraint. The expression can have a maximum
     * length of 2000 characters. You can't specify an expression if the constraint type is
     * ``distinctInstance``. For more information, see [Cluster query
     * language](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-query-language.html)
     * in the *Amazon Elastic Container Service Developer Guide*.
     */
    Expression?: string;
  }[];
  /**
   * The short name or full Amazon Resource Name (ARN) of the cluster that you run your service on. If
   * you do not specify a cluster, the default cluster is assumed.
   */
  Cluster?: string;
  /**
   * A list of load balancer objects to associate with the service. If you specify the ``Role``
   * property, ``LoadBalancers`` must be specified as well. For information about the number of load
   * balancers that you can specify per service, see [Service Load
   * Balancing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-load-balancing.html)
   * in the *Amazon Elastic Container Service Developer Guide*.
   * To remove this property from your service resource, specify an empty ``LoadBalancer`` array.
   */
  LoadBalancers?: {
    /**
     * The full Amazon Resource Name (ARN) of the Elastic Load Balancing target group or groups associated
     * with a service or task set.
     * A target group ARN is only specified when using an Application Load Balancer or Network Load
     * Balancer.
     * For services using the ``ECS`` deployment controller, you can specify one or multiple target
     * groups. For more information, see [Registering multiple target groups with a
     * service](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/register-multiple-targetgroups.html)
     * in the *Amazon Elastic Container Service Developer Guide*.
     * For services using the ``CODE_DEPLOY`` deployment controller, you're required to define two target
     * groups for the load balancer. For more information, see [Blue/green deployment with
     * CodeDeploy](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-bluegreen.html)
     * in the *Amazon Elastic Container Service Developer Guide*.
     * If your service's task definition uses the ``awsvpc`` network mode, you must choose ``ip`` as the
     * target type, not ``instance``. Do this when creating your target groups because tasks that use the
     * ``awsvpc`` network mode are associated with an elastic network interface, not an Amazon EC2
     * instance. This network mode is required for the Fargate launch type.
     */
    TargetGroupArn?: string;
    /**
     * The name of the load balancer to associate with the Amazon ECS service or task set.
     * If you are using an Application Load Balancer or a Network Load Balancer the load balancer name
     * parameter should be omitted.
     */
    LoadBalancerName?: string;
    /**
     * The name of the container (as it appears in a container definition) to associate with the load
     * balancer.
     * You need to specify the container name when configuring the target group for an Amazon ECS load
     * balancer.
     */
    ContainerName?: string;
    /**
     * The port on the container to associate with the load balancer. This port must correspond to a
     * ``containerPort`` in the task definition the tasks in the service are using. For tasks that use the
     * EC2 launch type, the container instance they're launched on must allow ingress traffic on the
     * ``hostPort`` of the port mapping.
     */
    ContainerPort?: number;
    /**
     * The advanced settings for the load balancer used in blue/green deployments. Specify the alternate
     * target group, listener rules, and IAM role required for traffic shifting during blue/green
     * deployments.
     */
    AdvancedConfiguration?: {
      /**
       * The Amazon Resource Name (ARN) that identifies ) that identifies the test listener rule (in the
       * case of an Application Load Balancer) or listener (in the case for an Network Load Balancer) for
       * routing test traffic.
       */
      TestListenerRule?: string;
      /** The Amazon Resource Name (ARN) of the alternate target group for Amazon ECS blue/green deployments. */
      AlternateTargetGroupArn: string;
      /**
       * The Amazon Resource Name (ARN) that that identifies the production listener rule (in the case of an
       * Application Load Balancer) or listener (in the case for an Network Load Balancer) for routing
       * production traffic.
       */
      ProductionListenerRule?: string;
      /**
       * The Amazon Resource Name (ARN) of the IAM role that grants Amazon ECS permission to call the
       * Elastic Load Balancing APIs for you.
       */
      RoleArn?: string;
    };
  }[];
  /**
   * The configuration for this service to discover and connect to services, and be discovered by, and
   * connected from, other services within a namespace.
   * Tasks that run in a namespace can use short names to connect to services in the namespace. Tasks
   * can connect to services across all of the clusters in the namespace. Tasks connect through a
   * managed proxy container that collects logs and metrics for increased visibility. Only the tasks
   * that Amazon ECS services create are supported with Service Connect. For more information, see
   * [Service Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html)
   * in the *Amazon Elastic Container Service Developer Guide*.
   */
  ServiceConnectConfiguration?: {
    /**
     * The list of Service Connect service objects. These are names and aliases (also known as endpoints)
     * that are used by other Amazon ECS services to connect to this service.
     * This field is not required for a "client" Amazon ECS service that's a member of a namespace only
     * to connect to other services within the namespace. An example of this would be a frontend
     * application that accepts incoming requests from either a load balancer that's attached to the
     * service or by other means.
     * An object selects a port from the task definition, assigns a name for the CMAPlong service, and a
     * list of aliases (endpoints) and ports for client applications to refer to this service.
     */
    Services?: {
      /** A reference to an object that represents the configured timeouts for Service Connect. */
      Timeout?: {
        /**
         * The amount of time waiting for the upstream to respond with a complete response per request. A
         * value of ``0`` can be set to disable ``perRequestTimeout``. ``perRequestTimeout`` can only be set
         * if Service Connect ``appProtocol`` isn't ``TCP``. Only ``idleTimeout`` is allowed for
         * ``TCP````appProtocol``.
         */
        PerRequestTimeoutSeconds?: number;
        /**
         * The amount of time in seconds a connection will stay active while idle. A value of ``0`` can be set
         * to disable ``idleTimeout``.
         * The ``idleTimeout`` default for ``HTTP``/``HTTP2``/``GRPC`` is 5 minutes.
         * The ``idleTimeout`` default for ``TCP`` is 1 hour.
         */
        IdleTimeoutSeconds?: number;
      };
      /**
       * The port number for the Service Connect proxy to listen on.
       * Use the value of this field to bypass the proxy for traffic on the port number specified in the
       * named ``portMapping`` in the task definition of this application, and then use it in your VPC
       * security groups to allow traffic into the proxy for this Amazon ECS service.
       * In ``awsvpc`` mode and Fargate, the default value is the container port number. The container port
       * number is in the ``portMapping`` in the task definition. In bridge mode, the default value is the
       * ephemeral port of the Service Connect proxy.
       */
      IngressPortOverride?: number;
      /**
       * The list of client aliases for this Service Connect service. You use these to assign names that can
       * be used by client applications. The maximum number of client aliases that you can have in this list
       * is 1.
       * Each alias ("endpoint") is a fully-qualified name and port number that other Amazon ECS tasks
       * ("clients") can use to connect to this service.
       * Each name and port mapping must be unique within the namespace.
       * For each ``ServiceConnectService``, you must provide at least one ``clientAlias`` with one
       * ``port``.
       */
      ClientAliases?: {
        /**
         * The ``dnsName`` is the name that you use in the applications of client tasks to connect to this
         * service. The name must be a valid DNS name but doesn't need to be fully-qualified. The name can
         * include up to 127 characters. The name can include lowercase letters, numbers, underscores (_),
         * hyphens (-), and periods (.). The name can't start with a hyphen.
         * If this parameter isn't specified, the default value of ``discoveryName.namespace`` is used. If
         * the ``discoveryName`` isn't specified, the port mapping name from the task definition is used in
         * ``portName.namespace``.
         * To avoid changing your applications in client Amazon ECS services, set this to the same name that
         * the client application uses by default. For example, a few common names are ``database``, ``db``,
         * or the lowercase name of a database, such as ``mysql`` or ``redis``. For more information, see
         * [Service Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html)
         * in the *Amazon Elastic Container Service Developer Guide*.
         */
        DnsName?: string;
        /**
         * The configuration for test traffic routing rules used during blue/green deployments with Amazon ECS
         * Service Connect. This allows you to route a portion of traffic to the new service revision of your
         * service for testing before shifting all production traffic.
         */
        TestTrafficRules?: {
          /**
           * The HTTP header-based routing rules that determine which requests should be routed to the new
           * service version during blue/green deployment testing. These rules provide fine-grained control over
           * test traffic routing based on request headers.
           */
          Header: {
            Value?: {
              Exact: string;
            };
            Name: string;
          };
        };
        /**
         * The listening port number for the Service Connect proxy. This port is available inside of all of
         * the tasks within the same namespace.
         * To avoid changing your applications in client Amazon ECS services, set this to the same port that
         * the client application uses by default. For more information, see [Service
         * Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html) in the
         * Amazon Elastic Container Service Developer Guide*.
         */
        Port: number;
      }[];
      /** A reference to an object that represents a Transport Layer Security (TLS) configuration. */
      Tls?: {
        /** The signer certificate authority. */
        IssuerCertificateAuthority: {
          /** The ARN of the AWS Private Certificate Authority certificate. */
          AwsPcaAuthorityArn?: string;
        };
        /** The AWS Key Management Service key. */
        KmsKey?: string;
        /** The Amazon Resource Name (ARN) of the IAM role that's associated with the Service Connect TLS. */
        RoleArn?: string;
      };
      /**
       * The ``discoveryName`` is the name of the new CMAP service that Amazon ECS creates for this Amazon
       * ECS service. This must be unique within the CMAP namespace. The name can contain up to 64
       * characters. The name can include lowercase letters, numbers, underscores (_), and hyphens (-). The
       * name can't start with a hyphen.
       * If the ``discoveryName`` isn't specified, the port mapping name from the task definition is used
       * in ``portName.namespace``.
       */
      DiscoveryName?: string;
      /**
       * The ``portName`` must match the name of one of the ``portMappings`` from all the containers in the
       * task definition of this Amazon ECS service.
       */
      PortName: string;
    }[];
    /**
     * The configuration for Service Connect access logging. Access logs capture detailed information
     * about requests made to your service, including request patterns, response codes, and timing data.
     * They can be useful for debugging connectivity issues, monitoring service performance, and auditing
     * service-to-service communication for security and compliance purposes.
     * To enable access logs, you must also specify a ``logConfiguration`` in the
     * ``serviceConnectConfiguration``.
     */
    AccessLogConfiguration?: {
      /**
       * The format for Service Connect access log output. Choose TEXT for human-readable logs or JSON for
       * structured data that integrates well with log analysis tools.
       * @enum ["TEXT","JSON"]
       */
      Format: 'TEXT' | 'JSON';
      /**
       * Specifies whether to include query parameters in Service Connect access logs.
       * When enabled, query parameters from HTTP requests are included in the access logs. Consider
       * security and privacy implications when enabling this feature, as query parameters may contain
       * sensitive information such as request IDs and tokens. By default, this parameter is ``DISABLED``.
       * @enum ["DISABLED","ENABLED"]
       */
      IncludeQueryParameters?: 'DISABLED' | 'ENABLED';
    };
    /** Specifies whether to use Service Connect with this service. */
    Enabled: boolean;
    /**
     * The log configuration for the container. This parameter maps to ``LogConfig`` in the docker
     * container create command and the ``--log-driver`` option to docker run.
     * By default, containers use the same logging driver that the Docker daemon uses. However, the
     * container might use a different logging driver than the Docker daemon by specifying a log driver
     * configuration in the container definition.
     * Understand the following when specifying a log configuration for your containers.
     * +  Amazon ECS currently supports a subset of the logging drivers available to the Docker daemon.
     * Additional log drivers may be available in future releases of the Amazon ECS container agent.
     * For tasks on FARGATElong, the supported log drivers are ``awslogs``, ``splunk``, and
     * ``awsfirelens``.
     * For tasks hosted on Amazon EC2 instances, the supported log drivers are ``awslogs``, ``fluentd``,
     * ``gelf``, ``json-file``, ``journald``,``syslog``, ``splunk``, and ``awsfirelens``.
     * +  This parameter requires version 1.18 of the Docker Remote API or greater on your container
     * instance.
     * +  For tasks that are hosted on Amazon EC2 instances, the Amazon ECS container agent must
     * register the available logging drivers with the ``ECS_AVAILABLE_LOGGING_DRIVERS`` environment
     * variable before containers placed on that instance can use these log configuration options. For
     * more information, see [Amazon ECS container agent
     * configuration](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-config.html)
     * in the *Amazon Elastic Container Service Developer Guide*.
     * +  For tasks that are on FARGATElong, because you don't have access to the underlying
     * infrastructure your tasks are hosted on, any additional software needed must be installed outside
     * of the task. For example, the Fluentd output aggregators or a remote host running Logstash to send
     * Gelf logs to.
     */
    LogConfiguration?: {
      /**
       * The secrets to pass to the log configuration. For more information, see [Specifying sensitive
       * data](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)
       * in the *Amazon Elastic Container Service Developer Guide*.
       */
      SecretOptions?: {
        /**
         * The secret to expose to the container. The supported values are either the full ARN of the ASMlong
         * secret or the full ARN of the parameter in the SSM Parameter Store.
         * For information about the require IAMlong permissions, see [Required IAM permissions for Amazon
         * ECS
         * secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html#secrets-iam)
         * (for Secrets Manager) or [Required IAM permissions for Amazon ECS
         * secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-parameters.html)
         * (for Systems Manager Parameter store) in the *Amazon Elastic Container Service Developer Guide*.
         * If the SSM Parameter Store parameter exists in the same Region as the task you're launching, then
         * you can use either the full ARN or name of the parameter. If the parameter exists in a different
         * Region, then the full ARN must be specified.
         */
        ValueFrom: string;
        /** The name of the secret. */
        Name: string;
      }[];
      /**
       * The configuration options to send to the log driver.
       * The options you can specify depend on the log driver. Some of the options you can specify when you
       * use the ``awslogs`` log driver to route logs to Amazon CloudWatch include the following:
       * + awslogs-create-group Required: No Specify whether you want the log group to be created
       * automatically. If this option isn't specified, it defaults to false. Your IAM policy must include
       * the logs:CreateLogGroup permission before you attempt to use awslogs-create-group. + awslogs-region
       * Required: Yes Specify the Region that the awslogs log driver is to send your Docker logs to. You
       * can choose to send all of your logs from clusters in different Regions to a single region in
       * CloudWatch Logs. This is so that they're all visible in one location. Otherwise, you can separate
       * them by Region for more granularity. Make sure that the specified log group exists in the Region
       * that you specify with this option. + awslogs-group Required: Yes Make sure to specify a log group
       * that the awslogs log driver sends its log streams to. + awslogs-stream-prefix Required: Yes, when
       * using Fargate.Optional when using EC2. Use the awslogs-stream-prefix option to associate a log
       * stream with the specified prefix, the container name, and the ID of the Amazon ECS task that the
       * container belongs to. If you specify a prefix with this option, then the log stream takes the
       * format prefix-name/container-name/ecs-task-id. If you don't specify a prefix with this option, then
       * the log stream is named after the container ID that's assigned by the Docker daemon on the
       * container instance. Because it's difficult to trace logs back to the container that sent them with
       * just the Docker container ID (which is only available on the container instance), we recommend that
       * you specify a prefix with this option. For Amazon ECS services, you can use the service name as the
       * prefix. Doing so, you can trace log streams to the service that the container belongs to, the name
       * of the container that sent them, and the ID of the task that the container belongs to. You must
       * specify a stream-prefix for your logs to have your logs appear in the Log pane when using the
       * Amazon ECS console. + awslogs-datetime-format Required: No This option defines a multiline start
       * pattern in Python strftime format. A log message consists of a line that matches the pattern and
       * any following lines that don’t match the pattern. The matched line is the delimiter between log
       * messages. One example of a use case for using this format is for parsing output such as a stack
       * dump, which might otherwise be logged in multiple entries. The correct pattern allows it to be
       * captured in a single entry. For more information, see awslogs-datetime-format. You cannot configure
       * both the awslogs-datetime-format and awslogs-multiline-pattern options. Multiline logging performs
       * regular expression parsing and matching of all log messages. This might have a negative impact on
       * logging performance. + awslogs-multiline-pattern Required: No This option defines a multiline start
       * pattern that uses a regular expression. A log message consists of a line that matches the pattern
       * and any following lines that don’t match the pattern. The matched line is the delimiter between log
       * messages. For more information, see awslogs-multiline-pattern. This option is ignored if
       * awslogs-datetime-format is also configured. You cannot configure both the awslogs-datetime-format
       * and awslogs-multiline-pattern options. Multiline logging performs regular expression parsing and
       * matching of all log messages. This might have a negative impact on logging performance.
       * The following options apply to all supported log drivers.
       * + mode Required: No Valid values: non-blocking | blocking This option defines the delivery mode
       * of log messages from the container to the log driver specified using logDriver. The delivery mode
       * you choose affects application availability when the flow of logs from container is interrupted. If
       * you use the blocking mode and the flow of logs is interrupted, calls from container code to write
       * to the stdout and stderr streams will block. The logging thread of the application will block as a
       * result. This may cause the application to become unresponsive and lead to container healthcheck
       * failure. If you use the non-blocking mode, the container's logs are instead stored in an in-memory
       * intermediate buffer configured with the max-buffer-size option. This prevents the application from
       * becoming unresponsive when logs cannot be sent. We recommend using this mode if you want to ensure
       * service availability and are okay with some log loss. For more information, see Preventing log loss
       * with non-blocking mode in the awslogs container log driver. You can set a default mode for all
       * containers in a specific Region by using the defaultLogDriverMode account setting. If you don't
       * specify the mode option or configure the account setting, Amazon ECS will default to the
       * non-blocking mode. For more information about the account setting, see Default log driver mode in
       * the Amazon Elastic Container Service Developer Guide. On June 25, 2025, Amazon ECS changed the
       * default log driver mode from blocking to non-blocking to prioritize task availability over logging.
       * To continue using the blocking mode after this change, do one of the following: Set the mode option
       * in your container definition's logConfiguration as blocking. Set the defaultLogDriverMode account
       * setting to blocking. + max-buffer-size Required: No Default value: 10m When non-blocking mode is
       * used, the max-buffer-size log option controls the size of the buffer that's used for intermediate
       * message storage. Make sure to specify an adequate buffer size based on your application. When the
       * buffer fills up, further logs cannot be stored. Logs that cannot be stored are lost.
       * To route logs using the ``splunk`` log router, you need to specify a ``splunk-token`` and a
       * ``splunk-url``.
       * When you use the ``awsfirelens`` log router to route logs to an AWS Service or AWS Partner Network
       * destination for log storage and analytics, you can set the ``log-driver-buffer-limit`` option to
       * limit the number of events that are buffered in memory, before being sent to the log router
       * container. It can help to resolve potential log loss issue because high throughput might result in
       * memory running out for the buffer inside of Docker.
       * Other options you can specify when using ``awsfirelens`` to route logs depend on the destination.
       * When you export logs to Amazon Data Firehose, you can specify the AWS Region with ``region`` and a
       * name for the log stream with ``delivery_stream``.
       * When you export logs to Amazon Kinesis Data Streams, you can specify an AWS Region with ``region``
       * and a data stream name with ``stream``.
       * When you export logs to Amazon OpenSearch Service, you can specify options like ``Name``,
       * ``Host`` (OpenSearch Service endpoint without protocol), ``Port``, ``Index``, ``Type``,
       * ``Aws_auth``, ``Aws_region``, ``Suppress_Type_Name``, and ``tls``. For more information, see [Under
       * the hood: FireLens for Amazon ECS
       * Tasks](https://docs.aws.amazon.com/containers/under-the-hood-firelens-for-amazon-ecs-tasks/).
       * When you export logs to Amazon S3, you can specify the bucket using the ``bucket`` option. You can
       * also specify ``region``, ``total_file_size``, ``upload_timeout``, and ``use_put_object`` as
       * options.
       * This parameter requires version 1.19 of the Docker Remote API or greater on your container
       * instance. To check the Docker Remote API version on your container instance, log in to your
       * container instance and run the following command: ``sudo docker version --format
       * '{{.Server.APIVersion}}'``
       */
      Options?: Record<string, string>;
      /**
       * The log driver to use for the container.
       * For tasks on FARGATElong, the supported log drivers are ``awslogs``, ``splunk``, and
       * ``awsfirelens``.
       * For tasks hosted on Amazon EC2 instances, the supported log drivers are ``awslogs``, ``fluentd``,
       * ``gelf``, ``json-file``, ``journald``, ``syslog``, ``splunk``, and ``awsfirelens``.
       * For more information about using the ``awslogs`` log driver, see [Send Amazon ECS logs to
       * CloudWatch](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html) in the
       * Amazon Elastic Container Service Developer Guide*.
       * For more information about using the ``awsfirelens`` log driver, see [Send Amazon ECS logs to an
       * service or
       * Partner](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html).
       * If you have a custom driver that isn't listed, you can fork the Amazon ECS container agent
       * project that's [available on
       * GitHub](https://docs.aws.amazon.com/https://github.com/aws/amazon-ecs-agent) and customize it to
       * work with that driver. We encourage you to submit pull requests for changes that you would like to
       * have included. However, we don't currently provide support for running modified copies of this
       * software.
       */
      LogDriver?: string;
    };
    /**
     * The namespace name or full Amazon Resource Name (ARN) of the CMAPlong namespace for use with
     * Service Connect. The namespace must be in the same AWS Region as the Amazon ECS service and
     * cluster. The type of namespace doesn't affect Service Connect. For more information about CMAPlong,
     * see [Working with
     * Services](https://docs.aws.amazon.com/cloud-map/latest/dg/working-with-services.html) in the
     * Developer Guide*.
     */
    Namespace?: string;
  };
  /**
   * The number of instantiations of the specified task definition to place and keep running in your
   * service.
   * For new services, if a desired count is not specified, a default value of ``1`` is used. When
   * using the ``DAEMON`` scheduling strategy, the desired count is not required.
   * For existing services, if a desired count is not specified, it is omitted from the operation.
   */
  DesiredCount?: number;
  /** The VPC Lattice configuration for the service being created. */
  VpcLatticeConfigurations?: {
    /**
     * The full Amazon Resource Name (ARN) of the target group or groups associated with the VPC Lattice
     * configuration that the Amazon ECS tasks will be registered to.
     */
    TargetGroupArn: string;
    /**
     * The name of the port mapping to register in the VPC Lattice target group. This is the name of the
     * ``portMapping`` you defined in your task definition.
     */
    PortName: string;
    /**
     * The ARN of the IAM role to associate with this VPC Lattice configuration. This is the Amazon ECS
     * infrastructure IAM role that is used to manage your VPC Lattice infrastructure.
     */
    RoleArn: string;
  }[];
  /** The deployment controller to use for the service. */
  DeploymentController?: {
    /**
     * The deployment controller type to use.
     * The deployment controller is the mechanism that determines how tasks are deployed for your
     * service. The valid options are:
     * +  ECS
     * When you create a service which uses the ``ECS`` deployment controller, you can choose between the
     * following deployment strategies:
     * +  ``ROLLING``: When you create a service which uses the *rolling update* (``ROLLING``)
     * deployment strategy, the ECS service scheduler replaces the currently running tasks with new tasks.
     * The number of tasks that ECS adds or removes from the service during a rolling update is controlled
     * by the service deployment configuration.
     * Rolling update deployments are best suited for the following scenarios:
     * +  Gradual service updates: You need to update your service incrementally without taking the
     * entire service offline at once.
     * +  Limited resource requirements: You want to avoid the additional resource costs of running two
     * complete environments simultaneously (as required by blue/green deployments).
     * +  Acceptable deployment time: Your application can tolerate a longer deployment process, as
     * rolling updates replace tasks one by one.
     * +  No need for instant roll back: Your service can tolerate a rollback process that takes minutes
     * rather than seconds.
     * +  Simple deployment process: You prefer a straightforward deployment approach without the
     * complexity of managing multiple environments, target groups, and listeners.
     * +  No load balancer requirement: Your service doesn't use or require a load balancer, ALB, NLB,
     * or Service Connect (which are required for blue/green deployments).
     * +  Stateful applications: Your application maintains state that makes it difficult to run two
     * parallel environments.
     * +  Cost sensitivity: You want to minimize deployment costs by not running duplicate environments
     * during deployment.
     * Rolling updates are the default deployment strategy for services and provide a balance between
     * deployment safety and resource efficiency for many common application scenarios.
     * +  ``BLUE_GREEN``: A *blue/green* deployment strategy (``BLUE_GREEN``) is a release methodology
     * that reduces downtime and risk by running two identical production environments called blue and
     * green. With ECS blue/green deployments, you can validate new service revisions before directing
     * production traffic to them. This approach provides a safer way to deploy changes with the ability
     * to quickly roll back if needed.
     * ECS blue/green deployments are best suited for the following scenarios:
     * +  Service validation: When you need to validate new service revisions before directing
     * production traffic to them
     * +  Zero downtime: When your service requires zero-downtime deployments
     * +  Instant roll back: When you need the ability to quickly roll back if issues are detected
     * +  Load balancer requirement: When your service uses ALB, NLB, or Service Connect
     * +  External
     * Use a third-party deployment controller.
     * +  Blue/green deployment (powered by ACD)
     * ACD installs an updated version of the application as a new replacement task set and reroutes
     * production traffic from the original application task set to the replacement task set. The original
     * task set is terminated after a successful deployment. Use this deployment controller to verify a
     * new deployment of a service before sending production traffic to it.
     * When updating the deployment controller for a service, consider the following depending on the
     * type of migration you're performing.
     * +  If you have a template that contains the ``EXTERNAL`` deployment controller information as
     * well as ``TaskSet`` and ``PrimaryTaskSet`` resources, and you remove the task set resources from
     * the template when updating from ``EXTERNAL`` to ``ECS``, the ``DescribeTaskSet`` and
     * ``DeleteTaskSet`` API calls will return a 400 error after the deployment controller is updated to
     * ``ECS``. This results in a delete failure on the task set resources, even though the stack
     * transitions to ``UPDATE_COMPLETE`` status. For more information, see [Resource removed from stack
     * but not
     * deleted](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/troubleshooting.html#troubleshooting-errors-resource-removed-not-deleted)
     * in the CFNlong User Guide. To fix this issue, delete the task sets directly using the
     * ECS``DeleteTaskSet`` API. For more information about how to delete a task set, see
     * [DeleteTaskSet](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeleteTaskSet.html)
     * in the ECSlong API Reference.
     * +  If you're migrating from ``CODE_DEPLOY`` to ``ECS`` with a new task definition and CFN
     * performs a rollback operation, the ECS``UpdateService`` request fails with the following error:
     * Resource handler returned message: "Invalid request provided: Unable to update task definition on
     * services with a CODE_DEPLOY deployment controller.
     * +  After a successful migration from ``ECS`` to ``EXTERNAL`` deployment controller, you need to
     * manually remove the ``ACTIVE`` task set, because ECS no longer manages the deployment. For
     * information about how to delete a task set, see
     * [DeleteTaskSet](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DeleteTaskSet.html)
     * in the ECSlong API Reference.
     * @enum ["CODE_DEPLOY","ECS","EXTERNAL"]
     */
    Type?: 'CODE_DEPLOY' | 'ECS' | 'EXTERNAL';
  };
  /**
   * The name or full Amazon Resource Name (ARN) of the IAM role that allows Amazon ECS to make calls to
   * your load balancer on your behalf. This parameter is only permitted if you are using a load
   * balancer with your service and your task definition doesn't use the ``awsvpc`` network mode. If you
   * specify the ``role`` parameter, you must also specify a load balancer object with the
   * ``loadBalancers`` parameter.
   * If your account has already created the Amazon ECS service-linked role, that role is used for
   * your service unless you specify a role here. The service-linked role is required if your task
   * definition uses the ``awsvpc`` network mode or if the service is configured to use service
   * discovery, an external deployment controller, multiple target groups, or Elastic Inference
   * accelerators in which case you don't specify a role here. For more information, see [Using
   * service-linked roles for Amazon
   * ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using-service-linked-roles.html)
   * in the *Amazon Elastic Container Service Developer Guide*.
   * If your specified role has a path other than ``/``, then you must either specify the full role
   * ARN (this is recommended) or prefix the role name with the path. For example, if a role with the
   * name ``bar`` has a path of ``/foo/`` then you would specify ``/foo/bar`` as the role name. For more
   * information, see [Friendly names and
   * paths](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html#identifiers-friendly-names)
   * in the *IAM User Guide*.
   */
  Role?: string;
  /**
   * The ``family`` and ``revision`` (``family:revision``) or full ARN of the task definition to run in
   * your service. If a ``revision`` isn't specified, the latest ``ACTIVE`` revision is used.
   * A task definition must be specified if the service uses either the ``ECS`` or ``CODE_DEPLOY``
   * deployment controllers.
   * For more information about deployment types, see [Amazon ECS deployment
   * types](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-types.html).
   */
  TaskDefinition?: string;
  /**
   * The name of your service. Up to 255 letters (uppercase and lowercase), numbers, underscores, and
   * hyphens are allowed. Service names must be unique within a cluster, but you can have similarly
   * named services in multiple clusters within a Region or across multiple Regions.
   * The stack update fails if you change any properties that require replacement and the
   * ``ServiceName`` is configured. This is because AWS CloudFormation creates the replacement service
   * first, but each ``ServiceName`` must be unique in the cluster.
   */
  ServiceName?: string;
  /**
   * Optional deployment parameters that control how many tasks run during the deployment and the
   * ordering of stopping and starting tasks.
   */
  DeploymentConfiguration?: {
    /**
     * Configuration for canary deployment strategy. Only valid when the deployment strategy is
     * ``CANARY``. This configuration enables shifting a fixed percentage of traffic for testing, followed
     * by shifting the remaining traffic after a bake period.
     */
    CanaryConfiguration?: {
      /**
       * The percentage of production traffic to shift to the new service revision during the canary phase.
       * Valid values are multiples of 0.1 from 0.1 to 100.0. The default value is 5.0.
       * @minimum 0.1
       * @maximum 100
       */
      CanaryPercent?: number;
      /**
       * The amount of time in minutes to wait during the canary phase before shifting the remaining
       * production traffic to the new service revision. Valid values are 0 to 1440 minutes (24 hours). The
       * default value is 10.
       * @minimum 0
       * @maximum 1440
       */
      CanaryBakeTimeInMinutes?: number;
    };
    /**
     * The duration when both blue and green service revisions are running simultaneously after the
     * production traffic has shifted.
     * The following rules apply when you don't specify a value:
     * +  For rolling deployments, the value is set to 3 hours (180 minutes).
     * +  When you use an external deployment controller (``EXTERNAL``), or the ACD blue/green
     * deployment controller (``CODE_DEPLOY``), the value is set to 3 hours (180 minutes).
     * +  For all other cases, the value is set to 36 hours (2160 minutes).
     * @minimum 0
     * @maximum 1440
     */
    BakeTimeInMinutes?: number;
    /**
     * An array of deployment lifecycle hook objects to run custom logic at specific stages of the
     * deployment lifecycle.
     */
    LifecycleHooks?: {
      /**
       * The lifecycle stages at which to run the hook. Choose from these valid values:
       * +  RECONCILE_SERVICE
       * The reconciliation stage that only happens when you start a new service deployment with more than
       * 1 service revision in an ACTIVE state.
       * You can use a lifecycle hook for this stage.
       * +  PRE_SCALE_UP
       * The green service revision has not started. The blue service revision is handling 100% of the
       * production traffic. There is no test traffic.
       * You can use a lifecycle hook for this stage.
       * +  POST_SCALE_UP
       * The green service revision has started. The blue service revision is handling 100% of the
       * production traffic. There is no test traffic.
       * You can use a lifecycle hook for this stage.
       * +  TEST_TRAFFIC_SHIFT
       * The blue and green service revisions are running. The blue service revision handles 100% of the
       * production traffic. The green service revision is migrating from 0% to 100% of test traffic.
       * You can use a lifecycle hook for this stage.
       * +  POST_TEST_TRAFFIC_SHIFT
       * The test traffic shift is complete. The green service revision handles 100% of the test traffic.
       * You can use a lifecycle hook for this stage.
       * +  PRODUCTION_TRAFFIC_SHIFT
       * Production traffic is shifting to the green service revision. The green service revision is
       * migrating from 0% to 100% of production traffic.
       * You can use a lifecycle hook for this stage.
       * +  POST_PRODUCTION_TRAFFIC_SHIFT
       * The production traffic shift is complete.
       * You can use a lifecycle hook for this stage.
       * You must provide this parameter when configuring a deployment lifecycle hook.
       * @minItems 1
       */
      LifecycleStages: (
        | 'RECONCILE_SERVICE'
        | 'PRE_SCALE_UP'
        | 'POST_SCALE_UP'
        | 'TEST_TRAFFIC_SHIFT'
        | 'POST_TEST_TRAFFIC_SHIFT'
        | 'PRODUCTION_TRAFFIC_SHIFT'
        | 'POST_PRODUCTION_TRAFFIC_SHIFT'
      )[];
      /**
       * The Amazon Resource Name (ARN) of the hook target. Currently, only Lambda function ARNs are
       * supported.
       * You must provide this parameter when configuring a deployment lifecycle hook.
       */
      HookTargetArn: string;
      /**
       * Use this field to specify custom parameters that ECS passes to your hook target invocations (such
       * as a Lambda function).
       * This field must be a JSON object as a string.
       */
      HookDetails?: string | Record<string, unknown>;
      /**
       * The Amazon Resource Name (ARN) of the IAM role that grants Amazon ECS permission to call Lambda
       * functions on your behalf.
       * For more information, see [Permissions required for Lambda functions in Amazon ECS blue/green
       * deployments](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/blue-green-permissions.html)
       * in the *Amazon Elastic Container Service Developer Guide*.
       */
      RoleArn: string;
    }[];
    /** Information about the CloudWatch alarms. */
    Alarms?: {
      /** One or more CloudWatch alarm names. Use a "," to separate the alarms. */
      AlarmNames: string[];
      /** Determines whether to use the CloudWatch alarm option in the service deployment process. */
      Enable: boolean;
      /**
       * Determines whether to configure Amazon ECS to roll back the service if a service deployment fails.
       * If rollback is used, when a service deployment fails, the service is rolled back to the last
       * deployment that completed successfully.
       */
      Rollback: boolean;
    };
    /**
     * The deployment strategy for the service. Choose from these valid values:
     * +  ``ROLLING`` - When you create a service which uses the rolling update (``ROLLING``) deployment
     * strategy, the Amazon ECS service scheduler replaces the currently running tasks with new tasks. The
     * number of tasks that Amazon ECS adds or removes from the service during a rolling update is
     * controlled by the service deployment configuration.
     * +  ``BLUE_GREEN`` - A blue/green deployment strategy (``BLUE_GREEN``) is a release methodology
     * that reduces downtime and risk by running two identical production environments called blue and
     * green. With Amazon ECS blue/green deployments, you can validate new service revisions before
     * directing production traffic to them. This approach provides a safer way to deploy changes with the
     * ability to quickly roll back if needed.
     * @enum ["ROLLING","BLUE_GREEN","LINEAR","CANARY"]
     */
    Strategy?: 'ROLLING' | 'BLUE_GREEN' | 'LINEAR' | 'CANARY';
    /**
     * The deployment circuit breaker can only be used for services using the rolling update (``ECS``)
     * deployment type.
     * The *deployment circuit breaker* determines whether a service deployment will fail if the service
     * can't reach a steady state. If you use the deployment circuit breaker, a service deployment will
     * transition to a failed state and stop launching new tasks. If you use the rollback option, when a
     * service deployment fails, the service is rolled back to the last deployment that completed
     * successfully. For more information, see [Rolling
     * update](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html) in
     * the *Amazon Elastic Container Service Developer Guide*
     */
    DeploymentCircuitBreaker?: {
      /** Determines whether to use the deployment circuit breaker logic for the service. */
      Enable: boolean;
      /**
       * Determines whether to configure Amazon ECS to roll back the service if a service deployment fails.
       * If rollback is on, when a service deployment fails, the service is rolled back to the last
       * deployment that completed successfully.
       */
      Rollback: boolean;
    };
    /**
     * If a service is using the rolling update (``ECS``) deployment type, the ``maximumPercent``
     * parameter represents an upper limit on the number of your service's tasks that are allowed in the
     * ``RUNNING`` or ``PENDING`` state during a deployment, as a percentage of the ``desiredCount``
     * (rounded down to the nearest integer). This parameter enables you to define the deployment batch
     * size. For example, if your service is using the ``REPLICA`` service scheduler and has a
     * ``desiredCount`` of four tasks and a ``maximumPercent`` value of 200%, the scheduler may start four
     * new tasks before stopping the four older tasks (provided that the cluster resources required to do
     * this are available). The default ``maximumPercent`` value for a service using the ``REPLICA``
     * service scheduler is 200%.
     * The Amazon ECS scheduler uses this parameter to replace unhealthy tasks by starting replacement
     * tasks first and then stopping the unhealthy tasks, as long as cluster resources for starting
     * replacement tasks are available. For more information about how the scheduler replaces unhealthy
     * tasks, see [Amazon ECS
     * services](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html).
     * If a service is using either the blue/green (``CODE_DEPLOY``) or ``EXTERNAL`` deployment types,
     * and tasks in the service use the EC2 launch type, the *maximum percent* value is set to the default
     * value. The *maximum percent* value is used to define the upper limit on the number of the tasks in
     * the service that remain in the ``RUNNING`` state while the container instances are in the
     * ``DRAINING`` state.
     * You can't specify a custom ``maximumPercent`` value for a service that uses either the blue/green
     * (``CODE_DEPLOY``) or ``EXTERNAL`` deployment types and has tasks that use the EC2 launch type.
     * If the service uses either the blue/green (``CODE_DEPLOY``) or ``EXTERNAL`` deployment types, and
     * the tasks in the service use the Fargate launch type, the maximum percent value is not used. The
     * value is still returned when describing your service.
     */
    MaximumPercent?: number;
    /**
     * If a service is using the rolling update (``ECS``) deployment type, the ``minimumHealthyPercent``
     * represents a lower limit on the number of your service's tasks that must remain in the ``RUNNING``
     * state during a deployment, as a percentage of the ``desiredCount`` (rounded up to the nearest
     * integer). This parameter enables you to deploy without using additional cluster capacity. For
     * example, if your service has a ``desiredCount`` of four tasks and a ``minimumHealthyPercent`` of
     * 50%, the service scheduler may stop two existing tasks to free up cluster capacity before starting
     * two new tasks.
     * If any tasks are unhealthy and if ``maximumPercent`` doesn't allow the Amazon ECS scheduler to
     * start replacement tasks, the scheduler stops the unhealthy tasks one-by-one — using the
     * ``minimumHealthyPercent`` as a constraint — to clear up capacity to launch replacement tasks. For
     * more information about how the scheduler replaces unhealthy tasks, see [Amazon ECS
     * services](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_services.html).
     * For services that *do not* use a load balancer, the following should be noted:
     * +  A service is considered healthy if all essential containers within the tasks in the service
     * pass their health checks.
     * +  If a task has no essential containers with a health check defined, the service scheduler will
     * wait for 40 seconds after a task reaches a ``RUNNING`` state before the task is counted towards the
     * minimum healthy percent total.
     * +  If a task has one or more essential containers with a health check defined, the service
     * scheduler will wait for the task to reach a healthy status before counting it towards the minimum
     * healthy percent total. A task is considered healthy when all essential containers within the task
     * have passed their health checks. The amount of time the service scheduler can wait for is
     * determined by the container health check settings.
     * For services that *do* use a load balancer, the following should be noted:
     * +  If a task has no essential containers with a health check defined, the service scheduler will
     * wait for the load balancer target group health check to return a healthy status before counting the
     * task towards the minimum healthy percent total.
     * +  If a task has an essential container with a health check defined, the service scheduler will
     * wait for both the task to reach a healthy status and the load balancer target group health check to
     * return a healthy status before counting the task towards the minimum healthy percent total.
     * The default value for a replica service for ``minimumHealthyPercent`` is 100%. The default
     * ``minimumHealthyPercent`` value for a service using the ``DAEMON`` service schedule is 0% for the
     * CLI, the AWS SDKs, and the APIs and 50% for the AWS Management Console.
     * The minimum number of healthy tasks during a deployment is the ``desiredCount`` multiplied by the
     * ``minimumHealthyPercent``/100, rounded up to the nearest integer value.
     * If a service is using either the blue/green (``CODE_DEPLOY``) or ``EXTERNAL`` deployment types and
     * is running tasks that use the EC2 launch type, the *minimum healthy percent* value is set to the
     * default value. The *minimum healthy percent* value is used to define the lower limit on the number
     * of the tasks in the service that remain in the ``RUNNING`` state while the container instances are
     * in the ``DRAINING`` state.
     * You can't specify a custom ``minimumHealthyPercent`` value for a service that uses either the
     * blue/green (``CODE_DEPLOY``) or ``EXTERNAL`` deployment types and has tasks that use the EC2 launch
     * type.
     * If a service is using either the blue/green (``CODE_DEPLOY``) or ``EXTERNAL`` deployment types
     * and is running tasks that use the Fargate launch type, the minimum healthy percent value is not
     * used, although it is returned when describing your service.
     */
    MinimumHealthyPercent?: number;
    /**
     * Configuration for linear deployment strategy. Only valid when the deployment strategy is
     * ``LINEAR``. This configuration enables progressive traffic shifting in equal percentage increments
     * with configurable bake times between each step.
     */
    LinearConfiguration?: {
      /**
       * The amount of time in minutes to wait between each traffic shifting step during a linear
       * deployment. Valid values are 0 to 1440 minutes (24 hours). The default value is 6. This bake time
       * is not applied after reaching 100 percent traffic.
       * @minimum 0
       * @maximum 1440
       */
      StepBakeTimeInMinutes?: number;
      /**
       * The percentage of production traffic to shift in each step during a linear deployment. Valid values
       * are multiples of 0.1 from 3.0 to 100.0. The default value is 10.0.
       * @minimum 3
       * @maximum 100
       */
      StepPercent?: number;
    };
  };
};


/**
 * Registers a new task definition from the supplied ``family`` and ``containerDefinitions``.
 * Optionally, you can add data volumes to your containers with the ``volumes`` parameter. For more
 * information about task definition parameters and defaults, see [Amazon ECS Task
 * Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_defintions.html) in
 * the *Amazon Elastic Container Service Developer Guide*.
 * You can specify a role for your task with the ``taskRoleArn`` parameter. When you specify a role
 * for a task, its containers can then use the latest versions of the CLI or SDKs to make API requests
 * to the AWS services that are specified in the policy that's associated with the role. For more
 * information, see [IAM Roles for
 * Tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html) in the
 * *Amazon Elastic Container Service Developer Guide*.
 * You can specify a Docker networking mode for the containers in your task definition with the
 * ``networkMode`` parameter. If you specify the ``awsvpc`` network mode, the task is allocated an
 * elastic network interface, and you must specify a
 * [NetworkConfiguration](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_NetworkConfiguration.html)
 * when you create a service or run a task with the task definition. For more information, see [Task
 * Networking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking.html) in
 * the *Amazon Elastic Container Service Developer Guide*.
 * In the following example or examples, the Authorization header contents (``AUTHPARAMS``) must be
 * replaced with an AWS Signature Version 4 signature. For more information, see [Signature Version 4
 * Signing Process](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html) in the
 * *General Reference*.
 * You only need to learn how to sign HTTP requests if you intend to create them manually. When you
 * use the [](https://docs.aws.amazon.com/cli/) or one of the
 * [SDKs](https://docs.aws.amazon.com/tools/) to make requests to AWS, these tools automatically sign
 * the requests for you, with the access key that you specify when you configure the tools. When you
 * use these tools, you don't have to sign requests yourself.
 */
export type AwsEcsTaskdefinition = {
  /**
   * The short name or full Amazon Resource Name (ARN) of the IAMlong role that grants containers in the
   * task permission to call AWS APIs on your behalf. For more information, see [Amazon ECS Task
   * Role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html) in the
   * *Amazon Elastic Container Service Developer Guide*.
   * IAM roles for tasks on Windows require that the ``-EnableTaskIAMRole`` option is set when you
   * launch the Amazon ECS-optimized Windows AMI. Your containers must also run some configuration code
   * to use the feature. For more information, see [Windows IAM roles for
   * tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/windows_task_IAM_roles.html) in
   * the *Amazon Elastic Container Service Developer Guide*.
   * String validation is done on the ECS side. If an invalid string value is given for
   * ``TaskRoleArn``, it may cause the Cloudformation job to hang.
   */
  TaskRoleArn?: string;
  /**
   * The IPC resource namespace to use for the containers in the task. The valid values are ``host``,
   * ``task``, or ``none``. If ``host`` is specified, then all containers within the tasks that
   * specified the ``host`` IPC mode on the same container instance share the same IPC resources with
   * the host Amazon EC2 instance. If ``task`` is specified, all containers within the specified task
   * share the same IPC resources. If ``none`` is specified, then IPC resources within the containers of
   * a task are private and not shared with other containers in a task or on the container instance. If
   * no value is specified, then the IPC resource namespace sharing depends on the Docker daemon setting
   * on the container instance.
   * If the ``host`` IPC mode is used, be aware that there is a heightened risk of undesired IPC
   * namespace expose.
   * If you are setting namespaced kernel parameters using ``systemControls`` for the containers in the
   * task, the following will apply to your IPC resource namespace. For more information, see [System
   * Controls](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html)
   * in the *Amazon Elastic Container Service Developer Guide*.
   * +  For tasks that use the ``host`` IPC mode, IPC namespace related ``systemControls`` are not
   * supported.
   * +  For tasks that use the ``task`` IPC mode, IPC namespace related ``systemControls`` will apply
   * to all containers within a task.
   * This parameter is not supported for Windows containers or tasks run on FARGATElong.
   */
  IpcMode?: string;
  /** @uniqueItems true */
  InferenceAccelerators?: {
    DeviceType?: string;
    DeviceName?: string;
  }[];
  /**
   * The amount (in MiB) of memory used by the task.
   * If your tasks runs on Amazon EC2 instances, you must specify either a task-level memory value or a
   * container-level memory value. This field is optional and any value can be used. If a task-level
   * memory value is specified, the container-level memory value is optional. For more information
   * regarding container-level memory and memory reservation, see
   * [ContainerDefinition](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html).
   * If your tasks runs on FARGATElong, this field is required. You must use one of the following
   * values. The value you choose determines your range of valid values for the ``cpu`` parameter.
   * +  512 (0.5 GB), 1024 (1 GB), 2048 (2 GB) - Available ``cpu`` values: 256 (.25 vCPU)
   * +  1024 (1 GB), 2048 (2 GB), 3072 (3 GB), 4096 (4 GB) - Available ``cpu`` values: 512 (.5 vCPU)
   * +  2048 (2 GB), 3072 (3 GB), 4096 (4 GB), 5120 (5 GB), 6144 (6 GB), 7168 (7 GB), 8192 (8 GB) -
   * Available ``cpu`` values: 1024 (1 vCPU)
   * +  Between 4096 (4 GB) and 16384 (16 GB) in increments of 1024 (1 GB) - Available ``cpu`` values:
   * 2048 (2 vCPU)
   * +  Between 8192 (8 GB) and 30720 (30 GB) in increments of 1024 (1 GB) - Available ``cpu`` values:
   * 4096 (4 vCPU)
   * +  Between 16 GB and 60 GB in 4 GB increments - Available ``cpu`` values: 8192 (8 vCPU)
   * This option requires Linux platform ``1.4.0`` or later.
   * +  Between 32GB and 120 GB in 8 GB increments - Available ``cpu`` values: 16384 (16 vCPU)
   * This option requires Linux platform ``1.4.0`` or later.
   */
  Memory?: string;
  /**
   * An array of placement constraint objects to use for tasks.
   * This parameter isn't supported for tasks run on FARGATElong.
   * @uniqueItems true
   */
  PlacementConstraints?: {
    /**
     * The type of constraint. The ``MemberOf`` constraint restricts selection to be from a group of valid
     * candidates.
     */
    Type: string;
    /**
     * A cluster query language expression to apply to the constraint. For more information, see [Cluster
     * query
     * language](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-query-language.html)
     * in the *Amazon Elastic Container Service Developer Guide*.
     */
    Expression?: string;
  }[];
  /**
   * The number of ``cpu`` units used by the task. If you use the EC2 launch type, this field is
   * optional. Any value can be used. If you use the Fargate launch type, this field is required. You
   * must use one of the following values. The value that you choose determines your range of valid
   * values for the ``memory`` parameter.
   * If you're using the EC2 launch type or the external launch type, this field is optional. Supported
   * values are between ``128`` CPU units (``0.125`` vCPUs) and ``196608`` CPU units (``192`` vCPUs).
   * This field is required for Fargate. For information about the valid values, see [Task
   * size](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html#task_size)
   * in the *Amazon Elastic Container Service Developer Guide*.
   */
  Cpu?: string;
  /**
   * The task launch types the task definition was validated against. The valid values are
   * ``MANAGED_INSTANCES``, ``EC2``, ``FARGATE``, and ``EXTERNAL``. For more information, see [Amazon
   * ECS launch types](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/launch_types.html) in
   * the *Amazon Elastic Container Service Developer Guide*.
   * @uniqueItems true
   */
  RequiresCompatibilities?: string[];
  /**
   * The Docker networking mode to use for the containers in the task. The valid values are ``none``,
   * ``bridge``, ``awsvpc``, and ``host``. If no network mode is specified, the default is ``bridge``.
   * For Amazon ECS tasks on Fargate, the ``awsvpc`` network mode is required. For Amazon ECS tasks on
   * Amazon EC2 Linux instances, any network mode can be used. For Amazon ECS tasks on Amazon EC2
   * Windows instances, ``<default>`` or ``awsvpc`` can be used. If the network mode is set to ``none``,
   * you cannot specify port mappings in your container definitions, and the tasks containers do not
   * have external connectivity. The ``host`` and ``awsvpc`` network modes offer the highest networking
   * performance for containers because they use the EC2 network stack instead of the virtualized
   * network stack provided by the ``bridge`` mode.
   * With the ``host`` and ``awsvpc`` network modes, exposed container ports are mapped directly to the
   * corresponding host port (for the ``host`` network mode) or the attached elastic network interface
   * port (for the ``awsvpc`` network mode), so you cannot take advantage of dynamic host port mappings.
   * When using the ``host`` network mode, you should not run containers using the root user (UID 0).
   * It is considered best practice to use a non-root user.
   * If the network mode is ``awsvpc``, the task is allocated an elastic network interface, and you
   * must specify a
   * [NetworkConfiguration](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_NetworkConfiguration.html)
   * value when you create a service or run a task with the task definition. For more information, see
   * [Task Networking](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking.html)
   * in the *Amazon Elastic Container Service Developer Guide*.
   * If the network mode is ``host``, you cannot run multiple instantiations of the same task on a
   * single container instance when port mappings are used.
   */
  NetworkMode?: string;
  /**
   * The process namespace to use for the containers in the task. The valid values are ``host`` or
   * ``task``. On Fargate for Linux containers, the only valid value is ``task``. For example,
   * monitoring sidecars might need ``pidMode`` to access information about other containers running in
   * the same task.
   * If ``host`` is specified, all containers within the tasks that specified the ``host`` PID mode on
   * the same container instance share the same process namespace with the host Amazon EC2 instance.
   * If ``task`` is specified, all containers within the specified task share the same process
   * namespace.
   * If no value is specified, the The default is a private namespace for each container.
   * If the ``host`` PID mode is used, there's a heightened risk of undesired process namespace
   * exposure.
   * This parameter is not supported for Windows containers.
   * This parameter is only supported for tasks that are hosted on FARGATElong if the tasks are using
   * platform version ``1.4.0`` or later (Linux). This isn't supported for Windows containers on
   * Fargate.
   */
  PidMode?: string;
  /**
   * Enables fault injection and allows for fault injection requests to be accepted from the task's
   * containers. The default value is ``false``.
   */
  EnableFaultInjection?: boolean;
  /**
   * The Amazon Resource Name (ARN) of the task execution role that grants the Amazon ECS container
   * agent permission to make AWS API calls on your behalf. For informationabout the required IAM roles
   * for Amazon ECS, see [IAM roles for Amazon
   * ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/security-ecs-iam-role-overview.html)
   * in the *Amazon Elastic Container Service Developer Guide*.
   */
  ExecutionRoleArn?: string;
  /** The operating system that your tasks definitions run on. */
  RuntimePlatform?: {
    /** The operating system. */
    OperatingSystemFamily?: string;
    /**
     * The CPU architecture.
     * You can run your Linux tasks on an ARM-based platform by setting the value to ``ARM64``. This
     * option is available for tasks that run on Linux Amazon EC2 instance, Amazon ECS Managed Instances,
     * or Linux containers on Fargate.
     */
    CpuArchitecture?: string;
  };
  /**
   * The configuration details for the App Mesh proxy.
   * Your Amazon ECS container instances require at least version 1.26.0 of the container agent and at
   * least version 1.26.0-1 of the ``ecs-init`` package to use a proxy configuration. If your container
   * instances are launched from the Amazon ECS optimized AMI version ``20190301`` or later, they
   * contain the required versions of the container agent and ``ecs-init``. For more information, see
   * [Amazon ECS-optimized Linux
   * AMI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html) in the
   * *Amazon Elastic Container Service Developer Guide*.
   */
  ProxyConfiguration?: {
    /**
     * The set of network configuration parameters to provide the Container Network Interface (CNI)
     * plugin, specified as key-value pairs.
     * +  ``IgnoredUID`` - (Required) The user ID (UID) of the proxy container as defined by the
     * ``user`` parameter in a container definition. This is used to ensure the proxy ignores its own
     * traffic. If ``IgnoredGID`` is specified, this field can be empty.
     * +  ``IgnoredGID`` - (Required) The group ID (GID) of the proxy container as defined by the
     * ``user`` parameter in a container definition. This is used to ensure the proxy ignores its own
     * traffic. If ``IgnoredUID`` is specified, this field can be empty.
     * +  ``AppPorts`` - (Required) The list of ports that the application uses. Network traffic to
     * these ports is forwarded to the ``ProxyIngressPort`` and ``ProxyEgressPort``.
     * +  ``ProxyIngressPort`` - (Required) Specifies the port that incoming traffic to the ``AppPorts``
     * is directed to.
     * +  ``ProxyEgressPort`` - (Required) Specifies the port that outgoing traffic from the
     * ``AppPorts`` is directed to.
     * +  ``EgressIgnoredPorts`` - (Required) The egress traffic going to the specified ports is ignored
     * and not redirected to the ``ProxyEgressPort``. It can be an empty list.
     * +  ``EgressIgnoredIPs`` - (Required) The egress traffic going to the specified IP addresses is
     * ignored and not redirected to the ``ProxyEgressPort``. It can be an empty list.
     * @uniqueItems true
     */
    ProxyConfigurationProperties?: {
      /**
       * The value of the key-value pair. For environment variables, this is the value of the environment
       * variable.
       */
      Value?: string;
      /**
       * The name of the key-value pair. For environment variables, this is the name of the environment
       * variable.
       */
      Name?: string;
    }[];
    /** The proxy type. The only supported value is ``APPMESH``. */
    Type?: string;
    /** The name of the container that will serve as the App Mesh proxy. */
    ContainerName: string;
  };
  /**
   * The list of data volume definitions for the task. For more information, see [Using data volumes in
   * tasks](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_data_volumes.html) in the
   * *Amazon Elastic Container Service Developer Guide*.
   * The ``host`` and ``sourcePath`` parameters aren't supported for tasks run on FARGATElong.
   * @uniqueItems true
   */
  Volumes?: ({
    /**
     * This parameter is specified when you use an Amazon Elastic File System file system for task
     * storage.
     */
    EFSVolumeConfiguration?: {
      /** The Amazon EFS file system ID to use. */
      FilesystemId: string;
      /**
       * Determines whether to use encryption for Amazon EFS data in transit between the Amazon ECS host and
       * the Amazon EFS server. Transit encryption must be turned on if Amazon EFS IAM authorization is
       * used. If this parameter is omitted, the default value of ``DISABLED`` is used. For more
       * information, see [Encrypting data in
       * transit](https://docs.aws.amazon.com/efs/latest/ug/encryption-in-transit.html) in the *Amazon
       * Elastic File System User Guide*.
       * @enum ["ENABLED","DISABLED"]
       */
      TransitEncryption?: "ENABLED" | "DISABLED";
      /** The authorization configuration details for the Amazon EFS file system. */
      AuthorizationConfig?: {
        /**
         * Determines whether to use the Amazon ECS task role defined in a task definition when mounting the
         * Amazon EFS file system. If it is turned on, transit encryption must be turned on in the
         * ``EFSVolumeConfiguration``. If this parameter is omitted, the default value of ``DISABLED`` is
         * used. For more information, see [Using Amazon EFS access
         * points](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html#efs-volume-accesspoints)
         * in the *Amazon Elastic Container Service Developer Guide*.
         * @enum ["ENABLED","DISABLED"]
         */
        IAM?: "ENABLED" | "DISABLED";
        /**
         * The Amazon EFS access point ID to use. If an access point is specified, the root directory value
         * specified in the ``EFSVolumeConfiguration`` must either be omitted or set to ``/`` which will
         * enforce the path set on the EFS access point. If an access point is used, transit encryption must
         * be on in the ``EFSVolumeConfiguration``. For more information, see [Working with Amazon EFS access
         * points](https://docs.aws.amazon.com/efs/latest/ug/efs-access-points.html) in the *Amazon Elastic
         * File System User Guide*.
         */
        AccessPointId?: string;
      };
      /**
       * The directory within the Amazon EFS file system to mount as the root directory inside the host. If
       * this parameter is omitted, the root of the Amazon EFS volume will be used. Specifying ``/`` will
       * have the same effect as omitting this parameter.
       * If an EFS access point is specified in the ``authorizationConfig``, the root directory parameter
       * must either be omitted or set to ``/`` which will enforce the path set on the EFS access point.
       */
      RootDirectory?: string;
      /**
       * The port to use when sending encrypted data between the Amazon ECS host and the Amazon EFS server.
       * If you do not specify a transit encryption port, it will use the port selection strategy that the
       * Amazon EFS mount helper uses. For more information, see [EFS mount
       * helper](https://docs.aws.amazon.com/efs/latest/ug/efs-mount-helper.html) in the *Amazon Elastic
       * File System User Guide*.
       */
      TransitEncryptionPort?: number;
    };
    /**
     * This parameter is specified when you use bind mount host volumes. The contents of the ``host``
     * parameter determine whether your bind mount host volume persists on the host container instance and
     * where it's stored. If the ``host`` parameter is empty, then the Docker daemon assigns a host path
     * for your data volume. However, the data isn't guaranteed to persist after the containers that are
     * associated with it stop running.
     * Windows containers can mount whole directories on the same drive as ``$env:ProgramData``. Windows
     * containers can't mount directories on a different drive, and mount point can't be across drives.
     * For example, you can mount ``C:\my\path:C:\my\path`` and ``D:\:D:\``, but not
     * ``D:\my\path:C:\my\path`` or ``D:\:C:\my\path``.
     */
    Host?: {
      /**
       * When the ``host`` parameter is used, specify a ``sourcePath`` to declare the path on the host
       * container instance that's presented to the container. If this parameter is empty, then the Docker
       * daemon has assigned a host path for you. If the ``host`` parameter contains a ``sourcePath`` file
       * location, then the data volume persists at the specified location on the host container instance
       * until you delete it manually. If the ``sourcePath`` value doesn't exist on the host container
       * instance, the Docker daemon creates it. If the location does exist, the contents of the source path
       * folder are exported.
       * If you're using the Fargate launch type, the ``sourcePath`` parameter is not supported.
       */
      SourcePath?: string;
    };
    /**
     * Indicates whether the volume should be configured at launch time. This is used to create Amazon EBS
     * volumes for standalone tasks or tasks created as part of a service. Each task definition revision
     * may only have one volume configured at launch in the volume configuration.
     * To configure a volume at launch time, use this task definition revision and specify a
     * ``volumeConfigurations`` object when calling the ``CreateService``, ``UpdateService``, ``RunTask``
     * or ``StartTask`` APIs.
     */
    ConfiguredAtLaunch?: boolean;
    /**
     * This parameter is specified when you use Docker volumes.
     * Windows containers only support the use of the ``local`` driver. To use bind mounts, specify the
     * ``host`` parameter instead.
     * Docker volumes aren't supported by tasks run on FARGATElong.
     */
    DockerVolumeConfiguration?: {
      /**
       * A map of Docker driver-specific options passed through. This parameter maps to ``DriverOpts`` in
       * the docker create-volume command and the ``xxopt`` option to docker volume create.
       */
      DriverOpts?: Record<string, string>;
      /**
       * The scope for the Docker volume that determines its lifecycle. Docker volumes that are scoped to a
       * ``task`` are automatically provisioned when the task starts and destroyed when the task stops.
       * Docker volumes that are scoped as ``shared`` persist after the task stops.
       */
      Scope?: string;
      /**
       * If this value is ``true``, the Docker volume is created if it doesn't already exist.
       * This field is only used if the ``scope`` is ``shared``.
       */
      Autoprovision?: boolean;
      /**
       * The Docker volume driver to use. The driver value must match the driver name provided by Docker
       * because it is used for task placement. If the driver was installed using the Docker plugin CLI, use
       * ``docker plugin ls`` to retrieve the driver name from your container instance. If the driver was
       * installed using another method, use Docker plugin discovery to retrieve the driver name. This
       * parameter maps to ``Driver`` in the docker container create command and the ``xxdriver`` option to
       * docker volume create.
       */
      Driver?: string;
      /**
       * Custom metadata to add to your Docker volume. This parameter maps to ``Labels`` in the docker
       * container create command and the ``xxlabel`` option to docker volume create.
       */
      Labels?: Record<string, string>;
    };
    /**
     * This parameter is specified when you use Amazon FSx for Windows File Server file system for task
     * storage.
     */
    FSxWindowsFileServerVolumeConfiguration?: {
      /** The authorization configuration details for the Amazon FSx for Windows File Server file system. */
      AuthorizationConfig?: {
        /**
         * The authorization credential option to use. The authorization credential options can be provided
         * using either the Amazon Resource Name (ARN) of an ASMlong secret or SSM Parameter Store parameter.
         * The ARN refers to the stored credentials.
         */
        CredentialsParameter: string;
        /**
         * A fully qualified domain name hosted by an
         * [](https://docs.aws.amazon.com/directoryservice/latest/admin-guide/directory_microsoft_ad.html)
         * Managed Microsoft AD (Active Directory) or self-hosted AD on Amazon EC2.
         */
        Domain: string;
      };
      /** The Amazon FSx for Windows File Server file system ID to use. */
      FileSystemId: string;
      /**
       * The directory within the Amazon FSx for Windows File Server file system to mount as the root
       * directory inside the host.
       */
      RootDirectory: string;
    };
    /**
     * The name of the volume. Up to 255 letters (uppercase and lowercase), numbers, underscores, and
     * hyphens are allowed.
     * When using a volume configured at launch, the ``name`` is required and must also be specified as
     * the volume name in the ``ServiceVolumeConfiguration`` or ``TaskVolumeConfiguration`` parameter when
     * creating your service or standalone task.
     * For all other types of volumes, this name is referenced in the ``sourceVolume`` parameter of the
     * ``mountPoints`` object in the container definition.
     * When a volume is using the ``efsVolumeConfiguration``, the name is required.
     */
    Name?: string;
  })[];
  /**
   * A list of container definitions in JSON format that describe the different containers that make up
   * your task. For more information about container definition parameters and defaults, see [Amazon ECS
   * Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_defintions.html)
   * in the *Amazon Elastic Container Service Developer Guide*.
   * @uniqueItems true
   */
  ContainerDefinitions?: ({
    /**
     * The user to use inside the container. This parameter maps to ``User`` in the docker container
     * create command and the ``--user`` option to docker run.
     * When running tasks using the ``host`` network mode, don't run containers using the root user (UID
     * 0). We recommend using a non-root user for better security.
     * You can specify the ``user`` using the following formats. If specifying a UID or GID, you must
     * specify it as a positive integer.
     * +   ``user``
     * +   ``user:group``
     * +   ``uid``
     * +   ``uid:gid``
     * +   ``user:gid``
     * +   ``uid:group``
     * This parameter is not supported for Windows containers.
     */
    User?: string;
    /**
     * The secrets to pass to the container. For more information, see [Specifying Sensitive
     * Data](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)
     * in the *Amazon Elastic Container Service Developer Guide*.
     */
    Secrets?: {
      /**
       * The secret to expose to the container. The supported values are either the full ARN of the ASMlong
       * secret or the full ARN of the parameter in the SSM Parameter Store.
       * For information about the require IAMlong permissions, see [Required IAM permissions for Amazon
       * ECS
       * secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html#secrets-iam)
       * (for Secrets Manager) or [Required IAM permissions for Amazon ECS
       * secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-parameters.html)
       * (for Systems Manager Parameter store) in the *Amazon Elastic Container Service Developer Guide*.
       * If the SSM Parameter Store parameter exists in the same Region as the task you're launching, then
       * you can use either the full ARN or name of the parameter. If the parameter exists in a different
       * Region, then the full ARN must be specified.
       */
      ValueFrom: string;
      /** The name of the secret. */
      Name: string;
    }[];
    /**
     * The amount (in MiB) of memory to present to the container. If your container attempts to exceed the
     * memory specified here, the container is killed. The total amount of memory reserved for all
     * containers within a task must be lower than the task ``memory`` value, if one is specified. This
     * parameter maps to ``Memory`` in the [Create a
     * container](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker Remote
     * API](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/) and the ``--memory``
     * option to [docker
     * run](https://docs.aws.amazon.com/https://docs.docker.com/engine/reference/run/#security-configuration).
     * If using the Fargate launch type, this parameter is optional.
     * If using the EC2 launch type, you must specify either a task-level memory value or a
     * container-level memory value. If you specify both a container-level ``memory`` and
     * ``memoryReservation`` value, ``memory`` must be greater than ``memoryReservation``. If you specify
     * ``memoryReservation``, then that value is subtracted from the available memory resources for the
     * container instance where the container is placed. Otherwise, the value of ``memory`` is used.
     * The Docker 20.10.0 or later daemon reserves a minimum of 6 MiB of memory for a container, so you
     * should not specify fewer than 6 MiB of memory for your containers.
     * The Docker 19.03.13-ce or earlier daemon reserves a minimum of 4 MiB of memory for a container, so
     * you should not specify fewer than 4 MiB of memory for your containers.
     */
    Memory?: number;
    /**
     * When this parameter is true, the container is given elevated privileges on the host container
     * instance (similar to the ``root`` user). This parameter maps to ``Privileged`` in the docker
     * container create command and the ``--privileged`` option to docker run
     * This parameter is not supported for Windows containers or tasks run on FARGATElong.
     */
    Privileged?: boolean;
    /**
     * The container health check command and associated configuration parameters for the container. This
     * parameter maps to ``HealthCheck`` in the docker container create command and the ``HEALTHCHECK``
     * parameter of docker run.
     */
    HealthCheck?: {
      /**
       * A string array representing the command that the container runs to determine if it is healthy. The
       * string array must start with ``CMD`` to run the command arguments directly, or ``CMD-SHELL`` to run
       * the command with the container's default shell.
       * When you use the AWS Management Console JSON panel, the CLIlong, or the APIs, enclose the list of
       * commands in double quotes and brackets.
       * ``[ "CMD-SHELL", "curl -f http://localhost/ || exit 1" ]``
       * You don't include the double quotes and brackets when you use the AWS Management Console.
       * ``CMD-SHELL, curl -f http://localhost/ || exit 1``
       * An exit code of 0 indicates success, and non-zero exit code indicates failure. For more
       * information, see ``HealthCheck`` in the docker container create command.
       */
      Command?: string[];
      /**
       * The time period in seconds to wait for a health check to succeed before it is considered a failure.
       * You may specify between 2 and 60 seconds. The default value is 5. This value applies only when you
       * specify a ``command``.
       */
      Timeout?: number;
      /**
       * The number of times to retry a failed health check before the container is considered unhealthy.
       * You may specify between 1 and 10 retries. The default value is 3. This value applies only when you
       * specify a ``command``.
       */
      Retries?: number;
      /**
       * The time period in seconds between each health check execution. You may specify between 5 and 300
       * seconds. The default value is 30 seconds. This value applies only when you specify a ``command``.
       */
      Interval?: number;
      /**
       * The optional grace period to provide containers time to bootstrap before failed health checks count
       * towards the maximum number of retries. You can specify between 0 and 300 seconds. By default, the
       * ``startPeriod`` is off. This value applies only when you specify a ``command``.
       * If a health check succeeds within the ``startPeriod``, then the container is considered healthy
       * and any subsequent failures count toward the maximum number of retries.
       */
      StartPeriod?: number;
    };
    /**
     * Time duration (in seconds) to wait before giving up on resolving dependencies for a container. For
     * example, you specify two containers in a task definition with containerA having a dependency on
     * containerB reaching a ``COMPLETE``, ``SUCCESS``, or ``HEALTHY`` status. If a ``startTimeout`` value
     * is specified for containerB and it doesn't reach the desired status within that time then
     * containerA gives up and not start. This results in the task transitioning to a ``STOPPED`` state.
     * When the ``ECS_CONTAINER_START_TIMEOUT`` container agent configuration variable is used, it's
     * enforced independently from this start timeout value.
     * For tasks using the Fargate launch type, the task or service requires the following platforms:
     * +  Linux platform version ``1.3.0`` or later.
     * +  Windows platform version ``1.0.0`` or later.
     * For tasks using the EC2 launch type, your container instances require at least version ``1.26.0``
     * of the container agent to use a container start timeout value. However, we recommend using the
     * latest container agent version. For information about checking your agent version and updating to
     * the latest version, see [Updating the Amazon ECS Container
     * Agent](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-update.html) in the
     * *Amazon Elastic Container Service Developer Guide*. If you're using an Amazon ECS-optimized Linux
     * AMI, your instance needs at least version ``1.26.0-1`` of the ``ecs-init`` package. If your
     * container instances are launched from version ``20190301`` or later, then they contain the required
     * versions of the container agent and ``ecs-init``. For more information, see [Amazon ECS-optimized
     * Linux AMI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html) in
     * the *Amazon Elastic Container Service Developer Guide*.
     * The valid values for Fargate are 2-120 seconds.
     */
    StartTimeout?: number;
    /**
     * Data volumes to mount from another container. This parameter maps to ``VolumesFrom`` in the docker
     * container create command and the ``--volumes-from`` option to docker run.
     * @uniqueItems true
     */
    VolumesFrom?: {
      /**
       * If this value is ``true``, the container has read-only access to the volume. If this value is
       * ``false``, then the container can write to the volume. The default value is ``false``.
       */
      ReadOnly?: boolean;
      /** The name of another container within the same task definition to mount volumes from. */
      SourceContainer?: string;
    }[];
    /**
     * The number of ``cpu`` units reserved for the container. This parameter maps to ``CpuShares`` in the
     * docker container create command and the ``--cpu-shares`` option to docker run.
     * This field is optional for tasks using the Fargate launch type, and the only requirement is that
     * the total amount of CPU reserved for all containers within a task be lower than the task-level
     * ``cpu`` value.
     * You can determine the number of CPU units that are available per EC2 instance type by multiplying
     * the vCPUs listed for that instance type on the [Amazon EC2
     * Instances](https://docs.aws.amazon.com/ec2/instance-types/) detail page by 1,024.
     * Linux containers share unallocated CPU units with other containers on the container instance with
     * the same ratio as their allocated amount. For example, if you run a single-container task on a
     * single-core instance type with 512 CPU units specified for that container, and that's the only task
     * running on the container instance, that container could use the full 1,024 CPU unit share at any
     * given time. However, if you launched another copy of the same task on that container instance, each
     * task is guaranteed a minimum of 512 CPU units when needed. Moreover, each container could float to
     * higher CPU usage if the other container was not using it. If both tasks were 100% active all of the
     * time, they would be limited to 512 CPU units.
     * On Linux container instances, the Docker daemon on the container instance uses the CPU value to
     * calculate the relative CPU share ratios for running containers. The minimum valid CPU share value
     * that the Linux kernel allows is 2, and the maximum valid CPU share value that the Linux kernel
     * allows is 262144. However, the CPU parameter isn't required, and you can use CPU values below 2 or
     * above 262144 in your container definitions. For CPU values below 2 (including null) or above
     * 262144, the behavior varies based on your Amazon ECS container agent version:
     * +  *Agent versions less than or equal to 1.1.0:* Null and zero CPU values are passed to Docker as
     * 0, which Docker then converts to 1,024 CPU shares. CPU values of 1 are passed to Docker as 1, which
     * the Linux kernel converts to two CPU shares.
     * +  *Agent versions greater than or equal to 1.2.0:* Null, zero, and CPU values of 1 are passed to
     * Docker as 2.
     * +  *Agent versions greater than or equal to 1.84.0:* CPU values greater than 256 vCPU are passed
     * to Docker as 256, which is equivalent to 262144 CPU shares.
     * On Windows container instances, the CPU limit is enforced as an absolute limit, or a quota.
     * Windows containers only have access to the specified amount of CPU that's described in the task
     * definition. A null or zero CPU value is passed to Docker as ``0``, which Windows interprets as 1%
     * of one CPU.
     */
    Cpu?: number;
    /**
     * Early versions of the Amazon ECS container agent don't properly handle ``entryPoint`` parameters.
     * If you have problems using ``entryPoint``, update your container agent or enter your commands and
     * arguments as ``command`` array items instead.
     * The entry point that's passed to the container. This parameter maps to ``Entrypoint`` in the
     * docker container create command and the ``--entrypoint`` option to docker run.
     */
    EntryPoint?: string[];
    /**
     * A list of DNS servers that are presented to the container. This parameter maps to ``Dns`` in the
     * docker container create command and the ``--dns`` option to docker run.
     * This parameter is not supported for Windows containers.
     */
    DnsServers?: string[];
    /**
     * When this parameter is true, the container is given read-only access to its root file system. This
     * parameter maps to ``ReadonlyRootfs`` in the docker container create command and the ``--read-only``
     * option to docker run.
     * This parameter is not supported for Windows containers.
     */
    ReadonlyRootFilesystem?: boolean;
    /**
     * The image used to start a container. This string is passed directly to the Docker daemon. By
     * default, images in the Docker Hub registry are available. Other repositories are specified with
     * either ``repository-url/image:tag`` or ``repository-url/image@digest``. For images using tags
     * (repository-url/image:tag), up to 255 characters total are allowed, including letters (uppercase
     * and lowercase), numbers, hyphens, underscores, colons, periods, forward slashes, and number signs
     * (#). For images using digests (repository-url/image@digest), the 255 character limit applies only
     * to the repository URL and image name (everything before the @ sign). The only supported hash
     * function is sha256, and the hash value after sha256: must be exactly 64 characters (only letters
     * A-F, a-f, and numbers 0-9 are allowed). This parameter maps to ``Image`` in the docker container
     * create command and the ``IMAGE`` parameter of docker run.
     * +  When a new task starts, the Amazon ECS container agent pulls the latest version of the
     * specified image and tag for the container to use. However, subsequent updates to a repository image
     * aren't propagated to already running tasks.
     * +  Images in Amazon ECR repositories can be specified by either using the full
     * ``registry/repository:tag`` or ``registry/repository@digest``. For example,
     * ``012345678910.dkr.ecr.<region-name>.amazonaws.com/<repository-name>:latest`` or
     * ``012345678910.dkr.ecr.<region-name>.amazonaws.com/<repository-name>@sha256:94afd1f2e64d908bc90dbca0035a5b567EXAMPLE``.
     * +  Images in official repositories on Docker Hub use a single name (for example, ``ubuntu`` or
     * ``mongo``).
     * +  Images in other repositories on Docker Hub are qualified with an organization name (for
     * example, ``amazon/amazon-ecs-agent``).
     * +  Images in other online repositories are qualified further by a domain name (for example,
     * ``quay.io/assemblyline/ubuntu``).
     */
    Image: string;
    /**
     * If the ``essential`` parameter of a container is marked as ``true``, and that container fails or
     * stops for any reason, all other containers that are part of the task are stopped. If the
     * ``essential`` parameter of a container is marked as ``false``, its failure doesn't affect the rest
     * of the containers in a task. If this parameter is omitted, a container is assumed to be essential.
     * All tasks must have at least one essential container. If you have an application that's composed
     * of multiple containers, group containers that are used for a common purpose into components, and
     * separate the different components into multiple task definitions. For more information, see
     * [Application
     * Architecture](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/application_architecture.html)
     * in the *Amazon Elastic Container Service Developer Guide*.
     */
    Essential?: boolean;
    /**
     * The log configuration specification for the container.
     * This parameter maps to ``LogConfig`` in the docker Create a container command and the
     * ``--log-driver`` option to docker run. By default, containers use the same logging driver that the
     * Docker daemon uses. However, the container may use a different logging driver than the Docker
     * daemon by specifying a log driver with this parameter in the container definition. To use a
     * different logging driver for a container, the log system must be configured properly on the
     * container instance (or on a different log server for remote logging options). For more information
     * on the options for different supported log drivers, see [Configure logging
     * drivers](https://docs.aws.amazon.com/https://docs.docker.com/engine/admin/logging/overview/) in the
     * Docker documentation.
     * Amazon ECS currently supports a subset of the logging drivers available to the Docker daemon
     * (shown in the
     * [LogConfiguration](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_LogConfiguration.html)
     * data type). Additional log drivers may be available in future releases of the Amazon ECS container
     * agent.
     * This parameter requires version 1.18 of the Docker Remote API or greater on your container
     * instance. To check the Docker Remote API version on your container instance, log in to your
     * container instance and run the following command: ``sudo docker version --format
     * '{{.Server.APIVersion}}'``
     * The Amazon ECS container agent running on a container instance must register the logging drivers
     * available on that instance with the ``ECS_AVAILABLE_LOGGING_DRIVERS`` environment variable before
     * containers placed on that instance can use these log configuration options. For more information,
     * see [Container Agent
     * Configuration](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-config.html)
     * in the *Developer Guide*.
     */
    LogConfiguration?: {
      /**
       * The secrets to pass to the log configuration. For more information, see [Specifying sensitive
       * data](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)
       * in the *Amazon Elastic Container Service Developer Guide*.
       */
      SecretOptions?: {
        /**
         * The secret to expose to the container. The supported values are either the full ARN of the ASMlong
         * secret or the full ARN of the parameter in the SSM Parameter Store.
         * For information about the require IAMlong permissions, see [Required IAM permissions for Amazon
         * ECS
         * secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-secrets.html#secrets-iam)
         * (for Secrets Manager) or [Required IAM permissions for Amazon ECS
         * secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data-parameters.html)
         * (for Systems Manager Parameter store) in the *Amazon Elastic Container Service Developer Guide*.
         * If the SSM Parameter Store parameter exists in the same Region as the task you're launching, then
         * you can use either the full ARN or name of the parameter. If the parameter exists in a different
         * Region, then the full ARN must be specified.
         */
        ValueFrom: string;
        /** The name of the secret. */
        Name: string;
      }[];
      /**
       * The configuration options to send to the log driver.
       * The options you can specify depend on the log driver. Some of the options you can specify when you
       * use the ``awslogs`` log driver to route logs to Amazon CloudWatch include the following:
       * + awslogs-create-group Required: No Specify whether you want the log group to be created
       * automatically. If this option isn't specified, it defaults to false. Your IAM policy must include
       * the logs:CreateLogGroup permission before you attempt to use awslogs-create-group. + awslogs-region
       * Required: Yes Specify the Region that the awslogs log driver is to send your Docker logs to. You
       * can choose to send all of your logs from clusters in different Regions to a single region in
       * CloudWatch Logs. This is so that they're all visible in one location. Otherwise, you can separate
       * them by Region for more granularity. Make sure that the specified log group exists in the Region
       * that you specify with this option. + awslogs-group Required: Yes Make sure to specify a log group
       * that the awslogs log driver sends its log streams to. + awslogs-stream-prefix Required: Yes, when
       * using Fargate.Optional when using EC2. Use the awslogs-stream-prefix option to associate a log
       * stream with the specified prefix, the container name, and the ID of the Amazon ECS task that the
       * container belongs to. If you specify a prefix with this option, then the log stream takes the
       * format prefix-name/container-name/ecs-task-id. If you don't specify a prefix with this option, then
       * the log stream is named after the container ID that's assigned by the Docker daemon on the
       * container instance. Because it's difficult to trace logs back to the container that sent them with
       * just the Docker container ID (which is only available on the container instance), we recommend that
       * you specify a prefix with this option. For Amazon ECS services, you can use the service name as the
       * prefix. Doing so, you can trace log streams to the service that the container belongs to, the name
       * of the container that sent them, and the ID of the task that the container belongs to. You must
       * specify a stream-prefix for your logs to have your logs appear in the Log pane when using the
       * Amazon ECS console. + awslogs-datetime-format Required: No This option defines a multiline start
       * pattern in Python strftime format. A log message consists of a line that matches the pattern and
       * any following lines that don’t match the pattern. The matched line is the delimiter between log
       * messages. One example of a use case for using this format is for parsing output such as a stack
       * dump, which might otherwise be logged in multiple entries. The correct pattern allows it to be
       * captured in a single entry. For more information, see awslogs-datetime-format. You cannot configure
       * both the awslogs-datetime-format and awslogs-multiline-pattern options. Multiline logging performs
       * regular expression parsing and matching of all log messages. This might have a negative impact on
       * logging performance. + awslogs-multiline-pattern Required: No This option defines a multiline start
       * pattern that uses a regular expression. A log message consists of a line that matches the pattern
       * and any following lines that don’t match the pattern. The matched line is the delimiter between log
       * messages. For more information, see awslogs-multiline-pattern. This option is ignored if
       * awslogs-datetime-format is also configured. You cannot configure both the awslogs-datetime-format
       * and awslogs-multiline-pattern options. Multiline logging performs regular expression parsing and
       * matching of all log messages. This might have a negative impact on logging performance.
       * The following options apply to all supported log drivers.
       * + mode Required: No Valid values: non-blocking | blocking This option defines the delivery mode
       * of log messages from the container to the log driver specified using logDriver. The delivery mode
       * you choose affects application availability when the flow of logs from container is interrupted. If
       * you use the blocking mode and the flow of logs is interrupted, calls from container code to write
       * to the stdout and stderr streams will block. The logging thread of the application will block as a
       * result. This may cause the application to become unresponsive and lead to container healthcheck
       * failure. If you use the non-blocking mode, the container's logs are instead stored in an in-memory
       * intermediate buffer configured with the max-buffer-size option. This prevents the application from
       * becoming unresponsive when logs cannot be sent. We recommend using this mode if you want to ensure
       * service availability and are okay with some log loss. For more information, see Preventing log loss
       * with non-blocking mode in the awslogs container log driver. You can set a default mode for all
       * containers in a specific Region by using the defaultLogDriverMode account setting. If you don't
       * specify the mode option or configure the account setting, Amazon ECS will default to the
       * non-blocking mode. For more information about the account setting, see Default log driver mode in
       * the Amazon Elastic Container Service Developer Guide. On June 25, 2025, Amazon ECS changed the
       * default log driver mode from blocking to non-blocking to prioritize task availability over logging.
       * To continue using the blocking mode after this change, do one of the following: Set the mode option
       * in your container definition's logConfiguration as blocking. Set the defaultLogDriverMode account
       * setting to blocking. + max-buffer-size Required: No Default value: 10m When non-blocking mode is
       * used, the max-buffer-size log option controls the size of the buffer that's used for intermediate
       * message storage. Make sure to specify an adequate buffer size based on your application. When the
       * buffer fills up, further logs cannot be stored. Logs that cannot be stored are lost.
       * To route logs using the ``splunk`` log router, you need to specify a ``splunk-token`` and a
       * ``splunk-url``.
       * When you use the ``awsfirelens`` log router to route logs to an AWS Service or AWS Partner Network
       * destination for log storage and analytics, you can set the ``log-driver-buffer-limit`` option to
       * limit the number of events that are buffered in memory, before being sent to the log router
       * container. It can help to resolve potential log loss issue because high throughput might result in
       * memory running out for the buffer inside of Docker.
       * Other options you can specify when using ``awsfirelens`` to route logs depend on the destination.
       * When you export logs to Amazon Data Firehose, you can specify the AWS Region with ``region`` and a
       * name for the log stream with ``delivery_stream``.
       * When you export logs to Amazon Kinesis Data Streams, you can specify an AWS Region with ``region``
       * and a data stream name with ``stream``.
       * When you export logs to Amazon OpenSearch Service, you can specify options like ``Name``,
       * ``Host`` (OpenSearch Service endpoint without protocol), ``Port``, ``Index``, ``Type``,
       * ``Aws_auth``, ``Aws_region``, ``Suppress_Type_Name``, and ``tls``. For more information, see [Under
       * the hood: FireLens for Amazon ECS
       * Tasks](https://docs.aws.amazon.com/containers/under-the-hood-firelens-for-amazon-ecs-tasks/).
       * When you export logs to Amazon S3, you can specify the bucket using the ``bucket`` option. You can
       * also specify ``region``, ``total_file_size``, ``upload_timeout``, and ``use_put_object`` as
       * options.
       * This parameter requires version 1.19 of the Docker Remote API or greater on your container
       * instance. To check the Docker Remote API version on your container instance, log in to your
       * container instance and run the following command: ``sudo docker version --format
       * '{{.Server.APIVersion}}'``
       */
      Options?: Record<string, string>;
      /**
       * The log driver to use for the container.
       * For tasks on FARGATElong, the supported log drivers are ``awslogs``, ``splunk``, and
       * ``awsfirelens``.
       * For tasks hosted on Amazon EC2 instances, the supported log drivers are ``awslogs``, ``fluentd``,
       * ``gelf``, ``json-file``, ``journald``, ``syslog``, ``splunk``, and ``awsfirelens``.
       * For more information about using the ``awslogs`` log driver, see [Send Amazon ECS logs to
       * CloudWatch](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html) in the
       * *Amazon Elastic Container Service Developer Guide*.
       * For more information about using the ``awsfirelens`` log driver, see [Send Amazon ECS logs to an
       * service or
       * Partner](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html).
       * If you have a custom driver that isn't listed, you can fork the Amazon ECS container agent
       * project that's [available on
       * GitHub](https://docs.aws.amazon.com/https://github.com/aws/amazon-ecs-agent) and customize it to
       * work with that driver. We encourage you to submit pull requests for changes that you would like to
       * have included. However, we don't currently provide support for running modified copies of this
       * software.
       */
      LogDriver: string;
    };
    /** The type and amount of a resource to assign to a container. The only supported resource is a GPU. */
    ResourceRequirements?: {
      /** The type of resource to assign to a container. */
      Type: string;
      /**
       * The value for the specified resource type.
       * When the type is ``GPU``, the value is the number of physical ``GPUs`` the Amazon ECS container
       * agent reserves for the container. The number of GPUs that's reserved for all containers in a task
       * can't exceed the number of available GPUs on the container instance that the task is launched on.
       * When the type is ``InferenceAccelerator``, the ``value`` matches the ``deviceName`` for an
       * [InferenceAccelerator](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_InferenceAccelerator.html)
       * specified in a task definition.
       */
      Value: string;
    }[];
    /**
     * A list of files containing the environment variables to pass to a container. This parameter maps to
     * the ``--env-file`` option to docker run.
     * You can specify up to ten environment files. The file must have a ``.env`` file extension. Each
     * line in an environment file contains an environment variable in ``VARIABLE=VALUE`` format. Lines
     * beginning with ``#`` are treated as comments and are ignored.
     * If there are environment variables specified using the ``environment`` parameter in a container
     * definition, they take precedence over the variables contained within an environment file. If
     * multiple environment files are specified that contain the same variable, they're processed from the
     * top down. We recommend that you use unique variable names. For more information, see [Specifying
     * Environment
     * Variables](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/taskdef-envfiles.html) in
     * the *Amazon Elastic Container Service Developer Guide*.
     */
    EnvironmentFiles?: {
      /**
       * The file type to use. Environment files are objects in Amazon S3. The only supported value is
       * ``s3``.
       */
      Type?: string;
      /** The Amazon Resource Name (ARN) of the Amazon S3 object containing the environment variable file. */
      Value?: string;
    }[];
    /**
     * The name of a container. If you're linking multiple containers together in a task definition, the
     * ``name`` of one container can be entered in the ``links`` of another container to connect the
     * containers. Up to 255 letters (uppercase and lowercase), numbers, underscores, and hyphens are
     * allowed. This parameter maps to ``name`` in the docker container create command and the ``--name``
     * option to docker run.
     */
    Name: string;
    /**
     * The FireLens configuration for the container. This is used to specify and configure a log router
     * for container logs. For more information, see [Custom Log
     * Routing](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_firelens.html) in the
     * *Amazon Elastic Container Service Developer Guide*.
     */
    FirelensConfiguration?: {
      /**
       * The options to use when configuring the log router. This field is optional and can be used to add
       * additional metadata, such as the task, task definition, cluster, and container instance details to
       * the log event.
       * If specified, valid option keys are:
       * +  ``enable-ecs-log-metadata``, which can be ``true`` or ``false``
       * +  ``config-file-type``, which can be ``s3`` or ``file``
       * +  ``config-file-value``, which is either an S3 ARN or a file path
       */
      Options?: Record<string, string>;
      /** The log router to use. The valid values are ``fluentd`` or ``fluentbit``. */
      Type?: string;
    };
    /**
     * A list of strings to provide custom configuration for multiple security systems. This field isn't
     * valid for containers in tasks using the Fargate launch type.
     * For Linux tasks on EC2, this parameter can be used to reference custom labels for SELinux and
     * AppArmor multi-level security systems.
     * For any tasks on EC2, this parameter can be used to reference a credential spec file that
     * configures a container for Active Directory authentication. For more information, see [Using gMSAs
     * for Windows
     * Containers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/windows-gmsa.html) and
     * [Using gMSAs for Linux
     * Containers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/linux-gmsa.html) in the
     * *Amazon Elastic Container Service Developer Guide*.
     * This parameter maps to ``SecurityOpt`` in the docker container create command and the
     * ``--security-opt`` option to docker run.
     * The Amazon ECS container agent running on a container instance must register with the
     * ``ECS_SELINUX_CAPABLE=true`` or ``ECS_APPARMOR_CAPABLE=true`` environment variables before
     * containers placed on that instance can use these security options. For more information, see
     * [Amazon ECS Container Agent
     * Configuration](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-config.html)
     * in the *Amazon Elastic Container Service Developer Guide*.
     * Valid values: "no-new-privileges" | "apparmor:PROFILE" | "label:value" |
     * "credentialspec:CredentialSpecFilePath"
     */
    DockerSecurityOptions?: string[];
    /**
     * A list of namespaced kernel parameters to set in the container. This parameter maps to ``Sysctls``
     * in the docker container create command and the ``--sysctl`` option to docker run. For example, you
     * can configure ``net.ipv4.tcp_keepalive_time`` setting to maintain longer lived connections.
     */
    SystemControls?: ({
      /**
       * The namespaced kernel parameter to set a ``value`` for.
       * Valid IPC namespace values: ``"kernel.msgmax" | "kernel.msgmnb" | "kernel.msgmni" | "kernel.sem" |
       * "kernel.shmall" | "kernel.shmmax" | "kernel.shmmni" | "kernel.shm_rmid_forced"``, and ``Sysctls``
       * that start with ``"fs.mqueue.*"``
       * Valid network namespace values: ``Sysctls`` that start with ``"net.*"``. Only namespaced
       * ``Sysctls`` that exist within the container starting with "net.* are accepted.
       * All of these values are supported by Fargate.
       */
      Value?: string;
      /** The namespaced kernel parameter to set a ``value`` for. */
      Namespace?: string;
    })[];
    /**
     * When this parameter is ``true``, you can deploy containerized applications that require ``stdin``
     * or a ``tty`` to be allocated. This parameter maps to ``OpenStdin`` in the docker container create
     * command and the ``--interactive`` option to docker run.
     */
    Interactive?: boolean;
    /**
     * A list of DNS search domains that are presented to the container. This parameter maps to
     * ``DnsSearch`` in the docker container create command and the ``--dns-search`` option to docker run.
     * This parameter is not supported for Windows containers.
     */
    DnsSearchDomains?: string[];
    /**
     * A list of ARNs in SSM or Amazon S3 to a credential spec (``CredSpec``) file that configures the
     * container for Active Directory authentication. We recommend that you use this parameter instead of
     * the ``dockerSecurityOptions``. The maximum number of ARNs is 1.
     * There are two formats for each ARN.
     * + credentialspecdomainless:MyARN You use credentialspecdomainless:MyARN to provide a CredSpec
     * with an additional section for a secret in . You provide the login credentials to the domain in the
     * secret. Each task that runs on any container instance can join different domains. You can use this
     * format without joining the container instance to a domain. + credentialspec:MyARN You use
     * credentialspec:MyARN to provide a CredSpec for a single domain. You must join the container
     * instance to the domain before you start any tasks that use this task definition.
     * In both formats, replace ``MyARN`` with the ARN in SSM or Amazon S3.
     * If you provide a ``credentialspecdomainless:MyARN``, the ``credspec`` must provide a ARN in
     * ASMlong for a secret containing the username, password, and the domain to connect to. For better
     * security, the instance isn't joined to the domain for domainless authentication. Other applications
     * on the instance can't use the domainless credentials. You can use this parameter to run tasks on
     * the same instance, even it the tasks need to join different domains. For more information, see
     * [Using gMSAs for Windows
     * Containers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/windows-gmsa.html) and
     * [Using gMSAs for Linux
     * Containers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/linux-gmsa.html).
     */
    CredentialSpecs?: string[];
    /**
     * A list of ``ulimits`` to set in the container. This parameter maps to ``Ulimits`` in the [Create a
     * container](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker Remote
     * API](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/) and the ``--ulimit``
     * option to [docker run](https://docs.aws.amazon.com/https://docs.docker.com/engine/reference/run/).
     * Valid naming values are displayed in the
     * [Ulimit](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Ulimit.html) data type. This
     * parameter requires version 1.18 of the Docker Remote API or greater on your container instance. To
     * check the Docker Remote API version on your container instance, log in to your container instance
     * and run the following command: ``sudo docker version --format '{{.Server.APIVersion}}'``
     * This parameter is not supported for Windows containers.
     */
    Ulimits?: {
      /**
       * The soft limit for the ``ulimit`` type. The value can be specified in bytes, seconds, or as a
       * count, depending on the ``type`` of the ``ulimit``.
       */
      SoftLimit: number;
      /**
       * The hard limit for the ``ulimit`` type. The value can be specified in bytes, seconds, or as a
       * count, depending on the ``type`` of the ``ulimit``.
       */
      HardLimit: number;
      /** The ``type`` of the ``ulimit``. */
      Name: string;
    }[];
    /**
     * Time duration (in seconds) to wait before the container is forcefully killed if it doesn't exit
     * normally on its own.
     * For tasks using the Fargate launch type, the task or service requires the following platforms:
     * +  Linux platform version ``1.3.0`` or later.
     * +  Windows platform version ``1.0.0`` or later.
     * For tasks that use the Fargate launch type, the max stop timeout value is 120 seconds and if the
     * parameter is not specified, the default value of 30 seconds is used.
     * For tasks that use the EC2 launch type, if the ``stopTimeout`` parameter isn't specified, the
     * value set for the Amazon ECS container agent configuration variable ``ECS_CONTAINER_STOP_TIMEOUT``
     * is used. If neither the ``stopTimeout`` parameter or the ``ECS_CONTAINER_STOP_TIMEOUT`` agent
     * configuration variable are set, then the default values of 30 seconds for Linux containers and 30
     * seconds on Windows containers are used. Your container instances require at least version 1.26.0 of
     * the container agent to use a container stop timeout value. However, we recommend using the latest
     * container agent version. For information about checking your agent version and updating to the
     * latest version, see [Updating the Amazon ECS Container
     * Agent](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-update.html) in the
     * *Amazon Elastic Container Service Developer Guide*. If you're using an Amazon ECS-optimized Linux
     * AMI, your instance needs at least version 1.26.0-1 of the ``ecs-init`` package. If your container
     * instances are launched from version ``20190301`` or later, then they contain the required versions
     * of the container agent and ``ecs-init``. For more information, see [Amazon ECS-optimized Linux
     * AMI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html) in the
     * *Amazon Elastic Container Service Developer Guide*.
     * The valid values for Fargate are 2-120 seconds.
     */
    StopTimeout?: number;
    /**
     * The working directory to run commands inside the container in. This parameter maps to
     * ``WorkingDir`` in the docker container create command and the ``--workdir`` option to docker run.
     */
    WorkingDirectory?: string;
    /**
     * The soft limit (in MiB) of memory to reserve for the container. When system memory is under heavy
     * contention, Docker attempts to keep the container memory to this soft limit. However, your
     * container can consume more memory when it needs to, up to either the hard limit specified with the
     * ``memory`` parameter (if applicable), or all of the available memory on the container instance,
     * whichever comes first. This parameter maps to ``MemoryReservation`` in the docker container create
     * command and the ``--memory-reservation`` option to docker run.
     * If a task-level memory value is not specified, you must specify a non-zero integer for one or both
     * of ``memory`` or ``memoryReservation`` in a container definition. If you specify both, ``memory``
     * must be greater than ``memoryReservation``. If you specify ``memoryReservation``, then that value
     * is subtracted from the available memory resources for the container instance where the container is
     * placed. Otherwise, the value of ``memory`` is used.
     * For example, if your container normally uses 128 MiB of memory, but occasionally bursts to 256 MiB
     * of memory for short periods of time, you can set a ``memoryReservation`` of 128 MiB, and a
     * ``memory`` hard limit of 300 MiB. This configuration would allow the container to only reserve 128
     * MiB of memory from the remaining resources on the container instance, but also allow the container
     * to consume more memory resources when needed.
     * The Docker 20.10.0 or later daemon reserves a minimum of 6 MiB of memory for a container. So,
     * don't specify less than 6 MiB of memory for your containers.
     * The Docker 19.03.13-ce or earlier daemon reserves a minimum of 4 MiB of memory for a container.
     * So, don't specify less than 4 MiB of memory for your containers.
     */
    MemoryReservation?: number;
    /** The private repository authentication credentials to use. */
    RepositoryCredentials?: {
      /**
       * The Amazon Resource Name (ARN) of the secret containing the private repository credentials.
       * When you use the Amazon ECS API, CLI, or AWS SDK, if the secret exists in the same Region as the
       * task that you're launching then you can use either the full ARN or the name of the secret. When you
       * use the AWS Management Console, you must specify the full ARN of the secret.
       */
      CredentialsParameter?: string;
    };
    /**
     * A list of hostnames and IP address mappings to append to the ``/etc/hosts`` file on the container.
     * This parameter maps to ``ExtraHosts`` in the docker container create command and the ``--add-host``
     * option to docker run.
     * This parameter isn't supported for Windows containers or tasks that use the ``awsvpc`` network
     * mode.
     */
    ExtraHosts?: {
      /** The hostname to use in the ``/etc/hosts`` entry. */
      Hostname?: string;
      /** The IP address to use in the ``/etc/hosts`` entry. */
      IpAddress?: string;
    }[];
    /**
     * The hostname to use for your container. This parameter maps to ``Hostname`` in the docker container
     * create command and the ``--hostname`` option to docker run.
     * The ``hostname`` parameter is not supported if you're using the ``awsvpc`` network mode.
     */
    Hostname?: string;
    /**
     * Linux-specific modifications that are applied to the container, such as Linux kernel capabilities.
     * For more information see
     * [KernelCapabilities](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_KernelCapabilities.html).
     * This parameter is not supported for Windows containers.
     */
    LinuxParameters?: {
      /**
       * The Linux capabilities for the container that are added to or dropped from the default
       * configuration provided by Docker.
       * For tasks that use the Fargate launch type, ``capabilities`` is supported for all platform
       * versions but the ``add`` parameter is only supported if using platform version 1.4.0 or later.
       */
      Capabilities?: {
        /**
         * The Linux capabilities for the container that have been added to the default configuration provided
         * by Docker. This parameter maps to ``CapAdd`` in the docker container create command and the
         * ``--cap-add`` option to docker run.
         * Tasks launched on FARGATElong only support adding the ``SYS_PTRACE`` kernel capability.
         * Valid values: ``"ALL" | "AUDIT_CONTROL" | "AUDIT_WRITE" | "BLOCK_SUSPEND" | "CHOWN" |
         * "DAC_OVERRIDE" | "DAC_READ_SEARCH" | "FOWNER" | "FSETID" | "IPC_LOCK" | "IPC_OWNER" | "KILL" |
         * "LEASE" | "LINUX_IMMUTABLE" | "MAC_ADMIN" | "MAC_OVERRIDE" | "MKNOD" | "NET_ADMIN" |
         * "NET_BIND_SERVICE" | "NET_BROADCAST" | "NET_RAW" | "SETFCAP" | "SETGID" | "SETPCAP" | "SETUID" |
         * "SYS_ADMIN" | "SYS_BOOT" | "SYS_CHROOT" | "SYS_MODULE" | "SYS_NICE" | "SYS_PACCT" | "SYS_PTRACE" |
         * "SYS_RAWIO" | "SYS_RESOURCE" | "SYS_TIME" | "SYS_TTY_CONFIG" | "SYSLOG" | "WAKE_ALARM"``
         */
        Add?: string[];
        /**
         * The Linux capabilities for the container that have been removed from the default configuration
         * provided by Docker. This parameter maps to ``CapDrop`` in the docker container create command and
         * the ``--cap-drop`` option to docker run.
         * Valid values: ``"ALL" | "AUDIT_CONTROL" | "AUDIT_WRITE" | "BLOCK_SUSPEND" | "CHOWN" |
         * "DAC_OVERRIDE" | "DAC_READ_SEARCH" | "FOWNER" | "FSETID" | "IPC_LOCK" | "IPC_OWNER" | "KILL" |
         * "LEASE" | "LINUX_IMMUTABLE" | "MAC_ADMIN" | "MAC_OVERRIDE" | "MKNOD" | "NET_ADMIN" |
         * "NET_BIND_SERVICE" | "NET_BROADCAST" | "NET_RAW" | "SETFCAP" | "SETGID" | "SETPCAP" | "SETUID" |
         * "SYS_ADMIN" | "SYS_BOOT" | "SYS_CHROOT" | "SYS_MODULE" | "SYS_NICE" | "SYS_PACCT" | "SYS_PTRACE" |
         * "SYS_RAWIO" | "SYS_RESOURCE" | "SYS_TIME" | "SYS_TTY_CONFIG" | "SYSLOG" | "WAKE_ALARM"``
         */
        Drop?: string[];
      };
      /**
       * This allows you to tune a container's memory swappiness behavior. A ``swappiness`` value of ``0``
       * will cause swapping to not happen unless absolutely necessary. A ``swappiness`` value of ``100``
       * will cause pages to be swapped very aggressively. Accepted values are whole numbers between ``0``
       * and ``100``. If the ``swappiness`` parameter is not specified, a default value of ``60`` is used.
       * If a value is not specified for ``maxSwap`` then this parameter is ignored. This parameter maps to
       * the ``--memory-swappiness`` option to docker run.
       * If you're using tasks that use the Fargate launch type, the ``swappiness`` parameter isn't
       * supported.
       * If you're using tasks on Amazon Linux 2023 the ``swappiness`` parameter isn't supported.
       */
      Swappiness?: number;
      /**
       * The container path, mount options, and size (in MiB) of the tmpfs mount. This parameter maps to the
       * ``--tmpfs`` option to docker run.
       * If you're using tasks that use the Fargate launch type, the ``tmpfs`` parameter isn't supported.
       */
      Tmpfs?: ({
        /** The maximum size (in MiB) of the tmpfs volume. */
        Size: number;
        /** The absolute file path where the tmpfs volume is to be mounted. */
        ContainerPath?: string;
        /**
         * The list of tmpfs volume mount options.
         * Valid values: ``"defaults" | "ro" | "rw" | "suid" | "nosuid" | "dev" | "nodev" | "exec" | "noexec"
         * | "sync" | "async" | "dirsync" | "remount" | "mand" | "nomand" | "atime" | "noatime" | "diratime" |
         * "nodiratime" | "bind" | "rbind" | "unbindable" | "runbindable" | "private" | "rprivate" | "shared"
         * | "rshared" | "slave" | "rslave" | "relatime" | "norelatime" | "strictatime" | "nostrictatime" |
         * "mode" | "uid" | "gid" | "nr_inodes" | "nr_blocks" | "mpol"``
         */
        MountOptions?: string[];
      })[];
      /**
       * The value for the size (in MiB) of the ``/dev/shm`` volume. This parameter maps to the
       * ``--shm-size`` option to docker run.
       * If you are using tasks that use the Fargate launch type, the ``sharedMemorySize`` parameter is
       * not supported.
       */
      SharedMemorySize?: number;
      /**
       * Any host devices to expose to the container. This parameter maps to ``Devices`` in the docker
       * container create command and the ``--device`` option to docker run.
       * If you're using tasks that use the Fargate launch type, the ``devices`` parameter isn't
       * supported.
       */
      Devices?: {
        /** The path for the device on the host container instance. */
        HostPath?: string;
        /**
         * The explicit permissions to provide to the container for the device. By default, the container has
         * permissions for ``read``, ``write``, and ``mknod`` for the device.
         * @uniqueItems true
         */
        Permissions?: string[];
        /** The path inside the container at which to expose the host device. */
        ContainerPath?: string;
      }[];
      /**
       * Run an ``init`` process inside the container that forwards signals and reaps processes. This
       * parameter maps to the ``--init`` option to docker run. This parameter requires version 1.25 of the
       * Docker Remote API or greater on your container instance. To check the Docker Remote API version on
       * your container instance, log in to your container instance and run the following command: ``sudo
       * docker version --format '{{.Server.APIVersion}}'``
       */
      InitProcessEnabled?: boolean;
      /**
       * The total amount of swap memory (in MiB) a container can use. This parameter will be translated to
       * the ``--memory-swap`` option to docker run where the value would be the sum of the container memory
       * plus the ``maxSwap`` value.
       * If a ``maxSwap`` value of ``0`` is specified, the container will not use swap. Accepted values are
       * ``0`` or any positive integer. If the ``maxSwap`` parameter is omitted, the container will use the
       * swap configuration for the container instance it is running on. A ``maxSwap`` value must be set for
       * the ``swappiness`` parameter to be used.
       * If you're using tasks that use the Fargate launch type, the ``maxSwap`` parameter isn't
       * supported.
       * If you're using tasks on Amazon Linux 2023 the ``swappiness`` parameter isn't supported.
       */
      MaxSwap?: number;
    };
    /**
     * Specifies whether Amazon ECS will resolve the container image tag provided in the container
     * definition to an image digest. By default, the value is ``enabled``. If you set the value for a
     * container as ``disabled``, Amazon ECS will not resolve the provided container image tag to a digest
     * and will use the original image URI specified in the container definition for deployment. For more
     * information about container image resolution, see [Container image
     * resolution](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html#deployment-container-image-stability)
     * in the *Amazon ECS Developer Guide*.
     * @default "enabled"
     * @enum ["enabled","disabled"]
     */
    VersionConsistency?: "enabled" | "disabled";
    /**
     * The restart policy for a container. When you set up a restart policy, Amazon ECS can restart the
     * container without needing to replace the task. For more information, see [Restart individual
     * containers in Amazon ECS tasks with container restart
     * policies](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/container-restart-policy.html)
     * in the *Amazon Elastic Container Service Developer Guide*.
     */
    RestartPolicy?: {
      /**
       * A list of exit codes that Amazon ECS will ignore and not attempt a restart on. You can specify a
       * maximum of 50 container exit codes. By default, Amazon ECS does not ignore any exit codes.
       */
      IgnoredExitCodes?: number[];
      /**
       * A period of time (in seconds) that the container must run for before a restart can be attempted. A
       * container can be restarted only once every ``restartAttemptPeriod`` seconds. If a container isn't
       * able to run for this time period and exits early, it will not be restarted. You can set a minimum
       * ``restartAttemptPeriod`` of 60 seconds and a maximum ``restartAttemptPeriod`` of 1800 seconds. By
       * default, a container must run for 300 seconds before it can be restarted.
       */
      RestartAttemptPeriod?: number;
      /** Specifies whether a restart policy is enabled for the container. */
      Enabled?: boolean;
    };
    /**
     * When this parameter is true, networking is off within the container. This parameter maps to
     * ``NetworkDisabled`` in the docker container create command.
     * This parameter is not supported for Windows containers.
     */
    DisableNetworking?: boolean;
    /**
     * When this parameter is ``true``, a TTY is allocated. This parameter maps to ``Tty`` in the docker
     * container create command and the ``--tty`` option to docker run.
     */
    PseudoTerminal?: boolean;
    /**
     * The mount points for data volumes in your container.
     * This parameter maps to ``Volumes`` in the docker container create command and the ``--volume``
     * option to docker run.
     * Windows containers can mount whole directories on the same drive as ``$env:ProgramData``. Windows
     * containers can't mount directories on a different drive, and mount point can't be across drives.
     * @uniqueItems true
     */
    MountPoints?: {
      /**
       * If this value is ``true``, the container has read-only access to the volume. If this value is
       * ``false``, then the container can write to the volume. The default value is ``false``.
       */
      ReadOnly?: boolean;
      /**
       * The name of the volume to mount. Must be a volume name referenced in the ``name`` parameter of task
       * definition ``volume``.
       */
      SourceVolume?: string;
      /** The path on the container to mount the host volume at. */
      ContainerPath?: string;
    }[];
    /**
     * The dependencies defined for container startup and shutdown. A container can contain multiple
     * dependencies. When a dependency is defined for container startup, for container shutdown it is
     * reversed.
     * For tasks using the EC2 launch type, the container instances require at least version 1.26.0 of
     * the container agent to turn on container dependencies. However, we recommend using the latest
     * container agent version. For information about checking your agent version and updating to the
     * latest version, see [Updating the Amazon ECS Container
     * Agent](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-agent-update.html) in the
     * *Amazon Elastic Container Service Developer Guide*. If you're using an Amazon ECS-optimized Linux
     * AMI, your instance needs at least version 1.26.0-1 of the ``ecs-init`` package. If your container
     * instances are launched from version ``20190301`` or later, then they contain the required versions
     * of the container agent and ``ecs-init``. For more information, see [Amazon ECS-optimized Linux
     * AMI](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-optimized_AMI.html) in the
     * *Amazon Elastic Container Service Developer Guide*.
     * For tasks using the Fargate launch type, the task or service requires the following platforms:
     * +  Linux platform version ``1.3.0`` or later.
     * +  Windows platform version ``1.0.0`` or later.
     * If the task definition is used in a blue/green deployment that uses
     * [AWS::CodeDeploy::DeploymentGroup
     * BlueGreenDeploymentConfiguration](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-codedeploy-deploymentgroup-bluegreendeploymentconfiguration.html),
     * the ``dependsOn`` parameter is not supported.
     */
    DependsOn?: {
      /**
       * The dependency condition of the container. The following are the available conditions and their
       * behavior:
       * +  ``START`` - This condition emulates the behavior of links and volumes today. It validates that
       * a dependent container is started before permitting other containers to start.
       * +  ``COMPLETE`` - This condition validates that a dependent container runs to completion (exits)
       * before permitting other containers to start. This can be useful for nonessential containers that
       * run a script and then exit. This condition can't be set on an essential container.
       * +  ``SUCCESS`` - This condition is the same as ``COMPLETE``, but it also requires that the
       * container exits with a ``zero`` status. This condition can't be set on an essential container.
       * +  ``HEALTHY`` - This condition validates that the dependent container passes its Docker health
       * check before permitting other containers to start. This requires that the dependent container has
       * health checks configured. This condition is confirmed only at task startup.
       */
      Condition?: string;
      /** The name of a container. */
      ContainerName?: string;
    }[];
    /**
     * A key/value map of labels to add to the container. This parameter maps to ``Labels`` in the docker
     * container create command and the ``--label`` option to docker run. This parameter requires version
     * 1.18 of the Docker Remote API or greater on your container instance. To check the Docker Remote API
     * version on your container instance, log in to your container instance and run the following
     * command: ``sudo docker version --format '{{.Server.APIVersion}}'``
     */
    DockerLabels?: Record<string, string>;
    /**
     * The list of port mappings for the container. Port mappings allow containers to access ports on the
     * host container instance to send or receive traffic.
     * For task definitions that use the ``awsvpc`` network mode, you should only specify the
     * ``containerPort``. The ``hostPort`` can be left blank or it must be the same value as the
     * ``containerPort``.
     * Port mappings on Windows use the ``NetNAT`` gateway address rather than ``localhost``. There is no
     * loopback for port mappings on Windows, so you cannot access a container's mapped port from the host
     * itself.
     * This parameter maps to ``PortBindings`` in the [Create a
     * container](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/#operation/ContainerCreate)
     * section of the [Docker Remote
     * API](https://docs.aws.amazon.com/https://docs.docker.com/engine/api/v1.35/) and the ``--publish``
     * option to [docker run](https://docs.aws.amazon.com/https://docs.docker.com/engine/reference/run/).
     * If the network mode of a task definition is set to ``none``, then you can't specify port mappings.
     * If the network mode of a task definition is set to ``host``, then host ports must either be
     * undefined or they must match the container port in the port mapping.
     * After a task reaches the ``RUNNING`` status, manual and automatic host and container port
     * assignments are visible in the *Network Bindings* section of a container description for a selected
     * task in the Amazon ECS console. The assignments are also visible in the ``networkBindings`` section
     * [DescribeTasks](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DescribeTasks.html)
     * responses.
     * @uniqueItems true
     */
    PortMappings?: ({
      /**
       * The application protocol that's used for the port mapping. This parameter only applies to Service
       * Connect. We recommend that you set this parameter to be consistent with the protocol that your
       * application uses. If you set this parameter, Amazon ECS adds protocol-specific connection handling
       * to the Service Connect proxy. If you set this parameter, Amazon ECS adds protocol-specific
       * telemetry in the Amazon ECS console and CloudWatch.
       * If you don't set a value for this parameter, then TCP is used. However, Amazon ECS doesn't add
       * protocol-specific telemetry for TCP.
       * ``appProtocol`` is immutable in a Service Connect service. Updating this field requires a service
       * deletion and redeployment.
       * Tasks that run in a namespace can use short names to connect to services in the namespace. Tasks
       * can connect to services across all of the clusters in the namespace. Tasks connect through a
       * managed proxy container that collects logs and metrics for increased visibility. Only the tasks
       * that Amazon ECS services create are supported with Service Connect. For more information, see
       * [Service Connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html)
       * in the *Amazon Elastic Container Service Developer Guide*.
       * @enum ["http","http2","grpc"]
       */
      AppProtocol?: "http" | "http2" | "grpc";
      /**
       * The port number range on the container that's bound to the dynamically mapped host port range.
       * The following rules apply when you specify a ``containerPortRange``:
       * +  You must use either the ``bridge`` network mode or the ``awsvpc`` network mode.
       * +  This parameter is available for both the EC2 and FARGATElong launch types.
       * +  This parameter is available for both the Linux and Windows operating systems.
       * +  The container instance must have at least version 1.67.0 of the container agent and at least
       * version 1.67.0-1 of the ``ecs-init`` package
       * +  You can specify a maximum of 100 port ranges per container.
       * +  You do not specify a ``hostPortRange``. The value of the ``hostPortRange`` is set as follows:
       * +  For containers in a task with the ``awsvpc`` network mode, the ``hostPortRange`` is set to the
       * same value as the ``containerPortRange``. This is a static mapping strategy.
       * +  For containers in a task with the ``bridge`` network mode, the Amazon ECS agent finds open
       * host ports from the default ephemeral range and passes it to docker to bind them to the container
       * ports.
       * +  The ``containerPortRange`` valid values are between 1 and 65535.
       * +  A port can only be included in one port mapping per container.
       * +  You cannot specify overlapping port ranges.
       * +  The first port in the range must be less than last port in the range.
       * +  Docker recommends that you turn off the docker-proxy in the Docker daemon config file when you
       * have a large number of ports.
       * For more information, see [Issue
       * #11185](https://docs.aws.amazon.com/https://github.com/moby/moby/issues/11185) on the Github
       * website.
       * For information about how to turn off the docker-proxy in the Docker daemon config file, see
       * [Docker
       * daemon](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/bootstrap_container_instance.html#bootstrap_docker_daemon)
       * in the *Amazon ECS Developer Guide*.
       * You can call
       * [DescribeTasks](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DescribeTasks.html)
       * to view the ``hostPortRange`` which are the host ports that are bound to the container ports.
       */
      ContainerPortRange?: string;
      /**
       * The port number on the container instance to reserve for your container.
       * If you specify a ``containerPortRange``, leave this field empty and the value of the ``hostPort``
       * is set as follows:
       * +  For containers in a task with the ``awsvpc`` network mode, the ``hostPort`` is set to the same
       * value as the ``containerPort``. This is a static mapping strategy.
       * +  For containers in a task with the ``bridge`` network mode, the Amazon ECS agent finds open
       * ports on the host and automatically binds them to the container ports. This is a dynamic mapping
       * strategy.
       * If you use containers in a task with the ``awsvpc`` or ``host`` network mode, the ``hostPort`` can
       * either be left blank or set to the same value as the ``containerPort``.
       * If you use containers in a task with the ``bridge`` network mode, you can specify a non-reserved
       * host port for your container port mapping, or you can omit the ``hostPort`` (or set it to ``0``)
       * while specifying a ``containerPort`` and your container automatically receives a port in the
       * ephemeral port range for your container instance operating system and Docker version.
       * The default ephemeral port range for Docker version 1.6.0 and later is listed on the instance
       * under ``/proc/sys/net/ipv4/ip_local_port_range``. If this kernel parameter is unavailable, the
       * default ephemeral port range from 49153 through 65535 (Linux) or 49152 through 65535 (Windows) is
       * used. Do not attempt to specify a host port in the ephemeral port range as these are reserved for
       * automatic assignment. In general, ports below 32768 are outside of the ephemeral port range.
       * The default reserved ports are 22 for SSH, the Docker ports 2375 and 2376, and the Amazon ECS
       * container agent ports 51678-51680. Any host port that was previously specified in a running task is
       * also reserved while the task is running. That is, after a task stops, the host port is released.
       * The current reserved ports are displayed in the ``remainingResources`` of
       * [DescribeContainerInstances](https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_DescribeContainerInstances.html)
       * output. A container instance can have up to 100 reserved ports at a time. This number includes the
       * default reserved ports. Automatically assigned ports aren't included in the 100 reserved ports
       * quota.
       */
      HostPort?: number;
      /**
       * The port number on the container that's bound to the user-specified or automatically assigned host
       * port.
       * If you use containers in a task with the ``awsvpc`` or ``host`` network mode, specify the exposed
       * ports using ``containerPort``.
       * If you use containers in a task with the ``bridge`` network mode and you specify a container port
       * and not a host port, your container automatically receives a host port in the ephemeral port range.
       * For more information, see ``hostPort``. Port mappings that are automatically assigned in this way
       * do not count toward the 100 reserved ports limit of a container instance.
       */
      ContainerPort?: number;
      /**
       * The protocol used for the port mapping. Valid values are ``tcp`` and ``udp``. The default is
       * ``tcp``. ``protocol`` is immutable in a Service Connect service. Updating this field requires a
       * service deletion and redeployment.
       */
      Protocol?: string;
      /**
       * The name that's used for the port mapping. This parameter is the name that you use in the
       * ``serviceConnectConfiguration`` and the ``vpcLatticeConfigurations`` of a service. The name can
       * include up to 64 characters. The characters can include lowercase letters, numbers, underscores
       * (_), and hyphens (-). The name can't start with a hyphen.
       */
      Name?: string;
    })[];
    /**
     * The command that's passed to the container. This parameter maps to ``Cmd`` in the docker container
     * create command and the ``COMMAND`` parameter to docker run. If there are multiple arguments, each
     * argument is a separated string in the array.
     */
    Command?: string[];
    /**
     * The environment variables to pass to a container. This parameter maps to ``Env`` in the docker
     * container create command and the ``--env`` option to docker run.
     * We don't recommend that you use plaintext environment variables for sensitive information, such
     * as credential data.
     * @uniqueItems true
     */
    Environment?: {
      /**
       * The value of the key-value pair. For environment variables, this is the value of the environment
       * variable.
       */
      Value?: string;
      /**
       * The name of the key-value pair. For environment variables, this is the name of the environment
       * variable.
       */
      Name?: string;
    }[];
    /**
     * The ``links`` parameter allows containers to communicate with each other without the need for port
     * mappings. This parameter is only supported if the network mode of a task definition is ``bridge``.
     * The ``name:internalName`` construct is analogous to ``name:alias`` in Docker links. Up to 255
     * letters (uppercase and lowercase), numbers, underscores, and hyphens are allowed.. This parameter
     * maps to ``Links`` in the docker container create command and the ``--link`` option to docker run.
     * This parameter is not supported for Windows containers.
     * Containers that are collocated on a single container instance may be able to communicate with
     * each other without requiring links or host port mappings. Network isolation is achieved on the
     * container instance using security groups and VPC settings.
     * @uniqueItems true
     */
    Links?: string[];
  })[];
  /**
   * The name of a family that this task definition is registered to. Up to 255 letters (uppercase and
   * lowercase), numbers, hyphens, and underscores are allowed.
   * A family groups multiple versions of a task definition. Amazon ECS gives the first task definition
   * that you registered to a family a revision number of 1. Amazon ECS gives sequential revision
   * numbers to each task definition that you add.
   * To use revision numbers when you update a task definition, specify this property. If you don't
   * specify a value, CFNlong generates a new task definition each time that you update it.
   */
  Family?: string;
  /** The ephemeral storage settings to use for tasks run with the task definition. */
  EphemeralStorage?: {
    /**
     * The total amount, in GiB, of ephemeral storage to set for the task. The minimum supported value is
     * ``21`` GiB and the maximum supported value is ``200`` GiB.
     */
    SizeInGiB?: number;
  };
  /**
   * The metadata that you apply to the task definition to help you categorize and organize them. Each
   * tag consists of a key and an optional value. You define both of them.
   * The following basic restrictions apply to tags:
   * +  Maximum number of tags per resource - 50
   * +  For each resource, each tag key must be unique, and each tag key can have only one value.
   * +  Maximum key length - 128 Unicode characters in UTF-8
   * +  Maximum value length - 256 Unicode characters in UTF-8
   * +  If your tagging schema is used across multiple services and resources, remember that other
   * services may have restrictions on allowed characters. Generally allowed characters are: letters,
   * numbers, and spaces representable in UTF-8, and the following characters: + - = . _ : / @.
   * +  Tag keys and values are case-sensitive.
   * +  Do not use ``aws:``, ``AWS:``, or any upper or lowercase combination of such as a prefix for
   * either keys or values as it is reserved for AWS use. You cannot edit or delete tag keys or values
   * with this prefix. Tags with this prefix do not count against your tags per resource limit.
   */
  Tags?: {
    /**
     * The optional part of a key-value pair that make up a tag. A ``value`` acts as a descriptor within a
     * tag category (key).
     */
    Value?: string;
    /**
     * One part of a key-value pair that make up a tag. A ``key`` is a general label that acts like a
     * category for more specific tag values.
     */
    Key?: string;
  }[];
  TaskDefinitionArn?: string;
};


/**
 * The ``AWS::SNS::Topic`` resource creates a topic to which notifications can be published.
 * One account can create a maximum of 100,000 standard topics and 1,000 FIFO topics. For more
 * information, see [endpoints and quotas](https://docs.aws.amazon.com/general/latest/gr/sns.html) in
 * the *General Reference*.
 * The structure of ``AUTHPARAMS`` depends on the .signature of the API request. For more
 * information, see [Examples of the complete Signature Version 4 signing
 * process](https://docs.aws.amazon.com/general/latest/gr/sigv4-signed-request-examples.html) in the
 * *General Reference*.
 */
export type AwsSnsTopic = {
  /**
   * The display name to use for an SNS topic with SMS subscriptions. The display name must be maximum
   * 100 characters long, including hyphens (-), underscores (_), spaces, and tabs.
   */
  DisplayName?: string;
  /**
   * The ID of an AWS managed customer master key (CMK) for SNS or a custom CMK. For more information,
   * see [Key
   * terms](https://docs.aws.amazon.com/sns/latest/dg/sns-server-side-encryption.html#sse-key-terms).
   * For more examples, see ``KeyId`` in the *API Reference*.
   * This property applies only to
   * [server-side-encryption](https://docs.aws.amazon.com/sns/latest/dg/sns-server-side-encryption.html).
   */
  KmsMasterKeyId?: string;
  /**
   * The body of the policy document you want to use for this topic.
   * You can only add one policy per topic.
   * The policy must be in JSON string format.
   * Length Constraints: Maximum length of 30,720.
   */
  DataProtectionPolicy?: Record<string, unknown>;
  /**
   * The SNS subscriptions (endpoints) for this topic.
   * If you specify the ``Subscription`` property in the ``AWS::SNS::Topic`` resource and it creates
   * an associated subscription resource, the associated subscription is not deleted when the
   * ``AWS::SNS::Topic`` resource is deleted.
   * @uniqueItems false
   */
  Subscription?: {
    /**
     * The endpoint that receives notifications from the SNS topic. The endpoint value depends on the
     * protocol that you specify. For more information, see the ``Endpoint`` parameter of the
     * ``Subscribe`` action in the *API Reference*.
     */
    Endpoint: string;
    /**
     * The subscription's protocol. For more information, see the ``Protocol`` parameter of the
     * ``Subscribe`` action in the *API Reference*.
     */
    Protocol: string;
  }[];
  /** Set to true to create a FIFO topic. */
  FifoTopic?: boolean;
  /**
   * Enables content-based deduplication for FIFO topics.
   * +  By default, ``ContentBasedDeduplication`` is set to ``false``. If you create a FIFO topic and
   * this attribute is ``false``, you must specify a value for the ``MessageDeduplicationId`` parameter
   * for the [Publish](https://docs.aws.amazon.com/sns/latest/api/API_Publish.html) action.
   * +  When you set ``ContentBasedDeduplication`` to ``true``, SNS uses a SHA-256 hash to generate
   * the ``MessageDeduplicationId`` using the body of the message (but not the attributes of the
   * message).
   * (Optional) To override the generated value, you can specify a value for the the
   * ``MessageDeduplicationId`` parameter for the ``Publish`` action.
   */
  ContentBasedDeduplication?: boolean;
  /**
   * The archive policy determines the number of days SNS retains messages. You can set a retention
   * period from 1 to 365 days.
   */
  ArchivePolicy?: Record<string, unknown>;
  FifoThroughputScope?: string;
  /**
   * The list of tags to add to a new topic.
   * To be able to tag a topic on creation, you must have the ``sns:CreateTopic`` and
   * ``sns:TagResource`` permissions.
   * @uniqueItems false
   */
  Tags?: {
    /** The required key portion of the tag. */
    Key: string;
    /** The optional value portion of the tag. */
    Value: string;
  }[];
  /**
   * The name of the topic you want to create. Topic names must include only uppercase and lowercase
   * ASCII letters, numbers, underscores, and hyphens, and must be between 1 and 256 characters long.
   * FIFO topic names must end with ``.fifo``.
   * If you don't specify a name, CFN generates a unique physical ID and uses that ID for the topic
   * name. For more information, see [Name
   * type](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-name.html).
   * If you specify a name, you can't perform updates that require replacement of this resource. You
   * can perform updates that require no or some interruption. If you must replace the resource, specify
   * a new name.
   */
  TopicName?: string;
  TopicArn?: string;
  /**
   * The signature version corresponds to the hashing algorithm used while creating the signature of the
   * notifications, subscription confirmations, or unsubscribe confirmation messages sent by Amazon SNS.
   * By default, ``SignatureVersion`` is set to ``1``.
   */
  SignatureVersion?: string;
  /**
   * Tracing mode of an SNS topic. By default ``TracingConfig`` is set to ``PassThrough``, and the topic
   * passes through the tracing header it receives from an SNS publisher to its subscriptions. If set to
   * ``Active``, SNS will vend X-Ray segment data to topic owner account if the sampled flag in the
   * tracing header is true.
   */
  TracingConfig?: string;
  /**
   * The ``DeliveryStatusLogging`` configuration enables you to log the delivery status of messages sent
   * from your Amazon SNS topic to subscribed endpoints with the following supported delivery protocols:
   * +  HTTP
   * +  Amazon Kinesis Data Firehose
   * +   AWS Lambda
   * +  Platform application endpoint
   * +  Amazon Simple Queue Service
   * Once configured, log entries are sent to Amazon CloudWatch Logs.
   * @uniqueItems true
   */
  DeliveryStatusLogging?: ({
    /**
     * Indicates one of the supported protocols for the Amazon SNS topic.
     * At least one of the other three ``LoggingConfig`` properties is recommend along with
     * ``Protocol``.
     * @enum ["http/s","sqs","lambda","firehose","application"]
     */
    Protocol: "http/s" | "sqs" | "lambda" | "firehose" | "application";
    /** The IAM role ARN to be used when logging successful message deliveries in Amazon CloudWatch. */
    SuccessFeedbackRoleArn?: string;
    /**
     * The percentage of successful message deliveries to be logged in Amazon CloudWatch. Valid percentage
     * values range from 0 to 100.
     */
    SuccessFeedbackSampleRate?: string;
    /** The IAM role ARN to be used when logging failed message deliveries in Amazon CloudWatch. */
    FailureFeedbackRoleArn?: string;
  })[];
};


/** Resource Type definition for AWS::Kinesis::Stream */
export type AwsKinesisStream = {
  /** The Amazon resource name (ARN) of the Kinesis stream */
  Arn?: string;
  /**
   * The name of the Kinesis stream.
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9_.-]+$
   */
  Name?: string;
  /**
   * The final list of shard-level metrics
   * @maxItems 7
   * @uniqueItems true
   */
  DesiredShardLevelMetrics?: ("IncomingBytes" | "IncomingRecords" | "OutgoingBytes" | "OutgoingRecords" | "WriteProvisionedThroughputExceeded" | "ReadProvisionedThroughputExceeded" | "IteratorAgeMilliseconds" | "ALL")[];
  /**
   * The number of hours for the data records that are stored in shards to remain accessible.
   * @minimum 24
   */
  RetentionPeriodHours?: number;
  /**
   * The number of shards that the stream uses. Required when StreamMode = PROVISIONED is passed.
   * @minimum 1
   */
  ShardCount?: number;
  /**
   * The mode in which the stream is running.
   * @default {"StreamMode":"PROVISIONED"}
   */
  StreamModeDetails?: {
    /**
     * The mode of the stream
     * @enum ["ON_DEMAND","PROVISIONED"]
     */
    StreamMode: "ON_DEMAND" | "PROVISIONED";
  };
  /**
   * When specified, enables or updates server-side encryption using an AWS KMS key for a specified
   * stream.
   */
  StreamEncryption?: {
    /**
     * The encryption type to use. The only valid value is KMS.
     * @enum ["KMS"]
     */
    EncryptionType: "KMS";
    /**
     * The GUID for the customer-managed AWS KMS key to use for encryption. This value can be a globally
     * unique identifier, a fully specified Amazon Resource Name (ARN) to either an alias or a key, or an
     * alias name prefixed by "alias/".You can also use a master key owned by Kinesis Data Streams by
     * specifying the alias aws/kinesis.
     * @minLength 1
     * @maxLength 2048
     */
    KeyId: unknown | unknown;
  };
  /**
   * An arbitrary set of tags (key-value pairs) to associate with the Kinesis stream.
   * @maxItems 50
   * @uniqueItems false
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
     * The value for the tag. You can specify a value that is 0 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 255
     */
    Value: string;
  }[];
  /**
   * Maximum size of a data record in KiB allowed to be put into Kinesis stream.
   * @minimum 1024
   * @maximum 10240
   */
  MaxRecordSizeInKiB?: number;
  /**
   * Target warm throughput in MiB/s for the stream. This property can ONLY be set when StreamMode is
   * ON_DEMAND.
   */
  WarmThroughputMiBps?: number;
  /** Warm throughput configuration details for the stream. Only present for ON_DEMAND streams. */
  WarmThroughputObject?: {
    /** Target warm throughput in MiB/s that a customer can write to a stream at any given time */
    TargetMiBps?: number;
    /** Current warm throughput in MiB/s */
    CurrentMiBps?: number;
  };
};


/**
 * The AWS::SSM::Document resource is an SSM document in AWS Systems Manager that defines the actions
 * that Systems Manager performs, which can be used to set up and run commands on your instances.
 */
export type AwsSsmDocument = {
  /** The content for the Systems Manager document in JSON, YAML or String format. */
  Content: Record<string, unknown> | string;
  /**
   * A list of key and value pairs that describe attachments to a version of a document.
   * @minItems 0
   * @maxItems 20
   */
  Attachments?: ({
    /**
     * The key of a key-value pair that identifies the location of an attachment to a document.
     * @enum ["SourceUrl","S3FileUrl","AttachmentReference"]
     */
    Key?: "SourceUrl" | "S3FileUrl" | "AttachmentReference";
    /**
     * The value of a key-value pair that identifies the location of an attachment to a document. The
     * format for Value depends on the type of key you specify.
     * @minItems 1
     * @maxItems 1
     */
    Values?: string[];
    /**
     * The name of the document attachment file.
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Name?: string;
  })[];
  /**
   * A name for the Systems Manager document.
   * @pattern ^[a-zA-Z0-9_\-.]{3,128}$
   */
  Name?: string;
  /**
   * An optional field specifying the version of the artifact you are creating with the document. This
   * value is unique across all versions of a document, and cannot be changed.
   * @pattern ^[a-zA-Z0-9_\-.]{1,128}$
   */
  VersionName?: string;
  /**
   * The type of document to create.
   * @enum ["ApplicationConfiguration","ApplicationConfigurationSchema","Automation","Automation.ChangeTemplate","AutoApprovalPolicy","ChangeCalendar","CloudFormation","Command","DeploymentStrategy","ManualApprovalPolicy","Package","Policy","ProblemAnalysis","ProblemAnalysisTemplate","Session"]
   */
  DocumentType?: "ApplicationConfiguration" | "ApplicationConfigurationSchema" | "Automation" | "Automation.ChangeTemplate" | "AutoApprovalPolicy" | "ChangeCalendar" | "CloudFormation" | "Command" | "DeploymentStrategy" | "ManualApprovalPolicy" | "Package" | "Policy" | "ProblemAnalysis" | "ProblemAnalysisTemplate" | "Session";
  /**
   * Specify the document format for the request. The document format can be either JSON or YAML. JSON
   * is the default format.
   * @default "JSON"
   * @enum ["YAML","JSON","TEXT"]
   */
  DocumentFormat?: "YAML" | "JSON" | "TEXT";
  /**
   * Specify a target type to define the kinds of resources the document can run on.
   * @pattern ^\/[\w\.\-\:\/]*$
   */
  TargetType?: string;
  /**
   * Optional metadata that you assign to a resource. Tags enable you to categorize a resource in
   * different ways, such as by purpose, owner, or environment.
   * @maxItems 1000
   */
  Tags?: {
    /**
     * The name of the tag.
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key?: string;
    /**
     * The value of the tag.
     * @minLength 1
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value?: string;
  }[];
  /**
   * A list of SSM documents required by a document. For example, an ApplicationConfiguration document
   * requires an ApplicationConfigurationSchema document.
   * @minItems 1
   */
  Requires?: {
    /**
     * The name of the required SSM document. The name can be an Amazon Resource Name (ARN).
     * @maxLength 200
     * @pattern ^[a-zA-Z0-9_\-.:/]{3,200}$
     */
    Name?: string;
    /**
     * The document version required by the current document.
     * @maxLength 8
     * @pattern ([$]LATEST|[$]DEFAULT|^[1-9][0-9]*$)
     */
    Version?: string;
  }[];
  /**
   * Update method - when set to 'Replace', the update will replace the existing document; when set to
   * 'NewVersion', the update will create a new version.
   * @default "Replace"
   * @enum ["Replace","NewVersion"]
   */
  UpdateMethod?: "Replace" | "NewVersion";
};


/**
 * The AWS::SSM::Association resource associates an SSM document in AWS Systems Manager with EC2
 * instances that contain a configuration agent to process the document.
 */
export type AwsSsmAssociation = {
  /**
   * The name of the association.
   * @pattern ^[a-zA-Z0-9_\-.]{3,128}$
   */
  AssociationName?: string;
  CalendarNames?: string[];
  /**
   * A Cron or Rate expression that specifies when the association is applied to the target.
   * @minLength 1
   * @maxLength 256
   */
  ScheduleExpression?: string;
  /** @pattern ^([1-9][0-9]{0,6}|[0]|[1-9][0-9]%|[0-9]%|100%)$ */
  MaxErrors?: string;
  /** Parameter values that the SSM document uses at runtime. */
  Parameters?: Record<string, string[]>;
  /**
   * The ID of the instance that the SSM document is associated with.
   * @pattern (^i-(\w{8}|\w{17})$)|(^mi-\w{17}$)
   */
  InstanceId?: string;
  /**
   * @minimum 15
   * @maximum 172800
   */
  WaitForSuccessTimeoutSeconds?: number;
  /** @pattern ^([1-9][0-9]{0,6}|[1-9][0-9]%|[1-9]%|100%)$ */
  MaxConcurrency?: string;
  /** @enum ["CRITICAL","HIGH","MEDIUM","LOW","UNSPECIFIED"] */
  ComplianceSeverity?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNSPECIFIED";
  /**
   * The targets that the SSM document sends commands to.
   * @minItems 0
   * @maxItems 5
   */
  Targets?: {
    /**
     * @minItems 0
     * @maxItems 50
     */
    Values: unknown[];
    /** @pattern ^[\p{L}\p{Z}\p{N}_.:/=+\-@]{1,128}$|resource-groups:Name */
    Key: string;
  }[];
  /** @enum ["AUTO","MANUAL"] */
  SyncCompliance?: "AUTO" | "MANUAL";
  OutputLocation?: {
    S3Location?: {
      OutputS3KeyPrefix?: string;
      OutputS3Region?: string;
      OutputS3BucketName?: string;
    };
  };
  /**
   * @minimum 1
   * @maximum 6
   */
  ScheduleOffset?: number;
  /**
   * The name of the SSM document.
   * @pattern ^[a-zA-Z0-9_\-.:/]{3,200}$
   */
  Name: string;
  ApplyOnlyAtCronInterval?: boolean;
  /**
   * The version of the SSM document to associate with the target.
   * @pattern ([$]LATEST|[$]DEFAULT|^[1-9][0-9]*$)
   */
  DocumentVersion?: string;
  /**
   * Unique identifier of the association.
   * @pattern [0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}
   */
  AssociationId?: string;
  /**
   * @minLength 1
   * @maxLength 50
   */
  AutomationTargetParameterName?: string;
};


// ==========================================
// CLOUDFORMATION RESOURCE TYPE
// ==========================================


/**
 * Base CloudFormation resource attributes that apply to all resources
 */
export type CloudFormationResourceBase = {
  /** Dependencies on other resources */
  DependsOn?: string | string[];
  /** Resource metadata */
  Metadata?: Record<string, unknown>;
  /** Condition for resource creation */
  Condition?: string;
  /** Deletion policy */
  DeletionPolicy?: 'Delete' | 'Retain' | 'Snapshot' | 'RetainExceptOnCreate';
  /** Update replace policy */
  UpdateReplacePolicy?: 'Delete' | 'Retain' | 'Snapshot';
  /** Creation policy */
  CreationPolicy?: {
    AutoScalingCreationPolicy?: { MinSuccessfulInstancesPercent?: number };
    ResourceSignal?: { Count?: number; Timeout?: string };
  };
  /** Update policy */
  UpdatePolicy?: Record<string, unknown>;
};


/**
 * Union type of all CloudFormation resources.
 * Each resource has a Type field (discriminant) and Properties typed to match.
 */
export type CloudFormationResource =
  | { Type: 'AWS::ApiGatewayV2::Api'; Properties?: AwsApigatewayv2Api } & CloudFormationResourceBase
  | { Type: 'AWS::ApiGatewayV2::Apimapping'; Properties?: AwsApigatewayv2Apimapping } & CloudFormationResourceBase
  | { Type: 'AWS::ApiGatewayV2::Domainname'; Properties?: AwsApigatewayv2Domainname } & CloudFormationResourceBase
  | { Type: 'AWS::ApiGatewayV2::Stage'; Properties?: AwsApigatewayv2Stage } & CloudFormationResourceBase
  | { Type: 'AWS::ApiGatewayV2::Vpclink'; Properties?: AwsApigatewayv2Vpclink } & CloudFormationResourceBase
  | { Type: 'AWS::ApplicationAutoScaling::Scalabletarget'; Properties?: AwsApplicationautoscalingScalabletarget } & CloudFormationResourceBase
  | { Type: 'AWS::ApplicationAutoScaling::Scalingpolicy'; Properties?: AwsApplicationautoscalingScalingpolicy } & CloudFormationResourceBase
  | { Type: 'AWS::AutoScaling::Autoscalinggroup'; Properties?: AwsAutoscalingAutoscalinggroup } & CloudFormationResourceBase
  | { Type: 'AWS::AutoScaling::Warmpool'; Properties?: AwsAutoscalingWarmpool } & CloudFormationResourceBase
  | { Type: 'AWS::Batch::Computeenvironment'; Properties?: AwsBatchComputeenvironment } & CloudFormationResourceBase
  | { Type: 'AWS::Batch::Jobdefinition'; Properties?: AwsBatchJobdefinition } & CloudFormationResourceBase
  | { Type: 'AWS::Batch::Jobqueue'; Properties?: AwsBatchJobqueue } & CloudFormationResourceBase
  | { Type: 'AWS::CloudFormation::Customresource'; Properties?: AwsCloudformationCustomresource } & CloudFormationResourceBase
  | { Type: 'AWS::CloudFront::Cachepolicy'; Properties?: AwsCloudfrontCachepolicy } & CloudFormationResourceBase
  | { Type: 'AWS::CloudFront::Cloudfrontoriginaccessidentity'; Properties?: AwsCloudfrontCloudfrontoriginaccessidentity } & CloudFormationResourceBase
  | { Type: 'AWS::CloudFront::Distribution'; Properties?: AwsCloudfrontDistribution } & CloudFormationResourceBase
  | { Type: 'AWS::CloudFront::Function'; Properties?: AwsCloudfrontFunction } & CloudFormationResourceBase
  | { Type: 'AWS::CloudFront::Originrequestpolicy'; Properties?: AwsCloudfrontOriginrequestpolicy } & CloudFormationResourceBase
  | { Type: 'AWS::CodeDeploy::Application'; Properties?: AwsCodedeployApplication } & CloudFormationResourceBase
  | { Type: 'AWS::CodeDeploy::Deploymentgroup'; Properties?: AwsCodedeployDeploymentgroup } & CloudFormationResourceBase
  | { Type: 'AWS::Cognito::Userpool'; Properties?: AwsCognitoUserpool } & CloudFormationResourceBase
  | { Type: 'AWS::Cognito::Userpoolclient'; Properties?: AwsCognitoUserpoolclient } & CloudFormationResourceBase
  | { Type: 'AWS::Cognito::Userpooldomain'; Properties?: AwsCognitoUserpooldomain } & CloudFormationResourceBase
  | { Type: 'AWS::Cognito::Userpoolidentityprovider'; Properties?: AwsCognitoUserpoolidentityprovider } & CloudFormationResourceBase
  | { Type: 'AWS::Cognito::Userpooluicustomizationattachment'; Properties?: AwsCognitoUserpooluicustomizationattachment } & CloudFormationResourceBase
  | { Type: 'AWS::DynamoDB::Globaltable'; Properties?: AwsDynamodbGlobaltable } & CloudFormationResourceBase
  | { Type: 'AWS::EC2::Launchtemplate'; Properties?: AwsEc2Launchtemplate } & CloudFormationResourceBase
  | { Type: 'AWS::EC2::Route'; Properties?: AwsEc2Route } & CloudFormationResourceBase
  | { Type: 'AWS::EC2::Securitygroup'; Properties?: AwsEc2Securitygroup } & CloudFormationResourceBase
  | { Type: 'AWS::ECS::Capacityprovider'; Properties?: AwsEcsCapacityprovider } & CloudFormationResourceBase
  | { Type: 'AWS::ECS::Cluster'; Properties?: AwsEcsCluster } & CloudFormationResourceBase
  | { Type: 'AWS::ECS::Clustercapacityproviderassociations'; Properties?: AwsEcsClustercapacityproviderassociations } & CloudFormationResourceBase
  | { Type: 'AWS::ECS::Service'; Properties?: AwsEcsService } & CloudFormationResourceBase
  | { Type: 'AWS::ECS::Taskdefinition'; Properties?: AwsEcsTaskdefinition } & CloudFormationResourceBase
  | { Type: 'AWS::EFS::Accesspoint'; Properties?: AwsEfsAccesspoint } & CloudFormationResourceBase
  | { Type: 'AWS::EFS::Filesystem'; Properties?: AwsEfsFilesystem } & CloudFormationResourceBase
  | { Type: 'AWS::EFS::Mounttarget'; Properties?: AwsEfsMounttarget } & CloudFormationResourceBase
  | { Type: 'AWS::ElastiCache::Parametergroup'; Properties?: AwsElasticacheParametergroup } & CloudFormationResourceBase
  | { Type: 'AWS::ElastiCache::Replicationgroup'; Properties?: AwsElasticacheReplicationgroup } & CloudFormationResourceBase
  | { Type: 'AWS::ElastiCache::Subnetgroup'; Properties?: AwsElasticacheSubnetgroup } & CloudFormationResourceBase
  | { Type: 'AWS::ElasticLoadBalancingV2::Listener'; Properties?: AwsElasticloadbalancingv2Listener } & CloudFormationResourceBase
  | { Type: 'AWS::ElasticLoadBalancingV2::Loadbalancer'; Properties?: AwsElasticloadbalancingv2Loadbalancer } & CloudFormationResourceBase
  | { Type: 'AWS::Events::Archive'; Properties?: AwsEventsArchive } & CloudFormationResourceBase
  | { Type: 'AWS::Events::Eventbus'; Properties?: AwsEventsEventbus } & CloudFormationResourceBase
  | { Type: 'AWS::IAM::Instanceprofile'; Properties?: AwsIamInstanceprofile } & CloudFormationResourceBase
  | { Type: 'AWS::IAM::Role'; Properties?: AwsIamRole } & CloudFormationResourceBase
  | { Type: 'AWS::Kinesis::Stream'; Properties?: AwsKinesisStream } & CloudFormationResourceBase
  | { Type: 'AWS::Lambda::Alias'; Properties?: AwsLambdaAlias } & CloudFormationResourceBase
  | { Type: 'AWS::Lambda::Eventinvokeconfig'; Properties?: AwsLambdaEventinvokeconfig } & CloudFormationResourceBase
  | { Type: 'AWS::Lambda::Function'; Properties?: AwsLambdaFunction } & CloudFormationResourceBase
  | { Type: 'AWS::Lambda::Permission'; Properties?: AwsLambdaPermission } & CloudFormationResourceBase
  | { Type: 'AWS::Lambda::Url'; Properties?: AwsLambdaUrl } & CloudFormationResourceBase
  | { Type: 'AWS::Logs::Loggroup'; Properties?: AwsLogsLoggroup } & CloudFormationResourceBase
  | { Type: 'AWS::OpenSearchService::Domain'; Properties?: AwsOpensearchserviceDomain } & CloudFormationResourceBase
  | { Type: 'AWS::RDS::Dbcluster'; Properties?: AwsRdsDbcluster } & CloudFormationResourceBase
  | { Type: 'AWS::RDS::Dbclusterparametergroup'; Properties?: AwsRdsDbclusterparametergroup } & CloudFormationResourceBase
  | { Type: 'AWS::RDS::Dbinstance'; Properties?: AwsRdsDbinstance } & CloudFormationResourceBase
  | { Type: 'AWS::RDS::Dbparametergroup'; Properties?: AwsRdsDbparametergroup } & CloudFormationResourceBase
  | { Type: 'AWS::RDS::Dbsubnetgroup'; Properties?: AwsRdsDbsubnetgroup } & CloudFormationResourceBase
  | { Type: 'AWS::RDS::Optiongroup'; Properties?: AwsRdsOptiongroup } & CloudFormationResourceBase
  | { Type: 'AWS::Route53::Recordset'; Properties?: AwsRoute53Recordset } & CloudFormationResourceBase
  | { Type: 'AWS::S3::Bucket'; Properties?: AwsS3Bucket } & CloudFormationResourceBase
  | { Type: 'AWS::S3::Bucketpolicy'; Properties?: AwsS3Bucketpolicy } & CloudFormationResourceBase
  | { Type: 'AWS::Scheduler::Schedule'; Properties?: AwsSchedulerSchedule } & CloudFormationResourceBase
  | { Type: 'AWS::SNS::Topic'; Properties?: AwsSnsTopic } & CloudFormationResourceBase
  | { Type: 'AWS::SQS::Queue'; Properties?: AwsSqsQueue } & CloudFormationResourceBase
  | { Type: 'AWS::SQS::Queuepolicy'; Properties?: AwsSqsQueuepolicy } & CloudFormationResourceBase
  | { Type: 'AWS::SSM::Association'; Properties?: AwsSsmAssociation } & CloudFormationResourceBase
  | { Type: 'AWS::SSM::Document'; Properties?: AwsSsmDocument } & CloudFormationResourceBase
  | { Type: 'AWS::StepFunctions::Statemachine'; Properties?: AwsStepfunctionsStatemachine } & CloudFormationResourceBase
  | { Type: 'AWS::WAFv2::Webaclassociation'; Properties?: AwsWafv2Webaclassociation } & CloudFormationResourceBase
  /** Fallback for any CloudFormation resource type not explicitly listed */
  | { Type: string; Properties?: Record<string, unknown> } & CloudFormationResourceBase;

