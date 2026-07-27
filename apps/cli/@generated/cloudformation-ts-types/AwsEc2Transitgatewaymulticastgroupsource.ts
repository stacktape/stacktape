// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewaymulticastgroupsource.json

/**
 * The AWS::EC2::TransitGatewayMulticastGroupSource registers and deregisters members and sources
 * (network interfaces) with the transit gateway multicast group
 */
export type AwsEc2Transitgatewaymulticastgroupsource = {
  /** The IP address assigned to the transit gateway multicast group. */
  GroupIpAddress: string;
  /** The ID of the transit gateway attachment. */
  TransitGatewayAttachmentId?: string;
  /** The ID of the transit gateway multicast domain. */
  TransitGatewayMulticastDomainId: string;
  /** The ID of the subnet. */
  SubnetId?: string;
  /** The ID of the resource. */
  ResourceId?: string;
  /** The type of resource, for example a VPC attachment. */
  ResourceType?: string;
  /** The ID of the transit gateway attachment. */
  NetworkInterfaceId: string;
  /** Indicates that the resource is a transit gateway multicast group member. */
  GroupMember?: boolean;
  /** Indicates that the resource is a transit gateway multicast group member. */
  GroupSource?: boolean;
  /** The source type. */
  SourceType?: string;
};
