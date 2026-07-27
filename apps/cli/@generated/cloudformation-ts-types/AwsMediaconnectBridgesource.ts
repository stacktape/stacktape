// This file is auto-generated. Do not edit manually.
// Source: aws-mediaconnect-bridgesource.json

/** Resource schema for AWS::MediaConnect::BridgeSource */
export type AwsMediaconnectBridgesource = {
  /** The name of the source. */
  Name: string;
  /** The Amazon Resource Number (ARN) of the bridge. */
  BridgeArn: string;
  FlowSource?: {
    /** The ARN of the cloud flow used as a source of this bridge. */
    FlowArn: string;
    /** The name of the VPC interface attachment to use for this source. */
    FlowVpcInterfaceAttachment?: {
      /** The name of the VPC interface to use for this resource. */
      VpcInterfaceName?: string;
    };
  };
  NetworkSource?: {
    /** The network source protocol. */
    Protocol: "rtp-fec" | "rtp" | "udp";
    /** The network source multicast IP. */
    MulticastIp: string;
    /** The settings related to the multicast source. */
    MulticastSourceSettings?: {
      /** The IP address of the source for source-specific multicast (SSM). */
      MulticastSourceIp?: string;
    };
    /** The network source port. */
    Port: number;
    /** The network source's gateway network name. */
    NetworkName: string;
  };
};
