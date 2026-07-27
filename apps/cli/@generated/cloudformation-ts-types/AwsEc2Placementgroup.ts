// This file is auto-generated. Do not edit manually.
// Source: aws-ec2-placementgroup.json

/** Resource Type definition for AWS::EC2::PlacementGroup */
export type AwsEc2Placementgroup = {
  /** The placement strategy. */
  Strategy?: string;
  /** The Group Name of Placement Group. */
  GroupName?: string;
  /**
   * The Spread Level of Placement Group is an enum where it accepts either host or rack when strategy
   * is spread
   */
  SpreadLevel?: string;
  /** The number of partitions. Valid only when **Strategy** is set to `partition` */
  PartitionCount?: number;
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
