// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-connectattachment.json

/** AWS::NetworkManager::ConnectAttachment Resource Type Definition */
export type AwsNetworkmanagerConnectattachment = {
  /** ID of the CoreNetwork that the attachment will be attached to. */
  CoreNetworkId: string;
  /** The ARN of a core network. */
  CoreNetworkArn?: string;
  /** The ID of the attachment. */
  AttachmentId?: string;
  /** The ID of the attachment account owner. */
  OwnerAccountId?: string;
  /** The type of attachment. */
  AttachmentType?: string;
  /** State of the attachment. */
  State?: string;
  /** Edge location of the attachment. */
  EdgeLocation: string;
  /** The attachment resource ARN. */
  ResourceArn?: string;
  /** The policy rule number associated with the attachment. */
  AttachmentPolicyRuleNumber?: number;
  /** The name of the segment attachment. */
  SegmentName?: string;
  /** The attachment to move from one segment to another. */
  ProposedSegmentChange?: {
    /**
     * The list of key-value tags that changed for the segment.
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
    /** The rule number in the policy document that applies to this change. */
    AttachmentPolicyRuleNumber?: number;
    /** The name of the segment to change. */
    SegmentName?: string;
  };
  /** The name of the network function group attachment. */
  NetworkFunctionGroupName?: string;
  /** The attachment to move from one network function group to another. */
  ProposedNetworkFunctionGroupChange?: {
    /**
     * The key-value tags that changed for the network function group.
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
    /** The rule number in the policy document that applies to this change. */
    AttachmentPolicyRuleNumber?: number;
    /** The name of the network function group to change. */
    NetworkFunctionGroupName?: string;
  };
  /**
   * Tags for the attachment.
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
  /** Creation time of the attachment. */
  CreatedAt?: string;
  /** Last update time of the attachment. */
  UpdatedAt?: string;
  /** Id of transport attachment */
  TransportAttachmentId: string;
  /** Protocol options for connect attachment */
  Options: {
    /** Tunnel protocol for connect attachment */
    Protocol?: string;
  };
  /** Errors from the last modification of the attachment. */
  LastModificationErrors?: string[];
};
