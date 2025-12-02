// This file is auto-generated. Do not edit manually.
// Source: aws-s3-storagelens.json

/**
 * The AWS::S3::StorageLens resource is an Amazon S3 resource type that you can use to create Storage
 * Lens configurations.
 */
export type AwsS3Storagelens = {
  StorageLensConfiguration: {
    AccountLevel: {
      AdvancedDataProtectionMetrics?: {
        /** Specifies whether advanced data protection metrics are enabled or disabled. */
        IsEnabled?: boolean;
      };
      StorageLensGroupLevel?: {
        StorageLensGroupSelectionCriteria?: {
          /** @uniqueItems true */
          Exclude?: string[];
          /** @uniqueItems true */
          Include?: string[];
        };
      };
      ActivityMetrics?: {
        /** Specifies whether activity metrics are enabled or disabled. */
        IsEnabled?: boolean;
      };
      BucketLevel: {
        AdvancedDataProtectionMetrics?: {
          /** Specifies whether advanced data protection metrics are enabled or disabled. */
          IsEnabled?: boolean;
        };
        PrefixLevel?: {
          StorageMetrics: {
            /** Specifies whether prefix-level storage metrics are enabled or disabled. */
            IsEnabled?: boolean;
            SelectionCriteria?: {
              /** Delimiter to divide S3 key into hierarchy of prefixes. */
              Delimiter?: string;
              /** Max depth of prefixes of S3 key that Amazon S3 Storage Lens will analyze. */
              MaxDepth?: number;
              /** The minimum storage bytes threshold for the prefixes to be included in the analysis. */
              MinStorageBytesPercentage?: number;
            };
          };
        };
        ActivityMetrics?: {
          /** Specifies whether activity metrics are enabled or disabled. */
          IsEnabled?: boolean;
        };
        AdvancedCostOptimizationMetrics?: {
          /** Specifies whether advanced cost optimization metrics are enabled or disabled. */
          IsEnabled?: boolean;
        };
        DetailedStatusCodesMetrics?: {
          /** Specifies whether detailed status codes metrics are enabled or disabled. */
          IsEnabled?: boolean;
        };
      };
      AdvancedCostOptimizationMetrics?: {
        /** Specifies whether advanced cost optimization metrics are enabled or disabled. */
        IsEnabled?: boolean;
      };
      DetailedStatusCodesMetrics?: {
        /** Specifies whether detailed status codes metrics are enabled or disabled. */
        IsEnabled?: boolean;
      };
    };
    Exclude?: {
      /** @uniqueItems true */
      Regions?: string[];
      /** @uniqueItems true */
      Buckets?: string[];
    };
    /** Specifies whether the Amazon S3 Storage Lens configuration is enabled or disabled. */
    IsEnabled: boolean;
    Include?: {
      /** @uniqueItems true */
      Regions?: string[];
      /** @uniqueItems true */
      Buckets?: string[];
    };
    AwsOrg?: {
      Arn: string;
    };
    Id: string;
    /** The ARN for the Amazon S3 Storage Lens configuration. */
    StorageLensArn?: string;
    DataExport?: {
      S3BucketDestination?: {
        /**
         * The version of the output schema to use when exporting Amazon S3 Storage Lens metrics.
         * @enum ["V_1"]
         */
        OutputSchemaVersion: "V_1";
        /**
         * Specifies the file format to use when exporting Amazon S3 Storage Lens metrics export.
         * @enum ["CSV","Parquet"]
         */
        Format: "CSV" | "Parquet";
        /** The AWS account ID that owns the destination S3 bucket. */
        AccountId: string;
        /** The prefix to use for Amazon S3 Storage Lens export. */
        Prefix?: string;
        Encryption?: unknown | unknown;
        /** The ARN of the bucket to which Amazon S3 Storage Lens exports will be placed. */
        Arn: string;
      };
      CloudWatchMetrics?: {
        /** Specifies whether CloudWatch metrics are enabled or disabled. */
        IsEnabled: boolean;
      };
    };
  };
  /**
   * A set of tags (key-value pairs) for this Amazon S3 Storage Lens configuration.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 255
     * @pattern ^(?!aws:.*)[a-zA-Z0-9\s\_\.\/\=\+\-\@\:]+$
     */
    Value: string;
    /**
     * @minLength 1
     * @maxLength 127
     * @pattern ^(?!aws:.*)[a-zA-Z0-9\s\_\.\/\=\+\-\@\:]+$
     */
    Key: string;
  }[];
};
