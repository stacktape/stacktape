// This file is auto-generated. Do not edit manually.
// Source: aws-mediaconnect-bridge.json

/** Resource schema for AWS::MediaConnect::Bridge */
export type AwsMediaconnectBridge = {
  /** The name of the bridge. */
  Name: string;
  /** The Amazon Resource Number (ARN) of the bridge. */
  BridgeArn?: string;
  /** The placement Amazon Resource Number (ARN) of the bridge. */
  PlacementArn: string;
  BridgeState?: "CREATING" | "STANDBY" | "STARTING" | "DEPLOYING" | "ACTIVE" | "STOPPING" | "DELETING" | "DELETED" | "START_FAILED" | "START_PENDING" | "UPDATING";
  SourceFailoverConfig?: {
    State?: "ENABLED" | "DISABLED";
    /** The type of failover you choose for this flow. FAILOVER allows switching between different streams. */
    FailoverMode: "FAILOVER";
    /**
     * The priority you want to assign to a source. You can have a primary stream and a backup stream or
     * two equally prioritized streams.
     */
    SourcePriority?: {
      /** The name of the source you choose as the primary source for this flow. */
      PrimarySource?: string;
    };
  };
  /**
   * The outputs on this bridge.
   * @minItems 0
   * @maxItems 2
   */
  Outputs?: ({
    NetworkOutput?: {
      /** The network output name. */
      Name: string;
      /** The network output protocol. */
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
  })[];
  /**
   * The sources on this bridge.
   * @minItems 0
   * @maxItems 2
   */
  Sources: ({
    FlowSource?: {
      /** The name of the flow source. */
      Name: string;
      /** The ARN of the cloud flow used as a source of this bridge. */
      FlowArn: string;
      /** The name of the VPC interface attachment to use for this source. */
      FlowVpcInterfaceAttachment?: {
        /** The name of the VPC interface to use for this resource. */
        VpcInterfaceName?: string;
      };
    };
    NetworkSource?: {
      /** The name of the network source. */
      Name: string;
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
  })[];
  IngressGatewayBridge?: {
    /** The maximum expected bitrate of the ingress bridge. */
    MaxBitrate: number;
    /** The maximum number of outputs on the ingress bridge. */
    MaxOutputs: number;
  };
  EgressGatewayBridge?: {
    /** The maximum expected bitrate of the egress bridge. */
    MaxBitrate: number;
  };
};
