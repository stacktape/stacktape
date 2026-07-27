// This file is auto-generated. Do not edit manually.
// Source: aws-neptunegraph-graph.json

/** The AWS::NeptuneGraph::Graph resource creates an Amazon NeptuneGraph Graph. */
export type AwsNeptunegraphGraph = {
  /**
   * Value that indicates whether the Graph has deletion protection enabled. The graph can't be deleted
   * when deletion protection is enabled.
   * _Default_: If not specified, the default value is true.
   */
  DeletionProtection?: boolean;
  /**
   * Contains a user-supplied name for the Graph.
   * If you don't specify a name, we generate a unique Graph Name using a combination of Stack Name and
   * a UUID comprising of 4 characters.
   * _Important_: If you specify a name, you cannot perform updates that require replacement of this
   * resource. You can perform updates that require no or some interruption. If you must replace the
   * resource, specify a new name.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-z][a-zA-Z0-9]*(-[a-zA-Z0-9]+)*$
   */
  GraphName?: string;
  /** Memory for the Graph. */
  ProvisionedMemory: number;
  /**
   * Specifies whether the Graph can be reached over the internet. Access to all graphs requires IAM
   * authentication.
   * When the Graph is publicly reachable, its Domain Name System (DNS) endpoint resolves to the public
   * IP address from the internet.
   * When the Graph isn't publicly reachable, you need to create a PrivateGraphEndpoint in a given VPC
   * to ensure the DNS name resolves to a private IP address that is reachable from the VPC.
   * _Default_: If not specified, the default value is false.
   */
  PublicConnectivity?: boolean;
  /**
   * Specifies the number of replicas you want when finished. All replicas will be provisioned in
   * different availability zones.
   * Replica Count should always be less than or equal to 2.
   * _Default_: If not specified, the default value is 1.
   */
  ReplicaCount?: number;
  /**
   * The tags associated with this graph.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
  /** Vector Search Configuration */
  VectorSearchConfiguration?: {
    /** The vector search dimension */
    VectorSearchDimension: number;
  };
  /**
   * The connection endpoint for the graph. For example:
   * `g-12a3bcdef4.us-east-1.neptune-graph.amazonaws.com`
   */
  Endpoint?: string;
  /** Graph resource ARN */
  GraphArn?: string;
  /** The auto-generated id assigned by the service. */
  GraphId?: string;
};
