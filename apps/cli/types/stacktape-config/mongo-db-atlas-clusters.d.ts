/**
 * #### Managed MongoDB database (Atlas) deployed into your AWS account and managed within your stack.
 *
 * ---
 *
 * Document database with flexible schemas — great for content management, user profiles, catalogs, and apps
 * where your data model evolves. Starts at M2 (shared, ~$9/month) or M10 (dedicated, ~$57/month).
 */
interface MongoDbAtlasCluster {
  type: 'mongo-db-atlas-cluster';
  properties: MongoDbAtlasClusterProps;
}

interface MongoDbAtlasClusterProps {
  /**
   * #### Disk size in GB. Not available for shared tiers (M2/M5). M10+ auto-scales storage by default.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ordersDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       # stp-focus
   *       diskSizeGB: 40
   *       # stp-end-focus
   *       enableBackups: true
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - ordersDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ordersDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     // stp-focus
   *     diskSizeGB: 40,
   *     // stp-end-focus
   *     enableBackups: true
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [ordersDb]
   *   });
   *   return { resources: { ordersDb, api } };
   * });
   * ```
   */
  diskSizeGB?: number;
  /**
   * #### Instance size. M2/M5 = shared (cheapest). M10+ = dedicated (more features, auto-scaling, backups).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   appDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       # stp-focus
   *       clusterTier: M20
   *       # stp-end-focus
   *       version: '7.0'
   *       enableBackups: true
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - appDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appDb = new MongoDbAtlasCluster({
   *     // stp-focus
   *     clusterTier: 'M20',
   *     // stp-end-focus
   *     version: '7.0',
   *     enableBackups: true
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [appDb]
   *   });
   *   return { resources: { appDb, api } };
   * });
   * ```
   */
  clusterTier:
    | 'M2'
    | 'M5'
    | 'M10'
    | 'M20'
    | 'M30'
    | 'M40'
    | 'M40 Low-CPU (R40)'
    | 'M40_NVME'
    | 'M50'
    | 'M50 Low-CPU (R50)'
    | 'M50_NVME'
    | 'M60'
    | 'M60 Low-CPU (R60)'
    | 'M60_NVME'
    | 'M80'
    | 'M80 Low-CPU (R80)'
    | 'M80_NVME'
    | 'M100'
    | 'M140'
    | 'M200'
    | 'M200 Low-CPU (R200)'
    | 'M200_NVME'
    | 'M300'
    | 'M300 Low-CPU (R300)'
    | 'M400'
    | 'M400 Low-CPU (R400)'
    | 'M400_NVME'
    | 'M700'
    | 'M700 Low-CPU (R700)';
  /**
   * #### MongoDB engine version.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   contentDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       # stp-focus
   *       version: '6.0'
   *       # stp-end-focus
   *       enableBackups: true
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - contentDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const contentDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     // stp-focus
   *     version: '6.0',
   *     // stp-end-focus
   *     enableBackups: true
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [contentDb]
   *   });
   *   return { resources: { contentDb, api } };
   * });
   * ```
   *
   * @default "7.0"
   */
  version?: '5.0' | '6.0' | '7.0';
  /**
   * #### Number of shards. More than 1 enables sharded mode for horizontal scaling. Requires M30+.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   shardedDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M30
   *       version: '7.0'
   *       # stp-focus
   *       numShards: 2
   *       # stp-end-focus
   *       enableBackups: true
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - shardedDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const shardedDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M30',
   *     version: '7.0',
   *     // stp-focus
   *     numShards: 2,
   *     // stp-end-focus
   *     enableBackups: true
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [shardedDb]
   *   });
   *   return { resources: { shardedDb, api } };
   * });
   * ```
   *
   * @default 1
   */
  numShards?: number;
  /**
   * #### Node count configuration: electable, read-only, and analytics nodes. Default: 3 electable nodes.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   analyticsDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M30
   *       version: '7.0'
   *       # stp-focus
   *       replication:
   *         numElectableNodes: 3
   *         numReadOnlyNodes: 2
   *         numAnalyticsNodes: 1
   *       # stp-end-focus
   *       enableBackups: true
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - analyticsDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const analyticsDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M30',
   *     version: '7.0',
   *     // stp-focus
   *     replication: {
   *       numElectableNodes: 3,
   *       numReadOnlyNodes: 2,
   *       numAnalyticsNodes: 1
   *     },
   *     // stp-end-focus
   *     enableBackups: true
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [analyticsDb]
   *   });
   *   return { resources: { analyticsDb, api } };
   * });
   * ```
   */
  replication?: MongoDbReplication;
  /**
   * #### Enable daily snapshots (18:00 UTC). M10+ only — M2/M5 get automatic snapshots with different rules.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   paymentsDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       # stp-focus
   *       enableBackups: true
   *       # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - paymentsDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const paymentsDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     // stp-focus
   *     enableBackups: true
   *     // stp-end-focus
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [paymentsDb]
   *   });
   *   return { resources: { paymentsDb, api } };
   * });
   * ```
   */
  enableBackups?: boolean;
  /**
   * #### Restore to any second within the last 7 days. Requires `enableBackups: true` and M10+.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ledgerDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       enableBackups: true
   *       # stp-focus
   *       enablePointInTimeRecovery: true
   *       # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - ledgerDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ledgerDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     enableBackups: true,
   *     // stp-focus
   *     enablePointInTimeRecovery: true
   *     // stp-end-focus
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [ledgerDb]
   *   });
   *   return { resources: { ledgerDb, api } };
   * });
   * ```
   */
  enablePointInTimeRecovery?: boolean;
  /**
   * #### BI Connector for SQL-based access to MongoDB data. CPU-intensive — may degrade M10/M20 performance.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   reportingDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M30
   *       version: '7.0'
   *       enableBackups: true
   *       replication:
   *         numElectableNodes: 3
   *         numAnalyticsNodes: 1
   *       # stp-focus
   *       biConnector:
   *         enabled: true
   *         readPreference: analytics
   *       # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - reportingDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const reportingDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M30',
   *     version: '7.0',
   *     enableBackups: true,
   *     replication: {
   *       numElectableNodes: 3,
   *       numAnalyticsNodes: 1
   *     },
   *     // stp-focus
   *     biConnector: {
   *       enabled: true,
   *       readPreference: 'analytics'
   *     }
   *     // stp-end-focus
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [reportingDb]
   *   });
   *   return { resources: { reportingDb, api } };
   * });
   * ```
   */
  biConnector?: MongoDbBiConnector;
  /**
   * #### Auto-scale tier and/or storage based on CPU/memory usage. Set min/max tier to control costs.
   *
   * ---
   *
   * Scales up when CPU or memory exceeds 75% for 1 hour. Scales down when both are below 50% for 24 hours.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   scalingDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       enableBackups: true
   *       # stp-focus
   *       autoScaling:
   *         minClusterTier: M10
   *         maxClusterTier: M40
   *       # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - scalingDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const scalingDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     enableBackups: true,
   *     // stp-focus
   *     autoScaling: {
   *       minClusterTier: 'M10',
   *       maxClusterTier: 'M40'
   *     }
   *     // stp-end-focus
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [scalingDb]
   *   });
   *   return { resources: { scalingDb, api } };
   * });
   * ```
   */
  autoScaling?: MongoDbAutoScaling;
  /**
   * #### Admin user for direct database access (e.g., from your local machine or admin tools).
   *
   * ---
   *
   * Not required for app-to-database access via `connectTo` — that's handled automatically.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   primaryDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       enableBackups: true
   *       # stp-focus
   *       adminUserCredentials:
   *         userName: dbadmin
   *         password: $Secret('mongo-admin-password')
   *       # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - primaryDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const primaryDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     enableBackups: true,
   *     // stp-focus
   *     adminUserCredentials: {
   *       userName: 'dbadmin',
   *       password: $Secret('mongo-admin-password')
   *     }
   *     // stp-end-focus
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [primaryDb]
   *   });
   *   return { resources: { primaryDb, api } };
   * });
   * ```
   */
  adminUserCredentials?: MongoDbAdminUserCredentials;
}

interface MongoDbReplication {
  /**
   * #### Read-only nodes for long-running analytics queries. Prevents impact on primary workload performance.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   warehouseDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M30
   *       version: '7.0'
   *       enableBackups: true
   *       replication:
   *         numElectableNodes: 3
   *         # stp-focus
   *         numAnalyticsNodes: 2
   *         # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - warehouseDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const warehouseDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M30',
   *     version: '7.0',
   *     enableBackups: true,
   *     replication: {
   *       numElectableNodes: 3,
   *       // stp-focus
   *       numAnalyticsNodes: 2
   *       // stp-end-focus
   *     }
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [warehouseDb]
   *   });
   *   return { resources: { warehouseDb, api } };
   * });
   * ```
   */
  numAnalyticsNodes?: number;
  /**
   * #### Nodes that can become primary. More = better redundancy. Must be odd.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   haDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M30
   *       version: '7.0'
   *       enableBackups: true
   *       replication:
   *         # stp-focus
   *         numElectableNodes: 5
   *         # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - haDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const haDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M30',
   *     version: '7.0',
   *     enableBackups: true,
   *     replication: {
   *       // stp-focus
   *       numElectableNodes: 5
   *       // stp-end-focus
   *     }
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [haDb]
   *   });
   *   return { resources: { haDb, api } };
   * });
   * ```
   *
   * @default 3
   */
  numElectableNodes?: 3 | 5 | 7;
  /**
   * #### Read-only replica nodes for scaling read throughput.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   readScaleDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M30
   *       version: '7.0'
   *       enableBackups: true
   *       replication:
   *         numElectableNodes: 3
   *         # stp-focus
   *         numReadOnlyNodes: 3
   *         # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - readScaleDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const readScaleDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M30',
   *     version: '7.0',
   *     enableBackups: true,
   *     replication: {
   *       numElectableNodes: 3,
   *       // stp-focus
   *       numReadOnlyNodes: 3
   *       // stp-end-focus
   *     }
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [readScaleDb]
   *   });
   *   return { resources: { readScaleDb, api } };
   * });
   * ```
   */
  numReadOnlyNodes?: number;
}

interface MongoDbBiConnector {
  /**
   * #### Which node type the BI Connector reads from. Use `analytics` to avoid impacting production queries.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   biDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M30
   *       version: '7.0'
   *       enableBackups: true
   *       replication:
   *         numElectableNodes: 3
   *         numAnalyticsNodes: 1
   *       biConnector:
   *         enabled: true
   *         # stp-focus
   *         readPreference: secondary
   *         # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - biDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const biDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M30',
   *     version: '7.0',
   *     enableBackups: true,
   *     replication: {
   *       numElectableNodes: 3,
   *       numAnalyticsNodes: 1
   *     },
   *     biConnector: {
   *       enabled: true,
   *       // stp-focus
   *       readPreference: 'secondary'
   *       // stp-end-focus
   *     }
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [biDb]
   *   });
   *   return { resources: { biDb, api } };
   * });
   * ```
   */
  readPreference?: 'primary' | 'secondary' | 'analytics';
  /**
   * #### Enable the BI Connector for SQL-based access.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   sqlAccessDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M30
   *       version: '7.0'
   *       enableBackups: true
   *       replication:
   *         numElectableNodes: 3
   *         numAnalyticsNodes: 1
   *       biConnector:
   *         # stp-focus
   *         enabled: true
   *         # stp-end-focus
   *         readPreference: analytics
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - sqlAccessDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sqlAccessDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M30',
   *     version: '7.0',
   *     enableBackups: true,
   *     replication: {
   *       numElectableNodes: 3,
   *       numAnalyticsNodes: 1
   *     },
   *     biConnector: {
   *       // stp-focus
   *       enabled: true,
   *       // stp-end-focus
   *       readPreference: 'analytics'
   *     }
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [sqlAccessDb]
   *   });
   *   return { resources: { sqlAccessDb, api } };
   * });
   * ```
   *
   * @default false
   */
  enabled: boolean;
}

interface MongoDbAutoScaling {
  /**
   * #### Lowest tier the cluster can scale down to. Prevents unexpected cost increases from always scaling up.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   floorDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M20
   *       version: '7.0'
   *       enableBackups: true
   *       autoScaling:
   *         # stp-focus
   *         minClusterTier: M20
   *         # stp-end-focus
   *         maxClusterTier: M50
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - floorDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const floorDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M20',
   *     version: '7.0',
   *     enableBackups: true,
   *     autoScaling: {
   *       // stp-focus
   *       minClusterTier: 'M20',
   *       // stp-end-focus
   *       maxClusterTier: 'M50'
   *     }
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [floorDb]
   *   });
   *   return { resources: { floorDb, api } };
   * });
   * ```
   */
  minClusterTier?:
    | 'M10'
    | 'M20'
    | 'M30'
    | 'M40'
    | 'M40 Low-CPU (R40)'
    | 'M40_NVME'
    | 'M50'
    | 'M50 Low-CPU (R50)'
    | 'M50_NVME'
    | 'M60'
    | 'M60 Low-CPU (R60)'
    | 'M60_NVME'
    | 'M80'
    | 'M80 Low-CPU (R80)'
    | 'M80_NVME'
    | 'M100'
    | 'M140'
    | 'M200'
    | 'M200 Low-CPU (R200)'
    | 'M200_NVME'
    | 'M300'
    | 'M300 Low-CPU (R300)'
    | 'M400 Low-CPU (R400)'
    | 'M400_NVME'
    | 'M700 Low-CPU (R700)';
  /**
   * #### Highest tier the cluster can scale up to. Set a ceiling to control maximum costs.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   ceilingDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       enableBackups: true
   *       autoScaling:
   *         minClusterTier: M10
   *         # stp-focus
   *         maxClusterTier: M30
   *         # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - ceilingDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const ceilingDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     enableBackups: true,
   *     autoScaling: {
   *       minClusterTier: 'M10',
   *       // stp-focus
   *       maxClusterTier: 'M30'
   *       // stp-end-focus
   *     }
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [ceilingDb]
   *   });
   *   return { resources: { ceilingDb, api } };
   * });
   * ```
   */
  maxClusterTier?:
    | 'M10'
    | 'M20'
    | 'M30'
    | 'M40'
    | 'M40 Low-CPU (R40)'
    | 'M40_NVME'
    | 'M50'
    | 'M50 Low-CPU (R50)'
    | 'M50_NVME'
    | 'M60'
    | 'M60 Low-CPU (R60)'
    | 'M60_NVME'
    | 'M80'
    | 'M80 Low-CPU (R80)'
    | 'M80_NVME'
    | 'M100'
    | 'M140'
    | 'M200'
    | 'M200 Low-CPU (R200)'
    | 'M200_NVME'
    | 'M300'
    | 'M300 Low-CPU (R300)'
    | 'M400 Low-CPU (R400)'
    | 'M400_NVME'
    | 'M700 Low-CPU (R700)';
  /**
   * #### Prevent automatic disk expansion. By default, storage grows when usage hits 90%. Storage never scales down.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   fixedDiskDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       diskSizeGB: 80
   *       enableBackups: true
   *       autoScaling:
   *         minClusterTier: M10
   *         maxClusterTier: M40
   *         # stp-focus
   *         disableDiskScaling: true
   *         # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - fixedDiskDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const fixedDiskDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     diskSizeGB: 80,
   *     enableBackups: true,
   *     autoScaling: {
   *       minClusterTier: 'M10',
   *       maxClusterTier: 'M40',
   *       // stp-focus
   *       disableDiskScaling: true
   *       // stp-end-focus
   *     }
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [fixedDiskDb]
   *   });
   *   return { resources: { fixedDiskDb, api } };
   * });
   * ```
   */
  disableDiskScaling?: boolean;
  /**
   * #### Prevent automatic scale-down. The cluster can only scale up, never back down to a smaller tier.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   scaleUpOnlyDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       enableBackups: true
   *       autoScaling:
   *         minClusterTier: M10
   *         maxClusterTier: M40
   *         # stp-focus
   *         disableScaleDown: true
   *         # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - scaleUpOnlyDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const scaleUpOnlyDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     enableBackups: true,
   *     autoScaling: {
   *       minClusterTier: 'M10',
   *       maxClusterTier: 'M40',
   *       // stp-focus
   *       disableScaleDown: true
   *       // stp-end-focus
   *     }
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [scaleUpOnlyDb]
   *   });
   *   return { resources: { scaleUpOnlyDb, api } };
   * });
   * ```
   */
  disableScaleDown?: boolean;
}

interface MongoDbAdminUserCredentials {
  /**
   * #### Name of the admin user
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   adminDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       enableBackups: true
   *       adminUserCredentials:
   *         # stp-focus
   *         userName: opsadmin
   *         # stp-end-focus
   *         password: $Secret('mongo-admin-password')
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - adminDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const adminDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     enableBackups: true,
   *     adminUserCredentials: {
   *       // stp-focus
   *       userName: 'opsadmin',
   *       // stp-end-focus
   *       password: $Secret('mongo-admin-password')
   *     }
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [adminDb]
   *   });
   *   return { resources: { adminDb, api } };
   * });
   * ```
   */
  userName: string;
  /**
   * #### Password for the admin user
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   securedDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       enableBackups: true
   *       adminUserCredentials:
   *         userName: dbadmin
   *         # stp-focus
   *         password: $Secret('mongo-admin-password')
   *         # stp-end-focus
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       connectTo:
   *         - securedDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const securedDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     enableBackups: true,
   *     adminUserCredentials: {
   *       userName: 'dbadmin',
   *       // stp-focus
   *       password: $Secret('mongo-admin-password')
   *       // stp-end-focus
   *     }
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     connectTo: [securedDb]
   *   });
   *   return { resources: { securedDb, api } };
   * });
   * ```
   */
  password: string;
}

type StpMongoDbAtlasCluster = MongoDbAtlasCluster['properties'] & {
  name: string;
  type: MongoDbAtlasCluster['type'];
  configParentResourceType: MongoDbAtlasCluster['type'];
  nameChain: string[];
};

type StpAtlasMongoSharedTierClusterInstanceSize = Subtype<MongoDbAtlasClusterProps['clusterTier'], 'M2' | 'M5'>;
type StpAtlasMongoGeneralTierClusterInstanceSize = Subtype<
  MongoDbAtlasClusterProps['clusterTier'],
  | 'M10'
  | 'M20'
  | 'M30'
  | 'M40'
  | 'M40 Low-CPU (R40)'
  | 'M40_NVME'
  | 'M50'
  | 'M50 Low-CPU (R50)'
  | 'M50_NVME'
  | 'M60'
  | 'M60 Low-CPU (R60)'
  | 'M60_NVME'
  | 'M80'
  | 'M80 Low-CPU (R80)'
  | 'M80_NVME'
  | 'M100'
  | 'M140'
  | 'M200'
  | 'M200 Low-CPU (R200)'
  | 'M200_NVME'
  | 'M300'
  | 'M300 Low-CPU (R300)'
  | 'M400 Low-CPU (R400)'
  | 'M400_NVME'
  | 'M700 Low-CPU (R700)'
>;

interface MongoDbAtlasAccessibility {
  /**
   * #### Network access mode.
   *
   * ---
   *
   * - **`internet`**: Accessible from anywhere (credentials still required).
   * - **`vpc`**: Only from resources in your VPC + any `whitelistedIps`.
   * - **`scoping-workloads-in-vpc`**: Like `vpc`, but also requires security-group access via `connectTo`.
   * - **`whitelisted-ips-only`**: Only from IP addresses listed in `whitelistedIps`.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * providerConfig:
   *   mongoDbAtlas:
   *     organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e
   *     publicKey: abcdefgh
   *     privateKey: $Secret('mongo-atlas-private-key')
   *     accessibility:
   *       # stp-focus
   *       accessibilityMode: scoping-workloads-in-vpc
   *       # stp-end-focus
   * resources:
   *   appDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       enableBackups: true
   *   api:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/index.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - appDb
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, LambdaFunction, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     enableBackups: true
   *   });
   *   const api = new LambdaFunction({
   *     packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'src/index.ts' } },
   *     joinDefaultVpc: true,
   *     connectTo: [appDb]
   *   });
   *   return {
   *     providerConfig: {
   *       mongoDbAtlas: {
   *         organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e',
   *         publicKey: 'abcdefgh',
   *         privateKey: $Secret('mongo-atlas-private-key'),
   *         accessibility: {
   *           // stp-focus
   *           accessibilityMode: 'scoping-workloads-in-vpc'
   *           // stp-end-focus
   *         }
   *       }
   *     },
   *     resources: { appDb, api }
   *   };
   * });
   * ```
   *
   * @default internet
   */
  accessibilityMode: 'internet' | 'vpc' | 'scoping-workloads-in-vpc' | 'whitelisted-ips-only';
  /**
   * #### IP addresses or CIDR ranges allowed to access the cluster (e.g., your office IP).
   *
   * ---
   *
   * No effect in `internet` mode. In `vpc`/`scoping-workloads-in-vpc`, adds access for IPs outside the VPC.
   * In `whitelisted-ips-only`, these are the only IPs that can connect.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * providerConfig:
   *   mongoDbAtlas:
   *     organizationId: 5f1a2b3c4d5e6f7a8b9c0d1e
   *     publicKey: abcdefgh
   *     privateKey: $Secret('mongo-atlas-private-key')
   *     accessibility:
   *       accessibilityMode: whitelisted-ips-only
   *       # stp-focus
   *       whitelistedIps:
   *         - 203.0.113.10
   *         - 198.51.100.0/24
   *       # stp-end-focus
   * resources:
   *   appDb:
   *     type: mongo-db-atlas-cluster
   *     properties:
   *       clusterTier: M10
   *       version: '7.0'
   *       enableBackups: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { MongoDbAtlasCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const appDb = new MongoDbAtlasCluster({
   *     clusterTier: 'M10',
   *     version: '7.0',
   *     enableBackups: true
   *   });
   *   return {
   *     providerConfig: {
   *       mongoDbAtlas: {
   *         organizationId: '5f1a2b3c4d5e6f7a8b9c0d1e',
   *         publicKey: 'abcdefgh',
   *         privateKey: $Secret('mongo-atlas-private-key'),
   *         accessibility: {
   *           accessibilityMode: 'whitelisted-ips-only',
   *           // stp-focus
   *           whitelistedIps: ['203.0.113.10', '198.51.100.0/24']
   *           // stp-end-focus
   *         }
   *       }
   *     },
   *     resources: { appDb }
   *   };
   * });
   * ```
   */
  whitelistedIps?: string[];
}

type MongoDbAtlasClusterReferencableParam = 'connectionString';
