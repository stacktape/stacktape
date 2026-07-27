// This file is auto-generated. Do not edit manually.
// Source: aws-databrew-job.json

/** Resource schema for AWS::DataBrew::Job. */
export type AwsDatabrewJob = {
  /**
   * Dataset name
   * @minLength 1
   * @maxLength 255
   */
  DatasetName?: string;
  /**
   * Encryption Key Arn
   * @minLength 20
   * @maxLength 2048
   */
  EncryptionKeyArn?: string;
  /**
   * Encryption mode
   * @enum ["SSE-KMS","SSE-S3"]
   */
  EncryptionMode?: "SSE-KMS" | "SSE-S3";
  /**
   * Job name
   * @minLength 1
   * @maxLength 255
   */
  Name: string;
  /**
   * Job type
   * @enum ["PROFILE","RECIPE"]
   */
  Type: "PROFILE" | "RECIPE";
  /**
   * Log subscription
   * @enum ["ENABLE","DISABLE"]
   */
  LogSubscription?: "ENABLE" | "DISABLE";
  /** Max capacity */
  MaxCapacity?: number;
  /** Max retries */
  MaxRetries?: number;
  Outputs?: ({
    /** @enum ["GZIP","LZ4","SNAPPY","BZIP2","DEFLATE","LZO","BROTLI","ZSTD","ZLIB"] */
    CompressionFormat?: "GZIP" | "LZ4" | "SNAPPY" | "BZIP2" | "DEFLATE" | "LZO" | "BROTLI" | "ZSTD" | "ZLIB";
    /** @enum ["CSV","JSON","PARQUET","GLUEPARQUET","AVRO","ORC","XML","TABLEAUHYPER"] */
    Format?: "CSV" | "JSON" | "PARQUET" | "GLUEPARQUET" | "AVRO" | "ORC" | "XML" | "TABLEAUHYPER";
    FormatOptions?: {
      Csv?: {
        /**
         * @minLength 1
         * @maxLength 1
         */
        Delimiter?: string;
      };
    };
    /** @uniqueItems true */
    PartitionColumns?: string[];
    Location: {
      Bucket: string;
      Key?: string;
      /**
       * @minLength 12
       * @maxLength 12
       */
      BucketOwner?: string;
    };
    Overwrite?: boolean;
    /**
     * @minimum 1
     * @maximum 999
     */
    MaxOutputFiles?: number;
  })[];
  DataCatalogOutputs?: {
    /**
     * @minLength 1
     * @maxLength 255
     */
    CatalogId?: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    DatabaseName: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    TableName: string;
    S3Options?: {
      Location: {
        Bucket: string;
        Key?: string;
        /**
         * @minLength 12
         * @maxLength 12
         */
        BucketOwner?: string;
      };
    };
    DatabaseOptions?: {
      TempDirectory?: {
        Bucket: string;
        Key?: string;
        /**
         * @minLength 12
         * @maxLength 12
         */
        BucketOwner?: string;
      };
      /**
       * @minLength 1
       * @maxLength 255
       */
      TableName: string;
    };
    Overwrite?: boolean;
  }[];
  DatabaseOutputs?: {
    /** Glue connection name */
    GlueConnectionName: string;
    /**
     * Database table name
     * @enum ["NEW_TABLE"]
     */
    DatabaseOutputMode?: "NEW_TABLE";
    DatabaseOptions: {
      TempDirectory?: {
        Bucket: string;
        Key?: string;
        /**
         * @minLength 12
         * @maxLength 12
         */
        BucketOwner?: string;
      };
      /**
       * @minLength 1
       * @maxLength 255
       */
      TableName: string;
    };
  }[];
  /** Output location */
  OutputLocation?: {
    Bucket: string;
    Key?: string;
    /**
     * @minLength 12
     * @maxLength 12
     */
    BucketOwner?: string;
  };
  /**
   * Project name
   * @minLength 1
   * @maxLength 255
   */
  ProjectName?: string;
  Recipe?: {
    /** Recipe name */
    Name: string;
    /** Recipe version */
    Version?: string;
  };
  /** Role arn */
  RoleArn: string;
  /** @uniqueItems false */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** Timeout */
  Timeout?: number;
  /** Job Sample */
  JobSample?: {
    Mode?: "FULL_DATASET" | "CUSTOM_ROWS";
    Size?: number;
  };
  /** Profile Job configuration */
  ProfileConfiguration?: {
    DatasetStatisticsConfiguration?: {
      /** @minItems 1 */
      IncludedStatistics?: string[];
      /** @minItems 1 */
      Overrides?: {
        Statistic: string;
        Parameters: Record<string, string>;
      }[];
    };
    /** @minItems 1 */
    ProfileColumns?: {
      /**
       * @minLength 1
       * @maxLength 255
       */
      Regex?: string;
      /**
       * @minLength 1
       * @maxLength 255
       */
      Name?: string;
    }[];
    /** @minItems 1 */
    ColumnStatisticsConfigurations?: {
      /** @minItems 1 */
      Selectors?: {
        /**
         * @minLength 1
         * @maxLength 255
         */
        Regex?: string;
        /**
         * @minLength 1
         * @maxLength 255
         */
        Name?: string;
      }[];
      Statistics: {
        /** @minItems 1 */
        IncludedStatistics?: string[];
        /** @minItems 1 */
        Overrides?: {
          Statistic: string;
          Parameters: Record<string, string>;
        }[];
      };
    }[];
    EntityDetectorConfiguration?: {
      /** @minItems 1 */
      EntityTypes: string[];
      AllowedStatistics?: {
        /** @minItems 1 */
        Statistics: string[];
      };
    };
  };
  /** Data quality rules configuration */
  ValidationConfigurations?: {
    /**
     * Arn of the Ruleset
     * @minLength 20
     * @maxLength 2048
     */
    RulesetArn: string;
    ValidationMode?: "CHECK_ALL";
  }[];
};
