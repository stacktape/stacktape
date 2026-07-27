// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewayroutetable.json

/** Resource Type definition for AWS::EC2::TransitGatewayRouteTable */
export type AwsEc2Transitgatewayroutetable = {
  /** Transit Gateway Route Table primary identifier */
  TransitGatewayRouteTableId?: string;
  /** The ID of the transit gateway. */
  TransitGatewayId: string;
  /**
   * Tags are composed of a Key/Value pair. You can use tags to categorize and track each parameter
   * group. The tag value null is permitted.
   * @uniqueItems false
   */
  Tags?: {
    /** The value of the associated tag key-value pair */
    Value: string;
    /** The key of the associated tag key-value pair */
    Key: string;
  }[];
};
