// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpcdhcpoptionsassociation.json

/** Associates a set of DHCP options with a VPC, or associates no DHCP options with the VPC. */
export type AwsEc2Vpcdhcpoptionsassociation = {
  /** The ID of the DHCP options set, or default to associate no DHCP options with the VPC. */
  DhcpOptionsId: string;
  /** The ID of the VPC. */
  VpcId: string;
};
