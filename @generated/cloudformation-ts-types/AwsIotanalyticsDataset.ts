// This file is auto-generated. Do not edit manually.
// Source: aws-iotanalytics-dataset.json

/** Resource Type definition for AWS::IoTAnalytics::Dataset */
export type AwsIotanalyticsDataset = {
  /**
   * @minItems 1
   * @maxItems 1
   * @uniqueItems false
   */
  Actions: ({
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9_]+$
     */
    ActionName: string;
    ContainerAction?: {
      /**
       * @minItems 0
       * @maxItems 50
       * @uniqueItems false
       */
      Variables?: {
        /**
         * @minLength 1
         * @maxLength 256
         */
        VariableName: string;
        DatasetContentVersionValue?: {
          /**
           * @minLength 1
           * @maxLength 128
           * @pattern (^(?!_{2}))(^[a-zA-Z0-9_]+$)
           */
          DatasetName: string;
        };
        /**
         * @minLength 0
         * @maxLength 1024
         */
        StringValue?: string;
        DoubleValue?: number;
        OutputFileUriValue?: {
          /** @pattern ^[\w\.-]{1,255}$ */
          FileName: string;
        };
      }[];
      /**
       * @minLength 20
       * @maxLength 2048
       */
      ExecutionRoleArn: string;
      /** @maxLength 255 */
      Image: string;
      ResourceConfiguration: {
        /**
         * @minimum 1
         * @maximum 50
         */
        VolumeSizeInGB: number;
        /** @enum ["ACU_1","ACU_2"] */
        ComputeType: "ACU_1" | "ACU_2";
      };
    };
    QueryAction?: {
      /**
       * @minItems 0
       * @maxItems 1
       * @uniqueItems false
       */
      Filters?: {
        DeltaTime?: {
          OffsetSeconds: number;
          TimeExpression: string;
        };
      }[];
      SqlQuery: string;
    };
  })[];
  /**
   * @minItems 1
   * @maxItems 1
   * @uniqueItems false
   */
  LateDataRules?: {
    RuleConfiguration: {
      DeltaTimeSessionWindowConfiguration?: {
        /**
         * @minimum 1
         * @maximum 60
         */
        TimeoutInMinutes: number;
      };
    };
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9_]+$
     */
    RuleName?: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern (^(?!_{2}))(^[a-zA-Z0-9_]+$)
   */
  DatasetName?: string;
  /**
   * @minItems 0
   * @maxItems 20
   * @uniqueItems false
   */
  ContentDeliveryRules?: {
    Destination: {
      IotEventsDestinationConfiguration?: {
        /**
         * @minLength 1
         * @maxLength 128
         * @pattern ^[a-zA-Z][a-zA-Z0-9_]*$
         */
        InputName: string;
        /**
         * @minLength 20
         * @maxLength 2048
         */
        RoleArn: string;
      };
      S3DestinationConfiguration?: {
        GlueConfiguration?: {
          /**
           * @minLength 1
           * @maxLength 150
           */
          DatabaseName: string;
          /**
           * @minLength 1
           * @maxLength 150
           */
          TableName: string;
        };
        /**
         * @minLength 3
         * @maxLength 255
         * @pattern ^[a-zA-Z0-9.\-_]*$
         */
        Bucket: string;
        /**
         * @minLength 1
         * @maxLength 255
         * @pattern ^[a-zA-Z0-9!_.*'()/{}:-]*$
         */
        Key: string;
        /**
         * @minLength 20
         * @maxLength 2048
         */
        RoleArn: string;
      };
    };
    EntryName?: string;
  }[];
  /**
   * @minItems 0
   * @maxItems 5
   * @uniqueItems false
   */
  Triggers?: {
    TriggeringDataset?: {
      /**
       * @minLength 1
       * @maxLength 128
       * @pattern (^(?!_{2}))(^[a-zA-Z0-9_]+$)
       */
      DatasetName: string;
    };
    Schedule?: {
      ScheduleExpression: string;
    };
  }[];
  VersioningConfiguration?: {
    Unlimited?: boolean;
    /**
     * @minimum 1
     * @maximum 1000
     */
    MaxVersions?: number;
  };
  Id?: string;
  RetentionPeriod?: {
    /**
     * @minimum 1
     * @maximum 2147483647
     */
    NumberOfDays?: number;
    Unlimited?: boolean;
  };
  /**
   * @minItems 1
   * @maxItems 50
   * @uniqueItems false
   */
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
