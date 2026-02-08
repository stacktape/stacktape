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
