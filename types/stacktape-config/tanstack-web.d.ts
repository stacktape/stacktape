/**
 * #### Deploy a TanStack Start SSR app with Lambda (Nitro aws-lambda preset), S3 for static assets, and CloudFront CDN.
 */
interface TanStackWeb {
  type: 'tanstack-web';
  properties: TanStackWebProps;
  overrides?: ResourceOverrides;
}

interface TanStackWebProps extends ResourceAccessProps {
  /**
   * #### Directory containing your `app.config.ts`. For monorepos, point to the TanStack Start workspace.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # appDirectory
   * resources:
   *   web:
   *     type: tanstack-web
   *     properties:
   *       # stp-focus
   *       appDirectory: ./packages/web
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // appDirectory
   * import { TanStackWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new TanStackWeb({
   *     // stp-focus
   *     appDirectory: './packages/web',
   *     // stp-end-focus
   *     environment: [{ name: 'NODE_ENV', value: 'production' }]
   *   });
   *   return { resources: { web } };
   * });
   * ```
   *
   * @default "."
   */
  appDirectory?: string;
  /**
   * #### Override the default `vinxi build` command.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # buildCommand
   * resources:
   *   web:
   *     type: tanstack-web
   *     properties:
   *       # stp-focus
   *       buildCommand: npm run build
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // buildCommand
   * import { TanStackWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new TanStackWeb({
   *     // stp-focus
   *     buildCommand: 'npm run build',
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
   * # environment
   * resources:
   *   database:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.6'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *   web:
   *     type: tanstack-web
   *     properties:
   *       # stp-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   *         - name: DATABASE_URL
   *           value: $ResourceParam('database', 'connectionString')
   *         - name: API_KEY
   *           value: $Secret('api-key')
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // environment
   * import { TanStackWeb, RelationalDatabase, defineConfig, $Secret, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const database = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: { type: 'postgres', properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t3.micro' } } }
   *   });
   *   const web = new TanStackWeb({
   *     // stp-focus
   *     environment: [
   *       { name: 'NODE_ENV', value: 'production' },
   *       { name: 'DATABASE_URL', value: $ResourceParam('database', 'connectionString') },
   *       { name: 'API_KEY', value: $Secret('api-key') }
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
   * # customDomains
   * resources:
   *   web:
   *     type: tanstack-web
   *     properties:
   *       # stp-focus
   *       customDomains:
   *         - domainName: app.mydomain.com
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // customDomains
   * import { TanStackWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new TanStackWeb({
   *     // stp-focus
   *     customDomains: [{ domainName: 'app.mydomain.com' }],
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
   * # serverLambda
   * resources:
   *   web:
   *     type: tanstack-web
   *     properties:
   *       # stp-focus
   *       serverLambda:
   *         memory: 2048
   *         timeout: 20
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // serverLambda
   * import { TanStackWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new TanStackWeb({
   *     // stp-focus
   *     serverLambda: { memory: 2048, timeout: 20 },
   *     // stp-end-focus
   *     environment: [{ name: 'NODE_ENV', value: 'production' }]
   *   });
   *   return { resources: { web } };
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
   * # useFirewall
   * resources:
   *   firewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: cdn
   *   web:
   *     type: tanstack-web
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
   * // useFirewall
   * import { TanStackWeb, WebAppFirewall, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const firewall = new WebAppFirewall({ scope: 'cdn' });
   *   const web = new TanStackWeb({
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
   * #### Dev server config for `stacktape dev`. Defaults to `vinxi dev`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * # dev
   * resources:
   *   web:
   *     type: tanstack-web
   *     properties:
   *       # stp-focus
   *       dev:
   *         command: npm run dev
   *         workingDirectory: ./packages/web
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: development
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // dev
   * import { TanStackWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new TanStackWeb({
   *     // stp-focus
   *     dev: { command: 'npm run dev', workingDirectory: './packages/web' },
   *     // stp-end-focus
   *     environment: [{ name: 'NODE_ENV', value: 'development' }]
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
   * # fileOptions
   * resources:
   *   web:
   *     type: tanstack-web
   *     properties:
   *       # stp-focus
   *       fileOptions:
   *         - includePattern: 'assets/**'
   *           headers:
   *             - key: Cache-Control
   *               value: 'public, max-age=31536000, immutable'
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // fileOptions
   * import { TanStackWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new TanStackWeb({
   *     // stp-focus
   *     fileOptions: [
   *       {
   *         includePattern: 'assets/**',
   *         headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
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
   * # cdn
   * resources:
   *   web:
   *     type: tanstack-web
   *     properties:
   *       # stp-focus
   *       cdn:
   *         disableInvalidationAfterDeploy: false
   *         defaultCachingOptions:
   *           defaultTTL: 60
   *       # stp-end-focus
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * // cdn
   * import { TanStackWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new TanStackWeb({
   *     // stp-focus
   *     cdn: {
   *       disableInvalidationAfterDeploy: false,
   *       defaultCachingOptions: { defaultTTL: 60 }
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

type StpTanStackWeb = TanStackWebProps & {
  name: string;
  type: TanStackWeb['type'];
  configParentResourceType: TanStackWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
