// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpngateway.json

/**
 * Specifies a virtual private gateway. A virtual private gateway is the endpoint on the VPC side of
 * your VPN connection. You can create a virtual private gateway before creating the VPC itself.
 * For more information, see [](https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html) in the
 * *User Guide*.
 */
export type AwsEc2Vpngateway = {
  VPNGatewayId?: string;
  /** The private Autonomous System Number (ASN) for the Amazon side of a BGP session. */
  AmazonSideAsn?: number;
  /**
   * Any tags assigned to the virtual private gateway.
   * @uniqueItems false
   */
  Tags?: {
    /** The tag key. */
    Key: string;
    /** The tag value. */
    Value: string;
  }[];
  /** The type of VPN connection the virtual private gateway supports. */
  Type: string;
};
