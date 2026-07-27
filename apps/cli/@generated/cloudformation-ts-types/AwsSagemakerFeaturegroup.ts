// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-featuregroup.json

/** Resource Type definition for AWS::SageMaker::FeatureGroup */
export type AwsSagemakerFeaturegroup = {
  /**
   * The Name of the FeatureGroup.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,63}
   */
  FeatureGroupName: string;
  /**
   * The Record Identifier Feature Name.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,63}
   */
  RecordIdentifierFeatureName: string;
  /**
   * The Event Time Feature Name.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,63}
   */
  EventTimeFeatureName: string;
  /**
   * An Array of Feature Definition
   * @minItems 1
   * @maxItems 2500
   * @uniqueItems false
   */
  FeatureDefinitions: ({
    /**
     * @minLength 1
     * @maxLength 64
     * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,63}
     */
    FeatureName: string;
    /** @enum ["Integral","Fractional","String"] */
    FeatureType: "Integral" | "Fractional" | "String";
  })[];
  OnlineStoreConfig?: {
    SecurityConfig?: {
      KmsKeyId?: string;
    };
    EnableOnlineStore?: boolean;
    StorageType?: "Standard" | "InMemory";
    TtlDuration?: {
      Unit?: "Seconds" | "Minutes" | "Hours" | "Days" | "Weeks";
      Value?: number;
    };
  };
  OfflineStoreConfig?: {
    S3StorageConfig: {
      /**
       * @maxLength 1024
       * @pattern ^(https|s3)://([^/]+)/?(.*)$
       */
      S3Uri: string;
      KmsKeyId?: string;
    };
    DisableGlueTableCreation?: boolean;
    DataCatalogConfig?: {
      /**
       * @minLength 1
       * @maxLength 255
       * @pattern [\u0020-\uD7FF\uE000-\uFFFD\uD800\uDC00-\uDBFF\uDFFF	]*
       */
      TableName: string;
      /**
       * @minLength 1
       * @maxLength 255
       * @pattern [\u0020-\uD7FF\uE000-\uFFFD\uD800\uDC00-\uDBFF\uDFFF	]*
       */
      Catalog: string;
      /**
       * @minLength 1
       * @maxLength 255
       * @pattern [\u0020-\uD7FF\uE000-\uFFFD\uD800\uDC00-\uDBFF\uDFFF	]*
       */
      Database: string;
    };
    TableFormat?: "Iceberg" | "Glue";
  };
  ThroughputConfig?: {
    ThroughputMode: "OnDemand" | "Provisioned";
    /**
     * For provisioned feature groups with online store enabled, this indicates the read throughput you
     * are billed for and can consume without throttling.
     */
    ProvisionedReadCapacityUnits?: number;
    /**
     * For provisioned feature groups, this indicates the write throughput you are billed for and can
     * consume without throttling.
     */
    ProvisionedWriteCapacityUnits?: number;
  };
  /**
   * Role Arn
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[a-z\-]*:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$
   */
  RoleArn?: string;
  /**
   * Description about the FeatureGroup.
   * @maxLength 128
   */
  Description?: string;
  /** A timestamp of FeatureGroup creation time. */
  CreationTime?: string;
  /** The status of the feature group. */
  FeatureGroupStatus?: string;
  /**
   * An array of key-value pair to apply to this resource.
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
