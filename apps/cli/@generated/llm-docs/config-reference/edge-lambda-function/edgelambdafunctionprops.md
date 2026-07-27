# EdgeLambdaFunctionProps API Reference

Resource type: `edge-lambda-function`

## TypeScript definition

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

## Property: `packaging`

- Required: yes
- Type: `stacktape-lambda-buildpack | custom-artifact`

How the function code is packaged and deployed.

Choices:
- `stacktape-lambda-buildpack` (`StpBuildpackLambdaPackaging`) — A zero-config buildpack that packages your code for AWS Lambda.. Properties: `handlerFunction?: string`, `entryfilePath: string`, `includeFiles?: Array<string>`, `excludeFiles?: Array<string>`, `excludeDependencies?: Array<string>`, `languageSpecificConfig?: Es | Py | Java | Php | Dotnet | Go | Ruby`.
- `custom-artifact` (`CustomArtifactLambdaPackaging`) — Uses a pre-built artifact for Lambda deployment.. Properties: `packagePath: string`, `handler?: string`.

### Example 1 (yaml)

```yaml
resources:
  webEdgeFn:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/edge/viewer-request.ts
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: dist
      hostingContentType: single-page-app
      edgeFunctions:
        onRequest: webEdgeFn
```

### Example 2 (typescript)

```typescript
import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webEdgeFn = new EdgeLambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/edge/viewer-request.ts'
      }
    }
  });

  const website = new HostingBucket({
    uploadDirectoryPath: 'dist',
    hostingContentType: 'single-page-app',
    edgeFunctions: {
      onRequest: 'webEdgeFn'
    }
  });

  return { resources: { webEdgeFn, website } };
});
```

## Property: `connectTo`

- Required: no
- Type: `Array<string>`

Grant access to other resources in your stack (IAM permissions only — no env vars or VPC access).

Edge Lambda functions **cannot** use environment variables or connect to VPC resources.
`connectTo` only sets up IAM permissions (e.g., S3 bucket access, DynamoDB, SES).

### Example 1 (yaml)

```yaml
resources:
  configBucket:
    type: bucket
    properties: {}
  authEdgeFn:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/edge/auth-check.ts
      connectTo:
        - configBucket
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: dist
      hostingContentType: single-page-app
      edgeFunctions:
        onRequest: authEdgeFn
```

### Example 2 (typescript)

```typescript
import { Bucket, EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const configBucket = new Bucket({});

  const authEdgeFn = new EdgeLambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/edge/auth-check.ts'
      }
    },
    connectTo: ['configBucket']
  });

  const website = new HostingBucket({
    uploadDirectoryPath: 'dist',
    hostingContentType: 'single-page-app',
    edgeFunctions: {
      onRequest: 'authEdgeFn'
    }
  });

  return { resources: { configBucket, authEdgeFn, website } };
});
```

## Property: `iamRoleStatements`

- Required: no
- Type: `Array<StpIamRoleStatement>`

Custom IAM policy statements for fine-grained AWS permissions beyond what `connectTo` provides.

### Example 1 (yaml)

```yaml
resources:
  authEdgeFn:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/edge/auth-check.ts
      iamRoleStatements:
        - Sid: ReadEdgeSecrets
          Effect: Allow
          Action:
            - secretsmanager:GetSecretValue
          Resource:
            - arn:aws:secretsmanager:us-east-1:123456789012:secret:edge-jwt-key-*
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: dist
      hostingContentType: single-page-app
      edgeFunctions:
        onRequest: authEdgeFn
```

### Example 2 (typescript)

```typescript
import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const authEdgeFn = new EdgeLambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/edge/auth-check.ts'
      }
    },
    iamRoleStatements: [
      {
        Sid: 'ReadEdgeSecrets',
        Effect: 'Allow',
        Action: ['secretsmanager:GetSecretValue'],
        Resource: ['arn:aws:secretsmanager:us-east-1:123456789012:secret:edge-jwt-key-*']
      }
    ]
  });

  const website = new HostingBucket({
    uploadDirectoryPath: 'dist',
    hostingContentType: 'single-page-app',
    edgeFunctions: {
      onRequest: 'authEdgeFn'
    }
  });

  return { resources: { authEdgeFn, website } };
});
```

## Property: `logging`

- Required: no
- Type: `LambdaFunctionLogging`

Logging config. Logs are sent to CloudWatch **in the region where the function executed** (not your stack region).

### Example 1 (yaml)

```yaml
resources:
  webEdgeFn:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/edge/viewer-request.ts
      logging:
        retentionDays: 30
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: dist
      hostingContentType: single-page-app
      edgeFunctions:
        onRequest: webEdgeFn
```

### Example 2 (typescript)

```typescript
import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webEdgeFn = new EdgeLambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/edge/viewer-request.ts'
      }
    },
    logging: {
      retentionDays: 30
    }
  });

  const website = new HostingBucket({
    uploadDirectoryPath: 'dist',
    hostingContentType: 'single-page-app',
    edgeFunctions: {
      onRequest: 'webEdgeFn'
    }
  });

  return { resources: { webEdgeFn, website } };
});
```

## Property: `memory`

- Required: no
- Type: `number`
- Default: `128`

Memory in MB. Max depends on event type: viewer events = 128 MB, origin events = 10,240 MB.

### Example 1 (yaml)

```yaml
resources:
  originEdgeFn:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/edge/origin-request.ts
      memory: 512
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: dist
      hostingContentType: static-website
      edgeFunctions:
        onOriginResponse: originEdgeFn
```

### Example 2 (typescript)

```typescript
import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const originEdgeFn = new EdgeLambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/edge/origin-request.ts'
      }
    },
    memory: 512
  });

  const website = new HostingBucket({
    uploadDirectoryPath: 'dist',
    hostingContentType: 'static-website',
    edgeFunctions: {
      onOriginResponse: 'originEdgeFn'
    }
  });

  return { resources: { originEdgeFn, website } };
});
```

## Property: `runtime`

- Required: no
- Type: `string: "nodejs18.x" | "nodejs20.x" | "nodejs22.x" | "nodejs24.x" | "python3.10" | "python3.11" | "python3.12" | "python3.13" | "python3.8" | "python3.9"`

Lambda runtime. Auto-detected from file extension. Edge functions support Node.js and Python only.

### Example 1 (yaml)

```yaml
resources:
  webEdgeFn:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/edge/viewer-request.py
      runtime: python3.12
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: dist
      hostingContentType: single-page-app
      edgeFunctions:
        onRequest: webEdgeFn
```

### Example 2 (typescript)

```typescript
import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webEdgeFn = new EdgeLambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/edge/viewer-request.py'
      }
    },
    runtime: 'python3.12'
  });

  const website = new HostingBucket({
    uploadDirectoryPath: 'dist',
    hostingContentType: 'single-page-app',
    edgeFunctions: {
      onRequest: 'webEdgeFn'
    }
  });

  return { resources: { webEdgeFn, website } };
});
```

## Property: `timeout`

- Required: no
- Type: `number`
- Default: `3`

Max execution time in seconds. Viewer events: max 5s. Origin events: max 30s.

### Example 1 (yaml)

```yaml
resources:
  originEdgeFn:
    type: edge-lambda-function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: src/edge/origin-request.ts
      memory: 256
      timeout: 10
  website:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: dist
      hostingContentType: static-website
      edgeFunctions:
        onOriginResponse: originEdgeFn
```

### Example 2 (typescript)

```typescript
import { EdgeLambdaFunction, HostingBucket, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const originEdgeFn = new EdgeLambdaFunction({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: {
        entryfilePath: 'src/edge/origin-request.ts'
      }
    },
    memory: 256,
    timeout: 10
  });

  const website = new HostingBucket({
    uploadDirectoryPath: 'dist',
    hostingContentType: 'static-website',
    edgeFunctions: {
      onOriginResponse: 'originEdgeFn'
    }
  });

  return { resources: { originEdgeFn, website } };
});
```
