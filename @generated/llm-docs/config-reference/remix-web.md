# Remix Web

Resource type: `remix-web`

## TypeScript Definition

```typescript
/**
 * #### Deploy a Remix SSR app with Lambda for server rendering, S3 for static assets, and CloudFront CDN.
 */
interface RemixWeb {
  type: 'remix-web';
  properties: RemixWebProps;
  overrides?: ResourceOverrides;
}

interface RemixWebProps extends ResourceAccessProps {
  /**
   * #### Directory containing your `vite.config.ts` (or `remix.config.js`). For monorepos, point to the Remix workspace.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: remix-web
   *     properties:
   *       appDirectory: ./apps/storefront
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RemixWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new RemixWeb({
   *     appDirectory: './apps/storefront',
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
   * #### Override the default `remix vite:build` command.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: remix-web
   *     properties:
   *       buildCommand: npm run build:remix
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RemixWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new RemixWeb({
   *     buildCommand: 'npm run build:remix',
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
   *       credentials:
   *         masterUserPassword: $Secret('db-password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.6'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *   web:
   *     type: remix-web
   *     properties:
   *       connectTo:
   *         - database
   *       environment:
   *         - name: DATABASE_URL
   *           value: $ResourceParam('database', 'connectionString')
   *         - name: SESSION_SECRET
   *           value: $Secret('session-secret')
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RelationalDatabase, RemixWeb, defineConfig, $ResourceParam, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const database = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db-password') },
   *     engine: {
   *       type: 'postgres',
   *       properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t3.micro' } }
   *     }
   *   });
   *   const web = new RemixWeb({
   *     connectTo: ['database'],
   *     environment: [
   *       { name: 'DATABASE_URL', value: $ResourceParam('database', 'connectionString') },
   *       { name: 'SESSION_SECRET', value: $Secret('session-secret') },
   *       { name: 'NODE_ENV', value: 'production' }
   *     ]
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
   *     type: remix-web
   *     properties:
   *       customDomains:
   *         - domainName: app.example.com
   *         - domainName: www.example.com
   *           disableDnsRecordCreation: true
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RemixWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new RemixWeb({
   *     customDomains: [
   *       { domainName: 'app.example.com' },
   *       { domainName: 'www.example.com', disableDnsRecordCreation: true }
   *     ],
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
   *   web:
   *     type: remix-web
   *     properties:
   *       serverLambda:
   *         memory: 2048
   *         timeout: 25
   *         joinDefaultVpc: true
   *         logging:
   *           retentionDays: 90
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RemixWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new RemixWeb({
   *     serverLambda: {
   *       memory: 2048,
   *       timeout: 25,
   *       joinDefaultVpc: true,
   *       logging: { retentionDays: 90 }
   *     },
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
   * resources:
   *   firewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: cdn
   *   web:
   *     type: remix-web
   *     properties:
   *       useFirewall: firewall
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { WebAppFirewall, RemixWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const firewall = new WebAppFirewall({ scope: 'cdn' });
   *   const web = new RemixWeb({
   *     useFirewall: 'firewall',
   *     environment: [{ name: 'NODE_ENV', value: 'production' }]
   *   });
   *   return { resources: { firewall, web } };
   * });
   * ```
   */
  useFirewall?: string;
  /**
   * #### Dev server config for `stacktape dev`. Defaults to `remix vite:dev`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: remix-web
   *     properties:
   *       dev:
   *         command: npm run dev
   *         workingDirectory: ./apps/storefront
   *       appDirectory: ./apps/storefront
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RemixWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new RemixWeb({
   *     dev: {
   *       command: 'npm run dev',
   *       workingDirectory: './apps/storefront'
   *     },
   *     appDirectory: './apps/storefront',
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
   *     type: remix-web
   *     properties:
   *       fileOptions:
   *         - includePattern: 'assets/**'
   *           headers:
   *             - key: Cache-Control
   *               value: 'public, max-age=31536000, immutable'
   *         - includePattern: '*.html'
   *           headers:
   *             - key: Cache-Control
   *               value: no-cache
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RemixWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new RemixWeb({
   *     fileOptions: [
   *       {
   *         includePattern: 'assets/**',
   *         headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
   *       },
   *       {
   *         includePattern: '*.html',
   *         headers: [{ key: 'Cache-Control', value: 'no-cache' }]
   *       }
   *     ],
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
   *     type: remix-web
   *     properties:
   *       cdn:
   *         disableInvalidationAfterDeploy: false
   *         defaultCachingOptions:
   *           minTTL: 0
   *           defaultTTL: 60
   *           maxTTL: 3600
   *         pathCachingOverrides:
   *           - path: '/_server-islands/*'
   *             cachingOptions:
   *               defaultTTL: 300
   *               cacheKeyParameters:
   *                 queryString:
   *                   all: true
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { RemixWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new RemixWeb({
   *     cdn: {
   *       disableInvalidationAfterDeploy: false,
   *       defaultCachingOptions: {
   *         minTTL: 0,
   *         defaultTTL: 60,
   *         maxTTL: 3600
   *       },
   *       pathCachingOverrides: [
   *         {
   *           path: '/_server-islands/*',
   *           cachingOptions: {
   *             defaultTTL: 300,
   *             cacheKeyParameters: { queryString: { all: true } }
   *           }
   *         }
   *       ]
   *     },
   *     environment: [{ name: 'NODE_ENV', value: 'production' }]
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  cdn?: SsrWebCdnConfig;
}
```
