# WebServiceProps API Reference

Resource type: `web-service`

## TypeScript definition

```typescript
import type { ApplicationLoadBalancerAlarm, CdnConfiguration, ContainerEfsMount, ContainerHealthCheck, ContainerWorkloadContainerLogging, ContainerWorkloadDeploymentConfig, ContainerWorkloadResourcesConfig, ContainerWorkloadScaling, CustomDockerfileCwImagePackaging, DomainConfiguration, EnvironmentVar, ExternalBuildpackCwImagePackaging, HttpApiCorsConfig, HttpApiGatewayAlarm, NixpacksCwImagePackaging, PrebuiltCwImagePackaging, ServiceHelperContainer, StpBuildpackCwImagePackaging, StpIamRoleStatement, WebServiceAlbLoadBalancing, WebServiceHttpApiGatewayLoadBalancing, WebServiceNlbLoadBalancing } from 'stacktape';

type WebServiceProps = {
  /** Configures the container image for the service. */
  packaging: WebServicePackaging;
  /** CPU, memory, and compute engine for the container. */
  resources: ContainerWorkloadResourcesConfig;
  /** Alarms for this service (merged with global alarms from the Stacktape Console). */
  alarms?: Array<WebServiceAlarms>;
  /** Put a CDN (CloudFront) in front of this service for caching and lower latency worldwide. */
  cdn?: CdnConfiguration;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** CORS settings. Overrides any CORS headers from your application. */
  cors?: HttpApiCorsConfig;
  /** Custom domains (e.g., api.example.com). Stacktape auto-creates DNS records and TLS certificates. */
  customDomains?: Array<DomainConfiguration>;
  /** Gradual traffic shifting for safe deployments (canary, linear, or all-at-once). */
  deployment?: ContainerWorkloadDeploymentConfig;
  /** Global alarm names to exclude from this service. */
  disabledGlobalAlarms?: Array<string>;
  /** Allow SSH-like access to running containers for debugging. */
  enableRemoteSessions?: boolean;
  /** Environment variables injected into the container at runtime. */
  environment?: Array<EnvironmentVar>;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Health check that auto-replaces unhealthy containers. */
  internalHealthCheck?: ContainerHealthCheck;
  /** How traffic reaches your containers. Affects pricing, features, and protocol support. */
  loadBalancing?: WebServiceLoadBalancing;
  /** Logging configuration. */
  logging?: ContainerWorkloadContainerLogging;
  /** Auto-scaling: add/remove container instances based on demand. */
  scaling?: ContainerWorkloadScaling;
  /** Helper containers that run alongside the main container. */
  sideContainers?: Array<ServiceHelperContainer>;
  /** Seconds to wait for graceful shutdown before force-killing the container. */
  stopTimeout?: number;
  /** Name of a web-app-firewall resource to protect this service from common web exploits. */
  useFirewall?: string;
  /** Deploy in private subnets with a static outbound IP via NAT Gateway. */
  usePrivateSubnetsWithNAT?: boolean;
  /** Persistent EFS volumes shared across containers and restarts. */
  volumeMounts?: Array<ContainerEfsMount>;
};

/** Union choices used by the properties above. */
type WebServicePackaging =
  | StpBuildpackCwImagePackaging
  | ExternalBuildpackCwImagePackaging
  | PrebuiltCwImagePackaging
  | CustomDockerfileCwImagePackaging
  | NixpacksCwImagePackaging;

type WebServiceAlarms =
  | ApplicationLoadBalancerAlarm
  | HttpApiGatewayAlarm;

type WebServiceLoadBalancing =
  | WebServiceHttpApiGatewayLoadBalancing
  | WebServiceAlbLoadBalancing
  | WebServiceNlbLoadBalancing;
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

## Property: `alarms`

- Required: no
- Type: `Array<ApplicationLoadBalancerAlarm | HttpApiGatewayAlarm>`

Alarms for this service (merged with global alarms from the Stacktape Console).

Choices:
- `ApplicationLoadBalancerAlarm` (`ApplicationLoadBalancerAlarm`). Properties: `trigger: application-load-balancer-custom | application-load-balancer-error-rate | application-load-balancer-unhealthy-targets`, `evaluation?: AlarmEvaluation`, `notificationTargets?: Array<ms-teams | slack | email | discord | webhook>`, `includeInHistory?: boolean`, `description?: string`.
- `HttpApiGatewayAlarm` (`HttpApiGatewayAlarm`). Properties: `trigger: http-api-gateway-error-rate | http-api-gateway-latency`, `evaluation?: AlarmEvaluation`, `notificationTargets?: Array<ms-teams | slack | email | discord | webhook>`, `includeInHistory?: boolean`, `description?: string`.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 2048
      alarms:
        - trigger:
            type: http-api-gateway-error-rate
            properties:
              thresholdPercent: 5
          notificationTargets:
            - type: email
              properties:
                sender: alerts@example.com
                recipient: oncall@example.com
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    alarms: [
      {
        trigger: {
          type: 'http-api-gateway-error-rate',
          properties: {
            thresholdPercent: 5
          }
        },
        notificationTargets: [
          {
            type: 'email',
            properties: {
              sender: 'alerts@example.com',
              recipient: 'oncall@example.com'
            }
          }
        ]
      }
    ]
  });

  return {
    resources: { apiService }
  };
});
```

## Property: `cdn`

- Required: no
- Type: `CdnConfiguration`

Put a CDN (CloudFront) in front of this service for caching and lower latency worldwide.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 2048
      cdn:
        enabled: true
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    cdn: {
      enabled: true
    }
  });

  return {
    resources: { apiService }
  };
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

## Property: `cors`

- Required: no
- Type: `HttpApiCorsConfig`

CORS settings. Overrides any CORS headers from your application.

Only works with `http-api-gateway` load balancing (the default).

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 2048
      cors:
        enabled: true
        allowedOrigins:
          - https://app.example.com
        allowedMethods:
          - GET
          - POST
        allowCredentials: true
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    cors: {
      enabled: true,
      allowedOrigins: ['https://app.example.com'],
      allowedMethods: ['GET', 'POST'],
      allowCredentials: true
    }
  });

  return {
    resources: { apiService }
  };
});
```

## Property: `customDomains`

- Required: no
- Type: `Array<DomainConfiguration>`

Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates.

Your domain must be added as a Route53 hosted zone in your AWS account first.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 2048
      customDomains:
        - domainName: api.example.com
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    customDomains: [{ domainName: 'api.example.com' }]
  });

  return {
    resources: { apiService }
  };
});
```

## Property: `deployment`

- Required: no
- Type: `ContainerWorkloadDeploymentConfig`

Gradual traffic shifting for safe deployments (canary, linear, or all-at-once).

Requires `loadBalancing` type `application-load-balancer`.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 2048
      loadBalancing:
        type: application-load-balancer
      deployment:
        strategy: Canary10Percent5Minutes
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    loadBalancing: {
      type: 'application-load-balancer'
    },
    deployment: {
      strategy: 'Canary10Percent5Minutes'
    }
  });

  return {
    resources: { apiService }
  };
});
```

## Property: `disabledGlobalAlarms`

- Required: no
- Type: `Array<string>`

Global alarm names to exclude from this service.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 2048
      disabledGlobalAlarms:
        - high-error-rate
        - high-latency
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    disabledGlobalAlarms: ['high-error-rate', 'high-latency']
  });

  return {
    resources: { apiService }
  };
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
- Type: `http-api-gateway | application-load-balancer | network-load-balancer`

How traffic reaches your containers. Affects pricing, features, and protocol support.

**`http-api-gateway`** (default): Pay-per-request (~$1/million requests). Best for most apps.
Cheapest at low traffic, but costs grow with volume.

**`application-load-balancer`**: Flat ~$18/month + usage. Required for gradual deployments
(`deployment`), top-level firewalls (`useFirewall`), and WebSocket support.
More cost-effective above ~500k requests/day. AWS Free Tier eligible.

**`network-load-balancer`**: For non-HTTP traffic (TCP/TLS) like MQTT, game servers, or custom protocols.
Requires explicit `ports` configuration. Does not support CDN, top-level firewall, or gradual deployments.

Choices:
- `http-api-gateway` (`WebServiceHttpApiGatewayLoadBalancing`)
- `application-load-balancer` (`WebServiceAlbLoadBalancing`). Properties: `healthcheckPath?: string`, `healthcheckInterval?: number`, `healthcheckTimeout?: number`.
- `network-load-balancer` (`WebServiceNlbLoadBalancing`). Properties: `healthcheckPath?: string`, `healthcheckInterval?: number`, `healthcheckTimeout?: number`, `healthCheckProtocol?: string: "HTTP" | "TCP"`, `healthCheckPort?: number`, `ports: Array<WebServiceNlbLoadBalancingPort>`.

### Example 1 (yaml)

```yaml
resources:
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 2048
      loadBalancing:
        type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const apiService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    loadBalancing: {
      type: 'application-load-balancer'
    }
  });

  return {
    resources: { apiService }
  };
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

## Property: `useFirewall`

- Required: no
- Type: `string`

Name of a `web-app-firewall` resource to protect this service from common web exploits.

Attaches a regional firewall directly to the service's application load balancer.
Requires `loadBalancing` type `application-load-balancer`.

To protect a CDN-enabled service at CloudFront instead, use `cdn.useFirewall`
with a `web-app-firewall` resource whose `scope` is `cdn`.

### Example 1 (yaml)

```yaml
resources:
  serviceFirewall:
    type: web-app-firewall
    properties:
      scope: regional
  apiService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
      resources:
        cpu: 1
        memory: 2048
      loadBalancing:
        type: application-load-balancer
      useFirewall: serviceFirewall
```

### Example 2 (typescript)

```typescript
import { defineConfig, WebService, WebAppFirewall, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const serviceFirewall = new WebAppFirewall({
    scope: 'regional'
  });

  const apiService = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: 'src/main.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    loadBalancing: {
      type: 'application-load-balancer'
    },
    useFirewall: 'serviceFirewall'
  });

  return {
    resources: { serviceFirewall, apiService }
  };
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
