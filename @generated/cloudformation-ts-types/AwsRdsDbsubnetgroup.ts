// This file is auto-generated. Do not edit manually.
// Source: aws-rds-dbsubnetgroup.json

/**
 * The ``AWS::RDS::DBSubnetGroup`` resource creates a database subnet group. Subnet groups must
 * contain at least two subnets in two different Availability Zones in the same region.
 * For more information, see [Working with DB subnet
 * groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html#USER_VPC.Subnets)
 * in the *Amazon RDS User Guide*.
 */
export type AwsRdsDbsubnetgroup = {
  /** The description for the DB subnet group. */
  DBSubnetGroupDescription: string;
  /**
   * The name for the DB subnet group. This value is stored as a lowercase string.
   * Constraints:
   * +  Must contain no more than 255 letters, numbers, periods, underscores, spaces, or hyphens.
   * +  Must not be default.
   * +  First character must be a letter.
   * Example: ``mydbsubnetgroup``
   */
  DBSubnetGroupName?: string;
  /**
   * The EC2 Subnet IDs for the DB subnet group.
   * @uniqueItems false
   */
  SubnetIds: string[];
  /**
   * Tags to assign to the DB subnet group.
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * A key is the required name of the tag. The string value can be from 1 to 128 Unicode characters in
     * length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set of
     * Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * A value is the optional value of the tag. The string value can be from 1 to 256 Unicode characters
     * in length and can't be prefixed with ``aws:`` or ``rds:``. The string can only contain only the set
     * of Unicode letters, digits, white-space, '_', '.', ':', '/', '=', '+', '-', '@' (Java regex:
     * "^([\\p{L}\\p{Z}\\p{N}_.:/=+\\-@]*)$").
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};
