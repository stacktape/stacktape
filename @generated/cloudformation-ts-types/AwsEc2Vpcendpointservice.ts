// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-vpcendpointservice.json

/** Resource Type definition for AWS::EC2::VPCEndpointService */
export type AwsEc2Vpcendpointservice = {
  /** @uniqueItems false */
  NetworkLoadBalancerArns?: string[];
  ContributorInsightsEnabled?: boolean;
  PayerResponsibility?: string;
  ServiceId?: string;
  AcceptanceRequired?: boolean;
  /** @uniqueItems false */
  GatewayLoadBalancerArns?: string[];
  /**
   * The tags to add to the VPC endpoint service.
   * @uniqueItems false
   */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  /**
   * Specify which Ip Address types are supported for VPC endpoint service.
   * @uniqueItems false
   */
  SupportedIpAddressTypes?: ("ipv4" | "ipv6")[];
  /**
   * The Regions from which service consumers can access the service.
   * @uniqueItems true
   */
  SupportedRegions?: string[];
};
