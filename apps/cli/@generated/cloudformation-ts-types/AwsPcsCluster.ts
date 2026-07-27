// This file is auto-generated. Do not edit manually.
// Source: aws-pcs-cluster.json

/** AWS::PCS::Cluster resource creates an AWS PCS cluster. */
export type AwsPcsCluster = {
  /** The unique Amazon Resource Name (ARN) of the cluster. */
  Arn?: string;
  /** The list of endpoints available for interaction with the scheduler. */
  Endpoints?: ({
    /** The endpoint's connection port number. */
    Port: string;
    /** The endpoint's private IP address. */
    PrivateIpAddress: string;
    /** The endpoint's IPv6 address. */
    Ipv6Address?: string;
    /**
     * Indicates the type of endpoint running at the specific IP address.
     * @enum ["SLURMCTLD","SLURMDBD","SLURMRESTD"]
     */
    Type: "SLURMCTLD" | "SLURMDBD" | "SLURMRESTD";
    /** The endpoint's public IP address. */
    PublicIpAddress?: string;
  })[];
  /** The list of errors that occurred during cluster provisioning. */
  ErrorInfo?: {
    /** The short-form error code. */
    Code?: string;
    /** The detailed error information. */
    Message?: string;
  }[];
  /**
   * The generated unique ID of the cluster.
   * @pattern ^(pcs_[a-zA-Z0-9]+|[A-Za-z][A-Za-z0-9-]{1,40})$
   */
  Id?: string;
  /** The name that identifies the cluster. */
  Name?: string;
  /** The networking configuration for the cluster's control plane. */
  Networking: {
    /**
     * The list of security group IDs associated with the Elastic Network Interface (ENI) created in
     * subnets.
     */
    SecurityGroupIds?: string[];
    /**
     * The list of subnet IDs where AWS PCS creates an Elastic Network Interface (ENI) to enable
     * communication between managed controllers and AWS PCS resources. The subnet must have an available
     * IP address, cannot reside in AWS Outposts, AWS Wavelength, or an AWS Local Zone. AWS PCS currently
     * supports only 1 subnet in this list.
     */
    SubnetIds?: string[];
    /**
     * The IP of the cluster (IPV4 or IPV6)
     * @enum ["IPV4","IPV6"]
     */
    NetworkType?: "IPV4" | "IPV6";
  };
  /** The cluster management and job scheduling software associated with the cluster. */
  Scheduler: {
    /**
     * The software AWS PCS uses to manage cluster scaling and job scheduling.
     * @enum ["SLURM"]
     */
    Type: "SLURM";
    /**
     * The version of the specified scheduling software that AWS PCS uses to manage cluster scaling and
     * job scheduling.
     */
    Version: string;
  };
  /**
   * The size of the cluster.
   * @enum ["SMALL","MEDIUM","LARGE"]
   */
  Size: "SMALL" | "MEDIUM" | "LARGE";
  /** Additional options related to the Slurm scheduler. */
  SlurmConfiguration?: {
    Accounting?: {
      /**
       * The default value for all purge settings for `slurmdbd.conf`. For more information, see the
       * [slurmdbd.conf documentation at SchedMD](https://slurm.schedmd.com/slurmdbd.conf.html). The default
       * value is `-1`. A value of `-1` means there is no purge time and records persist as long as the
       * cluster exists.
       * @default -1
       * @minimum -1
       * @maximum 10000
       */
      DefaultPurgeTimeInDays?: number;
      /**
       * The default value is `STANDARD`. A value of `STANDARD` means that Slurm accounting is enabled.
       * @default "NONE"
       * @enum ["STANDARD","NONE"]
       */
      Mode: "STANDARD" | "NONE";
    };
    SlurmRest?: {
      /**
       * The default value is `STANDARD`. A value of `STANDARD` means that Slurm Rest is enabled.
       * @default "NONE"
       * @enum ["STANDARD","NONE"]
       */
      Mode: "STANDARD" | "NONE";
    };
    AuthKey?: {
      /** The Amazon Resource Name (ARN) of the the shared Slurm key. */
      SecretArn: string;
      /** The version of the shared Slurm key. */
      SecretVersion: string;
    };
    JwtAuth?: {
      JwtKey?: {
        /** The Amazon Resource Name (ARN) of the JWT key secret. */
        SecretArn: string;
        /** The version of the JWT key secret. */
        SecretVersion: string;
      };
    };
    /**
     * The time before an idle node is scaled down.
     * @minimum 1
     */
    ScaleDownIdleTimeInSeconds?: number;
    /** Additional Slurm-specific configuration that directly maps to Slurm settings. */
    SlurmCustomSettings?: {
      /**
       * AWS PCS supports configuration of the following Slurm parameters for clusters: Prolog, Epilog, and
       * SelectTypeParameters.
       */
      ParameterName: string;
      /** The value for the configured Slurm setting. */
      ParameterValue: string;
    }[];
  };
  /**
   * The provisioning status of the cluster. The provisioning status doesn't indicate the overall health
   * of the cluster.
   * @enum ["CREATING","ACTIVE","UPDATING","DELETING","CREATE_FAILED","DELETE_FAILED","UPDATE_FAILED"]
   */
  Status?: "CREATING" | "ACTIVE" | "UPDATING" | "DELETING" | "CREATE_FAILED" | "DELETE_FAILED" | "UPDATE_FAILED";
  /**
   * 1 or more tags added to the resource. Each tag consists of a tag key and tag value. The tag value
   * is optional and can be an empty string.
   */
  Tags?: unknown;
};
