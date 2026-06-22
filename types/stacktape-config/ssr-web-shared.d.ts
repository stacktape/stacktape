/**
 * Shared types for SSR web resources (Astro, Nuxt, SvelteKit, SolidStart, TanStack Start, Remix)
 */

/**
 * Server Lambda configuration shared by all SSR web resources
 */
interface SsrWebServerLambdaConfig {
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
   *   webApp:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: .
   *       environment:
   *         - name: NODE_ENV
   *           value: production
   *       serverLambda:
   *         # stp-focus
   *         memory: 2048
   *         # stp-end-focus
   *         timeout: 20
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApp = new NuxtWeb({
   *     appDirectory: '.',
   *     environment: { NODE_ENV: 'production' },
   *     serverLambda: {
   *       // stp-focus
   *       memory: 2048,
   *       // stp-end-focus
   *       timeout: 20
   *     }
   *   });
   *
   *   return { resources: { webApp } };
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
   *   webApp:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: .
   *       serverLambda:
   *         memory: 1024
   *         # stp-focus
   *         timeout: 25
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApp = new NuxtWeb({
   *     appDirectory: '.',
   *     serverLambda: {
   *       memory: 1024,
   *       // stp-focus
   *       timeout: 25
   *       // stp-end-focus
   *     }
   *   });
   *
   *   return { resources: { webApp } };
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
   *   database:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserPassword: $Secret('database.password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.6'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   *       accessibility:
   *         accessibilityMode: scoping-workloads-in-vpc
   *   webApp:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: .
   *       connectTo:
   *         - database
   *       environment:
   *         - name: DATABASE_URL
   *           value: $ResourceParam('database', 'connectionString')
   *       serverLambda:
   *         memory: 1024
   *         # stp-focus
   *         joinDefaultVpc: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, RelationalDatabase, $Secret, $ResourceParam, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const database = new RelationalDatabase({
   *     credentials: { masterUserPassword: $Secret('database.password') },
   *     engine: {
   *       type: 'postgres',
   *       properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t4g.micro' } }
   *     },
   *     accessibility: { accessibilityMode: 'scoping-workloads-in-vpc' }
   *   });
   *
   *   const webApp = new NuxtWeb({
   *     appDirectory: '.',
   *     connectTo: [database],
   *     environment: { DATABASE_URL: $ResourceParam('database', 'connectionString') },
   *     serverLambda: {
   *       memory: 1024,
   *       // stp-focus
   *       joinDefaultVpc: true
   *       // stp-end-focus
   *     }
   *   });
   *
   *   return { resources: { database, webApp } };
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
   *   webApp:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: .
   *       serverLambda:
   *         memory: 1024
   *         # stp-focus
   *         logging:
   *           retentionDays: 30
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApp = new NuxtWeb({
   *     appDirectory: '.',
   *     serverLambda: {
   *       memory: 1024,
   *       // stp-focus
   *       logging: {
   *         retentionDays: 30
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *
   *   return { resources: { webApp } };
   * });
   * ```
   */
  logging?: LambdaFunctionLogging;
}

/**
 * Dev server configuration shared by all SSR web resources
 */
interface SsrWebDevConfig {
  /**
   * #### Override the default dev server command (e.g., `npm run dev`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webApp:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: .
   *       dev:
   *         # stp-focus
   *         command: npm run dev
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApp = new NuxtWeb({
   *     appDirectory: '.',
   *     dev: {
   *       // stp-focus
   *       command: 'npm run dev'
   *       // stp-end-focus
   *     }
   *   });
   *
   *   return { resources: { webApp } };
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
   *   webApp:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: packages/web
   *       dev:
   *         command: npm run dev
   *         # stp-focus
   *         workingDirectory: packages/web
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApp = new NuxtWeb({
   *     appDirectory: 'packages/web',
   *     dev: {
   *       command: 'npm run dev',
   *       // stp-focus
   *       workingDirectory: 'packages/web'
   *       // stp-end-focus
   *     }
   *   });
   *
   *   return { resources: { webApp } };
   * });
   * ```
   */
  workingDirectory?: string;
}

/**
 * CDN configuration shared by all SSR web resources
 */
interface SsrWebCdnConfig {
  /**
   * #### Skip clearing the CDN cache after each deploy.
   *
   * ---
   *
   * By default, all cached content is flushed on every deploy so users see the latest version.
   * Set to `true` if you manage cache invalidation yourself or want to keep cached content between deploys.
   *
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webApp:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: .
   *       cdn:
   *         # stp-focus
   *         disableInvalidationAfterDeploy: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApp = new NuxtWeb({
   *     appDirectory: '.',
   *     cdn: {
   *       // stp-focus
   *       disableInvalidationAfterDeploy: true
   *       // stp-end-focus
   *     }
   *   });
   *
   *   return { resources: { webApp } };
   * });
   * ```
   *
   * @default false
   */
  disableInvalidationAfterDeploy?: boolean;
  /**
   * #### Override default SSR caching behavior for all routes handled by the server.
   *
   * ---
   *
   * Useful when you want to cache SSR responses longer than the framework defaults.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webApp:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: .
   *       cdn:
   *         # stp-focus
   *         defaultCachingOptions:
   *           minTTL: 0
   *           defaultTTL: 60
   *           maxTTL: 3600
   *           cacheKeyParameters:
   *             queryString:
   *               all: true
   *             cookies:
   *               none: true
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApp = new NuxtWeb({
   *     appDirectory: '.',
   *     cdn: {
   *       // stp-focus
   *       defaultCachingOptions: {
   *         minTTL: 0,
   *         defaultTTL: 60,
   *         maxTTL: 3600,
   *         cacheKeyParameters: {
   *           queryString: { all: true },
   *           cookies: { none: true }
   *         }
   *       }
   *       // stp-end-focus
   *     }
   *   });
   *
   *   return { resources: { webApp } };
   * });
   * ```
   */
  defaultCachingOptions?: CdnCachingOptions;
  /**
   * #### Override caching for specific CDN path patterns.
   *
   * ---
   *
   * Matches existing framework-managed paths (e.g. `_astro/*`, `_next/data/*`) or adds
   * new server-path caching rules (e.g. `/_server-islands/*`) while preserving managed routing.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webApp:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: .
   *       cdn:
   *         # stp-focus
   *         pathCachingOverrides:
   *           - path: /_server-islands/*
   *             cachingOptions:
   *               minTTL: 0
   *               defaultTTL: 0
   *               maxTTL: 0
   *           - path: /api/*
   *             cachingOptions:
   *               cacheMethods:
   *                 - GET
   *                 - HEAD
   *                 - OPTIONS
   *               defaultTTL: 30
   *         # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApp = new NuxtWeb({
   *     appDirectory: '.',
   *     cdn: {
   *       // stp-focus
   *       pathCachingOverrides: [
   *         {
   *           path: '/_server-islands/*',
   *           cachingOptions: { minTTL: 0, defaultTTL: 0, maxTTL: 0 }
   *         },
   *         {
   *           path: '/api/*',
   *           cachingOptions: { cacheMethods: ['GET', 'HEAD', 'OPTIONS'], defaultTTL: 30 }
   *         }
   *       ]
   *       // stp-end-focus
   *     }
   *   });
   *
   *   return { resources: { webApp } };
   * });
   * ```
   */
  pathCachingOverrides?: SsrWebPathCachingOverride[];
}

interface SsrWebPathCachingOverride {
  /**
   * #### URL path pattern to match (e.g., `/api/*`, `/_server-islands/*`).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webApp:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: .
   *       cdn:
   *         pathCachingOverrides:
   *           - # stp-focus
   *             path: /_nuxt/*
   *             # stp-end-focus
   *             cachingOptions:
   *               minTTL: 31536000
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
   *   const webApp = new NuxtWeb({
   *     appDirectory: '.',
   *     cdn: {
   *       pathCachingOverrides: [
   *         {
   *           // stp-focus
   *           path: '/_nuxt/*',
   *           // stp-end-focus
   *           cachingOptions: { minTTL: 31536000, defaultTTL: 31536000, maxTTL: 31536000 }
   *         }
   *       ]
   *     }
   *   });
   *
   *   return { resources: { webApp } };
   * });
   * ```
   */
  path: string;
  /**
   * #### Caching behavior override for this path pattern.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webApp:
   *     type: nuxt-web
   *     properties:
   *       appDirectory: .
   *       cdn:
   *         pathCachingOverrides:
   *           - path: /api/*
   *             # stp-focus
   *             cachingOptions:
   *               cacheMethods:
   *                 - GET
   *                 - HEAD
   *               minTTL: 0
   *               defaultTTL: 15
   *               maxTTL: 300
   *               cacheKeyParameters:
   *                 queryString:
   *                   whitelist:
   *                     - page
   *                     - limit
   *             # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { NuxtWeb, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webApp = new NuxtWeb({
   *     appDirectory: '.',
   *     cdn: {
   *       pathCachingOverrides: [
   *         {
   *           path: '/api/*',
   *           // stp-focus
   *           cachingOptions: {
   *             cacheMethods: ['GET', 'HEAD'],
   *             minTTL: 0,
   *             defaultTTL: 15,
   *             maxTTL: 300,
   *             cacheKeyParameters: {
   *               queryString: { whitelist: ['page', 'limit'] }
   *             }
   *           }
   *           // stp-end-focus
   *         }
   *       ]
   *     }
   *   });
   *
   *   return { resources: { webApp } };
   * });
   * ```
   */
  cachingOptions: CdnCachingOptions;
}
