// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-vpcattachment.json

/** AWS::NetworkManager::VpcAttachment Resoruce Type */
export type AwsNetworkmanagerVpcattachment = {
  /** The ID of a core network for the VPC attachment. */
  CoreNetworkId: string;
  /** The ARN of a core network for the VPC attachment. */
  CoreNetworkArn?: string;
  /** Id of the attachment. */
  AttachmentId?: string;
  /** Owner account of the attachment. */
  OwnerAccountId?: string;
  /** Attachment type. */
  AttachmentType?: string;
  /** State of the attachment. */
  State?: string;
  /** The Region where the edge is located. */
  EdgeLocation?: string;
  /** The ARN of the VPC. */
  VpcArn: string;
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
  /** Subnet Arn list */
  SubnetArns: string[];
  /** Vpc options of the attachment. */
  Options?: {
    /**
     * Indicates whether to enable Ipv6 Support for Vpc Attachment. Valid Values: enable | disable
     * @default false
     */
    Ipv6Support?: boolean;
    /**
     * Indicates whether to enable ApplianceModeSupport Support for Vpc Attachment. Valid Values: true |
     * false
     * @default false
     */
    ApplianceModeSupport?: boolean;
    /**
     * Indicates whether to enable private DNS Support for Vpc Attachment. Valid Values: true | false
     * @default true
     */
    DnsSupport?: boolean;
    /**
     * Indicates whether to enable Security Group Referencing Support for Vpc Attachment. Valid Values:
     * true | false
     * @default true
     */
    SecurityGroupReferencingSupport?: boolean;
  };
  /** Errors from the last modification of the attachment. */
  LastModificationErrors?: string[];
};
