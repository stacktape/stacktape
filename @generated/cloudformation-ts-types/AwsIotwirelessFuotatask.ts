// This file is auto-generated. Do not edit manually.
// Source: aws-iotwireless-fuotatask.json

/** Create and manage FUOTA tasks. */
export type AwsIotwirelessFuotatask = {
  /**
   * Name of FUOTA task
   * @maxLength 256
   */
  Name?: string;
  /**
   * FUOTA task description
   * @maxLength 2048
   */
  Description?: string;
  /** FUOTA task LoRaWAN */
  LoRaWAN: {
    /**
     * FUOTA task LoRaWAN start time
     * @maxLength 64
     */
    StartTime?: string;
    /**
     * FUOTA task LoRaWAN RF region
     * @minLength 1
     * @maxLength 64
     */
    RfRegion: string;
  };
  /**
   * FUOTA task firmware update image binary S3 link
   * @minLength 1
   * @maxLength 2048
   */
  FirmwareUpdateImage: string;
  /**
   * FUOTA task firmware IAM role for reading S3
   * @minLength 1
   * @maxLength 256
   */
  FirmwareUpdateRole: string;
  /** FUOTA task arn. Returned after successful create. */
  Arn?: string;
  /**
   * FUOTA task id. Returned after successful create.
   * @maxLength 256
   */
  Id?: string;
  /**
   * A list of key-value pairs that contain metadata for the FUOTA task.
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
  /** FUOTA task status. Returned after successful read. */
  FuotaTaskStatus?: string;
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
  /**
   * Multicast group to associate. Only for update request.
   * @maxLength 256
   */
  AssociateMulticastGroup?: string;
  /**
   * Multicast group to disassociate. Only for update request.
   * @maxLength 256
   */
  DisassociateMulticastGroup?: string;
};
