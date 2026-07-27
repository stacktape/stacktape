# OpenSearchDomainProps API Reference

Resource type: `open-search-domain`

## TypeScript definition

```typescript
import type { OpenSearchAccessibility, OpenSearchClusterConfig, OpenSearchLogConfiguration, OpenSearchStorage } from 'stacktape';

type OpenSearchDomainProps = {
  /** Network access mode: public internet (default), VPC-only, or VPC with security-group scoping. */
  accessibility?: OpenSearchAccessibility;
  /** Instance types, counts, and cluster topology (data nodes, master nodes, warm storage). */
  clusterConfig?: OpenSearchClusterConfig;
  /** Error logs, search slow logs, and indexing slow logs. Sent to CloudWatch automatically. */
  logging?: OpenSearchLogConfiguration;
  /** EBS volume size, IOPS, and throughput per data node. Only for EBS-backed instance types. */
  storage?: OpenSearchStorage;
  /** Name of a user-pool resource in your config. Enables login to OpenSearch Dashboards via Cognito. */
  userPool?: string;
  /** OpenSearch engine version. Pin this to avoid surprises when the default changes. */
  version?: "1.0" | "1.1" | "1.2" | "1.3" | "2.11" | "2.13" | "2.15" | "2.17" | "2.3" | "2.5" | "2.7" | "2.9";
};
```

## Property: `accessibility`

- Required: no
- Type: `OpenSearchAccessibility`

Network access mode: public internet (default), VPC-only, or VPC with security-group scoping.

Even in `internet` mode, access requires IAM credentials. VPC modes add network-level isolation.
**Warning:** you cannot switch between `internet` and `vpc`/`scoping-workloads-in-vpc` after creation.

### Example 1 (yaml)

```yaml
resources:
  searchEngine:
    type: open-search-domain
    properties:
      version: '2.17'
      clusterConfig:
        instanceType: r6g.large.search
        instanceCount: 2
      storage:
        size: 50
      accessibility:
        accessibilityMode: vpc
  indexer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/indexer.ts
      joinDefaultVpc: true
```

### Example 2 (typescript)

```typescript
import { OpenSearchDomain, LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const searchEngine = new OpenSearchDomain({
    version: '2.17',
    clusterConfig: {
      instanceType: 'r6g.large.search',
      instanceCount: 2
    },
    storage: {
      size: 50
    },
    accessibility: {
      accessibilityMode: 'vpc'
    }
  });
  const indexer = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/indexer.ts'
      }
    },
    joinDefaultVpc: true
  });
  return { resources: { searchEngine, indexer } };
});
```

## Property: `clusterConfig`

- Required: no
- Type: `OpenSearchClusterConfig`

Instance types, counts, and cluster topology (data nodes, master nodes, warm storage).

Defaults to a single `m4.large.search` node if not specified.

### Example 1 (yaml)

```yaml
resources:
  searchEngine:
    type: open-search-domain
    properties:
      version: '2.17'
      clusterConfig:
        instanceType: r6g.large.search
        instanceCount: 3
        dedicatedMasterType: m5.large.search
        dedicatedMasterCount: 3
      storage:
        size: 50
```

### Example 2 (typescript)

```typescript
import { OpenSearchDomain, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const searchEngine = new OpenSearchDomain({
    version: '2.17',
    clusterConfig: {
      instanceType: 'r6g.large.search',
      instanceCount: 3,
      dedicatedMasterType: 'm5.large.search',
      dedicatedMasterCount: 3
    },
    storage: {
      size: 50
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `logging`

- Required: no
- Type: `OpenSearchLogConfiguration`

Error logs, search slow logs, and indexing slow logs. Sent to CloudWatch automatically.

### Example 1 (yaml)

```yaml
resources:
  searchEngine:
    type: open-search-domain
    properties:
      version: '2.17'
      clusterConfig:
        instanceType: r6g.large.search
        instanceCount: 2
      storage:
        size: 50
      logging:
        errorLogs:
          retentionDays: 30
        searchSlowLogs:
          retentionDays: 14
        indexSlowLogs:
          retentionDays: 14
```

### Example 2 (typescript)

```typescript
import { OpenSearchDomain, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const searchEngine = new OpenSearchDomain({
    version: '2.17',
    clusterConfig: {
      instanceType: 'r6g.large.search',
      instanceCount: 2
    },
    storage: {
      size: 50
    },
    logging: {
      errorLogs: {
        retentionDays: 30
      },
      searchSlowLogs: {
        retentionDays: 14
      },
      indexSlowLogs: {
        retentionDays: 14
      }
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `storage`

- Required: no
- Type: `OpenSearchStorage`

EBS volume size, IOPS, and throughput per data node. Only for EBS-backed instance types.

`iops` and `throughput` settings only apply to GP3 volumes.

### Example 1 (yaml)

```yaml
resources:
  searchEngine:
    type: open-search-domain
    properties:
      version: '2.17'
      clusterConfig:
        instanceType: r6g.large.search
        instanceCount: 2
      storage:
        size: 100
        iops: 4000
        throughput: 250
```

### Example 2 (typescript)

```typescript
import { OpenSearchDomain, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const searchEngine = new OpenSearchDomain({
    version: '2.17',
    clusterConfig: {
      instanceType: 'r6g.large.search',
      instanceCount: 2
    },
    storage: {
      size: 100,
      iops: 4000,
      throughput: 250
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `userPool`

- Required: no
- Type: `string`

Name of a `user-pool` resource in your config. Enables login to OpenSearch Dashboards via Cognito.

### Example 1 (yaml)

```yaml
resources:
  dashboardUsers:
    type: user-auth-pool
  searchEngine:
    type: open-search-domain
    properties:
      version: '2.17'
      clusterConfig:
        instanceType: t3.medium.search
        instanceCount: 1
      storage:
        size: 20
      userPool: dashboardUsers
```

### Example 2 (typescript)

```typescript
import { OpenSearchDomain, UserAuthPool, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const dashboardUsers = new UserAuthPool({});
  const searchEngine = new OpenSearchDomain({
    version: '2.17',
    clusterConfig: {
      instanceType: 't3.medium.search',
      instanceCount: 1
    },
    storage: {
      size: 20
    },
    userPool: 'dashboardUsers'
  });
  return { resources: { dashboardUsers, searchEngine } };
});
```

## Property: `version`

- Required: no
- Type: `string: "1.0" | "1.1" | "1.2" | "1.3" | "2.11" | "2.13" | "2.15" | "2.17" | "2.3" | "2.5" | "2.7" | "2.9"`
- Default: `'2.17'`

OpenSearch engine version. Pin this to avoid surprises when the default changes.

### Example 1 (yaml)

```yaml
resources:
  searchEngine:
    type: open-search-domain
    properties:
      version: '2.15'
      clusterConfig:
        instanceType: t3.medium.search
        instanceCount: 1
      storage:
        size: 20
```

### Example 2 (typescript)

```typescript
import { OpenSearchDomain, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const searchEngine = new OpenSearchDomain({
    version: '2.15',
    clusterConfig: {
      instanceType: 't3.medium.search',
      instanceCount: 1
    },
    storage: {
      size: 20
    }
  });
  return { resources: { searchEngine } };
});
```
