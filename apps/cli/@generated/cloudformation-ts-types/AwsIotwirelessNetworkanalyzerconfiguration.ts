// This file is auto-generated. Do not edit manually.
// Source: aws-iotwireless-networkanalyzerconfiguration.json

/** Create and manage NetworkAnalyzerConfiguration resource. */
export type AwsIotwirelessNetworkanalyzerconfiguration = {
  /**
   * Name of the network analyzer configuration
   * @maxLength 1024
   * @pattern ^[a-zA-Z0-9-_]+$
   */
  Name: string;
  /**
   * The description of the new resource
   * @maxLength 2048
   */
  Description?: string;
  /** Trace content for your wireless gateway and wireless device resources */
  TraceContent?: {
    WirelessDeviceFrameInfo?: "ENABLED" | "DISABLED";
    LogLevel?: "INFO" | "ERROR" | "DISABLED";
  };
  /**
   * List of wireless gateway resources that have been added to the network analyzer configuration
   * @maxItems 250
   */
  WirelessDevices?: string[];
  /**
   * List of wireless gateway resources that have been added to the network analyzer configuration
   * @maxItems 250
   */
  WirelessGateways?: string[];
  /** Arn for network analyzer configuration, Returned upon successful create. */
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 200
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
