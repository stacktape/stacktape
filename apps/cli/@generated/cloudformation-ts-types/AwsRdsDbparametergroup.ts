// This file is auto-generated. Do not edit manually.
// Source: aws-rds-dbparametergroup.json

/**
 * The ``AWS::RDS::DBParameterGroup`` resource creates a custom parameter group for an RDS database
 * family.
 * This type can be declared in a template and referenced in the ``DBParameterGroupName`` property of
 * an ``AWS::RDS::DBInstance`` resource.
 * For information about configuring parameters for Amazon RDS DB instances, see [Working with
 * parameter
 * groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html) in
 * the *Amazon RDS User Guide*.
 * For information about configuring parameters for Amazon Aurora DB instances, see [Working with
 * parameter
 * groups](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html)
 * in the *Amazon Aurora User Guide*.
 * Applying a parameter group to a DB instance may require the DB instance to reboot, resulting in a
 * database outage for the duration of the reboot.
 */
export type AwsRdsDbparametergroup = {
  /**
   * The name of the DB parameter group.
   * Constraints:
   * +  Must be 1 to 255 letters, numbers, or hyphens.
   * +  First character must be a letter
   * +  Can't end with a hyphen or contain two consecutive hyphens
   * If you don't specify a value for ``DBParameterGroupName`` property, a name is automatically
   * created for the DB parameter group.
   * This value is stored as a lowercase string.
   * @pattern ^[a-zA-Z]{1}(?:-?[a-zA-Z0-9])*$
   */
  DBParameterGroupName?: string;
  /** Provides the customer-specified description for this DB parameter group. */
  Description: string;
  /**
   * The DB parameter group family name. A DB parameter group can be associated with one and only one DB
   * parameter group family, and can be applied only to a DB instance running a database engine and
   * engine version compatible with that DB parameter group family.
   * To list all of the available parameter group families for a DB engine, use the following command:
   * ``aws rds describe-db-engine-versions --query "DBEngineVersions[].DBParameterGroupFamily"
   * --engine <engine>``
   * For example, to list all of the available parameter group families for the MySQL DB engine, use
   * the following command:
   * ``aws rds describe-db-engine-versions --query "DBEngineVersions[].DBParameterGroupFamily"
   * --engine mysql``
   * The output contains duplicates.
   * The following are the valid DB engine values:
   * +   ``aurora-mysql``
   * +   ``aurora-postgresql``
   * +   ``db2-ae``
   * +   ``db2-se``
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
  Family: string;
  /**
   * A mapping of parameter names and values for the parameter update. You must specify at least one
   * parameter name and value.
   * For more information about parameter groups, see [Working with parameter
   * groups](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html) in
   * the *Amazon RDS User Guide*, or [Working with parameter
   * groups](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_WorkingWithParamGroups.html)
   * in the *Amazon Aurora User Guide*.
   * AWS CloudFormation doesn't support specifying an apply method for each individual parameter. The
   * default apply method for each parameter is used.
   */
  Parameters?: Record<string, unknown>;
  /**
   * Tags to assign to the DB parameter group.
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
