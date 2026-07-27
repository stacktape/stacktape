// This file is auto-generated. Do not edit manually.
// Source: aws-apprunner-observabilityconfiguration.json

/**
 * The AWS::AppRunner::ObservabilityConfiguration resource  is an AWS App Runner resource type that
 * specifies an App Runner observability configuration
 */
export type AwsApprunnerObservabilityconfiguration = {
  /**
   * The Amazon Resource Name (ARN) of this ObservabilityConfiguration
   * @minLength 1
   * @maxLength 1011
   * @pattern arn:aws(-[\w]+)*:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[0-9]{12}:(\w|/|-){1,1011}
   */
  ObservabilityConfigurationArn?: string;
  /**
   * A name for the observability configuration. When you use it for the first time in an AWS Region,
   * App Runner creates revision number 1 of this name. When you use the same name in subsequent calls,
   * App Runner creates incremental revisions of the configuration.
   * @minLength 4
   * @maxLength 32
   * @pattern [A-Za-z0-9][A-Za-z0-9\-_]{3,31}
   */
  ObservabilityConfigurationName?: string;
  /**
   * The revision of this observability configuration. It's unique among all the active configurations
   * ('Status': 'ACTIVE') that share the same ObservabilityConfigurationName.
   */
  ObservabilityConfigurationRevision?: number;
  /**
   * It's set to true for the configuration with the highest Revision among all configurations that
   * share the same Name. It's set to false otherwise.
   */
  Latest?: boolean;
  /**
   * The configuration of the tracing feature within this observability configuration. If you don't
   * specify it, App Runner doesn't enable tracing.
   */
  TraceConfiguration?: {
    /**
     * The implementation provider chosen for tracing App Runner services.
     * @enum ["AWSXRAY"]
     */
    Vendor: "AWSXRAY";
  };
  /**
   * A list of metadata items that you can associate with your observability configuration resource. A
   * tag is a key-value pair.
   */
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
