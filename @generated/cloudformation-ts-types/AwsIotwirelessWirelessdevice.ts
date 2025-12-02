// This file is auto-generated. Do not edit manually.
// Source: aws-iotwireless-wirelessdevice.json

/** Create and manage wireless gateways, including LoRa gateways. */
export type AwsIotwirelessWirelessdevice = {
  /**
   * Wireless device type, currently only Sidewalk and LoRa
   * @enum ["Sidewalk","LoRaWAN"]
   */
  Type: "Sidewalk" | "LoRaWAN";
  /**
   * Wireless device name
   * @maxLength 256
   */
  Name?: string;
  /**
   * Wireless device description
   * @maxLength 2048
   */
  Description?: string;
  /**
   * Wireless device destination name
   * @maxLength 128
   */
  DestinationName: string;
  /**
   * The combination of Package, Station and Model which represents the version of the LoRaWAN Wireless
   * Device.
   */
  LoRaWAN?: unknown | unknown | unknown | unknown;
  /**
   * A list of key-value pairs that contain metadata for the device. Currently not supported, will not
   * create if tags are passed.
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key?: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
  /** Wireless device arn. Returned after successful create. */
  Arn?: string;
  /**
   * Wireless device Id. Returned after successful create.
   * @maxLength 256
   */
  Id?: string;
  /** Thing arn. Passed into update to associate Thing with Wireless device. */
  ThingArn?: string;
  /** Thing Arn. If there is a Thing created, this can be returned with a Get call. */
  ThingName?: string;
  /** The date and time when the most recent uplink was received. */
  LastUplinkReceivedAt?: string;
  /**
   * FPort values for the GNSS, stream, and ClockSync functions of the positioning information.
   * @enum ["Enabled","Disabled"]
   */
  Positioning?: "Enabled" | "Disabled";
};
