// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-ipamallocation.json

/** Resource Schema of AWS::EC2::IPAMAllocation Type */
export type AwsEc2Ipamallocation = {
  /** Id of the allocation. */
  IpamPoolAllocationId?: string;
  /** Id of the IPAM Pool. */
  IpamPoolId: string;
  Cidr?: string;
  /**
   * The desired netmask length of the allocation. If set, IPAM will choose a block of free space with
   * this size and return the CIDR representing it.
   */
  NetmaskLength?: number;
  Description?: string;
};
