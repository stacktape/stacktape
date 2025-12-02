// This file is auto-generated. Do not edit manually.
// Source: aws-rds-globalcluster.json

/** Resource Type definition for AWS::RDS::GlobalCluster */
export type AwsRdsGlobalcluster = {
  /**
   * The name of the database engine to be used for this DB cluster. Valid Values: aurora (for MySQL
   * 5.6-compatible Aurora), aurora-mysql (for MySQL 5.7-compatible Aurora).
   * If you specify the SourceDBClusterIdentifier property, don't specify this property. The value is
   * inherited from the cluster.
   * @enum ["aurora","aurora-mysql","aurora-postgresql"]
   */
  Engine?: "aurora" | "aurora-mysql" | "aurora-postgresql";
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
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
    Value?: string;
  }[];
  /**
   * The life cycle type of the global cluster. You can use this setting to enroll your global cluster
   * into Amazon RDS Extended Support.
   */
  EngineLifecycleSupport?: string;
  /**
   * The version number of the database engine to use. If you specify the SourceDBClusterIdentifier
   * property, don't specify this property. The value is inherited from the cluster.
   */
  EngineVersion?: string;
  /**
   * The deletion protection setting for the new global database. The global database can't be deleted
   * when deletion protection is enabled.
   */
  DeletionProtection?: boolean;
  /**
   * The cluster identifier of the new global database cluster. This parameter is stored as a lowercase
   * string.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z]{1}(?:-?[a-zA-Z0-9]){0,62}$
   */
  GlobalClusterIdentifier?: string;
  /**
   * The Amazon Resource Name (ARN) to use as the primary cluster of the global database. This parameter
   * is optional. This parameter is stored as a lowercase string.
   */
  SourceDBClusterIdentifier?: unknown | unknown;
  /**
   * The storage encryption setting for the new global database cluster.
   * If you specify the SourceDBClusterIdentifier property, don't specify this property. The value is
   * inherited from the cluster.
   */
  StorageEncrypted?: boolean;
  GlobalEndpoint?: {
    /**
     * The writer endpoint for the global database cluster. This endpoint always points to the writer DB
     * instance in the current primary cluster.
     */
    Address?: string;
  };
};
