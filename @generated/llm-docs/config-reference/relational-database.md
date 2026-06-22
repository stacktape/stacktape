# Relational Database

Resource type: `relational-database`

## TypeScript Definition

```typescript
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
   * #### Master user credentials (username and password).
   *
   * ---
   *
   * Included in the auto-generated connection string. Store the password in a Stacktape secret
   * to avoid exposing it in your config file.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserName: db_master_user
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.micro
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: {
 *       masterUserName: 'db_master_user',
 *       masterUserPassword: $Secret('mainDatabase.password')
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.micro' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  credentials: RelationalDatabaseCredentials;
  /**
   * #### Database engine: what type of database and how it runs.
   *
   * ---
   *
   * - **RDS** (`postgres`, `mysql`, `mariadb`, etc.): Single-node, fixed-size. Simple and predictable pricing.
   * - **Aurora** (`aurora-postgresql`, `aurora-mysql`): High-performance clustered DB with auto-failover.
   *   Up to 5x faster than standard MySQL / 3x faster than standard PostgreSQL.
   * - **Aurora Serverless v2** (`aurora-postgresql-serverless-v2`): Auto-scales from 0.5 to 128 ACUs.
   *   **Recommended for most new projects** — pay only for what you use.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: aurora-postgresql-serverless-v2
 *         properties:
 *           version: '16.6'
 *           minCapacity: 0.5
 *           maxCapacity: 8
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'aurora-postgresql-serverless-v2',
 *       properties: {
 *         version: '16.6',
 *         minCapacity: 0.5,
 *         maxCapacity: 8
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  engine: AuroraServerlessEngine | RdsEngine | AuroraEngine | AuroraServerlessV2Engine;
  /**
   * #### Who can connect to this database (network-level access control).
   *
   * ---
   *
   * Default is `internet` — anyone with credentials can connect (fine for development).
   * For production, use `scoping-workloads-in-vpc` to restrict access to only resources
   * that list this database in their `connectTo`.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       accessibility:
 *         accessibilityMode: scoping-workloads-in-vpc
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.micro
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.micro' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  accessibility?: DatabaseAccessibility;
  /**
   * #### Prevent accidental deletion of the database. Must be disabled before deleting.
   *
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       deletionProtection: true
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     deletionProtection: true,
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default false
   */
  deletionProtection?: boolean;
  /**
   * #### Days to keep automated daily backups (0-35). Set to 0 to disable (RDS only).
   *
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       automatedBackupRetentionDays: 7
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     automatedBackupRetentionDays: 7,
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default 1
   */
  automatedBackupRetentionDays?: number;
  /**
   * #### When maintenance (patching, upgrades) happens. Format: `Sun:02:00-Sun:04:00` (UTC).
   *
   * ---
   *
   * The database may be briefly unavailable during this window.
   * Use multi-AZ or Aurora to minimize downtime.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       preferredMaintenanceWindow: Sun:02:00-Sun:04:00
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     preferredMaintenanceWindow: 'Sun:02:00-Sun:04:00',
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  preferredMaintenanceWindow?: string;
  /**
   * #### Alarms for this database (merged with global alarms from the Stacktape Console).
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       alarms:
 *         - trigger:
 *             type: database-cpu-utilization
 *             properties:
 *               thresholdPercent: 85
 *           notificationTargets:
 *             - type: email
 *               properties:
 *                 sender: alerts@example.com
 *                 recipient: ops@example.com
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     alarms: [
 *       {
 *         trigger: {
 *           type: 'database-cpu-utilization',
 *           properties: { thresholdPercent: 85 }
 *         },
 *         notificationTargets: [
 *           {
 *             type: 'email',
 *             properties: { sender: 'alerts@example.com', recipient: 'ops@example.com' }
 *           }
 *         ]
 *       }
 *     ],
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  alarms?: RelationalDatabaseAlarm[];
  /**
   * #### Global alarm names to exclude from this database.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       disabledGlobalAlarms:
 *         - db-cpu-high
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     disabledGlobalAlarms: ['db-cpu-high'],
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  disabledGlobalAlarms?: string[];
  /**
   * #### Database logging (connections, slow queries, errors).
   *
   * ---
   *
   * Logs are sent to CloudWatch and retained for 90 days by default.
   * Available log types vary by engine.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         retentionDays: 30
 *         logTypes:
 *           - postgresql
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       retentionDays: 30,
 *       logTypes: ['postgresql']
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  logging?: RelationalDatabaseLogging;
  /**
   * #### Dev mode: runs locally in Docker by default. Set `remote: true` to use the deployed database.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       dev:
 *         remote: true
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.micro
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     dev: { remote: true },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.micro' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  dev?: DevModeConfig;
}

interface SharedEngineProperties {
  /**
   * #### Engine version (e.g., `16.6` for PostgreSQL, `8.0.36` for MySQL).
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  version: string;
  /**
   * #### Skip automatic minor version upgrades (e.g., 16.4 → 16.5).
   *
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           disableAutoMinorVersionUpgrade: true
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         disableAutoMinorVersionUpgrade: true,
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default false
   */
  disableAutoMinorVersionUpgrade?: boolean;
}

/**
 * #### Aurora: high-performance clustered database with auto-failover.
 *
 * ---
 *
 * Up to 5x faster than MySQL, 3x faster than PostgreSQL. Data is replicated across 3 AZs
 * automatically. If the primary instance fails, a read replica is promoted in seconds.
 */
interface AuroraEngine {
  type: 'aurora-mysql' | 'aurora-postgresql';
  properties: AuroraEngineProperties;
}

/**
 * #### Aurora Serverless v1: auto-scaling database that can pause when idle.
 *
 * ---
 *
 * Scales compute capacity automatically and pauses during inactivity (you only pay for storage).
 *
 * > **For new projects, use Aurora Serverless v2 instead** — it has faster scaling and more granular capacity control.
 */
interface AuroraServerlessEngine {
  type: 'aurora-mysql-serverless' | 'aurora-postgresql-serverless';
  properties?: AuroraServerlessEngineProperties;
}

/**
 * #### Aurora Serverless v2: recommended for most new projects.
 *
 * ---
 *
 * Scales instantly from 0.5 to 128 ACUs in 0.5-ACU increments (~1 ACU ≈ 2 GB RAM).
 * You pay only for the capacity used, making it cost-effective for variable workloads.
 */
interface AuroraServerlessV2Engine {
  type: 'aurora-mysql-serverless-v2' | 'aurora-postgresql-serverless-v2';
  properties: AuroraServerlessV2EngineProperties;
}

/**
 * #### Standard RDS: single-instance database with predictable pricing.
 *
 * ---
 *
 * Choose a fixed instance size and pay hourly. AWS handles patching, backups, and recovery.
 * For high availability, enable `multiAz` on the primary instance.
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
   * #### Instance size (e.g., `db.t4g.micro`, `db.r6g.large`).
   *
   * ---
   *
   * Determines CPU, memory, and network capacity. Quick guide:
   * - **db.t4g.micro** (~$12/mo): Dev/testing, 2 vCPU, 1 GB RAM
   * - **db.t4g.medium** (~$50/mo): Small production, 2 vCPU, 4 GB RAM
   * - **db.r6g.large** (~$180/mo): Production, 2 vCPU, 16 GB RAM
   *
   * `t` family instances are burstable (fine for low/variable load). Use `r` family for steady workloads.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.r6g.large
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: {
 *           instanceSize: 'db.r6g.large'
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  instanceSize: string;
  /**
   * #### Create a standby replica in another availability zone for automatic failover.
   *
   * ---
   *
   * If the primary goes down, traffic fails over to the standby automatically.
   * Also reduces downtime during maintenance. Doubles the instance cost.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 *             multiAz: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: {
 *           instanceSize: 'db.t4g.medium',
 *           multiAz: true
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  multiAz?: boolean;
}

interface RelationalDatabaseCredentials {
  /**
   * #### Admin username. Avoid special characters: `[]{}(),;?*=!@`.
   *
   * ---
   *
   * > **Warning:** Changing this after creation **replaces the database and deletes all data**.
   *
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserName: app_admin
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.micro
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: {
 *       masterUserName: 'app_admin',
 *       masterUserPassword: $Secret('mainDatabase.password')
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.micro' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default "db_master_user"
   */
  masterUserName?: string;
  /**
   * #### Admin password. Avoid special characters: `[]{}(),;?*=!@`.
   *
   * ---
   *
   * Use `$Secret()` to store it securely instead of hardcoding.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserName: db_master_user
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.micro
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: {
 *       masterUserName: 'db_master_user',
 *       masterUserPassword: $Secret('mainDatabase.password')
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.micro' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  masterUserPassword: string;
}

interface DatabaseAccessibility {
  /**
   * #### Controls who can connect to your database.
   *
   * ---
   *
   * - **`internet`** (default): Anyone with the credentials can connect. Simplest setup, great for development.
   *   The database is still protected by username/password.
   * - **`vpc`**: Only your app's resources (and anything in the same VPC) can connect.
   *   You can also whitelist specific IPs (e.g., your office) using `whitelistedIps`.
   * - **`scoping-workloads-in-vpc`**: Most restrictive. Only resources that explicitly list this
   *   database in their `connectTo` can reach it. Best for production.
   * - **`whitelisted-ips-only`**: Only the IP addresses you list in `whitelistedIps` can connect.
   *
   * > Aurora Serverless engines only support `vpc` or `scoping-workloads-in-vpc`.
   *
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       accessibility:
 *         accessibilityMode: vpc
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     accessibility: {
 *       accessibilityMode: 'vpc'
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default "internet"
   */
  accessibilityMode: 'internet' | 'vpc' | 'scoping-workloads-in-vpc' | 'whitelisted-ips-only';
  /**
   * #### Remove the database's public IP entirely (VPC-only access).
   *
   * ---
   *
   * > For Aurora, this can only be set at creation time and cannot be changed later.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       accessibility:
 *         accessibilityMode: vpc
 *         forceDisablePublicIp: true
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     accessibility: {
 *       accessibilityMode: 'vpc',
 *       forceDisablePublicIp: true
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  forceDisablePublicIp?: boolean;
  /**
   * #### IP addresses or CIDR ranges allowed to connect (e.g., `203.0.113.50/32`).
   *
   * ---
   *
   * - In `vpc`/`scoping-workloads-in-vpc`: adds external IPs on top of VPC access (e.g., your office).
   * - In `whitelisted-ips-only`: only these IPs can connect.
   * - No effect in `internet` mode.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       accessibility:
 *         accessibilityMode: whitelisted-ips-only
 *         whitelistedIps:
 *           - 203.0.113.50/32
 *           - 198.51.100.0/24
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     accessibility: {
 *       accessibilityMode: 'whitelisted-ips-only',
 *       whitelistedIps: ['203.0.113.50/32', '198.51.100.0/24']
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  whitelistedIps?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface RdsEngineReadReplica extends RdsEnginePrimaryInstance {}

interface RdsEngineProperties extends SharedEngineProperties {
  /**
   * #### Name of the database created on initialization. For Oracle, this is the SID. Not applicable to SQL Server.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           dbName: appdb
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         dbName: 'appdb',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  dbName?: string;
  /**
   * #### Port the database listens on. Defaults: PostgreSQL 5432, MySQL/MariaDB 3306, Oracle 1521, SQL Server 1433.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           port: 5433
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         port: 5433,
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  port?: number;
  /**
   * #### Storage configuration. Auto-scales up when free space is low.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           storage:
 *             initialSize: 50
 *             maxSize: 500
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         storage: { initialSize: 50, maxSize: 500 },
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  storage?: RdsEngineStorage;
  /**
   * #### The primary (writer) instance. Handles all write operations.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.r6g.large
 *             multiAz: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: {
 *           instanceSize: 'db.r6g.large',
 *           multiAz: true
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  primaryInstance: RdsEnginePrimaryInstance;
  /**
   * #### Read replicas to offload read traffic from the primary instance.
   *
   * ---
   *
   * Each replica gets its own endpoint. Data is replicated asynchronously from the primary.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.r6g.large
 *           readReplicas:
 *             - instanceSize: db.r6g.large
 *             - instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.r6g.large' },
 *         readReplicas: [
 *           { instanceSize: 'db.r6g.large' },
 *           { instanceSize: 'db.t4g.medium' }
 *         ]
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  readReplicas?: RdsEngineReadReplica[];
}

interface RelationalDatabaseLogging extends LogForwardingBase {
  /**
   * #### Disable CloudWatch logging entirely.
   *
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         disabled: true
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       disabled: true
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### How many days to keep logs.
   *
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         retentionDays: 180
 *         logTypes:
 *           - postgresql
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       retentionDays: 180,
 *       logTypes: ['postgresql']
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default 90
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
  /**
   * #### Which log types to export. Depends on engine:
   *
   * - **PostgreSQL**: `postgresql`
   * - **MySQL/MariaDB**: `audit`, `error`, `general`, `slowquery`
   * - **Oracle**: `alert`, `audit`, `listener`, `trace`
   * - **SQL Server**: `agent`, `error`
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         logTypes:
 *           - error
 *           - slowquery
 *       engine:
 *         type: mysql
 *         properties:
 *           version: '8.0.36'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       logTypes: ['error', 'slowquery']
 *     },
 *     engine: {
 *       type: 'mysql',
 *       properties: {
 *         version: '8.0.36',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  logTypes?: string[];
  /**
   * #### Fine-grained logging settings (PostgreSQL: slow queries, statements; MySQL: audit events).
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         logTypes:
 *           - postgresql
 *         engineSpecificOptions:
 *           log_min_duration_statement: 1000
 *           log_statement: ddl
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       logTypes: ['postgresql'],
 *       engineSpecificOptions: {
 *         log_min_duration_statement: 1000,
 *         log_statement: 'ddl'
 *       }
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  engineSpecificOptions?: PostgresLoggingOptions | MysqlLoggingOptions;
}

interface PostgresLoggingOptions {
  /**
   * #### Log new client connections.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         logTypes:
 *           - postgresql
 *         engineSpecificOptions:
 *           log_connections: true
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       logTypes: ['postgresql'],
 *       engineSpecificOptions: {
 *         log_connections: true
 *       }
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default false
   */
  log_connections?: boolean;
  /**
   * #### Log client disconnections.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         logTypes:
 *           - postgresql
 *         engineSpecificOptions:
 *           log_disconnections: true
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       logTypes: ['postgresql'],
 *       engineSpecificOptions: {
 *         log_disconnections: true
 *       }
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default false
   */
  log_disconnections?: boolean;
  /**
   * #### Log sessions waiting for locks (helps find lock contention issues).
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         logTypes:
 *           - postgresql
 *         engineSpecificOptions:
 *           log_lock_waits: true
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       logTypes: ['postgresql'],
 *       engineSpecificOptions: {
 *         log_lock_waits: true
 *       }
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default false
   */
  log_lock_waits?: boolean;
  /**
   * #### Log queries slower than this (ms). `-1` = disabled, `0` = log all. Great for finding slow queries.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         logTypes:
 *           - postgresql
 *         engineSpecificOptions:
 *           log_min_duration_statement: 500
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       logTypes: ['postgresql'],
 *       engineSpecificOptions: {
 *         log_min_duration_statement: 500
 *       }
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default 10000
   */
  log_min_duration_statement?: number;
  /**
   * #### Which SQL statements to log: `none`, `ddl` (CREATE/ALTER), `mod` (ddl + INSERT/UPDATE/DELETE), `all`.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         logTypes:
 *           - postgresql
 *         engineSpecificOptions:
 *           log_statement: mod
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       logTypes: ['postgresql'],
 *       engineSpecificOptions: {
 *         log_statement: 'mod'
 *       }
 *     },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default "ddl"
   */
  log_statement?: 'none' | 'ddl' | 'mod' | 'all';
}

interface MysqlLoggingOptions {
  /**
   * #### What to record in the audit log: connections, all queries, DDL only, DML only, etc.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         logTypes:
 *           - audit
 *         engineSpecificOptions:
 *           server_audit_events:
 *             - CONNECT
 *             - QUERY_DDL
 *       engine:
 *         type: mysql
 *         properties:
 *           version: '8.0.36'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       logTypes: ['audit'],
 *       engineSpecificOptions: {
 *         server_audit_events: ['CONNECT', 'QUERY_DDL']
 *       }
 *     },
 *     engine: {
 *       type: 'mysql',
 *       properties: {
 *         version: '8.0.36',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default ["QUERY_DDL"]
   */
  server_audit_events?: ('CONNECT' | 'QUERY' | 'QUERY_DDL' | 'QUERY_DML' | 'QUERY_DML_NO_SELECT' | 'QUERY_DCL')[];
  /**
   * #### Queries slower than this (seconds) are logged as "slow queries". `-1` to disable.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       logging:
 *         logTypes:
 *           - slowquery
 *         engineSpecificOptions:
 *           long_query_time: 2
 *       engine:
 *         type: mysql
 *         properties:
 *           version: '8.0.36'
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     logging: {
 *       logTypes: ['slowquery'],
 *       engineSpecificOptions: {
 *         long_query_time: 2
 *       }
 *     },
 *     engine: {
 *       type: 'mysql',
 *       properties: {
 *         version: '8.0.36',
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default 10
   */
  long_query_time?: number;
}

interface RdsEngineStorage {
  /**
   * #### Initial storage in GB. Auto-scales up when free space is low.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           storage:
 *             initialSize: 100
 *             maxSize: 500
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         storage: {
 *           initialSize: 100,
 *           maxSize: 500
 *         },
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default 20
   */
  initialSize?: number;
  /**
   * #### Max storage in GB. The database won't auto-scale beyond this.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: postgres
 *         properties:
 *           version: '16.6'
 *           storage:
 *             initialSize: 100
 *             maxSize: 1000
 *           primaryInstance:
 *             instanceSize: db.t4g.medium
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'postgres',
 *       properties: {
 *         version: '16.6',
 *         storage: {
 *           initialSize: 100,
 *           maxSize: 1000
 *         },
 *         primaryInstance: { instanceSize: 'db.t4g.medium' }
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default 200
   */
  maxSize?: number;
}

interface AuroraServerlessEngineProperties extends Omit<SharedEngineProperties, 'version'> {
  /**
   * #### Engine version. Usually managed by AWS automatically for serverless v1.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       accessibility:
 *         accessibilityMode: scoping-workloads-in-vpc
 *       engine:
 *         type: aurora-postgresql-serverless
 *         properties:
 *           version: '13.12'
 *           minCapacity: 2
 *           maxCapacity: 8
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
 *     engine: {
 *       type: 'aurora-postgresql-serverless',
 *       properties: {
 *         version: '13.12',
 *         minCapacity: 2,
 *         maxCapacity: 8
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  version?: string;
  /**
   * #### Name of the initial database.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       accessibility:
 *         accessibilityMode: scoping-workloads-in-vpc
 *       engine:
 *         type: aurora-postgresql-serverless
 *         properties:
 *           dbName: appdb
 *           minCapacity: 2
 *           maxCapacity: 8
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
 *     engine: {
 *       type: 'aurora-postgresql-serverless',
 *       properties: {
 *         dbName: 'appdb',
 *         minCapacity: 2,
 *         maxCapacity: 8
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default "defdb"
   */
  dbName?: string;
  /**
   * #### Minimum ACUs to scale down to (~1 ACU ≈ 2 GB RAM).
   *
   * ---
   *
   * MySQL: 1-256 (powers of 2). PostgreSQL: 2-256 (powers of 2).
   *
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       accessibility:
 *         accessibilityMode: scoping-workloads-in-vpc
 *       engine:
 *         type: aurora-postgresql-serverless
 *         properties:
 *           minCapacity: 2
 *           maxCapacity: 16
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
 *     engine: {
 *       type: 'aurora-postgresql-serverless',
 *       properties: {
 *         minCapacity: 2,
 *         maxCapacity: 16
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default 2
   */
  minCapacity?: number;
  /**
   * #### Maximum ACUs to scale up to.
   *
   * ---
   *
   * MySQL: 1-256 (powers of 2). PostgreSQL: 2-256 (powers of 2).
   *
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       accessibility:
 *         accessibilityMode: scoping-workloads-in-vpc
 *       engine:
 *         type: aurora-postgresql-serverless
 *         properties:
 *           minCapacity: 2
 *           maxCapacity: 32
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
 *     engine: {
 *       type: 'aurora-postgresql-serverless',
 *       properties: {
 *         minCapacity: 2,
 *         maxCapacity: 32
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default 4
   */
  maxCapacity?: number;
  /**
   * #### Pause the database after this many seconds of inactivity (no connections).
   *
   * ---
   *
   * When paused, you only pay for storage. Range: 300 (5 min) - 86400 (24 hr).
   * Omit to never pause.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       accessibility:
 *         accessibilityMode: scoping-workloads-in-vpc
 *       engine:
 *         type: aurora-postgresql-serverless
 *         properties:
 *           minCapacity: 2
 *           maxCapacity: 8
 *           pauseAfterSeconds: 900
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' },
 *     engine: {
 *       type: 'aurora-postgresql-serverless',
 *       properties: {
 *         minCapacity: 2,
 *         maxCapacity: 8,
 *         pauseAfterSeconds: 900
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  pauseAfterSeconds?: number;
}

interface AuroraServerlessV2EngineProperties extends SharedEngineProperties {
  /**
   * #### Name of the initial database.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: aurora-postgresql-serverless-v2
 *         properties:
 *           version: '16.6'
 *           dbName: appdb
 *           minCapacity: 0.5
 *           maxCapacity: 8
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'aurora-postgresql-serverless-v2',
 *       properties: {
 *         version: '16.6',
 *         dbName: 'appdb',
 *         minCapacity: 0.5,
 *         maxCapacity: 8
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default "defdb"
   */
  dbName?: string;
  /**
   * #### Minimum ACUs (0.5-128 in 0.5 increments). ~1 ACU ≈ 2 GB RAM.
   *
   * ---
   *
   * Set low (0.5) for dev/staging to minimize cost. The database scales up instantly under load.
   *
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: aurora-postgresql-serverless-v2
 *         properties:
 *           version: '16.6'
 *           minCapacity: 0.5
 *           maxCapacity: 8
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'aurora-postgresql-serverless-v2',
 *       properties: {
 *         version: '16.6',
 *         minCapacity: 0.5,
 *         maxCapacity: 8
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default 0.5
   */
  minCapacity?: number;
  /**
   * #### Maximum ACUs (0.5-128 in 0.5 increments). Caps your scaling and cost.
   *
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: aurora-postgresql-serverless-v2
 *         properties:
 *           version: '16.6'
 *           minCapacity: 0.5
 *           maxCapacity: 16
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'aurora-postgresql-serverless-v2',
 *       properties: {
 *         version: '16.6',
 *         minCapacity: 0.5,
 *         maxCapacity: 16
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default 10
   */
  maxCapacity?: number;
  /**
   * #### Number of reader instances in the Aurora Serverless v2 cluster.
   *
   * ---
   *
   * Aurora Serverless v2 always has one writer instance. This value adds additional readers
   * (`0` means writer only, `2` means writer + 2 readers).
   *
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: aurora-postgresql-serverless-v2
 *         properties:
 *           version: '16.6'
 *           minCapacity: 0.5
 *           maxCapacity: 16
 *           serverlessReadersCount: 2
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'aurora-postgresql-serverless-v2',
 *       properties: {
 *         version: '16.6',
 *         minCapacity: 0.5,
 *         maxCapacity: 16,
 *         serverlessReadersCount: 2
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default 0
   */
  serverlessReadersCount?: number;
}

interface AuroraEngineProperties extends SharedEngineProperties {
  /**
   * #### Name of the initial database.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: aurora-postgresql
 *         properties:
 *           version: '16.6'
 *           dbName: appdb
 *           instances:
 *             - instanceSize: db.r6g.large
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'aurora-postgresql',
 *       properties: {
 *         version: '16.6',
 *         dbName: 'appdb',
 *         instances: [{ instanceSize: 'db.r6g.large' }]
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   *
   * @default "defdb"
   */
  dbName?: string;
  /**
   * #### Port. Defaults: aurora-mysql 3306, aurora-postgresql 5432.
 *
 * ---
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: aurora-postgresql
 *         properties:
 *           version: '16.6'
 *           port: 5433
 *           instances:
 *             - instanceSize: db.r6g.large
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'aurora-postgresql',
 *       properties: {
 *         version: '16.6',
 *         port: 5433,
 *         instances: [{ instanceSize: 'db.r6g.large' }]
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  port?: number;
  /**
   * #### Cluster instances. First = primary (writer), rest = read replicas.
   *
   * ---
   *
   * Reads are load-balanced across all instances. If the primary fails,
   * a replica is automatically promoted (usually within 30 seconds).
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: aurora-postgresql
 *         properties:
 *           version: '16.6'
 *           instances:
 *             - instanceSize: db.r6g.large
 *             - instanceSize: db.r6g.large
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'aurora-postgresql',
 *       properties: {
 *         version: '16.6',
 *         instances: [
 *           { instanceSize: 'db.r6g.large' },
 *           { instanceSize: 'db.r6g.large' }
 *         ]
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
   */
  instances: AuroraEngineInstance[];
}

interface AuroraEngineInstance {
  /**
   * #### Instance size (e.g., `db.t4g.medium`, `db.r6g.large`).
   *
   * ---
   *
   * `t` family = burstable (dev/low-traffic). `r` family = memory-optimized (production).
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   mainDatabase:
 *     type: relational-database
 *     properties:
 *       credentials:
 *         masterUserPassword: $Secret('mainDatabase.password')
 *       engine:
 *         type: aurora-postgresql
 *         properties:
 *           version: '16.6'
 *           instances:
 *             - instanceSize: db.r6g.large
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { RelationalDatabase, defineConfig, $Secret } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const mainDatabase = new RelationalDatabase({
 *     credentials: { masterUserPassword: $Secret('mainDatabase.password') },
 *     engine: {
 *       type: 'aurora-postgresql',
 *       properties: {
 *         version: '16.6',
 *         instances: [
 *           { instanceSize: 'db.r6g.large' }
 *         ]
 *       }
 *     }
 *   });
 *   return { resources: { mainDatabase } };
 * });
 * ```
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
```
