# DeploymentConfig API Reference

## TypeScript definition

```typescript
type DeploymentConfig = {
  /** IAM role for CloudFormation to assume during create/update/delete operations. */
  cloudformationRoleArn?: string;
  /** Keep the stack in a failed state instead of rolling back on deployment failure. */
  disableAutoRollback?: boolean;
  /** Disable faster uploads via S3 Transfer Acceleration. */
  disableS3TransferAcceleration?: boolean;
  /** How long (in minutes) to monitor rollback alarms after deployment completes. */
  monitoringTimeAfterDeploymentInMinutes?: number;
  /** How many old deployment artifacts (Lambda bundles, container images) to keep. */
  previousVersionsToKeep?: number;
  /** SNS topic ARNs to receive CloudFormation stack events during deployment. */
  publishEventsToArn?: Array<string>;
  /** Prevents accidental stack deletion. Must be disabled before you can delete. */
  terminationProtection?: boolean;
  /** Alarms that trigger automatic rollback if they fire during deployment. */
  triggerRollbackOnAlarms?: Array<string>;
};
```

## Property: `cloudformationRoleArn`

- Required: no
- Type: `string`

IAM role for CloudFormation to assume during create/update/delete operations.

Use this when your deploy user has limited permissions and CloudFormation needs
a more privileged role to manage resources. The role is persisted across deployments
and reused for delete/rollback even if removed from config later.

### Example 1 (yaml)

```yaml
deploymentConfig:
  cloudformationRoleArn: arn:aws:iam::123456789012:role/CloudFormationDeployRole
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    deploymentConfig: { cloudformationRoleArn: 'arn:aws:iam::123456789012:role/CloudFormationDeployRole' },
    resources: { api }
  };
});
```

## Property: `disableAutoRollback`

- Required: no
- Type: `boolean`
- Default: `false`

Keep the stack in a failed state instead of rolling back on deployment failure.

Useful for debugging: inspect what went wrong, then fix and redeploy
(or run `stacktape rollback` manually). By default, failed deployments
auto-rollback to the last working state.

### Example 1 (yaml)

```yaml
deploymentConfig:
  disableAutoRollback: true
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    deploymentConfig: { disableAutoRollback: true },
    resources: { api }
  };
});
```

## Property: `disableS3TransferAcceleration`

- Required: no
- Type: `boolean`
- Default: `false`

Disable faster uploads via S3 Transfer Acceleration.

Transfer Acceleration routes uploads through the nearest AWS edge location
for faster deploys, especially from distant regions. Adds a small cost per GB.
Automatically disabled in regions where it's not available.

### Example 1 (yaml)

```yaml
deploymentConfig:
  disableS3TransferAcceleration: true
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    deploymentConfig: { disableS3TransferAcceleration: true },
    resources: { api }
  };
});
```

## Property: `monitoringTimeAfterDeploymentInMinutes`

- Required: no
- Type: `number`
- Default: `0`

How long (in minutes) to monitor rollback alarms after deployment completes.

If an alarm fires during this window, the stack rolls back automatically.
Only useful when `triggerRollbackOnAlarms` is configured.

### Example 1 (yaml)

```yaml
deploymentConfig:
  triggerRollbackOnAlarms:
    - arn:aws:cloudwatch:eu-west-1:123456789012:alarm:high-error-rate
  monitoringTimeAfterDeploymentInMinutes: 15
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 }
  });

  return {
    deploymentConfig: {
      triggerRollbackOnAlarms: ['arn:aws:cloudwatch:eu-west-1:123456789012:alarm:high-error-rate'],
      monitoringTimeAfterDeploymentInMinutes: 15
    },
    resources: { api }
  };
});
```

## Property: `previousVersionsToKeep`

- Required: no
- Type: `number`
- Default: `10`

How many old deployment artifacts (Lambda bundles, container images) to keep.

Older versions are cleaned up automatically. Lower values save storage costs,
higher values make it easier to roll back to previous versions.

### Example 1 (yaml)

```yaml
deploymentConfig:
  previousVersionsToKeep: 3
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    deploymentConfig: { previousVersionsToKeep: 3 },
    resources: { api }
  };
});
```

## Property: `publishEventsToArn`

- Required: no
- Type: `Array<string>`

SNS topic ARNs to receive CloudFormation stack events during deployment.

Useful for monitoring deployments in external systems (Slack, PagerDuty, etc.).

### Example 1 (yaml)

```yaml
deploymentConfig:
  publishEventsToArn:
    - arn:aws:sns:eu-west-1:123456789012:deployment-events
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return {
    deploymentConfig: { publishEventsToArn: ['arn:aws:sns:eu-west-1:123456789012:deployment-events'] },
    resources: { api }
  };
});
```

## Property: `terminationProtection`

- Required: no
- Type: `boolean`
- Default: `false`

Prevents accidental stack deletion. Must be disabled before you can delete.

Recommended for production stacks. To delete a protected stack, first deploy with
`terminationProtection: false`, then run the delete command.

### Example 1 (yaml)

```yaml
deploymentConfig:
  terminationProtection: true
resources:
  prodDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      deletionProtection: true
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.r6g.large
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, RdsEnginePostgres, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const prodDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    deletionProtection: true,
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.r6g.large' } })
  });

  return {
    deploymentConfig: { terminationProtection: true },
    resources: { prodDb }
  };
});
```

## Property: `triggerRollbackOnAlarms`

- Required: no
- Type: `Array<string>`

Alarms that trigger automatic rollback if they fire during deployment.

Specify alarm names (from `alarms` section) or ARNs. The alarm must already exist -
a newly created alarm only takes effect on the *next* deployment.

Use with `monitoringTimeAfterDeploymentInMinutes` to keep watching after deploy completes.

### Example 1 (yaml)

```yaml
deploymentConfig:
  triggerRollbackOnAlarms:
    - arn:aws:cloudwatch:eu-west-1:123456789012:alarm:high-error-rate
  monitoringTimeAfterDeploymentInMinutes: 10
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 }
  });

  return {
    deploymentConfig: {
      triggerRollbackOnAlarms: ['arn:aws:cloudwatch:eu-west-1:123456789012:alarm:high-error-rate'],
      monitoringTimeAfterDeploymentInMinutes: 10
    },
    resources: { api }
  };
});
```
