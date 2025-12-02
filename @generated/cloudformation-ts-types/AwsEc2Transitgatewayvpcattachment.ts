// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewayvpcattachment.json

/** Resource Type definition for AWS::EC2::TransitGatewayVpcAttachment */
export type AwsEc2Transitgatewayvpcattachment = {
  Id?: string;
  TransitGatewayId: string;
  VpcId: string;
  /** @uniqueItems false */
  SubnetIds: string[];
  /** @uniqueItems false */
  AddSubnetIds?: string[];
  /** @uniqueItems false */
  RemoveSubnetIds?: string[];
  /** @uniqueItems false */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  /** The options for the transit gateway vpc attachment. */
  Options?: {
    /** Indicates whether to enable DNS Support for Vpc Attachment. Valid Values: enable | disable */
    DnsSupport?: string;
    /** Indicates whether to enable Ipv6 Support for Vpc Attachment. Valid Values: enable | disable */
    Ipv6Support?: string;
    /** Indicates whether to enable Ipv6 Support for Vpc Attachment. Valid Values: enable | disable */
    ApplianceModeSupport?: string;
    /**
     * Indicates whether to enable Security Group referencing support for Vpc Attachment. Valid values:
     * enable | disable
     */
    SecurityGroupReferencingSupport?: string;
  };
};
