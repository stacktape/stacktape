// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-ipamscope.json

/** Resource Schema of AWS::EC2::IPAMScope Type */
export type AwsEc2Ipamscope = {
  /** Id of the IPAM scope. */
  IpamScopeId?: string;
  /** The Amazon Resource Name (ARN) of the IPAM scope. */
  Arn?: string;
  /** The Id of the IPAM this scope is a part of. */
  IpamId: string;
  /** The Amazon Resource Name (ARN) of the IPAM this scope is a part of. */
  IpamArn?: string;
  /**
   * Determines whether this scope contains publicly routable space or space for a private network
   * @enum ["public","private"]
   */
  IpamScopeType?: "public" | "private";
  /** Is this one of the default scopes created with the IPAM. */
  IsDefault?: boolean;
  Description?: string;
  /** The number of pools that currently exist in this scope. */
  PoolCount?: number;
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
  ExternalAuthorityConfiguration?: {
    /**
     * An external service connecting to your AWS IPAM scope.
     * @enum ["infoblox"]
     */
    IpamScopeExternalAuthorityType: "infoblox";
    /** Resource identifier of the scope in the external service connecting to your AWS IPAM scope. */
    ExternalResourceIdentifier: string;
  };
};
