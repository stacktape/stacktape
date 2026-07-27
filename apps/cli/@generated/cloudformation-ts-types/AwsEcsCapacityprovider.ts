// This file is auto-generated. Do not edit manually.
// Source: aws-ecs-capacityprovider.json

/** Resource Type definition for AWS::ECS::CapacityProvider. */
export type AwsEcsCapacityprovider = {
  AutoScalingGroupProvider?: {
    ManagedScaling?: {
      /** @enum ["DISABLED","ENABLED"] */
      Status?: "DISABLED" | "ENABLED";
      MinimumScalingStepSize?: number;
      InstanceWarmupPeriod?: number;
      TargetCapacity?: number;
      MaximumScalingStepSize?: number;
    };
    AutoScalingGroupArn: string;
    /** @enum ["DISABLED","ENABLED"] */
    ManagedTerminationProtection?: "DISABLED" | "ENABLED";
    /** @enum ["DISABLED","ENABLED"] */
    ManagedDraining?: "DISABLED" | "ENABLED";
  };
  ClusterName?: string;
  Tags?: {
    /** @minLength 1 */
    Value?: string;
    /** @minLength 1 */
    Key?: string;
  }[];
  Name?: string;
  ManagedInstancesProvider?: {
    InfrastructureRoleArn: string;
    /** @enum ["CAPACITY_PROVIDER","NONE"] */
    PropagateTags?: "CAPACITY_PROVIDER" | "NONE";
    /**
     * Defines how Amazon ECS Managed Instances optimizes the infrastructure in your capacity provider.
     * Configure it to turn on or off the infrastructure optimization in your capacity provider, and to
     * control the idle EC2 instances optimization delay.
     */
    InfrastructureOptimization?: {
      /**
       * This parameter defines the number of seconds Amazon ECS Managed Instances waits before optimizing
       * EC2 instances that have become idle or underutilized. A longer delay increases the likelihood of
       * placing new tasks on idle instances, reducing startup time. A shorter delay helps reduce
       * infrastructure costs by optimizing idle instances more quickly. Valid values are: Not set (null) -
       * Uses the default optimization behavior, `-1` - Disables automatic infrastructure optimization, `0`
       * to `3600` (inclusive) - Specifies the number of seconds to wait before optimizing instances.
       * @minimum -1
       * @maximum 3600
       */
      ScaleInAfter?: number;
    };
    InstanceLaunchTemplate: {
      Ec2InstanceProfileArn: string;
      StorageConfiguration?: {
        StorageSizeGiB: number;
      };
      NetworkConfiguration: {
        SecurityGroups?: string[];
        Subnets: string[];
      };
      InstanceRequirements?: {
        /** @uniqueItems false */
        LocalStorageTypes?: ("hdd" | "ssd")[];
        /** @uniqueItems false */
        InstanceGenerations?: ("current" | "previous")[];
        NetworkInterfaceCount?: {
          Min?: number;
          Max?: number;
        };
        MemoryGiBPerVCpu?: {
          Min?: number;
          Max?: number;
        };
        /** @uniqueItems false */
        AcceleratorTypes?: ("gpu" | "fpga" | "inference")[];
        VCpuCount: {
          Min: number;
          Max?: number;
        };
        /** @uniqueItems false */
        ExcludedInstanceTypes?: string[];
        /** @uniqueItems false */
        AcceleratorManufacturers?: ("amazon-web-services" | "amd" | "habana" | "nvidia" | "xilinx")[];
        /** @uniqueItems false */
        AllowedInstanceTypes?: string[];
        /** @enum ["included","required","excluded"] */
        LocalStorage?: "included" | "required" | "excluded";
        /** @uniqueItems false */
        CpuManufacturers?: ("intel" | "amd" | "amazon-web-services")[];
        NetworkBandwidthGbps?: {
          Min?: number;
          Max?: number;
        };
        AcceleratorCount?: {
          Min?: number;
          Max?: number;
        };
        /** @enum ["included","required","excluded"] */
        BareMetal?: "included" | "required" | "excluded";
        RequireHibernateSupport?: boolean;
        MaxSpotPriceAsPercentageOfOptimalOnDemandPrice?: number;
        SpotMaxPricePercentageOverLowestPrice?: number;
        BaselineEbsBandwidthMbps?: {
          Min?: number;
          Max?: number;
        };
        OnDemandMaxPricePercentageOverLowestPrice?: number;
        /** @uniqueItems false */
        AcceleratorNames?: ("a10g" | "a100" | "h100" | "inferentia" | "k520" | "k80" | "m60" | "radeon-pro-v520" | "t4" | "t4g" | "vu9p" | "v100" | "l40s")[];
        AcceleratorTotalMemoryMiB?: {
          Min?: number;
          Max?: number;
        };
        /** @enum ["included","required","excluded"] */
        BurstablePerformance?: "included" | "required" | "excluded";
        MemoryMiB: {
          Min: number;
          Max?: number;
        };
        TotalLocalStorageGB?: {
          Min?: number;
          Max?: number;
        };
      };
      Monitoring?: "BASIC" | "DETAILED";
    };
  };
};
