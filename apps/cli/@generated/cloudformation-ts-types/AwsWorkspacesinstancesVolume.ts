// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesinstances-volume.json

/** Resource Type definition for AWS::WorkspacesInstances::Volume - Manages WorkSpaces Volume resources */
export type AwsWorkspacesinstancesVolume = {
  /**
   * Unique identifier for the volume
   * @pattern ^vol-[0-9a-zA-Z]{1,63}$
   */
  VolumeId?: string;
  /**
   * The Availability Zone in which to create the volume
   * @pattern ^[a-z]{2}-[a-z]+-\d[a-z](-[a-z0-9]+)?$
   */
  AvailabilityZone: string;
  /** Indicates whether the volume should be encrypted */
  Encrypted?: boolean;
  /**
   * The number of I/O operations per second (IOPS)
   * @minimum 0
   */
  Iops?: number;
  /**
   * The identifier of the AWS Key Management Service (AWS KMS) customer master key (CMK) to use for
   * Amazon EBS encryption
   * @maxLength 128
   */
  KmsKeyId?: string;
  /**
   * The size of the volume, in GiBs
   * @minimum 0
   */
  SizeInGB?: number;
  /**
   * The snapshot from which to create the volume
   * @pattern ^snap-[0-9a-zA-Z]{1,63}$
   */
  SnapshotId?: string;
  /**
   * The throughput to provision for a volume, with a maximum of 1,000 MiB/s
   * @minimum 0
   */
  Throughput?: number;
  /**
   * The volume type
   * @enum ["standard","io1","io2","gp2","sc1","st1","gp3"]
   */
  VolumeType?: "standard" | "io1" | "io2" | "gp2" | "sc1" | "st1" | "gp3";
  /**
   * The tags passed to EBS volume
   * @maxItems 30
   */
  TagSpecifications?: ({
    /** @enum ["instance","volume","spot-instances-request","network-interface"] */
    ResourceType?: "instance" | "volume" | "spot-instances-request" | "network-interface";
    /** The tags to apply to the resource */
    Tags?: {
      /**
       * The key name of the tag
       * @minLength 1
       * @maxLength 128
       */
      Key: string;
      /**
       * The value for the tag
       * @maxLength 256
       */
      Value: string;
    }[];
  })[];
};
