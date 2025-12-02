// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-corenetwork.json

/** AWS::NetworkManager::CoreNetwork Resource Type Definition. */
export type AwsNetworkmanagerCorenetwork = {
  /** The ID of the global network that your core network is a part of. */
  GlobalNetworkId: string;
  /** The Id of core network */
  CoreNetworkId?: string;
  /** The ARN (Amazon resource name) of core network */
  CoreNetworkArn?: string;
  /** Live policy document for the core network, you must provide PolicyDocument in Json Format */
  PolicyDocument?: Record<string, unknown>;
  /** The description of core network */
  Description?: string;
  /** The creation time of core network */
  CreatedAt?: string;
  /** The state of core network */
  State?: string;
  /** The segments within a core network. */
  Segments?: {
    /** Name of segment */
    Name?: string;
    EdgeLocations?: string[];
    SharedSegments?: string[];
  }[];
  /** The network function groups within a core network. */
  NetworkFunctionGroups?: {
    /** Name of network function group */
    Name?: string;
    EdgeLocations?: string[];
    Segments?: {
      SendTo?: string[];
      SendVia?: string[];
    };
  }[];
  /** The edges within a core network. */
  Edges?: {
    /** The Region where a core network edge is located. */
    EdgeLocation?: string;
    /** The ASN of a core network edge. */
    Asn?: number;
    InsideCidrBlocks?: string[];
  }[];
  /** Owner of the core network */
  OwnerAccount?: string;
  /**
   * The tags for the global network.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value: string;
  }[];
};
