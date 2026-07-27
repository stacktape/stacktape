// This file is auto-generated. Do not edit manually.
// Source: aws-iotanalytics-datastore.json

/** Resource Type definition for AWS::IoTAnalytics::Datastore */
export type AwsIotanalyticsDatastore = {
  DatastoreStorage?: {
    ServiceManagedS3?: Record<string, unknown>;
    CustomerManagedS3?: {
      /**
       * @minLength 3
       * @maxLength 255
       * @pattern [a-zA-Z0-9.\-_]*
       */
      Bucket: string;
      /**
       * @minLength 20
       * @maxLength 2048
       */
      RoleArn: string;
      /**
       * @minLength 1
       * @maxLength 255
       * @pattern [a-zA-Z0-9!_.*'()/{}:-]*/
       */
      KeyPrefix?: string;
    };
    IotSiteWiseMultiLayerStorage?: {
      CustomerManagedS3Storage?: {
        /**
         * @minLength 3
         * @maxLength 255
         * @pattern [a-zA-Z0-9.\-_]*
         */
        Bucket: string;
        /**
         * @minLength 1
         * @maxLength 255
         * @pattern [a-zA-Z0-9!_.*'()/{}:-]*/
         */
        KeyPrefix?: string;
      };
    };
  };
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9_]+
   */
  DatastoreName?: string;
  DatastorePartitions?: {
    /**
     * @minItems 0
     * @maxItems 25
     * @uniqueItems false
     */
    Partitions?: {
      Partition?: {
        /** @pattern [a-zA-Z0-9_]+ */
        AttributeName: string;
      };
      TimestampPartition?: {
        /** @pattern [a-zA-Z0-9_]+ */
        AttributeName: string;
        /** @pattern [a-zA-Z0-9\s\[\]_,.'/:-]* */
        TimestampFormat?: string;
      };
    }[];
  };
  Id?: string;
  FileFormatConfiguration?: {
    JsonConfiguration?: Record<string, unknown>;
    ParquetConfiguration?: {
      SchemaDefinition?: {
        /**
         * @minItems 1
         * @maxItems 100
         * @uniqueItems false
         */
        Columns?: {
          Type: string;
          Name: string;
        }[];
      };
    };
  };
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
