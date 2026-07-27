# ConvexProps API Reference

## TypeScript definition

```typescript
import type { ApplicationLoadBalancerAlarm, ConvexBackendConfig, ConvexCustomDomains, ConvexDashboardConfig, ConvexDatabaseConfig, ConvexFunctionsDeploymentConfig, ConvexStorageConfig, DevModeConfig, RelationalDatabaseAlarm } from 'stacktape';

type ConvexProps = {
  /** Path to the convex/ directory in your project. */
  appDirectory: string;
  /** Alarms for this Convex deployment (backend container, ALB, database). Merged with global
alarms from the Stacktape Console. */
  alarms?: Array<ConvexAlarms>;
  /** Configuration for the Convex backend container (the Rust server process). */
  backend?: ConvexBackendConfig;
  /** Custom domains for the Convex backend. */
  customDomains?: ConvexCustomDomains;
  /** Configuration for the Convex admin dashboard. */
  dashboard?: ConvexDashboardConfig;
  /** Override the PostgreSQL database that backs the Convex deployment. */
  database?: ConvexDatabaseConfig;
  /** Prevent accidental deletion of the database and the five storage buckets. */
  deletionProtection?: boolean;
  /** Dev mode: runs the convex-backend locally in Docker by default with SQLite + local
filesystem storage. */
  dev?: DevModeConfig;
  /** Global alarm names to exclude from this deployment. */
  disabledGlobalAlarms?: Array<string>;
  /** How Stacktape deploys Convex functions after infrastructure is ready. */
  functionsDeployment?: ConvexFunctionsDeploymentConfig;
  /** Shared configuration applied to all five Convex S3 buckets (modules, files, search,
exports, snapshot_imports). */
  storage?: ConvexStorageConfig;
};

/** Union choices used by the properties above. */
type ConvexAlarms =
  | ApplicationLoadBalancerAlarm
  | RelationalDatabaseAlarm;
```

## Property: `appDirectory`

- Required: yes
- Type: `string`

Path to the `convex/` directory in your project.

After each `stacktape deploy`, Stacktape runs `npx convex deploy` from the parent project directory
against the freshly-deployed backend.

Example: `appDirectory: './convex'`

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      backend:
        resources:
          cpu: 1
          memory: 2048
      database:
        engine:
          type: postgres
          properties:
            version: '16.6'
            primaryInstance:
              instanceSize: db.t4g.small
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    backend: {
      resources: {
        cpu: 1,
        memory: 2048
      }
    },
    database: {
      engine: {
        type: 'postgres',
        properties: {
          version: '16.6',
          primaryInstance: {
            instanceSize: 'db.t4g.small'
          }
        }
      }
    }
  });
  return { resources: { backend } };
});
```

## Property: `alarms`

- Required: no
- Type: `Array<ApplicationLoadBalancerAlarm | RelationalDatabaseAlarm>`

Alarms for this Convex deployment (backend container, ALB, database). Merged with global
alarms from the Stacktape Console.

Choices:
- `ApplicationLoadBalancerAlarm` (`ApplicationLoadBalancerAlarm`). Properties: `trigger: application-load-balancer-custom | application-load-balancer-error-rate | application-load-balancer-unhealthy-targets`, `evaluation?: AlarmEvaluation`, `notificationTargets?: Array<ms-teams | slack | email | discord | webhook>`, `includeInHistory?: boolean`, `description?: string`.
- `RelationalDatabaseAlarm` (`RelationalDatabaseAlarm`). Properties: `trigger: database-read-latency | database-write-latency | database-cpu-utilization | database-free-storage | database-free-memory | database-connection-count`, `evaluation?: AlarmEvaluation`, `notificationTargets?: Array<ms-teams | slack | email | discord | webhook>`, `includeInHistory?: boolean`, `description?: string`.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      alarms:
        - trigger:
            type: database-cpu-utilization
            properties:
              thresholdPercent: 85
        - trigger:
            type: application-load-balancer-unhealthy-targets
            properties:
              thresholdPercent: 50
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    alarms: [
      {
        trigger: {
          type: 'database-cpu-utilization',
          properties: {
            thresholdPercent: 85
          }
        }
      },
      {
        trigger: {
          type: 'application-load-balancer-unhealthy-targets',
          properties: {
            thresholdPercent: 50
          }
        }
      }
    ]
  });
  return { resources: { backend } };
});
```

## Property: `backend`

- Required: no
- Type: `ConvexBackendConfig`

Configuration for the Convex backend container (the Rust server process).

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      backend:
        resources:
          cpu: 2
          memory: 4096
        logging:
          retentionDays: 30
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    backend: {
      resources: {
        cpu: 2,
        memory: 4096
      },
      logging: {
        retentionDays: 30
      }
    }
  });
  return { resources: { backend } };
});
```

## Property: `customDomains`

- Required: no
- Type: `ConvexCustomDomains`

Custom domains for the Convex backend.

Convex exposes two distinct origins that the outside world reaches:

**`cloud`** — the API + WebSocket endpoint (`CONVEX_CLOUD_ORIGIN`). All client traffic
(queries, mutations, actions, reactive subscriptions) hits this URL via the `convex-js`
client. Required.
**`site`** — the HTTP-actions endpoint (`CONVEX_SITE_ORIGIN`). User-defined `httpAction()`
routes (webhooks, OAuth callbacks, etc.) live here. Kept separate from `cloud` so webhook
URLs don't collide with internal API paths. Required.
**`dashboard`** — required when `dashboard.enabled` is `true`. The dashboard serves at this domain.

Each domain must have a Route53 hosted zone in your AWS account. Stacktape provisions free
TLS certificates and DNS records automatically.

If `customDomains` is omitted entirely, the ALB's default DNS is used with port-based routing
(3210 cloud, 3211 site, 6791 dashboard). Fine for dev/staging; **not recommended for
production** — the ALB DNS is unstable across stack recreations, and clients hard-code the URL.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      dashboard:
        enabled: true
      customDomains:
        cloud:
          domainName: api.myapp.com
        site:
          domainName: webhooks.myapp.com
        dashboard:
          domainName: convex-admin.myapp.com
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    dashboard: {
      enabled: true
    },
    customDomains: {
      cloud: {
        domainName: 'api.myapp.com'
      },
      site: {
        domainName: 'webhooks.myapp.com'
      },
      dashboard: {
        domainName: 'convex-admin.myapp.com'
      }
    }
  });
  return { resources: { backend } };
});
```

## Property: `dashboard`

- Required: no
- Type: `ConvexDashboardConfig`

Configuration for the Convex admin dashboard.

Enabled by default. The dashboard is a stateless Next.js app that talks to the backend's
REST API using the admin key (which you paste on first login). To opt out, set
`dashboard.enabled: false`.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      dashboard:
        enabled: true
        allowedIpRanges:
          - 203.0.113.0/24
        resources:
          cpu: 0.25
          memory: 512
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    dashboard: {
      enabled: true,
      allowedIpRanges: ['203.0.113.0/24'],
      resources: {
        cpu: 0.25,
        memory: 512
      }
    }
  });
  return { resources: { backend } };
});
```

## Property: `database`

- Required: no
- Type: `ConvexDatabaseConfig`

Override the PostgreSQL database that backs the Convex deployment.

Defaults to a single-AZ RDS PostgreSQL `db.t4g.micro` instance (cheapest production-viable
option, ~$13/month). The shape mirrors a subset of [`relational-database`](/resources/relational-databases/) — override only what
you need. Common reasons to override: bump to Aurora Serverless v2 for auto-scaling, enable
multi-AZ for HA, or increase storage retention.

You cannot bring an existing external database — Convex assumes it owns its Postgres entirely.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      database:
        engine:
          type: aurora-postgresql-serverless-v2
          properties:
            version: '16.6'
            minCapacity: 0.5
            maxCapacity: 4
        automatedBackupRetentionDays: 7
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    database: {
      engine: {
        type: 'aurora-postgresql-serverless-v2',
        properties: {
          version: '16.6',
          minCapacity: 0.5,
          maxCapacity: 4
        }
      },
      automatedBackupRetentionDays: 7
    }
  });
  return { resources: { backend } };
});
```

## Property: `deletionProtection`

- Required: no
- Type: `boolean`
- Default: `false`

Prevent accidental deletion of the database and the five storage buckets.

When `true`, Stacktape sets `deletionProtection` on the underlying RDS instance and retention
policies on the buckets. You must set this to `false` and redeploy before you can delete the stack.

Recommended for production stages.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      deletionProtection: true
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    deletionProtection: true
  });
  return { resources: { backend } };
});
```

## Property: `dev`

- Required: no
- Type: `DevModeConfig`

Dev mode: runs the convex-backend locally in Docker by default with SQLite + local
filesystem storage.

Set `remote: true` to point `stacktape dev` at the deployed AWS backend instead. Local mode
is recommended because Convex's save-push-reload loop is noticeably faster over loopback than
across the WAN, and avoids 24/7 Fargate + RDS cost per developer.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      dev:
        remote: true
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    dev: {
      remote: true
    }
  });
  return { resources: { backend } };
});
```

## Property: `disabledGlobalAlarms`

- Required: no
- Type: `Array<string>`

Global alarm names to exclude from this deployment.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      disabledGlobalAlarms:
        - high-db-connections
        - alb-5xx-rate
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    disabledGlobalAlarms: ['high-db-connections', 'alb-5xx-rate']
  });
  return { resources: { backend } };
});
```

## Property: `functionsDeployment`

- Required: no
- Type: `ConvexFunctionsDeploymentConfig`

How Stacktape deploys Convex functions after infrastructure is ready.

By default, Stacktape runs `npx convex deploy --codegen disable --typecheck try` from the
project directory containing `appDirectory`, with `CONVEX_SELF_HOSTED_URL` and
`CONVEX_SELF_HOSTED_ADMIN_KEY` injected automatically.

Set `enabled: false` if your CI/CD pipeline deploys functions separately, or set `command`
when your project uses a custom package-manager command.

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      functionsDeployment:
        enabled: true
        command: pnpm convex deploy --codegen disable
        workingDirectory: ./
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    functionsDeployment: {
      enabled: true,
      command: 'pnpm convex deploy --codegen disable',
      workingDirectory: './'
    }
  });
  return { resources: { backend } };
});
```

## Property: `storage`

- Required: no
- Type: `ConvexStorageConfig`

Shared configuration applied to all five Convex S3 buckets (`modules`, `files`, `search`,
`exports`, `snapshot_imports`).

Each Convex deployment requires five separate buckets internally. By default they are all
private, encrypted at rest, with versioning disabled. Use this property to override defaults
across all five at once (e.g., enable versioning for prod).

### Example 1 (yaml)

```yaml
resources:
  backend:
    type: convex
    properties:
      appDirectory: ./convex
      storage:
        encryption: true
        versioning: true
```

### Example 2 (typescript)

```typescript
import { Convex, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const backend = new Convex({
    appDirectory: './convex',
    storage: {
      encryption: true,
      versioning: true
    }
  });
  return { resources: { backend } };
});
```
