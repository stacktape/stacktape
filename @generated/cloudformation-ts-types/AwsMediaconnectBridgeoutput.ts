// This file is auto-generated. Do not edit manually.
// Source: aws-mediaconnect-bridgeoutput.json

/** Resource schema for AWS::MediaConnect::BridgeOutput */
export type AwsMediaconnectBridgeoutput = {
  /** The Amazon Resource Number (ARN) of the bridge. */
  BridgeArn: string;
  /** The output of the bridge. */
  NetworkOutput: {
    /**
     * The network output protocol.
     * @enum ["rtp-fec","rtp","udp"]
     */
    Protocol: "rtp-fec" | "rtp" | "udp";
    /** The network output IP Address. */
    IpAddress: string;
    /** The network output port. */
    Port: number;
    /** The network output's gateway network name. */
    NetworkName: string;
    /** The network output TTL. */
    Ttl: number;
  };
  /** The network output name. */
  Name: string;
};
