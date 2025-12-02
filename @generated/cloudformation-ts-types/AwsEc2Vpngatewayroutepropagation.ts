// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpngatewayroutepropagation.json

/** Resource Type definition for AWS::EC2::VPNGatewayRoutePropagation */
export type AwsEc2Vpngatewayroutepropagation = {
  Id?: string;
  /**
   * The ID of the route table. The routing table must be associated with the same VPC that the virtual
   * private gateway is attached to
   * @uniqueItems false
   */
  RouteTableIds: string[];
  /**
   * The ID of the virtual private gateway that is attached to a VPC. The virtual private gateway must
   * be attached to the same VPC that the routing tables are associated with
   */
  VpnGatewayId: string;
};
