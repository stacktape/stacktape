// This file is auto-generated. Do not edit manually.
// Source: aws-rds-dbproxy.json

/** Resource schema for AWS::RDS::DBProxy */
export type AwsRdsDbproxy = {
  /**
   * The authorization mechanism that the proxy uses.
   * @minItems 1
   */
  Auth?: ({
    /**
     * The type of authentication that the proxy uses for connections from the proxy to the underlying
     * database.
     * @enum ["SECRETS"]
     */
    AuthScheme?: "SECRETS";
    /**
     * A user-specified description about the authentication used by a proxy to log in as a specific
     * database user.
     */
    Description?: string;
    /**
     * Whether to require or disallow Amazon Web Services Identity and Access Management (IAM)
     * authentication for connections to the proxy. The ENABLED value is valid only for proxies with RDS
     * for Microsoft SQL Server.
     * @enum ["DISABLED","REQUIRED","ENABLED"]
     */
    IAMAuth?: "DISABLED" | "REQUIRED" | "ENABLED";
    /**
     * The Amazon Resource Name (ARN) representing the secret that the proxy uses to authenticate to the
     * RDS DB instance or Aurora DB cluster. These secrets are stored within Amazon Secrets Manager.
     */
    SecretArn?: string;
    /**
     * The type of authentication the proxy uses for connections from clients.
     * @enum ["MYSQL_NATIVE_PASSWORD","MYSQL_CACHING_SHA2_PASSWORD","POSTGRES_SCRAM_SHA_256","POSTGRES_MD5","SQL_SERVER_AUTHENTICATION"]
     */
    ClientPasswordAuthType?: "MYSQL_NATIVE_PASSWORD" | "MYSQL_CACHING_SHA2_PASSWORD" | "POSTGRES_SCRAM_SHA_256" | "POSTGRES_MD5" | "SQL_SERVER_AUTHENTICATION";
  })[];
  /** The Amazon Resource Name (ARN) for the proxy. */
  DBProxyArn?: string;
  /**
   * The identifier for the proxy. This name must be unique for all proxies owned by your AWS account in
   * the specified AWS Region.
   * @maxLength 64
   * @pattern [0-z]*
   */
  DBProxyName: string;
  /** Whether the proxy includes detailed information about SQL statements in its logs. */
  DebugLogging?: boolean;
  /**
   * The default authentication scheme that the proxy uses for client connections to the proxy and
   * connections from the proxy to the underlying database.
   * @enum ["IAM_AUTH","NONE"]
   */
  DefaultAuthScheme?: "IAM_AUTH" | "NONE";
  /**
   * The endpoint that you can use to connect to the proxy. You include the endpoint value in the
   * connection string for a database client application.
   */
  Endpoint?: string;
  /**
   * The network type of the DB proxy endpoint. The network type determines the IP version that the
   * proxy endpoint supports.
   * @enum ["IPV4","IPV6","DUAL"]
   */
  EndpointNetworkType?: "IPV4" | "IPV6" | "DUAL";
  /**
   * The kinds of databases that the proxy can connect to.
   * @enum ["MYSQL","POSTGRESQL","SQLSERVER"]
   */
  EngineFamily: "MYSQL" | "POSTGRESQL" | "SQLSERVER";
  /**
   * The number of seconds that a connection to the proxy can be inactive before the proxy disconnects
   * it.
   */
  IdleClientTimeout?: number;
  /**
   * A Boolean parameter that specifies whether Transport Layer Security (TLS) encryption is required
   * for connections to the proxy.
   */
  RequireTLS?: boolean;
  /**
   * The Amazon Resource Name (ARN) of the IAM role that the proxy uses to access secrets in AWS Secrets
   * Manager.
   */
  RoleArn: string;
  /** An optional set of key-value pairs to associate arbitrary data of your choosing with the proxy. */
  Tags?: {
    /**
     * @maxLength 128
     * @pattern (\w|\d|\s|\\|-|\.:=+-)*
     */
    Key?: string;
    /**
     * @maxLength 128
     * @pattern (\w|\d|\s|\\|-|\.:=+-)*
     */
    Value?: string;
  }[];
  /**
   * The network type that the proxy uses to connect to the target database. The network type determines
   * the IP version that the proxy uses for connections to the database.
   * @enum ["IPV4","IPV6"]
   */
  TargetConnectionNetworkType?: "IPV4" | "IPV6";
  /** VPC ID to associate with the new DB proxy. */
  VpcId?: string;
  /**
   * VPC security group IDs to associate with the new proxy.
   * @minItems 1
   */
  VpcSecurityGroupIds?: string[];
  /**
   * VPC subnet IDs to associate with the new proxy.
   * @minItems 2
   */
  VpcSubnetIds: string[];
};
