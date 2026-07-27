// This file is auto-generated. Do not edit manually.
// Source: aws-iotwireless-multicastgroup.json

/** Create and manage Multicast groups. */
export type AwsIotwirelessMulticastgroup = {
  /**
   * Name of Multicast group
   * @maxLength 256
   */
  Name?: string;
  /**
   * Multicast group description
   * @maxLength 2048
   */
  Description?: string;
  /** Multicast group LoRaWAN */
  LoRaWAN: {
    /**
     * Multicast group LoRaWAN RF region
     * @minLength 1
     * @maxLength 64
     */
    RfRegion: string;
    /**
     * Multicast group LoRaWAN DL Class
     * @minLength 1
     * @maxLength 64
     */
    DlClass: string;
    /** Multicast group number of devices requested. Returned after successful read. */
    NumberOfDevicesRequested?: number;
    /** Multicast group number of devices in group. Returned after successful read. */
    NumberOfDevicesInGroup?: number;
  };
  /** Multicast group arn. Returned after successful create. */
  Arn?: string;
  /**
   * Multicast group id. Returned after successful create.
   * @maxLength 256
   */
  Id?: string;
  /**
   * A list of key-value pairs that contain metadata for the Multicast group.
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
  /** Multicast group status. Returned after successful read. */
  Status?: string;
  /**
   * Wireless device to associate. Only for update request.
   * @maxLength 256
   */
  AssociateWirelessDevice?: string;
  /**
   * Wireless device to disassociate. Only for update request.
   * @maxLength 256
   */
  DisassociateWirelessDevice?: string;
};
