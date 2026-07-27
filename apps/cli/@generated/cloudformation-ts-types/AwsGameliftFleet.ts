// This file is auto-generated. Do not edit manually.
// Source: aws-gamelift-fleet.json

/**
 * The AWS::GameLift::Fleet resource creates an Amazon GameLift (GameLift) fleet to host game servers.
 * A fleet is a set of EC2 or Anywhere instances, each of which can host multiple game sessions.
 */
export type AwsGameliftFleet = {
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
    Location?: string;
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
    /**
     * Current status of the scaling policy. The scaling policy can be in force only when in an ACTIVE
     * status. Scaling policies can be suspended for individual fleets. If the policy is suspended for a
     * fleet, the policy status does not change.
     * @enum ["ACTIVE","UPDATE_REQUESTED","UPDATING","DELETE_REQUESTED","DELETING","DELETED","ERROR"]
     */
    Status?: "ACTIVE" | "UPDATE_REQUESTED" | "UPDATING" | "DELETE_REQUESTED" | "DELETING" | "DELETED" | "ERROR";
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
    /**
     * The current status of the fleet's scaling policies in a requested fleet location. The status
     * PENDING_UPDATE indicates that an update was requested for the fleet but has not yet been completed
     * for the location.
     * @enum ["PENDING_UPDATE"]
     */
    UpdateStatus?: "PENDING_UPDATE";
  })[];
  /** Configuration for Anywhere fleet. */
  AnywhereConfiguration?: unknown;
  /**
   * Determines when and how to apply fleet or location capacities. Allowed options are ON_UPDATE
   * (default), ON_CREATE_AND_UPDATE and ON_CREATE_AND_UPDATE_WITH_AUTOSCALING. If you choose
   * ON_CREATE_AND_UPDATE_WITH_AUTOSCALING, MinSize and MaxSize will still be applied on creation and on
   * updates, but DesiredEC2Instances will only be applied once on fleet creation and will be ignored
   * during updates to prevent conflicts with auto-scaling. During updates with
   * ON_CREATE_AND_UPDATE_WITH_AUTOSCALING chosen, if current desired instance is lower than the new
   * MinSize, it will be increased to the new MinSize; if current desired instance is larger than the
   * new MaxSize, it will be decreased to the new MaxSize.
   * @enum ["ON_UPDATE","ON_CREATE_AND_UPDATE","ON_CREATE_AND_UPDATE_WITH_AUTOSCALING"]
   */
  ApplyCapacity?: "ON_UPDATE" | "ON_CREATE_AND_UPDATE" | "ON_CREATE_AND_UPDATE_WITH_AUTOSCALING";
  /**
   * Indicates whether to generate a TLS/SSL certificate for the new fleet. TLS certificates are used
   * for encrypting traffic between game clients and game servers running on GameLift. If this parameter
   * is not set, certificate generation is disabled. This fleet setting cannot be changed once the fleet
   * is created.
   */
  CertificateConfiguration?: {
    /** @enum ["DISABLED","GENERATED"] */
    CertificateType: "DISABLED" | "GENERATED";
  };
  /**
   * ComputeType to differentiate EC2 hardware managed by GameLift and Anywhere hardware managed by the
   * customer.
   * @enum ["EC2","ANYWHERE"]
   */
  ComputeType?: "EC2" | "ANYWHERE";
  /**
   * A human-readable description of a fleet.
   * @minLength 1
   * @maxLength 1024
   */
  Description?: string;
  /**
   * [DEPRECATED] The number of EC2 instances that you want this fleet to host. When creating a new
   * fleet, GameLift automatically sets this value to "1" and initiates a single instance. Once the
   * fleet is active, update this value to trigger GameLift to add or remove instances from the fleet.
   * @minimum 0
   */
  DesiredEC2Instances?: number;
  /**
   * A range of IP addresses and port settings that allow inbound traffic to connect to server processes
   * on an Amazon GameLift server.
   * @maxItems 50
   */
  EC2InboundPermissions?: ({
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
   * The name of an EC2 instance type that is supported in Amazon GameLift. A fleet instance type
   * determines the computing resources of each instance in the fleet, including CPU, memory, storage,
   * and networking capacity. Amazon GameLift supports the following EC2 instance types. See Amazon EC2
   * Instance Types for detailed descriptions.
   * @pattern ^.*..*$
   */
  EC2InstanceType?: string;
  /**
   * Indicates whether to use On-Demand instances or Spot instances for this fleet. If empty, the
   * default is ON_DEMAND. Both categories of instances use identical hardware and configurations based
   * on the instance type selected for this fleet.
   * @enum ["ON_DEMAND","SPOT"]
   */
  FleetType?: "ON_DEMAND" | "SPOT";
  /**
   * A unique identifier for an AWS IAM role that manages access to your AWS services. With an instance
   * role ARN set, any application that runs on an instance in this fleet can assume the role, including
   * install scripts, server processes, and daemons (background processes). Create a role or look up a
   * role's ARN from the IAM dashboard in the AWS Management Console.
   * @minLength 1
   * @pattern ^arn:aws(-.*)?:[a-z-]+:(([a-z]+-)+[0-9])?:([0-9]{12})?:[^.]+$
   */
  InstanceRoleARN?: string;
  /**
   * Credentials provider implementation that loads credentials from the Amazon EC2 Instance Metadata
   * Service.
   * @enum ["SHARED_CREDENTIAL_FILE"]
   */
  InstanceRoleCredentialsProvider?: "SHARED_CREDENTIAL_FILE";
  /**
   * @minItems 1
   * @maxItems 100
   */
  Locations?: {
    Location: string;
    LocationCapacity?: {
      /**
       * Defaults to MinSize if not defined. The number of EC2 instances you want to maintain in the
       * specified fleet location. This value must fall between the minimum and maximum size limits.
       * @minimum 0
       */
      DesiredEC2Instances?: number;
      /**
       * The minimum value allowed for the fleet's instance count for a location. When creating a new fleet,
       * GameLift automatically sets this value to "0". After the fleet is active, you can change this
       * value.
       * @minimum 0
       */
      MinSize: number;
      /**
       * The maximum value that is allowed for the fleet's instance count for a location. When creating a
       * new fleet, GameLift automatically sets this value to "1". Once the fleet is active, you can change
       * this value.
       * @minimum 0
       */
      MaxSize: number;
    };
  }[];
  /**
   * This parameter is no longer used. When hosting a custom game build, specify where Amazon GameLift
   * should store log files using the Amazon GameLift server API call ProcessReady()
   */
  LogPaths?: string[];
  /**
   * [DEPRECATED] The maximum value that is allowed for the fleet's instance count. When creating a new
   * fleet, GameLift automatically sets this value to "1". Once the fleet is active, you can change this
   * value.
   * @minimum 0
   */
  MaxSize?: number;
  /**
   * The name of an Amazon CloudWatch metric group. A metric group aggregates the metrics for all fleets
   * in the group. Specify a string containing the metric group name. You can use an existing name or
   * use a new name to create a new metric group. Currently, this parameter can have only one string.
   * @maxItems 1
   */
  MetricGroups?: string[];
  /**
   * [DEPRECATED] The minimum value allowed for the fleet's instance count. When creating a new fleet,
   * GameLift automatically sets this value to "0". After the fleet is active, you can change this
   * value.
   * @minimum 0
   */
  MinSize?: number;
  /**
   * A descriptive label that is associated with a fleet. Fleet names do not need to be unique.
   * @minLength 1
   * @maxLength 1024
   */
  Name: string;
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
   * A unique identifier for the AWS account with the VPC that you want to peer your Amazon GameLift
   * fleet with. You can find your account ID in the AWS Management Console under account settings.
   * @minLength 1
   * @maxLength 1024
   * @pattern ^[0-9]{12}$
   */
  PeerVpcAwsAccountId?: string;
  /**
   * A unique identifier for a VPC with resources to be accessed by your Amazon GameLift fleet. The VPC
   * must be in the same Region as your fleet. To look up a VPC ID, use the VPC Dashboard in the AWS
   * Management Console.
   * @minLength 1
   * @maxLength 1024
   * @pattern ^vpc-\S+
   */
  PeerVpcId?: string;
  /**
   * A policy that limits the number of game sessions an individual player can create over a span of
   * time for this fleet.
   */
  ResourceCreationLimitPolicy?: {
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
  /**
   * Unique fleet ID
   * @pattern ^fleet-\S+
   */
  FleetId?: string;
  /**
   * A unique identifier for a build to be deployed on the new fleet. If you are deploying the fleet
   * with a custom game build, you must specify this property. The build must have been successfully
   * uploaded to Amazon GameLift and be in a READY status. This fleet setting cannot be changed once the
   * fleet is created.
   * @pattern ^build-\S+|^arn:.*:build/build-\S+
   */
  BuildId?: string;
  /**
   * A unique identifier for a Realtime script to be deployed on a new Realtime Servers fleet. The
   * script must have been successfully uploaded to Amazon GameLift. This fleet setting cannot be
   * changed once the fleet is created.
   * Note: It is not currently possible to use the !Ref command to reference a script created with a
   * CloudFormation template for the fleet property ScriptId. Instead, use Fn::GetAtt Script.Arn or
   * Fn::GetAtt Script.Id to retrieve either of these properties as input for ScriptId. Alternatively,
   * enter a ScriptId string manually.
   * @pattern ^script-\S+|^arn:.*:script/script-\S+
   */
  ScriptId?: string;
  /**
   * Instructions for launching server processes on each instance in the fleet. Server processes run
   * either a custom game build executable or a Realtime script. The runtime configuration defines the
   * server executables or launch script file, launch parameters, and the number of processes to run
   * concurrently on each instance. When creating a fleet, the runtime configuration must have at least
   * one server process configuration; otherwise the request fails with an invalid request exception.
   * This parameter is required unless the parameters ServerLaunchPath and ServerLaunchParameters are
   * defined. Runtime configuration has replaced these parameters, but fleets that use them will
   * continue to work.
   */
  RuntimeConfiguration?: {
    /**
     * The maximum amount of time (in seconds) that a game session can remain in status ACTIVATING. If the
     * game session is not active before the timeout, activation is terminated and the game session status
     * is changed to TERMINATED.
     * @minimum 1
     * @maximum 600
     */
    GameSessionActivationTimeoutSeconds?: number;
    /**
     * The maximum number of game sessions with status ACTIVATING to allow on an instance simultaneously.
     * This setting limits the amount of instance resources that can be used for new game activations at
     * any one time.
     * @minimum 1
     * @maximum 2147483647
     */
    MaxConcurrentGameSessionActivations?: number;
    /**
     * A collection of server process configurations that describe which server processes to run on each
     * instance in a fleet.
     * @maxItems 50
     */
    ServerProcesses?: {
      /**
       * The number of server processes that use this configuration to run concurrently on an instance.
       * @minimum 1
       */
      ConcurrentExecutions: number;
      /**
       * The location of the server executable in a custom game build or the name of the Realtime script
       * file that contains the Init() function. Game builds and Realtime scripts are installed on instances
       * at the root:
       * Windows (for custom game builds only): C:\game. Example: "C:\game\MyGame\server.exe"
       * Linux: /local/game. Examples: "/local/game/MyGame/server.exe" or "/local/game/MyRealtimeScript.js"
       * @minLength 1
       * @maxLength 1024
       * @pattern ^([Cc]:\\game\S+|/local/game/\S+)
       */
      LaunchPath: string;
      /**
       * An optional list of parameters to pass to the server executable or Realtime script on launch.
       * @minLength 1
       * @maxLength 1024
       */
      Parameters?: string;
    }[];
  };
  /**
   * This parameter is no longer used but is retained for backward compatibility. Instead, specify
   * server launch parameters in the RuntimeConfiguration parameter. A request must specify either a
   * runtime configuration or values for both ServerLaunchParameters and ServerLaunchPath.
   * @minLength 1
   * @maxLength 1024
   */
  ServerLaunchParameters?: string;
  /**
   * This parameter is no longer used. Instead, specify a server launch path using the
   * RuntimeConfiguration parameter. Requests that specify a server launch path and launch parameters
   * instead of a runtime configuration will continue to work.
   * @minLength 1
   * @maxLength 1024
   */
  ServerLaunchPath?: string;
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
   * The Amazon Resource Name (ARN) that is assigned to a Amazon GameLift Servers Fleet resource and
   * uniquely identifies it. ARNs are unique across all Regions. In a GameLift Fleet ARN, the resource
   * ID matches the FleetId value.
   * @pattern ^arn:.*:fleet/[a-z]*fleet-[a-zA-Z0-9\-]+$
   */
  FleetArn?: string;
};
