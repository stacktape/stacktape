// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-localgatewayroutetablevpcassociation.json

/**
 * Resource Type definition for Local Gateway Route Table VPC Association which describes an
 * association between a local gateway route table and a VPC.
 */
export type AwsEc2Localgatewayroutetablevpcassociation = {
  /** The ID of the local gateway. */
  LocalGatewayId?: string;
  /** The ID of the local gateway route table. */
  LocalGatewayRouteTableId: string;
  /** The ID of the association. */
  LocalGatewayRouteTableVpcAssociationId?: string;
  /** The state of the association. */
  State?: string;
  /** The ID of the VPC. */
  VpcId: string;
  /** The tags for the association. */
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
