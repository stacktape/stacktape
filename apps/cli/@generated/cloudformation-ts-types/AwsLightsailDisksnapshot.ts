// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-disksnapshot.json

/** Resource Type definition for AWS::Lightsail::DiskSnapshot */
export type AwsLightsailDisksnapshot = {
  /**
   * The name of the disk snapshot (e.g., my-disk-snapshot).
   * @minLength 2
   * @maxLength 255
   * @pattern ^\w[\w\-]*\w$
   */
  DiskSnapshotName: string;
  /**
   * The Amazon Resource Name (ARN) of the disk snapshot.
   * @pattern .*\S.*
   */
  DiskSnapshotArn?: string;
  /**
   * The name of the source disk from which the snapshot was created.
   * @minLength 2
   * @maxLength 255
   * @pattern ^\w[\w\-]*\w$
   */
  DiskName: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
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
  /** The AWS Region and Availability Zone where the disk snapshot was created. */
  Location?: {
    /** The Availability Zone where the disk snapshot was created. */
    AvailabilityZone?: string;
    /** The AWS Region where the disk snapshot was created. */
    RegionName?: string;
  };
  /**
   * The Lightsail resource type (DiskSnapshot).
   * @enum ["DiskSnapshot"]
   */
  ResourceType?: "DiskSnapshot";
  /**
   * The status of the disk snapshot operation.
   * @enum ["pending","completed","error","unknown"]
   */
  State?: "pending" | "completed" | "error" | "unknown";
  /** The progress of the disk snapshot creation operation. */
  Progress?: string;
  /**
   * The name of the source disk from which the disk snapshot was created.
   * @pattern ^\w[\w\-]*\w$
   */
  FromDiskName?: string;
  /**
   * The size of the disk snapshot in GB.
   * @minimum 1
   */
  SizeInGb?: number;
  /** A Boolean value indicating whether the snapshot was created from an automatic snapshot. */
  IsFromAutoSnapshot?: boolean;
  /** The timestamp when the disk snapshot was created. */
  CreatedAt?: string;
  /**
   * The support code. Include this code in your email to support when you have questions about an
   * instance or another resource in Lightsail.
   */
  SupportCode?: string;
};
