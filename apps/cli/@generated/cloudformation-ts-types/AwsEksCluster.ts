// This file is auto-generated. Do not edit manually.
// Source: aws-eks-cluster.json

/** An object representing an Amazon EKS cluster. */
export type AwsEksCluster = {
  EncryptionConfig?: {
    /** The encryption provider for the cluster. */
    Provider?: {
      /**
       * Amazon Resource Name (ARN) or alias of the KMS key. The KMS key must be symmetric, created in the
       * same region as the cluster, and if the KMS key was created in a different account, the user must
       * have access to the KMS key.
       */
      KeyArn?: string;
    };
    /** Specifies the resources to be encrypted. The only supported value is "secrets". */
    Resources?: string[];
  }[];
  KubernetesNetworkConfig?: {
    /**
     * The CIDR block to assign Kubernetes service IP addresses from. If you don't specify a block,
     * Kubernetes assigns addresses from either the 10.100.0.0/16 or 172.20.0.0/16 CIDR blocks. We
     * recommend that you specify a block that does not overlap with resources in other networks that are
     * peered or connected to your VPC.
     */
    ServiceIpv4Cidr?: string;
    /** The CIDR block to assign Kubernetes service IP addresses from. */
    ServiceIpv6Cidr?: string;
    /**
     * Ipv4 or Ipv6. You can only specify ipv6 for 1.21 and later clusters that use version 1.10.1 or
     * later of the Amazon VPC CNI add-on
     * @enum ["ipv4","ipv6"]
     */
    IpFamily?: "ipv4" | "ipv6";
    /** Todo: add description */
    ElasticLoadBalancing?: {
      /** Todo: add description */
      Enabled?: boolean;
    };
  };
  Logging?: {
    /** The cluster control plane logging configuration for your cluster. */
    ClusterLogging?: {
      EnabledTypes?: ({
        /**
         * name of the log type
         * @enum ["api","audit","authenticator","controllerManager","scheduler"]
         */
        Type?: "api" | "audit" | "authenticator" | "controllerManager" | "scheduler";
      })[];
    };
  };
  /**
   * The unique name to give to your cluster.
   * @minLength 1
   * @maxLength 100
   * @pattern ^[0-9A-Za-z][A-Za-z0-9\-_]*
   */
  Name?: string;
  /** The unique ID given to your cluster. */
  Id?: string;
  ResourcesVpcConfig: {
    /**
     * Set this value to true to enable private access for your cluster's Kubernetes API server endpoint.
     * If you enable private access, Kubernetes API requests from within your cluster's VPC use the
     * private VPC endpoint. The default value for this parameter is false, which disables private access
     * for your Kubernetes API server. If you disable private access and you have nodes or AWS Fargate
     * pods in the cluster, then ensure that publicAccessCidrs includes the necessary CIDR blocks for
     * communication with the nodes or Fargate pods.
     */
    EndpointPrivateAccess?: boolean;
    /**
     * Set this value to false to disable public access to your cluster's Kubernetes API server endpoint.
     * If you disable public access, your cluster's Kubernetes API server can only receive requests from
     * within the cluster VPC. The default value for this parameter is true, which enables public access
     * for your Kubernetes API server.
     */
    EndpointPublicAccess?: boolean;
    /**
     * The CIDR blocks that are allowed access to your cluster's public Kubernetes API server endpoint.
     * Communication to the endpoint from addresses outside of the CIDR blocks that you specify is denied.
     * The default value is 0.0.0.0/0. If you've disabled private endpoint access and you have nodes or
     * AWS Fargate pods in the cluster, then ensure that you specify the necessary CIDR blocks.
     */
    PublicAccessCidrs?: string[];
    /**
     * Specify one or more security groups for the cross-account elastic network interfaces that Amazon
     * EKS creates to use to allow communication between your worker nodes and the Kubernetes control
     * plane. If you don't specify a security group, the default security group for your VPC is used.
     */
    SecurityGroupIds?: string[];
    /**
     * Specify subnets for your Amazon EKS nodes. Amazon EKS creates cross-account elastic network
     * interfaces in these subnets to allow communication between your nodes and the Kubernetes control
     * plane.
     */
    SubnetIds: string[];
  };
  OutpostConfig?: {
    /** Specify one or more Arn(s) of Outpost(s) on which you would like to create your cluster. */
    OutpostArns: string[];
    /** Specify the Instance type of the machines that should be used to create your cluster. */
    ControlPlaneInstanceType: string;
    /** Specify the placement group of the control plane machines for your cluster. */
    ControlPlanePlacement?: {
      /** Specify the placement group name of the control place machines for your cluster. */
      GroupName?: string;
    };
  };
  AccessConfig?: {
    /**
     * Set this value to false to avoid creating a default cluster admin Access Entry using the IAM
     * principal used to create the cluster.
     */
    BootstrapClusterCreatorAdminPermissions?: boolean;
    /**
     * Specify the authentication mode that should be used to create your cluster.
     * @enum ["CONFIG_MAP","API_AND_CONFIG_MAP","API"]
     */
    AuthenticationMode?: "CONFIG_MAP" | "API_AND_CONFIG_MAP" | "API";
  };
  UpgradePolicy?: {
    /**
     * Specify the support type for your cluster.
     * @enum ["STANDARD","EXTENDED"]
     */
    SupportType?: "STANDARD" | "EXTENDED";
  };
  RemoteNetworkConfig?: {
    /** Network configuration of nodes run on-premises with EKS Hybrid Nodes. */
    RemoteNodeNetworks: {
      /** Specifies the list of remote node CIDRs. */
      Cidrs: string[];
    }[];
    /** Network configuration of pods run on-premises with EKS Hybrid Nodes. */
    RemotePodNetworks?: {
      /** Specifies the list of remote pod CIDRs. */
      Cidrs: string[];
    }[];
  };
  ComputeConfig?: {
    /** Todo: add description */
    Enabled?: boolean;
    /** Todo: add description */
    NodeRoleArn?: string;
    /** Todo: add description */
    NodePools?: string[];
  };
  StorageConfig?: {
    /** Todo: add description */
    BlockStorage?: {
      /** Todo: add description */
      Enabled?: boolean;
    };
  };
  /**
   * The Amazon Resource Name (ARN) of the IAM role that provides permissions for the Kubernetes control
   * plane to make calls to AWS API operations on your behalf.
   */
  RoleArn: string;
  /**
   * The desired Kubernetes version for your cluster. If you don't specify a value here, the latest
   * version available in Amazon EKS is used.
   * @pattern 1\.\d\d
   */
  Version?: string;
  /**
   * Force cluster version update
   * @default false
   */
  Force?: boolean;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** The ARN of the cluster, such as arn:aws:eks:us-west-2:666666666666:cluster/prod. */
  Arn?: string;
  /**
   * The endpoint for your Kubernetes API server, such as
   * https://5E1D0CEXAMPLEA591B746AFC5AB30262.yl4.us-west-2.eks.amazonaws.com.
   */
  Endpoint?: string;
  /** The certificate-authority-data for your cluster. */
  CertificateAuthorityData?: string;
  /**
   * The cluster security group that was created by Amazon EKS for the cluster. Managed node groups use
   * this security group for control plane to data plane communication.
   */
  ClusterSecurityGroupId?: string;
  /** Amazon Resource Name (ARN) or alias of the customer master key (CMK). */
  EncryptionConfigKeyArn?: string;
  /**
   * The issuer URL for the cluster's OIDC identity provider, such as
   * https://oidc.eks.us-west-2.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E. If you need to remove
   * https:// from this output value, you can include the following code in your template.
   */
  OpenIdConnectIssuerUrl?: string;
  /**
   * Set this value to false to avoid creating the default networking add-ons when the cluster is
   * created.
   */
  BootstrapSelfManagedAddons?: boolean;
  /** Set this value to true to enable deletion protection for the cluster. */
  DeletionProtection?: boolean;
  ZonalShiftConfig?: {
    /** Set this value to true to enable zonal shift for the cluster. */
    Enabled?: boolean;
  };
  ControlPlaneScalingConfig?: {
    /**
     * The scaling tier for the provisioned control plane.
     * @enum ["standard","tier-xl","tier-2xl","tier-4xl"]
     */
    Tier?: "standard" | "tier-xl" | "tier-2xl" | "tier-4xl";
  };
};
