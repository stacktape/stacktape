// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-network.json

/** Resource schema for AWS::MediaLive::Network. */
export type AwsMedialiveNetwork = {
  /** The ARN of the Network. */
  Arn?: string;
  AssociatedClusterIds?: string[];
  /** The unique ID of the Network. */
  Id?: string;
  /** The list of IP address cidr pools for the network */
  IpPools: {
    /** IP address cidr pool */
    Cidr?: string;
  }[];
  /** The user-specified name of the Network to be created. */
  Name: string;
  /** The routes for the network */
  Routes?: {
    /** Ip address cidr */
    Cidr?: string;
    /** IP address for the route packet paths */
    Gateway?: string;
  }[];
  /** The current state of the Network. */
  State?: "CREATING" | "CREATE_FAILED" | "ACTIVE" | "DELETING" | "IDLE" | "IN_USE" | "UPDATING" | "DELETED" | "DELETE_FAILED";
  /** A collection of key-value pairs. */
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
