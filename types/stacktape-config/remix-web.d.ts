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
   * @default "."
   */
  appDirectory?: string;
  /**
   * #### Override the default `remix vite:build` command.
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
  serverLambda?: SsrWebServerLambdaConfig;
  /**
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   */
  useFirewall?: string;
  /**
   * #### Dev server config for `stacktape dev`. Defaults to `remix vite:dev`.
   */
  dev?: SsrWebDevConfig;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
}

type StpRemixWeb = RemixWebProps & {
  name: string;
  type: RemixWeb['type'];
  configParentResourceType: RemixWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
