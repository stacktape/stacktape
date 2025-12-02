// This file is auto-generated. Do not edit manually.
// Source: aws-gamelift-gameservergroup.json

/** The AWS::GameLift::GameServerGroup resource creates an Amazon GameLift (GameLift) GameServerGroup. */
export type AwsGameliftGameservergroup = {
  /**
   * A generated unique ID for the EC2 Auto Scaling group that is associated with this game server
   * group.
   */
  AutoScalingGroupArn?: string;
  /**
   * Configuration settings to define a scaling policy for the Auto Scaling group that is optimized for
   * game hosting. Updating this game server group property will not take effect for the created EC2
   * Auto Scaling group, please update the EC2 Auto Scaling group directly after creating the resource.
   */
  AutoScalingPolicy?: {
    EstimatedInstanceWarmup?: number;
    TargetTrackingConfiguration: {
      TargetValue: number;
    };
  };
  /**
   * The fallback balancing method to use for the game server group when Spot Instances in a Region
   * become unavailable or are not viable for game hosting.
   */
  BalancingStrategy?: "SPOT_ONLY" | "SPOT_PREFERRED" | "ON_DEMAND_ONLY";
  /** The type of delete to perform. */
  DeleteOption?: "SAFE_DELETE" | "FORCE_DELETE" | "RETAIN";
  /** A generated unique ID for the game server group. */
  GameServerGroupArn?: string;
  /** An identifier for the new game server group. */
  GameServerGroupName: string;
  /**
   * A flag that indicates whether instances in the game server group are protected from early
   * termination.
   */
  GameServerProtectionPolicy?: "NO_PROTECTION" | "FULL_PROTECTION";
  /** A set of EC2 instance types to use when creating instances in the group. */
  InstanceDefinitions: {
    InstanceType: string;
    WeightedCapacity?: string;
  }[];
  /**
   * The EC2 launch template that contains configuration settings and game server code to be deployed to
   * all instances in the game server group. Updating this game server group property will not take
   * effect for the created EC2 Auto Scaling group, please update the EC2 Auto Scaling group directly
   * after creating the resource.
   */
  LaunchTemplate?: {
    LaunchTemplateId?: string;
    LaunchTemplateName?: string;
    Version?: string;
  };
  /**
   * The maximum number of instances allowed in the EC2 Auto Scaling group. Updating this game server
   * group property will not take effect for the created EC2 Auto Scaling group, please update the EC2
   * Auto Scaling group directly after creating the resource.
   */
  MaxSize?: number;
  /**
   * The minimum number of instances allowed in the EC2 Auto Scaling group. Updating this game server
   * group property will not take effect for the created EC2 Auto Scaling group, please update the EC2
   * Auto Scaling group directly after creating the resource.
   */
  MinSize?: number;
  /**
   * The Amazon Resource Name (ARN) for an IAM role that allows Amazon GameLift to access your EC2 Auto
   * Scaling groups.
   */
  RoleArn: string;
  /**
   * A list of labels to assign to the new game server group resource. Updating game server group tags
   * with CloudFormation will not take effect. Please update this property using AWS GameLift APIs
   * instead.
   */
  Tags?: {
    /** The key for a developer-defined key:value pair for tagging an AWS resource. */
    Key?: string;
    /** The value for a developer-defined key:value pair for tagging an AWS resource. */
    Value?: string;
  }[];
  /**
   * A list of virtual private cloud (VPC) subnets to use with instances in the game server group.
   * Updating this game server group property will not take effect for the created EC2 Auto Scaling
   * group, please update the EC2 Auto Scaling group directly after creating the resource.
   */
  VpcSubnets?: string[];
};
