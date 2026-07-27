// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-instancesnapshot.json

/** Resource Type definition for AWS::Lightsail::InstanceSnapshot */
export type AwsLightsailInstancesnapshot = {
  /** The name of the snapshot. */
  InstanceSnapshotName: string;
  /** The Amazon Resource Name (ARN) of the snapshot. */
  Arn?: string;
  /** The instance from which the snapshot was created. */
  InstanceName: string;
  /** The type of resource (usually InstanceSnapshot). */
  ResourceType?: string;
  /** The state the snapshot is in. */
  State?: string;
  /** The instance from which the snapshot was created. */
  FromInstanceName?: string;
  /** The Amazon Resource Name (ARN) of the instance from which the snapshot was created. */
  FromInstanceArn?: string;
  /** The size in GB of the SSD */
  SizeInGb?: number;
  /** A Boolean value indicating whether the snapshot was created from an automatic snapshot. */
  IsFromAutoSnapshot?: boolean;
  /** Support code to help identify any issues */
  SupportCode?: string;
  Location?: {
    /** The Availability Zone. Follows the format us-east-2a (case-sensitive). */
    AvailabilityZone?: string;
    /** The AWS Region name. */
    RegionName?: string;
  };
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
    Value?: string;
  }[];
};
