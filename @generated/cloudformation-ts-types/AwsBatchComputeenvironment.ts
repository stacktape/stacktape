// This file is auto-generated. Do not edit manually.
// Source: aws-batch-computeenvironment.json

/** Resource Type definition for AWS::Batch::ComputeEnvironment */
export type AwsBatchComputeenvironment = {
  ComputeEnvironmentArn?: string;
  ComputeEnvironmentName?: string;
  ComputeResources?: {
    AllocationStrategy?: string;
    BidPercentage?: number;
    DesiredvCpus?: number;
    /** @uniqueItems false */
    Ec2Configuration?: {
      ImageIdOverride?: string;
      ImageType: string;
      ImageKubernetesVersion?: string;
    }[];
    Ec2KeyPair?: string;
    ImageId?: string;
    InstanceRole?: string;
    /** @uniqueItems false */
    InstanceTypes?: string[];
    LaunchTemplate?: {
      LaunchTemplateId?: string;
      LaunchTemplateName?: string;
      Version?: string;
      /** @enum ["EKS_BOOTSTRAP_SH","EKS_NODEADM"] */
      UserdataType?: "EKS_BOOTSTRAP_SH" | "EKS_NODEADM";
      /** @uniqueItems false */
      Overrides?: ({
        LaunchTemplateId?: string;
        LaunchTemplateName?: string;
        Version?: string;
        /** @enum ["EKS_BOOTSTRAP_SH","EKS_NODEADM"] */
        UserdataType?: "EKS_BOOTSTRAP_SH" | "EKS_NODEADM";
        /** @uniqueItems false */
        TargetInstanceTypes?: string[];
      })[];
    };
    MaxvCpus: number;
    MinvCpus?: number;
    PlacementGroup?: string;
    /** @uniqueItems false */
    SecurityGroupIds?: string[];
    SpotIamFleetRole?: string;
    /** @uniqueItems false */
    Subnets: string[];
    /** A key-value pair to associate with a resource. */
    Tags?: Record<string, string>;
    Type: string;
    /** @default false */
    UpdateToLatestImageVersion?: boolean;
  };
  /** @default true */
  ReplaceComputeEnvironment?: boolean;
  ServiceRole?: string;
  State?: string;
  /** A key-value pair to associate with a resource. */
  Tags?: Record<string, string>;
  Type: string;
  UpdatePolicy?: {
    /** @default false */
    TerminateJobsOnUpdate?: boolean;
    /** @default 30 */
    JobExecutionTimeoutMinutes?: number;
  };
  UnmanagedvCpus?: number;
  EksConfiguration?: {
    /** @default false */
    EksClusterArn: string;
    /** @default false */
    KubernetesNamespace: string;
  };
  Context?: string;
};
