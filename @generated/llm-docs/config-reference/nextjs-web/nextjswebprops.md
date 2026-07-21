# NextjsWebProps API Reference

Resource type: `nextjs-web`

## TypeScript definition

```typescript
import type { DirectoryUploadFilter, DomainConfiguration, EnvironmentVar, NextjsServerLambdaProperties, SsrWebCdnConfig, StpIamRoleStatement } from 'stacktape';

type NextjsWebProps = {
  /** Directory containing your next.config.js. For monorepos, point to the Next.js workspace. */
  appDirectory: string;
  /** Override the default next build command. */
  buildCommand?: string;
  /** CDN cache controls for SSR routes and specific path patterns. */
  cdn?: SsrWebCdnConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Attach custom domains with auto-managed DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Dev server config for stacktape dev. Defaults to next dev. */
  dev?: unknown;
  /** Environment variables for the SSR function. Use $ResourceParam() or $Secret() for dynamic values. */
  environment?: Array<EnvironmentVar>;
  /** Set custom headers (e.g., Cache-Control) for static files matching a pattern. */
  fileOptions?: Array<DirectoryUploadFilter>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Customize the SSR Lambda function (memory, timeout, VPC, logging). */
  serverLambda?: NextjsServerLambdaProperties;
  /** Stream SSR responses for faster Time to First Byte and up to 20 MB response size (vs 6 MB default). */
  streamingEnabled?: boolean;
  /** Run SSR at CloudFront edge locations for lower latency worldwide. */
  useEdgeLambda?: boolean;
  /** Name of a web-app-firewall resource to protect this app. Firewall scope must be cdn. */
  useFirewall?: string;
  /** Number of Lambda instances to keep warm (pre-initialized) to reduce cold starts. */
  warmServerInstances?: number;
};
```

## Property: `appDirectory`

- Required: yes
- Type: `string`

Directory containing your `next.config.js`. For monorepos, point to the Next.js workspace.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./apps/storefront
      environment:
        - name: NODE_ENV
          value: production
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './apps/storefront',
    environment: { NODE_ENV: 'production' }
  });
  return { resources: { web } };
});
```

## Property: `buildCommand`

- Required: no
- Type: `string`

Override the default `next build` command.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      buildCommand: pnpm run build
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './',
    buildCommand: 'pnpm run build'
  });
  return { resources: { web } };
});
```

## Property: `cdn`

- Required: no
- Type: `SsrWebCdnConfig`

CDN cache controls for SSR routes and specific path patterns.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      cdn:
        disableInvalidationAfterDeploy: false
        defaultCachingOptions:
          minTTL: 0
          defaultTTL: 60
          maxTTL: 3600
        pathCachingOverrides:
          - path: /_server-islands/*
            cachingOptions:
              defaultTTL: 300
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './',
    cdn: {
      disableInvalidationAfterDeploy: false,
      defaultCachingOptions: {
        minTTL: 0,
        defaultTTL: 60,
        maxTTL: 3600
      },
      pathCachingOverrides: [
        {
          path: '/_server-islands/*',
          cachingOptions: { defaultTTL: 300 }
        }
      ]
    }
  });
  return { resources: { web } };
});
```

## Property: `connectTo`

- Required: no
- Type: `Array<string>`

Give this resource access to other resources in your stack.

List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc.

### Example 1 (yaml)

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
      connectTo:
        - mainDb
        - uploads
  mainDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          primaryInstance:
            instanceSize: db.t4g.micro
  uploads:
    type: bucket
    properties: {}
```

### Example 2 (typescript)

```typescript
import { WebService, RelationalDatabase, Bucket, RdsEnginePostgres, StacktapeImageBuildpackPackaging, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const uploads = new Bucket({});
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    connectTo: [mainDb, uploads]
  });

  return { resources: { api, mainDb, uploads } };
});
```

## Property: `customDomains`

- Required: no
- Type: `Array<DomainConfiguration>`

Attach custom domains with auto-managed DNS records and TLS certificates.

**Prerequisite:** A Route 53 hosted zone for your domain must exist in your AWS account.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      customDomains:
        - domainName: app.example.com
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './',
    customDomains: [{ domainName: 'app.example.com' }]
  });
  return { resources: { web } };
});
```

## Property: `dev`

- Required: no
- Type: `unknown`

Dev server config for `stacktape dev`. Defaults to `next dev`.

## Property: `environment`

- Required: no
- Type: `Array<EnvironmentVar>`

Environment variables for the SSR function. Use `$ResourceParam()` or `$Secret()` for dynamic values.

### Example 1 (yaml)

```yaml
resources:
  database:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db.password')
      engine:
        type: postgres
        properties:
          primaryInstance:
            instanceSize: db.t4g.micro
          version: '16.6'
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      connectTo:
        - database
      environment:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          value: $ResourceParam('database', 'connectionString')
        - name: STRIPE_SECRET_KEY
          value: $Secret('stripe.secretKey')
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, RelationalDatabase, defineConfig, $Secret, $ResourceParam } from 'stacktape';

export default defineConfig(() => {
  const database = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db.password') },
    engine: {
      type: 'postgres',
      properties: {
        primaryInstance: { instanceSize: 'db.t4g.micro' },
        version: '16.6'
      }
    }
  });
  const web = new NextjsWeb({
    appDirectory: './',
    connectTo: [database],
    environment: {
      NODE_ENV: 'production',
      DATABASE_URL: $ResourceParam('database', 'connectionString'),
      STRIPE_SECRET_KEY: $Secret('stripe.secretKey')
    }
  });
  return { resources: { database, web } };
});
```

## Property: `fileOptions`

- Required: no
- Type: `Array<DirectoryUploadFilter>`

Set custom headers (e.g., `Cache-Control`) for static files matching a pattern.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      fileOptions:
        - includePattern: '**/*.{js,css,woff2}'
          headers:
            - key: Cache-Control
              value: 'public, max-age=31536000, immutable'
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './',
    fileOptions: [
      {
        includePattern: '**/*.{js,css,woff2}',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }]
      }
    ]
  });
  return { resources: { web } };
});
```

## Property: `iamRoleStatements`

- Required: no
- Type: `Array<StpIamRoleStatement>`

Raw IAM policy statements for permissions not covered by `connectTo`.

Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock).

### Example 1 (yaml)

```yaml
resources:
  processor:
    type: batch-job
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/job.ts
      resources:
        cpu: 1
        memory: 2048
      iamRoleStatements:
        - Effect: Allow
          Action:
            - textract:AnalyzeDocument
          Resource:
            - '*'
```

### Example 2 (typescript)

```typescript
import { BatchJob, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const processor = new BatchJob({
    container: { packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/job.ts' }) },
    resources: { cpu: 1, memory: 2048 },
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: ['textract:AnalyzeDocument'],
        Resource: ['*']
      }
    ]
  });

  return { resources: { processor } };
});
```

## Property: `serverLambda`

- Required: no
- Type: `NextjsServerLambdaProperties`

Customize the SSR Lambda function (memory, timeout, VPC, logging).

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      serverLambda:
        memory: 2048
        timeout: 25
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './',
    serverLambda: {
      memory: 2048,
      timeout: 25
    }
  });
  return { resources: { web } };
});
```

## Property: `streamingEnabled`

- Required: no
- Type: `boolean`
- Default: `false`

Stream SSR responses for faster Time to First Byte and up to 20 MB response size (vs 6 MB default).

Not compatible with `useEdgeLambda: true`.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      streamingEnabled: true
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './',
    streamingEnabled: true
  });
  return { resources: { web } };
});
```

## Property: `useEdgeLambda`

- Required: no
- Type: `boolean`
- Default: `false`

Run SSR at CloudFront edge locations for lower latency worldwide.

**Trade-offs:** Slower deploys, no `warmServerInstances`, no response streaming.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      useEdgeLambda: true
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './',
    useEdgeLambda: true
  });
  return { resources: { web } };
});
```

## Property: `useFirewall`

- Required: no
- Type: `string`

Name of a `web-app-firewall` resource to protect this app. Firewall `scope` must be `cdn`.

### Example 1 (yaml)

```yaml
resources:
  webFirewall:
    type: web-app-firewall
    properties:
      scope: cdn
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      useFirewall: webFirewall
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, WebAppFirewall, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const webFirewall = new WebAppFirewall({ scope: 'cdn' });
  const web = new NextjsWeb({
    appDirectory: './',
    useFirewall: 'webFirewall'
  });
  return { resources: { webFirewall, web } };
});
```

## Property: `warmServerInstances`

- Required: no
- Type: `number`
- Default: `0`

Number of Lambda instances to keep warm (pre-initialized) to reduce cold starts.

A separate "warmer" function periodically pings the SSR Lambda. Not available with `useEdgeLambda: true`.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
      warmServerInstances: 2
```

### Example 2 (typescript)

```typescript
import { NextjsWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './',
    warmServerInstances: 2
  });
  return { resources: { web } };
});
```
