// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-localgatewayroute.json

/**
 * Resource Type definition for Local Gateway Route which describes a route for a local gateway route
 * table.
 */
export type AwsEc2Localgatewayroute = {
  /** The CIDR block used for destination matches. */
  DestinationCidrBlock?: string;
  /** The ID of the local gateway route table. */
  LocalGatewayRouteTableId?: string;
  /** The ID of the virtual interface group. */
  LocalGatewayVirtualInterfaceGroupId?: string;
  /** The ID of the network interface. */
  NetworkInterfaceId?: string;
  /** The state of the route. */
  State?: string;
  /** The route type. */
  Type?: string;
};
