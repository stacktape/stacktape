# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/mongo-db-atlas-clusters.d.ts
/**
 * #### MongoDB Atlas Cluster
 *
 * ---
 *
 * A fully managed MongoDB Atlas cluster that is automatically deployed to your AWS account and managed within your stack.
 */
interface MongoDbAtlasCluster {
  type: 'mongo-db-atlas-cluster';
  properties: MongoDbAtlasClusterProps;
}

interface MongoDbAtlasClusterProps {
  /**
   * #### The size of the disk, in GB.
   *
   * ---
   *
   * By default, all M10+ clusters automatically scale their storage. You can disable this behavior by configuring the `autoScaling` properties.
   *
   * > This property is not available for shared clusters (M2 and M5). For M10+ clusters, the default disk size depends on the instance size.
   * > For more details, see the [MongoDB Atlas documentation](https://docs.atlas.mongodb.com/reference/faq/storage/).
   */
  diskSizeGB?: number;
  /**
   * #### Configures the resources for each data-bearing node in the cluster.
   *
   * ---
   *
   * This includes memory, default storage, and IOPS specifications.
   * For a list of available cluster tiers, see the [MongoDB Atlas documentation](https://docs.atlas.mongodb.com/reference/amazon-aws/#cluster-configuration-options).
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
   * #### The major version of the MongoDB engine.
   *
   * ---
   *
   * Available versions are `5.0`, `6.0`, and `7.0`.
   *
   * @default 7.0
   */
  version?: '5.0' | '6.0' | '7.0';
  /**
   * #### The number of shards for the cluster.
   *
   * ---
   *
   * If you configure more than one shard, the cluster will run in sharded mode, which distributes data across multiple machines to enable horizontal scaling.
   * Sharded mode is only available for cluster tiers M30 and higher.
   *
   * For more details on sharding, see the [MongoDB documentation](https://www.mongodb.com/basics/sharding).
   *
   * @default 1
   */
  numShards?: number;
  /**
   * #### Configures additional nodes for your cluster.
   *
   * ---
   *
   * Increasing the number of nodes can lead to better redundancy and performance.
   * By default, each cluster has three data-bearing nodes that are electable to become the primary.
   */
  replication?: MongoDbReplication;
  /**
   * #### Enables backups for the cluster.
   *
   * ---
   *
   * Backups are copies of your data that provide a safety measure in the event of data loss.
   * The default snapshot time is every day at 18:00 UTC.
   * This feature is only available for M10+ clusters.
   *
   * Snapshots are also automatically taken for M2/M5 clusters but have different properties. For more details, see the [M2 and M5 backup documentation](https://docs.atlas.mongodb.com/backup-restore-cluster/#m2---m5-snapshots).
   *
   * MongoDB Cloud Backup incurs additional charges. For more details, see the [MongoDB Cloud Backup pricing documentation](https://docs.atlas.mongodb.com/billing/cluster-configuration-costs/#cloud-backups).
   */
  enableBackups?: boolean;
  /**
   * #### Enables point-in-time recovery.
   *
   * ---
   *
   * This feature enables Continuous Cloud Backups, which replay the oplog (a history of ordered logical writes) to allow you to restore a cluster to a specific point in time within the last 7 days.
   * It is only available for M10+ clusters and requires `enableBackups` to be `true`.
   *
   * Continuous Cloud Backup incurs additional charges. For more details, see the [MongoDB Continuous Cloud Backup pricing documentation](https://docs.atlas.mongodb.com/billing/cluster-configuration-costs/#continuous-cloud-backups).
   */
  enablePointInTimeRecovery?: boolean;
  /**
   * #### Configures the BI (Business Intelligence) Connector.
   *
   * ---
   *
   * The BI Connector allows SQL-based access to your data but can be CPU and memory-intensive.
   * Enabling the BI Connector on `M10` and `M20` cluster tiers may cause performance degradation.
   */
  biConnector?: MongoDbBiConnector;
  /**
   * #### Configures the scaling behavior of the cluster.
   *
   * ---
   *
   * You can configure your cluster to automatically scale its tier, storage capacity, or both, based on usage.
   * To control costs, you can select a range of cluster tiers to which your cluster can scale.
   *
   * A cluster is scaled **up** (to the next tier) if:
   * - Average CPU utilization has exceeded 75% for the past hour.
   * - Memory utilization has exceeded 75% for the past hour.
   *
   * A cluster is scaled **down** (to a lower tier) if:
   * - The average CPU and memory utilization over the past 24 hours is below 50%.
   * - The cluster has not been scaled down (manually or automatically) in the past 24 hours.
   */
  autoScaling?: MongoDbAutoScaling;
  /**
   * #### Creates and configures a MongoDB Atlas `atlasAdmin` user.
   *
   * ---
   *
   * This allows you to create an admin user with [administrative access privileges](https://docs.atlas.mongodb.com/security-add-mongodb-users/#mongodb-atlasrole-Atlas-admin).
   *
   * While not required for accessing the cluster from your compute resources, creating an admin user is useful for performing administrative tasks or connecting to the cluster from a local machine.
   */
  adminUserCredentials?: MongoDbAdminUserCredentials;
}

interface MongoDbReplication {
  /**
   * #### The number of analytics nodes.
   *
   * ---
   *
   * Analytics nodes are read-only nodes designed for long-running queries.
   * Using analytics nodes avoids impacting the performance of your operational compute resources.
   * They work well with the `biConnector` when the read preference is set to `analytics`.
   */
  numAnalyticsNodes?: number;
  /**
   * #### The number of electable nodes.
   *
   * ---
   *
   * Electable nodes can become the primary node, and adding more improves the redundancy and availability of the cluster.
   *
   * @default 3
   */
  numElectableNodes?: 3 | 5 | 7;
  /**
   * #### The number of read-only nodes.
   */
  numReadOnlyNodes?: number;
}

interface MongoDbBiConnector {
  /**
   * #### Configures the type of node to which the BI Connector will connect.
   */
  readPreference?: 'primary' | 'secondary' | 'analytics';
  /**
   * #### Enables the BI Connector.
   *
   * @default false
   */
  enabled: boolean;
}

interface MongoDbAutoScaling {
  /**
   * #### The minimum cluster tier to scale down to.
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
   * #### The maximum cluster tier to scale up to.
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
   * #### Disables disk size scaling.
   *
   * ---
   *
   * When disk scaling is enabled, cluster storage automatically increases when disk space usage reaches 90%, aiming for 70% disk utilization.
   * Cluster storage is never automatically scaled down.
   */
  disableDiskScaling?: boolean;
  /**
   * #### Disables the scale-down of the cluster tier.
   *
   * ---
   *
   * When scale-down is disabled, the cluster can only scale up to a higher tier.
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
   * #### Configures the accessibility mode for this database.
   *
   * ---
   *
   * The following modes are supported:
   *
   * - **`internet`**: The least restrictive mode. The database can be accessed from anywhere on the internet.
   * - **`vpc`**: The database can only be accessed from resources within your VPC. This includes any [function](https://docs.stacktape.com/compute-resources/lambda-functions) (with `joinDefaultVpc: true`), [batch job](https://docs.stacktape.com/compute-resources/batch-jobs), or [container workload](https://docs.stacktape.com/compute-resources/multi-container-workloads) in your stack, provided they have the required credentials. IP addresses configured in `whitelistedIps` can also access the database.
   * - **`scoping-workloads-in-vpc`**: Similar to `vpc` mode, but more restrictive. In addition to being in the same VPC, resources must have the necessary security group permissions to access the cluster. For functions, batch jobs, and container services, these permissions can be granted using the `connectTo` property in their respective configurations. IP addresses configured in `whitelistedIps` can also access the cluster.
   * - **`whitelisted-ips-only`**: The cluster can only be accessed from the IP addresses and CIDR blocks listed in `whitelistedIps`.
   *
   * To learn more about VPCs, see the [VPC documentation](https://docs.stacktape.com/user-guides/vpcs/).
   *
   * @default internet
   */
  accessibilityMode: 'internet' | 'vpc' | 'scoping-workloads-in-vpc' | 'whitelisted-ips-only';
  /**
   * #### A list of IP addresses or IP ranges (in CIDR format) that are allowed to access the cluster.
   *
   * ---
   *
   * The behavior of this property varies based on the `accessibilityMode`:
   * - **`internet`**: This property has no effect, as the database is accessible from anywhere.
   * - **`vpc`** and **`scoping-workloads-in-vpc`**: These IP addresses can be used to allow access from specific locations outside of the VPC (e.g., your office IP address).
   * - **`whitelisted-ips-only`**: These are the only addresses that can access the database.
   */
  whitelistedIps?: string[];
}

type MongoDbAtlasClusterReferencableParam = 'connectionString';
```