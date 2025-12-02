// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-localgatewayvirtualinterfacegroup.json

/**
 * Resource Type definition for LocalGatewayVirtualInterfaceGroup which describes a group of
 * LocalGateway VirtualInterfaces
 */
export type AwsEc2Localgatewayvirtualinterfacegroup = {
  /** The ID of the virtual interface group */
  LocalGatewayVirtualInterfaceGroupId?: string;
  /**
   * The IDs of the virtual interfaces
   * @uniqueItems true
   */
  LocalGatewayVirtualInterfaceIds?: string[];
  /** The ID of the local gateway */
  LocalGatewayId: string;
  /** The ID of the Amazon Web Services account that owns the local gateway virtual interface group */
  OwnerId?: string;
  /** The Autonomous System Number(ASN) for the local Border Gateway Protocol (BGP) */
  LocalBgpAsn?: number;
  /** The extended 32-bit ASN for the local BGP configuration */
  LocalBgpAsnExtended?: number;
  /** The Amazon Resource Number (ARN) of the local gateway virtual interface group */
  LocalGatewayVirtualInterfaceGroupArn?: string;
  /** The current state of the local gateway virtual interface group */
  ConfigurationState?: string;
  /**
   * The tags assigned to the virtual interface group
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
};
