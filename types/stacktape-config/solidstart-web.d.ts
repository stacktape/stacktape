/**
 * #### Deploy a SolidStart SSR app with Lambda (AWS adapter), S3 for static assets, and CloudFront CDN.
 */
interface SolidStartWeb {
  type: 'solidstart-web';
  properties: SolidStartWebProps;
  overrides?: ResourceOverrides;
}

interface SolidStartWebProps extends ResourceAccessProps {
  /**
   * #### Directory containing your `app.config.ts`. For monorepos, point to the SolidStart workspace.
   *
   * @default "."
   */
  appDirectory?: string;
  /**
   * #### Override the default `vinxi build` command.
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
   * #### Dev server config for `stacktape dev`. Defaults to `vinxi dev`.
   */
  dev?: SsrWebDevConfig;
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
}

type StpSolidStartWeb = SolidStartWebProps & {
  name: string;
  type: SolidStartWeb['type'];
  configParentResourceType: SolidStartWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction: StpLambdaFunction;
  };
};
