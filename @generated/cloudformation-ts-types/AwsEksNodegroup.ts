// This file is auto-generated. Do not edit manually.
// Source: aws-eks-nodegroup.json

/** Resource schema for AWS::EKS::Nodegroup */
export type AwsEksNodegroup = {
  /** The AMI type for your node group. */
  AmiType?: string;
  /** The capacity type of your managed node group. */
  CapacityType?: string;
  /**
   * Name of the cluster to create the node group in.
   * @minLength 1
   */
  ClusterName: string;
  /** The root device disk size (in GiB) for your node group instances. */
  DiskSize?: number;
  /**
   * Force the update if the existing node group's pods are unable to be drained due to a pod disruption
   * budget issue.
   * @default false
   */
  ForceUpdateEnabled?: boolean;
  /**
   * Specify the instance types for a node group.
   * @uniqueItems false
   */
  InstanceTypes?: string[];
  /** The Kubernetes labels to be applied to the nodes in the node group when they are created. */
  Labels?: Record<string, string>;
  /** An object representing a node group's launch template specification. */
  LaunchTemplate?: {
    /** @minLength 1 */
    Id?: string;
    /** @minLength 1 */
    Version?: string;
    /** @minLength 1 */
    Name?: string;
  };
  /**
   * The unique name to give your node group.
   * @minLength 1
   */
  NodegroupName?: string;
  /** The Amazon Resource Name (ARN) of the IAM role to associate with your node group. */
  NodeRole: string;
  /** The AMI version of the Amazon EKS-optimized AMI to use with your node group. */
  ReleaseVersion?: string;
  /** The remote access (SSH) configuration to use with your node group. */
  RemoteAccess?: {
    /** @uniqueItems false */
    SourceSecurityGroups?: string[];
    Ec2SshKey: string;
  };
  /** The scaling configuration details for the Auto Scaling group that is created for your node group. */
  ScalingConfig?: {
    /** @minimum 0 */
    MinSize?: number;
    /** @minimum 0 */
    DesiredSize?: number;
    /** @minimum 1 */
    MaxSize?: number;
  };
  /**
   * The subnets to use for the Auto Scaling group that is created for your node group.
   * @uniqueItems false
   */
  Subnets: string[];
  /**
   * The metadata, as key-value pairs, to apply to the node group to assist with categorization and
   * organization. Follows same schema as Labels for consistency.
   */
  Tags?: Record<string, string>;
  /** The Kubernetes taints to be applied to the nodes in the node group when they are created. */
  Taints?: {
    /** @minLength 1 */
    Key?: string;
    /** @minLength 0 */
    Value?: string;
    /** @minLength 1 */
    Effect?: string;
  }[];
  /** The node group update configuration. */
  UpdateConfig?: {
    /**
     * The maximum number of nodes unavailable at once during a version update. Nodes will be updated in
     * parallel. This value or maxUnavailablePercentage is required to have a value.The maximum number is
     * 100.
     * @minimum 1
     */
    MaxUnavailable?: number;
    /**
     * The maximum percentage of nodes unavailable during a version update. This percentage of nodes will
     * be updated in parallel, up to 100 nodes at once. This value or maxUnavailable is required to have a
     * value.
     * @minimum 1
     * @maximum 100
     */
    MaxUnavailablePercentage?: number;
    /**
     * The configuration for the behavior to follow during an node group version update of this managed
     * node group. You choose between two possible strategies for replacing nodes during an
     * UpdateNodegroupVersion action.
     */
    UpdateStrategy?: string;
  };
  /** The node auto repair configuration for node group. */
  NodeRepairConfig?: {
    /** Set this value to true to enable node auto repair for the node group. */
    Enabled?: boolean;
  };
  /** The Kubernetes version to use for your managed nodes. */
  Version?: string;
  Id?: string;
  Arn?: string;
};
