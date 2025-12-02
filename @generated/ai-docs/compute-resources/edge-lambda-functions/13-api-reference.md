# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/edge-lambda-functions.d.ts
/**
 * #### A specialized Lambda function that runs at AWS edge locations, close to your users.
 *
 * ---
 *
 * Edge Lambda functions are designed to be executed by a Content Delivery Network (CDN) in response to CDN events.
 * They allow you to customize the content delivered through the CDN, enabling things like header manipulation, URL rewrites, and A/B testing.
 */
interface EdgeLambdaFunction {
  type: 'edge-lambda-function';
  properties: EdgeLambdaFunctionProps;
  overrides?: ResourceOverrides;
}

interface EdgeLambdaFunctionProps {
  /**
   * #### Configures how your code is packaged and deployed.
   *
   * ---
   *
   * Stacktape supports two packaging methods:
   * - `stacktape-lambda-buildpack`: Stacktape automatically builds and packages your code from a specified source file. This is the recommended and simplest approach.
   * - `custom-artifact`: You provide a path to a pre-built deployment package (e.g., a zip file). Stacktape will handle the upload.
   *
   * Your deployment packages are stored in an S3 bucket managed by Stacktape.
   */
  packaging: LambdaPackaging;
  /**
   * #### The runtime environment for the function.
   *
   * ---
   *
   * Stacktape automatically detects the programming language and selects an appropriate runtime.
   * Edge Lambda functions support a specific set of runtimes.
   */
  runtime?:
    | 'nodejs22.x'
    | 'nodejs20.x'
    | 'nodejs18.x'
    | 'python3.13'
    | 'python3.12'
    | 'python3.11'
    | 'python3.10'
    | 'python3.9'
    | 'python3.8';
  /**
   * #### The amount of memory (in MB) allocated to the function.
   *
   * ---
   *
   * The maximum memory depends on when the function is triggered in the CDN lifecycle:
   * - `onRequest` or `onResponse` (viewer-facing events): 128 MB
   * - `onOriginRequest` or `onOriginResponse` (origin-facing events): 10,240 MB
   *
   * For more details, see the [CDN documentation](https://docs.stacktape.com/other-resources/cdns/#edge-lambda-functions).
   *
   * @default 128
   */
  memory?: number;
  /**
   * #### The maximum execution time for the function, in seconds.
   *
   * ---
   *
   * The maximum timeout depends on when the function is triggered in the CDN lifecycle:
   * - `onRequest` or `onResponse` (viewer-facing events): 5 seconds
   * - `onOriginRequest` or `onOriginResponse` (origin-facing events): 30 seconds
   *
   * For more details, see the [CDN documentation](https://docs.stacktape.com/other-resources/cdns/#edge-lambda-functions).
   *
   * @default 3
   */
  timeout?: number;

  /**
   * #### Grants the function access to other resources in your stack.
   *
   * ---
   *
   * By listing resources here, Stacktape automatically configures the necessary IAM permissions and security group rules.
   * It also injects environment variables with connection details into the function's runtime.
   *
   * > **Note:** Environment variable injection is not supported for Edge Lambda functions.
   * > Also, Edge Lambda functions cannot connect to resources within a VPC.
   *
   * **Supported Resources:**
   *
   * - **Bucket**: Grants permissions to list, create, get, and delete objects.
   * - **DynamoDB table**: Grants permissions for item manipulation and table scanning/querying.
   * - **MongoDB Atlas cluster**: Allows secure, credential-less access to the cluster.
   * - **Relational database**: Allows connections to the database.
   * - **Redis cluster**: Allows connections to the Redis cluster.
   * - **Event bus**: Grants permission to publish events.
   * - **Function**: Grants permission to invoke another function.
   * - **Batch job**: Grants permissions to manage batch jobs.
   * - **User auth pool**: Grants full control over a Cognito User Pool.
   * - **Upstash Kafka topic**: Provides connection details.
   * - **Upstash Redis**: Provides connection details.
   * - **aws:ses**: Grants full permissions to Amazon Simple Email Service (SES).
   */
  connectTo?: string[];
  /**
   * #### A list of raw AWS IAM role statements to add to the function's execution role.
   *
   * ---
   *
   * Use this for fine-grained control over the function's permissions.
   */
  iamRoleStatements?: StpIamRoleStatement[];
  /**
   * #### Configures the logging behavior for the function.
   *
   * ---
   *
   * Function logs (`stdout` and `stderr`) are sent to CloudWatch log groups.
   *
   * > **Important:** Since Edge Lambda functions run in multiple AWS regions, logs are delivered to a log group in the region where the function was executed.
   * > You can use the `stacktape stack-info` command to get links to the log groups in each region.
   */
  logging?: LambdaFunctionLogging;
}

type StpEdgeLambdaFunction = EdgeLambdaFunctionProps & {
  name: string;
  type: EdgeLambdaFunction['type'];
  configParentResourceType: EdgeLambdaFunction['type'] | NextjsWeb['type'];
  nameChain: string[];
  handler: string;
  artifactName: string;
  resourceName: string;
  architecture?: 'x86_64';
};

type StpHelperEdgeLambdaFunction = Omit<StpEdgeLambdaFunction, 'packaging'> & {
  packaging: HelperLambdaPackaging;
  artifactPath: string;
  runtime:
    | 'nodejs22.x'
    | 'nodejs20.x'
    | 'nodejs18.x'
    | 'python3.13'
    | 'python3.12'
    | 'python3.11'
    | 'python3.10'
    | 'python3.9'
    | 'python3.8';
};

type EdgeLambdaFunctionReferencableParam = 'arn';
```