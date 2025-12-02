// This file is auto-generated. Do not edit manually.
// Source: aws-timestream-table.json

/** The AWS::Timestream::Table resource creates a Timestream Table. */
export type AwsTimestreamTable = {
  Arn?: string;
  /** The table name exposed as a read-only attribute. */
  Name?: string;
  /**
   * The name for the database which the table to be created belongs to.
   * @pattern ^[a-zA-Z0-9_.-]{3,256}$
   */
  DatabaseName: string;
  /**
   * The name for the table. If you don't specify a name, AWS CloudFormation generates a unique physical
   * ID and uses that ID for the table name.
   * @pattern ^[a-zA-Z0-9_.-]{3,256}$
   */
  TableName?: string;
  /** The retention duration of the memory store and the magnetic store. */
  RetentionProperties?: {
    /** The duration for which data must be stored in the memory store. */
    MemoryStoreRetentionPeriodInHours?: string;
    /** The duration for which data must be stored in the magnetic store. */
    MagneticStoreRetentionPeriodInDays?: string;
  };
  /** A Schema specifies the expected data model of the table. */
  Schema?: {
    CompositePartitionKey?: ({
      Type: "DIMENSION" | "MEASURE";
      Name?: string;
      EnforcementInRecord?: "REQUIRED" | "OPTIONAL";
    })[];
  };
  /** The properties that determine whether magnetic store writes are enabled. */
  MagneticStoreWriteProperties?: {
    /** Boolean flag indicating whether magnetic store writes are enabled. */
    EnableMagneticStoreWrites: boolean;
    /**
     * Location to store information about records that were asynchronously rejected during magnetic store
     * writes.
     */
    MagneticStoreRejectedDataLocation?: {
      /** S3 configuration for location to store rejections from magnetic store writes */
      S3Configuration?: {
        /** The bucket name used to store the data. */
        BucketName: string;
        /** String used to prefix all data in the bucket. */
        ObjectKeyPrefix?: string;
        /** Either SSE_KMS or SSE_S3. */
        EncryptionOption: string;
        /** Must be provided if SSE_KMS is specified as the encryption option */
        KmsKeyId?: string;
      };
    };
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key?: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};
