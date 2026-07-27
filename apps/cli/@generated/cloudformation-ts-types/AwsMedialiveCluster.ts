// This file is auto-generated. Do not edit manually.
// Source: aws-medialive-cluster.json

/** Definition of AWS::MediaLive::Cluster Resource Type */
export type AwsMedialiveCluster = {
  /**
   * The ARN of the Cluster.
   * @pattern ^arn:.+:medialive:.+:cluster:.+$
   */
  Arn?: string;
  /** The MediaLive Channels that are currently running on Nodes in this Cluster. */
  ChannelIds?: string[];
  ClusterType?: "ON_PREMISES" | "OUTPOSTS_RACK" | "OUTPOSTS_SERVER" | "EC2";
  /** The unique ID of the Cluster. */
  Id?: string;
  /**
   * The IAM role your nodes will use.
   * @pattern ^arn:.+:iam:.+:role/.+$
   */
  InstanceRoleArn?: string;
  /** The user-specified name of the Cluster to be created. */
  Name?: string;
  NetworkSettings?: {
    /** Default value if the customer does not define it in channel Output API */
    DefaultRoute?: string;
    /** Network mappings for the cluster */
    InterfaceMappings?: {
      /** logical interface name, unique in the list */
      LogicalInterfaceName?: string;
      /** Network Id to be associated with the logical interface name, can be duplicated in list */
      NetworkId?: string;
    }[];
  };
  State?: "CREATING" | "CREATE_FAILED" | "ACTIVE" | "DELETING" | "DELETED";
  /** A collection of key-value pairs. */
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
