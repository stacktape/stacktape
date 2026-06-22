# Convex

Stacktape's Convex resource provisions a complete self-hosted [Convex](https://www.convex.dev) backend on your AWS account — the Rust-based reactive database server, a PostgreSQL database, five S3 buckets for internal storage, an Application Load Balancer for HTTPS and WebSocket traffic, and an optional admin dashboard. After each deploy, Stacktape automatically pushes your Convex functions to the running backend.

The smallest viable Convex configuration (single-AZ `db.t4g.micro` Postgres, 0.5 vCPU / 1 GB Fargate backend, 0.25 vCPU / 512 MB dashboard, ALB, S3) costs approximately **$45–65/month idle**.

## When to use

Self-hosted Convex is the right choice when you want Convex's reactive programming model — real-time queries, transactional mutations, and built-in file storage — but need to run on your own AWS infrastructure. Common reasons:

- **Data residency or compliance** — your data must stay in a specific AWS region or account you control.
- **Cost control at scale** — Convex Cloud pricing scales with usage; self-hosting on Fargate and RDS gives predictable monthly costs.
- **Internal or air-gapped deployments** — environments where a SaaS dependency is not acceptable.
- **Full observability** — you want CloudWatch logs, metrics, and [alarms](/observability/alarms) integrated with the rest of your Stacktape stack.

## When NOT to use

- **You don't need Convex's reactive model.** If you need a standard REST or GraphQL API with a database, use a [Lambda function](/resources/compute/lambda-function) or [web service](/resources/compute/web-service) with a [relational database](/resources/databases/relational-database) or [DynamoDB](/resources/databases/dynamodb). These are simpler and cheaper.
- **Managed Convex Cloud works for your use case.** Convex Cloud handles scaling, backups, and operations for you. If you don't have compliance, cost, or data residency constraints, it's the easier path.
- **You need horizontal scaling.** The open-source Convex backend is single-process — it cannot run multiple replicas against the same database. A single 4 vCPU / 8 GB backend handles thousands of concurrent reactive subscribers, but if you need to scale beyond that, managed Convex Cloud is the only option.
- **You're cost-sensitive for development stages.** Even idle, the smallest Convex deployment costs ~$45–65/month (ALB + RDS + Fargate). For dev/staging, consider using Convex Cloud's free tier instead.

## Basic example

A minimal Convex deployment uses the `Convex` class from the `stacktape` package. The only required property is `appDirectory` — the path to your `convex/` directory. Backend resources default to `{ cpu: 0.5, memory: 1024 }` and dashboard resources default to `{ cpu: 0.25, memory: 512 }`, but specifying them explicitly is recommended for production clarity.


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';
export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    backend: {
      resources: {
        cpu: 0.5,
        memory: 1024
      }
    },
    dashboard: {
      resources: {
        cpu: 0.25,
        memory: 512
      }
    }
  });

  return {
    resources: { myConvex }
  };
});
```


With the dashboard enabled (the default), this provisions the full Convex stack: a backend container on ECS Fargate, a PostgreSQL database (`db.t4g.micro` by default), five S3 buckets, an Application Load Balancer, and the admin dashboard. Set `dashboard.enabled` to `false` to skip the dashboard container and reduce cost. The `appDirectory` points to the directory containing your `schema.ts` and Convex function files.

After the infrastructure is healthy, Stacktape runs `npx convex deploy` against the configured `appDirectory` to push your function code to the backend. The admin key is managed by Stacktape and resolved from AWS Secrets Manager — Stacktape enables ECS Exec internally because it is required to generate the key after the backend starts.

## Examples

### Production with custom domains

A production Convex deployment typically uses [custom domains](/resources/networking/custom-domains) for stable URLs, enables deletion protection, and restricts dashboard access to a known IP range. Each domain must have a Route53 hosted zone in your AWS account.


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';
export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    backend: {
      resources: {
        cpu: 2,
        memory: 4096
      }
    },
    dashboard: {
      resources: {
        cpu: 0.25,
        memory: 512
      },
      allowedIpRanges: ['203.0.113.0/24']
    },
    customDomains: {
      cloud: { domainName: 'api.myapp.com' },
      site: { domainName: 'webhooks.myapp.com' },
      dashboard: { domainName: 'convex-admin.myapp.com' }
    },
    deletionProtection: true,
    storage: {
      versioning: true
    },
    database: {
      automatedBackupRetentionDays: 7
    }
  });

  return {
    resources: { myConvex }
  };
});
```


The `cloud` domain is where frontend clients connect via the `convex-js` SDK. The `site` domain serves your `httpAction()` routes (webhooks, OAuth callbacks). Because the dashboard is enabled in this example, the `dashboard` domain is included — it serves the admin UI. If you disable the dashboard with `dashboard.enabled: false`, omit the `dashboard` domain. Deletion protection prevents accidental deletion of the underlying database and five storage buckets. The `storage.versioning` setting keeps previous versions of objects across all five internal S3 buckets for recovery.

### Passing the Convex URL to other workloads

Use `$ResourceParam` to pass the Convex cloud origin URL to another workload as an environment variable. The Convex client SDK uses this URL as its backend origin.


Example (TypeScript):

```typescript
import { defineConfig, Convex, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    backend: {
      resources: {
        cpu: 1,
        memory: 2048
      }
    },
    dashboard: {
      resources: {
        cpu: 0.25,
        memory: 512
      }
    }
  });

  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    environment: {
      CONVEX_URL: "$ResourceParam('myConvex', 'url')"
    }
  });

  return {
    resources: { myConvex, api }
  };
});
```


The `$ResourceParam('myConvex', 'url')` [directive](/configuration/directives) resolves to the cloud origin URL at deploy time. The same `$ResourceParam` pattern can be used anywhere Stacktape config accepts [directive](/configuration/directives) values — including [Next.js](/resources/frontend/nextjs), [Astro](/resources/frontend/astro), and other frontend resources' `environment` entries.

## Functions deployment

After infrastructure is provisioned, Stacktape automatically runs `npx convex deploy --codegen disable --typecheck try` from the project directory containing `appDirectory`, with `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY` injected into the command environment. Use the `functionsDeployment` property to customize or disable this step.


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';
export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    backend: {
      resources: { cpu: 1, memory: 2048 }
    },
    dashboard: {
      resources: { cpu: 0.25, memory: 512 }
    },
    functionsDeployment: {
      command: 'pnpm convex deploy --codegen disable'
    }
  });

  return {
    resources: { myConvex }
  };
});
```


Set `enabled` to `false` if your CI/CD pipeline deploys Convex functions separately. Use `command` to specify a custom deploy command (e.g., using `pnpm` or `bunx` instead of `npx`). Use `workingDirectory` to override the directory from which the command runs — by default, Stacktape uses the parent directory of `appDirectory`.

## What gets provisioned

A single Convex resource creates the following nested AWS resources:

| Component | AWS service | Purpose |
|---|---|---|
| Backend | ECS Fargate (or EC2) task | The Rust-based convex-backend process — handles queries, mutations, subscriptions, and file operations |
| Dashboard | ECS Fargate task | Stateless Next.js admin UI — data browser, log viewer, function REPL, env-var manager, snapshot export/import |
| Database | RDS PostgreSQL | Persistent storage for Convex's transactional data |
| 5 S3 buckets | S3 | Internal storage for `modules`, `files`, `search`, `exports`, and `snapshot_imports` |
| Load balancer | Application Load Balancer | Uses ALB default DNS with port-based routing: 3210 for cloud, 3211 for site, and 6791 for dashboard |

All nested resources are managed by Stacktape — you don't configure them individually. The Convex resource exposes focused override knobs for the backend, dashboard, database, and storage.

## Backend

The backend container runs the Convex server process. All client queries, mutations, actions, and reactive subscriptions flow through it. Container logs are sent to CloudWatch — view them with [`stacktape logs`](/cli/logs).

### Compute resources

Backend resources control the CPU and memory available to the Convex server. Defaults to `{ cpu: 0.5, memory: 1024 }` — sufficient for development but undersized for production traffic. The `cpu` property sets vCPU count and `memory` sets RAM in MB, following Fargate's allowed combinations.


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';
export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    backend: {
      resources: {
        cpu: 2,
        memory: 4096
      }
    },
    dashboard: {
      resources: { cpu: 0.25, memory: 512 }
    }
  });

  return {
    resources: { myConvex }
  };
});
```


Sizing guidance from the Convex self-hosted documentation:

| Use case | CPU | Memory | Notes |
|---|---|---|---|
| Dev / hobby | 0.5 vCPU | 1024 MB | A few dozen concurrent users |
| Production baseline | 1 vCPU | 2048 MB | Hundreds of concurrent reactive subscribers |
| Heavier production | 2 vCPU | 4096 MB | Thousands of subscribers, vector search |
| Large-scale | 4 vCPU | 8192 MB | Upper end of single-process Convex capacity |

### Single-process constraint

The open-source Convex backend is single-process. Running two backends against the same PostgreSQL database would corrupt MVCC transaction validation and break reactive query invalidation. Stacktape enforces exactly one backend task — there is no horizontal scaling option.

Scale **vertically** by increasing `cpu` and `memory`. A single 4 vCPU / 8 GB backend comfortably handles thousands of concurrent reactive subscribers per Convex's self-hosted guidance. If you outgrow that, managed Convex Cloud is the path forward.

### Fargate vs EC2

Backend and dashboard resources use the generic container workload resources config. For Fargate (the default), specify `cpu` and `memory` to set the container size. For EC2, specify `instanceTypes` instead — CPU and memory are derived from the instance type. EC2 is typically cheaper per vCPU-hour and supports warm pools for faster task replacement.


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';
export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    backend: {
      resources: {
        instanceTypes: ['c6g.large'],
        enableWarmPool: true
      }
    },
    dashboard: {
      resources: { cpu: 0.25, memory: 512 }
    }
  });

  return {
    resources: { myConvex }
  };
});
```


The `instanceTypes` property accepts an array of EC2 instance type strings. Use Graviton-based instances (e.g., `c6g`, `m6g`, `r6g` families) for the best price-to-performance ratio. When using `instanceTypes`, `cpu` and `memory` are derived from the instance type. Setting `enableWarmPool` to `true` keeps a pre-initialized instance ready for faster starts — only works with a single instance type.

For most Convex deployments, Fargate is simpler and sufficient. Switch to EC2 if you're running a production workload where the per-vCPU savings justify the added complexity.

### Backend image

Stacktape defaults to a known-good backend image currently from `ghcr.io/get-convex/convex-backend`. Use `backend.image` to test a newer or older version. Image upgrades trigger Convex's built-in migration path.


> **Warning:** Upgrading the Convex backend image can trigger data migrations. Test upgrades on a staging stage before applying to production.


## Dashboard

The admin dashboard is a stateless Next.js app (~$3–5/month at default sizing) that provides a data browser, log viewer, function REPL, environment variable manager, and snapshot export/import UI. It is enabled by default.

### Dashboard resources

Dashboard resources default to `{ cpu: 0.25, memory: 512 }`, which is sufficient for most teams. The dashboard is a lightweight Next.js app — you rarely need to increase these values.


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';
export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    backend: {
      resources: { cpu: 1, memory: 2048 }
    },
    dashboard: {
      resources: {
        cpu: 0.25,
        memory: 512
      }
    }
  });

  return {
    resources: { myConvex }
  };
});
```


### Restricting dashboard access

The dashboard has no built-in authentication. The admin key, which you paste on login, is the only security barrier. For defense-in-depth, restrict `dashboard.allowedIpRanges` to office or VPN CIDR ranges — especially for production stages.


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';
export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    backend: {
      resources: { cpu: 1, memory: 2048 }
    },
    dashboard: {
      resources: { cpu: 0.25, memory: 512 },
      allowedIpRanges: ['203.0.113.0/24', '198.51.100.42/32']
    }
  });

  return {
    resources: { myConvex }
  };
});
```


The `allowedIpRanges` property accepts CIDR notation. Only traffic from these ranges can reach the dashboard. Without this property, the dashboard is internet-reachable. For production stages, always set IP restrictions and use [custom domains](/resources/networking/custom-domains) with HTTPS.

### Disabling the dashboard

Set `dashboard.enabled` to `false` to skip provisioning the dashboard container entirely. This saves ~$3–5/month but makes operating the deployment harder — you lose the data browser, log viewer, and snapshot UI. Disable only if you're comfortable managing everything through the `npx convex` CLI tools. When the dashboard is disabled, `customDomains.dashboard` is not required.


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';
export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    backend: {
      resources: { cpu: 1, memory: 2048 }
    },
    dashboard: {
      enabled: false
    }
  });

  return {
    resources: { myConvex }
  };
});
```


### Dashboard image

Stacktape defaults to a known-good dashboard image currently from `ghcr.io/get-convex/convex-dashboard`. Use `dashboard.image` to pin a specific version — for example, to test a newer release or roll back to a known-good one. In most cases, leave this unset and let Stacktape manage the image version.

## Database

Every Convex deployment requires a PostgreSQL database for transactional storage. Stacktape provisions a single-AZ RDS PostgreSQL 16 instance on `db.t4g.micro` by default (~$13/month) with 20 GB storage, 1-day backup retention, and `scoping-workloads-in-vpc` accessibility. The Convex backend is the only workload that can reach the database.


> **Info:** You cannot bring an existing external database — Convex assumes it owns its PostgreSQL instance entirely. The database is an internal implementation detail of the Convex deployment.


### Engine options

`database.engine` accepts `RdsEngine`, `AuroraServerlessV2Engine`, or `AuroraEngine` variants. Convex requires PostgreSQL 13 or later — use a PostgreSQL engine for all three. See the [relational database page](/resources/databases/relational-database) for full engine class documentation.

| Engine | Best for | Idle cost context |
|---|---|---|
| **RDS PostgreSQL** (default) | Predictable workloads, lowest idle cost | ~$13/month for `db.t4g.micro` |
| **Aurora Serverless v2** | Variable workloads, auto-scales 0.5–8 ACU | Higher idle cost than standard RDS due to minimum ACU billing |
| **Aurora** (provisioned) | High availability, multi-AZ failover | Varies by instance class |

The default (PostgreSQL 16 on `db.t4g.micro`) is the cheapest production-viable option. Aurora Serverless v2 is the right choice when your Convex workload has highly variable traffic — it auto-scales between 0.5 and 8 ACU, but idle cost is higher than standard RDS. Aurora provisioned is suited for production workloads that need multi-AZ failover, at the cost of fixed instance pricing. Most Convex deployments should start with the default RDS engine.

### Other database overrides

The `database` property also supports:

- **`automatedBackupRetentionDays`** — days to keep automated daily backups (0–35). Defaults to 1. Set higher for production.
- **`preferredMaintenanceWindow`** — UTC window for RDS maintenance (e.g., `Sun:02:00-Sun:04:00`).
- **`logging`** — enable PostgreSQL connection logs, slow query logs, or error logs.
- **`accessibility`** — defaults to `scoping-workloads-in-vpc` (backend-only access). Changing to `internet` is almost always wrong for Convex — use the dashboard or `npx convex export` for data access.

## Storage

Convex uses five separate S3 buckets internally: `modules`, `files`, `search`, `exports`, and `snapshot_imports`. The `storage` property applies shared configuration to all five buckets at once. By default, all buckets are private, encrypted at rest (AES-256), and versioning is disabled. Per-bucket overrides are not exposed.


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';
export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    backend: {
      resources: { cpu: 1, memory: 2048 }
    },
    dashboard: {
      resources: { cpu: 0.25, memory: 512 }
    },
    storage: {
      versioning: true
    }
  });

  return {
    resources: { myConvex }
  };
});
```


Enable `versioning` for production stages to keep previous versions of overwritten or deleted objects. This is useful for recovery but increases storage cost. You can also configure `lifecycleRules` to auto-delete or transition objects to cheaper storage classes — most useful for the `exports` bucket if you don't want old snapshot exports accumulating. `lifecycleRules` accepts expiration rules, non-current-version expiration rules, storage-class transition rules, non-current-version transition rules, and abort-incomplete-multipart-upload rules; the same rule set applies to all five Convex buckets.

## Custom domains

Convex exposes three distinct HTTP origins that serve different purposes. If `customDomains` is omitted entirely, Stacktape uses the ALB's default DNS with port-based routing: 3210 for cloud, 3211 for site, and 6791 for dashboard. Port-based routing works for dev/staging but is not recommended for production — the ALB DNS is unstable across stack recreations, and clients hard-code the URL.

| Origin | Port | Purpose | Example domain |
|---|---|---|---|
| **cloud** | 3210 | API + WebSocket endpoint. Frontend `convex-js` clients connect here. | `api.myapp.com` |
| **site** | 3211 | HTTP-actions endpoint. User-defined `httpAction()` routes (webhooks, OAuth callbacks). | `webhooks.myapp.com` |
| **dashboard** | 6791 | Admin dashboard UI. | `convex-admin.myapp.com` |

If you set `customDomains`, `cloud` and `site` are required. When the dashboard is enabled (the default), `dashboard` is also required. If you do not want a dashboard domain, disable the dashboard with `dashboard.enabled: false`.

Each domain must have a Route53 hosted zone in your AWS account. By default, Stacktape creates the DNS record and provisions a free TLS certificate. Use `customCertificateArn` if you need to provide your own certificate (e.g., EV/OV certs). Set `disableDnsRecordCreation: true` on a domain if you manage DNS records yourself (e.g., through Cloudflare). See [custom domains](/resources/networking/custom-domains) for more details.

## Deletion protection

Set `deletionProtection` to `true` to prevent accidental deletion of the underlying database and five storage buckets. When enabled, Stacktape sets deletion protection on the RDS instance and retention policies on the S3 buckets. To delete the stack, first set `deletionProtection` to `false`, redeploy, and then delete. Defaults to `false`.


> **Tip:** Enable deletion protection for all production stages. The small inconvenience of a two-step delete process is worth preventing accidental data loss.


## Alarms

The Convex resource accepts `ApplicationLoadBalancerAlarm` and `RelationalDatabaseAlarm` [alarm](/observability/alarms) triggers, covering ALB health and database performance metrics. Alarms are merged with global alarms from the Stacktape Console. Use `disabledGlobalAlarms` to exclude specific global alarm names from this deployment. See [alarms](/observability/alarms) for available trigger types and configuration details.

## Dev mode

During [`stacktape dev`](/local-development/dev-mode-overview), the Convex resource runs locally in Docker by default with SQLite and local filesystem storage. Local mode is recommended because Convex's save-push-reload loop is noticeably faster over loopback than across the WAN, and avoids 24/7 Fargate + RDS cost per developer.

Set `dev.remote` to `true` to point dev mode at the deployed AWS backend instead. The deployed backend must already exist before using remote dev mode. Use this when local emulation doesn't match production behavior closely enough, or when you need to work with real data.


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';
export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    backend: {
      resources: { cpu: 1, memory: 2048 }
    },
    dashboard: {
      resources: { cpu: 0.25, memory: 512 }
    },
    dev: {
      remote: true
    }
  });

  return {
    resources: { myConvex }
  };
});
```


Without `dev.remote: true`, Stacktape runs convex-backend in a local Docker container. This is the default and preferred workflow for local development — no AWS costs are incurred and iteration is fast. See [dev mode overview](/local-development/dev-mode-overview) for more on how dev mode works across resource types.

## Referencing parameters

Other resources in your stack can reference the Convex deployment's URLs and credentials using the [`$ResourceParam` directive](/configuration/directives). For example, `$ResourceParam('myConvex', 'url')` resolves to the cloud origin URL that frontend clients pass to the `convex-js` client's `ConvexProvider`. Sensitive parameters like `adminKey` and `instanceSecret` resolve from AWS Secrets Manager. Pass these values to consuming workloads through explicit `environment` entries — see the [Passing the Convex URL to other workloads](#passing-the-convex-url-to-other-workloads) example above.


## Referenceable Parameters: `convex`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `url` | Cloud origin (CONVEX_CLOUD_ORIGIN) used by frontend clients. | `$ResourceParam("<<resource-name>>", "url")` |
| `siteUrl` | HTTP-actions origin (CONVEX_SITE_ORIGIN) where httpAction() routes live. | `$ResourceParam("<<resource-name>>", "siteUrl")` |
| `dashboardUrl` | Admin dashboard URL. Only available when the dashboard is enabled. | `$ResourceParam("<<resource-name>>", "dashboardUrl")` |
| `adminKey` | Sensitive root credentials for the deployment, resolved from AWS Secrets Manager. Reference explicitly with $ResourceParam; never auto-injected by connectTo. | `$ResourceParam("<<resource-name>>", "adminKey")` |
| `instanceSecret` | Sensitive boot secret stored in AWS Secrets Manager. Almost never needed by user code. | `$ResourceParam("<<resource-name>>", "instanceSecret")` |


## API Reference


## API Reference: `ConvexProps`
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

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `appDirectory` | yes | `string` | Path to the `convex/` directory in your project. After each `stacktape deploy`, Stacktape runs `npx convex deploy` from the parent project directory
against the freshly-deployed backend.

Example: `appDirectory: './convex'` | - |
| `alarms` | no | `Array<ApplicationLoadBalancerAlarm \| RelationalDatabaseAlarm>` | Alarms for this Convex deployment (backend container, ALB, database). Merged with global
alarms from the Stacktape Console. | - |
| `backend` | no | `ConvexBackendConfig` | Configuration for the Convex backend container (the Rust server process). | - |
| `customDomains` | no | `ConvexCustomDomains` | Custom domains for the Convex backend. Convex exposes two distinct origins that the outside world reaches:

**`cloud`** — the API + WebSocket endpoint (`CONVEX_CLOUD_ORIGIN`). All client traffic
(queries, mutations, actions, reactive subscriptions) hits this URL via the `convex-js`
client. Required.
**`site`** — the HTTP-actions endpoint (`CONVEX_SITE_ORIGIN`). User-defined `httpAction()`
routes (webhooks, OAuth callbacks, etc.) live here. Kept separate from `cloud` so webhook
URLs don&#39;t collide with internal API paths. Required.
**`dashboard`** — required when `dashboard.enabled` is `true`. The dashboard serves at this domain.

Each domain must have a Route53 hosted zone in your AWS account. Stacktape provisions free
TLS certificates and DNS records automatically.

If `customDomains` is omitted entirely, the ALB&#39;s default DNS is used with port-based routing
(3210 cloud, 3211 site, 6791 dashboard). Fine for dev/staging; **not recommended for
production** — the ALB DNS is unstable across stack recreations, and clients hard-code the URL. | - |
| `dashboard` | no | `ConvexDashboardConfig` | Configuration for the Convex admin dashboard. Enabled by default. The dashboard is a stateless Next.js app that talks to the backend&#39;s
REST API using the admin key (which you paste on first login). To opt out, set
`dashboard.enabled: false`. | - |
| `database` | no | `ConvexDatabaseConfig` | Override the PostgreSQL database that backs the Convex deployment. Defaults to a single-AZ RDS PostgreSQL `db.t4g.micro` instance (cheapest production-viable
option, ~$13/month). The shape mirrors a subset of [`relational-database`](/resources/relational-databases/) — override only what
you need. Common reasons to override: bump to Aurora Serverless v2 for auto-scaling, enable
multi-AZ for HA, or increase storage retention.

You cannot bring an existing external database — Convex assumes it owns its Postgres entirely. | - |
| `deletionProtection` | no | `boolean` | Prevent accidental deletion of the database and the five storage buckets. When `true`, Stacktape sets `deletionProtection` on the underlying RDS instance and retention
policies on the buckets. You must set this to `false` and redeploy before you can delete the stack.

Recommended for production stages. | `false` |
| `dev` | no | `DevModeConfig` | Dev mode: runs the convex-backend locally in Docker by default with SQLite + local
filesystem storage. Set `remote: true` to point `stacktape dev` at the deployed AWS backend instead. Local mode
is recommended because Convex&#39;s save-push-reload loop is noticeably faster over loopback than
across the WAN, and avoids 24/7 Fargate + RDS cost per developer. | - |
| `disabledGlobalAlarms` | no | `Array<string>` | Global alarm names to exclude from this deployment. | - |
| `functionsDeployment` | no | `ConvexFunctionsDeploymentConfig` | How Stacktape deploys Convex functions after infrastructure is ready. By default, Stacktape runs `npx convex deploy --codegen disable --typecheck try` from the
project directory containing `appDirectory`, with `CONVEX_SELF_HOSTED_URL` and
`CONVEX_SELF_HOSTED_ADMIN_KEY` injected automatically.

Set `enabled: false` if your CI/CD pipeline deploys functions separately, or set `command`
when your project uses a custom package-manager command. | - |
| `storage` | no | `ConvexStorageConfig` | Shared configuration applied to all five Convex S3 buckets (`modules`, `files`, `search`,
`exports`, `snapshot_imports`). Each Convex deployment requires five separate buckets internally. By default they are all
private, encrypted at rest, with versioning disabled. Use this property to override defaults
across all five at once (e.g., enable versioning for prod). | - |


## FAQ

### How much does a self-hosted Convex deployment cost on AWS?

The minimum viable configuration costs approximately $45–65/month idle. The main cost drivers are the Application Load Balancer, the RDS PostgreSQL instance (~$13/month for `db.t4g.micro`), and Fargate compute for the backend and dashboard (~$3–5/month for the dashboard alone at 0.25 vCPU / 512 MB). Production configurations with larger backend containers scale up from there. Compare this to Convex Cloud's usage-based pricing to decide which model suits your traffic pattern.

### Self-hosted Convex vs managed Convex Cloud — when should I self-host?

Self-host when you need data residency in a specific AWS region, have compliance requirements around data ownership, want predictable costs at scale, or can't depend on external SaaS services. Convex Cloud is the better choice for most teams — it handles scaling, backups, zero-downtime upgrades, and operations automatically, and has a free tier. Self-hosting trades operational simplicity for full infrastructure control.

### Can I scale the Convex backend horizontally?

No. The open-source Convex backend is single-process. Running multiple backend replicas against the same PostgreSQL database would corrupt transaction validation and break reactive query invalidation. Scale vertically by increasing `cpu` and `memory`, or switch to larger EC2 instances. A single 4 vCPU / 8 GB backend handles thousands of concurrent reactive subscribers per Convex's self-hosted guidance.

### How do I restrict access to the Convex dashboard?

The dashboard has no built-in authentication — the admin key, which you paste on login, is the only security barrier. For defense-in-depth, use `dashboard.allowedIpRanges` to restrict network access to specific CIDR ranges (e.g., your office or VPN IP). For production deployments, combine IP restrictions with [custom domains](/resources/networking/custom-domains) and HTTPS. Alternatively, disable the dashboard entirely with `dashboard.enabled: false` and manage the deployment through the `npx convex` CLI tools.

### How do I back up my Convex data?

The underlying RDS PostgreSQL database has automated daily backups with 1-day retention by default. Increase `database.automatedBackupRetentionDays` (up to 35) for production stages. For application-level backups, the Convex tooling provides `npx convex export` to create portable snapshots. Enabling `storage.versioning` on the S3 buckets provides object-level recovery for files stored through Convex's file storage API.

### Can I point Convex at my existing PostgreSQL database?

No. Convex assumes it owns its PostgreSQL instance entirely and manages its own databases inside the cluster, so you cannot bring an external database — the RDS instance is an internal implementation detail of the Convex deployment. You can, however, change the database engine via `database.engine` (RDS PostgreSQL by default, or Aurora Serverless v2 for highly variable traffic at higher idle cost). Convex requires PostgreSQL 13 or later, so use a PostgreSQL engine variant.

### Does dev mode run against my deployed AWS backend or locally?

By default, [`stacktape dev`](/local-development/dev-mode-overview) runs convex-backend locally in Docker with SQLite and local filesystem storage — no AWS costs, and the save-push-reload loop is faster over loopback than across the WAN. Set `dev.remote: true` to connect to the deployed AWS backend instead, which requires the stage to already exist; use this when local emulation doesn't match production behavior or you need real data. See [dev mode overview](/local-development/dev-mode-overview) for details.
