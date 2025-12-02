// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-subnetroutetableassociation.json

/**
 * Associates a subnet with a route table. The subnet and route table must be in the same VPC. This
 * association causes traffic originating from the subnet to be routed according to the routes in the
 * route table. A route table can be associated with multiple subnets. To create a route table, see
 * [AWS::EC2::RouteTable](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-routetable.html).
 */
export type AwsEc2Subnetroutetableassociation = {
  /**
   * The ID of the route table.
   * The physical ID changes when the route table ID is changed.
   */
  RouteTableId: string;
  Id?: string;
  /** The ID of the subnet. */
  SubnetId: string;
};
