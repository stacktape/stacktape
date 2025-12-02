// This file is auto-generated. Do not edit manually.
// Source: aws-quicksight-datasource.json

/** Definition of the AWS::QuickSight::DataSource Resource Type. */
export type AwsQuicksightDatasource = {
  Status?: "CREATION_IN_PROGRESS" | "CREATION_SUCCESSFUL" | "CREATION_FAILED" | "UPDATE_IN_PROGRESS" | "UPDATE_SUCCESSFUL" | "UPDATE_FAILED" | "PENDING_UPDATE" | "DELETED";
  /** <p>The time that this data source was created.</p> */
  CreatedTime?: string;
  ErrorInfo?: {
    Type?: "ACCESS_DENIED" | "COPY_SOURCE_NOT_FOUND" | "TIMEOUT" | "ENGINE_VERSION_NOT_SUPPORTED" | "UNKNOWN_HOST" | "GENERIC_SQL_FAILURE" | "CONFLICT" | "UNKNOWN";
    /** <p>Error message.</p> */
    Message?: string;
  };
  /** <p>The last time that this data source was updated.</p> */
  LastUpdatedTime?: string;
  /**
   * @minItems 0
   * @maxItems 10
   */
  FolderArns?: string[];
  /**
   * @minLength 1
   * @maxLength 128
   */
  Name: string;
  DataSourceParameters?: {
    AuroraPostgreSqlParameters?: {
      /**
       * <p>The port that Amazon Aurora PostgreSQL is listening on.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>The Amazon Aurora PostgreSQL database to connect to.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>The Amazon Aurora PostgreSQL-Compatible host to connect to.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    TeradataParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    RdsParameters?: {
      /**
       * <p>Instance ID.</p>
       * @minLength 1
       * @maxLength 64
       */
      InstanceId: string;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
    };
    AthenaParameters?: {
      /**
       * <p>The workgroup that Amazon Athena uses.</p>
       * @minLength 1
       * @maxLength 128
       */
      WorkGroup?: string;
      IdentityCenterConfiguration?: {
        /**
         * <p>A Boolean option that controls whether Trusted Identity Propagation should be used.</p>
         * @default null
         */
        EnableIdentityPropagation?: boolean;
      };
      /**
       * <p>Use the <code>RoleArn</code> structure to override an account-wide role for a specific Athena
       * data source. For example, say an account administrator has turned off all Athena access with an
       * account-wide role. The administrator can then use <code>RoleArn</code> to bypass the account-wide
       * role and allow Athena access for the single Athena data source that is specified in the structure,
       * even if the account-wide role forbidding Athena access is still active.</p>
       * @minLength 20
       * @maxLength 2048
       */
      RoleArn?: string;
    };
    SparkParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    MariaDbParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    OracleParameters?: {
      /** @default false */
      UseServiceName?: boolean;
      /**
       * <p>The port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>The database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>An Oracle host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    PrestoParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
      /**
       * <p>Catalog.</p>
       * @minLength 0
       * @maxLength 128
       */
      Catalog: string;
    };
    StarburstParameters?: {
      /**
       * <p>The port for the Starburst data source.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * @minLength 0
       * @maxLength 128
       */
      DatabaseAccessControlRole?: string;
      ProductType?: "GALAXY" | "ENTERPRISE";
      OAuthParameters?: {
        /**
         * @minLength 1
         * @maxLength 2048
         */
        TokenProviderUrl: string;
        /**
         * @minLength 1
         * @maxLength 128
         */
        OAuthScope?: string;
        IdentityProviderVpcConnectionProperties?: {
          /** <p>The Amazon Resource Name (ARN) for the VPC connection.</p> */
          VpcConnectionArn: string;
        };
        /**
         * @minLength 1
         * @maxLength 2048
         */
        IdentityProviderResourceUri?: string;
      };
      /**
       * <p>The host name of the Starburst data source.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
      /**
       * <p>The catalog name for the Starburst data source.</p>
       * @minLength 0
       * @maxLength 128
       */
      Catalog: string;
      AuthenticationType?: "PASSWORD" | "TOKEN" | "X509";
    };
    RedshiftParameters?: {
      IAMParameters?: {
        /**
         * <p>Automatically creates a database user. If your database doesn't have a
         * <code>DatabaseUser</code>, set this parameter to <code>True</code>. If there is no
         * <code>DatabaseUser</code>, Amazon QuickSight can't connect to your cluster. The
         * <code>RoleArn</code> that you use for this operation must grant access to
         * <code>redshift:CreateClusterUser</code> to successfully create the user.</p>
         * @default false
         */
        AutoCreateDatabaseUser?: boolean;
        /**
         * <p>The user whose permissions and group memberships will be used by Amazon QuickSight to access the
         * cluster. If this user already exists in your database, Amazon QuickSight is granted the same
         * permissions that the user has. If the user doesn't exist, set the value of
         * <code>AutoCreateDatabaseUser</code> to <code>True</code> to create a new user with PUBLIC
         * permissions.</p>
         * @minLength 1
         * @maxLength 64
         */
        DatabaseUser?: string;
        /**
         * <p>Use the <code>RoleArn</code> structure to allow Amazon QuickSight to call
         * <code>redshift:GetClusterCredentials</code> on your cluster. The calling principal must have
         * <code>iam:PassRole</code> access to pass the role to Amazon QuickSight. The role's trust policy
         * must allow the Amazon QuickSight service principal to assume the role.</p>
         * @minLength 20
         * @maxLength 2048
         */
        RoleArn: string;
        /**
         * <p>A list of groups whose permissions will be granted to Amazon QuickSight to access the cluster.
         * These permissions are combined with the permissions granted to Amazon QuickSight by the
         * <code>DatabaseUser</code>. If you choose to include this parameter, the <code>RoleArn</code> must
         * grant access to <code>redshift:JoinGroup</code>.</p>
         * @minItems 1
         * @maxItems 50
         */
        DatabaseGroups?: string[];
      };
      /**
       * <p>Cluster ID. This field can be blank if the <code>Host</code> and <code>Port</code> are
       * provided.</p>
       * @minLength 1
       * @maxLength 64
       */
      ClusterId?: string;
      /**
       * <p>Port. This field can be blank if the <code>ClusterId</code> is provided.</p>
       * @default 0
       * @minimum 0
       * @maximum 65535
       */
      Port?: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host. This field can be blank if <code>ClusterId</code> is provided.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host?: string;
      IdentityCenterConfiguration?: {
        /**
         * <p>A Boolean option that controls whether Trusted Identity Propagation should be used.</p>
         * @default null
         */
        EnableIdentityPropagation?: boolean;
      };
    };
    MySqlParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    SqlServerParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    SnowflakeParameters?: {
      /**
       * <p>Warehouse.</p>
       * @minLength 0
       * @maxLength 128
       */
      Warehouse: string;
      /**
       * @minLength 0
       * @maxLength 128
       */
      DatabaseAccessControlRole?: string;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      OAuthParameters?: {
        /**
         * @minLength 1
         * @maxLength 2048
         */
        TokenProviderUrl: string;
        /**
         * @minLength 1
         * @maxLength 128
         */
        OAuthScope?: string;
        IdentityProviderVpcConnectionProperties?: {
          /** <p>The Amazon Resource Name (ARN) for the VPC connection.</p> */
          VpcConnectionArn: string;
        };
        /**
         * @minLength 1
         * @maxLength 2048
         */
        IdentityProviderResourceUri?: string;
      };
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
      AuthenticationType?: "PASSWORD" | "TOKEN" | "X509";
    };
    AmazonElasticsearchParameters?: {
      /**
       * <p>The OpenSearch domain.</p>
       * @minLength 1
       * @maxLength 64
       */
      Domain: string;
    };
    AmazonOpenSearchParameters?: {
      /**
       * <p>The OpenSearch domain.</p>
       * @minLength 1
       * @maxLength 64
       */
      Domain: string;
    };
    PostgreSqlParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    AuroraParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    S3Parameters?: {
      ManifestFileLocation: {
        /**
         * <p>Amazon S3 bucket.</p>
         * @minLength 1
         * @maxLength 1024
         */
        Bucket: string;
        /**
         * <p>Amazon S3 key that identifies an object.</p>
         * @minLength 1
         * @maxLength 1024
         */
        Key: string;
      };
      /**
       * <p>Use the <code>RoleArn</code> structure to override an account-wide role for a specific S3 data
       * source. For example, say an account administrator has turned off all S3 access with an account-wide
       * role. The administrator can then use <code>RoleArn</code> to bypass the account-wide role and allow
       * S3 access for the single S3 data source that is specified in the structure, even if the
       * account-wide role forbidding S3 access is still active.</p>
       * @minLength 20
       * @maxLength 2048
       */
      RoleArn?: string;
    };
    TrinoParameters?: {
      /**
       * <p>The port for the Trino data source.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>The host name of the Trino data source.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
      /**
       * <p>The catalog name for the Trino data source.</p>
       * @minLength 0
       * @maxLength 128
       */
      Catalog: string;
    };
    DatabricksParameters?: {
      /**
       * <p>The port for the Databricks data source.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>The host name of the Databricks data source.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
      /**
       * <p>The HTTP path of the Databricks data source.</p>
       * @minLength 1
       * @maxLength 4096
       */
      SqlEndpointPath: string;
    };
  };
  Type: "ADOBE_ANALYTICS" | "AMAZON_ELASTICSEARCH" | "AMAZON_OPENSEARCH" | "ATHENA" | "AURORA" | "AURORA_POSTGRESQL" | "AWS_IOT_ANALYTICS" | "DATABRICKS" | "DENODO" | "DREMIO" | "DYNAMODB" | "SAPHANA" | "DB2_AS400" | "EXASOL" | "FILE" | "GITHUB" | "INTERNATIONAL_DATA_CORPORATION" | "JIRA" | "MARIADB" | "MYSQL" | "ORACLE" | "POSTGRESQL" | "PRESTO" | "QBUSINESS" | "REDSHIFT" | "S3" | "S3_TABLES" | "S3_KNOWLEDGE_BASE" | "SALESFORCE" | "SERVICENOW" | "SNOWFLAKE" | "SPARK" | "SPICE" | "SQLSERVER" | "TERADATA" | "TIMESTREAM" | "TWITTER" | "BIGQUERY" | "GOOGLE_ANALYTICS" | "TRINO" | "STARBURST" | "MONGO" | "MONGO_ATLAS" | "DOCUMENTDB" | "APPFLOW" | "IMPALA" | "GLUE" | "GOOGLE_DRIVE" | "CONFLUENCE" | "SHAREPOINT" | "ONE_DRIVE" | "WEB_CRAWLER";
  VpcConnectionProperties?: {
    /** <p>The Amazon Resource Name (ARN) for the VPC connection.</p> */
    VpcConnectionArn: string;
  };
  /**
   * <p>A set of alternate data source parameters that you want to share for the credentials
   * stored with this data source. The credentials are applied in tandem with the data
   * source
   * parameters when you copy a data source by using a create or update request. The API
   * operation compares the <code>DataSourceParameters</code> structure that's in the
   * request
   * with the structures in the <code>AlternateDataSourceParameters</code> allow list. If
   * the
   * structures are an exact match, the request is allowed to use the credentials from this
   * existing data source. If the <code>AlternateDataSourceParameters</code> list is null,
   * the <code>Credentials</code> originally used with this
   * <code>DataSourceParameters</code>
   * are automatically allowed.</p>
   * @minItems 1
   * @maxItems 50
   */
  AlternateDataSourceParameters?: ({
    AuroraPostgreSqlParameters?: {
      /**
       * <p>The port that Amazon Aurora PostgreSQL is listening on.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>The Amazon Aurora PostgreSQL database to connect to.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>The Amazon Aurora PostgreSQL-Compatible host to connect to.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    TeradataParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    RdsParameters?: {
      /**
       * <p>Instance ID.</p>
       * @minLength 1
       * @maxLength 64
       */
      InstanceId: string;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
    };
    AthenaParameters?: {
      /**
       * <p>The workgroup that Amazon Athena uses.</p>
       * @minLength 1
       * @maxLength 128
       */
      WorkGroup?: string;
      IdentityCenterConfiguration?: {
        /**
         * <p>A Boolean option that controls whether Trusted Identity Propagation should be used.</p>
         * @default null
         */
        EnableIdentityPropagation?: boolean;
      };
      /**
       * <p>Use the <code>RoleArn</code> structure to override an account-wide role for a specific Athena
       * data source. For example, say an account administrator has turned off all Athena access with an
       * account-wide role. The administrator can then use <code>RoleArn</code> to bypass the account-wide
       * role and allow Athena access for the single Athena data source that is specified in the structure,
       * even if the account-wide role forbidding Athena access is still active.</p>
       * @minLength 20
       * @maxLength 2048
       */
      RoleArn?: string;
    };
    SparkParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    MariaDbParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    OracleParameters?: {
      /** @default false */
      UseServiceName?: boolean;
      /**
       * <p>The port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>The database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>An Oracle host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    PrestoParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
      /**
       * <p>Catalog.</p>
       * @minLength 0
       * @maxLength 128
       */
      Catalog: string;
    };
    StarburstParameters?: {
      /**
       * <p>The port for the Starburst data source.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * @minLength 0
       * @maxLength 128
       */
      DatabaseAccessControlRole?: string;
      ProductType?: "GALAXY" | "ENTERPRISE";
      OAuthParameters?: {
        /**
         * @minLength 1
         * @maxLength 2048
         */
        TokenProviderUrl: string;
        /**
         * @minLength 1
         * @maxLength 128
         */
        OAuthScope?: string;
        IdentityProviderVpcConnectionProperties?: {
          /** <p>The Amazon Resource Name (ARN) for the VPC connection.</p> */
          VpcConnectionArn: string;
        };
        /**
         * @minLength 1
         * @maxLength 2048
         */
        IdentityProviderResourceUri?: string;
      };
      /**
       * <p>The host name of the Starburst data source.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
      /**
       * <p>The catalog name for the Starburst data source.</p>
       * @minLength 0
       * @maxLength 128
       */
      Catalog: string;
      AuthenticationType?: "PASSWORD" | "TOKEN" | "X509";
    };
    RedshiftParameters?: {
      IAMParameters?: {
        /**
         * <p>Automatically creates a database user. If your database doesn't have a
         * <code>DatabaseUser</code>, set this parameter to <code>True</code>. If there is no
         * <code>DatabaseUser</code>, Amazon QuickSight can't connect to your cluster. The
         * <code>RoleArn</code> that you use for this operation must grant access to
         * <code>redshift:CreateClusterUser</code> to successfully create the user.</p>
         * @default false
         */
        AutoCreateDatabaseUser?: boolean;
        /**
         * <p>The user whose permissions and group memberships will be used by Amazon QuickSight to access the
         * cluster. If this user already exists in your database, Amazon QuickSight is granted the same
         * permissions that the user has. If the user doesn't exist, set the value of
         * <code>AutoCreateDatabaseUser</code> to <code>True</code> to create a new user with PUBLIC
         * permissions.</p>
         * @minLength 1
         * @maxLength 64
         */
        DatabaseUser?: string;
        /**
         * <p>Use the <code>RoleArn</code> structure to allow Amazon QuickSight to call
         * <code>redshift:GetClusterCredentials</code> on your cluster. The calling principal must have
         * <code>iam:PassRole</code> access to pass the role to Amazon QuickSight. The role's trust policy
         * must allow the Amazon QuickSight service principal to assume the role.</p>
         * @minLength 20
         * @maxLength 2048
         */
        RoleArn: string;
        /**
         * <p>A list of groups whose permissions will be granted to Amazon QuickSight to access the cluster.
         * These permissions are combined with the permissions granted to Amazon QuickSight by the
         * <code>DatabaseUser</code>. If you choose to include this parameter, the <code>RoleArn</code> must
         * grant access to <code>redshift:JoinGroup</code>.</p>
         * @minItems 1
         * @maxItems 50
         */
        DatabaseGroups?: string[];
      };
      /**
       * <p>Cluster ID. This field can be blank if the <code>Host</code> and <code>Port</code> are
       * provided.</p>
       * @minLength 1
       * @maxLength 64
       */
      ClusterId?: string;
      /**
       * <p>Port. This field can be blank if the <code>ClusterId</code> is provided.</p>
       * @default 0
       * @minimum 0
       * @maximum 65535
       */
      Port?: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host. This field can be blank if <code>ClusterId</code> is provided.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host?: string;
      IdentityCenterConfiguration?: {
        /**
         * <p>A Boolean option that controls whether Trusted Identity Propagation should be used.</p>
         * @default null
         */
        EnableIdentityPropagation?: boolean;
      };
    };
    MySqlParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    SqlServerParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    SnowflakeParameters?: {
      /**
       * <p>Warehouse.</p>
       * @minLength 0
       * @maxLength 128
       */
      Warehouse: string;
      /**
       * @minLength 0
       * @maxLength 128
       */
      DatabaseAccessControlRole?: string;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      OAuthParameters?: {
        /**
         * @minLength 1
         * @maxLength 2048
         */
        TokenProviderUrl: string;
        /**
         * @minLength 1
         * @maxLength 128
         */
        OAuthScope?: string;
        IdentityProviderVpcConnectionProperties?: {
          /** <p>The Amazon Resource Name (ARN) for the VPC connection.</p> */
          VpcConnectionArn: string;
        };
        /**
         * @minLength 1
         * @maxLength 2048
         */
        IdentityProviderResourceUri?: string;
      };
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
      AuthenticationType?: "PASSWORD" | "TOKEN" | "X509";
    };
    AmazonElasticsearchParameters?: {
      /**
       * <p>The OpenSearch domain.</p>
       * @minLength 1
       * @maxLength 64
       */
      Domain: string;
    };
    AmazonOpenSearchParameters?: {
      /**
       * <p>The OpenSearch domain.</p>
       * @minLength 1
       * @maxLength 64
       */
      Domain: string;
    };
    PostgreSqlParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    AuroraParameters?: {
      /**
       * <p>Port.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>Database.</p>
       * @minLength 1
       * @maxLength 128
       */
      Database: string;
      /**
       * <p>Host.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
    };
    S3Parameters?: {
      ManifestFileLocation: {
        /**
         * <p>Amazon S3 bucket.</p>
         * @minLength 1
         * @maxLength 1024
         */
        Bucket: string;
        /**
         * <p>Amazon S3 key that identifies an object.</p>
         * @minLength 1
         * @maxLength 1024
         */
        Key: string;
      };
      /**
       * <p>Use the <code>RoleArn</code> structure to override an account-wide role for a specific S3 data
       * source. For example, say an account administrator has turned off all S3 access with an account-wide
       * role. The administrator can then use <code>RoleArn</code> to bypass the account-wide role and allow
       * S3 access for the single S3 data source that is specified in the structure, even if the
       * account-wide role forbidding S3 access is still active.</p>
       * @minLength 20
       * @maxLength 2048
       */
      RoleArn?: string;
    };
    TrinoParameters?: {
      /**
       * <p>The port for the Trino data source.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>The host name of the Trino data source.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
      /**
       * <p>The catalog name for the Trino data source.</p>
       * @minLength 0
       * @maxLength 128
       */
      Catalog: string;
    };
    DatabricksParameters?: {
      /**
       * <p>The port for the Databricks data source.</p>
       * @default 0
       * @minimum 1
       * @maximum 65535
       */
      Port: number;
      /**
       * <p>The host name of the Databricks data source.</p>
       * @minLength 1
       * @maxLength 256
       */
      Host: string;
      /**
       * <p>The HTTP path of the Databricks data source.</p>
       * @minLength 1
       * @maxLength 4096
       */
      SqlEndpointPath: string;
    };
  })[];
  /**
   * @minLength 12
   * @maxLength 12
   * @pattern ^[0-9]{12}$
   */
  AwsAccountId?: string;
  /**
   * @minItems 1
   * @maxItems 64
   */
  Permissions?: {
    /**
     * <p>The IAM action to grant or revoke permissions on.</p>
     * @minItems 1
     * @maxItems 20
     */
    Actions: string[];
    Resource?: string;
    /**
     * <p>The Amazon Resource Name (ARN) of the principal. This can be one of the
     * following:</p>
     * <ul>
     * <li>
     * <p>The ARN of an Amazon QuickSight user or group associated with a data source or
     * dataset. (This is common.)</p>
     * </li>
     * <li>
     * <p>The ARN of an Amazon QuickSight user, group, or namespace associated with an
     * analysis, dashboard, template, or theme. (This is common.)</p>
     * </li>
     * <li>
     * <p>The ARN of an Amazon Web Services account root: This is an IAM ARN rather than a
     * QuickSight
     * ARN. Use this option only to share resources (templates) across Amazon Web
     * Services accounts.
     * (This is less common.) </p>
     * </li>
     * </ul>
     * @minLength 1
     * @maxLength 256
     */
    Principal: string;
  }[];
  /** <p>The Amazon Resource Name (ARN) of the data source.</p> */
  Arn?: string;
  SslProperties?: {
    /**
     * <p>A Boolean option to control whether SSL should be disabled.</p>
     * @default false
     */
    DisableSsl?: boolean;
  };
  Credentials?: {
    /**
     * <p>The Amazon Resource Name (ARN) of the secret associated with the data source in Amazon Secrets
     * Manager.</p>
     * @minLength 1
     * @maxLength 2048
     * @pattern ^arn:[-a-z0-9]*:secretsmanager:[-a-z0-9]*:[0-9]{12}:secret:.+$
     */
    SecretArn?: string;
    /**
     * <p>The Amazon Resource Name (ARN) of a data source that has the credential pair that you
     * want to use. When <code>CopySourceArn</code> is not null, the credential pair from the
     * data source in the ARN is used as the credentials for the
     * <code>DataSourceCredentials</code> structure.</p>
     * @pattern ^arn:[-a-z0-9]*:quicksight:[-a-z0-9]*:[0-9]{12}:datasource/.+$
     */
    CopySourceArn?: string;
    CredentialPair?: {
      /**
       * <p>A set of alternate data source parameters that you want to share for these
       * credentials. The credentials are applied in tandem with the data source parameters when
       * you copy a data source by using a create or update request. The API operation compares
       * the <code>DataSourceParameters</code> structure that's in the request with the
       * structures in the <code>AlternateDataSourceParameters</code> allow list. If the
       * structures are an exact match, the request is allowed to use the new data source with
       * the existing credentials. If the <code>AlternateDataSourceParameters</code> list is
       * null, the <code>DataSourceParameters</code> originally used with these
       * <code>Credentials</code> is automatically allowed.</p>
       * @minItems 1
       * @maxItems 50
       */
      AlternateDataSourceParameters?: ({
        AuroraPostgreSqlParameters?: {
          /**
           * <p>The port that Amazon Aurora PostgreSQL is listening on.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>The Amazon Aurora PostgreSQL database to connect to.</p>
           * @minLength 1
           * @maxLength 128
           */
          Database: string;
          /**
           * <p>The Amazon Aurora PostgreSQL-Compatible host to connect to.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
        };
        TeradataParameters?: {
          /**
           * <p>Port.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>Database.</p>
           * @minLength 1
           * @maxLength 128
           */
          Database: string;
          /**
           * <p>Host.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
        };
        RdsParameters?: {
          /**
           * <p>Instance ID.</p>
           * @minLength 1
           * @maxLength 64
           */
          InstanceId: string;
          /**
           * <p>Database.</p>
           * @minLength 1
           * @maxLength 128
           */
          Database: string;
        };
        AthenaParameters?: {
          /**
           * <p>The workgroup that Amazon Athena uses.</p>
           * @minLength 1
           * @maxLength 128
           */
          WorkGroup?: string;
          IdentityCenterConfiguration?: {
            /**
             * <p>A Boolean option that controls whether Trusted Identity Propagation should be used.</p>
             * @default null
             */
            EnableIdentityPropagation?: boolean;
          };
          /**
           * <p>Use the <code>RoleArn</code> structure to override an account-wide role for a specific Athena
           * data source. For example, say an account administrator has turned off all Athena access with an
           * account-wide role. The administrator can then use <code>RoleArn</code> to bypass the account-wide
           * role and allow Athena access for the single Athena data source that is specified in the structure,
           * even if the account-wide role forbidding Athena access is still active.</p>
           * @minLength 20
           * @maxLength 2048
           */
          RoleArn?: string;
        };
        SparkParameters?: {
          /**
           * <p>Port.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>Host.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
        };
        MariaDbParameters?: {
          /**
           * <p>Port.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>Database.</p>
           * @minLength 1
           * @maxLength 128
           */
          Database: string;
          /**
           * <p>Host.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
        };
        OracleParameters?: {
          /** @default false */
          UseServiceName?: boolean;
          /**
           * <p>The port.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>The database.</p>
           * @minLength 1
           * @maxLength 128
           */
          Database: string;
          /**
           * <p>An Oracle host.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
        };
        PrestoParameters?: {
          /**
           * <p>Port.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>Host.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
          /**
           * <p>Catalog.</p>
           * @minLength 0
           * @maxLength 128
           */
          Catalog: string;
        };
        StarburstParameters?: {
          /**
           * <p>The port for the Starburst data source.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * @minLength 0
           * @maxLength 128
           */
          DatabaseAccessControlRole?: string;
          ProductType?: "GALAXY" | "ENTERPRISE";
          OAuthParameters?: {
            /**
             * @minLength 1
             * @maxLength 2048
             */
            TokenProviderUrl: string;
            /**
             * @minLength 1
             * @maxLength 128
             */
            OAuthScope?: string;
            IdentityProviderVpcConnectionProperties?: {
              /** <p>The Amazon Resource Name (ARN) for the VPC connection.</p> */
              VpcConnectionArn: string;
            };
            /**
             * @minLength 1
             * @maxLength 2048
             */
            IdentityProviderResourceUri?: string;
          };
          /**
           * <p>The host name of the Starburst data source.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
          /**
           * <p>The catalog name for the Starburst data source.</p>
           * @minLength 0
           * @maxLength 128
           */
          Catalog: string;
          AuthenticationType?: "PASSWORD" | "TOKEN" | "X509";
        };
        RedshiftParameters?: {
          IAMParameters?: {
            /**
             * <p>Automatically creates a database user. If your database doesn't have a
             * <code>DatabaseUser</code>, set this parameter to <code>True</code>. If there is no
             * <code>DatabaseUser</code>, Amazon QuickSight can't connect to your cluster. The
             * <code>RoleArn</code> that you use for this operation must grant access to
             * <code>redshift:CreateClusterUser</code> to successfully create the user.</p>
             * @default false
             */
            AutoCreateDatabaseUser?: boolean;
            /**
             * <p>The user whose permissions and group memberships will be used by Amazon QuickSight to access the
             * cluster. If this user already exists in your database, Amazon QuickSight is granted the same
             * permissions that the user has. If the user doesn't exist, set the value of
             * <code>AutoCreateDatabaseUser</code> to <code>True</code> to create a new user with PUBLIC
             * permissions.</p>
             * @minLength 1
             * @maxLength 64
             */
            DatabaseUser?: string;
            /**
             * <p>Use the <code>RoleArn</code> structure to allow Amazon QuickSight to call
             * <code>redshift:GetClusterCredentials</code> on your cluster. The calling principal must have
             * <code>iam:PassRole</code> access to pass the role to Amazon QuickSight. The role's trust policy
             * must allow the Amazon QuickSight service principal to assume the role.</p>
             * @minLength 20
             * @maxLength 2048
             */
            RoleArn: string;
            /**
             * <p>A list of groups whose permissions will be granted to Amazon QuickSight to access the cluster.
             * These permissions are combined with the permissions granted to Amazon QuickSight by the
             * <code>DatabaseUser</code>. If you choose to include this parameter, the <code>RoleArn</code> must
             * grant access to <code>redshift:JoinGroup</code>.</p>
             * @minItems 1
             * @maxItems 50
             */
            DatabaseGroups?: string[];
          };
          /**
           * <p>Cluster ID. This field can be blank if the <code>Host</code> and <code>Port</code> are
           * provided.</p>
           * @minLength 1
           * @maxLength 64
           */
          ClusterId?: string;
          /**
           * <p>Port. This field can be blank if the <code>ClusterId</code> is provided.</p>
           * @default 0
           * @minimum 0
           * @maximum 65535
           */
          Port?: number;
          /**
           * <p>Database.</p>
           * @minLength 1
           * @maxLength 128
           */
          Database: string;
          /**
           * <p>Host. This field can be blank if <code>ClusterId</code> is provided.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host?: string;
          IdentityCenterConfiguration?: {
            /**
             * <p>A Boolean option that controls whether Trusted Identity Propagation should be used.</p>
             * @default null
             */
            EnableIdentityPropagation?: boolean;
          };
        };
        MySqlParameters?: {
          /**
           * <p>Port.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>Database.</p>
           * @minLength 1
           * @maxLength 128
           */
          Database: string;
          /**
           * <p>Host.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
        };
        SqlServerParameters?: {
          /**
           * <p>Port.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>Database.</p>
           * @minLength 1
           * @maxLength 128
           */
          Database: string;
          /**
           * <p>Host.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
        };
        SnowflakeParameters?: {
          /**
           * <p>Warehouse.</p>
           * @minLength 0
           * @maxLength 128
           */
          Warehouse: string;
          /**
           * @minLength 0
           * @maxLength 128
           */
          DatabaseAccessControlRole?: string;
          /**
           * <p>Database.</p>
           * @minLength 1
           * @maxLength 128
           */
          Database: string;
          OAuthParameters?: {
            /**
             * @minLength 1
             * @maxLength 2048
             */
            TokenProviderUrl: string;
            /**
             * @minLength 1
             * @maxLength 128
             */
            OAuthScope?: string;
            IdentityProviderVpcConnectionProperties?: {
              /** <p>The Amazon Resource Name (ARN) for the VPC connection.</p> */
              VpcConnectionArn: string;
            };
            /**
             * @minLength 1
             * @maxLength 2048
             */
            IdentityProviderResourceUri?: string;
          };
          /**
           * <p>Host.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
          AuthenticationType?: "PASSWORD" | "TOKEN" | "X509";
        };
        AmazonElasticsearchParameters?: {
          /**
           * <p>The OpenSearch domain.</p>
           * @minLength 1
           * @maxLength 64
           */
          Domain: string;
        };
        AmazonOpenSearchParameters?: {
          /**
           * <p>The OpenSearch domain.</p>
           * @minLength 1
           * @maxLength 64
           */
          Domain: string;
        };
        PostgreSqlParameters?: {
          /**
           * <p>Port.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>Database.</p>
           * @minLength 1
           * @maxLength 128
           */
          Database: string;
          /**
           * <p>Host.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
        };
        AuroraParameters?: {
          /**
           * <p>Port.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>Database.</p>
           * @minLength 1
           * @maxLength 128
           */
          Database: string;
          /**
           * <p>Host.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
        };
        S3Parameters?: {
          ManifestFileLocation: {
            /**
             * <p>Amazon S3 bucket.</p>
             * @minLength 1
             * @maxLength 1024
             */
            Bucket: string;
            /**
             * <p>Amazon S3 key that identifies an object.</p>
             * @minLength 1
             * @maxLength 1024
             */
            Key: string;
          };
          /**
           * <p>Use the <code>RoleArn</code> structure to override an account-wide role for a specific S3 data
           * source. For example, say an account administrator has turned off all S3 access with an account-wide
           * role. The administrator can then use <code>RoleArn</code> to bypass the account-wide role and allow
           * S3 access for the single S3 data source that is specified in the structure, even if the
           * account-wide role forbidding S3 access is still active.</p>
           * @minLength 20
           * @maxLength 2048
           */
          RoleArn?: string;
        };
        TrinoParameters?: {
          /**
           * <p>The port for the Trino data source.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>The host name of the Trino data source.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
          /**
           * <p>The catalog name for the Trino data source.</p>
           * @minLength 0
           * @maxLength 128
           */
          Catalog: string;
        };
        DatabricksParameters?: {
          /**
           * <p>The port for the Databricks data source.</p>
           * @default 0
           * @minimum 1
           * @maximum 65535
           */
          Port: number;
          /**
           * <p>The host name of the Databricks data source.</p>
           * @minLength 1
           * @maxLength 256
           */
          Host: string;
          /**
           * <p>The HTTP path of the Databricks data source.</p>
           * @minLength 1
           * @maxLength 4096
           */
          SqlEndpointPath: string;
        };
      })[];
      /**
       * <p>User name.</p>
       * @minLength 1
       * @maxLength 64
       */
      Username: string;
      /**
       * <p>Password.</p>
       * @minLength 1
       * @maxLength 1024
       */
      Password: string;
    };
  };
  DataSourceId?: string;
  /**
   * @minItems 1
   * @maxItems 200
   */
  Tags?: {
    /**
     * <p>Tag value.</p>
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
    /**
     * <p>Tag key.</p>
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
