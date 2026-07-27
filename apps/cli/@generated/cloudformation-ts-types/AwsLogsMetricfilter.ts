// This file is auto-generated. Do not edit manually.
// Source: aws-logs-metricfilter.json

/**
 * The ``AWS::Logs::MetricFilter`` resource specifies a metric filter that describes how CWL extracts
 * information from logs and transforms it into Amazon CloudWatch metrics. If you have multiple metric
 * filters that are associated with a log group, all the filters are applied to the log streams in
 * that group.
 * The maximum number of metric filters that can be associated with a log group is 100.
 */
export type AwsLogsMetricfilter = {
  /**
   * @minLength 0
   * @maxLength 2000
   */
  FieldSelectionCriteria?: string;
  /**
   * The metric transformations.
   * @minItems 1
   * @maxItems 1
   */
  MetricTransformations: ({
    /**
     * (Optional) The value to emit when a filter pattern does not match a log event. This value can be
     * null.
     */
    DefaultValue?: number;
    /**
     * The name of the CloudWatch metric.
     * @minLength 1
     * @maxLength 255
     * @pattern ^((?![:*$])[\x00-\x7F]){1,255}
     */
    MetricName: string;
    /**
     * The value that is published to the CloudWatch metric. For example, if you're counting the
     * occurrences of a particular term like ``Error``, specify 1 for the metric value. If you're counting
     * the number of bytes transferred, reference the value that is in the log event by using $. followed
     * by the name of the field that you specified in the filter pattern, such as ``$.size``.
     * @minLength 1
     * @maxLength 100
     * @pattern .{1,100}
     */
    MetricValue: string;
    /**
     * A custom namespace to contain your metric in CloudWatch. Use namespaces to group together metrics
     * that are similar. For more information, see
     * [Namespaces](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Namespace).
     * @minLength 1
     * @maxLength 256
     * @pattern ^[0-9a-zA-Z\.\-_\/#]{1,256}
     */
    MetricNamespace: string;
    /**
     * The fields to use as dimensions for the metric. One metric filter can include as many as three
     * dimensions.
     * Metrics extracted from log events are charged as custom metrics. To prevent unexpected high
     * charges, do not specify high-cardinality fields such as ``IPAddress`` or ``requestID`` as
     * dimensions. Each different value found for a dimension is treated as a separate metric and accrues
     * charges as a separate custom metric.
     * CloudWatch Logs disables a metric filter if it generates 1000 different name/value pairs for your
     * specified dimensions within a certain amount of time. This helps to prevent accidental high
     * charges.
     * You can also set up a billing alarm to alert you if your charges are higher than expected. For
     * more information, see [Creating a Billing Alarm to Monitor Your Estimated
     * Charges](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/monitor_estimated_charges_with_cloudwatch.html).
     * @minItems 1
     * @maxItems 3
     * @uniqueItems true
     */
    Dimensions?: {
      /**
       * The log event field that will contain the value for this dimension. This dimension will only be
       * published for a metric if the value is found in the log event. For example, ``$.eventType`` for
       * JSON log events, or ``$server`` for space-delimited log events.
       * @minLength 1
       * @maxLength 255
       */
      Value: string;
      /**
       * The name for the CW metric dimension that the metric filter creates.
       * Dimension names must contain only ASCII characters, must include at least one non-whitespace
       * character, and cannot start with a colon (:).
       * @minLength 1
       * @maxLength 255
       */
      Key: string;
    }[];
    /**
     * The unit to assign to the metric. If you omit this, the unit is set as ``None``.
     * @enum ["Seconds","Microseconds","Milliseconds","Bytes","Kilobytes","Megabytes","Gigabytes","Terabytes","Bits","Kilobits","Megabits","Gigabits","Terabits","Percent","Count","Bytes/Second","Kilobytes/Second","Megabytes/Second","Gigabytes/Second","Terabytes/Second","Bits/Second","Kilobits/Second","Megabits/Second","Gigabits/Second","Terabits/Second","Count/Second","None"]
     */
    Unit?: "Seconds" | "Microseconds" | "Milliseconds" | "Bytes" | "Kilobytes" | "Megabytes" | "Gigabytes" | "Terabytes" | "Bits" | "Kilobits" | "Megabits" | "Gigabits" | "Terabits" | "Percent" | "Count" | "Bytes/Second" | "Kilobytes/Second" | "Megabytes/Second" | "Gigabytes/Second" | "Terabytes/Second" | "Bits/Second" | "Kilobits/Second" | "Megabits/Second" | "Gigabits/Second" | "Terabits/Second" | "Count/Second" | "None";
  })[];
  /**
   * A filter pattern for extracting metric data out of ingested log events. For more information, see
   * [Filter and Pattern
   * Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/FilterAndPatternSyntax.html).
   * @maxLength 1024
   */
  FilterPattern: string;
  EmitSystemFieldDimensions?: string[];
  /**
   * The name of an existing log group that you want to associate with this metric filter.
   * @minLength 1
   * @maxLength 512
   * @pattern ^[.\-_/#A-Za-z0-9]{1,512}
   */
  LogGroupName: string;
  /**
   * This parameter is valid only for log groups that have an active log transformer. For more
   * information about log transformers, see
   * [PutTransformer](https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_PutTransformer.html).
   * If this value is ``true``, the metric filter is applied on the transformed version of the log
   * events instead of the original ingested log events.
   */
  ApplyOnTransformedLogs?: boolean;
  /**
   * The name of the metric filter.
   * @minLength 1
   * @maxLength 512
   * @pattern ^[^:*]{1,512}
   */
  FilterName?: string;
};
