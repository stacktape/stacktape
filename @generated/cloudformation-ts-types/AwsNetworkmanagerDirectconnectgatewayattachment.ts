// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-directconnectgatewayattachment.json

/** AWS::NetworkManager::DirectConnectGatewayAttachment Resource Type */
export type AwsNetworkmanagerDirectconnectgatewayattachment = {
  /** The ID of a core network for the Direct Connect Gateway attachment. */
  CoreNetworkId: string;
  /** The ARN of a core network for the Direct Connect Gateway attachment. */
  CoreNetworkArn?: string;
  /** Id of the attachment. */
  AttachmentId?: string;
  /** Owner account of the attachment. */
  OwnerAccountId?: string;
  /** Attachment type. */
  AttachmentType?: string;
  /** State of the attachment. */
  State?: string;
  /** The Regions where the edges are located. */
  EdgeLocations: string[];
  /** The ARN of the Direct Connect Gateway. */
  DirectConnectGatewayArn: string;
  /** The ARN of the Resource. */
  ResourceArn?: string;
  /** The policy rule number associated with the attachment. */
  AttachmentPolicyRuleNumber?: number;
  /** The name of the segment attachment.. */
  SegmentName?: string;
  /** The attachment to move from one segment to another. */
  ProposedSegmentChange?: {
    /**
     * The key-value tags that changed for the segment.
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
  /** Errors from the last modification of the attachment. */
  LastModificationErrors?: string[];
};
