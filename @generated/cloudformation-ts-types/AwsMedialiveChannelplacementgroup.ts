// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-channelplacementgroup.json

/** Definition of AWS::MediaLive::ChannelPlacementGroup Resource Type */
export type AwsMedialiveChannelplacementgroup = {
  /** The ARN of the channel placement group. */
  Arn?: string;
  /** List of channel IDs added to the channel placement group. */
  Channels?: string[];
  /** The ID of the cluster the node is on. */
  ClusterId?: string;
  /** Unique internal identifier. */
  Id?: string;
  /** The name of the channel placement group. */
  Name?: string;
  /** List of nodes added to the channel placement group */
  Nodes?: string[];
  State?: "UNASSIGNED" | "ASSIGNING" | "ASSIGNED" | "DELETING" | "DELETED" | "UNASSIGNING";
  /** A collection of key-value pairs. */
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
