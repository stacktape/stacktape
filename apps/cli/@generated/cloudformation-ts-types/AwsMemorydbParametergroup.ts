// This file is auto-generated. Do not edit manually.
// Source: aws-memorydb-parametergroup.json

/** The AWS::MemoryDB::ParameterGroup resource creates an Amazon MemoryDB ParameterGroup. */
export type AwsMemorydbParametergroup = {
  /** The name of the parameter group. */
  ParameterGroupName: string;
  /** The name of the parameter group family that this parameter group is compatible with. */
  Family: string;
  /** A description of the parameter group. */
  Description?: string;
  /**
   * An array of key-value pairs to apply to this parameter group.
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
  /**
   * An map of parameter names and values for the parameter update. You must supply at least one
   * parameter name and value; subsequent arguments are optional.
   */
  Parameters?: Record<string, unknown>;
  /** The Amazon Resource Name (ARN) of the parameter group. */
  ARN?: string;
};
