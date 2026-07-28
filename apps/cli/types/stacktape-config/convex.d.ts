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
