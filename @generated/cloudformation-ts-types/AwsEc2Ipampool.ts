// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-ipampool.json

/** Resource Schema of AWS::EC2::IPAMPool Type */
export type AwsEc2Ipampool = {
  /** Id of the IPAM Pool. */
  IpamPoolId?: string;
  /** The address family of the address space in this pool. Either IPv4 or IPv6. */
  AddressFamily: string;
  /** The minimum allowed netmask length for allocations made from this pool. */
  AllocationMinNetmaskLength?: number;
  /**
   * The default netmask length for allocations made from this pool. This value is used when the netmask
   * length of an allocation isn't specified.
   */
  AllocationDefaultNetmaskLength?: number;
  /** The maximum allowed netmask length for allocations made from this pool. */
  AllocationMaxNetmaskLength?: number;
  /**
   * When specified, an allocation will not be allowed unless a resource has a matching set of tags.
   * @uniqueItems true
   */
  AllocationResourceTags?: {
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
  /** The Amazon Resource Name (ARN) of the IPAM Pool. */
  Arn?: string;
  /**
   * Determines what to do if IPAM discovers resources that haven't been assigned an allocation. If set
   * to true, an allocation will be made automatically.
   */
  AutoImport?: boolean;
  /**
   * Limits which service in Amazon Web Services that the pool can be used in.
   * @enum ["ec2"]
   */
  AwsService?: "ec2";
  Description?: string;
  /** The Id of the scope this pool is a part of. */
  IpamScopeId: string;
  /** The Amazon Resource Name (ARN) of the scope this pool is a part of. */
  IpamScopeArn?: string;
  /**
   * Determines whether this scope contains publicly routable space or space for a private network
   * @enum ["public","private"]
   */
  IpamScopeType?: "public" | "private";
  /** The Amazon Resource Name (ARN) of the IPAM this pool is a part of. */
  IpamArn?: string;
  /**
   * The region of this pool. If not set, this will default to "None" which will disable non-custom
   * allocations. If the locale has been specified for the source pool, this value must match.
   */
  Locale?: string;
  /** The depth of this pool in the source pool hierarchy. */
  PoolDepth?: number;
  /**
   * A list of cidrs representing the address space available for allocation in this pool.
   * @uniqueItems true
   */
  ProvisionedCidrs?: {
    Cidr: string;
  }[];
  /**
   * The IP address source for pools in the public scope. Only used for provisioning IP address CIDRs to
   * pools in the public scope. Default is `byoip`.
   * @enum ["byoip","amazon"]
   */
  PublicIpSource?: "byoip" | "amazon";
  /**
   * Determines whether or not address space from this pool is publicly advertised. Must be set if and
   * only if the pool is IPv6.
   */
  PubliclyAdvertisable?: boolean;
  /**
   * The Id of this pool's source. If set, all space provisioned in this pool must be free space
   * provisioned in the parent pool.
   */
  SourceIpamPoolId?: string;
  SourceResource?: {
    ResourceId: string;
    ResourceType: string;
    ResourceRegion: string;
    ResourceOwner: string;
  };
  /**
   * The state of this pool. This can be one of the following values: "create-in-progress",
   * "create-complete", "modify-in-progress", "modify-complete", "delete-in-progress", or
   * "delete-complete"
   * @enum ["create-in-progress","create-complete","modify-in-progress","modify-complete","delete-in-progress","delete-complete"]
   */
  State?: "create-in-progress" | "create-complete" | "modify-in-progress" | "modify-complete" | "delete-in-progress" | "delete-complete";
  /** An explanation of how the pool arrived at it current state. */
  StateMessage?: string;
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
