// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpnconnectionroute.json

/**
 * Specifies a static route for a VPN connection between an existing virtual private gateway and a VPN
 * customer gateway. The static route allows traffic to be routed from the virtual private gateway to
 * the VPN customer gateway.
 * For more information, see [](https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html) in the
 * *User Guide*.
 */
export type AwsEc2Vpnconnectionroute = {
  /** The CIDR block associated with the local subnet of the customer network. */
  DestinationCidrBlock: string;
  /** The ID of the VPN connection. */
  VpnConnectionId: string;
};
