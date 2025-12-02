// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewayattachment.json

/** Resource Type definition for AWS::EC2::TransitGatewayAttachment */
export type AwsEc2Transitgatewayattachment = {
  /** The options for the transit gateway vpc attachment. */
  Options?: {
    /** Indicates whether to enable Ipv6 Support for Vpc Attachment. Valid Values: enable | disable */
    Ipv6Support?: string;
    /** Indicates whether to enable Ipv6 Support for Vpc Attachment. Valid Values: enable | disable */
    ApplianceModeSupport?: string;
    /**
     * Indicates whether to enable Security Group referencing support for Vpc Attachment. Valid Values:
     * enable | disable
     */
    SecurityGroupReferencingSupport?: string;
    /** Indicates whether to enable DNS Support for Vpc Attachment. Valid Values: enable | disable */
    DnsSupport?: string;
  };
  TransitGatewayId: string;
  VpcId: string;
  Id?: string;
  /** @uniqueItems false */
  SubnetIds: string[];
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
};
