// This file is auto-generated. Do not edit manually.
// Source: aws-iot-securityprofile.json

/** A security profile defines a set of expected behaviors for devices in your account. */
export type AwsIotSecurityprofile = {
  /**
   * A unique identifier for the security profile.
   * @minLength 1
   * @maxLength 128
   * @pattern [a-zA-Z0-9:_-]+
   */
  SecurityProfileName?: string;
  /**
   * A description of the security profile.
   * @maxLength 1000
   */
  SecurityProfileDescription?: string;
  /**
   * Specifies the behaviors that, when violated by a device (thing), cause an alert.
   * @maxLength 100
   * @uniqueItems true
   */
  Behaviors?: ({
    /**
     * The name for the behavior.
     * @minLength 1
     * @maxLength 128
     * @pattern [a-zA-Z0-9:_-]+
     */
    Name: string;
    /**
     * What is measured by the behavior.
     * @minLength 1
     * @maxLength 128
     * @pattern [a-zA-Z0-9:_-]+
     */
    Metric?: string;
    MetricDimension?: {
      /**
       * A unique identifier for the dimension.
       * @minLength 1
       * @maxLength 128
       * @pattern [a-zA-Z0-9:_-]+
       */
      DimensionName: string;
      /**
       * Defines how the dimensionValues of a dimension are interpreted.
       * @enum ["IN","NOT_IN"]
       */
      Operator?: "IN" | "NOT_IN";
    };
    Criteria?: {
      /**
       * The operator that relates the thing measured (metric) to the criteria (containing a value or
       * statisticalThreshold).
       * @enum ["less-than","less-than-equals","greater-than","greater-than-equals","in-cidr-set","not-in-cidr-set","in-port-set","not-in-port-set","in-set","not-in-set"]
       */
      ComparisonOperator?: "less-than" | "less-than-equals" | "greater-than" | "greater-than-equals" | "in-cidr-set" | "not-in-cidr-set" | "in-port-set" | "not-in-port-set" | "in-set" | "not-in-set";
      Value?: {
        /**
         * If the ComparisonOperator calls for a numeric value, use this to specify that (integer) numeric
         * value to be compared with the metric.
         * @minimum 0
         */
        Count?: string;
        /**
         * If the ComparisonOperator calls for a set of CIDRs, use this to specify that set to be compared
         * with the metric.
         * @uniqueItems true
         */
        Cidrs?: string[];
        /**
         * If the ComparisonOperator calls for a set of ports, use this to specify that set to be compared
         * with the metric.
         * @uniqueItems true
         */
        Ports?: number[];
        /** The numeral value of a metric. */
        Number?: number;
        /**
         * The numeral values of a metric.
         * @uniqueItems true
         */
        Numbers?: number[];
        /**
         * The string values of a metric.
         * @uniqueItems true
         */
        Strings?: string[];
      };
      /** Use this to specify the time duration over which the behavior is evaluated. */
      DurationSeconds?: number;
      /**
       * If a device is in violation of the behavior for the specified number of consecutive datapoints, an
       * alarm occurs. If not specified, the default is 1.
       * @minimum 1
       * @maximum 10
       */
      ConsecutiveDatapointsToAlarm?: number;
      /**
       * If an alarm has occurred and the offending device is no longer in violation of the behavior for the
       * specified number of consecutive datapoints, the alarm is cleared. If not specified, the default is
       * 1.
       * @minimum 1
       * @maximum 10
       */
      ConsecutiveDatapointsToClear?: number;
      StatisticalThreshold?: {
        /**
         * The percentile which resolves to a threshold value by which compliance with a behavior is
         * determined
         * @enum ["Average","p0","p0.1","p0.01","p1","p10","p50","p90","p99","p99.9","p99.99","p100"]
         */
        Statistic?: "Average" | "p0" | "p0.1" | "p0.01" | "p1" | "p10" | "p50" | "p90" | "p99" | "p99.9" | "p99.99" | "p100";
      };
      MlDetectionConfig?: {
        /**
         * The sensitivity of anomalous behavior evaluation. Can be Low, Medium, or High.
         * @enum ["LOW","MEDIUM","HIGH"]
         */
        ConfidenceLevel?: "LOW" | "MEDIUM" | "HIGH";
      };
    };
    /**
     * Manage Detect alarm SNS notifications by setting behavior notification to on or suppressed. Detect
     * will continue to performing device behavior evaluations. However, suppressed alarms wouldn't be
     * forwarded for SNS notification.
     */
    SuppressAlerts?: boolean;
    ExportMetric?: boolean;
  })[];
  /** Specifies the destinations to which alerts are sent. */
  AlertTargets?: Record<string, {
    /**
     * The ARN of the notification target to which alerts are sent.
     * @maxLength 2048
     */
    AlertTargetArn: string;
    /**
     * The ARN of the role that grants permission to send alerts to the notification target.
     * @minLength 20
     * @maxLength 2048
     */
    RoleArn: string;
  }>;
  /**
   * A list of metrics whose data is retained (stored). By default, data is retained for any metric used
   * in the profile's behaviors, but it is also retained for any metric specified here.
   * @uniqueItems true
   */
  AdditionalMetricsToRetainV2?: ({
    /**
     * What is measured by the behavior.
     * @minLength 1
     * @maxLength 128
     * @pattern [a-zA-Z0-9:_-]+
     */
    Metric: string;
    MetricDimension?: {
      /**
       * A unique identifier for the dimension.
       * @minLength 1
       * @maxLength 128
       * @pattern [a-zA-Z0-9:_-]+
       */
      DimensionName: string;
      /**
       * Defines how the dimensionValues of a dimension are interpreted.
       * @enum ["IN","NOT_IN"]
       */
      Operator?: "IN" | "NOT_IN";
    };
    ExportMetric?: boolean;
  })[];
  /** A structure containing the mqtt topic for metrics export. */
  MetricsExportConfig?: {
    /**
     * The topic for metrics export.
     * @minLength 1
     * @maxLength 512
     */
    MqttTopic: string;
    /**
     * The ARN of the role that grants permission to publish to mqtt topic.
     * @minLength 20
     * @maxLength 2048
     */
    RoleArn: string;
  };
  /**
   * Metadata that can be used to manage the security profile.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The tag's key.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The tag's value.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * A set of target ARNs that the security profile is attached to.
   * @uniqueItems true
   */
  TargetArns?: string[];
  /** The ARN (Amazon resource name) of the created security profile. */
  SecurityProfileArn?: string;
};
