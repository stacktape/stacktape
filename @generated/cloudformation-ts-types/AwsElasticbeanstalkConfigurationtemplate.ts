// This file is auto-generated. Do not edit manually.
// Source: aws-elasticbeanstalk-configurationtemplate.json

/** Resource Type definition for AWS::ElasticBeanstalk::ConfigurationTemplate */
export type AwsElasticbeanstalkConfigurationtemplate = {
  /** The name of the Elastic Beanstalk application to associate with this configuration template. */
  ApplicationName: string;
  /** An optional description for this configuration. */
  Description?: string;
  /**
   * The ID of an environment whose settings you want to use to create the configuration template. You
   * must specify EnvironmentId if you don't specify PlatformArn, SolutionStackName, or
   * SourceConfiguration.
   */
  EnvironmentId?: string;
  /**
   * Option values for the Elastic Beanstalk configuration, such as the instance type. If specified,
   * these values override the values obtained from the solution stack or the source configuration
   * template. For a complete list of Elastic Beanstalk configuration options, see [Option
   * Values](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options.html) in the AWS
   * Elastic Beanstalk Developer Guide.
   * @uniqueItems false
   */
  OptionSettings?: {
    /** A unique namespace that identifies the option's associated AWS resource. */
    Namespace: string;
    /** The name of the configuration option. */
    OptionName: string;
    /**
     * A unique resource name for the option setting. Use it for a time–based scaling configuration
     * option.
     */
    ResourceName?: string;
    /** The current value for the configuration option. */
    Value?: string;
  }[];
  /**
   * The Amazon Resource Name (ARN) of the custom platform. For more information, see [Custom
   * Platforms](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/custom-platforms.html) in the AWS
   * Elastic Beanstalk Developer Guide.
   */
  PlatformArn?: string;
  /**
   * The name of an Elastic Beanstalk solution stack (platform version) that this configuration uses.
   * For example, 64bit Amazon Linux 2013.09 running Tomcat 7 Java 7. A solution stack specifies the
   * operating system, runtime, and application server for a configuration template. It also determines
   * the set of configuration options as well as the possible and default values. For more information,
   * see [Supported
   * Platforms](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/concepts.platforms.html) in the
   * AWS Elastic Beanstalk Developer Guide.
   * You must specify SolutionStackName if you don't specify PlatformArn, EnvironmentId, or
   * SourceConfiguration.
   * Use the ListAvailableSolutionStacks API to obtain a list of available solution stacks.
   */
  SolutionStackName?: string;
  /**
   * An Elastic Beanstalk configuration template to base this one on. If specified, Elastic Beanstalk
   * uses the configuration values from the specified configuration template to create a new
   * configuration.
   * Values specified in OptionSettings override any values obtained from the SourceConfiguration.
   * You must specify SourceConfiguration if you don't specify PlatformArn, EnvironmentId, or
   * SolutionStackName.
   * Constraint: If both solution stack name and source configuration are specified, the solution stack
   * of the source configuration template must match the specified solution stack name.
   */
  SourceConfiguration?: {
    /** The name of the application associated with the configuration. */
    ApplicationName: string;
    /** The name of the configuration template. */
    TemplateName: string;
  };
  /** The name of the configuration template */
  TemplateName?: string;
};
