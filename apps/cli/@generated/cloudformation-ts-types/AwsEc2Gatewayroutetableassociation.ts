// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-gatewayroutetableassociation.json

/**
 * Associates a gateway with a route table. The gateway and route table must be in the same VPC. This
 * association causes the incoming traffic to the gateway to be routed according to the routes in the
 * route table.
 */
export type AwsEc2Gatewayroutetableassociation = {
  /** The ID of the route table. */
  RouteTableId: string;
  /** The ID of the gateway. */
  GatewayId: string;
  /** The route table association ID. */
  AssociationId?: string;
};
