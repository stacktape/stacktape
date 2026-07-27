// This file is auto-generated. Do not edit manually.
// Source: aws-appconfig-deploymentstrategy.json

/** Resource Type definition for AWS::AppConfig::DeploymentStrategy */
export type AwsAppconfigDeploymentstrategy = {
  /** Total amount of time for a deployment to last. */
  DeploymentDurationInMinutes: number;
  /** A description of the deployment strategy. */
  Description?: string;
  /**
   * Specifies the amount of time AWS AppConfig monitors for Amazon CloudWatch alarms after the
   * configuration has been deployed to 100% of its targets, before considering the deployment to be
   * complete. If an alarm is triggered during this time, AWS AppConfig rolls back the deployment. You
   * must configure permissions for AWS AppConfig to roll back based on CloudWatch alarms. For more
   * information, see Configuring permissions for rollback based on Amazon CloudWatch alarms in the AWS
   * AppConfig User Guide.
   */
  FinalBakeTimeInMinutes?: number;
  /** The percentage of targets to receive a deployed configuration during each interval. */
  GrowthFactor: number;
  /**
   * The algorithm used to define how percentage grows over time. AWS AppConfig supports the following
   * growth types:
   * Linear: For this type, AWS AppConfig processes the deployment by dividing the total number of
   * targets by the value specified for Step percentage. For example, a linear deployment that uses a
   * Step percentage of 10 deploys the configuration to 10 percent of the hosts. After those deployments
   * are complete, the system deploys the configuration to the next 10 percent. This continues until
   * 100% of the targets have successfully received the configuration.
   * Exponential: For this type, AWS AppConfig processes the deployment exponentially using the
   * following formula: G*(2^N). In this formula, G is the growth factor specified by the user and N is
   * the number of steps until the configuration is deployed to all targets. For example, if you specify
   * a growth factor of 2, then the system rolls out the configuration as follows:
   * 2*(2^0)
   * 2*(2^1)
   * 2*(2^2)
   * Expressed numerically, the deployment rolls out as follows: 2% of the targets, 4% of the targets,
   * 8% of the targets, and continues until the configuration has been deployed to all targets.
   * @enum ["EXPONENTIAL","LINEAR"]
   */
  GrowthType?: "EXPONENTIAL" | "LINEAR";
  /** A name for the deployment strategy. */
  Name: string;
  /**
   * Save the deployment strategy to a Systems Manager (SSM) document.
   * @enum ["NONE","SSM_DOCUMENT"]
   */
  ReplicateTo: "NONE" | "SSM_DOCUMENT";
  /**
   * Assigns metadata to an AWS AppConfig resource. Tags help organize and categorize your AWS AppConfig
   * resources. Each tag consists of a key and an optional value, both of which you define. You can
   * specify a maximum of 50 tags for a resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key?: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value?: string;
  }[];
  /** The deployment strategy ID. */
  Id?: string;
};
