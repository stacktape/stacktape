// This file is auto-generated. Do not edit manually.
// Source: aws-iotfleetwise-campaign.json

/** Definition of AWS::IoTFleetWise::Campaign Resource Type */
export type AwsIotfleetwiseCampaign = {
  Status?: "CREATING" | "WAITING_FOR_APPROVAL" | "RUNNING" | "SUSPENDED";
  Action?: "APPROVE" | "SUSPEND" | "RESUME" | "UPDATE";
  CreationTime?: string;
  Compression?: "OFF" | "SNAPPY";
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^[^\u0000-\u001F\u007F]+$
   */
  Description?: string;
  /**
   * @default 0
   * @minimum 0
   */
  Priority?: number;
  /**
   * @minItems 0
   * @maxItems 1000
   */
  SignalsToCollect?: {
    /**
     * @minimum 1
     * @maximum 4294967295
     */
    MaxSampleCount?: number;
    /**
     * @minLength 1
     * @maxLength 150
     * @pattern ^[\w|*|-]+(\.[\w|*|-]+)*$
     */
    Name: string;
    /**
     * @minimum 0
     * @maximum 4294967295
     */
    MinimumSamplingIntervalMs?: number;
    DataPartitionId?: string;
  }[];
  /**
   * @minItems 0
   * @maxItems 10
   */
  SignalsToFetch?: ({
    /**
     * @minLength 1
     * @maxLength 150
     * @pattern ^[a-zA-Z0-9_.]+$
     */
    FullyQualifiedName: string;
    SignalFetchConfig: {
      TimeBased: {
        /** @minimum 1 */
        ExecutionFrequencyMs: number;
      };
    } | {
      ConditionBased: {
        /**
         * @minLength 1
         * @maxLength 2048
         */
        ConditionExpression: string;
        TriggerMode: "ALWAYS" | "RISING_EDGE";
      };
    };
    /**
     * @minimum 1
     * @maximum 1
     */
    ConditionLanguageVersion?: number;
    /**
     * @minItems 1
     * @maxItems 5
     */
    Actions: string[];
  })[];
  /**
   * @minItems 1
   * @maxItems 1
   */
  DataDestinationConfigs?: ({
    S3Config: {
      /**
       * @minLength 16
       * @maxLength 100
       * @pattern ^arn:(aws[a-zA-Z0-9-]*):s3:::.+$
       */
      BucketArn: string;
      DataFormat?: "JSON" | "PARQUET";
      StorageCompressionFormat?: "NONE" | "GZIP";
      /**
       * @minLength 1
       * @maxLength 512
       * @pattern ^[a-zA-Z0-9-_:./!*'()]+$
       */
      Prefix?: string;
    };
  } | {
    TimestreamConfig: {
      /**
       * @minLength 20
       * @maxLength 2048
       * @pattern ^arn:(aws[a-zA-Z0-9-]*):timestream:[a-zA-Z0-9-]+:[0-9]{12}:database\/[a-zA-Z0-9_.-]+\/table\/[a-zA-Z0-9_.-]+$
       */
      TimestreamTableArn: string;
      /**
       * @minLength 20
       * @maxLength 2048
       * @pattern ^arn:(aws[a-zA-Z0-9-]*):iam::(\d{12})?:(role((\u002F)|(\u002F[\u0021-\u007F]+\u002F))[\w+=,.@-]+)$
       */
      ExecutionRoleArn: string;
    };
  } | {
    MqttTopicConfig: {
      /**
       * @minLength 20
       * @maxLength 2048
       * @pattern ^arn:.*
       */
      MqttTopicArn: string;
      /**
       * @minLength 20
       * @maxLength 2048
       * @pattern ^arn:(aws[a-zA-Z0-9-]*):iam::(\d{12})?:(role((\u002F)|(\u002F[\u0021-\u007F]+\u002F))[\w+=,.@-]+)$
       */
      ExecutionRoleArn: string;
    };
  })[];
  /** @default "0" */
  StartTime?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z\d\-_:]+$
   */
  Name: string;
  /** @default "253402214400" */
  ExpiryTime?: string;
  LastModificationTime?: string;
  SpoolingMode?: "OFF" | "TO_DISK";
  SignalCatalogArn: string;
  /**
   * @default 0
   * @minimum 0
   * @maximum 4294967295
   */
  PostTriggerCollectionDuration?: number;
  /**
   * @minItems 0
   * @maxItems 5
   */
  DataExtraDimensions?: string[];
  DiagnosticsMode?: "OFF" | "SEND_ACTIVE_DTCS";
  TargetArn: string;
  Arn?: string;
  CollectionScheme: {
    TimeBasedCollectionScheme: {
      /**
       * @minimum 10000
       * @maximum 86400000
       */
      PeriodMs: number;
    };
  } | {
    ConditionBasedCollectionScheme: {
      /**
       * @minimum 0
       * @maximum 4294967295
       */
      MinimumTriggerIntervalMs?: number;
      Expression: string;
      TriggerMode?: "ALWAYS" | "RISING_EDGE";
      ConditionLanguageVersion?: number;
    };
  };
  /**
   * @minItems 0
   * @maxItems 20
   * @uniqueItems true
   */
  DataPartitions?: ({
    Id: string;
    StorageOptions: {
      MaximumSize: {
        Unit: "MB" | "GB" | "TB";
        Value: number;
      };
      MinimumTimeToLive: {
        Unit: "HOURS" | "DAYS" | "WEEKS";
        Value: number;
      };
      StorageLocation: string;
    };
    UploadOptions?: {
      Expression: string;
      ConditionLanguageVersion?: number;
    };
  })[];
  /**
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
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
};
