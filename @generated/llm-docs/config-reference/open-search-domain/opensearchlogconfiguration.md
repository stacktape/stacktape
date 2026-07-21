# OpenSearchLogConfiguration API Reference

Resource type: `open-search-domain`

## TypeScript definition

```typescript
import type { OpenSearchLogRetentionSettings } from 'stacktape';

type OpenSearchLogConfiguration = {
  /** Error logs — script compilation errors, invalid queries, indexing issues, snapshot failures. */
  errorLogs?: OpenSearchLogRetentionSettings;
  /** Indexing slow logs — indexing operations exceeding thresholds you configure in OpenSearch index settings. */
  indexSlowLogs?: OpenSearchLogRetentionSettings;
  /** Search slow logs — queries exceeding thresholds you configure in OpenSearch index settings. */
  searchSlowLogs?: OpenSearchLogRetentionSettings;
};
```

## Property: `errorLogs`

- Required: no
- Type: `OpenSearchLogRetentionSettings`

Error logs — script compilation errors, invalid queries, indexing issues, snapshot failures.

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
      }
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `indexSlowLogs`

- Required: no
- Type: `OpenSearchLogRetentionSettings`

Indexing slow logs — indexing operations exceeding thresholds you configure in OpenSearch index settings.

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
        indexSlowLogs:
          retentionDays: 7
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
      indexSlowLogs: {
        retentionDays: 7
      }
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `searchSlowLogs`

- Required: no
- Type: `OpenSearchLogRetentionSettings`

Search slow logs — queries exceeding thresholds you configure in OpenSearch index settings.

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
        searchSlowLogs:
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
      searchSlowLogs: {
        retentionDays: 14
      }
    }
  });
  return { resources: { searchEngine } };
});
```
