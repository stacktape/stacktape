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
   * @default 1024
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Max: 30.
   *
   * @default 30
   */
  timeout?: number;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   */
  joinDefaultVpc?: boolean;
  /**
   * #### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.
   */
  logging?: LambdaFunctionLogging;
}

/**
 * Dev server configuration shared by all SSR web resources
 */
interface SsrWebDevConfig {
  /**
   * #### Override the default dev server command (e.g., `npm run dev`).
   */
  command?: string;
  /**
   * #### Working directory for the dev command, relative to project root.
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
   * @default false
   */
  disableInvalidationAfterDeploy?: boolean;
  /**
   * #### Override default SSR caching behavior for all routes handled by the server.
   *
   * ---
   *
   * Useful when you want to cache SSR responses longer than the framework defaults.
   */
  defaultCachingOptions?: CdnCachingOptions;
  /**
   * #### Override caching for specific CDN path patterns.
   *
   * ---
   *
   * Matches existing framework-managed paths (e.g. `_astro/*`, `_next/data/*`) or adds
   * new server-path caching rules (e.g. `/_server-islands/*`) while preserving managed routing.
   */
  pathCachingOverrides?: SsrWebPathCachingOverride[];
}

interface SsrWebPathCachingOverride {
  /**
   * #### URL path pattern to match (e.g., `/api/*`, `/_server-islands/*`).
   */
  path: string;
  /**
   * #### Caching behavior override for this path pattern.
   */
  cachingOptions: CdnCachingOptions;
}
