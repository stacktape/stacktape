// This file is auto-generated. Do not edit manually.
// Source: aws-globalaccelerator-accelerator.json

/** Resource Type definition for AWS::GlobalAccelerator::Accelerator */
export type AwsGlobalacceleratorAccelerator = {
  /**
   * Name of accelerator.
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9_-]{0,64}$
   */
  Name: string;
  /**
   * IP Address type.
   * @default "IPV4"
   * @enum ["IPV4","DUAL_STACK"]
   */
  IpAddressType?: "IPV4" | "DUAL_STACK";
  /**
   * The IP addresses from BYOIP Prefix pool.
   * @default null
   */
  IpAddresses?: string[];
  /**
   * Indicates whether an accelerator is enabled. The value is true or false.
   * @default true
   */
  Enabled?: boolean;
  /**
   * The Domain Name System (DNS) name that Global Accelerator creates that points to your accelerator's
   * static IPv4 addresses.
   */
  DnsName?: string;
  /** The IPv4 addresses assigned to the accelerator. */
  Ipv4Addresses?: string[];
  /**
   * The IPv6 addresses assigned if the accelerator is dualstack
   * @default null
   */
  Ipv6Addresses?: string[];
  /**
   * The Domain Name System (DNS) name that Global Accelerator creates that points to your accelerator's
   * static IPv4 and IPv6 addresses.
   */
  DualStackDnsName?: string;
  /** The Amazon Resource Name (ARN) of the accelerator. */
  AcceleratorArn?: string;
  Tags?: {
    /**
     * Key of the tag. Value can be 1 to 127 characters.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * Value for the tag. Value can be 1 to 255 characters.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
};
