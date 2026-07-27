// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-ipamresourcediscoveryassociation.json

/** Resource Schema of AWS::EC2::IPAMResourceDiscoveryAssociation Type */
export type AwsEc2Ipamresourcediscoveryassociation = {
  /** Arn of the IPAM. */
  IpamArn?: string;
  /** The home region of the IPAM. */
  IpamRegion?: string;
  /** Id of the IPAM Resource Discovery Association. */
  IpamResourceDiscoveryAssociationId?: string;
  /** The Amazon Resource Name (ARN) of the IPAM Resource Discovery Association. */
  IpamResourceDiscoveryId: string;
  /** The Id of the IPAM this Resource Discovery is associated to. */
  IpamId: string;
  /** The Amazon Resource Name (ARN) of the resource discovery association is a part of. */
  IpamResourceDiscoveryAssociationArn?: string;
  /** If the Resource Discovery Association exists due as part of CreateIpam. */
  IsDefault?: boolean;
  /** The AWS Account ID for the account where the shared IPAM exists. */
  OwnerId?: string;
  /** The operational state of the Resource Discovery Association. Related to Create/Delete activities. */
  State?: string;
  /** The status of the resource discovery. */
  ResourceDiscoveryStatus?: string;
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
