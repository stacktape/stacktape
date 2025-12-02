// This file is auto-generated. Do not edit manually.
// Source: aws-athena-workgroup.json

/** Resource schema for AWS::Athena::WorkGroup */
export type AwsAthenaWorkgroup = {
  /**
   * The workGroup name.
   * @pattern [a-zA-Z0-9._-]{1,128}
   */
  Name: string;
  /**
   * The workgroup description.
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  /** One or more tags, separated by commas, that you want to attach to the workgroup as you create it */
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
  /** The workgroup configuration */
  WorkGroupConfiguration?: {
    BytesScannedCutoffPerQuery?: number;
    EnforceWorkGroupConfiguration?: boolean;
    PublishCloudWatchMetricsEnabled?: boolean;
    RequesterPaysEnabled?: boolean;
    ResultConfiguration?: {
      EncryptionConfiguration?: {
        EncryptionOption: "SSE_S3" | "SSE_KMS" | "CSE_KMS";
        KmsKey?: string;
      };
      OutputLocation?: string;
      ExpectedBucketOwner?: string;
      AclConfiguration?: {
        S3AclOption: "BUCKET_OWNER_FULL_CONTROL";
      };
    };
    EngineVersion?: {
      SelectedEngineVersion?: string;
      EffectiveEngineVersion?: string;
    };
    AdditionalConfiguration?: string;
    ExecutionRole?: string;
    CustomerContentEncryptionConfiguration?: {
      KmsKey: string;
    };
    ManagedQueryResultsConfiguration?: {
      EncryptionConfiguration?: {
        KmsKey?: string;
      };
      Enabled?: boolean;
    };
    EngineConfiguration?: {
      /**
       * The number of DPUs to use for the coordinator. A coordinator is a special executor that
       * orchestrates processing work and manages other executors in a notebook session. The default is 1.
       */
      CoordinatorDpuSize?: number;
      /** The maximum number of DPUs that can run concurrently. */
      MaxConcurrentDpus?: number;
      /**
       * The default number of DPUs to use for executors. An executor is the smallest unit of compute that a
       * notebook session can request from Athena. The default is 1.
       */
      DefaultExecutorDpuSize?: number;
      /**
       * Contains additional notebook engine MAP<string, string> parameter mappings in the form of key-value
       * pairs. To specify an Athena notebook that the Jupyter server will download and serve, specify a
       * value for the StartSessionRequest$NotebookVersion field, and then add a key named NotebookId to
       * AdditionalConfigs that has the value of the Athena notebook ID.
       */
      AdditionalConfigs?: Record<string, string>;
      /**
       * Specifies custom jar files and Spark properties for use cases like cluster encryption, table
       * formats, and general Spark tuning.
       */
      SparkProperties?: Record<string, string>;
      /** The configuration classifications that can be specified for the engine. */
      Classifications?: {
        /** The name of the configuration classification. */
        Name?: string;
        /** A set of properties specified within a configuration classification. */
        Properties?: Record<string, string>;
      }[];
    };
    MonitoringConfiguration?: {
      CloudWatchLoggingConfiguration?: {
        /** Enables CloudWatch logging. */
        Enabled?: boolean;
        /** The name of the log group in Amazon CloudWatch Logs where you want to publish your logs. */
        LogGroup?: string;
        /** Prefix for the CloudWatch log stream name. */
        LogStreamNamePrefix?: string;
        /** The types of logs that you want to publish to CloudWatch. */
        LogTypes?: Record<string, string[]>;
      };
      ManagedLoggingConfiguration?: {
        /** Enables managed log persistence. */
        Enabled?: boolean;
        /** The KMS key ARN to encrypt the logs stored in managed log persistence. */
        KmsKey?: string;
      };
      S3LoggingConfiguration?: {
        /** Enables S3 log delivery. */
        Enabled?: boolean;
        /** The Amazon S3 destination URI for log publishing. */
        LogLocation?: string;
        /** The KMS key ARN to encrypt the logs published to the given Amazon S3 destination. */
        KmsKey?: string;
      };
    };
  };
  /** The workgroup configuration update object */
  WorkGroupConfigurationUpdates?: {
    BytesScannedCutoffPerQuery?: number;
    EnforceWorkGroupConfiguration?: boolean;
    PublishCloudWatchMetricsEnabled?: boolean;
    RequesterPaysEnabled?: boolean;
    ResultConfigurationUpdates?: {
      EncryptionConfiguration?: {
        EncryptionOption: "SSE_S3" | "SSE_KMS" | "CSE_KMS";
        KmsKey?: string;
      };
      OutputLocation?: string;
      ExpectedBucketOwner?: string;
      AclConfiguration?: {
        S3AclOption: "BUCKET_OWNER_FULL_CONTROL";
      };
      RemoveEncryptionConfiguration?: boolean;
      RemoveOutputLocation?: boolean;
      RemoveExpectedBucketOwner?: boolean;
      RemoveAclConfiguration?: boolean;
    };
    RemoveBytesScannedCutoffPerQuery?: boolean;
    EngineVersion?: {
      SelectedEngineVersion?: string;
      EffectiveEngineVersion?: string;
    };
    AdditionalConfiguration?: string;
    ExecutionRole?: string;
    CustomerContentEncryptionConfiguration?: {
      KmsKey: string;
    };
    RemoveCustomerContentEncryptionConfiguration?: boolean;
    ManagedQueryResultsConfiguration?: {
      EncryptionConfiguration?: {
        KmsKey?: string;
      };
      Enabled?: boolean;
    };
    EngineConfiguration?: {
      /**
       * The number of DPUs to use for the coordinator. A coordinator is a special executor that
       * orchestrates processing work and manages other executors in a notebook session. The default is 1.
       */
      CoordinatorDpuSize?: number;
      /** The maximum number of DPUs that can run concurrently. */
      MaxConcurrentDpus?: number;
      /**
       * The default number of DPUs to use for executors. An executor is the smallest unit of compute that a
       * notebook session can request from Athena. The default is 1.
       */
      DefaultExecutorDpuSize?: number;
      /**
       * Contains additional notebook engine MAP<string, string> parameter mappings in the form of key-value
       * pairs. To specify an Athena notebook that the Jupyter server will download and serve, specify a
       * value for the StartSessionRequest$NotebookVersion field, and then add a key named NotebookId to
       * AdditionalConfigs that has the value of the Athena notebook ID.
       */
      AdditionalConfigs?: Record<string, string>;
      /**
       * Specifies custom jar files and Spark properties for use cases like cluster encryption, table
       * formats, and general Spark tuning.
       */
      SparkProperties?: Record<string, string>;
      /** The configuration classifications that can be specified for the engine. */
      Classifications?: {
        /** The name of the configuration classification. */
        Name?: string;
        /** A set of properties specified within a configuration classification. */
        Properties?: Record<string, string>;
      }[];
    };
    MonitoringConfiguration?: {
      CloudWatchLoggingConfiguration?: {
        /** Enables CloudWatch logging. */
        Enabled?: boolean;
        /** The name of the log group in Amazon CloudWatch Logs where you want to publish your logs. */
        LogGroup?: string;
        /** Prefix for the CloudWatch log stream name. */
        LogStreamNamePrefix?: string;
        /** The types of logs that you want to publish to CloudWatch. */
        LogTypes?: Record<string, string[]>;
      };
      ManagedLoggingConfiguration?: {
        /** Enables managed log persistence. */
        Enabled?: boolean;
        /** The KMS key ARN to encrypt the logs stored in managed log persistence. */
        KmsKey?: string;
      };
      S3LoggingConfiguration?: {
        /** Enables S3 log delivery. */
        Enabled?: boolean;
        /** The Amazon S3 destination URI for log publishing. */
        LogLocation?: string;
        /** The KMS key ARN to encrypt the logs published to the given Amazon S3 destination. */
        KmsKey?: string;
      };
    };
  };
  /** The date and time the workgroup was created. */
  CreationTime?: string;
  /**
   * The state of the workgroup: ENABLED or DISABLED.
   * @enum ["ENABLED","DISABLED"]
   */
  State?: "ENABLED" | "DISABLED";
  /**
   * The option to delete the workgroup and its contents even if the workgroup contains any named
   * queries.
   */
  RecursiveDeleteOption?: boolean;
};
