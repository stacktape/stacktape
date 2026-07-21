# CustomResourceDefinitionProps API Reference

Resource type: `custom-resource`

## TypeScript definition

```typescript
import type { CustomArtifactLambdaPackaging, EnvironmentVar, StpBuildpackLambdaPackaging, StpIamRoleStatement } from 'stacktape';

type CustomResourceDefinitionProps = {
  /** How the Lambda function code is packaged and deployed. */
  packaging: CustomResourceDefinitionPackaging;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Environment variables injected into the Lambda function. Use $ResourceParam() for dynamic values. */
  environment?: Array<EnvironmentVar>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU. */
  memory?: number;
  /** Lambda runtime. Auto-detected from file extension if not specified. */
  runtime?: "dotnet6" | "dotnet7" | "dotnet8" | "java11" | "java17" | "java8" | "java8.al2" | "nodejs18.x" | "nodejs20.x" | "nodejs22.x" | "nodejs24.x" | "provided.al2" | "provided.al2023" | "python3.10" | "python3.11" | "python3.12" | "python3.13" | "python3.8" | "python3.9" | "ruby3.3";
  /** Max execution time in seconds. Max: 900. */
  timeout?: number;
};

/** Union choices used by the properties above. */
type CustomResourceDefinitionPackaging =
  | StpBuildpackLambdaPackaging
  | CustomArtifactLambdaPackaging;
```

## Property: `packaging`

- Required: yes
- Type: `stacktape-lambda-buildpack | custom-artifact`

How the Lambda function code is packaged and deployed.

Choices:
- `stacktape-lambda-buildpack` (`StpBuildpackLambdaPackaging`) — A zero-config buildpack that packages your code for AWS Lambda.. Properties: `handlerFunction?: string`, `entryfilePath: string`, `includeFiles?: Array<string>`, `excludeFiles?: Array<string>`, `excludeDependencies?: Array<string>`, `languageSpecificConfig?: Es | Py | Java | Php | Dotnet | Go | Ruby`.
- `custom-artifact` (`CustomArtifactLambdaPackaging`) — Uses a pre-built artifact for Lambda deployment.. Properties: `packagePath: string`, `handler?: string`.

### Example 1 (yaml)

```yaml
resources:
  stripeWebhookProvisioner:
    type: custom-resource-definition
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: provisioners/stripe-webhook.ts
      environment:
        - name: STRIPE_SECRET_KEY
          value: $Secret('stripe-key')
      timeout: 30
  webhookEndpoint:
    type: custom-resource-instance
    properties:
      definitionName: stripeWebhookProvisioner
      resourceProperties:
        url: https://api.example.com/stripe/webhook
        events:
          - checkout.session.completed
```

### Example 2 (typescript)

```typescript
import { CustomResourceDefinition, CustomResourceInstance, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const stripeWebhookProvisioner = new CustomResourceDefinition({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'provisioners/stripe-webhook.ts' }
    },
    environment: [{ name: 'STRIPE_SECRET_KEY', value: $Secret('stripe-key') }],
    timeout: 30
  });

  const webhookEndpoint = new CustomResourceInstance({
    definitionName: 'stripeWebhookProvisioner',
    resourceProperties: {
      url: 'https://api.example.com/stripe/webhook',
      events: ['checkout.session.completed']
    }
  });

  return { resources: { stripeWebhookProvisioner, webhookEndpoint } };
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

## Property: `environment`

- Required: no
- Type: `Array<EnvironmentVar>`

Environment variables injected into the Lambda function. Use `$ResourceParam()` for dynamic values.

### Example 1 (yaml)

```yaml
resources:
  assetsBucket:
    type: bucket
  cdnProvisioner:
    type: custom-resource-definition
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: provisioners/fastly-purge.ts
      environment:
        - name: FASTLY_API_TOKEN
          value: $Secret('fastly-token')
        - name: ORIGIN_BUCKET
          value: $ResourceParam('assetsBucket', 'name')
      timeout: 45
  cdnConfig:
    type: custom-resource-instance
    properties:
      definitionName: cdnProvisioner
      resourceProperties:
        serviceId: abc123
```

### Example 2 (typescript)

```typescript
import {
  Bucket,
  CustomResourceDefinition,
  CustomResourceInstance,
  $Secret,
  $ResourceParam,
  defineConfig
} from 'stacktape';

export default defineConfig(() => {
  const assetsBucket = new Bucket({});

  const cdnProvisioner = new CustomResourceDefinition({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'provisioners/fastly-purge.ts' }
    },
    environment: [
      { name: 'FASTLY_API_TOKEN', value: $Secret('fastly-token') },
      { name: 'ORIGIN_BUCKET', value: $ResourceParam('assetsBucket', 'name') }
    ],
    timeout: 45
  });

  const cdnConfig = new CustomResourceInstance({
    definitionName: 'cdnProvisioner',
    resourceProperties: { serviceId: 'abc123' }
  });

  return { resources: { assetsBucket, cdnProvisioner, cdnConfig } };
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

## Property: `memory`

- Required: no
- Type: `number`

Memory in MB (128–10,240). CPU scales proportionally — 1,769 MB = 1 vCPU.

### Example 1 (yaml)

```yaml
resources:
  imageOptimizerProvisioner:
    type: custom-resource-definition
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: provisioners/optimize-images.ts
      timeout: 600
      memory: 2048
  bannerOptimization:
    type: custom-resource-instance
    properties:
      definitionName: imageOptimizerProvisioner
      resourceProperties:
        sourcePrefix: raw/banners/
        targetPrefix: optimized/banners/
        quality: 80
```

### Example 2 (typescript)

```typescript
import { CustomResourceDefinition, CustomResourceInstance, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const imageOptimizerProvisioner = new CustomResourceDefinition({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'provisioners/optimize-images.ts' }
    },
    timeout: 600,
    memory: 2048
  });

  const bannerOptimization = new CustomResourceInstance({
    definitionName: 'imageOptimizerProvisioner',
    resourceProperties: {
      sourcePrefix: 'raw/banners/',
      targetPrefix: 'optimized/banners/',
      quality: 80
    }
  });

  return { resources: { imageOptimizerProvisioner, bannerOptimization } };
});
```

## Property: `runtime`

- Required: no
- Type: `string: "dotnet6" | "dotnet7" | "dotnet8" | "java11" | "java17" | "java8" | "java8.al2" | "nodejs18.x" | "nodejs20.x" | "nodejs22.x" | "nodejs24.x" | "provided.al2" | "provided.al2023" | "python3.10" | "python3.11" | "python3.12" | "python3.13" | "python3.8" | "python3.9" | "ruby3.3"`

Lambda runtime. Auto-detected from file extension if not specified.

### Example 1 (yaml)

```yaml
resources:
  datadogMonitorProvisioner:
    type: custom-resource-definition
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: provisioners/datadog_monitor.py
      runtime: python3.12
      environment:
        - name: DD_API_KEY
          value: $Secret('datadog-api-key')
        - name: DD_APP_KEY
          value: $Secret('datadog-app-key')
      timeout: 60
  apiLatencyMonitor:
    type: custom-resource-instance
    properties:
      definitionName: datadogMonitorProvisioner
      resourceProperties:
        name: API p99 latency
        query: avg(last_5m):p99:trace.http.request{service:api} > 2
        thresholdSeconds: 2
```

### Example 2 (typescript)

```typescript
import { CustomResourceDefinition, CustomResourceInstance, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const datadogMonitorProvisioner = new CustomResourceDefinition({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'provisioners/datadog_monitor.py' }
    },
    runtime: 'python3.12',
    environment: [
      { name: 'DD_API_KEY', value: $Secret('datadog-api-key') },
      { name: 'DD_APP_KEY', value: $Secret('datadog-app-key') }
    ],
    timeout: 60
  });

  const apiLatencyMonitor = new CustomResourceInstance({
    definitionName: 'datadogMonitorProvisioner',
    resourceProperties: {
      name: 'API p99 latency',
      query: 'avg(last_5m):p99:trace.http.request{service:api} > 2',
      thresholdSeconds: 2
    }
  });

  return { resources: { datadogMonitorProvisioner, apiLatencyMonitor } };
});
```

## Property: `timeout`

- Required: no
- Type: `number`
- Default: `10`

Max execution time in seconds. Max: 900.

### Example 1 (yaml)

```yaml
resources:
  algoliaIndexProvisioner:
    type: custom-resource-definition
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: provisioners/algolia-index.ts
      environment:
        - name: ALGOLIA_APP_ID
          value: $Secret('algolia-app-id')
        - name: ALGOLIA_ADMIN_KEY
          value: $Secret('algolia-admin-key')
      timeout: 300
  productsIndex:
    type: custom-resource-instance
    properties:
      definitionName: algoliaIndexProvisioner
      resourceProperties:
        indexName: products
        searchableAttributes:
          - title
          - description
```

### Example 2 (typescript)

```typescript
import { CustomResourceDefinition, CustomResourceInstance, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const algoliaIndexProvisioner = new CustomResourceDefinition({
    packaging: {
      type: 'stacktape-lambda-buildpack',
      properties: { entryfilePath: 'provisioners/algolia-index.ts' }
    },
    environment: [
      { name: 'ALGOLIA_APP_ID', value: $Secret('algolia-app-id') },
      { name: 'ALGOLIA_ADMIN_KEY', value: $Secret('algolia-admin-key') }
    ],
    timeout: 300
  });

  const productsIndex = new CustomResourceInstance({
    definitionName: 'algoliaIndexProvisioner',
    resourceProperties: {
      indexName: 'products',
      searchableAttributes: ['title', 'description']
    }
  });

  return { resources: { algoliaIndexProvisioner, productsIndex } };
});
```
