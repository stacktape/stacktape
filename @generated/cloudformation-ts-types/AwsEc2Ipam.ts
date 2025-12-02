// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-ipam.json

/** Resource Schema of AWS::EC2::IPAM Type */
export type AwsEc2Ipam = {
  /** Id of the IPAM. */
  IpamId?: string;
  /** The Amazon Resource Name (ARN) of the IPAM. */
  Arn?: string;
  /** The Id of the default resource discovery, created with this IPAM. */
  DefaultResourceDiscoveryId?: string;
  /** The Id of the default association to the default resource discovery, created with this IPAM. */
  DefaultResourceDiscoveryAssociationId?: string;
  /** The count of resource discoveries associated with this IPAM. */
  ResourceDiscoveryAssociationCount?: number;
  Description?: string;
  /**
   * The Id of the default scope for publicly routable IP space, created with this IPAM.
   * @maxLength 255
   */
  PublicDefaultScopeId?: string;
  /** The Id of the default scope for publicly routable IP space, created with this IPAM. */
  PrivateDefaultScopeId?: string;
  /** The number of scopes that currently exist in this IPAM. */
  ScopeCount?: number;
  /**
   * The regions IPAM is enabled for. Allows pools to be created in these regions, as well as enabling
   * monitoring
   * @uniqueItems true
   */
  OperatingRegions?: {
    /** The name of the region. */
    RegionName: string;
  }[];
  /**
   * The tier of the IPAM.
   * @enum ["free","advanced"]
   */
  Tier?: "free" | "advanced";
  /** Enable provisioning of GUA space in private pools. */
  EnablePrivateGua?: boolean;
  /**
   * A metered account is an account that is charged for active IP addresses managed in IPAM
   * @enum ["ipam-owner","resource-owner"]
   */
  MeteredAccount?: "ipam-owner" | "resource-owner";
  /**
   * A set of organizational unit (OU) exclusions for the default resource discovery, created with this
   * IPAM.
   * @uniqueItems true
   */
  DefaultResourceDiscoveryOrganizationalUnitExclusions?: {
    /**
     * An AWS Organizations entity path. Build the path for the OU(s) using AWS Organizations IDs
     * separated by a '/'. Include all child OUs by ending the path with '/*'.
     * @minLength 1
     */
    OrganizationsEntityPath: string;
  }[];
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
