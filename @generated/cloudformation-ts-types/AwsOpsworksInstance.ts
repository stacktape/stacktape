// This file is auto-generated. Do not edit manually.
// Source: aws-opsworks-instance.json

/** Resource Type definition for AWS::OpsWorks::Instance */
export type AwsOpsworksInstance = {
  Id?: string;
  AvailabilityZone?: string;
  PrivateDnsName?: string;
  PrivateIp?: string;
  PublicDnsName?: string;
  PublicIp?: string;
  AgentVersion?: string;
  AmiId?: string;
  Architecture?: string;
  AutoScalingType?: string;
  /** @uniqueItems true */
  BlockDeviceMappings?: {
    DeviceName?: string;
    Ebs?: {
      DeleteOnTermination?: boolean;
      Iops?: number;
      SnapshotId?: string;
      VolumeSize?: number;
      VolumeType?: string;
    };
    NoDevice?: string;
    VirtualName?: string;
  }[];
  EbsOptimized?: boolean;
  /** @uniqueItems true */
  ElasticIps?: string[];
  Hostname?: string;
  InstallUpdatesOnBoot?: boolean;
  InstanceType: string;
  /** @uniqueItems false */
  LayerIds: string[];
  Os?: string;
  RootDeviceType?: string;
  SshKeyName?: string;
  StackId: string;
  SubnetId?: string;
  Tenancy?: string;
  TimeBasedAutoScaling?: {
    Friday?: Record<string, string>;
    Monday?: Record<string, string>;
    Saturday?: Record<string, string>;
    Sunday?: Record<string, string>;
    Thursday?: Record<string, string>;
    Tuesday?: Record<string, string>;
    Wednesday?: Record<string, string>;
  };
  VirtualizationType?: string;
  /** @uniqueItems true */
  Volumes?: string[];
};
