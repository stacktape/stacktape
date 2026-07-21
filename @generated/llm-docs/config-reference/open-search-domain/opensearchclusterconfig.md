# OpenSearchClusterConfig API Reference

Resource type: `open-search-domain`

## TypeScript definition

```typescript
type OpenSearchClusterConfig = {
  /** Number of data nodes. More nodes = more storage capacity and query throughput. */
  instanceCount: number;
  /** Instance type for data nodes (e.g., t3.medium.search, r6g.large.search). */
  instanceType: string;
  /** Number of dedicated master nodes. Must be odd (3, 5, or 7) for quorum. */
  dedicatedMasterCount?: number;
  /** Instance type for dedicated master nodes (e.g., m5.large.search). Manages cluster state, not data. */
  dedicatedMasterType?: string;
  /** Disable Multi-AZ replication. Not recommended — reduces availability and data durability. */
  multiAzDisabled?: boolean;
  /** Enable Multi-AZ with a standby AZ for highest availability (99.99% SLA). */
  standbyEnabled?: boolean;
  /** Number of warm (UltraWarm) nodes for lower-cost storage of older data. */
  warmCount?: number;
  /** Instance type for warm (UltraWarm) nodes — cheaper storage for infrequently accessed data. */
  warmType?: string;
};
```

## Property: `instanceCount`

- Required: yes
- Type: `number`

Number of data nodes. More nodes = more storage capacity and query throughput.

### Example 1 (yaml)

```yaml
resources:
  searchEngine:
    type: open-search-domain
    properties:
      version: '2.17'
      clusterConfig:
        instanceType: r6g.large.search
        instanceCount: 4
      storage:
        size: 80
```

### Example 2 (typescript)

```typescript
import { OpenSearchDomain, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const searchEngine = new OpenSearchDomain({
    version: '2.17',
    clusterConfig: {
      instanceType: 'r6g.large.search',
      instanceCount: 4
    },
    storage: {
      size: 80
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `instanceType`

- Required: yes
- Type: `string`

Instance type for data nodes (e.g., `t3.medium.search`, `r6g.large.search`).

Data nodes store data and handle queries. For production, pair with dedicated master nodes.

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
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `dedicatedMasterCount`

- Required: no
- Type: `number`

Number of dedicated master nodes. Must be odd (3, 5, or 7) for quorum.

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

## Property: `dedicatedMasterType`

- Required: no
- Type: `string`

Instance type for dedicated master nodes (e.g., `m5.large.search`). Manages cluster state, not data.

Recommended for clusters with 3+ data nodes to prevent split-brain. Use an odd count (3, 5, or 7).

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

## Property: `multiAzDisabled`

- Required: no
- Type: `boolean`
- Default: `false`

Disable Multi-AZ replication. Not recommended — reduces availability and data durability.

Multi-AZ is auto-enabled for clusters with 2+ nodes. It distributes nodes across availability zones
so the cluster survives an AZ outage.

### Example 1 (yaml)

```yaml
resources:
  searchEngine:
    type: open-search-domain
    properties:
      version: '2.17'
      clusterConfig:
        instanceType: t3.medium.search
        instanceCount: 2
        multiAzDisabled: true
      storage:
        size: 20
```

### Example 2 (typescript)

```typescript
import { OpenSearchDomain, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const searchEngine = new OpenSearchDomain({
    version: '2.17',
    clusterConfig: {
      instanceType: 't3.medium.search',
      instanceCount: 2,
      multiAzDisabled: true
    },
    storage: {
      size: 20
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `standbyEnabled`

- Required: no
- Type: `boolean`
- Default: `false`

Enable Multi-AZ with a standby AZ for highest availability (99.99% SLA).

Distributes nodes across 3 AZs with one as standby. The standby takes over instantly during failures
without re-balancing. Requires: version 1.3+, 3 dedicated master + data nodes, GP3/SSD instances.

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
        standbyEnabled: true
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
      dedicatedMasterCount: 3,
      standbyEnabled: true
    },
    storage: {
      size: 50
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `warmCount`

- Required: no
- Type: `number`

Number of warm (UltraWarm) nodes for lower-cost storage of older data.

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
        warmType: ultrawarm1.medium.search
        warmCount: 2
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
      dedicatedMasterCount: 3,
      warmType: 'ultrawarm1.medium.search',
      warmCount: 2
    },
    storage: {
      size: 50
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `warmType`

- Required: no
- Type: `string`

Instance type for warm (UltraWarm) nodes — cheaper storage for infrequently accessed data.

Data on warm nodes is still searchable but with higher query latency. Great for retaining old logs
or time-series data at lower cost.

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
        warmType: ultrawarm1.medium.search
        warmCount: 2
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
      dedicatedMasterCount: 3,
      warmType: 'ultrawarm1.medium.search',
      warmCount: 2
    },
    storage: {
      size: 50
    }
  });
  return { resources: { searchEngine } };
});
```
