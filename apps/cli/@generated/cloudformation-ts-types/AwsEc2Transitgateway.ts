// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgateway.json

/** Resource Type definition for AWS::EC2::TransitGateway */
export type AwsEc2Transitgateway = {
  DefaultRouteTablePropagation?: string;
  TransitGatewayArn?: string;
  Description?: string;
  AutoAcceptSharedAttachments?: string;
  DefaultRouteTableAssociation?: string;
  Id?: string;
  VpnEcmpSupport?: string;
  DnsSupport?: string;
  SecurityGroupReferencingSupport?: string;
  MulticastSupport?: string;
  AmazonSideAsn?: number;
  TransitGatewayCidrBlocks?: string[];
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  AssociationDefaultRouteTableId?: string;
  PropagationDefaultRouteTableId?: string;
  /** @enum ["disable","enable"] */
  EncryptionSupport?: "disable" | "enable";
  EncryptionSupportState?: string;
};
