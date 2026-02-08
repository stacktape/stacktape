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
   */
  diskSizeGB?: number;
  /**
   * #### Instance size. M2/M5 = shared (cheapest). M10+ = dedicated (more features, auto-scaling, backups).
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
   * @default "7.0"
   */
  version?: '5.0' | '6.0' | '7.0';
  /**
   * #### Number of shards. More than 1 enables sharded mode for horizontal scaling. Requires M30+.
   * @default 1
   */
  numShards?: number;
  /**
   * #### Node count configuration: electable, read-only, and analytics nodes. Default: 3 electable nodes.
   */
  replication?: MongoDbReplication;
  /**
   * #### Enable daily snapshots (18:00 UTC). M10+ only — M2/M5 get automatic snapshots with different rules.
   */
  enableBackups?: boolean;
  /**
   * #### Restore to any second within the last 7 days. Requires `enableBackups: true` and M10+.
   */
  enablePointInTimeRecovery?: boolean;
  /**
   * #### BI Connector for SQL-based access to MongoDB data. CPU-intensive — may degrade M10/M20 performance.
   */
  biConnector?: MongoDbBiConnector;
  /**
   * #### Auto-scale tier and/or storage based on CPU/memory usage. Set min/max tier to control costs.
   *
   * ---
   *
   * Scales up when CPU or memory exceeds 75% for 1 hour. Scales down when both are below 50% for 24 hours.
   */
  autoScaling?: MongoDbAutoScaling;
  /**
   * #### Admin user for direct database access (e.g., from your local machine or admin tools).
   *
   * ---
   *
   * Not required for app-to-database access via `connectTo` — that's handled automatically.
   */
  adminUserCredentials?: MongoDbAdminUserCredentials;
}

interface MongoDbReplication {
  /**
   * #### Read-only nodes for long-running analytics queries. Prevents impact on primary workload performance.
   */
  numAnalyticsNodes?: number;
  /**
   * #### Nodes that can become primary. More = better redundancy. Must be odd.
   * @default 3
   */
  numElectableNodes?: 3 | 5 | 7;
  /**
   * #### Read-only replica nodes for scaling read throughput.
   */
  numReadOnlyNodes?: number;
}

interface MongoDbBiConnector {
  /**
   * #### Which node type the BI Connector reads from. Use `analytics` to avoid impacting production queries.
   */
  readPreference?: 'primary' | 'secondary' | 'analytics';
  /**
   * #### Enable the BI Connector for SQL-based access.
   * @default false
   */
  enabled: boolean;
}

interface MongoDbAutoScaling {
  /**
   * #### Lowest tier the cluster can scale down to. Prevents unexpected cost increases from always scaling up.
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
   */
  disableDiskScaling?: boolean;
  /**
   * #### Prevent automatic scale-down. The cluster can only scale up, never back down to a smaller tier.
   */
  disableScaleDown?: boolean;
}

interface MongoDbAdminUserCredentials {
  /**
   * #### Name of the admin user
   */
  userName: string;
  /**
   * #### Password for the admin user
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
   */
  whitelistedIps?: string[];
}

type MongoDbAtlasClusterReferencableParam = 'connectionString';
