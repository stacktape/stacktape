# OpenSearchStorage API Reference

Resource type: `open-search-domain`

## TypeScript definition

```typescript
type OpenSearchStorage = {
  /** EBS volume size per data node in GiB. Min/max depends on instance type (typically 10–16,384 GiB). */
  size: number;
  /** Provisioned IOPS per data node. GP3 volumes only. */
  iops?: number;
  /** Provisioned throughput per data node in MiB/s. GP3 volumes only. */
  throughput?: number;
};
```

## Property: `size`

- Required: yes
- Type: `number`

EBS volume size per data node in GiB. Min/max depends on instance type (typically 10–16,384 GiB).

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
      size: 100
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `iops`

- Required: no
- Type: `number`
- Default: `3000`

Provisioned IOPS per data node. GP3 volumes only.

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
        iops: 5000
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
      iops: 5000
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `throughput`

- Required: no
- Type: `number`
- Default: `125`

Provisioned throughput per data node in MiB/s. GP3 volumes only.

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
        iops: 5000
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
      iops: 5000,
      throughput: 250
    }
  });
  return { resources: { searchEngine } };
});
```
