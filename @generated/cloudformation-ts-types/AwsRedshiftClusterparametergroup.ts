// This file is auto-generated. Do not edit manually.
// Source: aws-redshift-clusterparametergroup.json

/** Resource Type definition for AWS::Redshift::ClusterParameterGroup */
export type AwsRedshiftClusterparametergroup = {
  /**
   * The name of the cluster parameter group.
   * @maxLength 255
   */
  ParameterGroupName?: string;
  /** A description of the parameter group. */
  Description: string;
  /**
   * The Amazon Redshift engine version to which the cluster parameter group applies. The cluster engine
   * version determines the set of parameters.
   */
  ParameterGroupFamily: string;
  /**
   * An array of parameters to be modified. A maximum of 20 parameters can be modified in a single
   * request.
   */
  Parameters?: {
    /** The name of the parameter. */
    ParameterName: string;
    /**
     * The value of the parameter. If `ParameterName` is `wlm_json_configuration`, then the maximum size
     * of `ParameterValue` is 8000 characters.
     */
    ParameterValue: string;
  }[];
  /** An array of key-value pairs to apply to this resource. */
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
