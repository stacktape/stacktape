# Convex

The Convex resource runs a self-hosted [Convex](https://www.convex.dev) backend in your AWS account: the Convex server
on ECS, a PostgreSQL database on RDS, five S3 buckets for its storage, an Application Load Balancer for HTTPS and
WebSocket traffic, and the admin dashboard. After each deploy, Stacktape pushes your Convex functions to it.

It runs all the time. With the defaults, an idle deployment costs about $60 a month in us-east-1:

| Part | Default size | Per month |
|---|---|---|
| Backend | 0.5 vCPU, 1 GB on Fargate | about $18 |
| Dashboard | 0.25 vCPU, 0.5 GB on Fargate | about $9 |
| Database | `db.t4g.micro`, 20 GB | about $14 |
| Load balancer | Application Load Balancer | about $16 plus traffic |

Each container and the load balancer also pay $3.65 a month per public IPv4 address. Prices are x86 Fargate, RDS and
ELB on-demand rates for 730 hours ([Fargate pricing](https://aws.amazon.com/fargate/pricing/)).

Use it when your data must stay in your AWS account or you want Convex next to the rest of your stack. Otherwise
Convex's own cloud is cheaper to start with and runs the backend for you.

## Basic example

`appDirectory` points to your `convex/` directory, the one with `schema.ts` and your functions. It's the only required
property.


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


The deploy creates everything listed above, then runs `npx convex deploy` against `appDirectory` to push your functions.
Stacktape generates the admin key, stores it in AWS Secrets Manager and passes it to that command.

Without custom domains, the backend is served on a `*.stacktape-app.com` domain, on ports 3210 (client API), 3211
(HTTP actions) and 6791 (dashboard). That domain comes from the [Stacktape Console](/getting-started/add-the-console).
Without the Console connected, set [custom domains](#custom-domains) for `cloud` and `site`, and for `dashboard` unless
you turn the dashboard off, or the deploy stops and asks for them.

## Custom domains

Convex serves three origins:

| Origin | Serves | Example |
|---|---|---|
| `cloud` | The API and WebSocket endpoint that `convex-js` clients connect to | `api.myapp.com` |
| `site` | Your `httpAction()` routes, such as webhooks and OAuth callbacks | `webhooks.myapp.com` |
| `dashboard` | The admin dashboard | `convex-admin.myapp.com` |

With `customDomains`, `cloud` and `site` are required, and `dashboard` is required while the dashboard is enabled.
[Set up the domain](/resources/networking/custom-domains#set-up-the-domain) with `stacktape domain add` before the
first deploy, so that issued certificates exist for these names.


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


This production setup also turns on deletion protection, keeps old versions of stored files and allows the dashboard
only from one address range.

## Passing the Convex URL to other workloads

`$ResourceParam('myConvex', 'url')` is the `cloud` origin. Pass it to a frontend or another workload as an
environment variable for the `convex-js` client:


Example (TypeScript):

```typescript
import { defineConfig, Convex, LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';

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
    packaging: new JsBundleLambdaPackaging({
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


## Functions deployment

After the infrastructure is up, Stacktape runs `npx convex deploy --codegen disable --typecheck try` in the parent
directory of `appDirectory`, with `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY` set. `functionsDeployment`
changes the command (for example to use `pnpm`), the directory (`workingDirectory`), or turns the step off
(`enabled: false`) when your CI deploys functions itself.


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


## Backend

The backend container runs the Convex server. All queries, mutations, actions and subscriptions go through it. Read
its logs with [`stacktape logs`](/cli/logs).

The open-source backend runs as a single process: two backends on one database would corrupt it. Stacktape runs
exactly one backend task, so you scale it up, not out. Sizes from Convex's self-hosting guidance:

| Use | CPU | Memory |
|---|---|---|
| Development, a few dozen users | 0.5 vCPU | 1024 MB (default) |
| Production, hundreds of subscribers | 1 vCPU | 2048 MB |
| Heavier production, vector search | 2 vCPU | 4096 MB |
| Upper end of one process | 4 vCPU | 8192 MB |


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';

export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    dashboard: {
      resources: { cpu: 0.25, memory: 512 }
    },
    backend: {
      resources: {
        cpu: 2,
        memory: 4096
      }
    }
  });

  return {
    resources: { myConvex }
  };
});
```


For EC2 instead of Fargate, set `instanceTypes` (Graviton types such as `c6g.large` cost the least per vCPU).
`enableWarmPool: true` keeps a pre-initialized instance ready for faster replacement and works with one instance type.


Example (TypeScript):

```typescript
import { defineConfig, Convex } from 'stacktape';

export default defineConfig(() => {
  const myConvex = new Convex({
    appDirectory: './convex',
    dashboard: {
      resources: { cpu: 0.25, memory: 512 }
    },
    backend: {
      resources: {
        instanceTypes: ['c6g.large'],
        enableWarmPool: true
      }
    }
  });

  return {
    resources: { myConvex }
  };
});
```


`backend.image` overrides the backend image (by default a tested release of `ghcr.io/get-convex/convex-backend`).


> **Warning:** A new backend image can run data migrations. Try an upgrade on a staging stage before production.


## Dashboard

The dashboard is the Convex admin UI: data browser, logs, function runner, environment variables and snapshot
export and import. It runs as its own container (0.25 vCPU and 512 MB by default, about $9 a month).

It has no sign-in of its own; the admin key you paste is the only protection. Restrict it to your office or VPN
addresses with `allowedIpRanges`, especially on production stages:


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


`dashboard.enabled: false` removes the container and saves its cost. You then manage data and environment variables
with the `npx convex` CLI. `dashboard.image` pins the dashboard image.


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


## Database

Convex stores its data in a PostgreSQL database that it owns: single-AZ RDS PostgreSQL 16 on `db.t4g.micro` by default,
with 20 GB of storage, one day of backups and access from the backend only. You can't point Convex at an existing
database.

`database.engine` takes the PostgreSQL engines of a [relational database](/resources/databases/relational-database):
RDS PostgreSQL (default), Aurora Serverless v2 or provisioned Aurora. Convex needs PostgreSQL 13 or later. The
`database` property also takes `automatedBackupRetentionDays` (default 1; raise it for production),
`preferredMaintenanceWindow` and `logging`. Leave `accessibility` as it is: only the backend needs the database.

## Storage

Convex keeps modules, files, search indexes, exports and snapshot imports in five private, encrypted S3 buckets.
`storage` applies to all five: `versioning` keeps old versions of overwritten or deleted objects, and `lifecycleRules`
can expire old exports.


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


## Deletion protection

`deletionProtection: true` protects the database and the five buckets. A delete then stops until you deploy with
`deletionProtection: false`. It's off by default; turn it on for production stages.

## Backups

The database has daily automated backups (one day by default). For a portable copy of your data, use
`npx convex export`. `storage.versioning` lets you recover overwritten or deleted files.

## Alarms

Convex takes the [alarm](/observability/alarms) triggers of an Application Load Balancer and of a relational database.

## Dev mode

In [`stacktape dev`](/local-development/dev-mode-overview), Convex runs locally in Docker with SQLite and local file
storage. Pushing functions is faster over your own machine, and no AWS resources run for it. Set `dev.remote: true` to
use the deployed backend instead, for example to work with real data; the stage must be deployed first.


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


## Configuration reference


### Definition: `ConvexProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/convex` with definition name `ConvexProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `appDirectory` | yes | `string` | - |
| `alarms` | no | `Array<ApplicationLoadBalancerAlarm \| RelationalDatabaseAlarm>` | - |
| `backend` | no | `ConvexBackendConfig` | - |
| `customDomains` | no | `ConvexCustomDomains` | - |
| `dashboard` | no | `ConvexDashboardConfig` | - |
| `database` | no | `ConvexDatabaseConfig` | - |
| `deletionProtection` | no | `boolean` | `false` |
| `dev` | no | `DevModeConfig` | - |
| `disabledGlobalAlarms` | no | `Array<string>` | - |
| `functionsDeployment` | no | `ConvexFunctionsDeploymentConfig` | - |
| `storage` | no | `ConvexStorageConfig` | - |


## Referenceable parameters

`url` is the `cloud` origin for the `convex-js` client. `adminKey` and `instanceSecret` resolve from AWS Secrets
Manager. Pass them to other workloads through `environment`.


## Referenceable Parameters: `convex`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `url` | Cloud origin (CONVEX_CLOUD_ORIGIN) used by frontend clients. | `$ResourceParam("<<resource-name>>", "url")` |
| `siteUrl` | HTTP-actions origin (CONVEX_SITE_ORIGIN) where httpAction() routes live. | `$ResourceParam("<<resource-name>>", "siteUrl")` |
| `dashboardUrl` | Admin dashboard URL. Only available when the dashboard is enabled. | `$ResourceParam("<<resource-name>>", "dashboardUrl")` |
| `adminKey` | Sensitive root credentials for the deployment, resolved from AWS Secrets Manager. Reference explicitly with $ResourceParam; never auto-injected by connectTo. | `$ResourceParam("<<resource-name>>", "adminKey")` |
| `instanceSecret` | Sensitive boot secret stored in AWS Secrets Manager. Almost never needed by user code. | `$ResourceParam("<<resource-name>>", "instanceSecret")` |


## Next steps

- [Next.js](/resources/frontend/nextjs): host the frontend that calls Convex.
- [Dev mode](/local-development/dev-mode-overview): run the app locally against your stack.
- [Alarms](/observability/alarms): get told when the backend misbehaves.
