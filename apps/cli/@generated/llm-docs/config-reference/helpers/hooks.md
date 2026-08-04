# Hooks API Reference

## TypeScript definition

```typescript
import type { NamedScriptLifecycleHook } from 'stacktape';

type Hooks = {
  /** Scripts to run after syncing bucket contents. */
  afterBucketSync?: Array<NamedScriptLifecycleHook>;
  /** Scripts to run after deleting the stack. */
  afterDelete?: Array<NamedScriptLifecycleHook>;
  /** Scripts to run after deploying. Common use: run database migrations, seed data. */
  afterDeploy?: Array<NamedScriptLifecycleHook>;
  /** Scripts to run after dev mode exits. */
  afterDev?: Array<NamedScriptLifecycleHook>;
  /** Scripts to run before syncing bucket contents. */
  beforeBucketSync?: Array<NamedScriptLifecycleHook>;
  /** Scripts to run before deleting the stack. Common use: export data, clean up external resources. */
  beforeDelete?: Array<NamedScriptLifecycleHook>;
  /** Scripts to run before deploying. Common use: build frontend, lint code. */
  beforeDeploy?: Array<NamedScriptLifecycleHook>;
  /** Scripts to run before starting dev mode. */
  beforeDev?: Array<NamedScriptLifecycleHook>;
};
```

## Property: `afterBucketSync`

- Required: no
- Type: `Array<NamedScriptLifecycleHook>`

Scripts to run after syncing bucket contents.

### Example 1 (yaml)

```yaml
scripts:
  invalidateCache:
    type: local-script
    properties:
      executeCommand: node ./scripts/purge-cdn.js
hooks:
  afterBucketSync:
    - scriptName: invalidateCache
resources:
  assets:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./public
```

### Example 2 (typescript)

```typescript
import { HostingBucket, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const invalidateCache = new LocalScript({ executeCommand: 'node ./scripts/purge-cdn.js' });
  const assets = new HostingBucket({ uploadDirectoryPath: './public' });

  return {
    scripts: { invalidateCache },
    hooks: {
      afterBucketSync: [{ scriptName: 'invalidateCache' }]
    },
    resources: { assets }
  };
});
```

## Property: `afterDelete`

- Required: no
- Type: `Array<NamedScriptLifecycleHook>`

Scripts to run after deleting the stack.

Only runs when `--configPath` and `--stage` are provided to the delete command.

### Example 1 (yaml)

```yaml
scripts:
  notifyCleanup:
    type: local-script
    properties:
      executeCommand: node ./scripts/notify-slack.js
hooks:
  afterDelete:
    - scriptName: notifyCleanup
resources:
  worker:
    type: worker-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/worker.ts
      resources:
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WorkerService, StacktapeImageBuildpackPackaging, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const notifyCleanup = new LocalScript({ executeCommand: 'node ./scripts/notify-slack.js' });
  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/worker.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    scripts: { notifyCleanup },
    hooks: {
      afterDelete: [{ scriptName: 'notifyCleanup' }]
    },
    resources: { worker }
  };
});
```

## Property: `afterDeploy`

- Required: no
- Type: `Array<NamedScriptLifecycleHook>`

Scripts to run after deploying. Common use: run database migrations, seed data.

### Example 1 (yaml)

```yaml
scripts:
  runMigrations:
    type: local-script
    properties:
      executeCommand: npx prisma migrate deploy
      connectTo:
        - mainDb
hooks:
  afterDeploy:
    - scriptName: runMigrations
resources:
  mainDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, RdsEnginePostgres, LocalScript, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const runMigrations = new LocalScript({ executeCommand: 'npx prisma migrate deploy', connectTo: [mainDb] });

  return {
    scripts: { runMigrations },
    hooks: {
      afterDeploy: [{ scriptName: 'runMigrations' }]
    },
    resources: { mainDb }
  };
});
```

## Property: `afterDev`

- Required: no
- Type: `Array<NamedScriptLifecycleHook>`

Scripts to run after dev mode exits.

### Example 1 (yaml)

```yaml
scripts:
  teardownLocal:
    type: local-script
    properties:
      executeCommand: docker compose down
hooks:
  afterDev:
    - scriptName: teardownLocal
resources:
  cache:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: key
          type: string
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const teardownLocal = new LocalScript({ executeCommand: 'docker compose down' });
  const cache = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'key', type: 'string' } } });

  return {
    scripts: { teardownLocal },
    hooks: {
      afterDev: [{ scriptName: 'teardownLocal' }]
    },
    resources: { cache }
  };
});
```

## Property: `beforeBucketSync`

- Required: no
- Type: `Array<NamedScriptLifecycleHook>`

Scripts to run before syncing bucket contents.

### Example 1 (yaml)

```yaml
scripts:
  optimizeAssets:
    type: local-script
    properties:
      executeCommand: node ./scripts/optimize-images.js
hooks:
  beforeBucketSync:
    - scriptName: optimizeAssets
resources:
  assets:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./public
```

### Example 2 (typescript)

```typescript
import { HostingBucket, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const optimizeAssets = new LocalScript({ executeCommand: 'node ./scripts/optimize-images.js' });
  const assets = new HostingBucket({ uploadDirectoryPath: './public' });

  return {
    scripts: { optimizeAssets },
    hooks: {
      beforeBucketSync: [{ scriptName: 'optimizeAssets' }]
    },
    resources: { assets }
  };
});
```

## Property: `beforeDelete`

- Required: no
- Type: `Array<NamedScriptLifecycleHook>`

Scripts to run before deleting the stack. Common use: export data, clean up external resources.

Only runs when `--configPath` and `--stage` are provided to the delete command.

### Example 1 (yaml)

```yaml
scripts:
  exportData:
    type: local-script
    properties:
      executeCommand: node ./scripts/export-data.js
      connectTo:
        - mainDb
hooks:
  beforeDelete:
    - scriptName: exportData
resources:
  mainDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, RdsEnginePostgres, LocalScript, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const exportData = new LocalScript({ executeCommand: 'node ./scripts/export-data.js', connectTo: [mainDb] });

  return {
    scripts: { exportData },
    hooks: {
      beforeDelete: [{ scriptName: 'exportData' }]
    },
    resources: { mainDb }
  };
});
```

## Property: `beforeDeploy`

- Required: no
- Type: `Array<NamedScriptLifecycleHook>`

Scripts to run before deploying. Common use: build frontend, lint code.

### Example 1 (yaml)

```yaml
scripts:
  buildFrontend:
    type: local-script
    properties:
      executeCommand: npm run build
hooks:
  beforeDeploy:
    - scriptName: buildFrontend
resources:
  web:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
```

### Example 2 (typescript)

```typescript
import { HostingBucket, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const buildFrontend = new LocalScript({ executeCommand: 'npm run build' });
  const web = new HostingBucket({ uploadDirectoryPath: './dist' });

  return {
    scripts: { buildFrontend },
    hooks: {
      beforeDeploy: [{ scriptName: 'buildFrontend' }]
    },
    resources: { web }
  };
});
```

## Property: `beforeDev`

- Required: no
- Type: `Array<NamedScriptLifecycleHook>`

Scripts to run before starting dev mode.

### Example 1 (yaml)

```yaml
scripts:
  seedLocalDb:
    type: local-script
    properties:
      executeCommand: node ./scripts/seed.js
hooks:
  beforeDev:
    - scriptName: seedLocalDb
resources:
  cache:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: key
          type: string
```

### Example 2 (typescript)

```typescript
import { DynamoDbTable, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const seedLocalDb = new LocalScript({ executeCommand: 'node ./scripts/seed.js' });
  const cache = new DynamoDbTable({ primaryKey: { partitionKey: { name: 'key', type: 'string' } } });

  return {
    scripts: { seedLocalDb },
    hooks: {
      beforeDev: [{ scriptName: 'seedLocalDb' }]
    },
    resources: { cache }
  };
});
```
