// This file is auto-generated. Do not edit manually.
// Source: aws-iotwireless-wirelessgateway.json

/** Create and manage wireless gateways, including LoRa gateways. */
export type AwsIotwirelessWirelessgateway = {
  /**
   * Name of Wireless Gateway.
   * @maxLength 256
   */
  Name?: string;
  /**
   * Description of Wireless Gateway.
   * @maxLength 2048
   */
  Description?: string;
  /**
   * A list of key-value pairs that contain metadata for the gateway.
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
  /**
   * The combination of Package, Station and Model which represents the version of the LoRaWAN Wireless
   * Gateway.
   */
  LoRaWAN: {
    /** @pattern ^(([0-9A-Fa-f]{2}-){7}|([0-9A-Fa-f]{2}:){7}|([0-9A-Fa-f]{2}\s){7}|([0-9A-Fa-f]{2}){7})([0-9A-Fa-f]{2})$ */
    GatewayEui: string;
    /** @maxLength 64 */
    RfRegion: string;
  };
  /** Arn for Wireless Gateway. Returned upon successful create. */
  Arn?: string;
  /**
   * Id for Wireless Gateway. Returned upon successful create.
   * @maxLength 256
   */
  Id?: string;
  /** Thing Arn. Passed into Update to associate a Thing with the Wireless Gateway. */
  ThingArn?: string;
  /** Thing Name. If there is a Thing created, this can be returned with a Get call. */
  ThingName?: string;
  /** The date and time when the most recent uplink was received. */
  LastUplinkReceivedAt?: string;
};
