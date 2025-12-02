// This file is auto-generated. Do not edit manually.
// Source: aws-customerprofiles-integration.json

/** The resource schema for creating an Amazon Connect Customer Profiles Integration. */
export type AwsCustomerprofilesIntegration = {
  /**
   * The unique name of the domain.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  DomainName: string;
  /**
   * The URI of the S3 bucket or any other type of data source.
   * @minLength 1
   * @maxLength 255
   */
  Uri?: string;
  FlowDefinition?: {
    /**
     * @maxLength 256
     * @pattern [a-zA-Z0-9][\w!@#.-]+
     */
    FlowName: string;
    /**
     * @maxLength 2048
     * @pattern [\w!@#\-.?,\s]*
     */
    Description?: string;
    /**
     * @minLength 20
     * @maxLength 2048
     * @pattern arn:aws:kms:.*:[0-9]+:.*
     */
    KmsArn: string;
    Tasks: ({
      ConnectorOperator?: {
        Marketo?: "PROJECTION" | "LESS_THAN" | "GREATER_THAN" | "BETWEEN" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
        S3?: "PROJECTION" | "LESS_THAN" | "GREATER_THAN" | "BETWEEN" | "LESS_THAN_OR_EQUAL_TO" | "GREATER_THAN_OR_EQUAL_TO" | "EQUAL_TO" | "NOT_EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
        Salesforce?: "PROJECTION" | "LESS_THAN" | "GREATER_THAN" | "CONTAINS" | "BETWEEN" | "LESS_THAN_OR_EQUAL_TO" | "GREATER_THAN_OR_EQUAL_TO" | "EQUAL_TO" | "NOT_EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
        ServiceNow?: "PROJECTION" | "LESS_THAN" | "GREATER_THAN" | "CONTAINS" | "BETWEEN" | "LESS_THAN_OR_EQUAL_TO" | "GREATER_THAN_OR_EQUAL_TO" | "EQUAL_TO" | "NOT_EQUAL_TO" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
        Zendesk?: "PROJECTION" | "GREATER_THAN" | "ADDITION" | "MULTIPLICATION" | "DIVISION" | "SUBTRACTION" | "MASK_ALL" | "MASK_FIRST_N" | "MASK_LAST_N" | "VALIDATE_NON_NULL" | "VALIDATE_NON_ZERO" | "VALIDATE_NON_NEGATIVE" | "VALIDATE_NUMERIC" | "NO_OP";
      };
      SourceFields: string[];
      DestinationField?: string;
      TaskType: "Arithmetic" | "Filter" | "Map" | "Mask" | "Merge" | "Truncate" | "Validate";
      TaskProperties?: ({
        OperatorPropertyKey: "VALUE" | "VALUES" | "DATA_TYPE" | "UPPER_BOUND" | "LOWER_BOUND" | "SOURCE_DATA_TYPE" | "DESTINATION_DATA_TYPE" | "VALIDATION_ACTION" | "MASK_VALUE" | "MASK_LENGTH" | "TRUNCATE_LENGTH" | "MATH_OPERATION_FIELDS_ORDER" | "CONCAT_FORMAT" | "SUBFIELD_CATEGORY_MAP";
        /**
         * @maxLength 2048
         * @pattern .+
         */
        Property: string;
      })[];
    })[];
    TriggerConfig: {
      TriggerType: "Scheduled" | "Event" | "OnDemand";
      TriggerProperties?: {
        Scheduled?: {
          /**
           * @maxLength 256
           * @pattern .*
           */
          ScheduleExpression: string;
          /** @enum ["Incremental","Complete"] */
          DataPullMode?: "Incremental" | "Complete";
          ScheduleStartTime?: number;
          ScheduleEndTime?: number;
          /**
           * @maxLength 256
           * @pattern .*
           */
          Timezone?: string;
          /**
           * @minimum 0
           * @maximum 36000
           */
          ScheduleOffset?: number;
          FirstExecutionFrom?: number;
        };
      };
    };
    SourceFlowConfig: {
      ConnectorType: "Salesforce" | "Marketo" | "ServiceNow" | "Zendesk" | "S3";
      /**
       * @maxLength 256
       * @pattern [\w/!@#+=.-]+
       */
      ConnectorProfileName?: string;
      IncrementalPullConfig?: {
        /** @maxLength 256 */
        DatetimeTypeFieldName?: string;
      };
      SourceConnectorProperties: {
        Marketo?: {
          Object: string;
        };
        S3?: {
          /**
           * @minLength 3
           * @maxLength 63
           * @pattern \S+
           */
          BucketName: string;
          /**
           * @maxLength 512
           * @pattern .*
           */
          BucketPrefix?: string;
        };
        Salesforce?: {
          Object: string;
          EnableDynamicFieldUpdate?: boolean;
          IncludeDeletedRecords?: boolean;
        };
        ServiceNow?: {
          Object: string;
        };
        Zendesk?: {
          Object: string;
        };
      };
    };
  };
  /**
   * The name of the ObjectType defined for the 3rd party data in Profile Service
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z_][a-zA-Z_0-9-]*$
   */
  ObjectTypeName?: string;
  /** The time of this integration got created */
  CreatedAt?: string;
  /** The time of this integration got last updated at */
  LastUpdatedAt?: string;
  /**
   * The tags (keys and values) associated with the integration
   * @minItems 0
   * @maxItems 50
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** The mapping between 3rd party event types and ObjectType names */
  ObjectTypeNames?: {
    /**
     * @minLength 1
     * @maxLength 255
     */
    Key: string;
    /**
     * @minLength 1
     * @maxLength 255
     * @pattern ^[a-zA-Z_][a-zA-Z_0-9-]*$
     */
    Value: string;
  }[];
  /**
   * A list of unique names for active event triggers associated with the integration.
   * @minItems 1
   * @maxItems 1
   */
  EventTriggerNames?: string[];
};
