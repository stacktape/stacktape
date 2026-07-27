// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-localgatewayvirtualinterface.json

/**
 * Resource Type definition for Local Gateway Virtual Interface which describes a virtual interface
 * for AWS Outposts local gateways.
 */
export type AwsEc2Localgatewayvirtualinterface = {
  /** The ID of the virtual interface */
  LocalGatewayVirtualInterfaceId?: string;
  /** The ID of the local gateway */
  LocalGatewayId?: string;
  /** The ID of the virtual interface group */
  LocalGatewayVirtualInterfaceGroupId: string;
  /** The Outpost LAG ID. */
  OutpostLagId: string;
  /** The ID of the VLAN. */
  Vlan: number;
  /** The local address. */
  LocalAddress: string;
  /** The peer address. */
  PeerAddress: string;
  /** The Autonomous System Number(ASN) for the local Border Gateway Protocol (BGP) */
  LocalBgpAsn?: number;
  /** The peer BGP ASN. */
  PeerBgpAsn?: number;
  /** The extended 32-bit ASN of the BGP peer for use with larger ASN values. */
  PeerBgpAsnExtended?: number;
  /** The ID of the Amazon Web Services account that owns the local gateway virtual interface group */
  OwnerId?: string;
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
     * @maxLength 127
     * @pattern ^(?!aws:.*)
     */
    Key?: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     * @pattern ^(?!aws:.*)
     */
    Value?: string;
  }[];
  /** The current state of the local gateway virtual interface */
  ConfigurationState?: string;
};
