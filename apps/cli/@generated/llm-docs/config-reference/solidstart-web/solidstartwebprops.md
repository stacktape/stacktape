# SolidStartWebProps API Reference

Resource type: `solidstart-web`

## TypeScript definition

```typescript
import type { DirectoryUploadFilter, DomainConfiguration, EnvironmentVar, SsrWebCdnConfig, SsrWebDevConfig, SsrWebServerLambdaConfig, StpIamRoleStatement } from 'stacktape';

type SolidStartWebProps = {
  /** Directory containing your app.config.ts. For monorepos, point to the SolidStart workspace. */
  appDirectory?: string;
  /** Override the default vinxi build command. */
  buildCommand?: string;
  /** CDN cache controls for SSR routes and specific path patterns. */
  cdn?: SsrWebCdnConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Attach custom domains with auto-managed DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Dev server config for stacktape dev. Defaults to vinxi dev. */
  dev?: SsrWebDevConfig;
  /** Environment variables for the SSR function. Use $ResourceParam() or $Secret() for dynamic values. */
  environment?: Array<EnvironmentVar>;
  /** Set custom headers (e.g., Cache-Control) for static files matching a pattern. */
  fileOptions?: Array<DirectoryUploadFilter>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Customize the SSR Lambda function (memory, timeout, VPC, logging). */
  serverLambda?: SsrWebServerLambdaConfig;
  /** Name of a web-app-firewall resource to protect this app. Firewall scope must be cdn. */
  useFirewall?: string;
};
```

## Property: `appDirectory`

- Required: no
- Type: `string`
- Default: `.`

Directory containing your `app.config.ts`. For monorepos, point to the SolidStart workspace.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: solidstart-web
    properties:
      appDirectory: ./packages/web
      environment:
        - name: PUBLIC_API_URL
          value: https://api.example.com
```

### Example 2 (typescript)

```typescript
import { SolidStartWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    appDirectory: './packages/web',
    environment: [{ name: 'PUBLIC_API_URL', value: 'https://api.example.com' }]
  });
  return { resources: { web } };
});
```

## Property: `buildCommand`

- Required: no
- Type: `string`

Override the default `vinxi build` command.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: solidstart-web
    properties:
      buildCommand: pnpm run build
      environment:
        - name: PUBLIC_STAGE
          value: production
```

### Example 2 (typescript)

```typescript
import { SolidStartWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    buildCommand: 'pnpm run build',
    environment: [{ name: 'PUBLIC_STAGE', value: 'production' }]
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
    type: solidstart-web
    properties:
      cdn:
        disableInvalidationAfterDeploy: false
        defaultCachingOptions:
          minTTL: 0
          defaultTTL: 60
          maxTTL: 3600
        pathCachingOverrides:
          - path: /_server-islands/*
            cachingOptions:
              defaultTTL: 0
              maxTTL: 0
      customDomains:
        - domainName: app.example.com
```

### Example 2 (typescript)

```typescript
import { SolidStartWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    cdn: {
      disableInvalidationAfterDeploy: false,
      defaultCachingOptions: { minTTL: 0, defaultTTL: 60, maxTTL: 3600 },
      pathCachingOverrides: [
        { path: '/_server-islands/*', cachingOptions: { defaultTTL: 0, maxTTL: 0 } }
      ]
    },
    customDomains: [{ domainName: 'app.example.com' }]
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
    type: solidstart-web
    properties:
      customDomains:
        - domainName: app.example.com
      environment:
        - name: PUBLIC_API_URL
          value: https://api.example.com
```

### Example 2 (typescript)

```typescript
import { SolidStartWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    customDomains: [{ domainName: 'app.example.com' }],
    environment: [{ name: 'PUBLIC_API_URL', value: 'https://api.example.com' }]
  });
  return { resources: { web } };
});
```

## Property: `dev`

- Required: no
- Type: `SsrWebDevConfig`

Dev server config for `stacktape dev`. Defaults to `vinxi dev`.

### Example 1 (yaml)

```yaml
resources:
  web:
    type: solidstart-web
    properties:
      dev:
        command: pnpm run dev
        workingDirectory: ./packages/web
      environment:
        - name: PUBLIC_API_URL
          value: https://api.example.com
```

### Example 2 (typescript)

```typescript
import { SolidStartWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    dev: {
      command: 'pnpm run dev',
      workingDirectory: './packages/web'
    },
    environment: [{ name: 'PUBLIC_API_URL', value: 'https://api.example.com' }]
  });
  return { resources: { web } };
});
```

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
      engine:
        type: postgres
        properties:
          version: '16.6'
          primaryInstance:
            instanceSize: db.t3.micro
      credentials:
        masterUserPassword: $Secret('db-password')
  web:
    type: solidstart-web
    properties:
      environment:
        - name: DATABASE_URL
          value: $ResourceParam('database', 'connectionString')
        - name: SESSION_SECRET
          value: $Secret('session-secret')
```

### Example 2 (typescript)

```typescript
import { SolidStartWeb, RelationalDatabase, defineConfig, $ResourceParam, $Secret } from 'stacktape';

export default defineConfig(() => {
  const database = new RelationalDatabase({
    engine: { type: 'postgres', properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t3.micro' } } },
    credentials: { masterUserPassword: $Secret('db-password') }
  });
  const web = new SolidStartWeb({
    environment: [
      { name: 'DATABASE_URL', value: $ResourceParam('database', 'connectionString') },
      { name: 'SESSION_SECRET', value: $Secret('session-secret') }
    ]
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
    type: solidstart-web
    properties:
      fileOptions:
        - includePattern: '**/*.html'
          headers:
            - key: Cache-Control
              value: no-cache
        - includePattern: assets/**
          headers:
            - key: Cache-Control
              value: public, max-age=31536000, immutable
```

### Example 2 (typescript)

```typescript
import { SolidStartWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    fileOptions: [
      { includePattern: '**/*.html', headers: [{ key: 'Cache-Control', value: 'no-cache' }] },
      {
        includePattern: 'assets/**',
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
- Type: `SsrWebServerLambdaConfig`

Customize the SSR Lambda function (memory, timeout, VPC, logging).

### Example 1 (yaml)

```yaml
resources:
  web:
    type: solidstart-web
    properties:
      serverLambda:
        memory: 2048
        timeout: 20
        logging:
          retentionDays: 30
      environment:
        - name: PUBLIC_API_URL
          value: https://api.example.com
```

### Example 2 (typescript)

```typescript
import { SolidStartWeb, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    serverLambda: {
      memory: 2048,
      timeout: 20,
      logging: { retentionDays: 30 }
    },
    environment: [{ name: 'PUBLIC_API_URL', value: 'https://api.example.com' }]
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
  firewall:
    type: web-app-firewall
    properties:
      scope: cdn
  web:
    type: solidstart-web
    properties:
      useFirewall: firewall
      customDomains:
        - domainName: app.example.com
```

### Example 2 (typescript)

```typescript
import { SolidStartWeb, WebAppFirewall, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const firewall = new WebAppFirewall({ scope: 'cdn' });
  const web = new SolidStartWeb({
    useFirewall: 'firewall',
    customDomains: [{ domainName: 'app.example.com' }]
  });
  return { resources: { firewall, web } };
});
```
