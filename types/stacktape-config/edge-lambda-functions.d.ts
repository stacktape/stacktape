/**
 * #### Lambda function that runs at CDN edge locations for request/response manipulation.
 *
 * ---
 *
 * Runs on CloudFront events (viewer request, origin request, etc.) to modify headers, rewrite URLs,
 * implement A/B testing, or add auth checks at the edge. Referenced from CDN `edgeFunctions` config.
 */
interface EdgeLambdaFunction {
  type: 'edge-lambda-function';
  properties: EdgeLambdaFunctionProps;
  overrides?: ResourceOverrides;
}

interface EdgeLambdaFunctionProps {
  /**
   * #### How the function code is packaged and deployed.
   */
  packaging: LambdaPackaging;
  /**
   * #### Lambda runtime. Auto-detected from file extension. Edge functions support Node.js and Python only.
   */
  runtime?:
  | 'nodejs24.x'
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
   * #### Memory in MB. Max depends on event type: viewer events = 128 MB, origin events = 10,240 MB.
   * @default 128
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Viewer events: max 5s. Origin events: max 30s.
   * @default 3
   */
  timeout?: number;

  /**
   * #### Grant access to other resources in your stack (IAM permissions only — no env vars or VPC access).
   *
   * ---
   *
   * Edge Lambda functions **cannot** use environment variables or connect to VPC resources.
   * `connectTo` only sets up IAM permissions (e.g., S3 bucket access, DynamoDB, SES).
   */
  connectTo?: string[];
  /**
   * #### Custom IAM policy statements for fine-grained AWS permissions beyond what `connectTo` provides.
   */
  iamRoleStatements?: StpIamRoleStatement[];
  /**
   * #### Logging config. Logs are sent to CloudWatch **in the region where the function executed** (not your stack region).
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
