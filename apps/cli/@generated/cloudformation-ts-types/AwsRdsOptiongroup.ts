// This file is auto-generated. Do not edit manually.
// Source: aws-rds-optiongroup.json

/**
 * The ``AWS::RDS::OptionGroup`` resource creates or updates an option group, to enable and configure
 * features that are specific to a particular DB engine.
 */
export type AwsRdsOptiongroup = {
  /**
   * The name of the option group to be created.
   * Constraints:
   * +  Must be 1 to 255 letters, numbers, or hyphens
   * +  First character must be a letter
   * +  Can't end with a hyphen or contain two consecutive hyphens
   * Example: ``myoptiongroup``
   * If you don't specify a value for ``OptionGroupName`` property, a name is automatically created for
   * the option group.
   * This value is stored as a lowercase string.
   */
  OptionGroupName?: string;
  /** The description of the option group. */
  OptionGroupDescription: string;
  /**
   * Specifies the name of the engine that this option group should be associated with.
   * Valid Values:
   * +   ``mariadb``
   * +   ``mysql``
   * +   ``oracle-ee``
   * +   ``oracle-ee-cdb``
   * +   ``oracle-se2``
   * +   ``oracle-se2-cdb``
   * +   ``postgres``
   * +   ``sqlserver-ee``
   * +   ``sqlserver-se``
   * +   ``sqlserver-ex``
   * +   ``sqlserver-web``
   */
  EngineName: string;
  /** Specifies the major version of the engine that this option group should be associated with. */
  MajorEngineVersion: string;
  /** A list of all available options for an option group. */
  OptionConfigurations?: {
    /**
     * A list of DB security groups used for this option.
     * @uniqueItems true
     */
    DBSecurityGroupMemberships?: string[];
    /** The configuration of options to include in a group. */
    OptionName: string;
    /** The option settings to include in an option group. */
    OptionSettings?: {
      /** The name of the option that has settings that you can set. */
      Name?: string;
      /** The current value of the option setting. */
      Value?: string;
    }[];
    /** The version for the option. */
    OptionVersion?: string;
    /** The optional port for the option. */
    Port?: number;
    /**
     * A list of VPC security group names used for this option.
     * @uniqueItems true
     */
    VpcSecurityGroupMemberships?: string[];
  }[];
  /** Tags to assign to the option group. */
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
