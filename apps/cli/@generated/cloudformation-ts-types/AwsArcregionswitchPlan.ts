// This file is auto-generated. Do not edit manually.
// Source: aws-arcregionswitch-plan.json

/**
 * Represents a plan that specifies Regions, IAM roles, and workflows of logic required to perform the
 * desired change to your multi-Region application
 */
export type AwsArcregionswitchPlan = {
  /** @pattern ^arn:aws[a-zA-Z-]*:arc-region-switch::[0-9]{12}:plan/([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,30}[a-zA-Z0-9])?):([a-z0-9]{6})$ */
  Arn?: string;
  AssociatedAlarms?: Record<string, {
    /** @pattern ^arn:aws[a-zA-Z0-9-]*:iam::[0-9]{12}:role/.+$ */
    CrossAccountRole?: string;
    ExternalId?: string;
    ResourceIdentifier: string;
    AlarmType: "applicationHealth" | "trigger";
  }>;
  Description?: string;
  /** @pattern ^arn:aws[a-zA-Z0-9-]*:iam::[0-9]{12}:role/.+$ */
  ExecutionRole: string;
  /**
   * @minLength 1
   * @maxLength 32
   * @pattern ^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,30}[a-zA-Z0-9])?$
   */
  Name: string;
  /** @pattern ^\d{12}$ */
  Owner?: string;
  /** @pattern ^[a-z]{2}-[a-z-]+-\d+$ */
  PrimaryRegion?: string;
  RecoveryApproach: "activeActive" | "activePassive";
  /**
   * @minimum 1
   * @maximum 10080
   */
  RecoveryTimeObjectiveMinutes?: number;
  /**
   * @minItems 2
   * @maxItems 2
   */
  Regions: string[];
  Tags?: Record<string, string>;
  Triggers?: ({
    Description?: string;
    /** @pattern ^[a-z]{2}-[a-z-]+-\d+$ */
    TargetRegion: string;
    Action: "activate" | "deactivate";
    /**
     * @minItems 1
     * @maxItems 10
     */
    Conditions: ({
      AssociatedAlarmName: string;
      Condition: "red" | "green";
    })[];
    MinDelayMinutesBetweenExecutions: number;
  })[];
  Version?: string;
  Workflows: ({
    Steps?: ({
      Name: string;
      Description?: string;
      ExecutionBlockConfiguration: {
        CustomActionLambdaConfig: {
          /**
           * @default 60
           * @minimum 1
           */
          TimeoutMinutes?: number;
          /**
           * @minItems 1
           * @maxItems 2
           */
          Lambdas: {
            /** @pattern ^arn:aws[a-zA-Z0-9-]*:iam::[0-9]{12}:role/.+$ */
            CrossAccountRole?: string;
            ExternalId?: string;
            Arn?: string;
          }[];
          RetryIntervalMinutes: number;
          RegionToRun: "activatingRegion" | "deactivatingRegion";
          Ungraceful?: {
            Behavior?: "skip" & unknown;
          };
        };
      } | {
        Ec2AsgCapacityIncreaseConfig: {
          /**
           * @default 60
           * @minimum 1
           */
          TimeoutMinutes?: number;
          /**
           * @minItems 2
           * @maxItems 2
           */
          Asgs: {
            /** @pattern ^arn:aws[a-zA-Z0-9-]*:iam::[0-9]{12}:role/.+$ */
            CrossAccountRole?: string;
            ExternalId?: string;
            /** @pattern ^arn:aws:autoscaling:[a-z0-9-]+:\d{12}:autoScalingGroup:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:autoScalingGroupName/[\S\s]{1,255}$ */
            Arn?: string;
          }[];
          Ungraceful?: {
            /**
             * @minimum 0
             * @maximum 99
             */
            MinimumSuccessPercentage: number;
          };
          /** @default 100 */
          TargetPercent?: number;
          CapacityMonitoringApproach?: "sampledMaxInLast24Hours" | "autoscalingMaxInLast24Hours" & unknown;
        };
      } | {
        ExecutionApprovalConfig: {
          /**
           * @default 60
           * @minimum 1
           */
          TimeoutMinutes?: number;
          ApprovalRole: string;
        };
      } | {
        ArcRoutingControlConfig: {
          /**
           * @default 60
           * @minimum 1
           */
          TimeoutMinutes?: number;
          /** @pattern ^arn:aws[a-zA-Z0-9-]*:iam::[0-9]{12}:role/.+$ */
          CrossAccountRole?: string;
          ExternalId?: string;
          RegionAndRoutingControls: Record<string, ({
            RoutingControlArn: string;
            State: "On" | "Off";
          })[]>;
        };
      } | {
        GlobalAuroraConfig: {
          /**
           * @default 60
           * @minimum 1
           */
          TimeoutMinutes?: number;
          /** @pattern ^arn:aws[a-zA-Z0-9-]*:iam::[0-9]{12}:role/.+$ */
          CrossAccountRole?: string;
          ExternalId?: string;
          Behavior: "switchoverOnly" | "failover" & unknown;
          Ungraceful?: {
            Ungraceful?: "failover";
          };
          GlobalClusterIdentifier: string;
          DatabaseClusterArns: string[];
        };
      } | {
        ParallelConfig: {
          Steps: unknown[];
        };
      } | {
        RegionSwitchPlanConfig: {
          /** @pattern ^arn:aws[a-zA-Z0-9-]*:iam::[0-9]{12}:role/.+$ */
          CrossAccountRole?: string;
          ExternalId?: string;
          /** @pattern ^arn:aws[a-zA-Z-]*:arc-region-switch::[0-9]{12}:plan/([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,30}[a-zA-Z0-9])?):([a-z0-9]{6})$ */
          Arn: string;
        };
      } | {
        EcsCapacityIncreaseConfig: {
          /**
           * @default 60
           * @minimum 1
           */
          TimeoutMinutes?: number;
          /**
           * @minItems 2
           * @maxItems 2
           */
          Services: {
            /** @pattern ^arn:aws[a-zA-Z0-9-]*:iam::[0-9]{12}:role/.+$ */
            CrossAccountRole?: string;
            ExternalId?: string;
            /** @pattern ^arn:aws:ecs:[a-z0-9-]+:\d{12}:cluster/[a-zA-Z0-9_-]{1,255}$ */
            ClusterArn?: string;
            /** @pattern ^arn:aws:ecs:[a-z0-9-]+:\d{12}:service/[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]{1,255}$ */
            ServiceArn?: string;
          }[];
          Ungraceful?: {
            /**
             * @minimum 0
             * @maximum 99
             */
            MinimumSuccessPercentage: number;
          };
          /** @default 100 */
          TargetPercent?: number;
          CapacityMonitoringApproach?: "sampledMaxInLast24Hours" | "containerInsightsMaxInLast24Hours" & unknown;
        };
      } | {
        EksResourceScalingConfig: {
          /**
           * @default 60
           * @minimum 1
           */
          TimeoutMinutes?: number;
          KubernetesResourceType: {
            ApiVersion: string;
            Kind: string;
          };
          /** @minItems 1 */
          ScalingResources?: Record<string, Record<string, {
            /** @pattern ^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$ */
            Namespace: string;
            Name: string;
            HpaName?: string;
          }>>[];
          /** @minItems 2 */
          EksClusters?: {
            /** @pattern ^arn:aws[a-zA-Z0-9-]*:iam::[0-9]{12}:role/.+$ */
            CrossAccountRole?: string;
            ExternalId?: string;
            /** @pattern ^arn:aws[a-zA-Z-]*:eks:[a-z0-9-]+:\d{12}:cluster/[a-zA-Z0-9][a-zA-Z0-9-_]{0,99}$ */
            ClusterArn: string;
          }[];
          Ungraceful?: {
            /**
             * @minimum 0
             * @maximum 99
             */
            MinimumSuccessPercentage: number;
          };
          /**
           * @default 100
           * @minimum 1
           */
          TargetPercent?: number;
          CapacityMonitoringApproach?: "sampledMaxInLast24Hours" & unknown;
        };
      } | {
        Route53HealthCheckConfig: {
          /**
           * @default 60
           * @minimum 1
           */
          TimeoutMinutes?: number;
          /** @pattern ^arn:aws[a-zA-Z0-9-]*:iam::[0-9]{12}:role/.+$ */
          CrossAccountRole?: string;
          ExternalId?: string;
          /**
           * @minLength 1
           * @maxLength 32
           */
          HostedZoneId: string;
          /**
           * @minLength 1
           * @maxLength 1024
           */
          RecordName: string;
          RecordSets?: {
            /**
             * @minLength 1
             * @maxLength 1024
             */
            RecordSetIdentifier?: string;
            /** @pattern ^[a-z]{2}-[a-z-]+-\d+$ */
            Region?: string;
          }[];
        };
      };
      ExecutionBlockType: "CustomActionLambda" | "ManualApproval" | "AuroraGlobalDatabase" | "EC2AutoScaling" | "ARCRoutingControl" | "ARCRegionSwitchPlan" | "Parallel" | "ECSServiceScaling" | "EKSResourceScaling" | "Route53HealthCheck";
    })[];
    WorkflowTargetAction: "activate" | "deactivate";
    /** @pattern ^[a-z]{2}-[a-z-]+-\d+$ */
    WorkflowTargetRegion?: string;
    WorkflowDescription?: string;
  })[];
  HealthChecksForPlan?: Record<string, {
    HealthCheckId?: string;
    Region?: string;
  }[]>;
  Route53HealthChecks?: {
    HealthCheckIds?: string[];
    RecordNames?: string[];
    Regions?: string[];
    HostedZoneIds?: string[];
  };
  PlanHealthChecks?: string[];
};
