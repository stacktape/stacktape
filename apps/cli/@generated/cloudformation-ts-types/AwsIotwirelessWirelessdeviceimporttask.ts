// This file is auto-generated. Do not edit manually.
// Source: aws-iotwireless-wirelessdeviceimporttask.json

/** Wireless Device Import Tasks */
export type AwsIotwirelessWirelessdeviceimporttask = {
  /**
   * Id for Wireless Device Import Task, Returned upon successful start.
   * @maxLength 256
   */
  Id?: string;
  /**
   * Arn for Wireless Device Import Task, Returned upon successful start.
   * @maxLength 128
   */
  Arn?: string;
  /**
   * Destination Name for import task
   * @maxLength 128
   * @pattern [a-zA-Z0-9-_]+
   */
  DestinationName: string;
  /** CreationDate for import task */
  CreationDate?: string;
  /** sidewalk contain file for created device and role */
  Sidewalk: {
    /** @maxLength 64 */
    SidewalkManufacturingSn?: string;
    /** @maxLength 1024 */
    DeviceCreationFile?: string;
    DeviceCreationFileList?: string[];
    Role?: string;
  };
  /**
   * Status for import task
   * @enum ["INITIALIZING","INITIALIZED","PENDING","COMPLETE","FAILED","DELETING"]
   */
  Status?: "INITIALIZING" | "INITIALIZED" | "PENDING" | "COMPLETE" | "FAILED" | "DELETING";
  /** StatusReason for import task */
  StatusReason?: string;
  /** Initialized Imported Devices Count */
  InitializedImportedDevicesCount?: number;
  /** Pending Imported Devices Count */
  PendingImportedDevicesCount?: number;
  /** Onboarded Imported Devices Count */
  OnboardedImportedDevicesCount?: number;
  /** Failed Imported Devices Count */
  FailedImportedDevicesCount?: number;
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
};
