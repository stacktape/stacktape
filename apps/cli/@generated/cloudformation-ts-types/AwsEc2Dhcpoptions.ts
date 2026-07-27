// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-dhcpoptions.json

/** Resource Type definition for AWS::EC2::DHCPOptions */
export type AwsEc2Dhcpoptions = {
  DhcpOptionsId?: string;
  /** This value is used to complete unqualified DNS hostnames. */
  DomainName?: string;
  /**
   * The IPv4 addresses of up to four domain name servers, or AmazonProvidedDNS.
   * @uniqueItems true
   */
  DomainNameServers?: string[];
  /**
   * The IPv4 addresses of up to four NetBIOS name servers.
   * @uniqueItems true
   */
  NetbiosNameServers?: string[];
  /** The NetBIOS node type (1, 2, 4, or 8). */
  NetbiosNodeType?: number;
  /**
   * The IPv4 addresses of up to four Network Time Protocol (NTP) servers.
   * @uniqueItems false
   */
  NtpServers?: string[];
  /** The preferred Lease Time for ipV6 address in seconds. */
  Ipv6AddressPreferredLeaseTime?: number;
  /**
   * Any tags assigned to the DHCP options set.
   * @uniqueItems false
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
