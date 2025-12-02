// This file is auto-generated. Do not edit manually.
// Source: aws-lightsail-instance.json

/** Resource Type definition for AWS::Lightsail::Instance */
export type AwsLightsailInstance = {
  /** Support code to help identify any issues */
  SupportCode?: string;
  /** Resource type of Lightsail instance. */
  ResourceType?: string;
  /** Is the IP Address of the Instance is the static IP */
  IsStaticIp?: boolean;
  /** Private IP Address of the Instance */
  PrivateIpAddress?: string;
  /** Public IP Address of the Instance */
  PublicIpAddress?: string;
  /** IPv6 addresses of the instance */
  Ipv6Addresses?: string[];
  Location?: {
    /**
     * The Availability Zone in which to create your instance. Use the following format: us-east-2a (case
     * sensitive). Be sure to add the include Availability Zones parameter to your request.
     */
    AvailabilityZone?: string;
    /** The Region Name in which to create your instance. */
    RegionName?: string;
  };
  Hardware?: {
    /** CPU count of the Instance. */
    CpuCount?: number;
    /** RAM Size of the Instance. */
    RamSizeInGb?: number;
    /**
     * Disks attached to the Instance.
     * @uniqueItems true
     */
    Disks?: {
      /**
       * The names to use for your new Lightsail disk.
       * @minLength 1
       * @maxLength 254
       * @pattern ^[a-zA-Z0-9][\w\-.]*[a-zA-Z0-9]$
       */
      DiskName: string;
      /** Size of the disk attached to the Instance. */
      SizeInGb?: string;
      /** Is the Attached disk is the system disk of the Instance. */
      IsSystemDisk?: boolean;
      /** IOPS of disk. */
      IOPS?: number;
      /** Path of the disk attached to the instance. */
      Path: string;
      /** Instance attached to the disk. */
      AttachedTo?: string;
      /** Attachment state of the disk. */
      AttachmentState?: string;
    }[];
  };
  State?: {
    /** Status code of the Instance. */
    Code?: number;
    /** Status code of the Instance. */
    Name?: string;
  };
  Networking?: {
    /**
     * Ports to the Instance.
     * @uniqueItems true
     */
    Ports: {
      /** From Port of the Instance. */
      FromPort?: number;
      /** To Port of the Instance. */
      ToPort?: number;
      /** Port Protocol of the Instance. */
      Protocol?: string;
      /** Access From Protocol of the Instance. */
      AccessFrom?: string;
      /** Access Type Protocol of the Instance. */
      AccessType?: string;
      /** CommonName for Protocol of the Instance. */
      CommonName?: string;
      /** Access Direction for Protocol of the Instance(inbound/outbound). */
      AccessDirection?: string;
      Ipv6Cidrs?: string[];
      CidrListAliases?: string[];
      Cidrs?: string[];
    }[];
    MonthlyTransfer?: {
      /** GbPerMonthAllocated of the Instance. */
      GbPerMonthAllocated?: string;
    };
  };
  /** Username of the  Lightsail instance. */
  UserName?: string;
  /** SSH Key Name of the  Lightsail instance. */
  SshKeyName?: string;
  /**
   * The names to use for your new Lightsail instance.
   * @minLength 1
   * @maxLength 254
   * @pattern ^[a-zA-Z0-9][\w\-.]*[a-zA-Z0-9]$
   */
  InstanceName: string;
  /**
   * The Availability Zone in which to create your instance. Use the following format: us-east-2a (case
   * sensitive). Be sure to add the include Availability Zones parameter to your request.
   * @minLength 1
   * @maxLength 255
   */
  AvailabilityZone?: string;
  /**
   * The bundle of specification information for your virtual private server (or instance ), including
   * the pricing plan (e.g., micro_1_0 ).
   * @minLength 1
   * @maxLength 255
   */
  BundleId: string;
  /**
   * The ID for a virtual private server image (e.g., app_wordpress_4_4 or app_lamp_7_0 ). Use the get
   * blueprints operation to return a list of available images (or blueprints ).
   * @minLength 1
   * @maxLength 255
   */
  BlueprintId: string;
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
  /**
   * A launch script you can create that configures a server with additional user data. For example, you
   * might want to run apt-get -y update.
   */
  UserData?: string;
  /** The name of your key pair. */
  KeyPairName?: string;
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
  InstanceArn?: string;
};
