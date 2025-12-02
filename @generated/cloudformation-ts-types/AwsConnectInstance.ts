// This file is auto-generated. Do not edit manually.
// Source: aws-connect-instance.json

/** Resource Type definition for AWS::Connect::Instance */
export type AwsConnectInstance = {
  /** An instanceId is automatically generated on creation and assigned as the unique identifier. */
  Id?: string;
  /**
   * An instanceArn is automatically generated on creation based on instanceId.
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  Arn?: string;
  /**
   * Specifies the type of directory integration for new instance.
   * @enum ["SAML","CONNECT_MANAGED","EXISTING_DIRECTORY"]
   */
  IdentityManagementType: "SAML" | "CONNECT_MANAGED" | "EXISTING_DIRECTORY";
  /**
   * Alias of the new directory created as part of new instance creation.
   * @minLength 1
   * @maxLength 45
   * @pattern ^(?!d-)([\da-zA-Z]+)([-]*[\da-zA-Z])*$
   */
  InstanceAlias?: string;
  /** Timestamp of instance creation logged as part of instance creation. */
  CreatedTime?: string;
  /** Service linked role created as part of instance creation. */
  ServiceRole?: string;
  /**
   * Specifies the creation status of new instance.
   * @enum ["CREATION_IN_PROGRESS","CREATION_FAILED","ACTIVE"]
   */
  InstanceStatus?: "CREATION_IN_PROGRESS" | "CREATION_FAILED" | "ACTIVE";
  /**
   * Existing directoryId user wants to map to the new Connect instance.
   * @minLength 12
   * @maxLength 12
   * @pattern ^d-[0-9a-f]{10}$
   */
  DirectoryId?: string;
  /** The attributes for the instance. */
  Attributes: {
    InboundCalls: boolean;
    OutboundCalls: boolean;
    ContactflowLogs?: boolean;
    ContactLens?: boolean;
    AutoResolveBestVoices?: boolean;
    UseCustomTTSVoices?: boolean;
    EarlyMedia?: boolean;
    MultiPartyConference?: boolean;
    HighVolumeOutBound?: boolean;
    EnhancedContactMonitoring?: boolean;
    EnhancedChatMonitoring?: boolean;
    MultiPartyChatConference?: boolean;
  };
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
