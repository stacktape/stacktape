// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-ipampoolcidr.json

/** Resource Schema of AWS::EC2::IPAMPoolCidr Type */
export type AwsEc2Ipampoolcidr = {
  /** Id of the IPAM Pool Cidr. */
  IpamPoolCidrId?: string;
  /** Id of the IPAM Pool. */
  IpamPoolId: string;
  /** Represents a single IPv4 or IPv6 CIDR */
  Cidr?: string;
  /**
   * The desired netmask length of the provision. If set, IPAM will choose a block of free space with
   * this size and return the CIDR representing it.
   */
  NetmaskLength?: number;
  /** Provisioned state of the cidr. */
  State?: string;
};
