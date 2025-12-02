/**
 * #### A fully managed relational (SQL) database resource.
 *
 * ---
 *
 * Supports various database engines like PostgreSQL, MySQL, and MariaDB, with features like clustering and high availability.
 */
interface RelationalDatabase {
  type: 'relational-database';
  properties: RelationalDatabaseProps;
  overrides?: ResourceOverrides;
}

interface RelationalDatabaseProps {
  /**
   * #### Configures the credentials for the database's master user.
   *
   * ---
   *
   * These credentials are used to connect to the database and are included in the connection string.
   */
  credentials: RelationalDatabaseCredentials;
  /**
   * #### Configures the database engine.
   *
   * ---
   *
   * The engine determines the database type (e.g., PostgreSQL, MySQL), performance characteristics, and features like high availability and scaling.
   *
   * Stacktape supports several engine types:
   *
   * - **RDS Engines**: Fully managed, single-node databases (e.g., `postgres`, `mysql`). Ideal for standard workloads.
   * - **Aurora Engines**: High-performance, highly available clustered databases developed by AWS (e.g., `aurora-postgresql`, `aurora-mysql`).
   * - **Aurora Serverless V2 Engines**: A serverless version of Aurora that automatically scales compute capacity based on demand (e.g., `aurora-postgresql-serverless-v2`). This is the recommended serverless option.
   *
   * For more details on each engine, see the [AWS documentation](https://aws.amazon.com/rds/).
   */
  engine: AuroraServerlessEngine | RdsEngine | AuroraEngine | AuroraServerlessV2Engine;
  /**
   * #### Configures the network accessibility of the database.
   *
   * ---
   *
   * By default, the database is accessible from the internet (but still protected by credentials).
   * You can restrict access to a VPC, specific IP addresses, or only to other resources within your stack.
   */
  accessibility?: DatabaseAccessibility;
  /**
   * #### Protects the database from accidental deletion.
   *
   * ---
   *
   * If enabled, you must explicitly disable this protection before you can delete the database.
   *
   * @default false
   */
  deletionProtection?: boolean;
  /**
   * #### The number of days to retain automated backups.
   *
   * ---
   *
   * Automated backups are taken daily. You can retain them for up to 35 days.
   * To disable automated backups for RDS engines, set this to 0.
   * This setting does not affect manual snapshots.
   *
   * @default 1
   */
  automatedBackupRetentionDays?: number;
  /**
   * #### The preferred time window for database maintenance.
   *
   * ---
   *
   * Maintenance activities, such as OS patching or engine upgrades, will be performed during this window.
   * The database may be briefly unavailable during maintenance. To avoid downtime, use a multi-AZ deployment or an Aurora engine.
   *
   * The format is `day:start_time-day:end_time` in UTC (e.g., `Sun:02:00-Sun:04:00`).
   * By default, the maintenance window is set to a region-specific time on Sundays.
   */
  preferredMaintenanceWindow?: string;
  /**
   * #### A list of additional alarms to associate with this database.
   *
   * ---
   *
   * These alarms are merged with any globally configured alarms from the Stacktape console.
   */
  alarms?: RelationalDatabaseAlarm[];
  /**
   * #### A list of global alarm names to disable for this database.
   *
   * ---
   *
   * Use this to prevent specific globally-defined alarms from applying to this database.
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Configures logging for the database.
   *
   * ---
   *
   * By default, logs are enabled and retained for 90 days.
   * The available log types depend on the database engine. You can log connections, queries, errors, and more.
   */
  logging?: RelationalDatabaseLogging;
}

type StpRelationalDatabase = RelationalDatabase['properties'] & {
  name: string;
  type: RelationalDatabase['type'];
  configParentResourceType: RelationalDatabase['type'];
  nameChain: string[];
};

interface SharedEngineProperties {
  /**
   * #### The version of the database engine.
   *
   * ---
   *
   * Each engine type supports a specific set of versions.
   * For a full list, see the [Stacktape documentation](https://docs.stacktape.com/database-resources/relational-databases/#engine-version).
   */
  version: string;
  /**
   * #### Specifies whether minor engine upgrades should be applied automatically.
   *
   * @default false
   */
  disableAutoMinorVersionUpgrade?: boolean;
}

/**
 * #### A high-performance Aurora clustered database engine.
 *
 * ---
 *
 * Aurora is a fully managed, MySQL and PostgreSQL-compatible database developed by AWS.
 * It offers up to 5x the throughput of standard MySQL and 3x the throughput of standard PostgreSQL.
 *
 * Aurora automatically replicates data across multiple Availability Zones for high availability
 * and provides automatic failover with read replicas.
 */
interface AuroraEngine {
  type: 'aurora-mysql' | 'aurora-postgresql';
  properties: AuroraEngineProperties;
}

/**
 * #### An Aurora Serverless v1 database engine.
 *
 * ---
 *
 * Aurora Serverless v1 automatically scales compute capacity based on your application's needs.
 * It can pause during periods of inactivity and resume when traffic arrives, making it cost-effective
 * for variable or unpredictable workloads.
 *
 * **Note:** For new projects, consider using Aurora Serverless v2 which offers better scaling.
 */
interface AuroraServerlessEngine {
  type: 'aurora-mysql-serverless' | 'aurora-postgresql-serverless';
  properties?: AuroraServerlessEngineProperties;
}

/**
 * #### An Aurora Serverless v2 database engine (recommended serverless option).
 *
 * ---
 *
 * Aurora Serverless v2 provides instant, fine-grained scaling from 0.5 to 128 ACUs.
 * It scales in increments as small as 0.5 ACUs for more precise capacity matching.
 *
 * This is the recommended serverless engine for most use cases, offering better performance
 * and more granular scaling than v1.
 */
interface AuroraServerlessV2Engine {
  type: 'aurora-mysql-serverless-v2' | 'aurora-postgresql-serverless-v2';
  properties: AuroraServerlessV2EngineProperties;
}

/**
 * #### A standard RDS single-instance database engine.
 *
 * ---
 *
 * RDS engines are fully managed, single-node databases ideal for standard workloads.
 * Supported engines include PostgreSQL, MySQL, MariaDB, Oracle, and SQL Server.
 *
 * RDS handles routine database tasks such as provisioning, patching, backup, recovery,
 * and failure detection. For high availability, enable multi-AZ deployment.
 */
interface RdsEngine {
  type:
    | 'postgres'
    | 'mariadb'
    | 'mysql'
    | 'oracle-ee'
    | 'oracle-se2'
    | 'sqlserver-ee'
    | 'sqlserver-ex'
    | 'sqlserver-se'
    | 'sqlserver-web';
  properties: RdsEngineProperties;
}

interface RdsEnginePrimaryInstance {
  /**
   * #### The instance size for the database.
   *
   * ---
   *
   * This determines the CPU, memory, and networking capacity of the database instance.
   * For a list of available instance sizes, see the [AWS RDS instance types documentation](https://aws.amazon.com/rds/instance-types/).
   *
   * > **Note:** Not all instance sizes are available for all engines, versions, and regions.
   * > Some instance families (like `t3` or `t4`) are intended for development and testing, not production workloads.
   */
  instanceSize: string;
  /**
   * #### Specifies whether the database should be deployed across multiple Availability Zones (AZs) for high availability.
   *
   * ---
   *
   * When enabled, a standby replica is created in a different AZ. If the primary instance fails, traffic is automatically failed over to the standby.
   * This also minimizes downtime during maintenance.
   */
  multiAz?: boolean;
}

interface RelationalDatabaseCredentials {
  /**
   * #### The username for the database's master user.
   *
   * ---
   *
   * This user will have administrative privileges for the database.
   * Avoid using the following characters in the username: `[]{}(),;?*=!@`.
   *
   * > Changing this value after the database has been created will cause the database to be replaced, resulting in data loss.
   *
   * @default "db_master_user"
   */
  masterUserName?: string;
  /**
   * #### The password for the database's master user.
   *
   * ---
   *
   * Avoid using the following characters in the password: `[]{}(),;?*=!@`.
   *
   * > **Recommendation:** Store the password in a [Stacktape secret](https://docs.stacktape.com/security-resources/secrets/) and reference it using the `$Secret` directive to avoid exposing it in your configuration file.
   */
  masterUserPassword: string;
}

interface DatabaseAccessibility {
  /**
   * #### The accessibility mode for the database.
   *
   * ---
   *
   * - **internet**: The database is accessible from anywhere on the internet.
   * - **vpc**: The database is only accessible from within the same VPC. You can optionally whitelist external IPs.
   * - **scoping-workloads-in-vpc**: Similar to `vpc` mode, but requires explicit `connectTo` permissions for other resources in the stack to access the database.
   * - **whitelisted-ips-only**: The database is only accessible from a specific list of IP addresses.
   *
   * > **Note:** Aurora Serverless engines do not support public accessibility. You must use `vpc` or `scoping-workloads-in-vpc` and connect via a bastion host or the Data API.
   *
   * For more information on VPCs, see the [Stacktape VPCs documentation](https://docs.stacktape.com/user-guides/vpcs/).
   *
   * @default "internet"
   */
  accessibilityMode: 'internet' | 'vpc' | 'scoping-workloads-in-vpc' | 'whitelisted-ips-only';
  /**
   * #### Disables public accessibility for the database endpoint.
   *
   * ---
   *
   * This ensures that the database can only be accessed from within its VPC, providing an additional layer of isolation.
   *
   * > For Aurora engines, this property can only be set when the database is created and cannot be changed later.
   */
  forceDisablePublicIp?: boolean;
  /**
   * #### A list of IP addresses or CIDR ranges to allow access from.
   *
   * ---
   *
   * - In `vpc` and `scoping-workloads-in-vpc` modes, this allows access from outside the VPC (e.g., an office IP).
   * - In `whitelisted-ips-only` mode, only these addresses can access the database.
   * - This has no effect in `internet` mode.
   */
  whitelistedIps?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RdsEngineReadReplica extends RdsEnginePrimaryInstance {}

interface RdsEngineProperties extends SharedEngineProperties {
  /**
   * #### The name of the initial database to create in the cluster.
   *
   * ---
   *
   * The behavior of this property depends on the engine:
   * - For MySQL, MariaDB, and PostgreSQL, this is the name of the database created on initialization. If not specified, a default database is created.
   * - For Oracle, this is the System ID (SID) of the database instance.
   * - For SQL Server, this property is not applicable.
   */
  dbName?: string;
  /**
   * #### The port on which the database server will listen for connections.
   *
   * ---
   *
   * Default ports vary by engine:
   * - MySQL/MariaDB: 3306
   * - PostgreSQL: 5432
   * - Oracle: 1521
   * - SQL Server: 1433
   */
  port?: number;
  /**
   * #### Configures storage for the database.
   *
   * ---
   *
   * Storage will automatically scale up when free space is low.
   * For more details on storage autoscaling, see the [AWS documentation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.StorageTypes.html#USER_PIOPS.Autoscaling).
   */
  storage?: RdsEngineStorage;
  /**
   * #### Configures the primary database instance.
   *
   * ---
   *
   * The primary instance handles all write operations. You can specify its size and enable multi-AZ deployment for high availability.
   */
  primaryInstance: RdsEnginePrimaryInstance;
  /**
   * #### A list of read replicas for the primary instance.
   *
   * ---
   *
   * Read replicas can handle read-only traffic to reduce the load on the primary instance.
   * They are kept in sync with the primary through asynchronous replication.
   * Each read replica has its own endpoint.
   */
  readReplicas?: RdsEngineReadReplica[];
}

interface RelationalDatabaseLogging extends LogForwardingBase {
  /**
   * #### Disables the collection of database server logs to CloudWatch.
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### The number of days to retain logs in CloudWatch.
   *
   * @default 90
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
  /**
   * #### The types of logs to export to CloudWatch.
   *
   * ---
   *
   * The available log types depend on the database engine.
   *
   * - **PostgreSQL**: `postgresql`
   * - **MySQL/MariaDB**: `audit`, `error`, `general`, `slowquery`
   * - **Oracle**: `alert`, `audit`, `listener`, `trace`
   * - **SQL Server**: `agent`, `error`
   */
  logTypes?: string[];
  /**
   * #### Engine-specific logging options.
   *
   * ---
   *
   * This allows for more granular control over what is logged.
   * Currently supported for PostgreSQL, MySQL, and MariaDB.
   */
  engineSpecificOptions?: PostgresLoggingOptions | MysqlLoggingOptions;
}

interface PostgresLoggingOptions {
  /**
   * #### Logs all new client connections.
   *
   * @default false
   */
  log_connections?: boolean;
  /**
   * #### Logs all client disconnections.
   *
   * @default false
   */
  log_disconnections?: boolean;
  /**
   * #### Logs sessions that are waiting for a lock.
   *
   * ---
   *
   * This can help identify performance issues caused by lock contention.
   *
   * @default false
   */
  log_lock_waits?: boolean;
  /**
   * #### The minimum execution time (in milliseconds) for a statement to be logged.
   *
   * ---
   *
   * - `-1`: Disables this feature.
   * - `0`: Logs all statements.
   * - `>0`: Logs statements that exceed this duration.
   *
   * This is useful for identifying slow queries.
   *
   * @default 10000
   */
  log_min_duration_statement?: number;
  /**
   * #### Controls which types of SQL statements are logged.
   *
   * ---
   *
   * - `none`: No statements are logged.
   * - `ddl`: Logs all Data Definition Language (DDL) statements (e.g., `CREATE`, `ALTER`).
   * - `mod`: Logs all DDL statements plus `INSERT`, `UPDATE`, and `DELETE`.
   * - `all`: Logs all statements.
   *
   * @default "ddl"
   */
  log_statement?: 'none' | 'ddl' | 'mod' | 'all';
}

interface MysqlLoggingOptions {
  /**
   * #### The types of activity to record in the audit log.
   *
   * ---
   *
   * - `CONNECT`: Successful and unsuccessful connections and disconnections.
   * - `QUERY`: The text of all queries.
   * - `QUERY_DDL`: Only Data Definition Language (DDL) queries.
   * - `QUERY_DML`: Only Data Manipulation Language (DML) queries (including `SELECT`).
   * - `QUERY_DML_NO_SELECT`: DML queries, excluding `SELECT`.
   * - `QUERY_DCL`: Only Data Control Language (DCL) queries.
   *
   * @default ["QUERY_DDL"]
   */
  server_audit_events?: ('CONNECT' | 'QUERY' | 'QUERY_DDL' | 'QUERY_DML' | 'QUERY_DML_NO_SELECT' | 'QUERY_DCL')[];
  /**
   * #### The execution time (in seconds) above which a query is considered "slow" and logged to the slow query log.
   *
   * ---
   *
   * Use `-1` to disable slow query logging.
   *
   * @default 10
   */
  long_query_time?: number;
}

interface RdsEngineStorage {
  /**
   * #### The initial storage size (in GB) for the database.
   *
   * @default 20
   */
  initialSize?: number;
  /**
   * #### The maximum storage size (in GB) that the database can scale up to.
   *
   * @default 200
   */
  maxSize?: number;
}

interface AuroraServerlessEngineProperties extends Omit<SharedEngineProperties, 'version'> {
  /**
   * #### The version of the database engine.
   *
   * ---
   *
   * For serverless engines, you typically don't need to specify this, as AWS manages the version.
   * For a list of supported versions, see the [Stacktape documentation](https://docs.stacktape.com/database-resources/relational-databases/#engine-version).
   */
  version?: string;
  /**
   * #### The name of the initial database to create.
   *
   * @default "defdb"
   */
  dbName?: string;
  /**
   * #### The minimum number of Aurora Capacity Units (ACUs) for the database to scale down to.
   *
   * ---
   *
   * Each ACU provides approximately 2 GB of memory and corresponding CPU and networking.
   *
   * **Allowed values:**
   * - `aurora-mysql-serverless`: 1, 2, 4, 8, 16, 32, 64, 128, 256
   * - `aurora-postgresql-serverless`: 2, 4, 8, 16, 32, 64, 128, 256
   *
   * @default 2
   */
  minCapacity?: number;
  /**
   * #### The maximum number of Aurora Capacity Units (ACUs) for the database to scale up to.
   *
   * ---
   *
   * **Allowed values:**
   * - `aurora-mysql-serverless`: 1, 2, 4, 8, 16, 32, 64, 128, 256
   * - `aurora-postgresql-serverless`: 2, 4, 8, 16, 32, 64, 128, 256
   *
   * @default 4
   */
  maxCapacity?: number;
  /**
   * #### The time (in seconds) of inactivity before the serverless database is paused.
   *
   * ---
   *
   * The database is considered inactive if there are no active connections.
   * When paused, you are only charged for storage.
   *
   * The value must be between 300 (5 minutes) and 86400 (24 hours). If not set, the database is never paused.
   */
  pauseAfterSeconds?: number;
}

interface AuroraServerlessV2EngineProperties extends SharedEngineProperties {
  /**
   * #### The name of the initial database to create.
   *
   * @default "defdb"
   */
  dbName?: string;
  /**
   * #### The minimum number of Aurora Capacity Units (ACUs) for the database to scale down to.
   *
   * ---
   *
   * Each ACU provides approximately 2 GB of memory and corresponding CPU and networking.
   *
   * **Allowed values:**
   * - `aurora-mysql-serverless-v2`: 0.5-128 (in 0.5 increments)
   * - `aurora-postgresql-serverless-v2`: 0.5-128 (in 0.5 increments)
   *
   * @default 0.5
   */
  minCapacity?: number;
  /**
   * #### The maximum number of Aurora Capacity Units (ACUs) for the database to scale up to.
   *
   * ---
   *
   * **Allowed values:**
   * - `aurora-mysql-serverless-v2`: 0.5-128 (in 0.5 increments)
   * - `aurora-postgresql-serverless-v2`: 0.5-128 (in 0.5 increments)
   *
   * @default 10
   */
  maxCapacity?: number;
}

interface AuroraEngineProperties extends SharedEngineProperties {
  /**
   * #### The name of the initial database to create.
   *
   * @default "defdb"
   */
  dbName?: string;
  /**
   * #### The port on which the database will listen for connections.
   *
   * ---
   *
   * - `aurora-mysql`: 3306
   * - `aurora-postgresql`: 5432
   */
  port?: number;
  /**
   * #### A list of database instances in the Aurora cluster.
   *
   * ---
   *
   * The first instance in the list is the primary (writer) instance. The rest are read replicas.
   * Read requests are automatically load-balanced across all instances.
   * If the primary instance fails, a read replica is automatically promoted to be the new primary.
   */
  instances: AuroraEngineInstance[];
}

interface AuroraEngineInstance {
  /**
   * #### The instance size for the database.
   *
   * ---
   *
   * This determines the CPU, memory, and networking capacity of the database instance.
   * For a list of available instance sizes, see the [AWS Aurora pricing documentation](https://aws.amazon.com/rds/aurora/pricing/#Database%20Instances).
   *
   * > **Note:** Not all instance sizes are available for all engines, versions, and regions.
   * > Some instance families (like `t3` or `t4`) are intended for development and testing, not production workloads.
   */
  instanceSize: string;
}

type RelationalDatabaseReferencableParam =
  | 'host'
  | 'hosts'
  | 'connectionString'
  | 'jdbcConnectionString'
  | 'port'
  | 'dbName'
  | 'readerHost'
  | 'readerPort'
  | 'readerConnectionString'
  | 'readerJdbcConnectionString'
  | 'readReplicaHosts'
  | 'readReplicaConnectionStrings'
  | 'readReplicaJdbcConnectionStrings'
  | `readReplica${number}Port`;

type NormalizedSQLEngine = Exclude<
  StpRelationalDatabase['engine']['type'],
  | 'aurora-postgresql-serverless'
  | 'aurora-mysql-serverless'
  | 'aurora-postgresql-serverless-v2'
  | 'aurora-mysql-serverless-v2'
>;
