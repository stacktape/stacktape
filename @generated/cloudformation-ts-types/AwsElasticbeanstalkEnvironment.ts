// This file is auto-generated. Do not edit manually.
// Source: aws-elasticbeanstalk-environment.json

/** Resource Type definition for AWS::ElasticBeanstalk::Environment */
export type AwsElasticbeanstalkEnvironment = {
  /** The Amazon Resource Name (ARN) of the custom platform to use with the environment. */
  PlatformArn?: string;
  /** The name of the application that is associated with this environment. */
  ApplicationName: string;
  /** Your description for this environment. */
  Description?: string;
  /** A unique name for the environment. */
  EnvironmentName?: string;
  /**
   * The Amazon Resource Name (ARN) of an existing IAM role to be used as the environment's operations
   * role.
   */
  OperationsRole?: string;
  /**
   * Specifies the tier to use in creating this environment. The environment tier that you choose
   * determines whether Elastic Beanstalk provisions resources to support a web application that handles
   * HTTP(S) requests or a web application that handles background-processing tasks.
   */
  Tier?: {
    /** The type of this environment tier. */
    Type?: string;
    /**
     * The version of this environment tier. When you don't set a value to it, Elastic Beanstalk uses the
     * latest compatible worker tier version.
     */
    Version?: string;
    /** The name of this environment tier. */
    Name?: string;
  };
  /** The name of the application version to deploy. */
  VersionLabel?: string;
  EndpointURL?: string;
  /**
   * Key-value pairs defining configuration options for this environment, such as the instance type.
   * @uniqueItems false
   */
  OptionSettings?: {
    /**
     * A unique resource name for the option setting. Use it for a time–based scaling configuration
     * option.
     */
    ResourceName?: string;
    /** The current value for the configuration option. */
    Value?: string;
    /** A unique namespace that identifies the option's associated AWS resource. */
    Namespace: string;
    /** The name of the configuration option. */
    OptionName: string;
  }[];
  /** The name of the Elastic Beanstalk configuration template to use with the environment. */
  TemplateName?: string;
  /** The name of an Elastic Beanstalk solution stack (platform version) to use with the environment. */
  SolutionStackName?: string;
  /**
   * If specified, the environment attempts to use this value as the prefix for the CNAME in your
   * Elastic Beanstalk environment URL. If not specified, the CNAME is generated automatically by
   * appending a random alphanumeric string to the environment name.
   */
  CNAMEPrefix?: string;
  /**
   * Specifies the tags applied to resources in the environment.
   * @uniqueItems false
   */
  Tags?: {
    /** The value for the tag. */
    Value: string;
    /** The key name of the tag. */
    Key: string;
  }[];
};
