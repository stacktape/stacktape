# ContainerWorkloadContainer API Reference

Resource type: `multi-container-workload`

## TypeScript definition

```typescript
import type { ContainerDependency, ContainerEfsMount, ContainerHealthCheck, ContainerWorkloadContainerLogging, ContainerWorkloadHttpApiIntegration, ContainerWorkloadInternalIntegration, ContainerWorkloadLoadBalancerIntegration, ContainerWorkloadNetworkLoadBalancerIntegration, ContainerWorkloadServiceConnectIntegration, CustomDockerfileCwImagePackaging, EnvironmentVar, ExternalBuildpackCwImagePackaging, LoadBalancerHealthCheck, NixpacksCwImagePackaging, PrebuiltCwImagePackaging, StpBuildpackCwImagePackaging } from 'stacktape';

type ContainerWorkloadContainer = {
  /** Unique container name within this workload. */
  name: string;
  /** How to build or specify the container image. */
  packaging: ContainerWorkloadContainerPackaging;
  /** Start this container only after the listed containers reach a specific state. */
  dependsOn?: Array<ContainerDependency>;
  /** Environment variables injected at runtime. Use $ResourceParam() or $Secret() for dynamic values. */
  environment?: Array<EnvironmentVar>;
  /** If true (default), the entire workload restarts when this container fails. */
  essential?: boolean;
  /** How this container receives traffic (API Gateway, load balancer, or service-connect). */
  events?: Array<ContainerWorkloadContainerEvents>;
  /** Command-based health check. If it fails on an essential container, the workload instance is replaced. */
  internalHealthCheck?: ContainerHealthCheck;
  /** Load balancer health check settings. Only applies when integrated with an ALB or NLB. */
  loadBalancerHealthCheck?: LoadBalancerHealthCheck;
  /** Container logging (stdout/stderr). Sent to CloudWatch, viewable with stacktape logs. */
  logging?: ContainerWorkloadContainerLogging;
  /** Seconds to wait after SIGTERM before SIGKILL (2-120). */
  stopTimeout?: number;
  /** Mount EFS volumes for persistent, shared storage across containers. */
  volumeMounts?: Array<ContainerEfsMount>;
};

/** Union choices used by the properties above. */
type ContainerWorkloadContainerPackaging =
  | StpBuildpackCwImagePackaging
  | ExternalBuildpackCwImagePackaging
  | PrebuiltCwImagePackaging
  | CustomDockerfileCwImagePackaging
  | NixpacksCwImagePackaging;

type ContainerWorkloadContainerEvents =
  | ContainerWorkloadLoadBalancerIntegration
  | ContainerWorkloadHttpApiIntegration
  | ContainerWorkloadInternalIntegration
  | ContainerWorkloadServiceConnectIntegration
  | ContainerWorkloadNetworkLoadBalancerIntegration;
```

## Property: `name`

- Required: yes
- Type: `string`

Unique container name within this workload.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' })
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `packaging`

- Required: yes
- Type: `stacktape-image-buildpack | external-buildpack | prebuilt-image | custom-dockerfile | nixpacks`

How to build or specify the container image.

Choices:
- `stacktape-image-buildpack` (`StpBuildpackCwImagePackaging`) — A zero-config buildpack that creates a container image from your source code.. Properties: `languageSpecificConfig?: Es | Py | Java | Php | Dotnet | Go | Ruby`, `requiresGlibcBinaries?: boolean`, `customDockerBuildCommands?: Array<string>`, `entryfilePath: string`, `includeFiles?: Array<string>`, `excludeFiles?: Array<string>`, `excludeDependencies?: Array<string>`.
- `external-buildpack` (`ExternalBuildpackCwImagePackaging`) — Builds a container image using an external buildpack.. Properties: `builder?: string`, `buildpacks?: Array<string>`, `sourceDirectoryPath: string`, `command?: Array<string>`.
- `prebuilt-image` (`PrebuiltCwImagePackaging`) — Uses a pre-built container image.. Properties: `repositoryCredentialsSecretArn?: string`, `entryPoint?: Array<string>`, `image: string`, `command?: Array<string>`.
- `custom-dockerfile` (`CustomDockerfileCwImagePackaging`) — Builds a container image from your own Dockerfile.. Properties: `entryPoint?: Array<string>`, `dockerfilePath?: string`, `buildContextPath: string`, `buildArgs?: Array<DockerBuildArg>`, `command?: Array<string>`.
- `nixpacks` (`NixpacksCwImagePackaging`) — Builds a container image using Nixpacks.. Properties: `sourceDirectoryPath: string`, `buildImage?: string`, `providers?: Array<string>`, `startCmd?: string`, `startRunImage?: string`, `startOnlyIncludeFiles?: Array<string>`, `phases?: Array<NixpacksPhase>`.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: custom-dockerfile
            properties:
              buildContextPath: ./api
              dockerfilePath: Dockerfile
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, CustomDockerfilePackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new CustomDockerfilePackaging({ buildContextPath: './api', dockerfilePath: 'Dockerfile' })
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `dependsOn`

- Required: no
- Type: `Array<ContainerDependency>`

Start this container only after the listed containers reach a specific state.

E.g., wait for a database sidecar to be `HEALTHY` before starting the app container.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: migrations
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/migrate.ts
          essential: false
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          dependsOn:
            - containerName: migrations
              condition: SUCCESS
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'migrations', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/migrate.ts' }), essential: false },
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        dependsOn: [{ containerName: 'migrations', condition: 'SUCCESS' }]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `environment`

- Required: no
- Type: `Array<EnvironmentVar>`

Environment variables injected at runtime. Use `$ResourceParam()` or `$Secret()` for dynamic values.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          environment:
            - name: NODE_ENV
              value: production
            - name: DATABASE_URL
              value: $ResourceParam('appDb', 'connectionString')
            - name: STRIPE_KEY
              value: $Secret('stripe.secretKey')
      resources:
        cpu: 0.5
        memory: 1024
      connectTo:
        - appDb
  appDb:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db.password')
      engine:
        type: postgres
        properties:
          version: '16.6'
          primaryInstance:
            instanceSize: db.t3.micro
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, RelationalDatabase, StacktapeImageBuildpackPackaging, $ResourceParam, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appDb = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db.password') },
    engine: { type: 'postgres', properties: { version: '16.6', primaryInstance: { instanceSize: 'db.t3.micro' } } }
  });
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        environment: {
          NODE_ENV: 'production',
          DATABASE_URL: $ResourceParam('appDb', 'connectionString'),
          STRIPE_KEY: $Secret('stripe.secretKey')
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    connectTo: [appDb]
  });
  return { resources: { app, appDb } };
});
```

## Property: `essential`

- Required: no
- Type: `boolean`

If `true` (default), the entire workload restarts when this container fails.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
        - name: metrics-sidecar
          packaging:
            type: prebuilt-image
            properties:
              image: prom/statsd-exporter:latest
          essential: false
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, PrebuiltImagePackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      { name: 'api', packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }) },
      {
        name: 'metrics-sidecar',
        packaging: new PrebuiltImagePackaging({ image: 'prom/statsd-exporter:latest' }),
        essential: false
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `events`

- Required: no
- Type: `Array<application-load-balancer | http-api-gateway | workload-internal | service-connect | network-load-balancer>`

How this container receives traffic (API Gateway, load balancer, or service-connect).

Choices:
- `application-load-balancer` (`ContainerWorkloadLoadBalancerIntegration`) — Triggers a container when a request matches the specified conditions on an Application Load Balancer.. Properties: `containerPort: number`, `loadBalancerName: string`, `listenerPort?: number`, `priority: number`, `paths?: Array<string>`, `methods?: Array<string>`, `hosts?: Array<string>`, `headers?: Array<LbHeaderCondition>`, `queryParams?: Array<LbQueryParamCondition>`, `sourceIps?: Array<string>`.
- `http-api-gateway` (`ContainerWorkloadHttpApiIntegration`) — Triggers a container when an HTTP API Gateway receives a matching request.. Properties: `containerPort: number`, `httpApiGatewayName: string`, `method: string: "*" | "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT"`, `path: string`, `authorizer?: cognito | lambda`, `payloadFormat?: string: "1.0" | "2.0"`.
- `workload-internal` (`ContainerWorkloadInternalIntegration`) — Opens a container port for connections from other containers within the same workload.. Properties: `containerPort: number`.
- `service-connect` (`ContainerWorkloadServiceConnectIntegration`) — Opens a container port for connections from other compute resources in the same stack.. Properties: `containerPort: number`, `alias?: string`, `protocol?: string: "grpc" | "http" | "http2"`.
- `network-load-balancer` (`ContainerWorkloadNetworkLoadBalancerIntegration`) — Triggers a container when a request is made to a Network Load Balancer.. Properties: `containerPort: number`, `loadBalancerName: string`, `listenerPort: number`.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                paths:
                  - /*
                containerPort: 3000
      resources:
        cpu: 0.5
        memory: 1024
  appLb:
    type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          {
            type: 'application-load-balancer',
            properties: { loadBalancerName: 'appLb', priority: 1, paths: ['/*'], containerPort: 3000 }
          }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, appLb } };
});
```

## Property: `internalHealthCheck`

- Required: no
- Type: `ContainerHealthCheck`

Command-based health check. If it fails on an essential container, the workload instance is replaced.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          internalHealthCheck:
            healthCheckCommand:
              - CMD-SHELL
              - curl -f http://localhost:3000/health || exit 1
            intervalSeconds: 30
            retries: 3
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        internalHealthCheck: {
          healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
          intervalSeconds: 30,
          retries: 3
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `loadBalancerHealthCheck`

- Required: no
- Type: `LoadBalancerHealthCheck`

Load balancer health check settings. Only applies when integrated with an ALB or NLB.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: web
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/index.ts
          events:
            - type: application-load-balancer
              properties:
                loadBalancerName: appLb
                priority: 1
                containerPort: 3000
          loadBalancerHealthCheck:
            healthcheckPath: /health
            healthcheckInterval: 10
      resources:
        cpu: 0.5
        memory: 1024
  appLb:
    type: application-load-balancer
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, ApplicationLoadBalancer, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const appLb = new ApplicationLoadBalancer({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'web',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/index.ts' }),
        events: [
          { type: 'application-load-balancer', properties: { loadBalancerName: 'appLb', priority: 1, containerPort: 3000 } }
        ],
        loadBalancerHealthCheck: { healthcheckPath: '/health', healthcheckInterval: 10 }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, appLb } };
});
```

## Property: `logging`

- Required: no
- Type: `ContainerWorkloadContainerLogging`

Container logging (stdout/stderr). Sent to CloudWatch, viewable with `stacktape logs`.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          logging:
            retentionDays: 14
            disabled: false
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        logging: { retentionDays: 14, disabled: false }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `stopTimeout`

- Required: no
- Type: `number`
- Default: `2`

Seconds to wait after SIGTERM before SIGKILL (2-120).

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          stopTimeout: 30
      resources:
        cpu: 0.5
        memory: 1024
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        stopTimeout: 30
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app } };
});
```

## Property: `volumeMounts`

- Required: no
- Type: `Array<ContainerEfsMount>`

Mount EFS volumes for persistent, shared storage across containers.

### Example 1 (yaml)

```yaml
resources:
  app:
    type: multi-container-workload
    properties:
      containers:
        - name: api
          packaging:
            type: stacktape-image-buildpack
            properties:
              entryfilePath: src/server.ts
          volumeMounts:
            - type: efs
              properties:
                efsFilesystemName: sharedStorage
                mountPath: /data
      resources:
        cpu: 0.5
        memory: 1024
  sharedStorage:
    type: efs-filesystem
```

### Example 2 (typescript)

```typescript
import { MultiContainerWorkload, EfsFilesystem, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const sharedStorage = new EfsFilesystem({});
  const app = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
        volumeMounts: [
          { type: 'efs', properties: { efsFilesystemName: 'sharedStorage', mountPath: '/data' } }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });
  return { resources: { app, sharedStorage } };
});
```
