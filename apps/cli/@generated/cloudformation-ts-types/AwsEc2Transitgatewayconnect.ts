// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewayconnect.json

/** The AWS::EC2::TransitGatewayConnect type */
export type AwsEc2Transitgatewayconnect = {
  /** The ID of the Connect attachment. */
  TransitGatewayAttachmentId?: string;
  /** The ID of the attachment from which the Connect attachment was created. */
  TransportTransitGatewayAttachmentId: string;
  /** The ID of the transit gateway. */
  TransitGatewayId?: string;
  /** The state of the attachment. */
  State?: string;
  /** The creation time. */
  CreationTime?: string;
  /** The tags for the attachment. */
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
  /** The Connect attachment options. */
  Options: {
    /** The tunnel protocol. */
    Protocol?: string;
  };
};
