// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-routetable.json

/**
 * Specifies a route table for the specified VPC. After you create a route table, you can add routes
 * and associate the table with a subnet.
 * For more information, see [Route
 * tables](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html) in the *Amazon VPC
 * User Guide*.
 */
export type AwsEc2Routetable = {
  RouteTableId?: string;
  /** The ID of the VPC. */
  VpcId: string;
  /**
   * Any tags assigned to the route table.
   * @uniqueItems false
   */
  Tags?: {
    /** The tag value. */
    Value: string;
    /** The tag key. */
    Key: string;
  }[];
};
