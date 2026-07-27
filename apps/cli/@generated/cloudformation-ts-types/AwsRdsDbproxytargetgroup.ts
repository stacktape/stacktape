// This file is auto-generated. Do not edit manually.
// Source: aws-rds-dbproxytargetgroup.json

/** Resource schema for AWS::RDS::DBProxyTargetGroup */
export type AwsRdsDbproxytargetgroup = {
  /**
   * The identifier for the proxy.
   * @maxLength 64
   * @pattern [A-z][0-z]*
   */
  DBProxyName: string;
  /** The Amazon Resource Name (ARN) representing the target group. */
  TargetGroupArn?: string;
  /**
   * The identifier for the DBProxyTargetGroup
   * @enum ["default"]
   */
  TargetGroupName: "default";
  ConnectionPoolConfigurationInfo?: {
    /**
     * The maximum size of the connection pool for each target in a target group.
     * @minimum 0
     * @maximum 100
     */
    MaxConnectionsPercent?: number;
    /**
     * Controls how actively the proxy closes idle database connections in the connection pool.
     * @minimum 0
     * @maximum 100
     */
    MaxIdleConnectionsPercent?: number;
    /**
     * The number of seconds for a proxy to wait for a connection to become available in the connection
     * pool.
     */
    ConnectionBorrowTimeout?: number;
    /**
     * Each item in the list represents a class of SQL operations that normally cause all later statements
     * in a session using a proxy to be pinned to the same underlying database connection.
     */
    SessionPinningFilters?: string[];
    /** One or more SQL statements for the proxy to run when opening each new database connection. */
    InitQuery?: string;
  };
  DBInstanceIdentifiers?: string[];
  DBClusterIdentifiers?: string[];
};
