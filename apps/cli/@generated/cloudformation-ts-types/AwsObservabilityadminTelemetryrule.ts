// This file is auto-generated. Do not edit manually.
// Source: aws-observabilityadmin-telemetryrule.json

/**
 * The AWS::ObservabilityAdmin::TelemetryRule resource defines a CloudWatch Observability Admin
 * Telemetry Rule.
 */
export type AwsObservabilityadminTelemetryrule = {
  /**
   * The name of the telemetry rule
   * @minLength 1
   * @maxLength 100
   * @pattern ^[0-9A-Za-z-]+$
   */
  RuleName: string;
  Rule: {
    ResourceType: "AWS::EC2::VPC";
    TelemetryType: "Logs";
    DestinationConfiguration?: {
      DestinationType?: "cloud-watch-logs";
      DestinationPattern?: string;
      RetentionInDays?: number;
      VPCFlowLogParameters?: {
        /**
         * The fields to include in the flow log record. If you omit this parameter, the flow log is created
         * using the default format.
         */
        LogFormat?: string;
        /** The type of traffic captured for the flow log. Default is ALL */
        TrafficType?: string;
        /**
         * The maximum interval of time, in seconds, during which a flow of packets is captured and aggregated
         * into a flow log record. Default is 600s.
         */
        MaxAggregationInterval?: number;
      };
    };
    SelectionCriteria?: string;
  };
  /**
   * The arn of the telemetry rule
   * @minLength 1
   * @maxLength 1011
   * @pattern ^arn:aws([a-z0-9\-]+)?:([a-zA-Z0-9\-]+):([a-z0-9\-]+)?:([0-9]{12})?:(.+)$
   */
  RuleArn?: string;
  /**
   * An array of key-value pairs to apply to this resource
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
