// This file is auto-generated. Do not edit manually.
// Source: aws-neptune-dbinstance.json

/** The AWS::Neptune::DBInstance resource creates an Amazon Neptune DB instance. */
export type AwsNeptuneDbinstance = {
  /**
   * Indicates that major version upgrades are allowed. Changing this parameter doesn't result in an
   * outage and the change is asynchronously applied as soon as possible. This parameter must be set to
   * true when specifying a value for the EngineVersion parameter that is a different major version than
   * the DB instance's current version.
   */
  AllowMajorVersionUpgrade?: boolean;
  /**
   * Indicates that minor version patches are applied automatically.
   * When updating this property, some interruptions may occur.
   */
  AutoMinorVersionUpgrade?: boolean;
  /**
   * Indicates that public accessibility is enabled. This should be enabled in combination with IAM Auth
   * enabled on the DBCluster
   */
  PubliclyAccessible?: boolean;
  /** Specifies the name of the Availability Zone the DB instance is located in. */
  AvailabilityZone?: string;
  /**
   * If the DB instance is a member of a DB cluster, contains the name of the DB cluster that the DB
   * instance is a member of.
   */
  DBClusterIdentifier?: string;
  /**
   * Contains the name of the compute and memory capacity class of the DB instance.
   * If you update this property, some interruptions may occur.
   */
  DBInstanceClass: string;
  /**
   * Contains a user-supplied database identifier. This identifier is the unique key that identifies a
   * DB instance.
   */
  DBInstanceIdentifier?: string;
  /**
   * The name of an existing DB parameter group or a reference to an AWS::Neptune::DBParameterGroup
   * resource created in the template. If any of the data members of the referenced parameter group are
   * changed during an update, the DB instance might need to be restarted, which causes some
   * interruption. If the parameter group contains static parameters, whether they were changed or not,
   * an update triggers a reboot.
   */
  DBParameterGroupName?: string;
  /**
   * This parameter is not supported.
   * `AWS::Neptune::DBInstance` does not support restoring from snapshots.
   * `AWS::Neptune::DBCluster` does support restoring from snapshots.
   */
  DBSnapshotIdentifier?: string;
  /**
   * A DB subnet group to associate with the DB instance. If you update this value, the new subnet group
   * must be a subnet group in a new virtual private cloud (VPC).
   */
  DBSubnetGroupName?: string;
  /**
   * The connection endpoint for the database. For example:
   * `mystack-mydb-1apw1j4phylrk.cg034hpkmmjt.us-east-2.rds.amazonaws.com`.
   */
  Endpoint?: string;
  /**
   * Specifies the weekly time range during which system maintenance can occur, in Universal Coordinated
   * Time (UTC).
   */
  PreferredMaintenanceWindow?: string;
  /** The port number on which the database accepts connections. For example: `8182`. */
  Port?: string;
  /**
   * An arbitrary set of tags (key-value pairs) for this DB instance.
   * @uniqueItems true
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
