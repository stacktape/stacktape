// This file is auto-generated. Do not edit manually.
// Source: aws-cloudwatch-metricstream.json

/** Resource Type definition for Metric Stream */
export type AwsCloudwatchMetricstream = {
  /**
   * Amazon Resource Name of the metric stream.
   * @minLength 20
   * @maxLength 2048
   */
  Arn?: string;
  /** The date of creation of the metric stream. */
  CreationDate?: unknown | unknown;
  /**
   * Define which metrics will be not streamed. Metrics matched by multiple instances of
   * MetricStreamFilter are joined with an OR operation by default. If both IncludeFilters and
   * ExcludeFilters are omitted, all metrics in the account will be streamed. IncludeFilters and
   * ExcludeFilters are mutually exclusive. Default to null.
   * @maxItems 1000
   * @uniqueItems true
   */
  ExcludeFilters?: {
    /**
     * Only metrics with Namespace matching this value will be streamed.
     * @minLength 1
     * @maxLength 255
     */
    Namespace: string;
    /**
     * Only metrics with MetricNames matching these values will be streamed. Must be set together with
     * Namespace.
     * @maxItems 999
     */
    MetricNames?: string[];
  }[];
  /**
   * The ARN of the Kinesis Firehose where to stream the data.
   * @minLength 20
   * @maxLength 2048
   */
  FirehoseArn?: string;
  /**
   * Define which metrics will be streamed. Metrics matched by multiple instances of MetricStreamFilter
   * are joined with an OR operation by default. If both IncludeFilters and ExcludeFilters are omitted,
   * all metrics in the account will be streamed. IncludeFilters and ExcludeFilters are mutually
   * exclusive. Default to null.
   * @maxItems 1000
   * @uniqueItems true
   */
  IncludeFilters?: {
    /**
     * Only metrics with Namespace matching this value will be streamed.
     * @minLength 1
     * @maxLength 255
     */
    Namespace: string;
    /**
     * Only metrics with MetricNames matching these values will be streamed. Must be set together with
     * Namespace.
     * @maxItems 999
     */
    MetricNames?: string[];
  }[];
  /** The date of the last update of the metric stream. */
  LastUpdateDate?: unknown | unknown;
  /**
   * Name of the metric stream.
   * @minLength 1
   * @maxLength 255
   */
  Name?: string;
  /**
   * The ARN of the role that provides access to the Kinesis Firehose.
   * @minLength 20
   * @maxLength 2048
   */
  RoleArn?: string;
  /**
   * Displays the state of the Metric Stream.
   * @minLength 1
   * @maxLength 255
   */
  State?: string;
  /**
   * The output format of the data streamed to the Kinesis Firehose.
   * @minLength 1
   * @maxLength 255
   */
  OutputFormat?: string;
  /**
   * By default, a metric stream always sends the MAX, MIN, SUM, and SAMPLECOUNT statistics for each
   * metric that is streamed. You can use this parameter to have the metric stream also send additional
   * statistics in the stream. This array can have up to 100 members.
   * @maxItems 100
   * @uniqueItems true
   */
  StatisticsConfigurations?: {
    /**
     * The additional statistics to stream for the metrics listed in IncludeMetrics.
     * @maxItems 20
     * @uniqueItems true
     */
    AdditionalStatistics: string[];
    /**
     * An array that defines the metrics that are to have additional statistics streamed.
     * @maxItems 100
     * @uniqueItems true
     */
    IncludeMetrics: {
      /**
       * The name of the metric.
       * @minLength 1
       * @maxLength 255
       */
      MetricName: string;
      /**
       * The namespace of the metric.
       * @minLength 1
       * @maxLength 255
       */
      Namespace: string;
    }[];
  }[];
  /**
   * A set of tags to assign to the delivery stream.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * A unique identifier for the tag.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * String which you can use to describe or define the tag.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * If you are creating a metric stream in a monitoring account, specify true to include metrics from
   * source accounts that are linked to this monitoring account, in the metric stream. The default is
   * false.
   */
  IncludeLinkedAccountsMetrics?: boolean;
};
