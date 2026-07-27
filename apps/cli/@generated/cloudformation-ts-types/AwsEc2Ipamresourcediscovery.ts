// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-ipamresourcediscovery.json

/** Resource Schema of AWS::EC2::IPAMResourceDiscovery Type */
export type AwsEc2Ipamresourcediscovery = {
  /** Id of the IPAM Pool. */
  IpamResourceDiscoveryId?: string;
  /** Owner Account ID of the Resource Discovery */
  OwnerId?: string;
  /**
   * The regions Resource Discovery is enabled for. Allows resource discoveries to be created in these
   * regions, as well as enabling monitoring
   * @uniqueItems true
   */
  OperatingRegions?: {
    /** The name of the region. */
    RegionName: string;
  }[];
  /** The region the resource discovery is setup in. */
  IpamResourceDiscoveryRegion?: string;
  Description?: string;
  /**
   * A set of organizational unit (OU) exclusions for this resource.
   * @uniqueItems true
   */
  OrganizationalUnitExclusions?: {
    /**
     * An AWS Organizations entity path. Build the path for the OU(s) using AWS Organizations IDs
     * separated by a '/'. Include all child OUs by ending the path with '/*'.
     * @minLength 1
     */
    OrganizationsEntityPath: string;
  }[];
  /**
   * Determines whether or not address space from this pool is publicly advertised. Must be set if and
   * only if the pool is IPv6.
   */
  IsDefault?: boolean;
  /** Amazon Resource Name (Arn) for the Resource Discovery. */
  IpamResourceDiscoveryArn?: string;
  /** The state of this Resource Discovery. */
  State?: string;
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
