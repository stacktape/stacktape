# Edge Function

A Stacktape edge function is an `EdgeLambdaFunction` resource that packages Lambda code for CloudFront edge events such as viewer request and origin request. Use it to make small request or response decisions close to users: rewrite URLs, adjust headers, run A/B routing, or add lightweight authorization checks before traffic reaches an origin.

## When to use

An edge function is the right choice when the request decision belongs at the CDN layer rather than inside your origin application. Common use cases:

- **Header changes** — add, remove, or normalize request and response headers before CloudFront forwards traffic.
- **URL rewrites** — route legacy paths, locale prefixes, or experiment paths without changing the origin application.
- **A/B routing** — choose an origin path or variant at the edge before the request reaches your backend.
- **Lightweight authorization checks** — reject clearly invalid requests before they consume origin capacity.

## When NOT to use

An edge function is the wrong tool when the logic needs normal application runtime features, VPC networking, or environment-variable configuration. Use a regular [Lambda function](/resources/compute/lambda-function), [web service](/resources/compute/web-service), or CDN configuration instead when the work does not have to run on CloudFront edge events.

- **General API logic** — use a [Lambda function](/resources/compute/lambda-function) or [web service](/resources/compute/web-service) for business logic, database access, and larger handlers.
- **VPC resource access** — edge functions cannot connect to VPC resources, so do not use them for direct relational database or Redis access.
- **Environment-based configuration** — edge functions cannot use environment variables; keep configuration in code or choose another compute resource.
- **Static caching rules** — use a [CDN](/resources/networking/cdn) when routing or caching can be expressed without code.

## Basic example

This example defines an edge function packaged from a TypeScript entry file. The function is a standalone Stacktape resource, referenced from CDN `edgeFunctions` configuration on a [CDN](/resources/networking/cdn) resource.


Example (TypeScript):

```typescript
import { defineConfig, EdgeLambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const edgeAuth = new EdgeLambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/edge-auth.ts',
      handlerFunction: 'handler'
    }),
    runtime: 'nodejs22.x'
  });

  return {
    resources: { edgeAuth }
  };
});
```


`runtime` is optional because Stacktape can auto-detect the Lambda runtime from the file extension. Set it explicitly when you want to pin a supported runtime; edge functions support Node.js (`nodejs24.x`, `nodejs22.x`, `nodejs20.x`, `nodejs18.x`) and Python (`python3.13` through `python3.8`).

## CDN attachment

An `EdgeLambdaFunction` resource is designed to be attached from CDN `edgeFunctions` configuration. Define the edge function in `resources`, then attach it from the CDN where you choose the CloudFront event that should invoke the function. The edge event matters because viewer events and origin events have different memory and timeout ceilings.

The source for this resource defines the edge function and its limits, but the CDN attachment shape belongs to the [CDN](/resources/networking/cdn) resource. Keep the edge function focused on request and response manipulation, and put cache behavior, origins, and domain concerns on the CDN.

## Runtime limits

Edge function memory and timeout limits depend on the CloudFront event type that invokes the function. Stacktape defaults to `128` MB of memory and `3` seconds of timeout. Viewer events are limited to `128` MB and `5` seconds; origin events can use up to `10,240` MB and `30` seconds.

Use the viewer-event shape for lightweight request decisions that only need headers or the URL. Use an origin-event attachment only when the edge logic genuinely needs more memory or runtime before CloudFront talks to the origin. If the function starts looking like application logic, use a regional compute resource instead.


Example (TypeScript):

```typescript
import { defineConfig, EdgeLambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const edgeRewrite = new EdgeLambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/edge-rewrite.ts',
      handlerFunction: 'handler'
    }),
    memory: 128,
    timeout: 3
  });

  return { resources: { edgeRewrite } };
});
```


`memory: 128` and `timeout: 3` match the documented Stacktape defaults. Leaving the properties unset is fine for viewer-event functions; set them explicitly when you want the config to document the chosen edge budget or when an origin-event function needs a larger allowance.

## Packaging

Edge functions use Lambda packaging, not container packaging. Stacktape supports the same two Lambda packaging modes shown in the function packaging docs: `stacktape-lambda-buildpack` for source-based packaging and `custom-artifact` for a pre-built deployment package. Most teams should start with the buildpack and switch only when they already own a separate build pipeline.

| Mode | When to use |
|------|-------------|
| [Stacktape Lambda buildpack](/packaging/function/stacktape-buildpack) | Package JS/TS, Python, Java, Go, Ruby, PHP, or .NET from an entry file |
| [Custom artifact](/packaging/function/custom-artifact) | Provide a pre-built Lambda zip, directory, or file from your own build process |

The buildpack is the default choice for most teams. Point `entryfilePath` at your source file and optionally set `handlerFunction` to name the exported handler. Stacktape bundles and uploads the package automatically.


Example (TypeScript):

```typescript
import { defineConfig, EdgeLambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const edgeRewrite = new EdgeLambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/edge-rewrite.ts',
      handlerFunction: 'handler'
    })
  });

  return { resources: { edgeRewrite } };
});
```


The custom-artifact mode (`CustomArtifactLambdaPackaging`) is useful when a monorepo build already emits the exact Lambda package you want to deploy. `packagePath` points to the artifact, and `handler` uses the `{{filepath}}:{{functionName}}` syntax documented by the packaging type.


Example (TypeScript):

```typescript
import { defineConfig, EdgeLambdaFunction, CustomArtifactLambdaPackaging } from 'stacktape';

export default defineConfig(() => {
  const edgeRewrite = new EdgeLambdaFunction({
    packaging: new CustomArtifactLambdaPackaging({
      packagePath: './dist/edge-rewrite.zip',
      handler: 'index.js:handler'
    })
  });

  return { resources: { edgeRewrite } };
});
```


## Permissions

`connectTo` on an edge function grants IAM permissions only. Unlike regional Lambda functions and container workloads, an edge function cannot use environment variables and cannot connect to VPC resources. Use `connectTo` for IAM-only access where the edge function type supports it; the source examples name S3 bucket access, DynamoDB, and SES. Use `iamRoleStatements` for AWS permissions that are not covered by `connectTo`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  Bucket,
  EdgeLambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const assets = new Bucket({});

  const edgeRewrite = new EdgeLambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/edge-rewrite.ts',
      handlerFunction: 'handler'
    }),
    connectTo: ['assets'],
    iamRoleStatements: [
      {
        Action: ['ses:SendEmail'],
        Resource: ['*']
      }
    ]
  });

  return { resources: { assets, edgeRewrite } };
});
```


The `assets` connection gives the edge function IAM access to the bucket. Edge Lambda functions cannot use environment variables, so `connectTo` on an edge function is IAM-only. Code that needs connection strings or VPC security-group access should run in a regional [Lambda function](/resources/compute/lambda-function) or container resource.

## Logging

Edge function logs are sent to CloudWatch Logs in the AWS region where the function executed, not necessarily the AWS region where your Stacktape stack was deployed. That matters during incident response: a user request served from a different edge location can produce logs outside the stack region you normally inspect.

Use [`stacktape logs`](/cli/logs) for CLI log inspection, and remember that CloudWatch log location follows execution region for edge functions. The `logging` property lets you configure logging for the edge function, while the API reference carries the full option shape.

## FAQ

### How do I attach an edge function to CloudFront?

Define the `EdgeLambdaFunction` resource in `resources`, then reference it from CDN `edgeFunctions` configuration, where you choose the CloudFront event (viewer or origin) that invokes it. The choice of event matters: it determines the function's memory and timeout ceilings. Keep origins, caching, and domains on the [CDN](/resources/networking/cdn) resource itself.

### Why can't my edge function use environment variables or reach my database?

Edge functions run on CloudFront edge events and have two hard limitations: they cannot use environment variables, and they cannot connect to VPC resources (so no direct relational database or Redis access). `connectTo` on an edge function only grants IAM permissions. If your code needs injected config values or VPC-backed services, move that logic to a regional [Lambda function](/resources/compute/lambda-function), [web service](/resources/compute/web-service), or [private service](/resources/compute/private-service).

### Which runtimes can Stacktape edge functions use?

Edge functions support Node.js (`nodejs24.x`, `nodejs22.x`, `nodejs20.x`, `nodejs18.x`) and Python (`python3.13` through `python3.8`). For broader Lambda runtime coverage, use a regional [Lambda function](/resources/compute/lambda-function).

### What are the memory and timeout limits for an edge function?

Limits depend on the CloudFront event the function is attached to, and the defaults are `128` MB memory and `3` second timeout. Viewer events are capped at `128` MB and `5` seconds; origin events can use up to `10,240` MB and `30` seconds. Use viewer events for lightweight header/URL decisions, and an origin event only when the logic genuinely needs the larger budget. If a handler outgrows these limits, move the work behind the CDN into a [web service](/resources/compute/web-service) or [Lambda function](/resources/compute/lambda-function).

### Why can't I find my edge function's logs in my stack's region?

Edge function logs go to CloudWatch Logs in the AWS region where the request was served, not necessarily the region where your stack was deployed. A request handled at a different edge location produces logs outside the region you normally inspect. Use [`stacktape logs`](/cli/logs) and remember the log location follows the execution region.

### Edge function vs Lambda function vs CDN config: which should I use?

Start with [CDN](/resources/networking/cdn) configuration when caching, origin routing, or domain behavior can be expressed declaratively without code. Use an edge function when request or response manipulation requires code at the CloudFront layer (conditional rewrites, custom header logic, A/B routing). Use a regional [Lambda function](/resources/compute/lambda-function) for everything else: application logic, environment variables, broader integrations, or VPC access.

## API Reference


## API Reference: `EdgeLambdaFunctionProps`
```typescript
import type { CustomArtifactLambdaPackaging, LambdaFunctionLogging, StpBuildpackLambdaPackaging, StpIamRoleStatement } from 'stacktape';

type EdgeLambdaFunctionProps = {
  /** How the function code is packaged and deployed. */
  packaging: EdgeLambdaFunctionPackaging;
  /** Grant access to other resources in your stack (IAM permissions only — no env vars or VPC access). */
  connectTo?: Array<string>;
  /** Custom IAM policy statements for fine-grained AWS permissions beyond what connectTo provides. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Logging config. Logs are sent to CloudWatch in the region where the function executed (not your stack region). */
  logging?: LambdaFunctionLogging;
  /** Memory in MB. Max depends on event type: viewer events = 128 MB, origin events = 10,240 MB. */
  memory?: number;
  /** Lambda runtime. Auto-detected from file extension. Edge functions support Node.js and Python only. */
  runtime?: "nodejs18.x" | "nodejs20.x" | "nodejs22.x" | "nodejs24.x" | "python3.10" | "python3.11" | "python3.12" | "python3.13" | "python3.8" | "python3.9";
  /** Max execution time in seconds. Viewer events: max 5s. Origin events: max 30s. */
  timeout?: number;
};

/** Union choices used by the properties above. */
type EdgeLambdaFunctionPackaging =
  | StpBuildpackLambdaPackaging
  | CustomArtifactLambdaPackaging;
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `packaging` | yes | `stacktape-lambda-buildpack \| custom-artifact` | How the function code is packaged and deployed. | - |
| `connectTo` | no | `Array<string>` | Grant access to other resources in your stack (IAM permissions only — no env vars or VPC access). Edge Lambda functions **cannot** use environment variables or connect to VPC resources.
`connectTo` only sets up IAM permissions (e.g., S3 bucket access, DynamoDB, SES). | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Custom IAM policy statements for fine-grained AWS permissions beyond what `connectTo` provides. | - |
| `logging` | no | `LambdaFunctionLogging` | Logging config. Logs are sent to CloudWatch **in the region where the function executed** (not your stack region). | - |
| `memory` | no | `number` | Memory in MB. Max depends on event type: viewer events = 128 MB, origin events = 10,240 MB. | `128` |
| `runtime` | no | `string: "nodejs18.x" \| "nodejs20.x" \| "nodejs22.x" \| "nodejs24.x" \| "python3.10" \| "python3.11" \| "python3.12" \| "python3.13" \| "python3.8" \| "python3.9"` | Lambda runtime. Auto-detected from file extension. Edge functions support Node.js and Python only. | - |
| `timeout` | no | `number` | Max execution time in seconds. Viewer events: max 5s. Origin events: max 30s. | `3` |


## Referenceable parameters

Edge functions expose `arn`, the Lambda function ARN. Access it with `$ResourceParam('edgeAuth', 'arn')` where `edgeAuth` is the resource name in your config.


## Referenceable Parameters: `edge-lambda-function`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
