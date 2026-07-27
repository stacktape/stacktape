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
 *
 * **Example (YAML):**
 *
 * ```yaml
 * # stp-focus
 * resources:
 *   backend:
 *     type: convex
 *     properties:
 *       appDirectory: ./convex
 *       backend:
 *         resources:
 *           cpu: 1
 *           memory: 2048
 *       dashboard:
 *         enabled: true
 *       database:
 *         engine:
 *           type: postgres
 *           properties:
 *             version: '16.6'
 *             primaryInstance:
 *               instanceSize: db.t4g.small
 *       customDomains:
 *         cloud:
 *           domainName: api.myapp.com
 *         site:
 *           domainName: webhooks.myapp.com
 *         dashboard:
 *           domainName: convex-admin.myapp.com
 *       deletionProtection: true
 * # stp-end-focus
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Convex, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   // stp-focus
 *   const backend = new Convex({
 *     appDirectory: './convex',
 *     backend: {
 *       resources: {
 *         cpu: 1,
 *         memory: 2048
 *       }
 *     },
 *     dashboard: {
 *       enabled: true
 *     },
 *     database: {
 *       engine: {
 *         type: 'postgres',
 *         properties: {
 *           version: '16.6',
 *           primaryInstance: {
 *             instanceSize: 'db.t4g.small'
 *           }
 *         }
 *       }
 *     },
 *     customDomains: {
 *       cloud: { domainName: 'api.myapp.com' },
 *       site: { domainName: 'webhooks.myapp.com' },
 *       dashboard: { domainName: 'convex-admin.myapp.com' }
 *     },
 *     deletionProtection: true
 *   });
 *   // stp-end-focus
 *   return { resources: { backend } };
 * });
 * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       # stp-focus
   *       appDirectory: ./convex
   *       # stp-end-focus
   *       backend:
   *         resources:
   *           cpu: 1
   *           memory: 2048
   *       database:
   *         engine:
   *           type: postgres
   *           properties:
   *             version: '16.6'
   *             primaryInstance:
   *               instanceSize: db.t4g.small
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     // stp-focus
   *     appDirectory: './convex',
   *     // stp-end-focus
   *     backend: {
   *       resources: {
   *         cpu: 1,
   *         memory: 2048
   *       }
   *     },
   *     database: {
   *       engine: {
   *         type: 'postgres',
   *         properties: {
   *           version: '16.6',
   *           primaryInstance: {
   *             instanceSize: 'db.t4g.small'
   *           }
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       # stp-focus
   *       functionsDeployment:
   *         enabled: true
   *         command: pnpm convex deploy --codegen disable
   *         workingDirectory: ./
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     // stp-focus
   *     functionsDeployment: {
   *       enabled: true,
   *       command: 'pnpm convex deploy --codegen disable',
   *       workingDirectory: './'
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       dashboard:
   *         enabled: true
   *       # stp-focus
   *       customDomains:
   *         cloud:
   *           domainName: api.myapp.com
   *         site:
   *           domainName: webhooks.myapp.com
   *         dashboard:
   *           domainName: convex-admin.myapp.com
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     dashboard: {
   *       enabled: true
   *     },
   *     // stp-focus
   *     customDomains: {
   *       cloud: {
   *         domainName: 'api.myapp.com'
   *       },
   *       site: {
   *         domainName: 'webhooks.myapp.com'
   *       },
   *       dashboard: {
   *         domainName: 'convex-admin.myapp.com'
   *       }
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  customDomains?: ConvexCustomDomains;
  /**
   * #### Configuration for the Convex backend container (the Rust server process).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       # stp-focus
   *       backend:
   *         resources:
   *           cpu: 2
   *           memory: 4096
   *         logging:
   *           retentionDays: 30
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     // stp-focus
   *     backend: {
   *       resources: {
   *         cpu: 2,
   *         memory: 4096
   *       },
   *       logging: {
   *         retentionDays: 30
   *       }
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       # stp-focus
   *       dashboard:
   *         enabled: true
   *         allowedIpRanges:
   *           - 203.0.113.0/24
   *         resources:
   *           cpu: 0.25
   *           memory: 512
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     // stp-focus
   *     dashboard: {
   *       enabled: true,
   *       allowedIpRanges: ['203.0.113.0/24'],
   *       resources: {
   *         cpu: 0.25,
   *         memory: 512
   *       }
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       # stp-focus
   *       database:
   *         engine:
   *           type: aurora-postgresql-serverless-v2
   *           properties:
   *             version: '16.6'
   *             minCapacity: 0.5
   *             maxCapacity: 4
   *         automatedBackupRetentionDays: 7
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     // stp-focus
   *     database: {
   *       engine: {
   *         type: 'aurora-postgresql-serverless-v2',
   *         properties: {
   *           version: '16.6',
   *           minCapacity: 0.5,
   *           maxCapacity: 4
   *         }
   *       },
   *       automatedBackupRetentionDays: 7
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       # stp-focus
   *       storage:
   *         encryption: true
   *         versioning: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     // stp-focus
   *     storage: {
   *       encryption: true,
   *       versioning: true
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       # stp-focus
   *       dev:
   *         remote: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     // stp-focus
   *     dev: {
   *       remote: true
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       # stp-focus
   *       deletionProtection: true
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     // stp-focus
   *     deletionProtection: true
   *     // stp-end-focus
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   *
   * @default false
   */
  deletionProtection?: boolean;
  /**
   * #### Alarms for this Convex deployment (backend container, ALB, database). Merged with global
   * alarms from the Stacktape Console.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       # stp-focus
   *       alarms:
   *         - trigger:
   *             type: database-cpu-utilization
   *             properties:
   *               thresholdPercent: 85
   *         - trigger:
   *             type: application-load-balancer-unhealthy-targets
   *             properties:
   *               thresholdPercent: 50
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     // stp-focus
   *     alarms: [
   *       {
   *         trigger: {
   *           type: 'database-cpu-utilization',
   *           properties: {
   *             thresholdPercent: 85
   *           }
   *         }
   *       },
   *       {
   *         trigger: {
   *           type: 'application-load-balancer-unhealthy-targets',
   *           properties: {
   *             thresholdPercent: 50
   *           }
   *         }
   *       }
   *     ]
   *     // stp-end-focus
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  alarms?: (ApplicationLoadBalancerAlarm | RelationalDatabaseAlarm)[];
  /**
   * #### Global alarm names to exclude from this deployment.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       # stp-focus
   *       disabledGlobalAlarms:
   *         - high-db-connections
   *         - alb-5xx-rate
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     // stp-focus
   *     disabledGlobalAlarms: ['high-db-connections', 'alb-5xx-rate']
   *     // stp-end-focus
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  disabledGlobalAlarms?: string[];
}

interface ConvexFunctionsDeploymentConfig {
  /**
   * #### Whether Stacktape should deploy Convex functions after infrastructure deploy.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       functionsDeployment:
   *         # stp-focus
   *         enabled: false
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     functionsDeployment: {
   *       // stp-focus
   *       enabled: false
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       functionsDeployment:
   *         # stp-focus
   *         command: bunx convex deploy --typecheck disable
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     functionsDeployment: {
   *       // stp-focus
   *       command: 'bunx convex deploy --typecheck disable'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  command?: string;
  /**
   * #### Working directory for the deploy command.
   *
   * ---
   *
   * Defaults to the project directory containing `appDirectory` when `appDirectory` points at a
   * `convex/` folder.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./packages/api/convex
   *       functionsDeployment:
   *         # stp-focus
   *         workingDirectory: ./packages/api
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './packages/api/convex',
   *     functionsDeployment: {
   *       // stp-focus
   *       workingDirectory: './packages/api'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       customDomains:
   *         # stp-focus
   *         cloud:
   *           domainName: api.myapp.com
   *         # stp-end-focus
   *         site:
   *           domainName: webhooks.myapp.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     customDomains: {
   *       // stp-focus
   *       cloud: {
   *         domainName: 'api.myapp.com'
   *       },
   *       // stp-end-focus
   *       site: {
   *         domainName: 'webhooks.myapp.com'
   *       }
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  cloud: DomainConfiguration;
  /**
   * #### HTTP-actions origin. Set as `CONVEX_SITE_ORIGIN` on the backend.
   *
   * ---
   *
   * User-defined `httpAction()` routes (webhooks, OAuth callbacks) are served here.
   * Example: `webhooks.myapp.com`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       customDomains:
   *         cloud:
   *           domainName: api.myapp.com
   *         # stp-focus
   *         site:
   *           domainName: webhooks.myapp.com
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     customDomains: {
   *       cloud: {
   *         domainName: 'api.myapp.com'
   *       },
   *       // stp-focus
   *       site: {
   *         domainName: 'webhooks.myapp.com'
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  site: DomainConfiguration;
  /**
   * #### Dashboard domain. Required if `dashboard.enabled` is `true`.
   *
   * ---
   *
   * Example: `convex-admin.myapp.com`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       dashboard:
   *         enabled: true
   *       customDomains:
   *         cloud:
   *           domainName: api.myapp.com
   *         site:
   *           domainName: webhooks.myapp.com
   *         # stp-focus
   *         dashboard:
   *           domainName: convex-admin.myapp.com
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     dashboard: {
   *       enabled: true
   *     },
   *     customDomains: {
   *       cloud: {
   *         domainName: 'api.myapp.com'
   *       },
   *       site: {
   *         domainName: 'webhooks.myapp.com'
   *       },
   *       // stp-focus
   *       dashboard: {
   *         domainName: 'convex-admin.myapp.com'
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       backend:
   *         # stp-focus
   *         resources:
   *           cpu: 4
   *           memory: 8192
   *           architecture: arm64
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     backend: {
   *       // stp-focus
   *       resources: {
   *         cpu: 4,
   *         memory: 8192,
   *         architecture: 'arm64'
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       backend:
   *         # stp-focus
   *         image: ghcr.io/get-convex/convex-backend:0a8d9ae0f0e5c6c9c0c0c0c0
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     backend: {
   *       // stp-focus
   *       image: 'ghcr.io/get-convex/convex-backend:0a8d9ae0f0e5c6c9c0c0c0c0'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  image?: string;
  /**
   * #### Logging configuration for the backend container.
   *
   * ---
   *
   * Container `stdout`/`stderr` are sent to CloudWatch and retained for 90 days by default.
   * View logs with `stacktape logs <resourceName>`.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       backend:
   *         # stp-focus
   *         logging:
   *           retentionDays: 14
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     backend: {
   *       // stp-focus
   *       logging: {
   *         retentionDays: 14
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       backend:
   *         # stp-focus
   *         enableRemoteSessions: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     backend: {
   *       // stp-focus
   *       enableRemoteSessions: true
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       dashboard:
   *         # stp-focus
   *         enabled: false
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     dashboard: {
   *       // stp-focus
   *       enabled: false
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       dashboard:
   *         enabled: true
   *         # stp-focus
   *         allowedIpRanges:
   *           - 203.0.113.0/24
   *           - 198.51.100.42/32
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     dashboard: {
   *       enabled: true,
   *       // stp-focus
   *       allowedIpRanges: ['203.0.113.0/24', '198.51.100.42/32']
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  allowedIpRanges?: string[];
  /**
   * #### CPU, memory, and compute engine for the dashboard container.
   *
   * ---
   *
   * Defaults to `{ cpu: 0.25, memory: 512 }`. The dashboard is a Next.js app and is very light —
   * `{ cpu: 0.25, memory: 512 }` is plenty for most teams.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       dashboard:
   *         enabled: true
   *         # stp-focus
   *         resources:
   *           cpu: 0.5
   *           memory: 1024
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     dashboard: {
   *       enabled: true,
   *       // stp-focus
   *       resources: {
   *         cpu: 0.5,
   *         memory: 1024
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  resources?: ContainerWorkloadResourcesConfig;
  /**
   * #### Pinned Convex dashboard Docker image.
   *
   * ---
   *
   * Defaults to a known-good version pinned by Stacktape (currently from `ghcr.io/get-convex/convex-dashboard`).
   * Override to test newer/older versions.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       dashboard:
   *         enabled: true
   *         # stp-focus
   *         image: ghcr.io/get-convex/convex-dashboard:0a8d9ae0f0e5c6c9c0c0c0c0
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     dashboard: {
   *       enabled: true,
   *       // stp-focus
   *       image: 'ghcr.io/get-convex/convex-dashboard:0a8d9ae0f0e5c6c9c0c0c0c0'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  image?: string;
  /**
   * #### Logging configuration for the dashboard container.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       dashboard:
   *         enabled: true
   *         # stp-focus
   *         logging:
   *           retentionDays: 7
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     dashboard: {
   *       enabled: true,
   *       // stp-focus
   *       logging: {
   *         retentionDays: 7
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       database:
   *         # stp-focus
   *         engine:
   *           type: postgres
   *           properties:
   *             version: '16.6'
   *             primaryInstance:
   *               instanceSize: db.t4g.medium
   *               multiAz: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     database: {
   *       // stp-focus
   *       engine: {
   *         type: 'postgres',
   *         properties: {
   *           version: '16.6',
   *           primaryInstance: {
   *             instanceSize: 'db.t4g.medium',
   *             multiAz: true
   *           }
   *         }
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       database:
   *         # stp-focus
   *         accessibility:
   *           accessibilityMode: scoping-workloads-in-vpc
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     database: {
   *       // stp-focus
   *       accessibility: {
   *         accessibilityMode: 'scoping-workloads-in-vpc'
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  accessibility?: DatabaseAccessibility;
  /**
   * #### Days to keep automated daily backups (0–35). Defaults to 1.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       database:
   *         # stp-focus
   *         automatedBackupRetentionDays: 14
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     database: {
   *       // stp-focus
   *       automatedBackupRetentionDays: 14
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  automatedBackupRetentionDays?: number;
  /**
   * #### When maintenance happens. Format: `Sun:02:00-Sun:04:00` (UTC).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       database:
   *         # stp-focus
   *         preferredMaintenanceWindow: Sun:02:00-Sun:04:00
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     database: {
   *       // stp-focus
   *       preferredMaintenanceWindow: 'Sun:02:00-Sun:04:00'
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   */
  preferredMaintenanceWindow?: string;
  /**
   * #### Database logging (connections, slow queries, errors).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       database:
   *         # stp-focus
   *         logging:
   *           retentionDays: 30
   *           logTypes:
   *             - postgresql
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     database: {
   *       // stp-focus
   *       logging: {
   *         retentionDays: 30,
   *         logTypes: ['postgresql']
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       storage:
   *         # stp-focus
   *         encryption: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     storage: {
   *       // stp-focus
   *       encryption: true
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
   *
   * @default true
   */
  encryption?: boolean;
  /**
   * #### Keep previous versions of overwritten/deleted objects. Useful for recovery; increases storage cost.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       storage:
   *         # stp-focus
   *         versioning: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     storage: {
   *       // stp-focus
   *       versioning: true
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   backend:
   *     type: convex
   *     properties:
   *       appDirectory: ./convex
   *       storage:
   *         versioning: true
   *         # stp-focus
   *         lifecycleRules:
   *           - type: expiration
   *             properties:
   *               prefix: exports/
   *               daysAfterUpload: 30
   *           - type: non-current-version-expiration
   *             properties:
   *               daysAfterVersioned: 90
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Convex, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const backend = new Convex({
   *     appDirectory: './convex',
   *     storage: {
   *       versioning: true,
   *       // stp-focus
   *       lifecycleRules: [
   *         {
   *           type: 'expiration',
   *           properties: {
   *             prefix: 'exports/',
   *             daysAfterUpload: 30
   *           }
   *         },
   *         {
   *           type: 'non-current-version-expiration',
   *           properties: {
   *             daysAfterVersioned: 90
   *           }
   *         }
   *       ]
   *       // stp-end-focus
   *     }
   *   });
   *   return { resources: { backend } };
   * });
   * ```
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
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   backend:
 *     type: convex
 *     properties:
 *       appDirectory: ./convex
 *
 *   syncWorker:
 *     type: function
 *     properties:
 *       packaging:
 *         type: stacktape-lambda-buildpack
 *         properties:
 *           entryfilePath: ./src/sync.ts
 *       # stp-focus
 *       environment:
 *         - name: CONVEX_URL
 *           value: $ResourceParam('backend', 'url')
 *         - name: CONVEX_SITE_URL
 *           value: $ResourceParam('backend', 'siteUrl')
 *         - name: CONVEX_ADMIN_KEY
 *           value: $ResourceParam('backend', 'adminKey')
 *       # stp-end-focus
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { Convex, LambdaFunction, $ResourceParam, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const backend = new Convex({
 *     appDirectory: './convex'
 *   });
 *
 *   const syncWorker = new LambdaFunction({
 *     packaging: {
 *       type: 'stacktape-lambda-buildpack',
 *       properties: {
 *         entryfilePath: './src/sync.ts'
 *       }
 *     },
 *     // stp-focus
 *     environment: {
 *       CONVEX_URL: $ResourceParam('backend', 'url'),
 *       CONVEX_SITE_URL: $ResourceParam('backend', 'siteUrl'),
 *       CONVEX_ADMIN_KEY: $ResourceParam('backend', 'adminKey')
 *     }
 *     // stp-end-focus
 *   });
 *
 *   return { resources: { backend, syncWorker } };
 * });
 * ```
 */
type ConvexReferencableParam = 'url' | 'siteUrl' | 'dashboardUrl' | 'adminKey' | 'instanceSecret';
