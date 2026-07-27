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
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webEdgeFn:
   *     type: edge-lambda-function
   *     properties:
   *       # stp-focus
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/edge/viewer-request.ts
   *       # stp-end-focus
   *   website:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: dist
   *       hostingContentType: single-page-app
   *       edgeFunctions:
   *         onRequest: webEdgeFn
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webEdgeFn = new EdgeLambdaFunction({
   *     // stp-focus
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: {
   *         entryfilePath: 'src/edge/viewer-request.ts'
   *       }
   *     }
   *     // stp-end-focus
   *   });
   *
   *   const website = new HostingBucket({
   *     uploadDirectoryPath: 'dist',
   *     hostingContentType: 'single-page-app',
   *     edgeFunctions: {
   *       onRequest: 'webEdgeFn'
   *     }
   *   });
   *
   *   return { resources: { webEdgeFn, website } };
   * });
   * ```
   */
  packaging: LambdaPackaging;
  /**
   * #### Lambda runtime. Auto-detected from file extension. Edge functions support Node.js and Python only.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webEdgeFn:
   *     type: edge-lambda-function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/edge/viewer-request.py
   *       # stp-focus
   *       runtime: python3.12
   *       # stp-end-focus
   *   website:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: dist
   *       hostingContentType: single-page-app
   *       edgeFunctions:
   *         onRequest: webEdgeFn
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webEdgeFn = new EdgeLambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: {
   *         entryfilePath: 'src/edge/viewer-request.py'
   *       }
   *     },
   *     // stp-focus
   *     runtime: 'python3.12'
   *     // stp-end-focus
   *   });
   *
   *   const website = new HostingBucket({
   *     uploadDirectoryPath: 'dist',
   *     hostingContentType: 'single-page-app',
   *     edgeFunctions: {
   *       onRequest: 'webEdgeFn'
   *     }
   *   });
   *
   *   return { resources: { webEdgeFn, website } };
   * });
   * ```
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
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   originEdgeFn:
   *     type: edge-lambda-function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/edge/origin-request.ts
   *       # stp-focus
   *       memory: 512
   *       # stp-end-focus
   *   website:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: dist
   *       hostingContentType: static-website
   *       edgeFunctions:
   *         onOriginResponse: originEdgeFn
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const originEdgeFn = new EdgeLambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: {
   *         entryfilePath: 'src/edge/origin-request.ts'
   *       }
   *     },
   *     // stp-focus
   *     memory: 512
   *     // stp-end-focus
   *   });
   *
   *   const website = new HostingBucket({
   *     uploadDirectoryPath: 'dist',
   *     hostingContentType: 'static-website',
   *     edgeFunctions: {
   *       onOriginResponse: 'originEdgeFn'
   *     }
   *   });
   *
   *   return { resources: { originEdgeFn, website } };
   * });
   * ```
   *
   * @default 128
   */
  memory?: number;
  /**
   * #### Max execution time in seconds. Viewer events: max 5s. Origin events: max 30s.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   originEdgeFn:
   *     type: edge-lambda-function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/edge/origin-request.ts
   *       memory: 256
   *       # stp-focus
   *       timeout: 10
   *       # stp-end-focus
   *   website:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: dist
   *       hostingContentType: static-website
   *       edgeFunctions:
   *         onOriginResponse: originEdgeFn
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const originEdgeFn = new EdgeLambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: {
   *         entryfilePath: 'src/edge/origin-request.ts'
   *       }
   *     },
   *     memory: 256,
   *     // stp-focus
   *     timeout: 10
   *     // stp-end-focus
   *   });
   *
   *   const website = new HostingBucket({
   *     uploadDirectoryPath: 'dist',
   *     hostingContentType: 'static-website',
   *     edgeFunctions: {
   *       onOriginResponse: 'originEdgeFn'
   *     }
   *   });
   *
   *   return { resources: { originEdgeFn, website } };
   * });
   * ```
   *
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   configBucket:
   *     type: bucket
   *     properties: {}
   *   authEdgeFn:
   *     type: edge-lambda-function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/edge/auth-check.ts
   *       # stp-focus
   *       connectTo:
   *         - configBucket
   *       # stp-end-focus
   *   website:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: dist
   *       hostingContentType: single-page-app
   *       edgeFunctions:
   *         onRequest: authEdgeFn
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bucket, EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const configBucket = new Bucket({});
   *
   *   const authEdgeFn = new EdgeLambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: {
   *         entryfilePath: 'src/edge/auth-check.ts'
   *       }
   *     },
   *     // stp-focus
   *     connectTo: ['configBucket']
   *     // stp-end-focus
   *   });
   *
   *   const website = new HostingBucket({
   *     uploadDirectoryPath: 'dist',
   *     hostingContentType: 'single-page-app',
   *     edgeFunctions: {
   *       onRequest: 'authEdgeFn'
   *     }
   *   });
   *
   *   return { resources: { configBucket, authEdgeFn, website } };
   * });
   * ```
   */
  connectTo?: string[];
  /**
   * #### Custom IAM policy statements for fine-grained AWS permissions beyond what `connectTo` provides.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   authEdgeFn:
   *     type: edge-lambda-function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/edge/auth-check.ts
   *       # stp-focus
   *       iamRoleStatements:
   *         - Sid: ReadEdgeSecrets
   *           Effect: Allow
   *           Action:
   *             - secretsmanager:GetSecretValue
   *           Resource:
   *             - arn:aws:secretsmanager:us-east-1:123456789012:secret:edge-jwt-key-*
   *       # stp-end-focus
   *   website:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: dist
   *       hostingContentType: single-page-app
   *       edgeFunctions:
   *         onRequest: authEdgeFn
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const authEdgeFn = new EdgeLambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: {
   *         entryfilePath: 'src/edge/auth-check.ts'
   *       }
   *     },
   *     // stp-focus
   *     iamRoleStatements: [
   *       {
   *         Sid: 'ReadEdgeSecrets',
   *         Effect: 'Allow',
   *         Action: ['secretsmanager:GetSecretValue'],
   *         Resource: ['arn:aws:secretsmanager:us-east-1:123456789012:secret:edge-jwt-key-*']
   *       }
   *     ]
   *     // stp-end-focus
   *   });
   *
   *   const website = new HostingBucket({
   *     uploadDirectoryPath: 'dist',
   *     hostingContentType: 'single-page-app',
   *     edgeFunctions: {
   *       onRequest: 'authEdgeFn'
   *     }
   *   });
   *
   *   return { resources: { authEdgeFn, website } };
   * });
   * ```
   */
  iamRoleStatements?: StpIamRoleStatement[];
  /**
   * #### Logging config. Logs are sent to CloudWatch **in the region where the function executed** (not your stack region).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   webEdgeFn:
   *     type: edge-lambda-function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: src/edge/viewer-request.ts
   *       # stp-focus
   *       logging:
   *         retentionDays: 30
   *       # stp-end-focus
   *   website:
   *     type: hosting-bucket
   *     properties:
   *       uploadDirectoryPath: dist
   *       hostingContentType: single-page-app
   *       edgeFunctions:
   *         onRequest: webEdgeFn
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const webEdgeFn = new EdgeLambdaFunction({
   *     packaging: {
   *       type: 'stacktape-lambda-buildpack',
   *       properties: {
   *         entryfilePath: 'src/edge/viewer-request.ts'
   *       }
   *     },
   *     // stp-focus
   *     logging: {
   *       retentionDays: 30
   *     }
   *     // stp-end-focus
   *   });
   *
   *   const website = new HostingBucket({
   *     uploadDirectoryPath: 'dist',
   *     hostingContentType: 'single-page-app',
   *     edgeFunctions: {
   *       onRequest: 'webEdgeFn'
   *     }
   *   });
   *
   *   return { resources: { webEdgeFn, website } };
   * });
   * ```
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
