# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/open-search.d.ts
/**
 * #### OpenSearch Domain
 *
 * ---
 *
 * A fully managed OpenSearch (or Elasticsearch) cluster.
 */
interface OpenSearchDomain {
  type: 'open-search-domain'; // open-search?
  properties?: OpenSearchDomainProps;
  overrides?: ResourceOverrides;
}

type StpOpenSearchDomain = OpenSearchDomain['properties'] & {
  name: string;
  type: OpenSearchDomain['type'];
  configParentResourceType: OpenSearchDomain['type'];
  nameChain: string[];
};

interface OpenSearchDomainProps {
  /**
   * #### The OpenSearch version to use.
   *
   * ---
   *
   * It is recommended to explicitly specify the version to prevent potential issues when the default version changes.
   * The current default is `2.17`, but this may change in future Stacktape releases.
   */
  version?: '2.17' | '2.15' | '2.13' | '2.11' | '2.9' | '2.7' | '2.5' | '2.3' | '1.3' | '1.2' | '1.1' | '1.0';
  /**
   * #### The configuration of the cluster instances.
   *
   * ---
   *
   * This property determines the size, number, and type of instances used in your OpenSearch domain cluster.
   * If you do not specify a `clusterConfig`, the cluster will consist of a single `m4.large.search` node.
   */
  clusterConfig?: OpenSearchClusterConfig;
  /**
   * #### The storage configuration for the cluster.
   *
   * ---
   *
   * This is only supported for instances that use EBS storage.
   * Setting `iops` and `throughput` is only allowed for instances with the `gp3` storage type.
   */
  storage?: OpenSearchStorage;
  /**
   * #### The name of the Cognito User Pool resource to use for OpenSearch Dashboards authentication.
   */
  userPool?: string;
  /**
   * #### The log collection configuration.
   *
   * ---
   *
   * Stacktape will automatically create the required log groups and policies for you.
   * You can set a custom retention period for individual log types or disable log collection entirely.
   *
   * For more details on log collection, see the [AWS documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/createdomain-configure-slow-logs.html).
   */
  logging?: OpenSearchLogConfiguration;
  /**
   * #### Configures the accessibility of the domain.
   *
   * ---
   *
   * By default, the domain is accessible from anywhere on the internet but is still protected by IAM.
   * You can restrict access by making the domain available only to resources within your stack's VPC.
   */
  accessibility?: OpenSearchAccessibility;
}

interface OpenSearchAccessibility {
  /**
   * #### Configures the accessibility mode for this domain.
   *
   * ---
   *
   * The following modes are supported:
   *
   * - **`internet`**: The least restrictive mode. The domain can be accessed from anywhere on the internet.
   * - **`vpc`**: The domain can only be accessed from resources within your VPC. This includes any [function](https://docs.stacktape.com/compute-resources/lambda-functions) (with `joinDefaultVpc: true`), [batch job](https://docs.stacktape.com/compute-resources/batch-jobs), or [container workload](https://docs.stacktape.com/compute-resources/multi-container-workloads) in your stack, provided they have the required credentials.
   * - **`scoping-workloads-in-vpc`**: Similar to `vpc` mode, but more restrictive. In addition to being in the same VPC, resources must have the necessary security group permissions to access the cluster. For functions, batch jobs, and container services, these permissions can be granted using the `connectTo` property in their respective configurations.
   *
   * > **Note:** If you launch a domain with `vpc` or `scoping-workloads-in-vpc` accessibility, you cannot later switch it to `internet` mode, and vice versa. You must create a new domain and migrate your data.
   *
   * To learn more about VPCs, see the [VPC documentation](https://docs.stacktape.com/user-guides/vpcs/).
   *
   * @default internet
   */
  accessibilityMode: 'internet' | 'vpc' | 'scoping-workloads-in-vpc';
}

interface OpenSearchClusterConfig {
  /**
   * #### The instance type for the data nodes.
   *
   * ---
   *
   * Data nodes handle data storage, indexing, and query processing.
   * For production setups, it is recommended to pair data nodes with dedicated master nodes to improve cluster stability.
   *
   * For a list of supported instance types, see the [AWS documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html).
   */
  instanceType: string;
  /**
   * #### The number of data nodes in the cluster.
   *
   * ---
   *
   * Data nodes handle data storage, indexing, and query processing.
   * For production setups, it is recommended to pair data nodes with dedicated master nodes to improve cluster stability.
   */
  instanceCount: number;
  /**
   * #### The instance type for the dedicated master nodes.
   *
   * ---
   *
   * Dedicated master nodes manage the cluster state and coordinate node activities but do not store data or serve queries.
   * They are recommended for clusters with three or more nodes to improve stability and prevent split-brain scenarios.
   * The master instance type should be appropriately sized based on the number of nodes and shards in the cluster.
   *
   * The number of master nodes should always be odd (3, 5, or 7) for quorum-based fault tolerance.
   *
   * For more details, see the [AWS documentation on dedicated master nodes](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-dedicatedmasternodes.html).
   */
  dedicatedMasterType?: string;
  /**
   * #### The number of dedicated master nodes.
   *
   * ---
   *
   * Dedicated master nodes manage the cluster state and coordinate node activities but do not store data or serve queries.
   * They are recommended for clusters with three or more nodes to improve stability and prevent split-brain scenarios.
   * The number of master nodes should always be odd (3, 5, or 7) for quorum-based fault tolerance.
   *
   * For more details, see the [AWS documentation on dedicated master nodes](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-dedicatedmasternodes.html).
   */
  dedicatedMasterCount?: number;
  /**
   * #### The instance type for the warm nodes.
   *
   * ---
   *
   * Warm nodes use UltraWarm storage to store infrequently accessed or older data, optimizing costs for time-series or log data.
   * Data on warm nodes remains searchable but with higher query latency compared to hot nodes.
   * This is ideal for retaining historical data without impacting the performance of frequently accessed data.
   *
   * For more details, see the [AWS documentation on UltraWarm storage](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ultrawarm.html).
   */
  warmType?: string;
  /**
   * #### The number of warm nodes.
   *
   * ---
   *
   * Warm nodes use UltraWarm storage to store infrequently accessed or older data, optimizing costs for time-series or log data.
   * Data on warm nodes remains searchable but with higher query latency compared to hot nodes.
   * This is ideal for retaining historical data without impacting the performance of frequently accessed data.
   *
   * For more details, see the [AWS documentation on UltraWarm storage](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ultrawarm.html).
   */
  warmCount?: number;
  /**
   * #### Disables Multi-Availability Zone (AZ) awareness for the cluster.
   *
   * ---
   *
   * By default, Multi-AZ awareness is enabled for any cluster with more than one node.
   * This means OpenSearch Service allocates nodes and replica index shards across multiple AZs to prevent data loss and minimize downtime.
   *
   * Disabling zone awareness is not recommended.
   *
   * For more details, see the [AWS documentation on Multi-AZ clusters](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-multiaz.html).
   *
   * @default false
   */
  multiAzDisabled?: boolean;
  /**
   * #### Enables a Multi-AZ cluster with a standby AZ.
   *
   * ---
   *
   * When enabled, this option ensures high availability and consistent performance by distributing nodes and data copies across three AZs, with one serving as a standby.
   * This allows the standby AZ to take over during a failure without causing re-balancing or availability issues.
   *
   * This feature enforces several best practices, including:
   * - OpenSearch version 1.3 or higher.
   * - Auto-Tune enabled on the domain.
   * - Three dedicated master nodes and data nodes.
   * - Only GP3 or SSD-backed instances from a subset of supported instance types.
   *
   * For more details, see the [AWS documentation on Multi-AZ with Standby](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-multiaz.html).
   *
   * @default false
   */
  standbyEnabled?: boolean;
}

interface OpenSearchStorage {
  /**
   * #### The size of the EBS volume for each data node, in GiB.
   *
   * ---
   *
   * The minimum and maximum size of an EBS volume depends on the volume type and the instance type it is attached to.
   * For more information, see the [EBS volume size limits](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html#ebsresource) in the Amazon OpenSearch Service Developer Guide.
   */
  size: number;
  /**
   * #### The provisioned IOPS per data node.
   *
   * ---
   *
   * The number of I/O operations per second (IOPS) that the volume supports.
   * This applies only to instances with the **GP3** volume type.
   *
   * @default 3000
   */
  iops?: number;
  /**
   * #### The provisioned throughput per data node, in MiB/s.
   *
   * ---
   *
   * The throughput of the EBS volumes attached to data nodes.
   * This applies only to instances with the **GP3** volume type.
   *
   * @default 125
   */
  throughput?: number;
}
interface OpenSearchLogConfiguration {
  /**
   * #### Error logs.
   *
   * ---
   *
   * Error logs can help with troubleshooting issues such as:
   * - Script compilation errors
   * - Invalid queries
   * - Indexing issues
   * - Snapshot failures
   * - Index State Management migration failures
   *
   * If you enable error logs, OpenSearch Service will publish log lines of `WARN`, `ERROR`, and `FATAL` to CloudWatch, along with several exceptions from the `DEBUG` level.
   *
   * For more details, see the [AWS documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/createdomain-configure-slow-logs.html).
   */
  errorLogs?: OpenSearchLogRetentionSettings;
  /**
   * #### Search slow logs.
   *
   * ---
   *
   * Search slow logs rely on thresholds that you define to determine what qualifies as a "slow" search.
   * For example, you might decide that a query is slow if it takes more than 15 seconds to complete.
   *
   * For more information on slow logs and how to configure thresholds, see the [OpenSearch documentation](https://opensearch.org/docs/latest/monitoring-your-cluster/logs/#slow-logs).
   */
  searchSlowLogs?: OpenSearchLogRetentionSettings;
  /**
   * #### Indexing slow logs.
   *
   * ---
   *
   * These logs rely on thresholds to define what qualifies as a "slow" indexing operation.
   * For example, you might decide that an indexing operation is slow if it takes more than 15 seconds to complete.
   *
   * For more information on slow logs and how to configure thresholds, see the [OpenSearch documentation](https://opensearch.org/docs/latest/monitoring-your-cluster/logs/#slow-logs).
   */
  indexSlowLogs?: OpenSearchLogRetentionSettings;
}

interface OpenSearchLogRetentionSettings {
  /**
   * #### Disables log collection.
   *
   * ---
   *
   * Log collection is enabled by default.
   *
   * @default false
   */

  disabled?: boolean;
  /**
   * #### The number of days to retain logs in the CloudWatch log group.
   *
   * ---
   *
   * @default 14
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

type OpenSearchDomainReferencableParams = 'arn' | 'domainEndpoint';
```