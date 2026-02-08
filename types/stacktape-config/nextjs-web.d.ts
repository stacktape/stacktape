/**
 * #### Deploy a Next.js app with SSR on AWS Lambda, static assets on S3, and a CloudFront CDN.
 *
 * ---
 *
 * Handles ISR (Incremental Static Regeneration), image optimization, and middleware out of the box.
 * Optionally deploy to Lambda@Edge for lower latency or enable response streaming.
 */
interface NextjsWeb {
  type: 'nextjs-web';
  properties: NextjsWebProps;
  overrides?: ResourceOverrides;
}

interface NextjsWebProps extends ResourceAccessProps {
  /**
   * #### Directory containing your `next.config.js`. For monorepos, point to the Next.js workspace.
   */
  appDirectory: string;
  /**
   * #### Customize the SSR Lambda function (memory, timeout, VPC, logging).
   */
  serverLambda?: NextjsServerLambdaProperties;
  /**
   * #### Number of Lambda instances to keep warm (pre-initialized) to reduce cold starts.
   *
   * ---
   *
   * A separate "warmer" function periodically pings the SSR Lambda. Not available with `useEdgeLambda: true`.
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
   * @default false
   */
  useEdgeLambda?: boolean;
  /**
   * #### Override the default `next build` command.
   */
  buildCommand?: string;
  /**
   * #### Dev server config for `stacktape dev`. Defaults to `next dev`.
   */
  dev?: {
    /**
     * #### Dev server command (e.g., `npm run dev`).
     *
     * @default "next dev"
     */
    command?: string;
  };
  /**
   * #### Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
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
   * #### Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.
   */
  useFirewall?: string;
  /**
   * #### Stream SSR responses for faster Time to First Byte and up to 20 MB response size (vs 6 MB default).
   *
   * ---
   *
   * Not compatible with `useEdgeLambda: true`.
   *
   * @default false
   */
  streamingEnabled?: boolean;
}

type StpNextjsWeb = NextjsWeb['properties'] & {
  name: string;
  type: NextjsWeb['type'];
  configParentResourceType: NextjsWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction?: StpLambdaFunction;
    serverEdgeFunction?: StpEdgeLambdaFunction;
    imageFunction: StpLambdaFunction;
    revalidationQueue: StpSqsQueue;
    revalidationFunction: StpLambdaFunction;
    revalidationTable: StpDynamoTable;
    warmerFunction?: StpLambdaFunction;
    revalidationInsertFunction: StpLambdaFunction;
  };
};

interface NextjsServerLambdaProperties {
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
   * #### Logging config. Logs are sent to CloudWatch. View with `stacktape logs` or in the AWS console.
   */
  logging?: LambdaFunctionLogging;
  /**
   * #### Connect to VPC resources (databases, Redis). **Warning:** function loses direct internet access.
   *
   * ---
   *
   * S3 and DynamoDB remain accessible via auto-created VPC endpoints.
   */
  joinDefaultVpc?: boolean;
}
