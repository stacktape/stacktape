// This file is auto-generated. Do not edit manually.
// Source: aws-appflow-flow.json

/** Resource schema for AWS::AppFlow::Flow. */
export type AwsAppflowFlow = {
  /**
   * ARN identifier of the flow.
   * @maxLength 512
   * @pattern arn:aws:appflow:.*:[0-9]+:.*
   */
  FlowArn?: string;
  /**
   * Name of the flow.
   * @minLength 1
   * @maxLength 256
   * @pattern [a-zA-Z0-9][\w!@#.-]+
   */
  FlowName: string;
  /**
   * Description of the flow.
   * @maxLength 2048
   * @pattern [\w!@#\-.?,\s]*
   */
  Description?: string;
  /**
   * The ARN of the AWS Key Management Service (AWS KMS) key that's used to encrypt your function's
   * environment variables. If it's not provided, AWS Lambda uses a default service key.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:aws:kms:.*:[0-9]+:.*
   */
  KMSArn?: string;
  /** Trigger settings of the flow. */
  TriggerConfig: {
    /** Trigger type of the flow */
    TriggerType: "Scheduled" | "Event" | "OnDemand";
    /** Details required based on the type of trigger */
    TriggerProperties?: {
      /**
       * @minLength 1
       * @maxLength 256
       */
      ScheduleExpression: string;
      /** @enum ["Incremental","Complete"] */
      DataPullMode?: "Incremental" | "Complete";
      ScheduleStartTime?: number;
      ScheduleEndTime?: number;
      FirstExecutionFrom?: number;
      /** @maxLength 256 */
      TimeZone?: string;
      /**
       * @minimum 0
       * @maximum 36000
       */
      ScheduleOffset?: number;
      /**
       * @minimum 1
       * @maximum 100
       */
      FlowErrorDeactivationThreshold?: number;
    };
  };
  /**
   * Flow activation status for Scheduled- and Event-triggered flows
   * @enum ["Active","Suspended","Draft"]
   */
  FlowStatus?: "Active" | "Suspended" | "Draft";
  /** Configurations of Source connector of the flow. */
  SourceFlowConfig: {
    /** Type of source connector */
    ConnectorType: "SAPOData" | "Salesforce" | "Pardot" | "Singular" | "Slack" | "Redshift" | "S3" | "Marketo" | "Googleanalytics" | "Zendesk" | "Servicenow" | "Datadog" | "Trendmicro" | "Snowflake" | "Dynatrace" | "Infornexus" | "Amplitude" | "Veeva" | "CustomConnector" | "EventBridge" | "Upsolver" | "LookoutMetrics";
    /** The API version that the destination connector uses. */
    ApiVersion?: string;
    /** Name of source connector profile */
    ConnectorProfileName?: string;
    /** Source connector details required to query a connector */
    SourceConnectorProperties: {
      Amplitude?: {
        Object: string;
      };
      Datadog?: {
        Object: string;
      };
      Dynatrace?: {
        Object: string;
      };
      GoogleAnalytics?: {
        Object: string;
      };
      InforNexus?: {
        Object: string;
      };
      Marketo?: {
        Object: string;
      };
      S3?: {
        BucketName: string;
        BucketPrefix: string;
        S3InputFormatConfig?: {
          /** @enum ["CSV","JSON"] */
          S3InputFileType?: "CSV" | "JSON";
        };
      };
      SAPOData?: {
        ObjectPath: string;
        parallelismConfig?: {
          maxParallelism: number;
        };
        paginationConfig?: {
          maxPageSize: number;
        };
      };
      Salesforce?: {
        Object: string;
        EnableDynamicFieldUpdate?: boolean;
        IncludeDeletedRecords?: boolean;
        DataTransferApi?: "AUTOMATIC" | "BULKV2" | "REST_SYNC";
      };
      Pardot?: {
        Object: string;
      };
      ServiceNow?: {
        Object: string;
      };
      Singular?: {
        Object: string;
      };
      Slack?: {
        Object: string;
      };
      Trendmicro?: {
        Object: string;
      };
      Veeva?: {
        Object: string;
        DocumentType?: string;
        IncludeSourceFiles?: boolean;
        IncludeRenditions?: boolean;
        IncludeAllVersions?: boolean;
      };
      Zendesk?: {
        Object: string;
      };
      CustomConnector?: {
        EntityName: string;
        CustomProperties?: Record<string, string>;
        DataTransferApi?: {
          /**
           * @maxLength 64
           * @pattern [\w/-]+
           */
          Name: string;
          /** @enum ["SYNC","ASYNC","AUTOMATIC"] */
          Type: "SYNC" | "ASYNC" | "AUTOMATIC";
        };
      };
    };
    /** Configuration for scheduled incremental data pull */
    IncrementalPullConfig?: {
      DatetimeTypeFieldName?: string;
    };
  };
  /** List of Destination connectors of the flow. */
  DestinationFlowConfigList: ({
    /** Destination connector type */
    ConnectorType: "SAPOData" | "Salesforce" | "Pardot" | "Singular" | "Slack" | "Redshift" | "S3" | "Marketo" | "Googleanalytics" | "Zendesk" | "Servicenow" | "Datadog" | "Trendmicro" | "Snowflake" | "Dynatrace" | "Infornexus" | "Amplitude" | "Veeva" | "CustomConnector" | "EventBridge" | "Upsolver" | "LookoutMetrics";
    /** The API version that the destination connector uses. */
    ApiVersion?: string;
    /** Name of destination connector profile */
    ConnectorProfileName?: string;
    /** Destination connector details */
    DestinationConnectorProperties: {
      Redshift?: {
        Object: string;
        IntermediateBucketName: string;
        BucketPrefix?: string;
        ErrorHandlingConfig?: {
          FailOnFirstError?: boolean;
          BucketPrefix?: string;
          BucketName?: string;
        };
      };
      S3?: {
        BucketName: string;
        BucketPrefix?: string;
        S3OutputFormatConfig?: {
          FileType?: "CSV" | "JSON" | "PARQUET";
          PrefixConfig?: {
            PrefixType?: "FILENAME" | "PATH" | "PATH_AND_FILENAME";
            PrefixFormat?: "YEAR" | "MONTH" | "DAY" | "HOUR" | "MINUTE";
            PathPrefixHierarchy?: ("EXECUTION_ID" | "SCHEMA_VERSION")[];
          };
          AggregationConfig?: {
            AggregationType?: "None" | "SingleFile";
            TargetFileSize?: number;
          };
          PreserveSourceDataTyping?: boolean;
        };
      };
      Salesforce?: {
        Object: string;
        ErrorHandlingConfig?: {
          FailOnFirstError?: boolean;
          BucketPrefix?: string;
          BucketName?: string;
        };
        /** List of fields used as ID when performing a write operation. */
        IdFieldNames?: string[];
        WriteOperationType?: "INSERT" | "UPSERT" | "UPDATE" | "DELETE";
        DataTransferApi?: "AUTOMATIC" | "BULKV2" | "REST_SYNC";
      };
      Snowflake?: {
        Object: string;
        IntermediateBucketName: string;
        BucketPrefix?: string;
        ErrorHandlingConfig?: {
          FailOnFirstError?: boolean;
          BucketPrefix?: string;
          BucketName?: string;
        };
      };
      EventBridge?: {
        Object: string;
        ErrorHandlingConfig?: {
          FailOnFirstError?: boolean;
          BucketPrefix?: string;
          BucketName?: string;
        };
      };
      Upsolver?: {
        BucketName: string;
        BucketPrefix?: string;
        S3OutputFormatConfig: {
          FileType?: "CSV" | "JSON" | "PARQUET";
          PrefixConfig: {
            PrefixType?: "FILENAME" | "PATH" | "PATH_AND_FILENAME";
            PrefixFormat?: "YEAR" | "MONTH" | "DAY" | "HOUR" | "MINUTE";
            PathPrefixHierarchy?: ("EXECUTION_ID" | "SCHEMA_VERSION")[];
          };
          AggregationConfig?: {
            AggregationType?: "None" | "SingleFile";
            TargetFileSize?: number;
          };
        };
      };
      LookoutMetrics?: {
        Object?: string;
      };
      Marketo?: {
        Object: string;
        ErrorHandlingConfig?: {
          FailOnFirstError?: boolean;
          BucketPrefix?: string;
          BucketName?: string;
        };
      };
      Zendesk?: {
        Object: string;
        ErrorHandlingConfig?: {
          FailOnFirstError?: boolean;
          BucketPrefix?: string;
          BucketName?: string;
        };
        /** List of fields used as ID when performing a write operation. */
        IdFieldNames?: string[];
        WriteOperationType?: "INSERT" | "UPSERT" | "UPDATE" | "DELETE";
      };
      CustomConnector?: {
        EntityName: string;
        ErrorHandlingConfig?: {
          FailOnFirstError?: boolean;
          BucketPrefix?: string;
          BucketName?: string;
        };
        WriteOperationType?: "INSERT" | "UPSERT" | "UPDATE" | "DELETE";
        /** List of fields used as ID when performing a write operation. */
        IdFieldNames?: string[];
        CustomProperties?: Record<string, string>;
      };
      SAPOData?: {
        ObjectPath: string;
        ErrorHandlingConfig?: {
          FailOnFirstError?: boolean;
          BucketPrefix?: string;
          BucketName?: string;
        };
        SuccessResponseHandlingConfig?: {
          BucketPrefix?: string;
          BucketName?: string;
        };
        /** List of fields used as ID when performing a write operation. */
        IdFieldNames?: string[];
        WriteOperationType?: "INSERT" | "UPSERT" | "UPDATE" | "DELETE";
      };
    };
  })[];
  /** List of tasks for the flow. */
  Tasks: ({
    /** Source fields on which particular task will be applied */
    SourceFields: string[];
    /** Operation to be performed on provided source fields */
    ConnectorOperator?: {
      Amplitude?: "BETWEEN";
      Datadog?: "PROJECTION" | "BETWEEN" | "EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      Dynatrace?: "PROJECTION" | "BETWEEN" | "EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      GoogleAnalytics?: "PROJECTION" | "BETWEEN";
      InforNexus?: "PROJECTION" | "BETWEEN" | "EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      Marketo?: "PROJECTION" | "LESS_THAN" | "GREATER_THAN" | "BETWEEN" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      S3?: "PROJECTION" | "LESS_THAN" | "GREATER_THAN" | "BETWEEN" | "LESS_THAN_OR_EQUAL_TO" | "GREATER_THAN_OR_EQUAL_TO" | "EQUAL_TO" | "NOT_EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      SAPOData?: "PROJECTION" | "LESS_THAN" | "CONTAINS" | "GREATER_THAN" | "BETWEEN" | "LESS_THAN_OR_EQUAL_TO" | "GREATER_THAN_OR_EQUAL_TO" | "EQUAL_TO" | "NOT_EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      Salesforce?: "PROJECTION" | "LESS_THAN" | "CONTAINS" | "GREATER_THAN" | "BETWEEN" | "LESS_THAN_OR_EQUAL_TO" | "GREATER_THAN_OR_EQUAL_TO" | "EQUAL_TO" | "NOT_EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      Pardot?: "PROJECTION" | "EQUAL_TO" | "NO_OP" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC";
      ServiceNow?: "PROJECTION" | "LESS_THAN" | "CONTAINS" | "GREATER_THAN" | "BETWEEN" | "LESS_THAN_OR_EQUAL_TO" | "GREATER_THAN_OR_EQUAL_TO" | "EQUAL_TO" | "NOT_EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      Singular?: "PROJECTION" | "EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      Slack?: "PROJECTION" | "BETWEEN" | "EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      Trendmicro?: "PROJECTION" | "EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      Veeva?: "PROJECTION" | "LESS_THAN" | "GREATER_THAN" | "BETWEEN" | "LESS_THAN_OR_EQUAL_TO" | "GREATER_THAN_OR_EQUAL_TO" | "EQUAL_TO" | "NOT_EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      Zendesk?: "PROJECTION" | "GREATER_THAN" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      CustomConnector?: "PROJECTION" | "LESS_THAN" | "GREATER_THAN" | "CONTAINS" | "BETWEEN" | "LESS_THAN_OR_EQUAL_TO" | "GREATER_THAN_OR_EQUAL_TO" | "EQUAL_TO" | "NOT_EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
    };
    /**
     * A field value on which source field should be validated
     * @maxLength 256
     */
    DestinationField?: string;
    /** Type of task */
    TaskType: "Arithmetic" | "Filter" | "Map" | "Map_all" | "Mask" | "Merge" | "Passthrough" | "Truncate" | "Validate" | "Partition";
    /** A Map used to store task related info */
    TaskProperties?: ({
      Key: "VALUE" | "VALUES" | "DATA_TYPE" | "UPPER_BOUND" | "LOWER_BOUND" | "SOURCE_DATA_TYPE" | "DESTINATION_DATA_TYPE" | "VALIDATION_ACTION" | "MASK_VALUE" | "MASK_LENGTH" | "TRUNCATE_LENGTH" | "MATH_OPERATION_FIELDS_ORDER" | "CONCAT_FORMAT" | "SUBFIELD_CATEGORY_MAP" | "EXCLUDE_SOURCE_FIELDS_LIST" | "INCLUDE_NEW_FIELDS" | "ORDERED_PARTITION_KEYS_LIST";
      /**
       * @maxLength 2048
       * @pattern .+
       */
      Value: string;
    })[];
  })[];
  /** List of Tags. */
  Tags?: {
    /**
     * A string used to identify this tag
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A string containing the value for the tag
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** Configurations of metadata catalog of the flow. */
  MetadataCatalogConfig?: {
    /** Configurations of glue data catalog of the flow. */
    GlueDataCatalog?: {
      /**
       * A string containing the value for the tag
       * @minLength 0
       * @maxLength 512
       * @pattern arn:aws:iam:.*:[0-9]+:.*
       */
      RoleArn: string;
      /**
       * A string containing the value for the tag
       * @minLength 0
       * @maxLength 255
       * @pattern [\u0020-\uD7FF\uE000-\uFFFD\uD800\uDC00-\uDBFF\uDFFF\t]*
       */
      DatabaseName: string;
      /**
       * A string containing the value for the tag
       * @minLength 0
       * @maxLength 128
       * @pattern [\u0020-\uD7FF\uE000-\uFFFD\uD800\uDC00-\uDBFF\uDFFF\t]*
       */
      TablePrefix: string;
    };
  };
};
