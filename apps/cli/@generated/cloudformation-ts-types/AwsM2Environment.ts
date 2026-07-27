// This file is auto-generated. Do not edit manually.
// Source: aws-m2-environment.json

/** Represents a runtime environment that can run migrated mainframe applications. */
export type AwsM2Environment = {
  /**
   * The description of the environment.
   * @minLength 0
   * @maxLength 500
   */
  Description?: string;
  EngineType: "microfocus" | "bluage";
  /**
   * The version of the runtime engine for the environment.
   * @pattern ^\S{1,10}$
   */
  EngineVersion?: string;
  /**
   * The Amazon Resource Name (ARN) of the runtime environment.
   * @pattern ^arn:(aws|aws-cn|aws-iso|aws-iso-[a-z]{1}|aws-us-gov):[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:([a-z]{2}-((iso[a-z]{0,1}-)|(gov-)){0,1}[a-z]+-[0-9]):[0-9]{12}:[A-Za-z0-9/][A-Za-z0-9:_/+=,@.-]{0,1023}$
   */
  EnvironmentArn?: string;
  /**
   * The unique identifier of the environment.
   * @pattern ^\S{1,80}$
   */
  EnvironmentId?: string;
  HighAvailabilityConfig?: {
    /**
     * @minimum 1
     * @maximum 100
     */
    DesiredCapacity: number;
  };
  /**
   * The type of instance underlying the environment.
   * @pattern ^\S{1,20}$
   */
  InstanceType: string;
  /**
   * The ID or the Amazon Resource Name (ARN) of the customer managed KMS Key used for encrypting
   * environment-related resources.
   * @maxLength 2048
   */
  KmsKeyId?: string;
  /**
   * The name of the environment.
   * @pattern ^[A-Za-z0-9][A-Za-z0-9_\-]{1,59}$
   */
  Name: string;
  NetworkType?: "ipv4" | "dual";
  /**
   * Configures a desired maintenance window for the environment. If you do not provide a value, a
   * random system-generated value will be assigned.
   * @pattern ^\S{1,50}$
   */
  PreferredMaintenanceWindow?: string;
  /** Specifies whether the environment is publicly accessible. */
  PubliclyAccessible?: boolean;
  /** The list of security groups for the VPC associated with this environment. */
  SecurityGroupIds?: string[];
  /** The storage configurations defined for the runtime environment. */
  StorageConfigurations?: (unknown | unknown)[];
  /** The unique identifiers of the subnets assigned to this runtime environment. */
  SubnetIds?: string[];
  /** Tags associated to this environment. */
  Tags?: Record<string, string>;
};
