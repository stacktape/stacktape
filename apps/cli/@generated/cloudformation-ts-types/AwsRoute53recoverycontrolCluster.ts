// This file is auto-generated. Do not edit manually.
// Source: aws-route53recoverycontrol-cluster.json

/** AWS Route53 Recovery Control Cluster resource schema */
export type AwsRoute53recoverycontrolCluster = {
  /**
   * Name of a Cluster. You can use any non-white space character in the name
   * @minLength 1
   * @maxLength 64
   */
  Name: string;
  /**
   * The Amazon Resource Name (ARN) of the cluster.
   * @minLength 1
   * @maxLength 2048
   * @pattern ^[A-Za-z0-9:\/_-]*$
   */
  ClusterArn?: string;
  /**
   * Deployment status of a resource. Status can be one of the following: PENDING, DEPLOYED,
   * PENDING_DELETION.
   * @enum ["PENDING","DEPLOYED","PENDING_DELETION"]
   */
  Status?: "PENDING" | "DEPLOYED" | "PENDING_DELETION";
  /** Endpoints for the cluster. */
  ClusterEndpoints?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Endpoint?: string;
    /**
     * @minLength 1
     * @maxLength 32
     */
    Region?: string;
  }[];
  /** A collection of tags associated with a resource */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /** @maxLength 256 */
    Value: string;
  }[];
  /**
   * Cluster supports IPv4 endpoints and Dual-stack IPv4 and IPv6 endpoints. NetworkType can be IPV4 or
   * DUALSTACK.
   * @enum ["IPV4","DUALSTACK"]
   */
  NetworkType?: "IPV4" | "DUALSTACK";
};
