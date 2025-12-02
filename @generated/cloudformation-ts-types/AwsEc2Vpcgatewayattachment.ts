// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpcgatewayattachment.json

/** Resource Type definition for AWS::EC2::VPCGatewayAttachment */
export type AwsEc2Vpcgatewayattachment = {
  /** Used to identify if this resource is an Internet Gateway or Vpn Gateway Attachment */
  AttachmentType?: string;
  /**
   * The ID of the internet gateway. You must specify either InternetGatewayId or VpnGatewayId, but not
   * both.
   */
  InternetGatewayId?: string;
  /** The ID of the VPC. */
  VpcId: string;
  /**
   * The ID of the virtual private gateway. You must specify either InternetGatewayId or VpnGatewayId,
   * but not both.
   */
  VpnGatewayId?: string;
};
