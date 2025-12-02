// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-subnetcidrblock.json

/** The AWS::EC2::SubnetCidrBlock resource creates association between subnet and IPv6 CIDR */
export type AwsEc2Subnetcidrblock = {
  /** Information about the IPv6 association. */
  Id?: string;
  /**
   * The IPv6 network range for the subnet, in CIDR notation. The subnet size must use a /64 prefix
   * length
   * @maxLength 42
   */
  Ipv6CidrBlock?: string;
  /**
   * The ID of an IPv6 Amazon VPC IP Address Manager (IPAM) pool from which to allocate, to get the
   * subnet's CIDR
   */
  Ipv6IpamPoolId?: string;
  /**
   * The netmask length of the IPv6 CIDR to allocate to the subnet from an IPAM pool
   * @minimum 0
   * @maximum 128
   */
  Ipv6NetmaskLength?: number;
  /** The ID of the subnet */
  SubnetId: string;
  /** The value denoting whether an IPv6 Subnet CIDR Block is public or private. */
  Ipv6AddressAttribute?: string;
  /** The IP Source of an IPv6 Subnet CIDR Block. */
  IpSource?: string;
};
