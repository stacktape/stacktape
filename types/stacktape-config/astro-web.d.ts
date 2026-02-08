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
   * @default "."
   */
  appDirectory?: string;
  /**
   * #### Override the default `astro build` command.
   */
  buildCommand?: string;
  /**
   * #### Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Attach custom domains with auto-managed DNS records and TLS certificates.
   *
   * ---
   *
   * **Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### Customize the SSR Lambda function (memory, timeout, VPC, logging).
   */
  serverLambda?: AstroWebServerLambdaConfig;
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   */
  useFirewall?: string;
  /**
   * #### Dev server config for `stacktape dev`. Defaults to `astro dev`.
   */
  dev?: AstroWebDevConfig;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
}

interface AstroWebServerLambdaConfig {
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

interface AstroWebDevConfig {
  /**
   * #### Override the default `astro dev` command (e.g., `npm run dev`).
   */
  command?: string;
  /**
   * #### Working directory for the dev command, relative to project root.
   */
  workingDirectory?: string;
}

type StpAstroWeb = AstroWebProps & {
  name: string;
  type: AstroWeb['type'];
  configParentResourceType: AstroWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
