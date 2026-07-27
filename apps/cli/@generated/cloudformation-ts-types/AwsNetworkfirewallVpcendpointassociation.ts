// This file is auto-generated. Do not edit manually.
// Source: aws-networkfirewall-vpcendpointassociation.json

/** Resource type definition for AWS::NetworkFirewall::VpcEndpointAssociation */
export type AwsNetworkfirewallVpcendpointassociation = {
  VpcEndpointAssociationArn?: string;
  VpcEndpointAssociationId?: string;
  Description?: string;
  FirewallArn: string;
  VpcId: string;
  EndpointId?: string;
  SubnetMapping: {
    /** A SubnetId. */
    SubnetId: string;
    /** A IPAddressType */
    IPAddressType?: string;
  };
  /** @uniqueItems true */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^.*$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 255
     * @pattern ^.*$
     */
    Value: string;
  }[];
};
