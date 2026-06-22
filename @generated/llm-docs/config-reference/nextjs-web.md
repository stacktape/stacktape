# Nextjs Web

Resource type: `nextjs-web`

## TypeScript Definition

```typescript
/**
 * #### Deploy a Next.js app with SSR on AWS Lambda, static assets on S3, and a CloudFront CDN.
 *
 * ---
 *
 * Handles ISR (Incremental Static Regeneration), image optimization, and middleware out of the box.
 * Optionally deploy to Lambda@Edge for lower latency or enable response streaming.
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   web:
 *     type: nextjs-web
 *     properties:
 *       appDirectory: ./
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { NextjsWeb, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const web = new NextjsWeb({
 *     appDirectory: './'
 *   });
 *   return { resources: { web } };
 * });
 * ```
 */
interface NextjsWeb {
  type: 'nextjs-web';
  properties: NextjsWebProps;
  overrides?: ResourceOverrides;
}

interface NextjsWebProps extends ResourceAccessProps {
  /**
   * #### Directory containing your `next.config.js`. For monorepos, point to the Next.js workspace.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: nextjs-web
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
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './apps/storefront',
   *     environment: { NODE_ENV: 'production' }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  appDirectory: string;
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
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       serverLambda:
   *         memory: 2048
   *         timeout: 25
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     serverLambda: {
   *       memory: 2048,
   *       timeout: 25
   *     }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  serverLambda?: NextjsServerLambdaProperties;
  /**
   * #### Number of Lambda instances to keep warm (pre-initialized) to reduce cold starts.
   *
   * ---
   *
   * A separate "warmer" function periodically pings the SSR Lambda. Not available with `useEdgeLambda: true`.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       warmServerInstances: 2
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     warmServerInstances: 2
   *   });
   *   return { resources: { web } };
   * });
   * ```
   *
   * @default 0
   */
  warmServerInstances?: number;
  /**
   * #### Run SSR at CloudFront edge locations for lower latency worldwide.
   *
   * ---
   *
   * **Trade-offs:** Slower deploys, no `warmServerInstances`, no response streaming.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       useEdgeLambda: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     useEdgeLambda: true
   *   });
   *   return { resources: { web } };
   * });
   * ```
   *
   * @default false
   */
  useEdgeLambda?: boolean;
  /**
   * #### Override the default `next build` command.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       buildCommand: pnpm run build
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     buildCommand: 'pnpm run build'
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  buildCommand?: string;
  /**
   * #### Dev server config for `stacktape dev`. Defaults to `next dev`.
   */
  dev?: {
    /**
     * #### Dev server command (e.g., `npm run dev`).
     *
     *
     * ---
     *
     * **Example (YAML):**
     *
     * ```yaml
     * resources:
     *   web:
     *     type: nextjs-web
     *     properties:
     *       appDirectory: ./
     *       dev:
     *         command: pnpm run dev
     * ```
     *
     * **Example (TypeScript):**
     *
     * ```ts
     * import { NextjsWeb, defineConfig } from 'stacktape';
     *
     * export default defineConfig(() => {
     *   const web = new NextjsWeb({
     *     appDirectory: './',
     *     dev: {
     *       command: 'pnpm run dev'
     *     }
     *   });
     *   return { resources: { web } };
     * });
     * ```
     *
     * @default "next dev"
     */
    command?: string;
  };
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
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       fileOptions:
   *         - includePattern: '**/*.{js,css,woff2}'
   *           headers:
   *             - key: Cache-Control
   *               value: 'public, max-age=31536000, immutable'
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     fileOptions: [
   *       {
   *         includePattern: '**/*.{js,css,woff2}',
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
   *         masterUserPassword: $Secret('db.password')
   *       engine:
   *         type: postgres
   *         properties:
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   *           version: '16.6'
   *   web:
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       connectTo:
   *         - database
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   *         - name: DATABASE_URL
   *           value: $ResourceParam('database', 'connectionString')
   *         - name: STRIPE_SECRET_KEY
   *           value: $Secret('stripe.secretKey')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, RelationalDatabase, defineConfig, $Secret, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const database = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db.password') },
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         primaryInstance: { instanceSize: 'db.t4g.micro' },
   *         version: '16.6'
   *       }
   *     }
   *   });
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     connectTo: [database],
   *     environment: {
   *       NODE_ENV: 'production',
   *       DATABASE_URL: $ResourceParam('database', 'connectionString'),
   *       STRIPE_SECRET_KEY: $Secret('stripe.secretKey')
   *     }
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
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       customDomains:
   *         - domainName: app.example.com
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     customDomains: [{ domainName: 'app.example.com' }]
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: cdn
   *   web:
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       useFirewall: webFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, WebAppFirewall, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webFirewall = new WebAppFirewall({ scope: 'cdn' });
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     useFirewall: 'webFirewall'
   *   });
   *   return { resources: { webFirewall, web } };
   * });
   * ```
   */
  useFirewall?: string;
  /**
   * #### Stream SSR responses for faster Time to First Byte and up to 20 MB response size (vs 6 MB default).
   *
   * ---
   *
   * Not compatible with `useEdgeLambda: true`.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       streamingEnabled: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     streamingEnabled: true
   *   });
   *   return { resources: { web } };
   * });
   * ```
   *
   * @default false
   */
  streamingEnabled?: boolean;
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
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       cdn:
   *         disableInvalidationAfterDeploy: false
   *         defaultCachingOptions:
   *           minTTL: 0
   *           defaultTTL: 60
   *           maxTTL: 3600
   *         pathCachingOverrides:
   *           - path: /_server-islands/*
   *             cachingOptions:
   *               defaultTTL: 300
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './',
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
   *           cachingOptions: { defaultTTL: 300 }
   *         }
   *       ]
   *     }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  cdn?: SsrWebCdnConfig;
}

interface NextjsServerLambdaProperties {
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
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       serverLambda:
   *         memory: 3008
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     serverLambda: {
   *       memory: 3008
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
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       serverLambda:
   *         timeout: 30
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     serverLambda: {
   *       timeout: 30
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
   * #### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       serverLambda:
   *         logging:
   *           retentionDays: 90
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NextjsWeb({
   *     appDirectory: './',
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
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   *
   * ---
   *
   * S3 and DynamoDB remain accessible via auto-created VPC endpoints.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   database:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db.password')
   *       engine:
   *         type: postgres
   *         properties:
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   *           version: '16.6'
   *   web:
   *     type: nextjs-web
   *     properties:
   *       appDirectory: ./
   *       connectTo:
   *         - database
   *       serverLambda:
   *         joinDefaultVpc: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NextjsWeb, RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const database = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db.password') },
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         primaryInstance: { instanceSize: 'db.t4g.micro' },
   *         version: '16.6'
   *       }
   *     }
   *   });
   *   const web = new NextjsWeb({
   *     appDirectory: './',
   *     connectTo: [database],
   *     serverLambda: {
   *       joinDefaultVpc: true
   *     }
   *   });
   *   return { resources: { database, web } };
   * });
   * ```
   */
  joinDefaultVpc?: boolean;
}
```
