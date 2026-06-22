/**
 * #### Deploy a SvelteKit SSR app with Lambda (AWS adapter), S3 for static assets, and CloudFront CDN.
 *
 * ---
 *
 * For static-only SvelteKit sites, use `hosting-bucket` with `hostingContentType: 'sveltekit-static-website'` instead.
 */
interface SvelteKitWeb {
  type: 'sveltekit-web';
  properties: SvelteKitWebProps;
  overrides?: ResourceOverrides;
}

interface SvelteKitWebProps extends ResourceAccessProps {
  /**
   * #### Directory containing your `svelte.config.js`. For monorepos, point to the SvelteKit workspace.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: sveltekit-web
   *     properties:
   *       # stp-focus
   *       appDirectory: ./apps/storefront
   *       # stp-end-focus
   *       environment:
   *         - name: PUBLIC_API_URL
   *           value: https://api.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SvelteKitWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SvelteKitWeb({
   *     // stp-focus
   *     appDirectory: './apps/storefront',
   *     // stp-end-focus
   *     environment: [{ name: 'PUBLIC_API_URL', value: 'https://api.example.com' }]
   *   });
   *   return { resources: { web } };
   * });
   * ```
   *
   * @default "."
   */
  appDirectory?: string;
  /**
   * #### Override the default `vite build` command.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: sveltekit-web
   *     properties:
   *       # stp-focus
   *       buildCommand: pnpm run build
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SvelteKitWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SvelteKitWeb({
   *     // stp-focus
   *     buildCommand: 'pnpm run build',
   *     // stp-end-focus
   *     environment: [{ name: 'NODE_ENV', value: 'production' }]
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  buildCommand?: string;
  /**
   * #### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   database:
   *     type: relational-database
   *     properties:
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.6'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   *       credentials:
   *         masterUserPassword: $Secret('database.password')
   *   web:
   *     type: sveltekit-web
   *     properties:
   *       connectTo:
   *         - database
   *       # stp-focus
   *       environment:
   *         - name: DATABASE_URL
   *           value: $ResourceParam('database', 'connectionString')
   *         - name: STRIPE_SECRET_KEY
   *           value: $Secret('stripe.secretKey')
   *         - name: PUBLIC_APP_NAME
   *           value: My Storefront
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, SvelteKitWeb, defineConfig, $Secret, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const database = new RelationalDatabase({
   *     engine: {
   *       type: 'postgres',
   *       properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.micro' } }
   *     },
   *     credentials: { masterUserPassword: $Secret('database.password') }
   *   });
   *   const web = new SvelteKitWeb({
   *     connectTo: ['database'],
   *     // stp-focus
   *     environment: [
   *       { name: 'DATABASE_URL', value: $ResourceParam('database', 'connectionString') },
   *       { name: 'STRIPE_SECRET_KEY', value: $Secret('stripe.secretKey') },
   *       { name: 'PUBLIC_APP_NAME', value: 'My Storefront' }
   *     ]
   *     // stp-end-focus
   *   });
   *   return { resources: { database, web } };
   * });
   * ```
   */
  environment?: EnvironmentVar[];
  /**
   * #### Attach custom domains with auto-managed DNS records and TLS certificates.
   *
   * ---
   *
   * **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: sveltekit-web
   *     properties:
   *       # stp-focus
   *       customDomains:
   *         - domainName: app.example.com
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SvelteKitWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SvelteKitWeb({
   *     // stp-focus
   *     customDomains: [{ domainName: 'app.example.com' }],
   *     // stp-end-focus
   *     environment: [{ name: 'NODE_ENV', value: 'production' }]
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Customize the SSR Lambda function (memory, timeout, VPC, logging).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   database:
   *     type: relational-database
   *     properties:
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.6'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   *       credentials:
   *         masterUserPassword: $Secret('database.password')
   *   web:
   *     type: sveltekit-web
   *     properties:
   *       connectTo:
   *         - database
   *       # stp-focus
   *       serverLambda:
   *         memory: 2048
   *         timeout: 20
   *         joinDefaultVpc: true
   *         logging:
   *           retentionDays: 90
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, SvelteKitWeb, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const database = new RelationalDatabase({
   *     engine: {
   *       type: 'postgres',
   *       properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.micro' } }
   *     },
   *     credentials: { masterUserPassword: $Secret('database.password') }
   *   });
   *   const web = new SvelteKitWeb({
   *     connectTo: ['database'],
   *     // stp-focus
   *     serverLambda: {
   *       memory: 2048,
   *       timeout: 20,
   *       joinDefaultVpc: true,
   *       logging: { retentionDays: 90 }
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { database, web } };
   * });
   * ```
   */
  serverLambda?: SsrWebServerLambdaConfig;
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   firewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: cdn
   *   web:
   *     type: sveltekit-web
   *     properties:
   *       # stp-focus
   *       useFirewall: firewall
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, SvelteKitWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const firewall = new WebAppFirewall({ scope: 'cdn' });
   *   const web = new SvelteKitWeb({
   *     // stp-focus
   *     useFirewall: 'firewall',
   *     // stp-end-focus
   *     environment: [{ name: 'NODE_ENV', value: 'production' }]
   *   });
   *   return { resources: { firewall, web } };
   * });
   * ```
   */
  useFirewall?: string;
  /**
   * #### Dev server config for `stacktape dev`. Defaults to `vite dev`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: sveltekit-web
   *     properties:
   *       # stp-focus
   *       dev:
   *         command: pnpm run dev
   *         workingDirectory: ./apps/storefront
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SvelteKitWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SvelteKitWeb({
   *     // stp-focus
   *     dev: {
   *       command: 'pnpm run dev',
   *       workingDirectory: './apps/storefront'
   *     },
   *     // stp-end-focus
   *     environment: [{ name: 'NODE_ENV', value: 'production' }]
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  dev?: SsrWebDevConfig;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: sveltekit-web
   *     properties:
   *       # stp-focus
   *       fileOptions:
   *         - includePattern: '_app/immutable/**'
   *           headers:
   *             - key: Cache-Control
   *               value: 'public, max-age=31536000, immutable'
   *         - includePattern: '*.html'
   *           headers:
   *             - key: Cache-Control
   *               value: no-cache
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SvelteKitWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SvelteKitWeb({
   *     // stp-focus
   *     fileOptions: [
   *       {
   *         includePattern: '_app/immutable/**',
   *         headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
   *       },
   *       {
   *         includePattern: '*.html',
   *         headers: [{ key: 'Cache-Control', value: 'no-cache' }]
   *       }
   *     ],
   *     // stp-end-focus
   *     environment: [{ name: 'NODE_ENV', value: 'production' }]
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### CDN cache controls for SSR routes and specific path patterns.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: sveltekit-web
   *     properties:
   *       # stp-focus
   *       cdn:
   *         disableInvalidationAfterDeploy: false
   *         defaultCachingOptions:
   *           minTTL: 0
   *           maxTTL: 86400
   *           defaultTTL: 3600
   *         pathCachingOverrides:
   *           - path: /api/*
   *             cachingOptions:
   *               cacheMethods:
   *                 - GET
   *                 - HEAD
   *                 - OPTIONS
   *               minTTL: 0
   *               maxTTL: 0
   *               defaultTTL: 0
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SvelteKitWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SvelteKitWeb({
   *     // stp-focus
   *     cdn: {
   *       disableInvalidationAfterDeploy: false,
   *       defaultCachingOptions: { minTTL: 0, maxTTL: 86400, defaultTTL: 3600 },
   *       pathCachingOverrides: [
   *         {
   *           path: '/api/*',
   *           cachingOptions: {
   *             cacheMethods: ['GET', 'HEAD', 'OPTIONS'],
   *             minTTL: 0,
   *             maxTTL: 0,
   *             defaultTTL: 0
   *           }
   *         }
   *       ]
   *     },
   *     // stp-end-focus
   *     environment: [{ name: 'NODE_ENV', value: 'production' }]
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  cdn?: SsrWebCdnConfig;
}

type StpSvelteKitWeb = SvelteKitWebProps & {
  name: string;
  type: SvelteKitWeb['type'];
  configParentResourceType: SvelteKitWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
