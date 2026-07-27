// This file is auto-generated. Do not edit manually.
// Source: aws-lookoutmetrics-anomalydetector.json

/** An Amazon Lookout for Metrics Detector */
export type AwsLookoutmetricsAnomalydetector = {
  Arn?: string;
  /**
   * Name for the Amazon Lookout for Metrics Anomaly Detector
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9][a-zA-Z0-9\-_]*
   */
  AnomalyDetectorName?: string;
  /**
   * A description for the AnomalyDetector.
   * @maxLength 256
   * @pattern .*\S.*
   */
  AnomalyDetectorDescription?: string;
  /** Configuration options for the AnomalyDetector */
  AnomalyDetectorConfig: {
    /** Frequency of anomaly detection */
    AnomalyDetectorFrequency: "PT5M" | "PT10M" | "PT1H" | "P1D";
  };
  /**
   * List of metric sets for anomaly detection
   * @minItems 1
   * @maxItems 1
   */
  MetricSetList: ({
    /**
     * The name of the MetricSet.
     * @minLength 1
     * @maxLength 63
     * @pattern ^[a-zA-Z0-9][a-zA-Z0-9\-_]*
     */
    MetricSetName: string;
    /**
     * A description for the MetricSet.
     * @maxLength 256
     * @pattern .*\S.*
     */
    MetricSetDescription?: string;
    MetricSource: {
      S3SourceConfig?: {
        RoleArn: string;
        /**
         * @minItems 1
         * @maxItems 1
         */
        TemplatedPathList?: string[];
        /**
         * @minItems 1
         * @maxItems 1
         */
        HistoricalDataPathList?: string[];
        FileFormatDescriptor: {
          CsvFormatDescriptor?: {
            /** @enum ["NONE","GZIP"] */
            FileCompression?: "NONE" | "GZIP";
            Charset?: string;
            /**
             * @maxLength 1
             * @pattern [^\r\n]
             */
            Delimiter?: string;
            HeaderList?: string[];
            /**
             * @maxLength 1
             * @pattern [^\r\n]|^$
             */
            QuoteSymbol?: string;
            ContainsHeader?: boolean;
          };
          JsonFormatDescriptor?: {
            /** @enum ["NONE","GZIP"] */
            FileCompression?: "NONE" | "GZIP";
            Charset?: string;
          };
        };
      };
      RDSSourceConfig?: {
        /**
         * @minLength 1
         * @maxLength 63
         * @pattern ^[a-zA-Z](?!.*--)(?!.*-$)[0-9a-zA-Z\-]*$
         */
        DBInstanceIdentifier: string;
        DatabaseHost: string;
        DatabasePort: number;
        SecretManagerArn: string;
        /**
         * @minLength 1
         * @maxLength 64
         * @pattern [a-zA-Z0-9_]+
         */
        DatabaseName: string;
        TableName: string;
        RoleArn: string;
        VpcConfiguration: {
          SubnetIdList: string[];
          SecurityGroupIdList: string[];
        };
      };
      RedshiftSourceConfig?: {
        /**
         * @minLength 1
         * @maxLength 63
         * @pattern ^[a-z](?!.*--)(?!.*-$)[0-9a-z\-]*$
         */
        ClusterIdentifier: string;
        DatabaseHost: string;
        DatabasePort: number;
        SecretManagerArn: string;
        /**
         * @minLength 1
         * @maxLength 100
         * @pattern [a-z0-9]+
         */
        DatabaseName: string;
        TableName: string;
        RoleArn: string;
        VpcConfiguration: {
          SubnetIdList: string[];
          SecurityGroupIdList: string[];
        };
      };
      CloudwatchConfig?: {
        RoleArn: string;
      };
      AppFlowConfig?: {
        RoleArn: string;
        /**
         * @maxLength 256
         * @pattern [a-zA-Z0-9][\w!@#.-]+
         */
        FlowName: string;
      };
    };
    /**
     * Metrics captured by this MetricSet.
     * @minItems 1
     */
    MetricList: ({
      MetricName: string;
      /**
       * Operator used to aggregate metric values
       * @enum ["AVG","SUM"]
       */
      AggregationFunction: "AVG" | "SUM";
      /**
       * @minLength 1
       * @maxLength 255
       * @pattern [^:].*
       */
      Namespace?: string;
    })[];
    /**
     * Offset, in seconds, between the frequency interval and the time at which the metrics are available.
     * @minimum 0
     * @maximum 432000
     */
    Offset?: number;
    TimestampColumn?: {
      ColumnName?: string;
      /**
       * A timestamp format for the timestamps in the dataset
       * @maxLength 63
       * @pattern .*\S.*
       */
      ColumnFormat?: string;
    };
    /**
     * Dimensions for this MetricSet.
     * @minItems 0
     */
    DimensionList?: string[];
    /**
     * A frequency period to aggregate the data
     * @enum ["PT5M","PT10M","PT1H","P1D"]
     */
    MetricSetFrequency?: "PT5M" | "PT10M" | "PT1H" | "P1D";
    /**
     * @maxLength 60
     * @pattern .*\S.*
     */
    Timezone?: string;
  })[];
  /**
   * KMS key used to encrypt the AnomalyDetector data
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:aws.*:kms:.*:[0-9]{12}:key/.*
   */
  KmsKeyArn?: string;
};
