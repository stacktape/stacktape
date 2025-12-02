// This file is auto-generated. Do not edit manually.
// Source: aws-dms-datamigration.json

/** Resource schema for AWS::DMS::DataMigration. */
export type AwsDmsDatamigration = {
  /**
   * The property describes a name to identify the data migration.
   * @minLength 1
   * @maxLength 300
   */
  DataMigrationName?: string;
  /**
   * The property describes an ARN of the data migration.
   * @minLength 1
   * @maxLength 300
   */
  DataMigrationArn?: string;
  /**
   * The property describes an ARN of the data migration.
   * @minLength 1
   * @maxLength 300
   */
  DataMigrationIdentifier?: string;
  /**
   * The property describes the create time of the data migration.
   * @minLength 1
   * @maxLength 40
   */
  DataMigrationCreateTime?: string;
  /**
   * The property describes Amazon Resource Name (ARN) of the service access role.
   * @minLength 1
   * @maxLength 300
   */
  ServiceAccessRoleArn: string;
  /**
   * The property describes an identifier for the migration project. It is used for
   * describing/deleting/modifying can be name/arn
   * @minLength 1
   * @maxLength 255
   */
  MigrationProjectIdentifier: string;
  /**
   * The property describes the type of migration.
   * @enum ["full-load","cdc","full-load-and-cdc"]
   */
  DataMigrationType: "full-load" | "cdc" | "full-load-and-cdc";
  /** The property describes the settings for the data migration. */
  DataMigrationSettings?: {
    /** The property specifies whether to enable the CloudWatch log. */
    CloudwatchLogsEnabled?: boolean;
    /**
     * The number of parallel jobs that trigger parallel threads to unload the tables from the source, and
     * then load them to the target.
     * @minimum 1
     * @maximum 50
     */
    NumberOfJobs?: number;
    /** The property specifies the rules of selecting objects for data migration. */
    SelectionRules?: string;
  };
  /**
   * The property describes the settings for the data migration.
   * @uniqueItems true
   */
  SourceDataSettings?: {
    /**
     * The property is a point in the database engine's log that defines a time where you can begin CDC.
     * @maxLength 40
     */
    CDCStartPosition?: string;
    /**
     * The property indicates the start time for a change data capture (CDC) operation. The value is
     * server time in UTC format.
     * @maxLength 40
     */
    CDCStartTime?: string;
    /**
     * The property indicates the stop time for a change data capture (CDC) operation. The value is server
     * time in UTC format.
     * @maxLength 40
     */
    CDCStopTime?: string;
    /**
     * The property sets the name of a previously created logical replication slot for a change data
     * capture (CDC) load of the source instance.
     * @maxLength 255
     */
    SlotName?: string;
  }[];
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
