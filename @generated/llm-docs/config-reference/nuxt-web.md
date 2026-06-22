# Nuxt Web

Resource type: `nuxt-web`

## TypeScript Definition

```typescript
/**
 * #### Deploy a Nuxt SSR app with Lambda (Nitro aws-lambda preset), S3 for static assets, and CloudFront CDN.
 *
 * ---
 *
 * For static-only Nuxt sites, use `hosting-bucket` with `hostingContentType: 'nuxt-static-website'` instead.
 */
interface NuxtWeb {
  type: 'nuxt-web';
  properties: NuxtWebProps;
  overrides?: ResourceOverrides;
}

interface NuxtWebProps extends ResourceAccessProps {
  /**
   * #### Directory containing your `nuxt.config.ts`. For monorepos, point to the Nuxt workspace.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: ./apps/storefront
   *       buildCommand: npm run build
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NuxtWeb({
   *     appDirectory: './apps/storefront',
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
   * #### Override the default `nuxt build` command.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: .
   *       buildCommand: npm run generate:ssr
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NuxtWeb({
   *     appDirectory: '.',
   *     buildCommand: 'npm run generate:ssr'
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
   *   db:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('db.password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.6'
   *           primaryInstance:
   *             instanceSize: db.t3.micro
   *   web:
   *     type: nuxt-web
   *     properties:
   *       environment:
   *         - name: NUXT_PUBLIC_API_BASE
   *           value: https://api.example.com
   *         - name: DATABASE_URL
   *           value: $ResourceParam('db', 'connectionString')
   *         - name: SESSION_SECRET
   *           value: $Secret('session.secret')
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, RelationalDatabase, defineConfig, $Secret, $ResourceParam } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const db = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('db.password') },
   *     engine: {
   *       type: 'postgres',
   *       properties: {
   *         version: '16.6',
   *         primaryInstance: { instanceSize: 'db.t3.micro' }
   *       }
   *     }
   *   });
   *   const web = new NuxtWeb({
   *     environment: {
   *       NUXT_PUBLIC_API_BASE: 'https://api.example.com',
   *       DATABASE_URL: $ResourceParam('db', 'connectionString'),
   *       SESSION_SECRET: $Secret('session.secret')
   *     }
   *   });
   *   return { resources: { db, web } };
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
   *     type: nuxt-web
   *     properties:
   *       customDomains:
   *         - domainName: www.example.com
   *         - domainName: shop.example.com
   *           disableDnsRecordCreation: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NuxtWeb({
   *     customDomains: [
   *       { domainName: 'www.example.com' },
   *       { domainName: 'shop.example.com', disableDnsRecordCreation: true }
   *     ]
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
   *     type: nuxt-web
   *     properties:
   *       serverLambda:
   *         memory: 2048
   *         timeout: 25
   *         joinDefaultVpc: true
   *         logging:
   *           retentionDays: 30
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NuxtWeb({
   *     serverLambda: {
   *       memory: 2048,
   *       timeout: 25,
   *       joinDefaultVpc: true,
   *       logging: { retentionDays: 30 }
   *     }
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
   *   cdnFirewall:
   *     type: web-app-firewall
   *     properties:
   *       scope: cdn
   *       defaultAction: Allow
   *       rules:
   *         - type: managed-rule-group
   *           properties:
   *             name: AWSManagedRulesCommonRuleSet
   *             vendorName: AWS
   *             priority: 10
   *   web:
   *     type: nuxt-web
   *     properties:
   *       useFirewall: cdnFirewall
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, WebAppFirewall, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const cdnFirewall = new WebAppFirewall({
   *     scope: 'cdn',
   *     defaultAction: 'Allow',
   *     rules: [
   *       {
   *         type: 'managed-rule-group',
   *         properties: { name: 'AWSManagedRulesCommonRuleSet', vendorName: 'AWS', priority: 10 }
   *       }
   *     ]
   *   });
   *   const web = new NuxtWeb({
   *     useFirewall: 'cdnFirewall'
   *   });
   *   return { resources: { cdnFirewall, web } };
   * });
   * ```
   */
  useFirewall?: string;
  /**
   * #### Dev server config for `stacktape dev`. Defaults to `nuxt dev`.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   web:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: ./apps/web
   *       dev:
   *         command: npm run dev
   *         workingDirectory: ./apps/web
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NuxtWeb({
   *     appDirectory: './apps/web',
   *     dev: {
   *       command: 'npm run dev',
   *       workingDirectory: './apps/web'
   *     }
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
   *     type: nuxt-web
   *     properties:
   *       fileOptions:
   *         - includePattern: '_nuxt/**'
   *           headers:
   *             - key: Cache-Control
   *               value: 'public, max-age=31536000, immutable'
   *         - includePattern: '*.html'
   *           headers:
   *             - key: Cache-Control
   *               value: no-cache
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NuxtWeb({
   *     fileOptions: [
   *       {
   *         includePattern: '_nuxt/**',
   *         headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
   *       },
   *       {
   *         includePattern: '*.html',
   *         headers: [{ key: 'Cache-Control', value: 'no-cache' }]
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
   *     type: nuxt-web
   *     properties:
   *       cdn:
   *         disableInvalidationAfterDeploy: false
   *         defaultCachingOptions:
   *           minTTL: 0
   *           defaultTTL: 60
   *           maxTTL: 3600
   *         pathCachingOverrides:
   *           - path: '/_nuxt/*'
   *             cachingOptions:
   *               defaultTTL: 31536000
   *               maxTTL: 31536000
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const web = new NuxtWeb({
   *     cdn: {
   *       disableInvalidationAfterDeploy: false,
   *       defaultCachingOptions: { minTTL: 0, defaultTTL: 60, maxTTL: 3600 },
   *       pathCachingOverrides: [
   *         { path: '/_nuxt/*', cachingOptions: { defaultTTL: 31536000, maxTTL: 31536000 } }
   *       ]
   *     }
   *   });
   *   return { resources: { web } };
   * });
   * ```
   */
  cdn?: SsrWebCdnConfig;
}
```
