// This file is auto-generated. Do not edit manually.
// Source: aws-kinesisanalyticsv2-application.json

/**
 * Creates an Amazon Kinesis Data Analytics application. For information about creating a Kinesis Data
 * Analytics application, see [Creating an
 * Application](https://docs.aws.amazon.com/kinesisanalytics/latest/java/getting-started.html).
 */
export type AwsKinesisanalyticsv2Application = {
  /** Use this parameter to configure the application. */
  ApplicationConfiguration?: {
    /** The code location and type parameters for a Flink-based Kinesis Data Analytics application. */
    ApplicationCodeConfiguration?: {
      /** The location and type of the application code. */
      CodeContent: {
        /** The zip-format code for a Flink-based Kinesis Data Analytics application. */
        ZipFileContent?: string;
        /** Information about the Amazon S3 bucket that contains the application code. */
        S3ContentLocation?: {
          /** The Amazon Resource Name (ARN) for the S3 bucket containing the application code. */
          BucketARN: string;
          /**
           * The file key for the object containing the application code.
           * @minLength 1
           * @maxLength 1024
           */
          FileKey: string;
          /**
           * The version of the object containing the application code.
           * @minLength 1
           * @maxLength 1024
           */
          ObjectVersion?: string;
        };
        /**
         * The text-format code for a Flink-based Kinesis Data Analytics application.
         * @minLength 1
         * @maxLength 102400
         */
        TextContent?: string;
      };
      /**
       * Specifies whether the code content is in text or zip format.
       * @enum ["PLAINTEXT","ZIPFILE"]
       */
      CodeContentType: "PLAINTEXT" | "ZIPFILE";
    };
    /** Describes whether customer managed key is enabled and key details for customer data encryption */
    ApplicationEncryptionConfiguration?: {
      /**
       * KMS KeyId. Can be either key uuid or full key arn or key alias arn or short key alias
       * @minLength 1
       * @maxLength 2048
       * @pattern ^(?:arn:.*:kms:.*:.*:(?:key\/.*|alias\/.*)|alias\/.*|(?i)[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$
       */
      KeyId?: string;
      /**
       * Specifies whether application data is encrypted using service key: AWS_OWNED_KEY or customer key:
       * CUSTOMER_MANAGED_KEY
       * @enum ["AWS_OWNED_KEY","CUSTOMER_MANAGED_KEY"]
       */
      KeyType: "AWS_OWNED_KEY" | "CUSTOMER_MANAGED_KEY";
    };
    /** Describes whether snapshots are enabled for a Flink-based Kinesis Data Analytics application. */
    ApplicationSnapshotConfiguration?: {
      /** Describes whether snapshots are enabled for a Flink-based Kinesis Data Analytics application. */
      SnapshotsEnabled: boolean;
    };
    /**
     * Describes whether system initiated rollbacks are enabled for a Flink-based Kinesis Data Analytics
     * application.
     */
    ApplicationSystemRollbackConfiguration?: {
      /**
       * Describes whether system initiated rollbacks are enabled for a Flink-based Kinesis Data Analytics
       * application.
       */
      RollbackEnabled: boolean;
    };
    /** Describes execution properties for a Flink-based Kinesis Data Analytics application. */
    EnvironmentProperties?: {
      /**
       * Describes the execution property groups.
       * @maxItems 50
       * @uniqueItems false
       */
      PropertyGroups?: {
        /**
         * Describes the key of an application execution property key-value pair.
         * @minLength 1
         * @maxLength 50
         * @pattern ^[a-zA-Z0-9_.-]+$
         */
        PropertyGroupId?: string;
        /** Describes the value of an application execution property key-value pair. */
        PropertyMap?: Record<string, string>;
      }[];
    };
    /** The creation and update parameters for a Flink-based Kinesis Data Analytics application. */
    FlinkApplicationConfiguration?: {
      /**
       * Describes an application's checkpointing configuration. Checkpointing is the process of persisting
       * application state for fault tolerance. For more information, see Checkpoints for Fault Tolerance in
       * the Apache Flink Documentation.
       */
      CheckpointConfiguration?: {
        /**
         * Describes whether the application uses Kinesis Data Analytics' default checkpointing behavior. You
         * must set this property to `CUSTOM` in order to set the `CheckpointingEnabled`,
         * `CheckpointInterval`, or `MinPauseBetweenCheckpoints` parameters.
         * @enum ["DEFAULT","CUSTOM"]
         */
        ConfigurationType: "DEFAULT" | "CUSTOM";
        /** Describes whether checkpointing is enabled for a Flink-based Kinesis Data Analytics application. */
        CheckpointingEnabled?: boolean;
        /**
         * Describes the interval in milliseconds between checkpoint operations.
         * @minimum 1
         * @maximum 9223372036854776000
         */
        CheckpointInterval?: number;
        /**
         * Describes the minimum time in milliseconds after a checkpoint operation completes that a new
         * checkpoint operation can start. If a checkpoint operation takes longer than the CheckpointInterval,
         * the application otherwise performs continual checkpoint operations. For more information, see
         * Tuning Checkpointing in the Apache Flink Documentation.
         * @minimum 0
         * @maximum 9223372036854776000
         */
        MinPauseBetweenCheckpoints?: number;
      };
      /** Describes configuration parameters for Amazon CloudWatch logging for an application. */
      MonitoringConfiguration?: {
        /**
         * Describes whether to use the default CloudWatch logging configuration for an application. You must
         * set this property to CUSTOM in order to set the LogLevel or MetricsLevel parameters.
         * @enum ["DEFAULT","CUSTOM"]
         */
        ConfigurationType: "DEFAULT" | "CUSTOM";
        /**
         * Describes the granularity of the CloudWatch Logs for an application. The Parallelism level is not
         * recommended for applications with a Parallelism over 64 due to excessive costs.
         * @enum ["APPLICATION","OPERATOR","PARALLELISM","TASK"]
         */
        MetricsLevel?: "APPLICATION" | "OPERATOR" | "PARALLELISM" | "TASK";
        /**
         * Describes the verbosity of the CloudWatch Logs for an application.
         * @enum ["DEBUG","INFO","WARN","ERROR"]
         */
        LogLevel?: "DEBUG" | "INFO" | "WARN" | "ERROR";
      };
      /** Describes parameters for how an application executes multiple tasks simultaneously. */
      ParallelismConfiguration?: {
        /**
         * Describes whether the application uses the default parallelism for the Kinesis Data Analytics
         * service. You must set this property to `CUSTOM` in order to change your application's
         * `AutoScalingEnabled`, `Parallelism`, or `ParallelismPerKPU` properties.
         * @enum ["CUSTOM","DEFAULT"]
         */
        ConfigurationType: "CUSTOM" | "DEFAULT";
        /**
         * Describes the number of parallel tasks that a Java-based Kinesis Data Analytics application can
         * perform per Kinesis Processing Unit (KPU) used by the application. For more information about KPUs,
         * see Amazon Kinesis Data Analytics Pricing.
         * @minimum 1
         */
        ParallelismPerKPU?: number;
        /**
         * Describes the initial number of parallel tasks that a Java-based Kinesis Data Analytics application
         * can perform. The Kinesis Data Analytics service can increase this number automatically if
         * ParallelismConfiguration:AutoScalingEnabled is set to true.
         * @minimum 1
         */
        Parallelism?: number;
        /**
         * Describes whether the Kinesis Data Analytics service can increase the parallelism of the
         * application in response to increased throughput.
         */
        AutoScalingEnabled?: boolean;
      };
    };
    /** The creation and update parameters for a SQL-based Kinesis Data Analytics application. */
    SqlApplicationConfiguration?: {
      /**
       * The array of Input objects describing the input streams used by the application.
       * @maxItems 1
       * @uniqueItems false
       */
      Inputs?: ({
        /**
         * The name prefix to use when creating an in-application stream. Suppose that you specify a prefix
         * `"MyInApplicationStream"`. Kinesis Data Analytics then creates one or more (as per the
         * InputParallelism count you specified) in-application streams with the names
         * `"MyInApplicationStream_001"`, `"MyInApplicationStream_002"`, and so on.
         * @minLength 1
         * @maxLength 32
         * @pattern ^[^-\s<>&]*$
         */
        NamePrefix: string;
        /**
         * Describes the format of the data in the streaming source, and how each data element maps to
         * corresponding columns in the in-application stream that is being created.
         */
        InputSchema: {
          /**
           * Specifies the encoding of the records in the streaming source. For example, UTF-8.
           * @enum ["UTF-8"]
           */
          RecordEncoding?: "UTF-8";
          /**
           * A list of `RecordColumn` objects.
           * @maxItems 1000
           * @uniqueItems false
           */
          RecordColumns: {
            /**
             * A reference to the data element in the streaming input or the reference data source.
             * @minLength 1
             * @maxLength 65535
             */
            Mapping?: string;
            /**
             * The name of the column that is created in the in-application input stream or reference table.
             * @minLength 1
             * @maxLength 256
             * @pattern ^[^-\s<>&]*$
             */
            Name: string;
            /**
             * The type of column created in the in-application input stream or reference table.
             * @minLength 1
             * @maxLength 100
             */
            SqlType: string;
          }[];
          /** Specifies the format of the records on the streaming source. */
          RecordFormat: {
            /**
             * The type of record format.
             * @enum ["CSV","JSON"]
             */
            RecordFormatType: "CSV" | "JSON";
            /**
             * When you configure application input at the time of creating or updating an application, provides
             * additional mapping information specific to the record format (such as JSON, CSV, or record fields
             * delimited by some delimiter) on the streaming source.
             */
            MappingParameters?: {
              /** Provides additional mapping information when the record format uses delimiters (for example, CSV). */
              CSVMappingParameters?: {
                /**
                 * The column delimiter. For example, in a CSV format, a comma (",") is the typical column delimiter.
                 * @minLength 1
                 * @maxLength 1024
                 */
                RecordColumnDelimiter: string;
                /**
                 * The row delimiter. For example, in a CSV format, '\n' is the typical row delimiter.
                 * @minLength 1
                 * @maxLength 1024
                 */
                RecordRowDelimiter: string;
              };
              /** Provides additional mapping information when JSON is the record format on the streaming source. */
              JSONMappingParameters?: {
                /**
                 * The path to the top-level parent that contains the records.
                 * @minLength 1
                 * @maxLength 65535
                 * @pattern ^(?=^\$)(?=^\S+$).*$
                 */
                RecordRowPath: string;
              };
            };
          };
        };
        /**
         * If the streaming source is an Amazon Kinesis data stream, identifies the stream's Amazon Resource
         * Name (ARN).
         */
        KinesisStreamsInput?: {
          /** The ARN of the input Kinesis data stream to read. */
          ResourceARN: string;
        };
        /**
         * If the streaming source is an Amazon Kinesis Data Firehose delivery stream, identifies the delivery
         * stream's ARN.
         */
        KinesisFirehoseInput?: {
          /** The Amazon Resource Name (ARN) of the delivery stream. */
          ResourceARN: string;
        };
        /**
         * The InputProcessingConfiguration for the input. An input processor transforms records as they are
         * received from the stream, before the application's SQL code executes. Currently, the only input
         * processing configuration available is InputLambdaProcessor.
         */
        InputProcessingConfiguration?: {
          /**
           * The InputLambdaProcessor that is used to preprocess the records in the stream before being
           * processed by your application code.
           */
          InputLambdaProcessor?: {
            /** The ARN of the Amazon Lambda function that operates on records in the stream. */
            ResourceARN: string;
          };
        };
        /** Describes the number of in-application streams to create. */
        InputParallelism?: {
          /**
           * The number of in-application streams to create.
           * @minimum 1
           * @maximum 64
           */
          Count?: number;
        };
      })[];
    };
    /** The configuration parameters for a Kinesis Data Analytics Studio notebook. */
    ZeppelinApplicationConfiguration?: {
      /** The Amazon Glue Data Catalog that you use in queries in a Kinesis Data Analytics Studio notebook. */
      CatalogConfiguration?: {
        /**
         * The configuration parameters for the default Amazon Glue database. You use this database for Apache
         * Flink SQL queries and table API transforms that you write in a Kinesis Data Analytics Studio
         * notebook.
         */
        GlueDataCatalogConfiguration?: {
          /** The Amazon Resource Name (ARN) of the database. */
          DatabaseARN?: string;
        };
      };
      /** The monitoring configuration of a Kinesis Data Analytics Studio notebook. */
      MonitoringConfiguration?: {
        /**
         * The verbosity of the CloudWatch Logs for an application. You can set it to `INFO`, `WARN`, `ERROR`,
         * or `DEBUG`.
         * @enum ["DEBUG","INFO","WARN","ERROR"]
         */
        LogLevel?: "DEBUG" | "INFO" | "WARN" | "ERROR";
      };
      /**
       * The information required to deploy a Kinesis Data Analytics Studio notebook as an application with
       * durable state.
       */
      DeployAsApplicationConfiguration?: {
        /**
         * The description of an Amazon S3 object that contains the Amazon Data Analytics application,
         * including the Amazon Resource Name (ARN) of the S3 bucket, the name of the Amazon S3 object that
         * contains the data, and the version number of the Amazon S3 object that contains the data.
         */
        S3ContentLocation: {
          /** The Amazon Resource Name (ARN) of the S3 bucket. */
          BucketARN: string;
          /**
           * The base path for the S3 bucket.
           * @minLength 1
           * @maxLength 1024
           * @pattern ^[a-zA-Z0-9/!-_.*'()]+$
           */
          BasePath?: string;
        };
      };
      /** A list of CustomArtifactConfiguration objects. */
      CustomArtifactsConfiguration?: ({
        /**
         * Set this to either `UDF` or `DEPENDENCY_JAR`. `UDF` stands for user-defined functions. This type of
         * artifact must be in an S3 bucket. A `DEPENDENCY_JAR` can be in either Maven or an S3 bucket.
         * @enum ["DEPENDENCY_JAR","UDF"]
         */
        ArtifactType: "DEPENDENCY_JAR" | "UDF";
        /** The parameters required to fully specify a Maven reference. */
        MavenReference?: {
          /**
           * The artifact ID of the Maven reference.
           * @minLength 1
           * @maxLength 256
           * @pattern ^[a-zA-Z0-9_.-]+$
           */
          ArtifactId: string;
          /**
           * The group ID of the Maven reference.
           * @minLength 1
           * @maxLength 256
           * @pattern ^[a-zA-Z0-9_.-]+$
           */
          GroupId: string;
          /**
           * The version of the Maven reference.
           * @minLength 1
           * @maxLength 256
           * @pattern ^[a-zA-Z0-9_.-]+$
           */
          Version: string;
        };
        /** The location of the custom artifacts. */
        S3ContentLocation?: {
          /** The Amazon Resource Name (ARN) for the S3 bucket containing the application code. */
          BucketARN: string;
          /**
           * The file key for the object containing the application code.
           * @minLength 1
           * @maxLength 1024
           */
          FileKey: string;
          /**
           * The version of the object containing the application code.
           * @minLength 1
           * @maxLength 1024
           */
          ObjectVersion?: string;
        };
      })[];
    };
    /** The array of descriptions of VPC configurations available to the application. */
    VpcConfigurations?: {
      /**
       * The array of SecurityGroup IDs used by the VPC configuration.
       * @minItems 1
       * @maxItems 5
       * @uniqueItems false
       */
      SecurityGroupIds: string[];
      /**
       * The array of Subnet IDs used by the VPC configuration.
       * @minItems 1
       * @maxItems 16
       * @uniqueItems false
       */
      SubnetIds: string[];
    }[];
  };
  /**
   * The description of the application.
   * @default ""
   * @minLength 0
   * @maxLength 1024
   */
  ApplicationDescription?: string;
  /**
   * To create a Kinesis Data Analytics Studio notebook, you must set the mode to `INTERACTIVE`.
   * However, for a Kinesis Data Analytics for Apache Flink application, the mode is optional.
   * @enum ["INTERACTIVE","STREAMING"]
   */
  ApplicationMode?: "INTERACTIVE" | "STREAMING";
  /**
   * The name of the application.
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9_.-]+$
   */
  ApplicationName?: string;
  /** The runtime environment for the application. */
  RuntimeEnvironment: string;
  /** Specifies the IAM role that the application uses to access external resources. */
  ServiceExecutionRole: string;
  /**
   * Specifies run configuration (start parameters) of a Kinesis Data Analytics application. Evaluated
   * on update for RUNNING applications an only.
   */
  RunConfiguration?: {
    /** Describes the restore behavior of a restarting application. */
    ApplicationRestoreConfiguration?: {
      /**
       * Specifies how the application should be restored.
       * @enum ["SKIP_RESTORE_FROM_SNAPSHOT","RESTORE_FROM_LATEST_SNAPSHOT","RESTORE_FROM_CUSTOM_SNAPSHOT"]
       */
      ApplicationRestoreType: "SKIP_RESTORE_FROM_SNAPSHOT" | "RESTORE_FROM_LATEST_SNAPSHOT" | "RESTORE_FROM_CUSTOM_SNAPSHOT";
      /**
       * The identifier of an existing snapshot of application state to use to restart an application. The
       * application uses this value if RESTORE_FROM_CUSTOM_SNAPSHOT is specified for the
       * ApplicationRestoreType.
       * @minLength 1
       * @maxLength 256
       * @pattern ^[a-zA-Z0-9_.-]+$
       */
      SnapshotName?: string;
    };
    /** Describes the starting parameters for a Flink-based Kinesis Data Analytics application. */
    FlinkRunConfiguration?: {
      /**
       * When restoring from a snapshot, specifies whether the runtime is allowed to skip a state that
       * cannot be mapped to the new program. Defaults to false. If you update your application without
       * specifying this parameter, AllowNonRestoredState will be set to false, even if it was previously
       * set to true.
       */
      AllowNonRestoredState?: boolean;
    };
  };
  /** Used to configure start of maintenance window. */
  ApplicationMaintenanceConfiguration?: {
    /**
     * The start time for the maintenance window.
     * @pattern ^([01][0-9]|2[0-3]):[0-5][0-9]$
     */
    ApplicationMaintenanceWindowStartTime: string;
  };
  /**
   * A list of one or more tags to assign to the application. A tag is a key-value pair that identifies
   * an application. Note that the maximum number of application tags includes system tags. The maximum
   * number of user-defined application tags is 50.
   * @minItems 1
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that's 1 to 128 Unicode characters in length and
     * can't be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that's 0 to 256 characters in length.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
