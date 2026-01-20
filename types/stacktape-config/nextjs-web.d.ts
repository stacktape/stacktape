/**
 * #### A resource for deploying and hosting Next.js applications.
 *
 * ---
 *
 * This resource is purpose-built for Next.js and runs your application's server-side logic in AWS Lambda or Lambda@Edge.
 * It seamlessly integrates your Next.js application with other resources in your infrastructure.
 */
interface NextjsWeb {
  type: 'nextjs-web';
  properties: NextjsWebProps;
  overrides?: ResourceOverrides;
}

interface NextjsWebProps extends ResourceAccessProps {
  /**
   * #### The root directory of your Next.js application.
   *
   * ---
   *
   * This should be the path to the directory containing your `next.config.js` file.
   * If you are using a monorepo, this will be the path to your Next.js workspace. Otherwise, it's typically `./`.
   */
  appDirectory: string;
  /**
   * #### Overrides for the server-side Lambda function.
   *
   * ---
   *
   * Use this to customize the memory, timeout, or other properties of the Lambda function that handles server-side rendering.
   */
  serverLambda?: NextjsServerLambdaProperties;
  /**
   * #### The number of server-side Lambda instances to keep warm.
   *
   * ---
   *
   * To mitigate cold starts and improve response times, you can keep a specified number of Lambda instances "warm" (pre-initialized).
   * This is done by a separate "warmer" function that periodically invokes the server-side function.
   *
   * > **Note:** This feature is not available when using Lambda@Edge (`useEdgeLambda: true`).
   *
   * @default 0
   */
  warmServerInstances?: number;
  /**
   * #### Deploys the server-side function to Lambda@Edge.
   *
   * ---
   *
   * When enabled, your server-side rendering logic will run at AWS edge locations, closer to your users, which can significantly reduce latency.
   *
   * **Trade-offs:**
   * - Slower deployment times compared to a standard regional Lambda.
   * - The "warming" feature (`warmServerInstances`) is not supported.
   *
   * @default false
   */
  useEdgeLambda?: boolean;
  /**
   * #### A custom build command for your Next.js application.
   *
   * ---
   *
   * If you have a custom build process, you can specify the command here.
   */
  buildCommand?: string;
  /**
   * #### Dev server configuration for local development.
   *
   * ---
   *
   * Configures the dev server process for local development. Used by the `dev` command.
   *
   * If not specified, defaults to `next dev` in the app directory.
   */
  dev?: {
    /**
     * #### The dev server command to execute.
     *
     * ---
     *
     * Examples:
     * - `next dev`
     * - `npm run dev`
     *
     * @default "next dev"
     */
    command?: string;
  };
  /**
   * #### Sets custom headers for static files.
   *
   * ---
   *
   * This allows you to define headers, such as `Cache-Control` or `Content-Type`, for files that match a specified pattern.
   */
  fileOptions?: DirectoryUploadFilter[];
  /**
   * #### A list of environment variables to inject into the server-side function.
   *
   * ---
   *
   * This is useful for providing configuration details, such as API keys or database connection strings, to your server-side rendering logic.
   */
  environment?: EnvironmentVar[];
  /**
   * #### Attaches custom domains to your Next.js application.
   *
   * ---
   *
   * Stacktape can automatically manage DNS records and TLS certificates for your custom domains.
   *
   * When you attach a custom domain, Stacktape will:
   * - Create the necessary DNS records in Route 53 to point your domain to the application.
   * - Provision and manage a free, auto-renewing AWS Certificate Manager (ACM) TLS certificate for HTTPS.
   *
   * > **Prerequisite:** You must have a hosted zone for your domain in your AWS account.
   * > For more details, see the [Stacktape documentation on domains](https://docs.stacktape.com/other-resources/domains-and-certificates/#adding-domain).
   */
  customDomains?: DomainConfiguration[];
  /**
   * #### The name of a `web-app-firewall` to protect your application.
   *
   * ---
   *
   * A web application firewall (WAF) can help protect your application from common web-based attacks.
   * For more information, see the [Stacktape documentation on web application firewalls](https://docs.stacktape.com/security-resources/web-app-firewalls/).
   */
  useFirewall?: string;
  /**
   * #### Enables response streaming for the server-side function.
   *
   * ---
   *
   * **Benefits:**
   * - Improves Time to First Byte (TTFB) for faster page loads.
   * - Increases the maximum response size to 20MB (from the standard 6MB).
   *
   * > **Note:** This is an experimental feature and is not compatible with Lambda@Edge (`useEdgeLambda: true`).
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
   * #### The amount of memory (in MB) allocated to the server-side function.
   *
   * ---
   *
   * This setting also influences the amount of CPU power your function receives.
   * The value must be between 128 MB and 10,240 MB.
   *
   * @default 1024
   */
  memory?: number;
  /**
   * #### The maximum execution time for the server-side function, in seconds.
   *
   * ---
   *
   * The maximum allowed timeout is 30 seconds.
   *
   * @default 30
   */
  timeout?: number;
  /**
   * #### Configures the logging behavior for the server-side function.
   *
   * ---
   *
   * Function logs (`stdout` and `stderr`) are automatically sent to a CloudWatch log group.
   *
   * You can view logs in two ways:
   *   - Through the AWS CloudWatch console. Use the `stacktape stack-info` command to get a direct link.
   *   - Using the `stacktape logs` command to stream logs directly to your terminal.
   */
  logging?: LambdaFunctionLogging;
  /**
   * #### Connects the server-side function to your stack's default Virtual Private Cloud (VPC).
   *
   * ---
   *
   * Connecting to a VPC is necessary to access resources within that VPC, such as relational databases or Redis clusters.
   *
   * > **Important:** When a function joins a VPC, it loses direct internet access.
   *
   * If your function needs to access S3 or DynamoDB, Stacktape automatically creates VPC endpoints to ensure connectivity.
   * For more details, see the [Stacktape VPCs documentation](https://docs.stacktape.com/user-guides/vpcs).
   */
  joinDefaultVpc?: boolean;
}
