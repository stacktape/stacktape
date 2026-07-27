// This file is auto-generated. Do not edit manually.
// Source: aws-opsworks-layer.json

/** Resource Type definition for AWS::OpsWorks::Layer */
export type AwsOpsworksLayer = {
  Id?: string;
  Attributes?: Record<string, string>;
  AutoAssignElasticIps: boolean;
  AutoAssignPublicIps: boolean;
  CustomInstanceProfileArn?: string;
  CustomJson?: Record<string, unknown>;
  CustomRecipes?: {
    /** @uniqueItems true */
    Configure?: string[];
    /** @uniqueItems true */
    Deploy?: string[];
    /** @uniqueItems true */
    Setup?: string[];
    /** @uniqueItems true */
    Shutdown?: string[];
    /** @uniqueItems true */
    Undeploy?: string[];
  };
  /** @uniqueItems false */
  CustomSecurityGroupIds?: string[];
  EnableAutoHealing: boolean;
  InstallUpdatesOnBoot?: boolean;
  LifecycleEventConfiguration?: {
    ShutdownEventConfiguration?: {
      DelayUntilElbConnectionsDrained?: boolean;
      ExecutionTimeout?: number;
    };
  };
  LoadBasedAutoScaling?: {
    DownScaling?: {
      CpuThreshold?: number;
      IgnoreMetricsTime?: number;
      InstanceCount?: number;
      LoadThreshold?: number;
      MemoryThreshold?: number;
      ThresholdsWaitTime?: number;
    };
    Enable?: boolean;
    UpScaling?: {
      CpuThreshold?: number;
      IgnoreMetricsTime?: number;
      InstanceCount?: number;
      LoadThreshold?: number;
      MemoryThreshold?: number;
      ThresholdsWaitTime?: number;
    };
  };
  Name: string;
  /** @uniqueItems false */
  Packages?: string[];
  Shortname: string;
  StackId: string;
  /** @uniqueItems false */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  Type: string;
  UseEbsOptimizedInstances?: boolean;
  /** @uniqueItems false */
  VolumeConfigurations?: {
    Encrypted?: boolean;
    Iops?: number;
    MountPoint?: string;
    NumberOfDisks?: number;
    RaidLevel?: number;
    Size?: number;
    VolumeType?: string;
  }[];
};
