// This file is auto-generated. Do not edit manually.
// Source: aws-gamelift-containerfleet.json

/**
 * The AWS::GameLift::ContainerFleet resource creates an Amazon GameLift (GameLift) container fleet to
 * host game servers.
 */
export type AwsGameliftContainerfleet = {
  /**
   * Unique fleet ID
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-z]*fleet-[a-zA-Z0-9\-]+
   */
  FleetId?: string;
  /**
   * A unique identifier for an AWS IAM role that manages access to your AWS services. Create a role or
   * look up a role's ARN from the IAM dashboard in the AWS Management Console.
   * @minLength 1
   * @maxLength 256
   * @pattern ^arn:aws(-.*)?:[a-z-]+:(([a-z]+-)+[0-9])?:([0-9]{12})?:[^.]+$
   */
  FleetRoleArn: string;
  /**
   * A human-readable description of a fleet.
   * @minLength 1
   * @maxLength 1024
   */
  Description?: string;
  /**
   * The name of the container group definition that will be created per game server. You must specify
   * GAME_SERVER container group. You have the option to also specify one PER_INSTANCE container group.
   * @minLength 1
   * @maxLength 512
   * @pattern ^[a-zA-Z0-9\-]+$|^arn:.*:containergroupdefinition\/[a-zA-Z0-9\-]+(:[0-9]+)?$
   */
  GameServerContainerGroupDefinitionName?: string;
  /**
   * The Amazon Resource Name (ARN) of the game server container group definition. This field will be
   * empty if GameServerContainerGroupDefinitionName is not specified.
   * @maxLength 512
   * @pattern ^arn:.*:containergroupdefinition\/[a-zA-Z0-9\-]+(:[0-9]+)?$|^$
   */
  GameServerContainerGroupDefinitionArn?: string;
  /**
   * The name of the container group definition that will be created per instance. This field is
   * optional if you specify GameServerContainerGroupDefinitionName.
   * @minLength 1
   * @maxLength 512
   * @pattern ^[a-zA-Z0-9\-]+$|^arn:.*:containergroupdefinition\/[a-zA-Z0-9\-]+(:[0-9]+)?$
   */
  PerInstanceContainerGroupDefinitionName?: string;
  /**
   * The Amazon Resource Name (ARN) of the per instance container group definition. This field will be
   * empty if PerInstanceContainerGroupDefinitionName is not specified.
   * @maxLength 512
   * @pattern ^arn:.*:containergroupdefinition\/[a-zA-Z0-9\-]+(:[0-9]+)?$|^$
   */
  PerInstanceContainerGroupDefinitionArn?: string;
  InstanceConnectionPortRange?: {
    /**
     * A starting value for a range of allowed port numbers.
     * @minimum 1
     * @maximum 60000
     */
    FromPort: number;
    /**
     * An ending value for a range of allowed port numbers. Port numbers are end-inclusive. This value
     * must be higher than FromPort.
     * @minimum 1
     * @maximum 60000
     */
    ToPort: number;
  };
  /**
   * A range of IP addresses and port settings that allow inbound traffic to connect to server processes
   * on an Amazon GameLift server.
   * @maxItems 50
   */
  InstanceInboundPermissions?: ({
    /**
     * A starting value for a range of allowed port numbers.
     * @minimum 1
     * @maximum 60000
     */
    FromPort: number;
    /**
     * A range of allowed IP addresses. This value must be expressed in CIDR notation. Example:
     * "000.000.000.000/[subnet mask]" or optionally the shortened version "0.0.0.0/[subnet mask]".
     * @pattern (^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(/([0-9]|[1-2][0-9]|3[0-2]))$)
     */
    IpRange: string;
    /**
     * The network communication protocol used by the fleet.
     * @enum ["TCP","UDP"]
     */
    Protocol: "TCP" | "UDP";
    /**
     * An ending value for a range of allowed port numbers. Port numbers are end-inclusive. This value
     * must be higher than FromPort.
     * @minimum 1
     * @maximum 60000
     */
    ToPort: number;
  })[];
  /**
   * The number of desired game server container groups per instance, a number between 1-5000.
   * @minimum 1
   * @maximum 5000
   */
  GameServerContainerGroupsPerInstance?: number;
  /**
   * The maximum number of game server container groups per instance, a number between 1-5000.
   * @minimum 1
   * @maximum 5000
   */
  MaximumGameServerContainerGroupsPerInstance?: number;
  /**
   * A time stamp indicating when this data object was created. Format is a number expressed in Unix
   * time as milliseconds (for example "1469498468.057").
   */
  CreationTime?: string;
  /**
   * The current status of the container fleet.
   * @enum ["PENDING","CREATING","CREATED","ACTIVATING","ACTIVE","UPDATING","DELETING"]
   */
  Status?: "PENDING" | "CREATING" | "CREATED" | "ACTIVATING" | "ACTIVE" | "UPDATING" | "DELETING";
  DeploymentDetails?: {
    /**
     * The ID of the last deployment on the container fleet. This field will be empty if the container
     * fleet does not have a ContainerGroupDefinition attached.
     * @maxLength 1024
     * @pattern ^[a-zA-Z0-9\-]+$|^$
     */
    LatestDeploymentId?: string;
  };
  DeploymentConfiguration?: {
    /**
     * The protection strategy for deployment on the container fleet; defaults to WITH_PROTECTION.
     * @enum ["WITH_PROTECTION","IGNORE_PROTECTION"]
     */
    ProtectionStrategy?: "WITH_PROTECTION" | "IGNORE_PROTECTION";
    /**
     * The minimum percentage of healthy required; defaults to 75.
     * @minimum 30
     * @maximum 75
     */
    MinimumHealthyPercentage?: number;
    /**
     * The strategy to apply in case of impairment; defaults to MAINTAIN.
     * @enum ["MAINTAIN","ROLLBACK"]
     */
    ImpairmentStrategy?: "MAINTAIN" | "ROLLBACK";
  };
  /**
   * The name of an EC2 instance type that is supported in Amazon GameLift. A fleet instance type
   * determines the computing resources of each instance in the fleet, including CPU, memory, storage,
   * and networking capacity. Amazon GameLift supports the following EC2 instance types. See Amazon EC2
   * Instance Types for detailed descriptions.
   * @minLength 1
   * @maxLength 1024
   */
  InstanceType?: string;
  /**
   * Indicates whether to use On-Demand instances or Spot instances for this fleet. If empty, the
   * default is ON_DEMAND. Both categories of instances use identical hardware and configurations based
   * on the instance type selected for this fleet.
   * @enum ["ON_DEMAND","SPOT"]
   */
  BillingType?: "ON_DEMAND" | "SPOT";
  /** @maxItems 100 */
  Locations?: {
    Location: string;
    LocationCapacity?: {
      /**
       * Defaults to MinSize if not defined. The number of EC2 instances you want to maintain in the
       * specified fleet location. This value must fall between the minimum and maximum size limits. If any
       * auto-scaling policy is defined for the container fleet, the desired instance will only be applied
       * once during fleet creation and will be ignored in updates to avoid conflicts with auto-scaling.
       * During updates with any auto-scaling policy defined, if current desired instance is lower than the
       * new MinSize, it will be increased to the new MinSize; if current desired instance is larger than
       * the new MaxSize, it will be decreased to the new MaxSize.
       * @minimum 0
       */
      DesiredEC2Instances?: number;
      /**
       * The minimum value allowed for the fleet's instance count for a location.
       * @minimum 0
       */
      MinSize: number;
      /**
       * The maximum value that is allowed for the fleet's instance count for a location.
       * @minimum 0
       */
      MaxSize: number;
    };
    StoppedActions?: "AUTO_SCALING"[];
  }[];
  /**
   * A list of rules that control how a fleet is scaled.
   * @maxItems 50
   */
  ScalingPolicies?: ({
    /**
     * Comparison operator to use when measuring a metric against the threshold value.
     * @enum ["GreaterThanOrEqualToThreshold","GreaterThanThreshold","LessThanThreshold","LessThanOrEqualToThreshold"]
     */
    ComparisonOperator?: "GreaterThanOrEqualToThreshold" | "GreaterThanThreshold" | "LessThanThreshold" | "LessThanOrEqualToThreshold";
    /**
     * Length of time (in minutes) the metric must be at or beyond the threshold before a scaling event is
     * triggered.
     * @minimum 1
     */
    EvaluationPeriods?: number;
    /**
     * Name of the Amazon GameLift-defined metric that is used to trigger a scaling adjustment.
     * @enum ["ActivatingGameSessions","ActiveGameSessions","ActiveInstances","AvailableGameSessions","AvailablePlayerSessions","CurrentPlayerSessions","IdleInstances","PercentAvailableGameSessions","PercentIdleInstances","QueueDepth","WaitTime","ConcurrentActivatableGameSessions"]
     */
    MetricName: "ActivatingGameSessions" | "ActiveGameSessions" | "ActiveInstances" | "AvailableGameSessions" | "AvailablePlayerSessions" | "CurrentPlayerSessions" | "IdleInstances" | "PercentAvailableGameSessions" | "PercentIdleInstances" | "QueueDepth" | "WaitTime" | "ConcurrentActivatableGameSessions";
    /**
     * A descriptive label that is associated with a fleet's scaling policy. Policy names do not need to
     * be unique.
     * @minLength 1
     * @maxLength 1024
     */
    Name: string;
    /**
     * The type of scaling policy to create. For a target-based policy, set the parameter MetricName to
     * 'PercentAvailableGameSessions' and specify a TargetConfiguration. For a rule-based policy set the
     * following parameters: MetricName, ComparisonOperator, Threshold, EvaluationPeriods,
     * ScalingAdjustmentType, and ScalingAdjustment.
     * @enum ["RuleBased","TargetBased"]
     */
    PolicyType?: "RuleBased" | "TargetBased";
    /** Amount of adjustment to make, based on the scaling adjustment type. */
    ScalingAdjustment?: number;
    /**
     * The type of adjustment to make to a fleet's instance count.
     * @enum ["ChangeInCapacity","ExactCapacity","PercentChangeInCapacity"]
     */
    ScalingAdjustmentType?: "ChangeInCapacity" | "ExactCapacity" | "PercentChangeInCapacity";
    /** An object that contains settings for a target-based scaling policy. */
    TargetConfiguration?: {
      /**
       * Desired value to use with a target-based scaling policy. The value must be relevant for whatever
       * metric the scaling policy is using. For example, in a policy using the metric
       * PercentAvailableGameSessions, the target value should be the preferred size of the fleet's buffer
       * (the percent of capacity that should be idle and ready for new game sessions).
       */
      TargetValue: number;
    };
    /** Metric value used to trigger a scaling event. */
    Threshold?: number;
  })[];
  /**
   * The name of an Amazon CloudWatch metric group. A metric group aggregates the metrics for all fleets
   * in the group. Specify a string containing the metric group name. You can use an existing name or
   * use a new name to create a new metric group. Currently, this parameter can have only one string.
   * @maxItems 1
   */
  MetricGroups?: string[];
  /**
   * A game session protection policy to apply to all game sessions hosted on instances in this fleet.
   * When protected, active game sessions cannot be terminated during a scale-down event. If this
   * parameter is not set, instances in this fleet default to no protection. You can change a fleet's
   * protection policy to affect future game sessions on the fleet. You can also set protection for
   * individual game sessions.
   * @enum ["FullProtection","NoProtection"]
   */
  NewGameSessionProtectionPolicy?: "FullProtection" | "NoProtection";
  /**
   * A policy that limits the number of game sessions an individual player can create over a span of
   * time for this fleet.
   */
  GameSessionCreationLimitPolicy?: {
    /**
     * The maximum number of game sessions that an individual can create during the policy period.
     * @minimum 0
     */
    NewGameSessionsPerCreator?: number;
    /**
     * The time span used in evaluating the resource creation limit policy.
     * @minimum 0
     */
    PolicyPeriodInMinutes?: number;
  };
  LogConfiguration?: {
    LogDestination?: "NONE" | "CLOUDWATCH" | "S3";
    /**
     * If log destination is CLOUDWATCH, logs are sent to the specified log group in Amazon CloudWatch.
     * @minLength 1
     * @maxLength 512
     * @pattern [a-zA-Z0-9:/\-\*]+
     */
    LogGroupArn?: string;
    /**
     * The name of the S3 bucket to pull logs from if S3 is the LogDestination
     * @minLength 1
     * @maxLength 1024
     */
    S3BucketName?: string;
  };
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /**
   * The Amazon Resource Name (ARN) that is assigned to a Amazon GameLift container fleet resource and
   * uniquely identifies it across all AWS Regions.
   * @minLength 1
   * @maxLength 512
   * @pattern ^arn:.*:[a-z]*fleet\/[a-z]*fleet-[a-zA-Z0-9\-]+$
   */
  FleetArn?: string;
};
