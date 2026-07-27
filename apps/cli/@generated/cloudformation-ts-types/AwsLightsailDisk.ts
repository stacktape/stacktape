// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-disk.json

/** Resource Type definition for AWS::Lightsail::Disk */
export type AwsLightsailDisk = {
  /**
   * The names to use for your new Lightsail disk.
   * @minLength 1
   * @maxLength 254
   * @pattern ^[a-zA-Z0-9][\w\-.]*[a-zA-Z0-9]$
   */
  DiskName: string;
  DiskArn?: string;
  /** Support code to help identify any issues */
  SupportCode?: string;
  /**
   * The Availability Zone in which to create your instance. Use the following format: us-east-2a (case
   * sensitive). Be sure to add the include Availability Zones parameter to your request.
   * @minLength 1
   * @maxLength 255
   */
  AvailabilityZone?: string;
  Location?: {
    /**
     * The Availability Zone in which to create your disk. Use the following format: us-east-2a (case
     * sensitive). Be sure to add the include Availability Zones parameter to your request.
     */
    AvailabilityZone?: string;
    /** The Region Name in which to create your disk. */
    RegionName?: string;
  };
  /** Resource type of Lightsail instance. */
  ResourceType?: string;
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
  /** An array of objects representing the add-ons to enable for the new instance. */
  AddOns?: ({
    /**
     * The add-on type
     * @minLength 1
     * @maxLength 128
     */
    AddOnType: string;
    /**
     * Status of the Addon
     * @enum ["Enabling","Disabling","Enabled","Terminating","Terminated","Disabled","Failed"]
     */
    Status?: "Enabling" | "Disabling" | "Enabled" | "Terminating" | "Terminated" | "Disabled" | "Failed";
    AutoSnapshotAddOnRequest?: {
      /**
       * The daily time when an automatic snapshot will be created.
       * @pattern ^[0-9]{2}:00$
       */
      SnapshotTimeOfDay?: string;
    };
  })[];
  /** State of the Lightsail disk */
  State?: string;
  /** Attachment State of the Lightsail disk */
  AttachmentState?: string;
  /** Size of the Lightsail disk */
  SizeInGb: number;
  /** Iops of the Lightsail disk */
  Iops?: number;
  /** Check is Disk is attached state */
  IsAttached?: boolean;
  /** Path of the  attached Disk */
  Path?: string;
  /** Name of the attached Lightsail Instance */
  AttachedTo?: string;
};
