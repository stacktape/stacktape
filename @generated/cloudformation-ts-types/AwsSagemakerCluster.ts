// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-cluster.json

/** Resource Type definition for AWS::SageMaker::Cluster */
export type AwsSagemakerCluster = {
  /**
   * The Amazon Resource Name (ARN) of the HyperPod Cluster.
   * @maxLength 256
   * @pattern ^arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:cluster/[a-z0-9]{12}$
   */
  ClusterArn?: string;
  VpcConfig?: {
    /**
     * The ID of the subnets in the VPC to which you want to connect your training job or model.
     * @minItems 1
     * @maxItems 16
     */
    Subnets: string[];
    /**
     * The VPC security group IDs, in the form sg-xxxxxxxx. Specify the security groups for the VPC that
     * is specified in the Subnets field.
     * @minItems 1
     * @maxItems 5
     */
    SecurityGroupIds: string[];
  };
  /**
   * If node auto-recovery is set to true, faulty nodes will be replaced or rebooted when a failure is
   * detected. If set to false, nodes will be labelled when a fault is detected.
   * @enum ["Automatic","None"]
   */
  NodeRecovery?: "Automatic" | "None";
  InstanceGroups?: ({
    CapacityRequirements?: {
      Spot?: Record<string, unknown>;
      OnDemand?: Record<string, unknown>;
    };
    InstanceGroupName: string;
    InstanceStorageConfigs?: {
      EbsVolumeConfig?: {
        /**
         * The size in gigabytes (GB) of the additional EBS volume to be attached to the instances in the
         * SageMaker HyperPod cluster instance group. The additional EBS volume is attached to each instance
         * within the SageMaker HyperPod cluster instance group and mounted to /opt/sagemaker.
         * @minimum 1
         * @maximum 16384
         */
        VolumeSizeInGB?: number;
        /**
         * @minLength 0
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9:/_-]*$
         */
        VolumeKmsKeyId?: string;
        RootVolume?: boolean;
      };
    }[];
    KubernetesConfig?: {
      Labels?: Record<string, string>;
      Taints?: ({
        /** The value of the taint. */
        Value?: string;
        /**
         * The effect of the taint.
         * @enum ["NoSchedule","PreferNoSchedule","NoExecute"]
         */
        Effect: "NoSchedule" | "PreferNoSchedule" | "NoExecute";
        /** The key of the taint. */
        Key: string;
      })[];
    };
    LifeCycleConfig: {
      /**
       * An Amazon S3 bucket path where your lifecycle scripts are stored.
       * @maxLength 1024
       * @pattern ^(https|s3)://([^/]+)/?(.*)$
       */
      SourceS3Uri: string;
      /**
       * The file name of the entrypoint script of lifecycle scripts under SourceS3Uri. This entrypoint
       * script runs during cluster creation.
       * @minLength 1
       * @maxLength 128
       * @pattern ^[\S\s]+$
       */
      OnCreate: string;
    };
    /**
     * The Amazon Resource Name (ARN) of the training plan to use for this cluster instance group. For
     * more information about how to reserve GPU capacity for your SageMaker HyperPod clusters using
     * Amazon SageMaker Training Plan, see CreateTrainingPlan.
     * @minLength 50
     * @maxLength 2048
     * @pattern ^arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:training-plan/.*$
     */
    TrainingPlanArn?: string;
    /**
     * The number you specified to TreadsPerCore in CreateCluster for enabling or disabling
     * multithreading. For instance types that support multithreading, you can specify 1 for disabling
     * multithreading and 2 for enabling multithreading.
     * @minimum 1
     * @maximum 2
     */
    ThreadsPerCore?: number;
    OverrideVpcConfig?: {
      /**
       * The ID of the subnets in the VPC to which you want to connect your training job or model.
       * @minItems 1
       * @maxItems 16
       */
      Subnets: string[];
      /**
       * The VPC security group IDs, in the form sg-xxxxxxxx. Specify the security groups for the VPC that
       * is specified in the Subnets field.
       * @minItems 1
       * @maxItems 5
       */
      SecurityGroupIds: string[];
    };
    /**
     * The number of instances you specified to add to the instance group of a SageMaker HyperPod cluster.
     * @minimum 0
     */
    InstanceCount: number;
    OnStartDeepHealthChecks?: ("InstanceStress" | "InstanceConnectivity")[];
    ImageId?: string;
    /**
     * The number of instances that are currently in the instance group of a SageMaker HyperPod cluster.
     * @minimum 0
     */
    CurrentCount?: number;
    ScheduledUpdateConfig?: {
      /**
       * A cron expression that specifies the schedule that SageMaker follows when updating the AMI.
       * @minLength 1
       * @maxLength 256
       * @pattern cron\((?:[0-5][0-9]|[0-9]|) (?:[01][0-9]|2[0-3]|[0-9]) (?:[1-9]|0[1-9]|[12][0-9]|3[01]|\?) (?:[1-9]|0[1-9]|1[0-2]|\*|\*/(?:[1-9]|1[0-2])|) (?:MON|TUE|WED|THU|FRI|SAT|SUN|[1-7]|\?|L|(?:[1-7]#[1-5])|(?:[1-7]L)) (?:20[2-9][0-9]|\*|)\)
       */
      ScheduleExpression: string;
      DeploymentConfig?: {
        AutoRollbackConfiguration?: {
          /**
           * The name of the alarm.
           * @minLength 1
           * @maxLength 256
           * @pattern (?!\s*$).+
           */
          AlarmName: string;
        }[];
        RollingUpdatePolicy?: {
          MaximumBatchSize: {
            /**
             * Specifies whether SageMaker should process the update by amount or percentage of instances.
             * @pattern INSTANCE_COUNT|CAPACITY_PERCENTAGE
             */
            Type: string;
            /**
             * Specifies the amount or percentage of instances SageMaker updates at a time.
             * @minimum 1
             */
            Value: number;
          };
          RollbackMaximumBatchSize?: {
            /**
             * Specifies whether SageMaker should process the update by amount or percentage of instances.
             * @pattern INSTANCE_COUNT|CAPACITY_PERCENTAGE
             */
            Type: string;
            /**
             * Specifies the amount or percentage of instances SageMaker updates at a time.
             * @minimum 1
             */
            Value: number;
          };
        };
        /**
         * The duration in seconds that SageMaker waits before updating more instances in the cluster.
         * @minimum 0
         * @maximum 3600
         */
        WaitIntervalInSeconds?: number;
      };
    };
    InstanceType: string;
    ExecutionRole: string;
  })[];
  RestrictedInstanceGroups?: ({
    OverrideVpcConfig?: {
      /**
       * The ID of the subnets in the VPC to which you want to connect your training job or model.
       * @minItems 1
       * @maxItems 16
       */
      Subnets: string[];
      /**
       * The VPC security group IDs, in the form sg-xxxxxxxx. Specify the security groups for the VPC that
       * is specified in the Subnets field.
       * @minItems 1
       * @maxItems 5
       */
      SecurityGroupIds: string[];
    };
    /**
     * The number of instances you specified to add to the restricted instance group of a SageMaker
     * HyperPod cluster.
     * @minimum 0
     */
    InstanceCount: number;
    OnStartDeepHealthChecks?: ("InstanceStress" | "InstanceConnectivity")[];
    EnvironmentConfig: {
      FSxLustreConfig?: {
        /**
         * The storage capacity of the FSx for Lustre file system, specified in gibibytes (GiB).
         * @minimum 1200
         * @maximum 100800
         */
        SizeInGiB: number;
        /**
         * The throughput capacity of the FSx for Lustre file system, measured in MB/s per TiB of storage.
         * @minimum 125
         * @maximum 1000
         */
        PerUnitStorageThroughput: number;
      };
    };
    InstanceGroupName: string;
    InstanceStorageConfigs?: {
      EbsVolumeConfig?: {
        /**
         * The size in gigabytes (GB) of the additional EBS volume to be attached to the instances in the
         * SageMaker HyperPod cluster instance group. The additional EBS volume is attached to each instance
         * within the SageMaker HyperPod cluster instance group and mounted to /opt/sagemaker.
         * @minimum 1
         * @maximum 16384
         */
        VolumeSizeInGB?: number;
        /**
         * @minLength 0
         * @maxLength 2048
         * @pattern ^[a-zA-Z0-9:/_-]*$
         */
        VolumeKmsKeyId?: string;
        RootVolume?: boolean;
      };
    }[];
    /**
     * The number of instances that are currently in the restricted instance group of a SageMaker HyperPod
     * cluster.
     * @minimum 0
     */
    CurrentCount?: number;
    /**
     * The Amazon Resource Name (ARN) of the training plan to use for this cluster restricted instance
     * group. For more information about how to reserve GPU capacity for your SageMaker HyperPod clusters
     * using Amazon SageMaker Training Plan, see CreateTrainingPlan.
     * @minLength 50
     * @maxLength 2048
     * @pattern ^arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:training-plan/.*$
     */
    TrainingPlanArn?: string;
    InstanceType: string;
    /**
     * The number you specified to TreadsPerCore in CreateCluster for enabling or disabling
     * multithreading. For instance types that support multithreading, you can specify 1 for disabling
     * multithreading and 2 for enabling multithreading.
     * @minimum 1
     * @maximum 2
     */
    ThreadsPerCore?: number;
    ExecutionRole: string;
  })[];
  Orchestrator?: {
    Eks: {
      /** The ARN of the EKS cluster, such as arn:aws:eks:us-west-2:123456789012:cluster/my-eks-cluster */
      ClusterArn: string;
    };
  };
  /**
   * The cluster role for the autoscaler to assume.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[a-z\-]*:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$
   */
  ClusterRole?: string;
  /**
   * Determines the scaling strategy for the SageMaker HyperPod cluster. When set to 'Continuous',
   * enables continuous scaling which dynamically manages node provisioning. If the parameter is
   * omitted, uses the standard scaling approach in previous release.
   * @enum ["Continuous"]
   */
  NodeProvisioningMode?: "Continuous";
  /** The time at which the HyperPod cluster was created. */
  CreationTime?: string;
  /**
   * The name of the HyperPod Cluster.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$
   */
  ClusterName?: string;
  /** The failure message of the HyperPod Cluster. */
  FailureMessage?: string;
  AutoScaling?: {
    /**
     * The auto-scaling mode for the cluster
     * @enum ["Enable","Disable"]
     */
    Mode: "Enable" | "Disable";
    /**
     * The type of auto-scaler to use
     * @default "Karpenter"
     * @enum ["Karpenter"]
     */
    AutoScalerType?: "Karpenter";
  };
  /**
   * The status of the HyperPod Cluster.
   * @enum ["Creating","Deleting","Failed","InService","RollingBack","SystemUpdating","Updating"]
   */
  ClusterStatus?: "Creating" | "Deleting" | "Failed" | "InService" | "RollingBack" | "SystemUpdating" | "Updating";
  /**
   * Custom tags for managing the SageMaker HyperPod cluster as an AWS resource. You can add tags to
   * your cluster in the same way you add them in other AWS services that support tagging.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
  }[];
  TieredStorageConfig?: {
    /**
     * The mode of tiered storage.
     * @enum ["Enable","Disable"]
     */
    Mode: "Enable" | "Disable";
    /** The percentage of instance memory to allocate for tiered storage. */
    InstanceMemoryAllocationPercentage?: number;
  };
};
