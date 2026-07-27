// This file is auto-generated. Do not edit manually.
// Source: aws-neptune-dbsubnetgroup.json

/**
 * The AWS::Neptune::DBSubnetGroup type creates an Amazon Neptune DB subnet group. Subnet groups must
 * contain at least two subnets in two different Availability Zones in the same AWS Region.
 */
export type AwsNeptuneDbsubnetgroup = {
  /**
   * The name for the DB subnet group. This value is stored as a lowercase string.
   * Constraints: Must contain no more than 255 lowercase alphanumeric characters or hyphens. Must not
   * be "Default".
   * Example: mysubnetgroup
   */
  DBSubnetGroupName?: string;
  /** The description for the DB subnet group. */
  DBSubnetGroupDescription: string;
  /**
   * The Amazon EC2 subnet IDs for the DB subnet group.
   * @uniqueItems false
   */
  SubnetIds: string[];
  /**
   * An optional array of key-value pairs to apply to this DB subnet group.
   * @uniqueItems false
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
};
