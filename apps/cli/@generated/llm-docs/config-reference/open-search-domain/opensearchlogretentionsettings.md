# OpenSearchLogRetentionSettings API Reference

Resource type: `open-search-domain`

## TypeScript definition

```typescript
type OpenSearchLogRetentionSettings = {
  /** Disable this log type. */
  disabled?: boolean;
  /** Choose the lower-ingestion-cost CloudWatch Logs class for logs that you inspect only occasionally.

`infrequent-access` still supports Logs Insights, but it does not support live tail, metric or subscription
filters, embedded metrics, or Stacktape log forwarding. A log group's class cannot be changed after it is
created, so use this for new resources or stages. */
  logClass?: "infrequent-access" | "standard";
  /** Days to keep logs in CloudWatch before automatic deletion. */
  retentionDays?: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90;
};
```

## Property: `disabled`

- Required: no
- Type: `boolean`
- Default: `false`

Disable this log type.

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
          disabled: true
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
        disabled: true
      }
    }
  });
  return { resources: { searchEngine } };
});
```

## Property: `logClass`

- Required: no
- Type: `string: "infrequent-access" | "standard"`
- Default: `standard`

Choose the lower-ingestion-cost CloudWatch Logs class for logs that you inspect only occasionally.

`infrequent-access` still supports Logs Insights, but it does not support live tail, metric or subscription
filters, embedded metrics, or Stacktape log forwarding. A log group's class cannot be changed after it is
created, so use this for new resources or stages.

### Example 1 (yaml)

```yaml
resources:
  archiveWorker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/archive.ts
      logging:
        logClass: infrequent-access
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const archiveWorker = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/archive.ts' }),
    logging: {
      logClass: 'infrequent-access'
    }
  });
  return { resources: { archiveWorker } };
});
```

## Property: `retentionDays`

- Required: no
- Type: `number: 1 | 120 | 14 | 150 | 180 | 1827 | 3 | 30 | 365 | 3653 | 400 | 5 | 545 | 60 | 7 | 731 | 90`

Days to keep logs in CloudWatch before automatic deletion.

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
          retentionDays: 90
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
        retentionDays: 90
      }
    }
  });
  return { resources: { searchEngine } };
});
```
