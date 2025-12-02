// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewaypeeringattachment.json

/** The AWS::EC2::TransitGatewayPeeringAttachment type */
export type AwsEc2Transitgatewaypeeringattachment = {
  /** The status of the transit gateway peering attachment. */
  Status?: {
    /** The status message, if applicable. */
    Message?: string;
    /** The status code. */
    Code?: string;
  };
  /** The ID of the transit gateway. */
  TransitGatewayId: string;
  /** The ID of the peer transit gateway. */
  PeerTransitGatewayId: string;
  /** The ID of the peer account */
  PeerAccountId: string;
  /**
   * The state of the transit gateway peering attachment. Note that the initiating state has been
   * deprecated.
   */
  State?: string;
  /** The time the transit gateway peering attachment was created. */
  CreationTime?: string;
  /** Peer Region */
  PeerRegion: string;
  /** The tags for the transit gateway peering attachment. */
  Tags?: {
    /**
     * The value of the tag. Constraints: Tag values are case-sensitive and accept a maximum of 255
     * Unicode characters.
     */
    Value?: string;
    /**
     * The key of the tag. Constraints: Tag keys are case-sensitive and accept a maximum of 127 Unicode
     * characters. May not begin with aws:.
     */
    Key?: string;
  }[];
  /** The ID of the transit gateway peering attachment. */
  TransitGatewayAttachmentId?: string;
};
