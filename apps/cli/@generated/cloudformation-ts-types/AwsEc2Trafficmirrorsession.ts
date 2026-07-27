// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-trafficmirrorsession.json

/** Resource schema for AWS::EC2::TrafficMirrorSession */
export type AwsEc2Trafficmirrorsession = {
  /** The ID of a Traffic Mirror session. */
  Id?: string;
  /** The ID of the source network interface. */
  NetworkInterfaceId: string;
  /** The ID of a Traffic Mirror target. */
  TrafficMirrorTargetId: string;
  /** The ID of a Traffic Mirror filter. */
  TrafficMirrorFilterId: string;
  /** The number of bytes in each packet to mirror. */
  PacketLength?: number;
  /**
   * The session number determines the order in which sessions are evaluated when an interface is used
   * by multiple sessions. The first session with a matching filter is the one that mirrors the packets.
   */
  SessionNumber: number;
  /** The VXLAN ID for the Traffic Mirror session. */
  VirtualNetworkId?: number;
  /** The description of the Traffic Mirror session. */
  Description?: string;
  /** The ID of the account that owns the Traffic Mirror session. */
  OwnerId?: string;
  /**
   * The tags assigned to the Traffic Mirror session.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
