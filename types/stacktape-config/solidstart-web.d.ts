/**
 * #### Deploy a SolidStart SSR app with Lambda (AWS adapter), S3 for static assets, and CloudFront CDN.
 */
interface SolidStartWeb {
  type: 'solidstart-web';
  properties: SolidStartWebProps;
  overrides?: ResourceOverrides;
}

interface SolidStartWebProps extends ResourceAccessProps {
  /**
   * #### Directory containing your `app.config.ts`. For monorepos, point to the SolidStart workspace.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: solidstart-web
   *     properties:
   *       # stp-focus
   *       appDirectory: ./packages/web
   *       # stp-end-focus
   *       environment:
   *         - name: PUBLIC_API_URL
   *           value: https://api.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SolidStartWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SolidStartWeb({
   *     // stp-focus
   *     appDirectory: './packages/web',
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
   * #### Override the default `vinxi build` command.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: solidstart-web
   *     properties:
   *       # stp-focus
   *       buildCommand: pnpm run build
   *       # stp-end-focus
   *       environment:
   *         - name: PUBLIC_STAGE
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SolidStartWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SolidStartWeb({
   *     // stp-focus
   *     buildCommand: 'pnpm run build',
   *     // stp-end-focus
   *     environment: [{ name: 'PUBLIC_STAGE', value: 'production' }]
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
   *             instanceSize: db.t3.micro
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *   web:
   *     type: solidstart-web
   *     properties:
   *       # stp-focus
   *       environment:
   *         - name: DATABASE_URL
   *           value: $ResourceParam('database', 'connectionString')
   *         - name: SESSION_SECRET
   *           value: $Secret('session-secret')
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SolidStartWeb, RelationalDatabase, defineConfig, $ResourceParam, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const database = new RelationalDatabase({
   *     engine: { type: 'postgres', properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t3.micro' } } },
   *     credentials: { masterUserPassword: $Secret('db-password') }
   *   });
   *   const web = new SolidStartWeb({
   *     // stp-focus
   *     environment: [
   *       { name: 'DATABASE_URL', value: $ResourceParam('database', 'connectionString') },
   *       { name: 'SESSION_SECRET', value: $Secret('session-secret') }
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
   *     type: solidstart-web
   *     properties:
   *       # stp-focus
   *       customDomains:
   *         - domainName: app.example.com
   *       # stp-end-focus
   *       environment:
   *         - name: PUBLIC_API_URL
   *           value: https://api.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SolidStartWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SolidStartWeb({
   *     // stp-focus
   *     customDomains: [{ domainName: 'app.example.com' }],
   *     // stp-end-focus
   *     environment: [{ name: 'PUBLIC_API_URL', value: 'https://api.example.com' }]
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
   *   web:
   *     type: solidstart-web
   *     properties:
   *       # stp-focus
   *       serverLambda:
   *         memory: 2048
   *         timeout: 20
   *         logging:
   *           retentionDays: 30
   *       # stp-end-focus
   *       environment:
   *         - name: PUBLIC_API_URL
   *           value: https://api.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SolidStartWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SolidStartWeb({
   *     // stp-focus
   *     serverLambda: {
   *       memory: 2048,
   *       timeout: 20,
   *       logging: { retentionDays: 30 }
   *     },
   *     // stp-end-focus
   *     environment: [{ name: 'PUBLIC_API_URL', value: 'https://api.example.com' }]
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
   * resources:
   *   firewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: cdn
   *   web:
   *     type: solidstart-web
   *     properties:
   *       # stp-focus
   *       useFirewall: firewall
   *       # stp-end-focus
   *       customDomains:
   *         - domainName: app.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SolidStartWeb, WebAppFirewall, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const firewall = new WebAppFirewall({ scope: 'cdn' });
   *   const web = new SolidStartWeb({
   *     // stp-focus
   *     useFirewall: 'firewall',
   *     // stp-end-focus
   *     customDomains: [{ domainName: 'app.example.com' }]
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
   * resources:
   *   web:
   *     type: solidstart-web
   *     properties:
   *       # stp-focus
   *       dev:
   *         command: pnpm run dev
   *         workingDirectory: ./packages/web
   *       # stp-end-focus
   *       environment:
   *         - name: PUBLIC_API_URL
   *           value: https://api.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SolidStartWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SolidStartWeb({
   *     // stp-focus
   *     dev: {
   *       command: 'pnpm run dev',
   *       workingDirectory: './packages/web'
   *     },
   *     // stp-end-focus
   *     environment: [{ name: 'PUBLIC_API_URL', value: 'https://api.example.com' }]
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
   *     type: solidstart-web
   *     properties:
   *       # stp-focus
   *       fileOptions:
   *         - includePattern: '**\/*.html'
   *           headers:
   *             - key: Cache-Control
   *               value: no-cache
   *         - includePattern: assets/**
   *           headers:
   *             - key: Cache-Control
   *               value: public, max-age=31536000, immutable
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SolidStartWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SolidStartWeb({
   *     // stp-focus
   *     fileOptions: [
   *       { includePattern: '**\/*.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
   *       {
   *         includePattern: 'assets/**',
   *         headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
   *       }
   *     ]
   *     // stp-end-focus
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
   *     type: solidstart-web
   *     properties:
   *       # stp-focus
   *       cdn:
   *         disableInvalidationAfterDeploy: false
   *         defaultCachingOptions:
   *           minTTL: 0
   *           defaultTTL: 60
   *           maxTTL: 3600
   *         pathCachingOverrides:
   *           - path: /_server-islands/*
   *             cachingOptions:
   *               defaultTTL: 0
   *               maxTTL: 0
   *       # stp-end-focus
   *       customDomains:
   *         - domainName: app.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { SolidStartWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new SolidStartWeb({
   *     // stp-focus
   *     cdn: {
   *       disableInvalidationAfterDeploy: false,
   *       defaultCachingOptions: { minTTL: 0, defaultTTL: 60, maxTTL: 3600 },
   *       pathCachingOverrides: [
   *         { path: '/_server-islands/*', cachingOptions: { defaultTTL: 0, maxTTL: 0 } }
   *       ]
   *     },
   *     // stp-end-focus
   *     customDomains: [{ domainName: 'app.example.com' }]
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  cdn?: SsrWebCdnConfig;
}

type StpSolidStartWeb = SolidStartWebProps & {
  name: string;
  type: SolidStartWeb['type'];
  configParentResourceType: SolidStartWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
