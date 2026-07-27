// This file is auto-generated. Do not edit manually.
// Source: aws-redshift-clustersubnetgroup.json

/**
 * Resource Type definition for AWS::Redshift::ClusterSubnetGroup. Specifies an Amazon Redshift subnet
 * group.
 */
export type AwsRedshiftClustersubnetgroup = {
  /** The description of the parameter group. */
  Description: string;
  /**
   * The list of VPC subnet IDs
   * @maxItems 20
   */
  SubnetIds: string[];
  /**
   * The list of tags for the cluster parameter group.
   * @maxItems 50
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
  /**
   * This name must be unique for all subnet groups that are created by your AWS account. If costumer do
   * not provide it, cloudformation will generate it. Must not be "Default".
   * @maxLength 255
   */
  ClusterSubnetGroupName?: string;
};
