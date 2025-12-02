// This file is auto-generated. Do not edit manually.
// Source: aws-autoscaling-launchconfiguration.json

/**
 * The AWS::AutoScaling::LaunchConfiguration resource specifies the launch configuration that can be
 * used by an Auto Scaling group to configure Amazon EC2 instances.
 */
export type AwsAutoscalingLaunchconfiguration = {
  /** The tenancy of the instance, either default or dedicated. */
  PlacementTenancy?: string;
  /** A list that contains the security groups to assign to the instances in the Auto Scaling group. */
  SecurityGroups?: (unknown | unknown)[];
  /**
   * The name of the launch configuration. This name must be unique per Region per account.
   * @minLength 1
   * @maxLength 255
   */
  LaunchConfigurationName?: string;
  /** The metadata options for the instances. */
  MetadataOptions?: {
    /** The desired HTTP PUT response hop limit for instance metadata requests. */
    HttpPutResponseHopLimit?: number;
    /** The state of token usage for your instance metadata requests. */
    HttpTokens?: string;
    /** This parameter enables or disables the HTTP metadata endpoint on your instances. */
    HttpEndpoint?: string;
  };
  /** The ID of the Amazon EC2 instance you want to use to create the launch configuration. */
  InstanceId?: string;
  /**
   * The Base64-encoded user data to make available to the launched EC2 instances.
   * @maxLength 21847
   */
  UserData?: string;
  /**
   * The IDs of one or more security groups for the VPC that you specified in the ClassicLinkVPCId
   * property.
   */
  ClassicLinkVPCSecurityGroups?: string[];
  /**
   * Specifies how block devices are exposed to the instance. You can specify virtual devices and EBS
   * volumes.
   * @uniqueItems true
   */
  BlockDeviceMappings?: {
    /** Parameters used to automatically set up EBS volumes when an instance is launched. */
    Ebs?: {
      /** The snapshot ID of the volume to use. */
      SnapshotId?: string;
      /** The volume type. */
      VolumeType?: string;
      /** Specifies whether the volume should be encrypted. */
      Encrypted?: boolean;
      /** The throughput (MiBps) to provision for a gp3 volume. */
      Throughput?: number;
      /** The number of input/output (I/O) operations per second (IOPS) to provision for the volume. */
      Iops?: number;
      /** The volume size, in GiBs. */
      VolumeSize?: number;
      /** Indicates whether the volume is deleted on instance termination. */
      DeleteOnTermination?: boolean;
    };
    /**
     * Setting this value to true suppresses the specified device included in the block device mapping of
     * the AMI.
     */
    NoDevice?: boolean;
    /** The name of the virtual device. */
    VirtualName?: string;
    /** The device name exposed to the EC2 instance (for example, /dev/sdh or xvdh). */
    DeviceName: string;
  }[];
  /**
   * Provides the name or the Amazon Resource Name (ARN) of the instance profile associated with the IAM
   * role for the instance. The instance profile contains the IAM role.
   */
  IamInstanceProfile?: string;
  /** Provides the ID of the kernel associated with the EC2 AMI. */
  KernelId?: string;
  /**
   * For Auto Scaling groups that are running in a virtual private cloud (VPC), specifies whether to
   * assign a public IP address to the group's instances.
   */
  AssociatePublicIpAddress?: boolean;
  /** The ID of a ClassicLink-enabled VPC to link your EC2-Classic instances to. */
  ClassicLinkVPCId?: string;
  /** Specifies whether the launch configuration is optimized for EBS I/O (true) or not (false). */
  EbsOptimized?: boolean;
  /** Provides the name of the EC2 key pair. */
  KeyName?: string;
  /**
   * The maximum hourly price you are willing to pay for any Spot Instances launched to fulfill the
   * request.
   */
  SpotPrice?: string;
  /** Provides the unique ID of the Amazon Machine Image (AMI) that was assigned during registration. */
  ImageId: string;
  /** Specifies the instance type of the EC2 instance. */
  InstanceType: string;
  /** The ID of the RAM disk to select. */
  RamDiskId?: string;
  /**
   * Controls whether instances in this group are launched with detailed (true) or basic (false)
   * monitoring.
   */
  InstanceMonitoring?: boolean;
};
