// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-localgatewayroutetable.json

/**
 * Resource Type definition for Local Gateway Route Table which describes a route table for a local
 * gateway.
 */
export type AwsEc2Localgatewayroutetable = {
  /** The ID of the local gateway route table. */
  LocalGatewayRouteTableId?: string;
  /** The ARN of the local gateway route table. */
  LocalGatewayRouteTableArn?: string;
  /** The ID of the local gateway. */
  LocalGatewayId: string;
  /** The ARN of the outpost. */
  OutpostArn?: string;
  /** The owner of the local gateway route table. */
  OwnerId?: string;
  /** The state of the local gateway route table. */
  State?: string;
  /** The mode of the local gateway route table. */
  Mode?: string;
  /** The tags for the local gateway route table. */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 127
     * @pattern ^(?!aws:.*)
     */
    Key?: string;
    /**
     * @minLength 1
     * @maxLength 255
     * @pattern ^(?!aws:.*)
     */
    Value?: string;
  }[];
};
