// This file is auto-generated. Do not edit manually.
// Source: aws-networkfirewall-firewall.json

/** Resource type definition for AWS::NetworkFirewall::Firewall */
export type AwsNetworkfirewallFirewall = {
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-]+$
   */
  FirewallName: string;
  FirewallArn?: string;
  /**
   * @minLength 36
   * @maxLength 36
   * @pattern ^([0-9a-f]{8})-([0-9a-f]{4}-){3}([0-9a-f]{12})$
   */
  FirewallId?: string;
  FirewallPolicyArn: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^vpc-[0-9a-f]+$
   */
  VpcId?: string;
  /** @uniqueItems true */
  SubnetMappings?: {
    /** A SubnetId. */
    SubnetId: string;
    /** A IPAddressType */
    IPAddressType?: string;
  }[];
  /** @uniqueItems true */
  AvailabilityZoneMappings?: {
    /** A AvailabilityZone */
    AvailabilityZone: string;
  }[];
  DeleteProtection?: boolean;
  SubnetChangeProtection?: boolean;
  AvailabilityZoneChangeProtection?: boolean;
  FirewallPolicyChangeProtection?: boolean;
  /**
   * @maxLength 128
   * @pattern ^tgw-[0-9a-z]+$
   */
  TransitGatewayId?: string;
  /**
   * @minLength 1
   * @maxLength 128
   * @pattern ^tgw-attach-[0-9a-z]+$
   */
  TransitGatewayAttachmentId?: string;
  /**
   * @maxLength 512
   * @pattern ^.*$
   */
  Description?: string;
  EndpointIds?: string[];
  /** The types of analysis to enable for the firewall. Can be TLS_SNI, HTTP_HOST, or both. */
  EnabledAnalysisTypes?: ("TLS_SNI" | "HTTP_HOST")[];
  /** @uniqueItems true */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 255
     */
    Value: string;
  }[];
};
