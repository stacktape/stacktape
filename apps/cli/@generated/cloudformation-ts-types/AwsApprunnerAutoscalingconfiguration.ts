// This file is auto-generated. Do not edit manually.
// Source: aws-apprunner-autoscalingconfiguration.json

/**
 * Describes an AWS App Runner automatic configuration resource that enables automatic scaling of
 * instances used to process web requests. You can share an auto scaling configuration across multiple
 * services.
 */
export type AwsApprunnerAutoscalingconfiguration = {
  /**
   * The Amazon Resource Name (ARN) of this auto scaling configuration.
   * @minLength 1
   * @maxLength 1011
   * @pattern arn:aws(-[\w]+)*:[a-z0-9-\.]{0,63}:[a-z0-9-\.]{0,63}:[0-9]{12}:(\w|/|-){1,1011}
   */
  AutoScalingConfigurationArn?: string;
  /**
   * The customer-provided auto scaling configuration name.  When you use it for the first time in an
   * AWS Region, App Runner creates revision number 1 of this name. When you use the same name in
   * subsequent calls, App Runner creates incremental revisions of the configuration. The auto scaling
   * configuration name can be used in multiple revisions of a configuration.
   * @minLength 4
   * @maxLength 32
   * @pattern [A-Za-z0-9][A-Za-z0-9\-_]{3,31}
   */
  AutoScalingConfigurationName?: string;
  /**
   * The revision of this auto scaling configuration. It's unique among all the active configurations
   * ("Status": "ACTIVE") that share the same AutoScalingConfigurationName.
   */
  AutoScalingConfigurationRevision?: number;
  /**
   * The maximum number of concurrent requests that an instance processes. If the number of concurrent
   * requests exceeds this limit, App Runner scales the service up to use more instances to process the
   * requests.
   */
  MaxConcurrency?: number;
  /**
   * The maximum number of instances that an App Runner service scales up to. At most MaxSize instances
   * actively serve traffic for your service.
   */
  MaxSize?: number;
  /**
   * The minimum number of instances that App Runner provisions for a service. The service always has at
   * least MinSize provisioned instances. Some of them actively serve traffic. The rest of them
   * (provisioned and inactive instances) are a cost-effective compute capacity reserve and are ready to
   * be quickly activated. You pay for memory usage of all the provisioned instances. You pay for CPU
   * usage of only the active subset.
   */
  MinSize?: number;
  /**
   * It's set to true for the configuration with the highest Revision among all configurations that
   * share the same AutoScalingConfigurationName. It's set to false otherwise. App Runner temporarily
   * doubles the number of provisioned instances during deployments, to maintain the same capacity for
   * both old and new code.
   */
  Latest?: boolean;
  /**
   * A list of metadata items that you can associate with your auto scaling configuration resource. A
   * tag is a key-value pair.
   */
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
