// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewaymulticastdomain.json

/** The AWS::EC2::TransitGatewayMulticastDomain type */
export type AwsEc2Transitgatewaymulticastdomain = {
  /** The ID of the transit gateway multicast domain. */
  TransitGatewayMulticastDomainId?: string;
  /** The Amazon Resource Name (ARN) of the transit gateway multicast domain. */
  TransitGatewayMulticastDomainArn?: string;
  /** The ID of the transit gateway. */
  TransitGatewayId: string;
  /** The state of the transit gateway multicast domain. */
  State?: string;
  /** The time the transit gateway multicast domain was created. */
  CreationTime?: string;
  /** The tags for the transit gateway multicast domain. */
  Tags?: {
    /**
     * The key of the tag. Constraints: Tag keys are case-sensitive and accept a maximum of 127 Unicode
     * characters. May not begin with aws:.
     */
    Key?: string;
    /**
     * The value of the tag. Constraints: Tag values are case-sensitive and accept a maximum of 255
     * Unicode characters.
     */
    Value?: string;
  }[];
  /** The options for the transit gateway multicast domain. */
  Options?: {
    /**
     * Indicates whether to automatically cross-account subnet associations that are associated with the
     * transit gateway multicast domain. Valid Values: enable | disable
     */
    AutoAcceptSharedAssociations?: string;
    /**
     * Indicates whether Internet Group Management Protocol (IGMP) version 2 is turned on for the transit
     * gateway multicast domain. Valid Values: enable | disable
     */
    Igmpv2Support?: string;
    /**
     * Indicates whether support for statically configuring transit gateway multicast group sources is
     * turned on. Valid Values: enable | disable
     */
    StaticSourcesSupport?: string;
  };
};
