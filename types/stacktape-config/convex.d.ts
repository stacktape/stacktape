/**
 * #### Self-hosted Convex backend on AWS — reactive database, functions, file storage, and dashboard.
 *
 * ---
 *
 * Provisions everything needed to run [Convex](https://www.convex.dev) self-hosted on your own AWS account:
 * a Fargate-based backend container, a PostgreSQL database, five S3 buckets (modules, files, search,
 * exports, snapshot imports), an ALB for HTTPS + WebSocket traffic, and an optional admin dashboard.
 *
 * On every `stacktape deploy`, after the infrastructure is healthy, Stacktape runs `npx convex deploy`
 * from the parent project directory to push the latest function code to the freshly-deployed backend, with
 * the admin key injected automatically.
 *
 * ---
 *
 * ##### Single-instance constraint
 *
 * The open-source convex-backend distribution is **single-process**: it cannot be horizontally scaled.
 * Running two backends against the same Postgres would corrupt MVCC transaction validation and break
 * reactive query invalidation. Stacktape therefore enforces one active backend task.
 *
 * Scale **vertically** by bumping `backend.resources.cpu`/`memory` (or by switching to `instanceTypes`
 * with EC2). A single 4 vCPU / 8 GB backend comfortably handles thousands of concurrent reactive
 * subscribers per Convex's own self-hosted guidance.
 *
 * ---
 *
 * ##### Cost
 *
 * The smallest viable configuration (single-AZ `db.t4g.micro` Postgres, 0.5 vCPU / 1 GB Fargate
 * backend, 0.25 vCPU / 512 MB dashboard, ALB, S3) lands around **$45–65/month idle**. Production
 * configurations with larger backends scale up from there.
 */
interface Convex {
  type: 'convex';
  properties: ConvexProps;
  overrides?: ResourceOverrides;
}

interface ConvexProps {
  /**
   * #### Path to the `convex/` directory in your project.
   *
   * ---
   *
   * After each `stacktape deploy`, Stacktape runs `npx convex deploy` from the parent project directory
   * against the freshly-deployed backend.
   *
   * Example: `appDirectory: './convex'`
   */
  appDirectory: string;
  /**
   * #### How Stacktape deploys Convex functions after infrastructure is ready.
   *
   * ---
   *
   * By default, Stacktape runs `npx convex deploy --codegen disable --typecheck try` from the
   * project directory containing `appDirectory`, with `CONVEX_SELF_HOSTED_URL` and
   * `CONVEX_SELF_HOSTED_ADMIN_KEY` injected automatically.
   *
   * Set `enabled: false` if your CI/CD pipeline deploys functions separately, or set `command`
   * when your project uses a custom package-manager command.
   */
  functionsDeployment?: ConvexFunctionsDeploymentConfig;
  /**
   * #### Custom domains for the Convex backend.
   *
   * ---
   *
   * Convex exposes two distinct origins that the outside world reaches:
   *
   * - **`cloud`** — the API + WebSocket endpoint (`CONVEX_CLOUD_ORIGIN`). All client traffic
   *   (queries, mutations, actions, reactive subscriptions) hits this URL via the `convex-js`
   *   client. Required.
   * - **`site`** — the HTTP-actions endpoint (`CONVEX_SITE_ORIGIN`). User-defined `httpAction()`
   *   routes (webhooks, OAuth callbacks, etc.) live here. Kept separate from `cloud` so webhook
   *   URLs don't collide with internal API paths. Required.
   * - **`dashboard`** — required when `dashboard.enabled` is `true`. The dashboard serves at this domain.
   *
   * Each domain must have a Route53 hosted zone in your AWS account. Stacktape provisions free
   * TLS certificates and DNS records automatically.
   *
   * If `customDomains` is omitted entirely, the ALB's default DNS is used with port-based routing
   * (3210 cloud, 3211 site, 6791 dashboard). Fine for dev/staging; **not recommended for
   * production** — the ALB DNS is unstable across stack recreations, and clients hard-code the URL.
   */
  customDomains?: ConvexCustomDomains;
  /**
   * #### Configuration for the Convex backend container (the Rust server process).
   */
  backend?: ConvexBackendConfig;
  /**
   * #### Configuration for the Convex admin dashboard.
   *
   * ---
   *
   * Enabled by default. The dashboard is a stateless Next.js app that talks to the backend's
   * REST API using the admin key (which you paste on first login). To opt out, set
   * `dashboard.enabled: false`.
   */
  dashboard?: ConvexDashboardConfig;
  /**
   * #### Override the PostgreSQL database that backs the Convex deployment.
   *
   * ---
   *
   * Defaults to a single-AZ RDS PostgreSQL `db.t4g.micro` instance (cheapest production-viable
   * option, ~$13/month). The shape mirrors a subset of [`relational-database`](https://docs.stacktape.com/resources/relational-databases/) — override only what
   * you need. Common reasons to override: bump to Aurora Serverless v2 for auto-scaling, enable
   * multi-AZ for HA, or increase storage retention.
   *
   * You cannot bring an existing external database — Convex assumes it owns its Postgres entirely.
   */
  database?: ConvexDatabaseConfig;
  /**
   * #### Shared configuration applied to all five Convex S3 buckets (`modules`, `files`, `search`,
   * `exports`, `snapshot_imports`).
   *
   * ---
   *
   * Each Convex deployment requires five separate buckets internally. By default they are all
   * private, encrypted at rest, with versioning disabled. Use this property to override defaults
   * across all five at once (e.g., enable versioning for prod).
   */
  storage?: ConvexStorageConfig;
  /**
   * #### Dev mode: runs the convex-backend locally in Docker by default with SQLite + local
   * filesystem storage.
   *
   * ---
   *
   * Set `remote: true` to point `stacktape dev` at the deployed AWS backend instead. Local mode
   * is recommended because Convex's save-push-reload loop is noticeably faster over loopback than
   * across the WAN, and avoids 24/7 Fargate + RDS cost per developer.
   */
  dev?: DevModeConfig;
  /**
   * #### Prevent accidental deletion of the database and the five storage buckets.
   *
   * ---
   *
   * When `true`, Stacktape sets `deletionProtection` on the underlying RDS instance and retention
   * policies on the buckets. You must set this to `false` and redeploy before you can delete the stack.
   *
   * Recommended for production stages.
   *
   * @default false
   */
  deletionProtection?: boolean;
  /**
   * #### Alarms for this Convex deployment (backend container, ALB, database). Merged with global
   * alarms from the Stacktape Console.
   */
  alarms?: (ApplicationLoadBalancerAlarm | RelationalDatabaseAlarm)[];
  /**
   * #### Global alarm names to exclude from this deployment.
   */
  disabledGlobalAlarms?: string[];
}

interface ConvexFunctionsDeploymentConfig {
  /**
   * #### Whether Stacktape should deploy Convex functions after infrastructure deploy.
   *
   * @default true
   */
  enabled?: boolean;
  /**
   * #### Custom command to deploy Convex functions.
   *
   * ---
   *
   * Stacktape injects `CONVEX_SELF_HOSTED_URL` and `CONVEX_SELF_HOSTED_ADMIN_KEY` into the command
   * environment. If omitted, Stacktape runs:
   *
   * `npx convex deploy --codegen disable --typecheck try`
   *
   * Examples: `pnpm convex deploy --codegen disable`, `bunx convex deploy --typecheck disable`.
   */
  command?: string;
  /**
   * #### Working directory for the deploy command.
   *
   * ---
   *
   * Defaults to the project directory containing `appDirectory` when `appDirectory` points at a
   * `convex/` folder.
   */
  workingDirectory?: string;
}

interface ConvexCustomDomains {
  /**
   * #### API + WebSocket origin. Set as `CONVEX_CLOUD_ORIGIN` on the backend.
   *
   * ---
   *
   * Frontend clients connect here via the `convex-js` client. Example: `api.myapp.com`.
   */
  cloud: DomainConfiguration;
  /**
   * #### HTTP-actions origin. Set as `CONVEX_SITE_ORIGIN` on the backend.
   *
   * ---
   *
   * User-defined `httpAction()` routes (webhooks, OAuth callbacks) are served here.
   * Example: `webhooks.myapp.com`.
   */
  site: DomainConfiguration;
  /**
   * #### Dashboard domain. Required if `dashboard.enabled` is `true`.
   *
   * ---
   *
   * Example: `convex-admin.myapp.com`.
   */
  dashboard?: DomainConfiguration;
}

interface ConvexBackendConfig {
  /**
   * #### CPU, memory, and compute engine for the backend container.
   *
   * ---
   *
   * Defaults to `{ cpu: 0.5, memory: 1024 }`. Override this for production traffic:
   *
   * - **Hobby / small dev**: `{ cpu: 0.5, memory: 1024 }` — fine for a few dozen concurrent users
   * - **Production baseline**: `{ cpu: 1, memory: 2048 }` — handles hundreds of concurrent reactive subscribers
   * - **Heavier production**: `{ cpu: 2, memory: 4096 }` or `{ cpu: 4, memory: 8192 }` — thousands of subscribers, vector search
   *
   * For EC2 instead of Fargate, specify `instanceTypes` (e.g., `['c6g.large']`). EC2 is typically
   * cheaper per vCPU and supports `enableWarmPool: true` for faster cold-starts.
   *
   * Convex backend is single-process — scale **vertically** (bigger box), not horizontally.
   */
  resources?: ContainerWorkloadResourcesConfig;
  /**
   * #### Pinned Convex backend Docker image.
   *
   * ---
   *
   * Defaults to a known-good version pinned by Stacktape (currently from `ghcr.io/get-convex/convex-backend`).
   * Override to test newer/older versions. Image upgrades trigger Convex's in-place migration path.
   *
   * Example: `image: 'ghcr.io/get-convex/convex-backend:0a8d9ae0f0e5c6c9c0c0c0c0'`
   */
  image?: string;
  /**
   * #### Logging configuration for the backend container.
   *
   * ---
   *
   * Container `stdout`/`stderr` are sent to CloudWatch and retained for 90 days by default.
   * View logs with `stacktape logs <resourceName>`.
   */
  logging?: ContainerWorkloadContainerLogging;
  /**
   * #### Allow SSH-like sessions into the running backend container for debugging.
   *
   * ---
   *
   * Stacktape enables ECS Exec for Convex internally because it is required to generate the managed
   * admin key after the backend starts. This property is kept for compatibility with generic workload
   * controls and may be removed in a future Convex resource revision.
   */
  enableRemoteSessions?: boolean;
}

interface ConvexDashboardConfig {
  /**
   * #### Whether to provision the admin dashboard.
   *
   * ---
   *
   * The dashboard is a small stateless Next.js app (~$3–5/month at default sizing) that gives
   * you a data browser, log viewer, function REPL, env-var manager, and snapshot export/import
   * UI. Disable only if you have a strong reason — self-hosted Convex without the dashboard is
   * operationally painful.
   *
   * @default true
   */
  enabled?: boolean;
  /**
   * #### CIDR ranges allowed to reach the dashboard. By default the dashboard is internet-reachable.
   *
   * ---
   *
   * The dashboard has no built-in authentication — the admin key (which you paste on login) is
   * the only security barrier. Convex's admin key is high-entropy and is the same model managed
   * Convex uses, but if you want defense-in-depth, pin access to your office IPs or VPN range.
   *
   * Example: `allowedIpRanges: ['203.0.113.0/24', '198.51.100.42/32']`.
   */
  allowedIpRanges?: string[];
  /**
   * #### CPU, memory, and compute engine for the dashboard container.
   *
   * ---
   *
   * Defaults to `{ cpu: 0.25, memory: 512 }`. The dashboard is a Next.js app and is very light —
   * `{ cpu: 0.25, memory: 512 }` is plenty for most teams.
   */
  resources?: ContainerWorkloadResourcesConfig;
  /**
   * #### Pinned Convex dashboard Docker image.
   *
   * ---
   *
   * Defaults to a known-good version pinned by Stacktape (currently from `ghcr.io/get-convex/convex-dashboard`).
   * Override to test newer/older versions.
   */
  image?: string;
  /**
   * #### Logging configuration for the dashboard container.
   */
  logging?: ContainerWorkloadContainerLogging;
}

/**
 * #### Database override for the Convex deployment.
 *
 * ---
 *
 * The shape is a focused subset of [`RelationalDatabase`](https://docs.stacktape.com/resources/relational-databases/)
 * properties — only the fields that make sense in this context are exposed. The default is a single-AZ
 * RDS PostgreSQL `db.t4g.micro` instance with 20 GB storage, 1-day backup retention, and
 * `scoping-workloads-in-vpc` accessibility (only the Convex backend can reach it).
 *
 * Bring-your-own-database is not supported — Convex assumes it owns the Postgres entirely.
 */
interface ConvexDatabaseConfig {
  /**
   * #### Database engine override. Defaults to RDS PostgreSQL 16 on `db.t4g.micro`.
   *
   * ---
   *
   * Convex requires PostgreSQL 13+. To use Aurora Serverless v2 instead (auto-scales 0.5–8 ACU,
   * higher idle cost but elastic), set `{ type: 'aurora-postgresql-serverless-v2', properties: { ... } }`.
   */
  engine?: RdsEngine | AuroraServerlessV2Engine | AuroraEngine;
  /**
   * #### Database network accessibility. Defaults to `scoping-workloads-in-vpc`.
   *
   * ---
   *
   * The Convex backend auto-connects internally, so users have no reason to set `internet` here
   * — direct `psql` access to Convex's internal Postgres is almost always wrong (use the dashboard
   * or `npx convex export` instead).
   */
  accessibility?: DatabaseAccessibility;
  /**
   * #### Days to keep automated daily backups (0–35). Defaults to 1.
   */
  automatedBackupRetentionDays?: number;
  /**
   * #### When maintenance happens. Format: `Sun:02:00-Sun:04:00` (UTC).
   */
  preferredMaintenanceWindow?: string;
  /**
   * #### Database logging (connections, slow queries, errors).
   */
  logging?: RelationalDatabaseLogging;
}

/**
 * #### Storage defaults applied to all five Convex S3 buckets.
 *
 * ---
 *
 * Convex internally uses five separate buckets: `modules`, `files`, `search`, `exports`,
 * `snapshot_imports`. This config applies to all of them. Per-bucket overrides are not exposed
 * in v1 — open an issue if you need them.
 */
interface ConvexStorageConfig {
  /**
   * #### Encrypt stored objects at rest (AES-256).
   *
   * @default true
   */
  encryption?: boolean;
  /**
   * #### Keep previous versions of overwritten/deleted objects. Useful for recovery; increases storage cost.
   *
   * @default false
   */
  versioning?: boolean;
  /**
   * #### Auto-delete or move objects to cheaper storage classes over time.
   *
   * ---
   *
   * Applied to all five buckets. Most useful for the `exports` bucket if you don't want old
   * snapshot exports accumulating indefinitely.
   */
  lifecycleRules?: (
    | Expiration
    | NonCurrentVersionExpiration
    | ClassTransition
    | NonCurrentVersionClassTransition
    | AbortIncompleteMultipartUpload
  )[];
}

type StpConvex = Convex['properties'] & {
  name: string;
  type: Convex['type'];
  configParentResourceType: Convex['type'];
  nameChain: string[];
  _nestedResources: {
    backendContainerWorkload: StpContainerWorkload;
    dashboardContainerWorkload?: StpContainerWorkload;
    database: StpRelationalDatabase;
    modulesBucket: StpBucket;
    filesBucket: StpBucket;
    searchBucket: StpBucket;
    exportsBucket: StpBucket;
    snapshotImportsBucket: StpBucket;
    loadBalancer: StpApplicationLoadBalancer;
  };
};

/**
 * #### Referenceable parameters for a `convex` resource.
 *
 * ---
 *
 * Use with `$ResourceParam('myConvex', '<param>')`:
 *
 * - **`url`** — the cloud origin (`CONVEX_CLOUD_ORIGIN`). What frontend clients connect to.
 *   Auto-injected as `STP_<NAME>_URL` for any workload that lists this resource in `connectTo`.
 * - **`siteUrl`** — the HTTP-actions origin (`CONVEX_SITE_ORIGIN`). Where your `httpAction()` routes live.
 * - **`dashboardUrl`** — the admin dashboard URL. Only available when the dashboard is enabled.
 * - **`adminKey`** — full root credentials for the deployment, resolved from AWS Secrets Manager.
 *   **Sensitive.** Must be referenced explicitly via `$ResourceParam` — never auto-injected by
 *   `connectTo`. Required by tooling like `npx convex deploy`, `npx convex env set`, `npx convex export`.
 * - **`instanceSecret`** — the boot secret stored in Secrets Manager. Sensitive. Almost never
 *   needed by user code — exposed for completeness.
 */
type ConvexReferencableParam = 'url' | 'siteUrl' | 'dashboardUrl' | 'adminKey' | 'instanceSecret';
