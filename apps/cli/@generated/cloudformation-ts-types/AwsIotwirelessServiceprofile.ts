// This file is auto-generated. Do not edit manually.
// Source: aws-iotwireless-serviceprofile.json

/** An example resource schema demonstrating some basic constructs and validation rules. */
export type AwsIotwirelessServiceprofile = {
  /**
   * Name of service profile
   * @maxLength 256
   */
  Name?: string;
  /**
   * LoRaWAN supports all LoRa specific attributes for service profile for CreateServiceProfile
   * operation
   */
  LoRaWAN?: {
    UlRate?: number;
    UlBucketSize?: number;
    UlRatePolicy?: string;
    DlRate?: number;
    DlBucketSize?: number;
    DlRatePolicy?: string;
    AddGwMetadata?: boolean;
    DevStatusReqFreq?: number;
    ReportDevStatusBattery?: boolean;
    ReportDevStatusMargin?: boolean;
    DrMin?: number;
    DrMax?: number;
    ChannelMask?: string;
    PrAllowed?: boolean;
    HrAllowed?: boolean;
    RaAllowed?: boolean;
    NwkGeoLoc?: boolean;
    TargetPer?: number;
    MinGwDiversity?: number;
  };
  /**
   * A list of key-value pairs that contain metadata for the service profile.
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
     * @minLength 1
     * @maxLength 256
     */
    Value?: string;
  }[];
  /** Service profile Arn. Returned after successful create. */
  Arn?: string;
  /**
   * Service profile Id. Returned after successful create.
   * @maxLength 256
   */
  Id?: string;
};
