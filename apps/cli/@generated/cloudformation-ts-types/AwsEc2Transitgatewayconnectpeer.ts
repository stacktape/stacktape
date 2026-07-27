// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-transitgatewayconnectpeer.json

/** Resource Type definition for AWS::EC2::TransitGatewayConnectPeer */
export type AwsEc2Transitgatewayconnectpeer = {
  /** The ID of the Connect attachment. */
  TransitGatewayAttachmentId: string;
  /** The ID of the Connect peer. */
  TransitGatewayConnectPeerId?: string;
  /** The state of the Connect peer. */
  State?: string;
  /** The creation time. */
  CreationTime?: string;
  /** The Connect peer details. */
  ConnectPeerConfiguration: {
    /** The Connect peer IP address on the transit gateway side of the tunnel. */
    TransitGatewayAddress?: string;
    /** The peer IP address (GRE outer IP address) on the appliance side of the Connect peer. */
    PeerAddress: string;
    /** The range of interior BGP peer IP addresses. */
    InsideCidrBlocks: string[];
    /** The tunnel protocol. */
    Protocol?: string;
    /** The BGP configuration details. */
    BgpConfigurations?: {
      /** The transit gateway Autonomous System Number (ASN). */
      TransitGatewayAsn?: number;
      /** The peer Autonomous System Number (ASN). */
      PeerAsn?: number;
      /** The interior BGP peer IP address for the transit gateway. */
      TransitGatewayAddress?: string;
      /** The interior BGP peer IP address for the appliance. */
      PeerAddress?: string;
      /** The BGP status. */
      BgpStatus?: string;
    }[];
  };
  /** The tags for the Connect Peer. */
  Tags?: {
    /**
     * The value of the tag. Constraints: Tag values are case-sensitive and accept a maximum of 256
     * Unicode characters.
     */
    Value?: string;
    /**
     * The key of the tag. Constraints: Tag keys are case-sensitive and accept a maximum of 127 Unicode
     * characters. May not begin with aws: .
     */
    Key?: string;
  }[];
};
