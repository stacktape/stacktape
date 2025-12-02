// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewaymeteringpolicyentry.json

/** AWS::EC2::TransitGatewayMeteringPolicyEntry Resource Definition */
export type AwsEc2Transitgatewaymeteringpolicyentry = {
  /** The ID of the source attachment through which traffic leaves a transit gateway */
  DestinationTransitGatewayAttachmentId?: string;
  /** The list of ports on source instances sending traffic to the transit gateway */
  SourcePortRange?: string;
  /** The rule number of the metering policy entry */
  PolicyRuleNumber: number;
  /** The type of the attachment through which traffic leaves a transit gateway */
  DestinationTransitGatewayAttachmentType?: "vpc" | "vpn" | "direct-connect-gateway" | "peering" | "network-function" | "vpn-concentrator";
  /** The list of IP addresses of the instances receiving traffic from the transit gateway */
  DestinationCidrBlock?: string;
  /** The ID of the transit gateway metering policy for which the entry is being created */
  TransitGatewayMeteringPolicyId: string;
  /** The list of ports on destination instances receiving traffic from the transit gateway */
  DestinationPortRange?: string;
  /** The resource owner information responsible for paying default billable charges for the traffic flow */
  MeteredAccount: "source-attachment-owner" | "destination-attachment-owner" | "transit-gateway-owner";
  /**
   * The timestamp at which the latest action performed on the metering policy entry will become
   * effective
   */
  UpdateEffectiveAt?: string;
  /** State of the transit gateway metering policy */
  State?: string;
  /**
   * The list of IP addresses of the instances sending traffic to the transit gateway for which the
   * metering policy entry is applicable
   */
  SourceCidrBlock?: string;
  /** The protocol of the traffic */
  Protocol?: string;
  /** The ID of the source attachment through which traffic enters a transit gateway */
  SourceTransitGatewayAttachmentId?: string;
  /** The type of the attachment through which traffic enters a  transit gateway */
  SourceTransitGatewayAttachmentType?: "vpc" | "vpn" | "direct-connect-gateway" | "peering" | "network-function" | "vpn-concentrator";
};
