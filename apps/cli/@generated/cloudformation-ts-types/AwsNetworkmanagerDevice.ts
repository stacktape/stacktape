// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-device.json

/** The AWS::NetworkManager::Device type describes a device. */
export type AwsNetworkmanagerDevice = {
  /** The Amazon Resource Name (ARN) of the device. */
  DeviceArn?: string;
  /** The ID of the device. */
  DeviceId?: string;
  /** The description of the device. */
  Description?: string;
  /**
   * The tags for the device.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value: string;
  }[];
  /** The ID of the global network. */
  GlobalNetworkId: string;
  /** The Amazon Web Services location of the device, if applicable. */
  AWSLocation?: {
    /**
     * The Zone that the device is located in. Specify the ID of an Availability Zone, Local Zone,
     * Wavelength Zone, or an Outpost.
     */
    Zone?: string;
    /** The Amazon Resource Name (ARN) of the subnet that the device is located in. */
    SubnetArn?: string;
  };
  /** The site location. */
  Location?: {
    /** The physical address. */
    Address?: string;
    /** The latitude. */
    Latitude?: string;
    /** The longitude. */
    Longitude?: string;
  };
  /** The device model */
  Model?: string;
  /** The device serial number. */
  SerialNumber?: string;
  /** The site ID. */
  SiteId?: string;
  /** The device type. */
  Type?: string;
  /** The device vendor. */
  Vendor?: string;
  /** The date and time that the device was created. */
  CreatedAt?: string;
  /** The state of the device. */
  State?: string;
};
