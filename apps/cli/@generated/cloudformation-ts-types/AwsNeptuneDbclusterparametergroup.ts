// This file is auto-generated. Do not edit manually.
// Source: aws-neptune-dbclusterparametergroup.json

/**
 * The AWS::Neptune::DBClusterParameterGroup resource creates a new Amazon Neptune DB cluster
 * parameter group
 */
export type AwsNeptuneDbclusterparametergroup = {
  /** Provides the customer-specified description for this DB cluster parameter group. */
  Description: string;
  /**
   * Must be neptune1 for engine versions prior to 1.2.0.0, or neptune1.2 for engine version 1.2.0.0 and
   * higher.
   */
  Family: string;
  /**
   * An array of parameters to be modified. A maximum of 20 parameters can be modified in a single
   * request.
   */
  Parameters: Record<string, unknown>;
  /** Provides the name of the DB cluster parameter group. */
  Name?: string;
  /** The list of tags for the cluster parameter group. */
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
