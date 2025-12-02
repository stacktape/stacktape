// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewaymulticastdomainassociation.json

/** The AWS::EC2::TransitGatewayMulticastDomainAssociation type */
export type AwsEc2Transitgatewaymulticastdomainassociation = {
  /** The ID of the transit gateway multicast domain. */
  TransitGatewayMulticastDomainId: string;
  /** The ID of the transit gateway attachment. */
  TransitGatewayAttachmentId: string;
  /** The ID of the resource. */
  ResourceId?: string;
  /** The type of resource, for example a VPC attachment. */
  ResourceType?: string;
  /** The state of the subnet association. */
  State?: string;
  /** The IDs of the subnets to associate with the transit gateway multicast domain. */
  SubnetId: string;
};
