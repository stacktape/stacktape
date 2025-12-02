// This file is auto-generated. Do not edit manually.
// Source: aws-pcs-computenodegroup.json

/** AWS::PCS::ComputeNodeGroup resource creates an AWS PCS compute node group. */
export type AwsPcsComputenodegroup = {
  /**
   * The provisioning status of the compute node group. The provisioning status doesn't indicate the
   * overall health of the compute node group.
   * @enum ["CREATING","ACTIVE","UPDATING","DELETING","CREATE_FAILED","DELETE_FAILED","UPDATE_FAILED"]
   */
  Status?: "CREATING" | "ACTIVE" | "UPDATING" | "DELETING" | "CREATE_FAILED" | "DELETE_FAILED" | "UPDATE_FAILED";
  /** The ID of the cluster of the compute node group. */
  ClusterId: string;
  /** The list of errors that occurred during compute node group provisioning. */
  ErrorInfo?: {
    /** The detailed error information. */
    Message?: string;
    /** The short-form error code. */
    Code?: string;
  }[];
  /** Additional configuration when you specify SPOT as the purchase option. */
  SpotOptions?: {
    /**
     * The Amazon EC2 allocation strategy AWS PCS uses to provision EC2 instances. AWS PCS supports lowest
     * price, capacity optimized, and price capacity optimized. If you don't provide this option, it
     * defaults to price capacity optimized.
     * @enum ["lowest-price","capacity-optimized","price-capacity-optimized"]
     */
    AllocationStrategy?: "lowest-price" | "capacity-optimized" | "price-capacity-optimized";
  };
  /** Additional options related to the Slurm scheduler. */
  SlurmConfiguration?: {
    /** Additional Slurm-specific configuration that directly maps to Slurm settings. */
    SlurmCustomSettings?: {
      /** The value for the configured Slurm setting. */
      ParameterValue: string;
      /**
       * AWS PCS supports configuration of the following Slurm parameters for compute node groups: Weight
       * and RealMemory.
       */
      ParameterName: string;
    }[];
  };
  /**
   * The list of subnet IDs where instances are provisioned by the compute node group. The subnets must
   * be in the same VPC as the cluster.
   */
  SubnetIds: string[];
  /** The name that identifies the compute node group. */
  Name?: string;
  /** Specifies the boundaries of the compute node group auto scaling. */
  ScalingConfiguration: {
    /**
     * The upper bound of the number of instances allowed in the compute fleet.
     * @minimum 0
     */
    MaxInstanceCount: number;
    /**
     * The lower bound of the number of instances allowed in the compute fleet.
     * @minimum 0
     */
    MinInstanceCount: number;
  };
  /** A list of EC2 instance configurations that AWS PCS can provision in the compute node group. */
  InstanceConfigs: {
    /** The EC2 instance type that AWS PCS can provision in the compute node group. */
    InstanceType?: string;
  }[];
  /** The generated unique ID of the compute node group. */
  Id?: string;
  /**
   * Specifies how EC2 instances are purchased on your behalf. AWS PCS supports On-Demand, Spot and
   * Capacity Block instances. For more information, see Instance purchasing options in the Amazon
   * Elastic Compute Cloud User Guide. If you don't provide this option, it defaults to On-Demand.
   * @enum ["ONDEMAND","SPOT","CAPACITY_BLOCK"]
   */
  PurchaseOption?: "ONDEMAND" | "SPOT" | "CAPACITY_BLOCK";
  /** The unique Amazon Resource Name (ARN) of the compute node group. */
  Arn?: string;
  /** An Amazon EC2 launch template AWS PCS uses to launch compute nodes. */
  CustomLaunchTemplate: {
    /** The version of the EC2 launch template to use to provision instances. */
    Version: string;
    /** The ID of the EC2 launch template to use to provision instances. */
    TemplateId?: string;
  };
  /**
   * 1 or more tags added to the resource. Each tag consists of a tag key and tag value. The tag value
   * is optional and can be an empty string.
   */
  Tags?: unknown;
  /**
   * The ID of the Amazon Machine Image (AMI) that AWS PCS uses to launch instances. If not provided,
   * AWS PCS uses the AMI ID specified in the custom launch template.
   * @pattern ^ami-[a-z0-9]+$
   */
  AmiId?: string;
  /**
   * The Amazon Resource Name (ARN) of the IAM instance profile used to pass an IAM role when launching
   * EC2 instances. The role contained in your instance profile must have
   * pcs:RegisterComputeNodeGroupInstance permissions attached to provision instances correctly.
   * @pattern ^arn:aws([a-zA-Z-]{0,10})?:iam::[0-9]{12}:instance-profile/.{1,128}$
   */
  IamInstanceProfileArn: string;
};
