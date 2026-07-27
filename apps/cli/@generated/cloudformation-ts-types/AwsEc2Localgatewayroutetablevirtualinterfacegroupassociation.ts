// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-localgatewayroutetablevirtualinterfacegroupassociation.json

/**
 * Resource Type definition for Local Gateway Route Table Virtual Interface Group Association which
 * describes a local gateway route table virtual interface group association for a local gateway.
 */
export type AwsEc2Localgatewayroutetablevirtualinterfacegroupassociation = {
  /** The ID of the local gateway route table virtual interface group association. */
  LocalGatewayRouteTableVirtualInterfaceGroupAssociationId?: string;
  /** The ID of the local gateway. */
  LocalGatewayId?: string;
  /** The ID of the local gateway route table. */
  LocalGatewayRouteTableId: string;
  /** The ARN of the local gateway route table. */
  LocalGatewayRouteTableArn?: string;
  /** The ID of the local gateway route table virtual interface group. */
  LocalGatewayVirtualInterfaceGroupId: string;
  /** The owner of the local gateway route table virtual interface group association. */
  OwnerId?: string;
  /** The state of the local gateway route table virtual interface group association. */
  State?: string;
  /** The tags for the local gateway route table virtual interface group association. */
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
