// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpnconcentrator.json

/** Resource Type definition for AWS::EC2::VPNConcentrator */
export type AwsEc2Vpnconcentrator = {
  /** The provider-assigned unique ID for this managed resource */
  VpnConcentratorId?: string;
  /** The ID of the transit gateway */
  TransitGatewayId: string;
  /** The ID of the transit gateway attachment */
  TransitGatewayAttachmentId?: string;
  /** The type of VPN concentrator */
  Type: string;
  /**
   * Any tags assigned to the VPN concentrator.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
