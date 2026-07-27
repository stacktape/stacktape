// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewayroute.json

/** Resource Type definition for AWS::EC2::TransitGatewayRoute */
export type AwsEc2Transitgatewayroute = {
  /** The ID of transit gateway route table. */
  TransitGatewayRouteTableId: string;
  /**
   * The CIDR range used for destination matches. Routing decisions are based on the most specific
   * match.
   */
  DestinationCidrBlock: string;
  /** Indicates whether to drop traffic that matches this route. */
  Blackhole?: boolean;
  /** The ID of transit gateway attachment. */
  TransitGatewayAttachmentId?: string;
};
