// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-instance.json

/** Resource Type definition for AWS::EC2::Instance */
export type AwsEc2Instance = {
  /** The private DNS name of the specified instance. For example: ip-10-24-34-0.ec2.internal. */
  PrivateDnsName?: string;
  /**
   * The volumes to attach to the instance.
   * @uniqueItems false
   */
  Volumes?: {
    /** The ID of the EBS volume. The volume and instance must be within the same Availability Zone. */
    VolumeId: string;
    /** The device name (for example, /dev/sdh or xvdh). */
    Device: string;
  }[];
  /** The private IP address of the specified instance. For example: 10.24.34.0. */
  PrivateIp?: string;
  /** Indicates whether the instance is enabled for AWS Nitro Enclaves. */
  EnclaveOptions?: {
    /**
     * If this parameter is set to true, the instance is enabled for AWS Nitro Enclaves; otherwise, it is
     * not enabled for AWS Nitro Enclaves.
     */
    Enabled?: boolean;
  };
  /**
   * The ID of the AMI. An AMI ID is required to launch an instance and must be specified here or in a
   * launch template.
   */
  ImageId?: string;
  /**
   * The tags to add to the instance.
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  /**
   * This property is reserved for internal use. If you use it, the stack fails with this error: Bad
   * property set: [Testing this property] (Service: AmazonEC2; Status Code: 400; Error Code:
   * InvalidParameterCombination; Request ID: 0XXXXXX-49c7-4b40-8bcc-76885dcXXXXX).
   */
  AdditionalInfo?: string;
  /** Indicates whether an instance is enabled for hibernation. */
  HibernationOptions?: {
    /**
     * If you set this parameter to true, your instance is enabled for hibernation.
     * @default false
     */
    Configured?: boolean;
  };
  /**
   * The license configurations.
   * @uniqueItems false
   */
  LicenseSpecifications?: {
    /** The Amazon Resource Name (ARN) of the license configuration. */
    LicenseConfigurationArn: string;
  }[];
  /** The metadata options for the instance */
  MetadataOptions?: {
    /**
     * The number of network hops that the metadata token can travel. Maximum is 64.
     * @default 1
     * @minimum 1
     * @maximum 64
     */
    HttpPutResponseHopLimit?: number;
    /**
     * Enables or disables the IPv6 endpoint for the instance metadata service. To use this option, the
     * instance must be a Nitro-based instance launched in a subnet that supports IPv6.
     * @enum ["disabled","enabled"]
     */
    HttpProtocolIpv6?: "disabled" | "enabled";
    /**
     * Indicates whether IMDSv2 is required.
     * @enum ["optional","required"]
     */
    HttpTokens?: "optional" | "required";
    /**
     * Indicates whether tags from the instance are propagated to the EBS volumes.
     * @enum ["disabled","enabled"]
     */
    InstanceMetadataTags?: "disabled" | "enabled";
    /**
     * Enables or disables the HTTP metadata endpoint on your instances. If you specify a value of
     * disabled, you cannot access your instance metadata.
     * @enum ["disabled","enabled"]
     */
    HttpEndpoint?: "disabled" | "enabled";
  };
  /** The EC2 Instance ID. */
  InstanceId?: string;
  /** The CPU options for the instance. */
  CpuOptions?: {
    ThreadsPerCore?: number;
    CoreCount?: number;
  };
  /** The Availability Zone of the instance. */
  AvailabilityZone?: string;
  /** The options for the instance hostname. */
  PrivateDnsNameOptions?: {
    /**
     * Indicates whether to respond to DNS queries for instance hostnames with DNS A records. For more
     * information, see Amazon EC2 instance hostname types in the Amazon Elastic Compute Cloud User Guide.
     */
    EnableResourceNameDnsARecord?: boolean;
    /**
     * The type of hostnames to assign to instances in the subnet at launch. For IPv4 only subnets, an
     * instance DNS name must be based on the instance IPv4 address. For IPv6 only subnets, an instance
     * DNS name must be based on the instance ID. For dual-stack subnets, you can specify whether DNS
     * names use the instance IPv4 address or the instance ID. For more information, see Amazon EC2
     * instance hostname types in the Amazon Elastic Compute Cloud User Guide.
     * @enum ["ip-name","resource-name"]
     */
    HostnameType?: "ip-name" | "resource-name";
    /**
     * Indicates whether to respond to DNS queries for instance hostnames with DNS AAAA records. For more
     * information, see Amazon EC2 instance hostname types in the Amazon Elastic Compute Cloud User Guide.
     */
    EnableResourceNameDnsAAAARecord?: boolean;
  };
  /**
   * If you specify host for the Affinity property, the ID of a dedicated host that the instance is
   * associated with. If you don't specify an ID, Amazon EC2 launches the instance onto any available,
   * compatible dedicated host in your account.
   */
  HostId?: string;
  /**
   * The public DNS name of the specified instance. For example:
   * ec2-107-20-50-45.compute-1.amazonaws.com.
   */
  PublicDnsName?: string;
  /**
   * The IDs of the security groups.
   * @uniqueItems false
   */
  SecurityGroupIds?: string[];
  /**
   * The name of an existing placement group that you want to launch the instance into (cluster |
   * partition | spread).
   */
  PlacementGroupName?: string;
  /**
   * The SSM document and parameter values in AWS Systems Manager to associate with this instance.
   * @uniqueItems false
   */
  SsmAssociations?: {
    /**
     * The input parameter values to use with the associated SSM document.
     * @uniqueItems false
     */
    AssociationParameters?: {
      /**
       * The value of an input parameter.
       * @uniqueItems false
       */
      Value: string[];
      /** The name of an input parameter that is in the associated SSM document. */
      Key: string;
    }[];
    /** The name of an SSM document to associate with the instance. */
    DocumentName: string;
  }[];
  /** The ID of the VPC that the instance is running in. */
  VpcId?: string;
  /** The current state of the instance. */
  State?: {
    /** The state of the instance as a 16-bit unsigned integer. */
    Code?: string;
    /** The current state of the instance. */
    Name?: string;
  };
  /**
   * Indicates whether the instance is associated with a dedicated host. If you want the instance to
   * always restart on the same host on which it was launched, specify host. If you want the instance to
   * restart on any available host, but try to launch onto the last host it ran on (on a best-effort
   * basis), specify default.
   * @enum ["default","host"]
   */
  Affinity?: "default" | "host";
  /**
   * The tenancy of the instance (if the instance is running in a VPC). An instance with a tenancy of
   * dedicated runs on single-tenant hardware.
   */
  Tenancy?: string;
  /**
   * the names of the security groups. For a nondefault VPC, you must use security group IDs instead.
   * @uniqueItems false
   */
  SecurityGroups?: string[];
  /**
   * [EC2-VPC] The primary IPv4 address. You must specify a value from the IPv4 address range of the
   * subnet.
   */
  PrivateIpAddress?: string;
  /** The user data to make available to the instance. */
  UserData?: string;
  /**
   * The block device mapping entries that defines the block devices to attach to the instance at
   * launch.
   * @uniqueItems false
   */
  BlockDeviceMappings?: {
    /** Parameters used to automatically set up EBS volumes when the instance is launched. */
    Ebs?: {
      /** The ID of the snapshot. */
      SnapshotId?: string;
      /** The volume type. */
      VolumeType?: string;
      /**
       * The identifier of the AWS Key Management Service (AWS KMS) customer managed CMK to use for Amazon
       * EBS encryption. If KmsKeyId is specified, the encrypted state must be true. If the encrypted state
       * is true but you do not specify KmsKeyId, your AWS managed CMK for EBS is used.
       */
      KmsKeyId?: string;
      /** Indicates whether the volume should be encrypted. */
      Encrypted?: boolean;
      /**
       * The number of I/O operations per second (IOPS). For gp3, io1, and io2 volumes, this represents the
       * number of IOPS that are provisioned for the volume. For gp2 volumes, this represents the baseline
       * performance of the volume and the rate at which the volume accumulates I/O credits for bursting.
       */
      Iops?: number;
      /**
       * The size of the volume, in GiBs. You must specify either a snapshot ID or a volume size. If you
       * specify a snapshot, the default is the snapshot size. You can specify a volume size that is equal
       * to or larger than the snapshot size.
       */
      VolumeSize?: number;
      /** Indicates whether the EBS volume is deleted on instance termination. */
      DeleteOnTermination?: boolean;
    };
    NoDevice?: Record<string, unknown>;
    VirtualName?: string;
    /** The device name (for example, /dev/sdh or xvdh). */
    DeviceName: string;
  }[];
  /** The IAM instance profile. */
  IamInstanceProfile?: string;
  /**
   * [EC2-VPC] The IPv6 addresses from the range of the subnet to associate with the primary network
   * interface.
   * @uniqueItems false
   */
  Ipv6Addresses?: {
    /** The IPv6 address. */
    Ipv6Address: string;
  }[];
  /** The ID of the kernel. */
  KernelId?: string;
  /** [EC2-VPC] The ID of the subnet to launch the instance into. */
  SubnetId?: string;
  /** Indicates whether the instance is optimized for Amazon EBS I/O. */
  EbsOptimized?: boolean;
  /**
   * Indicates whether to assign the tags from the instance to all of the volumes attached to the
   * instance at launch. If you specify true and you assign tags to the instance, those tags are
   * automatically assigned to all of the volumes that you attach to the instance at launch. If you
   * specify false, those tags are not assigned to the attached volumes.
   */
  PropagateTagsToVolumeOnCreation?: boolean;
  /**
   * An elastic GPU to associate with the instance. Amazon Elastic Graphics is no longer available.
   * @uniqueItems false
   */
  ElasticGpuSpecifications?: {
    /** The type of Elastic Graphics accelerator. Amazon Elastic Graphics is no longer available. */
    Type: string;
  }[];
  /**
   * An elastic inference accelerator to associate with the instance. Amazon Elastic Inference is no
   * longer available.
   * @uniqueItems false
   */
  ElasticInferenceAccelerators?: {
    /** The type of elastic inference accelerator. Amazon Elastic Inference is no longer available. */
    Type: string;
    /**
     * The number of elastic inference accelerators to attach to the instance. Amazon Elastic Inference is
     * no longer available.
     * @minimum 0
     */
    Count?: number;
  }[];
  /**
   * [EC2-VPC] The number of IPv6 addresses to associate with the primary network interface. Amazon EC2
   * chooses the IPv6 addresses from the range of your subnet.
   */
  Ipv6AddressCount?: number;
  /** The launch template to use to launch the instances. */
  LaunchTemplate?: unknown | unknown;
  /**
   * The network interfaces to associate with the instance.
   * @uniqueItems false
   */
  NetworkInterfaces?: {
    /** The description of the network interface. */
    Description?: string;
    /** The private IPv4 address of the network interface. */
    PrivateIpAddress?: string;
    /**
     * One or more private IPv4 addresses to assign to the network interface.
     * @uniqueItems false
     */
    PrivateIpAddresses?: {
      /** The private IPv4 addresses. */
      PrivateIpAddress: string;
      /**
       * Indicates whether the private IPv4 address is the primary private IPv4 address. Only one IPv4
       * address can be designated as primary.
       */
      Primary: boolean;
    }[];
    /** The number of secondary private IPv4 addresses. */
    SecondaryPrivateIpAddressCount?: number;
    /**
     * The position of the network interface in the attachment order. A primary network interface has a
     * device index of 0.
     */
    DeviceIndex: string;
    /**
     * The IDs of the security groups for the network interface.
     * @uniqueItems false
     */
    GroupSet?: string[];
    /**
     * The IPv6 addresses associated with the network interface.
     * @uniqueItems false
     */
    Ipv6Addresses?: {
      /** The IPv6 address. */
      Ipv6Address: string;
    }[];
    /** The ID of the subnet. */
    SubnetId?: string;
    /** Indicates whether to assign a public IPv4 address to an instance you launch in a VPC. */
    AssociatePublicIpAddress?: boolean;
    /** The ID of the network interface. */
    NetworkInterfaceId?: string;
    /** Not currently supported by AWS CloudFormation. */
    AssociateCarrierIpAddress?: boolean;
    EnaSrdSpecification?: {
      /** Specifies whether ENA Express is enabled for the network interface when you launch an instance. */
      EnaSrdEnabled?: boolean;
      EnaSrdUdpSpecification?: {
        /** Indicates whether UDP traffic uses ENA Express for your instance. */
        EnaSrdUdpEnabled?: boolean;
      };
    };
    /** A number of IPv6 addresses to assign to the network interface. */
    Ipv6AddressCount?: number;
    /** If set to true, the interface is deleted when the instance is terminated. */
    DeleteOnTermination?: boolean;
  }[];
  /** The instance type. */
  InstanceType?: string;
  /** Specifies whether detailed monitoring is enabled for the instance. */
  Monitoring?: boolean;
  /** The public IP address of the specified instance. For example: 192.0.2.0. */
  PublicIp?: string;
  /**
   * Indicates whether an instance stops or terminates when you initiate shutdown from the instance
   * (using the operating system command for system shutdown).
   */
  InstanceInitiatedShutdownBehavior?: string;
  /**
   * The ARN of the host resource group in which to launch the instances. If you specify a host resource
   * group ARN, omit the Tenancy parameter or set it to host.
   */
  HostResourceGroupArn?: string;
  /**
   * If you set this parameter to true, you can't terminate the instance using the Amazon EC2 console,
   * CLI, or API; otherwise, you can.
   */
  DisableApiTermination?: boolean;
  /** The name of the key pair. */
  KeyName?: string;
  /** The ID of the RAM disk to select. */
  RamdiskId?: string;
  /** Specifies whether to enable an instance launched in a VPC to perform NAT. */
  SourceDestCheck?: boolean;
  /**
   * The credit option for CPU usage of the burstable performance instance. Valid values are standard
   * and unlimited.
   */
  CreditSpecification?: {
    CPUCredits?: string;
  };
};
