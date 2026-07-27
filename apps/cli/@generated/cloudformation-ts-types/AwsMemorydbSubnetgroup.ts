// This file is auto-generated. Do not edit manually.
// Source: aws-memorydb-subnetgroup.json

/** The AWS::MemoryDB::SubnetGroup resource creates an Amazon MemoryDB Subnet Group. */
export type AwsMemorydbSubnetgroup = {
  /**
   * The name of the subnet group. This value must be unique as it also serves as the subnet group
   * identifier.
   * @pattern [a-z][a-z0-9\-]*
   */
  SubnetGroupName: string;
  /** An optional description of the subnet group. */
  Description?: string;
  /**
   * A list of VPC subnet IDs for the subnet group.
   * @uniqueItems true
   */
  SubnetIds: string[];
  /**
   * An array of key-value pairs to apply to this subnet group.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key for the tag. May not be null.
     * @minLength 1
     * @maxLength 128
     * @pattern ^(?!aws:)(?!memorydb:)[a-zA-Z0-9 _\.\/=+:\-@]{1,128}$
     */
    Key: string;
    /**
     * The tag's value. May be null.
     * @minLength 1
     * @maxLength 256
     * @pattern ^(?!aws:)(?!memorydb:)[a-zA-Z0-9 _\.\/=+:\-@]{1,256}$
     */
    Value: string;
  }[];
  /** The Amazon Resource Name (ARN) of the subnet group. */
  ARN?: string;
  /**
   * Supported network types would be a list of network types supported by subnet group and can be
   * either [ipv4] or [ipv4, dual_stack] or [ipv6].
   * @uniqueItems true
   */
  SupportedNetworkTypes?: string[];
};
