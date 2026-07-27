// This file is auto-generated. Do not edit manually.
// Source: aws-iotwireless-deviceprofile.json

/** Device Profile's resource schema demonstrating some basic constructs and validation rules. */
export type AwsIotwirelessDeviceprofile = {
  /**
   * Name of service profile
   * @maxLength 256
   */
  Name?: string;
  /**
   * LoRaWANDeviceProfile supports all LoRa specific attributes for service profile for
   * CreateDeviceProfile operation
   */
  LoRaWAN?: {
    SupportsClassB?: boolean;
    /**
     * @minimum 0
     * @maximum 1000
     */
    ClassBTimeout?: number;
    /**
     * @minimum 128
     * @maximum 4096
     */
    PingSlotPeriod?: number;
    /**
     * @minimum 0
     * @maximum 15
     */
    PingSlotDr?: number;
    /**
     * @minimum 1000000
     * @maximum 16700000
     */
    PingSlotFreq?: number;
    SupportsClassC?: boolean;
    /**
     * @minimum 0
     * @maximum 1000
     */
    ClassCTimeout?: number;
    /** @maxLength 64 */
    MacVersion?: string;
    /** @maxLength 64 */
    RegParamsRevision?: string;
    /**
     * @minimum 0
     * @maximum 15
     */
    RxDelay1?: number;
    /**
     * @minimum 0
     * @maximum 7
     */
    RxDrOffset1?: number;
    /**
     * @minimum 1000000
     * @maximum 16700000
     */
    RxFreq2?: number;
    /**
     * @minimum 0
     * @maximum 15
     */
    RxDataRate2?: number;
    /** @maxItems 20 */
    FactoryPresetFreqsList?: number[];
    /**
     * @minimum 0
     * @maximum 15
     */
    MaxEirp?: number;
    /**
     * @minimum 0
     * @maximum 100
     */
    MaxDutyCycle?: number;
    SupportsJoin?: boolean;
    /** @maxLength 64 */
    RfRegion?: string;
    Supports32BitFCnt?: boolean;
  };
  /**
   * A list of key-value pairs that contain metadata for the device profile.
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
