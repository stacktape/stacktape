# Astro Web

Resource type: `astro-web`

## TypeScript Definition

```typescript
/**
 * #### Deploy an Astro SSR app with Lambda for server rendering, S3 for static assets, and CloudFront CDN.
 *
 * ---
 *
 * For static-only Astro sites, use `hosting-bucket` with `hostingContentType: 'astro-static-website'` instead.
 */
interface AstroWeb {
  type: 'astro-web';
  properties: AstroWebProps;
  overrides?: ResourceOverrides;
}

interface AstroWebProps extends ResourceAccessProps {
  /**
   * #### Directory containing your `astro.config.mjs`. For monorepos, point to the Astro workspace.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: astro-web
   *     properties:
   *       appDirectory: packages/storefront
   *       buildCommand: npm run build
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     appDirectory: 'packages/storefront',
   *     buildCommand: 'npm run build'
   *   });
   *   return { resources: { web } };
   * });
   * ```
   *
   * @default "."
   */
  appDirectory?: string;
  /**
   * #### Override the default `astro build` command.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: astro-web
   *     properties:
   *       appDirectory: .
   *       buildCommand: npm run build:production
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     appDirectory: '.',
   *     buildCommand: 'npm run build:production'
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
   *   marketingDb:
   *     type: relational-database
   *     properties:
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.6'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *       credentials:
   *         masterUserPassword: $Secret('db.password')
   *   web:
   *     type: astro-web
   *     properties:
   *       environment:
   *         - name: PUBLIC_SITE_NAME
   *           value: My Store
   *         - name: DATABASE_URL
   *           value: $ResourceParam('marketingDb', 'connectionString')
   *         - name: STRIPE_SECRET
   *           value: $Secret('stripe.secretKey')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, RelationalDatabase, defineConfig, $ResourceParam, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const marketingDb = new RelationalDatabase({
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.6',
   *         primaryInstance: { instanceSize: 'db.t3.micro' }
   *       }
   *     },
   *     credentials: { masterUserPassword: $Secret('db.password') }
   *   });
   *   const web = new AstroWeb({
   *     environment: [
   *       { name: 'PUBLIC_SITE_NAME', value: 'My Store' },
   *       { name: 'DATABASE_URL', value: $ResourceParam('marketingDb', 'connectionString') },
   *       { name: 'STRIPE_SECRET', value: $Secret('stripe.secretKey') }
   *     ]
   *   });
   *   return { resources: { marketingDb, web } };
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
   *     type: astro-web
   *     properties:
   *       customDomains:
   *         - domainName: shop.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     customDomains: [{ domainName: 'shop.example.com' }]
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
   *     type: astro-web
   *     properties:
   *       serverLambda:
   *         memory: 2048
   *         timeout: 20
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     serverLambda: {
   *       memory: 2048,
   *       timeout: 20
   *     }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  serverLambda?: AstroWebServerLambdaConfig;
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   storefrontFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: cdn
   *   web:
   *     type: astro-web
   *     properties:
   *       useFirewall: storefrontFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, WebAppFirewall, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const storefrontFirewall = new WebAppFirewall({ scope: 'cdn' });
   *   const web = new AstroWeb({
   *     useFirewall: 'storefrontFirewall'
   *   });
   *   return { resources: { storefrontFirewall, web } };
   * });
   * ```
   */
  useFirewall?: string;
  /**
   * #### Dev server config for `stacktape dev`. Defaults to `astro dev`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: astro-web
   *     properties:
   *       dev:
   *         command: npm run dev
   *         workingDirectory: packages/storefront
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     dev: {
   *       command: 'npm run dev',
   *       workingDirectory: 'packages/storefront'
   *     }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  dev?: AstroWebDevConfig;
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
   *     type: astro-web
   *     properties:
   *       fileOptions:
   *         - includePattern: '_astro/**'
   *           headers:
   *             - key: Cache-Control
   *               value: 'public, max-age=31536000, immutable'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     fileOptions: [
   *       {
   *         includePattern: '_astro/**',
   *         headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
   *       }
   *     ]
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
   *     type: astro-web
   *     properties:
   *       cdn:
   *         disableInvalidationAfterDeploy: false
   *         defaultCachingOptions:
   *           minTTL: 0
   *           defaultTTL: 60
   *           maxTTL: 86400
   *         pathCachingOverrides:
   *           - path: /_server-islands/*
   *             cachingOptions:
   *               defaultTTL: 0
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     cdn: {
   *       disableInvalidationAfterDeploy: false,
   *       defaultCachingOptions: {
   *         minTTL: 0,
   *         defaultTTL: 60,
   *         maxTTL: 86400
   *       },
   *       pathCachingOverrides: [
   *         { path: '/_server-islands/*', cachingOptions: { defaultTTL: 0 } }
   *       ]
   *     }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  cdn?: SsrWebCdnConfig;
}

interface AstroWebServerLambdaConfig {
  /**
   * #### Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: astro-web
   *     properties:
   *       serverLambda:
   *         memory: 3008
   *         timeout: 30
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     serverLambda: {
   *       memory: 3008,
   *       timeout: 30
   *     }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   *
   * @default 1024
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 30.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: astro-web
   *     properties:
   *       serverLambda:
   *         memory: 1024
   *         timeout: 25
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     serverLambda: {
   *       memory: 1024,
   *       timeout: 25
   *     }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   *
   * @default 30
   */
  timeout?: number;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   cache:
   *     type: redis-cluster
   *     properties:
   *       defaultUserPassword: $Secret('redis.password')
   *       instanceSize: cache.t3.micro
   *   web:
   *     type: astro-web
   *     properties:
   *       connectTo:
   *         - cache
   *       serverLambda:
   *         joinDefaultVpc: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, RedisCluster, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cache = new RedisCluster({
   *     defaultUserPassword: $Secret('redis.password'),
   *     instanceSize: 'cache.t3.micro'
   *   });
   *   const web = new AstroWeb({
   *     connectTo: ['cache'],
   *     serverLambda: {
   *       joinDefaultVpc: true
   *     }
   *   });
   *   return { resources: { cache, web } };
   * });
   * ```
   */
  joinDefaultVpc?: boolean;
  /**
   * #### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: astro-web
   *     properties:
   *       serverLambda:
   *         logging:
   *           retentionDays: 90
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     serverLambda: {
   *       logging: {
   *         retentionDays: 90
   *       }
   *     }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  logging?: LambdaFunctionLogging;
}

interface AstroWebDevConfig {
  /**
   * #### Override the default `astro dev` command (e.g., `npm run dev`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: astro-web
   *     properties:
   *       dev:
   *         command: npm run dev
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     dev: {
   *       command: 'npm run dev'
   *     }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  command?: string;
  /**
   * #### Working directory for the dev command, relative to project root.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: astro-web
   *     properties:
   *       dev:
   *         command: astro dev
   *         workingDirectory: packages/storefront
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { AstroWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new AstroWeb({
   *     dev: {
   *       command: 'astro dev',
   *       workingDirectory: 'packages/storefront'
   *     }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  workingDirectory?: string;
}
```
