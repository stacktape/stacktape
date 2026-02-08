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
   * @default "."
   */
  appDirectory?: string;
  /**
   * #### Override the default `nuxt build` command.
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
   * #### Dev server config for `stacktape dev`. Defaults to `nuxt dev`.
   */
  dev?: SsrWebDevConfig;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
}

type StpNuxtWeb = NuxtWebProps & {
  name: string;
  type: NuxtWeb['type'];
  configParentResourceType: NuxtWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
