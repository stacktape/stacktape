# PrivateServiceProps API Reference

Resource type: `private-service`

## TypeScript definition

```typescript
import type { ContainerEfsMount, ContainerHealthCheck, ContainerWorkloadContainerLogging, ContainerWorkloadResourcesConfig, ContainerWorkloadScaling, CustomDockerfileCwImagePackaging, EnvironmentVar, ExternalBuildpackCwImagePackaging, NixpacksCwImagePackaging, PrebuiltCwImagePackaging, PrivateServiceLoadBalancing, ServiceHelperContainer, StpBuildpackCwImagePackaging, StpIamRoleStatement } from 'stacktape';

type PrivateServiceProps = {
  /** Configures the container image for the service. */
  packaging: PrivateServicePackaging;
  /** CPU, memory, and compute engine for the container. */
  resources: ContainerWorkloadResourcesConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Allow SSH-like access to running containers for debugging. */
  enableRemoteSessions?: boolean;
  /** Environment variables injected into the container at runtime. */
  environment?: Array<EnvironmentVar>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Health check that auto-replaces unhealthy containers. */
  internalHealthCheck?: ContainerHealthCheck;
  /** How traffic reaches this service from other resources. */
  loadBalancing?: PrivateServiceLoadBalancing;
  /** Logging configuration. */
  logging?: ContainerWorkloadContainerLogging;
  /** Port this service listens on. Injected as the PORT env var. */
  port?: number;
  /** Protocol for metrics collection. Set to enable protocol-specific metrics (e.g., HTTP 5xx tracking). */
  protocol?: "grpc" | "http" | "http2";
  /** Auto-scaling: add/remove container instances based on demand. */
  scaling?: ContainerWorkloadScaling;
  /** Helper containers that run alongside the main container. */
  sideContainers?: Array<ServiceHelperContainer>;
  /** Seconds to wait for graceful shutdown before force-killing the container. */
  stopTimeout?: number;
  /** Deploy in private subnets with a static outbound IP via NAT Gateway. */
  usePrivateSubnetsWithNAT?: boolean;
  /** Persistent EFS volumes shared across containers and restarts. */
  volumeMounts?: Array<ContainerEfsMount>;
};

/** Union choices used by the properties above. */
type PrivateServicePackaging =
  | StpBuildpackCwImagePackaging
  | ExternalBuildpackCwImagePackaging
  | PrebuiltCwImagePackaging
  | CustomDockerfileCwImagePackaging
  | NixpacksCwImagePackaging;
```

## Property: `packaging`

- Required: yes
- Type: `stacktape-image-buildpack | external-buildpack | prebuilt-image | custom-dockerfile | nixpacks`

Configures the container image for the service.

Choices:
- `stacktape-image-buildpack` (`StpBuildpackCwImagePackaging`) — A zero-config buildpack that creates a container image from your source code.. Properties: `languageSpecificConfig?: Es | Py | Java | Php | Dotnet | Go | Ruby`, `requiresGlibcBinaries?: boolean`, `customDockerBuildCommands?: Array<string>`, `entryfilePath: string`, `includeFiles?: Array<string>`, `excludeFiles?: Array<string>`, `excludeDependencies?: Array<string>`.
- `external-buildpack` (`ExternalBuildpackCwImagePackaging`) — Builds a container image using an external buildpack.. Properties: `builder?: string`, `buildpacks?: Array<string>`, `sourceDirectoryPath: string`, `command?: Array<string>`.
- `prebuilt-image` (`PrebuiltCwImagePackaging`) — Uses a pre-built container image.. Properties: `repositoryCredentialsSecretArn?: string`, `entryPoint?: Array<string>`, `image: string`, `command?: Array<string>`.
- `custom-dockerfile` (`CustomDockerfileCwImagePackaging`) — Builds a container image from your own Dockerfile.. Properties: `entryPoint?: Array<string>`, `dockerfilePath?: string`, `buildContextPath: string`, `buildArgs?: Array<DockerBuildArg>`, `command?: Array<string>`.
- `nixpacks` (`NixpacksCwImagePackaging`) — Builds a container image using Nixpacks.. Properties: `sourceDirectoryPath: string`, `buildImage?: string`, `providers?: Array<string>`, `startCmd?: string`, `startRunImage?: string`, `startOnlyIncludeFiles?: Array<string>`, `phases?: Array<NixpacksPhase>`.

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
        cpu: 0.25
        memory: 512
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 }
  });

  return { resources: { api } };
});
```

## Property: `resources`

- Required: yes
- Type: `ContainerWorkloadResourcesConfig`

CPU, memory, and compute engine for the container.

Two compute engines:

**Fargate** (default): Serverless — just specify `cpu` and `memory`.
**EC2**: Specify `instanceTypes` for more control and potentially lower cost.

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
        cpu: 1
        memory: 2048
        architecture: arm64
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 1, memory: 2048, architecture: 'arm64' }
  });

  return { resources: { api } };
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

## Property: `enableRemoteSessions`

- Required: no
- Type: `boolean`
- Default: `false`

Allow SSH-like access to running containers for debugging.

Enables `stacktape container:session` to open an interactive shell inside the container.
Adds a small SSM agent that uses minimal CPU/memory.

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
        cpu: 0.25
        memory: 512
      enableRemoteSessions: true
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    enableRemoteSessions: true
  });

  return { resources: { api } };
});
```

## Property: `environment`

- Required: no
- Type: `Array<EnvironmentVar>`

Environment variables injected into the container at runtime.

Use for configuration like API keys, feature flags, or secrets.
Variables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically.

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
        cpu: 0.25
        memory: 512
      environment:
        - name: LOG_LEVEL
          value: info
        - name: DATABASE_URL
          value: $ResourceParam('mainDb', 'connectionString')
      connectTo:
        - mainDb
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
```

### Example 2 (typescript)

```typescript
import { WebService, RelationalDatabase, RdsEnginePostgres, StacktapeImageBuildpackPackaging, $ResourceParam, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const mainDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEnginePostgres({ version: '16.2', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    environment: {
      LOG_LEVEL: 'info',
      DATABASE_URL: $ResourceParam('mainDb', 'connectionString')
    },
    connectTo: [mainDb]
  });

  return { resources: { api, mainDb } };
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

## Property: `internalHealthCheck`

- Required: no
- Type: `ContainerHealthCheck`

Health check that auto-replaces unhealthy containers.

If a container fails the health check, it's terminated and replaced automatically.

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
        cpu: 0.25
        memory: 512
      internalHealthCheck:
        healthCheckCommand:
          - CMD-SHELL
          - curl -f http://localhost:3000/health || exit 1
        intervalSeconds: 30
        retries: 3
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    internalHealthCheck: {
      healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
      intervalSeconds: 30,
      retries: 3
    }
  });

  return { resources: { api } };
});
```

## Property: `loadBalancing`

- Required: no
- Type: `PrivateServiceLoadBalancing`
- Default: `service-connect`

How traffic reaches this service from other resources.

**`service-connect`** (default, ~$0.50/mo): Direct container-to-container. Cheapest option.
Only reachable from other container-based resources in the stack.
**`application-load-balancer`** (~$18/mo): HTTP load balancer. Reachable from any VPC resource.

### Example 1 (yaml)

```yaml
resources:
  paymentsService:
    type: private-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/payments.ts
      port: 3000
      resources:
        cpu: 1
        memory: 1024
      loadBalancing:
        type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { PrivateService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const paymentsService = new PrivateService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: {
        entryfilePath: 'src/payments.ts'
      }
    },
    port: 3000,
    resources: {
      cpu: 1,
      memory: 1024
    },
    loadBalancing: {
      type: 'application-load-balancer'
    }
  });

  return { resources: { paymentsService } };
});
```

## Property: `logging`

- Required: no
- Type: `ContainerWorkloadContainerLogging`

Logging configuration.

Container output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.
View logs with `stacktape logs` or in the Stacktape Console.

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
        cpu: 0.25
        memory: 512
      logging:
        retentionDays: 30
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    logging: { retentionDays: 30 }
  });

  return { resources: { api } };
});
```

## Property: `port`

- Required: no
- Type: `number`
- Default: `3000`

Port this service listens on. Injected as the `PORT` env var.

### Example 1 (yaml)

```yaml
resources:
  internalApi:
    type: private-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      port: 8080
      resources:
        cpu: 1
        memory: 1024
      environment:
        - name: NODE_ENV
          value: production
```

### Example 2 (typescript)

```typescript
import { PrivateService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const internalApi = new PrivateService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: {
        entryfilePath: 'src/server.ts'
      }
    },
    port: 8080,
    resources: {
      cpu: 1,
      memory: 1024
    },
    environment: {
      NODE_ENV: 'production'
    }
  });

  return { resources: { internalApi } };
});
```

## Property: `protocol`

- Required: no
- Type: `string: "grpc" | "http" | "http2"`

Protocol for metrics collection. Set to enable protocol-specific metrics (e.g., HTTP 5xx tracking).

### Example 1 (yaml)

```yaml
resources:
  grpcBackend:
    type: private-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/grpc-server.ts
      port: 50051
      protocol: grpc
      resources:
        cpu: 2
        memory: 2048
```

### Example 2 (typescript)

```typescript
import { PrivateService, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const grpcBackend = new PrivateService({
    packaging: {
      type: 'stacktape-image-buildpack',
      properties: {
        entryfilePath: 'src/grpc-server.ts'
      }
    },
    port: 50051,
    protocol: 'grpc',
    resources: {
      cpu: 2,
      memory: 2048
    }
  });

  return { resources: { grpcBackend } };
});
```

## Property: `scaling`

- Required: no
- Type: `ContainerWorkloadScaling`

Auto-scaling: add/remove container instances based on demand.

Traffic is automatically distributed across all running containers.

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
      scaling:
        minInstances: 2
        maxInstances: 10
        scalingPolicy:
          keepAvgCpuUtilizationUnder: 70
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    scaling: {
      minInstances: 2,
      maxInstances: 10,
      scalingPolicy: { keepAvgCpuUtilizationUnder: 70 }
    }
  });

  return { resources: { api } };
});
```

## Property: `sideContainers`

- Required: no
- Type: `Array<ServiceHelperContainer>`

Helper containers that run alongside the main container.

**`run-on-init`**: Runs to completion before the main container starts (e.g., database migrations).
**`always-running`**: Runs for the entire lifecycle (e.g., log forwarders, monitoring agents).
Can reach the main container via `localhost`.

## Property: `stopTimeout`

- Required: no
- Type: `number`
- Default: `2`

Seconds to wait for graceful shutdown before force-killing the container.

The container receives `SIGTERM` first, then `SIGKILL` after this timeout. Must be 2-120.

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
        cpu: 0.25
        memory: 512
      stopTimeout: 30
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    stopTimeout: 30
  });

  return { resources: { api } };
});
```

## Property: `usePrivateSubnetsWithNAT`

- Required: no
- Type: `boolean`
- Default: `false`

Deploy in private subnets with a static outbound IP via NAT Gateway.

The container won't have a public IP. All outbound traffic routes through a NAT Gateway,
giving you a static IP you can whitelist in external services (APIs, payment gateways, etc.).

Configure the number of NAT Gateways in `stackConfig.vpc.nat`.

**Adds cost:** NAT Gateway ~$32/month + data processing fees.

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
        cpu: 0.25
        memory: 512
      usePrivateSubnetsWithNAT: true
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    usePrivateSubnetsWithNAT: true
  });

  return { resources: { api } };
});
```

## Property: `volumeMounts`

- Required: no
- Type: `Array<ContainerEfsMount>`

Persistent EFS volumes shared across containers and restarts.

Data stored in EFS volumes persists even when containers are replaced.
Multiple containers can mount the same volume. All data is encrypted in transit.

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
      volumeMounts:
        - type: efs
          properties:
            efsFilesystemName: sharedData
            mountPath: /data
  sharedData:
    type: efs-filesystem
    properties: {}
```

### Example 2 (typescript)

```typescript
import { WebService, EfsFilesystem, ContainerEfsMount, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const sharedData = new EfsFilesystem({});
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    volumeMounts: [
      new ContainerEfsMount({ type: 'efs', properties: { efsFilesystemName: 'sharedData', mountPath: '/data' } })
    ]
  });

  return { resources: { api, sharedData } };
});
```
