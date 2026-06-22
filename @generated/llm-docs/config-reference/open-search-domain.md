# Open Search Domain

Resource type: `open-search-domain`

## TypeScript Definition

```typescript
/**
 * #### Managed search and analytics engine (OpenSearch/Elasticsearch compatible).
 *
 * ---
 *
 * Full-text search, log analytics, and real-time dashboards. Use for search features in your app,
 * centralized logging, or time-series data analysis. Costs start at ~$50/month (single small node).
 */
interface OpenSearchDomain {
  type: 'open-search-domain'; // open-search?
  properties?: OpenSearchDomainProps;
  overrides?: ResourceOverrides;
}

interface OpenSearchDomainProps {
  /**
   * #### OpenSearch engine version. Pin this to avoid surprises when the default changes.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.15'
   *       clusterConfig:
   *         instanceType: t3.medium.search
   *         instanceCount: 1
   *       storage:
   *         size: 20
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.15',
   *     clusterConfig: {
   *       instanceType: 't3.medium.search',
   *       instanceCount: 1
   *     },
   *     storage: {
   *       size: 20
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   *
   * @default '2.17'
   */
  version?: '2.17' | '2.15' | '2.13' | '2.11' | '2.9' | '2.7' | '2.5' | '2.3' | '1.3' | '1.2' | '1.1' | '1.0';
  /**
   * #### Instance types, counts, and cluster topology (data nodes, master nodes, warm storage).
   *
   * ---
   *
   * Defaults to a single `m4.large.search` node if not specified.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 3
   *         dedicatedMasterType: m5.large.search
   *         dedicatedMasterCount: 3
   *       storage:
   *         size: 50
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 3,
   *       dedicatedMasterType: 'm5.large.search',
   *       dedicatedMasterCount: 3
   *     },
   *     storage: {
   *       size: 50
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  clusterConfig?: OpenSearchClusterConfig;
  /**
   * #### EBS volume size, IOPS, and throughput per data node. Only for EBS-backed instance types.
   *
   * ---
   *
   * `iops` and `throughput` settings only apply to GP3 volumes.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 100
   *         iops: 4000
   *         throughput: 250
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 100,
   *       iops: 4000,
   *       throughput: 250
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  storage?: OpenSearchStorage;
  /**
   * #### Name of a `user-pool` resource in your config. Enables login to OpenSearch Dashboards via Cognito.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   dashboardUsers:
   *     type: user-auth-pool
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: t3.medium.search
   *         instanceCount: 1
   *       storage:
   *         size: 20
   *       userPool: dashboardUsers
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, UserAuthPool, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const dashboardUsers = new UserAuthPool({});
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 't3.medium.search',
   *       instanceCount: 1
   *     },
   *     storage: {
   *       size: 20
   *     },
   *     userPool: 'dashboardUsers'
   *   });
   *   return { resources: { dashboardUsers, searchEngine } };
   * });
   * ```
   */
  userPool?: string;
  /**
   * #### Error logs, search slow logs, and indexing slow logs. Sent to CloudWatch automatically.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 50
   *       logging:
   *         errorLogs:
   *           retentionDays: 30
   *         searchSlowLogs:
   *           retentionDays: 14
   *         indexSlowLogs:
   *           retentionDays: 14
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 50
   *     },
   *     logging: {
   *       errorLogs: {
   *         retentionDays: 30
   *       },
   *       searchSlowLogs: {
   *         retentionDays: 14
   *       },
   *       indexSlowLogs: {
   *         retentionDays: 14
   *       }
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  logging?: OpenSearchLogConfiguration;
  /**
   * #### Network access mode: public internet (default), VPC-only, or VPC with security-group scoping.
   *
   * ---
   *
   * Even in `internet` mode, access requires IAM credentials. VPC modes add network-level isolation.
   * **Warning:** you cannot switch between `internet` and `vpc`/`scoping-workloads-in-vpc` after creation.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 50
   *       accessibility:
   *         accessibilityMode: vpc
   *   indexer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/indexer.ts
   *       joinDefaultVpc: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 50
   *     },
   *     accessibility: {
   *       accessibilityMode: 'vpc'
   *     }
   *   });
   *   const indexer = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: {
   *         entryfilePath: 'src/indexer.ts'
   *       }
   *     },
   *     joinDefaultVpc: true
   *   });
   *   return { resources: { searchEngine, indexer } };
   * });
   * ```
   */
  accessibility?: OpenSearchAccessibility;
}

interface OpenSearchAccessibility {
  /**
   * #### How the domain can be reached.
   *
   * ---
   *
   * - **`internet`**: Accessible from anywhere (still requires IAM credentials).
   * - **`vpc`**: Only accessible from resources inside your VPC (functions with `joinDefaultVpc: true`, containers, batch jobs).
   * - **`scoping-workloads-in-vpc`**: Like `vpc`, but also requires security-group access via `connectTo`.
   *
   * **Cannot be changed after creation** — switching between internet and VPC modes requires a new domain.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 50
   *       accessibility:
   *         accessibilityMode: scoping-workloads-in-vpc
   *   indexer:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/indexer.ts
   *       joinDefaultVpc: true
   *       connectTo:
   *         - searchEngine
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, LambdaFunction, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 50
   *     },
   *     accessibility: {
   *       accessibilityMode: 'scoping-workloads-in-vpc'
   *     }
   *   });
   *   const indexer = new LambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: {
   *         entryfilePath: 'src/indexer.ts'
   *       }
   *     },
   *     joinDefaultVpc: true,
   *     connectTo: [searchEngine]
   *   });
   *   return { resources: { searchEngine, indexer } };
   * });
   * ```
   *
   * @default internet
   */
  accessibilityMode: 'internet' | 'vpc' | 'scoping-workloads-in-vpc';
}

interface OpenSearchClusterConfig {
  /**
   * #### Instance type for data nodes (e.g., `t3.medium.search`, `r6g.large.search`).
   *
   * ---
   *
   * Data nodes store data and handle queries. For production, pair with dedicated master nodes.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 50
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 50
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  instanceType: string;
  /**
   * #### Number of data nodes. More nodes = more storage capacity and query throughput.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 4
   *       storage:
   *         size: 80
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 4
   *     },
   *     storage: {
   *       size: 80
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  instanceCount: number;
  /**
   * #### Instance type for dedicated master nodes (e.g., `m5.large.search`). Manages cluster state, not data.
   *
   * ---
   *
   * Recommended for clusters with 3+ data nodes to prevent split-brain. Use an odd count (3, 5, or 7).
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 3
   *         dedicatedMasterType: m5.large.search
   *         dedicatedMasterCount: 3
   *       storage:
   *         size: 50
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 3,
   *       dedicatedMasterType: 'm5.large.search',
   *       dedicatedMasterCount: 3
   *     },
   *     storage: {
   *       size: 50
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  dedicatedMasterType?: string;
  /**
   * #### Number of dedicated master nodes. Must be odd (3, 5, or 7) for quorum.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 3
   *         dedicatedMasterType: m5.large.search
   *         dedicatedMasterCount: 3
   *       storage:
   *         size: 50
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 3,
   *       dedicatedMasterType: 'm5.large.search',
   *       dedicatedMasterCount: 3
   *     },
   *     storage: {
   *       size: 50
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  dedicatedMasterCount?: number;
  /**
   * #### Instance type for warm (UltraWarm) nodes — cheaper storage for infrequently accessed data.
   *
   * ---
   *
   * Data on warm nodes is still searchable but with higher query latency. Great for retaining old logs
   * or time-series data at lower cost.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 3
   *         dedicatedMasterType: m5.large.search
   *         dedicatedMasterCount: 3
   *         warmType: ultrawarm1.medium.search
   *         warmCount: 2
   *       storage:
   *         size: 50
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 3,
   *       dedicatedMasterType: 'm5.large.search',
   *       dedicatedMasterCount: 3,
   *       warmType: 'ultrawarm1.medium.search',
   *       warmCount: 2
   *     },
   *     storage: {
   *       size: 50
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  warmType?: string;
  /**
   * #### Number of warm (UltraWarm) nodes for lower-cost storage of older data.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 3
   *         dedicatedMasterType: m5.large.search
   *         dedicatedMasterCount: 3
   *         warmType: ultrawarm1.medium.search
   *         warmCount: 2
   *       storage:
   *         size: 50
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 3,
   *       dedicatedMasterType: 'm5.large.search',
   *       dedicatedMasterCount: 3,
   *       warmType: 'ultrawarm1.medium.search',
   *       warmCount: 2
   *     },
   *     storage: {
   *       size: 50
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  warmCount?: number;
  /**
   * #### Disable Multi-AZ replication. Not recommended — reduces availability and data durability.
   *
   * ---
   *
   * Multi-AZ is auto-enabled for clusters with 2+ nodes. It distributes nodes across availability zones
   * so the cluster survives an AZ outage.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: t3.medium.search
   *         instanceCount: 2
   *         multiAzDisabled: true
   *       storage:
   *         size: 20
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 't3.medium.search',
   *       instanceCount: 2,
   *       multiAzDisabled: true
   *     },
   *     storage: {
   *       size: 20
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   *
   * @default false
   */
  multiAzDisabled?: boolean;
  /**
   * #### Enable Multi-AZ with a standby AZ for highest availability (99.99% SLA).
   *
   * ---
   *
   * Distributes nodes across 3 AZs with one as standby. The standby takes over instantly during failures
   * without re-balancing. Requires: version 1.3+, 3 dedicated master + data nodes, GP3/SSD instances.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 3
   *         dedicatedMasterType: m5.large.search
   *         dedicatedMasterCount: 3
   *         standbyEnabled: true
   *       storage:
   *         size: 50
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 3,
   *       dedicatedMasterType: 'm5.large.search',
   *       dedicatedMasterCount: 3,
   *       standbyEnabled: true
   *     },
   *     storage: {
   *       size: 50
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   *
   * @default false
   */
  standbyEnabled?: boolean;
}

interface OpenSearchStorage {
  /**
   * #### EBS volume size per data node in GiB. Min/max depends on instance type (typically 10–16,384 GiB).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 100
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 100
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  size: number;
  /**
   * #### Provisioned IOPS per data node. GP3 volumes only.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 100
   *         iops: 5000
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 100,
   *       iops: 5000
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   *
   * @default 3000
   */
  iops?: number;
  /**
   * #### Provisioned throughput per data node in MiB/s. GP3 volumes only.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 100
   *         iops: 5000
   *         throughput: 250
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 100,
   *       iops: 5000,
   *       throughput: 250
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   *
   * @default 125
   */
  throughput?: number;
}
interface OpenSearchLogConfiguration {
  /**
   * #### Error logs — script compilation errors, invalid queries, indexing issues, snapshot failures.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 50
   *       logging:
   *         errorLogs:
   *           retentionDays: 30
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 50
   *     },
   *     logging: {
   *       errorLogs: {
   *         retentionDays: 30
   *       }
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  errorLogs?: OpenSearchLogRetentionSettings;
  /**
   * #### Search slow logs — queries exceeding thresholds you configure in OpenSearch index settings.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 50
   *       logging:
   *         searchSlowLogs:
   *           retentionDays: 14
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 50
   *     },
   *     logging: {
   *       searchSlowLogs: {
   *         retentionDays: 14
   *       }
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  searchSlowLogs?: OpenSearchLogRetentionSettings;
  /**
   * #### Indexing slow logs — indexing operations exceeding thresholds you configure in OpenSearch index settings.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 50
   *       logging:
   *         indexSlowLogs:
   *           retentionDays: 7
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 50
   *     },
   *     logging: {
   *       indexSlowLogs: {
   *         retentionDays: 7
   *       }
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   */
  indexSlowLogs?: OpenSearchLogRetentionSettings;
}

interface OpenSearchLogRetentionSettings {
  /**
   * #### Disable this log type.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 50
   *       logging:
   *         errorLogs:
   *           retentionDays: 30
   *         searchSlowLogs:
   *           disabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 50
   *     },
   *     logging: {
   *       errorLogs: {
   *         retentionDays: 30
   *       },
   *       searchSlowLogs: {
   *         disabled: true
   *       }
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### Days to keep logs in CloudWatch before automatic deletion.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   searchEngine:
   *     type: open-search-domain
   *     properties:
   *       version: '2.17'
   *       clusterConfig:
   *         instanceType: r6g.large.search
   *         instanceCount: 2
   *       storage:
   *         size: 50
   *       logging:
   *         errorLogs:
   *           retentionDays: 90
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { OpenSearchDomain, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const searchEngine = new OpenSearchDomain({
   *     version: '2.17',
   *     clusterConfig: {
   *       instanceType: 'r6g.large.search',
   *       instanceCount: 2
   *     },
   *     storage: {
   *       size: 50
   *     },
   *     logging: {
   *       errorLogs: {
   *         retentionDays: 90
   *       }
   *     }
   *   });
   *   return { resources: { searchEngine } };
   * });
   * ```
   *
   * @default 14
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

type OpenSearchDomainReferencableParams = 'arn' | 'domainEndpoint';
```
