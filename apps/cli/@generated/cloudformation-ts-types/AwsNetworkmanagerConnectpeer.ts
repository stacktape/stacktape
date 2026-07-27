// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-connectpeer.json

/** AWS::NetworkManager::ConnectPeer Resource Type Definition. */
export type AwsNetworkmanagerConnectpeer = {
  /** The IP address of the Connect peer. */
  PeerAddress: string;
  /** The IP address of a core network. */
  CoreNetworkAddress?: string;
  /** Bgp options for connect peer. */
  BgpOptions?: {
    PeerAsn?: number;
  };
  /** The inside IP addresses used for a Connect peer configuration. */
  InsideCidrBlocks?: string[];
  /** The ID of the core network. */
  CoreNetworkId?: string;
  /** The ID of the attachment to connect. */
  ConnectAttachmentId: string;
  /** The ID of the Connect peer. */
  ConnectPeerId?: string;
  /** The Connect peer Regions where edges are located. */
  EdgeLocation?: string;
  /** State of the connect peer. */
  State?: string;
  /** Connect peer creation time. */
  CreatedAt?: string;
  /** Configuration of the connect peer. */
  Configuration?: {
    /** The IP address of a core network. */
    CoreNetworkAddress?: string;
    /** The IP address of the Connect peer. */
    PeerAddress?: string;
    /** The inside IP addresses used for a Connect peer configuration. */
    InsideCidrBlocks?: string[];
    Protocol?: string;
    BgpConfigurations?: {
      /** The ASN of the Coret Network. */
      CoreNetworkAsn?: number;
      /** The ASN of the Connect peer. */
      PeerAsn?: number;
      /** The address of a core network. */
      CoreNetworkAddress?: string;
      /** The address of a core network Connect peer. */
      PeerAddress?: string;
    }[];
  };
  /** The subnet ARN for the connect peer. */
  SubnetArn?: string;
  /** Errors from the last modification of the connect peer. */
  LastModificationErrors?: string[];
  /**
   * An array of key-value pairs to apply to this resource.
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
