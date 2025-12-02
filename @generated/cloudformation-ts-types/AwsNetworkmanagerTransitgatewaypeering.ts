// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-transitgatewaypeering.json

/** AWS::NetworkManager::TransitGatewayPeering Resoruce Type. */
export type AwsNetworkmanagerTransitgatewaypeering = {
  /** The Id of the core network that you want to peer a transit gateway to. */
  CoreNetworkId: string;
  /** The ARN (Amazon Resource Name) of the core network that you want to peer a transit gateway to. */
  CoreNetworkArn?: string;
  /** The ARN (Amazon Resource Name) of the transit gateway that you will peer to a core network */
  TransitGatewayArn: string;
  /** The ID of the TransitGatewayPeeringAttachment */
  TransitGatewayPeeringAttachmentId?: string;
  /** The Id of the transit gateway peering */
  PeeringId?: string;
  /** The state of the transit gateway peering */
  State?: string;
  /** The location of the transit gateway peering */
  EdgeLocation?: string;
  /** The ARN (Amazon Resource Name) of the resource that you will peer to a core network */
  ResourceArn?: string;
  /** Peering owner account Id */
  OwnerAccountId?: string;
  /** Peering type (TransitGatewayPeering) */
  PeeringType?: string;
  /** The creation time of the transit gateway peering */
  CreatedAt?: string;
  /** Errors from the last modification of the transit gateway peering. */
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
    Value: string;
  }[];
};
