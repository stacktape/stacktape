# OpenSearchAccessibility API Reference

Resource type: `open-search-domain`

## TypeScript definition

```typescript
type OpenSearchAccessibility = {
  /** How the domain can be reached. */
  accessibilityMode: "internet" | "scoping-workloads-in-vpc" | "vpc";
};
```

## Property: `accessibilityMode`

- Required: yes
- Type: `string: "internet" | "scoping-workloads-in-vpc" | "vpc"`
- Default: `internet`

How the domain can be reached.

**`internet`**: Accessible from anywhere (still requires IAM credentials).
**`vpc`**: Only accessible from resources inside your VPC (functions with `joinDefaultVpc: true`, containers, batch jobs).
**`scoping-workloads-in-vpc`**: Like `vpc`, but also requires security-group access via `connectTo`.

**Cannot be changed after creation** — switching between internet and VPC modes requires a new domain.

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
        accessibilityMode: scoping-workloads-in-vpc
  indexer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/indexer.ts
      joinDefaultVpc: true
      connectTo:
        - searchEngine
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
      accessibilityMode: 'scoping-workloads-in-vpc'
    }
  });
  const indexer = new LambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/indexer.ts'
      }
    },
    joinDefaultVpc: true,
    connectTo: [searchEngine]
  });
  return { resources: { searchEngine, indexer } };
});
```
