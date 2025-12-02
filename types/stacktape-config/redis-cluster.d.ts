/**
 * #### Redis cluster
 *
 * ---
 *
 * A fully managed, Redis-compatible in-memory data store with sub-millisecond latency.
 */
interface RedisCluster {
  type: 'redis-cluster';
  properties: RedisClusterProps;
  overrides?: ResourceOverrides;
}

type StpRedisCluster = RedisCluster['properties'] & {
  name: string;
  type: RedisCluster['type'];
  configParentResourceType: RedisCluster['type'];
  nameChain: string[];
};

interface RedisClusterProps {
  /**
   * #### Enables sharding for the cluster.
   *
   * ---
   *
   * Sharding allows you to scale your Redis cluster horizontally by splitting the data across multiple shards.
   * Each shard is managed by its own cluster, which includes a primary instance and a specified number of replicas.
   * You can increase or decrease the number of shards without interrupting the cluster.
   * Routing and re-balancing are handled automatically by AWS.
   *
   * > **Limitations:**
   * > - Sharding can only be enabled when the cluster is first created.
   * > - You cannot change the number of replica nodes (`numReplicaNodes`) after a sharded cluster has been created.
   * > - `numReplicaNodes` must be at least `1` for sharded clusters.
   *
   * For more details, see the [AWS documentation](https://docs.stacktape.com/resources/redis-clusters/#sharded-cluster).
   */
  enableSharding?: boolean;
  /**
   * #### The number of shards for the cluster.
   *
   * ---
   *
   * This property is only effective when `enableSharding` is `true`.
   *
   * @default 1
   */
  numShards?: number;
  /**
   * #### The number of replica nodes in the cluster.
   *
   * ---
   *
   * Adding replica nodes (read replicas) provides two main benefits:
   * 1.  **Increased read throughput:** Read requests are distributed across the replicas.
   * 2.  **Increased availability:** If the primary node fails, a replica can be promoted to take its place.
   *
   * Load balancing between replicas is handled automatically by AWS.
   * For sharded clusters, this property specifies the number of replicas for each shard.
   *
   * > **Note:** You cannot change this value for a sharded cluster after it has been created.
   *
   * @default 0
   */
  numReplicaNodes?: number;
  /**
   * #### Enables automatic failover of the cluster's primary instance.
   *
   * ---
   *
   * When enabled, a replica will automatically be promoted to primary if the original primary node fails.
   * `numReplicaNodes` must be at least `1` to use this feature.
   * On sharded clusters, automatic failover is always enabled and cannot be disabled.
   *
   * > **Important:** If you want to enable automatic failover, you must first deploy the cluster with at least one replica, and then enable failover in a subsequent deployment.
   * > Similarly, to disable automatic failover, you must first disable it and then remove the replicas in a separate deployment.
   */
  enableAutomaticFailover?: boolean;
  /**
   * #### The instance size for every node in the cluster.
   *
   * ---
   *
   * This applies to both primary and replica nodes.
   * Different instance sizes offer varying amounts of memory and network performance.
   * You can change the instance size without interrupting the cluster or losing data.
   *
   * For a detailed list of available instance types, see the [AWS pricing page](https://aws.amazon.com/elasticache/pricing/).
   */
  instanceSize:
    | 'cache.t3.micro'
    | 'cache.t3.small'
    | 'cache.t3.medium'
    | 'cache.t4g.micro'
    | 'cache.t4g.small'
    | 'cache.t4g.medium'
    | 'cache.m6g.large'
    | 'cache.m6g.xlarge'
    | 'cache.m6g.2xlarge'
    | 'cache.m6g.4xlarge'
    | 'cache.m6g.8xlarge'
    | 'cache.m6g.12xlarge'
    | 'cache.m6g.16xlarge'
    | 'cache.m7g.large'
    | 'cache.m7g.xlarge'
    | 'cache.m7g.2xlarge'
    | 'cache.m7g.4xlarge'
    | 'cache.m7g.8xlarge'
    | 'cache.m7g.12xlarge'
    | 'cache.m7g.16xlarge'
    | 'cache.m5.large'
    | 'cache.m5.xlarge'
    | 'cache.m5.2xlarge'
    | 'cache.m5.4xlarge'
    | 'cache.m5.12xlarge'
    | 'cache.m5.24xlarge'
    | 'cache.m4.large'
    | 'cache.m4.xlarge'
    | 'cache.m4.2xlarge'
    | 'cache.m4.4xlarge'
    | 'cache.m4.10xlarge'
    | 'cache.t2.micro'
    | 'cache.t2.small'
    | 'cache.t2.medium'
    | 'cache.r6g.large'
    | 'cache.r6g.xlarge'
    | 'cache.r6g.2xlarge'
    | 'cache.r6g.4xlarge'
    | 'cache.r6g.8xlarge'
    | 'cache.r6g.12xlarge'
    | 'cache.r6g.16xlarge'
    | 'cache.r7g.large'
    | 'cache.r7g.xlarge'
    | 'cache.r7g.2xlarge'
    | 'cache.r7g.4xlarge'
    | 'cache.r7g.8xlarge'
    | 'cache.r7g.12xlarge'
    | 'cache.r7g.16xlarge'
    | 'cache.r5.large'
    | 'cache.r5.xlarge'
    | 'cache.r5.2xlarge'
    | 'cache.r5.4xlarge'
    | 'cache.r5.12xlarge'
    | 'cache.r5.24xlarge'
    | 'cache.r4.large'
    | 'cache.r4.xlarge'
    | 'cache.r4.2xlarge'
    | 'cache.r4.4xlarge'
    | 'cache.r4.8xlarge'
    | 'cache.r4.16xlarge';
  /**
   * #### Configures the logging behavior and format.
   *
   * ---
   *
   * The [slow log](https://redis.io/commands/slowlog) is sent to a dedicated CloudWatch log group.
   * By default, logs are retained for 180 days.
   *
   * You can access your logs in two ways:
   * 1.  **AWS CloudWatch Console:** Use the `stacktape stack-info` command to get a direct link to the log group.
   * 2.  **Stacktape CLI:** Use the [`stacktape logs` command](https://docs.stacktape.com/cli/commands/logs/) to view logs in your terminal.
   */
  logging?: RedisLogging;
  /**
   * #### The retention period for automated backups, in days.
   *
   * ---
   *
   * - When set to `0`, automatic backups are disabled.
   * - This retention period does not apply to manual backups created in the AWS console or via the API.
   *
   * @default 0
   */
  automatedBackupRetentionDays?: number;
  /**
   * #### The port on which the Redis cluster will listen for connections.
   *
   * @default 6379
   */
  port?: number;
  /**
   * #### The password for the default cluster user.
   *
   * ---
   *
   * Redis clusters are password-protected, and all communication is encrypted in transit.
   * It is recommended to use [secrets](/resources/secrets/) to manage this password instead of hardcoding it.
   *
   * **Password Constraints:**
   * - Must contain only printable ASCII characters.
   * - Must be between 16 and 128 characters long.
   * - Cannot contain the following characters: `/`, `"`, or `@`.
   */
  defaultUserPassword: string;
  /**
   * #### Configures which resources and hosts can access your cluster.
   */
  accessibility?: RedisAccessibility;
  /**
   * #### The Redis engine version to use.
   *
   * ---
   *
   * @default 6.2
   */
  engineVersion?: '7.1' | '7.0' | '6.2' | '6.0';
}

interface RedisLogging extends LogForwardingBase {
  /**
   * #### Disables the collection of [slow logs](https://redis.io/commands/slowlog-get) to CloudWatch.
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### The format for the logs.
   *
   * @default json
   */
  format?: 'text' | 'json';
  /**
   * #### The number of days to retain logs in the CloudWatch log group.
   *
   * @default 90
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

interface RedisAccessibility {
  /**
   * #### The accessibility mode for this cluster.
   *
   * ---
   *
   * The following modes are supported:
   *
   * - **`vpc`**: The cluster can only be accessed from resources within your VPC. This includes any [function](https://docs.stacktape.com/compute-resources/lambda-functions) (with `joinDefaultVpc: true`), [batch job](https://docs.stacktape.com/compute-resources/batch-jobs), or [container workload](https://docs.stacktape.com/compute-resources/multi-container-workloads) in your stack.
   *
   * - **`scoping-workloads-in-vpc`**: Similar to `vpc` mode, but more restrictive. In addition to being in the same VPC, resources must have the necessary security group permissions to access the cluster. For functions, batch jobs, and container services, these permissions can be granted using the `connectTo` property in their respective configurations.
   *
   * Redis clusters do not support public IP addresses, so you cannot connect to them directly from your local machine.
   * You can use a bastion host to access the cluster, and native support for bastion hosts will be available in Stacktape soon.
   *
   * To learn more about VPCs, see the [VPC documentation](https://docs.stacktape.com/user-guides/vpcs/).
   *
   * @default vpc
   */
  accessibilityMode: 'vpc' | 'scoping-workloads-in-vpc';
}

type RedisClusterReferencableParam = 'host' | 'readerHost' | 'port' | 'readerPort' | 'connectionString' | 'sharding';
