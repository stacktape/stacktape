# Web Service

A Stacktape web service runs one always-on container with a public HTTPS URL. Use the `WebService` resource for APIs, backend web apps, and internet-facing container services that need TLS, health checks, horizontal scaling, and deployment behavior managed through Stacktape instead of hand-wired AWS networking.

**Pricing context:** Fargate bills for every running task; approximate us-east-1 monthly compute starts around ~$7.29/month per 0.25 vCPU plus ~$1.60/month per 512 MB memory. HTTP API Gateway load balancing is about ~$1/million requests; Application Load Balancer starts around ~$18/month plus usage.

## When to use

A Stacktape web service is the right default for a single public HTTP container that should stay online all the time. Pick a web service when the workload serves request/response traffic, needs a stable HTTPS URL, and benefits from Stacktape-managed load balancing, TLS certificates, scaling, logs, and health checks.

Common use cases:

- **Public APIs** — REST, GraphQL, JSON-RPC, or framework-based HTTP APIs running in a container
- **Backend web apps** — Express, Fastify, Django, FastAPI, Spring Boot, Go HTTP servers, or similar long-running processes
- **Containerized services with steady traffic** — workloads where keeping at least one instance warm is worth the predictable latency
- **Services needing custom domains or CDN routing** — public endpoints where Stacktape can attach domains, certificates, and optional CloudFront caching

## When NOT to use

- **Scale-to-zero request handling** — use a [Lambda function](/resources/compute/lambda-function) when the workload is event-driven, idle most of the time, or should bill only on invocation.
- **Internal-only services** — use a [private-service](/resources/compute/private-service) when the container should be reachable only from your stack or VPC.
- **Background workers** — use a [worker-service](/resources/compute/worker-service) when the container consumes queues or events without exposing a public endpoint.
- **Multiple tightly-coupled containers** — use a [multi-container-workload](/resources/compute/multi-container-workload) when you need a workload model centered on multiple containers with their own integrations.
- **Jobs that finish and exit** — use a [batch job](/resources/compute/batch-job) for compute that runs to completion instead of serving traffic continuously.

## Basic example

A basic Stacktape web service needs container packaging and compute resources. The default traffic path is `http-api-gateway`, so this example gets a public HTTPS URL without defining a separate load balancer resource.


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/server.ts'
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });

  return {
    resources: { api }
  };
});
```


`entryfilePath` points to the application entry point used by the Stacktape image buildpack. The `resources` block sets the Fargate task size for the container — `cpu: 0.5` and `memory: 1024` are explicit task-size selections, not implied defaults. Fargate is the default compute engine for web services unless you choose EC2 instance types through the resource configuration. See the [API reference](#api-reference) for the full resources configuration shape.

## Traffic

A Stacktape web service can receive public traffic through three load balancing modes: `http-api-gateway`, `application-load-balancer`, and `network-load-balancer`. The default is `http-api-gateway`, which is usually the best first choice for HTTP APIs because pricing is request-based and Stacktape can still manage the public HTTPS endpoint.

| Mode | Best for | Tradeoff |
|------|----------|----------|
| `http-api-gateway` | Most HTTP APIs and web apps | Pay-per-request pricing grows with volume; CORS support is available here |
| `application-load-balancer` | WebSockets, gradual deployments, top-level `useFirewall`, and high steady HTTP traffic | Adds a baseline monthly load balancer cost |
| `network-load-balancer` | TCP/TLS protocols such as MQTT, game servers, or custom protocols | Requires explicit `ports`; does not support CDN, top-level firewall, or gradual deployments |

Use `application-load-balancer` when the service needs WebSocket support, [gradual deployments](/deployment-and-lifecycle/gradual-deployments), or a regional [web application firewall](/resources/security/web-application-firewall) attached through top-level `useFirewall`. The ALB health check defaults are path `/`, interval `5` seconds, and timeout `4` seconds, and you can override those in `loadBalancing.properties`.


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    loadBalancing: {
      type: 'application-load-balancer',
      properties: {
        healthcheckPath: '/health',
        healthcheckInterval: 10,
        healthcheckTimeout: 5
      }
    }
  });

  return { resources: { api } };
});
```


Use `network-load-balancer` only when the service is not ordinary HTTP. Each `ports` entry defines the public listener port, the protocol (`TLS` by default, or `TCP`), and optionally a different `containerPort` when the container listens on another port.


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const broker = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/broker.ts' }),
    resources: { cpu: 1, memory: 2048 },
    loadBalancing: {
      type: 'network-load-balancer',
      properties: {
        healthCheckProtocol: 'TCP',
        ports: [
          {
            port: 8883,
            protocol: 'TLS',
            containerPort: 1883
          }
        ]
      }
    }
  });

  return { resources: { broker } };
});
```


`healthCheckProtocol: 'TCP'` checks whether the port accepts connections; choose `HTTP` only when the container exposes a health path. `port` is the public Network Load Balancer listener, while `containerPort` is the port inside the container that receives traffic.

## Domains and CORS

<span id="custom-domain-names" />

A Stacktape web service can attach custom domains directly through `customDomains`. Stacktape can auto-create DNS records and provision a free TLS certificate. The domain must first be added as a Route53 hosted zone in your AWS account, with the registrar's nameservers pointing to that hosted zone. Set `disableDnsRecordCreation` when DNS records are managed outside Stacktape.


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    customDomains: [
      {
        domainName: 'api.example.com'
      }
    ]
  });

  return { resources: { api } };
});
```


This minimal form assumes Stacktape creates both the DNS record and TLS certificate automatically. Set `disableDnsRecordCreation: true` when you manage DNS records outside Stacktape. Use `customCertificateArn` when you want Stacktape to use an ACM certificate you already manage, such as one with specific certificate requirements. `cors` is available only with the default `http-api-gateway` load balancing mode and overrides CORS headers returned by your application, so prefer application-level CORS when the app needs route-specific behavior.

## CDN

The `cdn` property on a Stacktape web service places a CloudFront CDN in front of the public endpoint for caching and lower latency worldwide. Enable CDN when globally accessed APIs have cacheable responses or when edge routing reduces latency; skip CDN for highly dynamic APIs where every request must reach the container and cache invalidation would add operational work.

The `cdn` path is separate from top-level load balancer configuration. A top-level `useFirewall` attaches a regional firewall to an Application Load Balancer and requires `loadBalancing.type: 'application-load-balancer'`; `cdn.useFirewall` protects the CloudFront distribution and uses a `web-app-firewall` resource with CDN scope.

For most API services, start without `cdn` and add it after measuring latency or origin load. CDN behavior, caching, and CloudFront-specific routing are covered in the [CDN resource](/resources/networking/cdn); the web service page only needs to decide whether the public container endpoint should be fronted by that layer.

## Compute resources

A Stacktape web service uses the same container compute model as other Stacktape container workloads. Fargate is the default serverless compute engine: set `cpu` and `memory`, pay while tasks are running, and avoid managing EC2 instances. EC2 mode is available by specifying `instanceTypes` when you need instance-level control.

Fargate is right for most web services because it keeps operations simple and bills by allocated vCPU and memory while the container is running. AWS Fargate ARM (Graviton) tasks are approximately 20% cheaper than x86 in us-east-1.


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
    resources: {
      cpu: 1,
      memory: 2048
    }
  });

  return { resources: { api } };
});
```


Use EC2 mode for workloads that need specific instance families, GPU-capable instances, or cost optimization at high sustained utilization. EC2 mode gives more control over instance selection and capacity management.


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
    resources: {
      instanceTypes: ['c6g.large']
    }
  });

  return { resources: { api } };
});
```


`instanceTypes` selects EC2-based compute instead of Fargate. `c6g.large` is an example ARM (Graviton) instance type; choose instance families that match your container image architecture and workload profile. You can specify multiple instance types for capacity flexibility.

## Scaling

A Stacktape web service scales horizontally by running more container instances and distributing traffic across healthy instances. The `scaling` property uses the `ContainerWorkloadScaling` configuration shared by all Stacktape container workloads. Use scaling when request volume changes enough that one fixed instance count is either too expensive during quiet periods or too small during peaks.


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    scaling: {
      minInstances: 2,
      maxInstances: 10,
      scalingPolicy: {
        keepAvgCpuUtilizationUnder: 70,
        keepAvgMemoryUtilizationUnder: 80
      }
    }
  });

  return { resources: { api } };
});
```


`minInstances` is the baseline number of running containers and therefore the baseline cost. `maxInstances` caps scale-out. CPU and memory scaling policies tell Stacktape when to add capacity; keeping both thresholds explicit is useful for web services where either CPU-bound request handling or memory pressure can be the first bottleneck.


> **Warning:** Fargate web services do not scale to zero. Keep `minInstances` low for non-production stages, and use a Lambda function when idle cost matters more than always-warm container latency.


## Packaging

A Stacktape web service supports the container packaging modes used by Stacktape container workloads: Stacktape image buildpack, custom Dockerfile, prebuilt image, Nixpacks, and external buildpack. Most teams should start with the Stacktape image buildpack and switch only when the container build needs more control.

| Mode | When to use |
|------|-------------|
| [Stacktape image buildpack](/packaging/containers/stacktape-buildpack) | Build a container image from source with minimal configuration |
| [Custom Dockerfile](/packaging/containers/custom-dockerfile) | Control the base image, system packages, build steps, entrypoint, or command |
| [Prebuilt image](/packaging/containers/prebuilt-image) | Deploy an image already built by another pipeline or stored in a registry |
| [Nixpacks](/packaging/containers/nixpacks) | Let Nixpacks detect and build the application image |
| [External buildpack](/packaging/containers/external-buildpack) | Use Cloud Native Buildpacks and a configurable builder image |

The Stacktape image buildpack supports JavaScript, TypeScript, Python, Java, and Go for container images. Use `requiresGlibcBinaries` only when native dependencies require glibc instead of the Alpine default; the source calls out packages such as `sharp`, `canvas`, `bcrypt`, and `puppeteer` as common cases.

## Connecting to other resources

A Stacktape web service can use `connectTo` to access other resources in the same stack. Stacktape grants IAM permissions where relevant, opens security group access for supported network resources, and injects environment variables with connection details following the `STP_[RESOURCE_NAME]_[PARAM]` naming pattern.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WebService,
  StacktapeImageBuildpackPackaging,
  RelationalDatabase,
  RdsEnginePostgres,
  Bucket
} from 'stacktape';

export default defineConfig(() => {
  const myDatabase = new RelationalDatabase({
    credentials: { masterUserPassword: "$Secret('db.password')" },
    engine: new RdsEnginePostgres({ version: '16', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });

  const uploadsBucket = new Bucket({});

  const api = new WebService({
    connectTo: [myDatabase, uploadsBucket],
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { myDatabase, uploadsBucket, api } };
});
```


The example uses the `RdsEnginePostgres` class to construct a Postgres database. The `stacktape` package also exports `RdsEngineMysql`, `RdsEngineMariadb`, and Aurora engine variants for other database types. For `connectTo` on this web service, Stacktape follows the `STP_[RESOURCE_NAME]_[PARAM]` naming pattern: `myDatabase` provides `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_DATABASE_HOST`, and `STP_MY_DATABASE_PORT`; `uploadsBucket` provides `STP_UPLOADS_BUCKET_NAME` and `STP_UPLOADS_BUCKET_ARN`. Use `$ResourceParam()` for parameters not in the connectTo injection table. For the full resource-by-resource list, see [connecting resources](/configuration/connecting-resources). For permissions outside `connectTo`, add narrowly scoped `iamRoleStatements`.

For user-defined runtime configuration, use the `environment` property to pass static values, [secrets](/configuration/secrets) via `$Secret()`, or [resource parameters](/configuration/directives) via `$ResourceParam()` directly into the container. Variables from `connectTo` are merged automatically alongside any `environment` entries you define.

## Health checks

A Stacktape web service has two health-check layers. When using `application-load-balancer` or `network-load-balancer` load balancing, the load balancer health check determines whether traffic should be sent to a container. Separately, `internalHealthCheck` is a container-level health check that lets ECS auto-replace a container that is still running but no longer healthy.

For Application Load Balancer mode, configure load balancer health checks under `loadBalancing.properties`. For Network Load Balancer mode, health checks can use `TCP` or `HTTP`; `healthcheckPath` only applies when `healthCheckProtocol` is `HTTP`, and the health check port defaults to the traffic port.

Use an internal health check when the process can be alive while the application is broken, such as a server with a failed database pool or stuck event loop. If a container fails the internal health check, ECS treats the container as unhealthy and replaces it. Keep the health check command cheap and local to the container; checks that depend on slow external services can cause unnecessary replacement during transient dependency issues. See the [API reference](#api-reference) for the full `internalHealthCheck` configuration shape.

## Side containers

A Stacktape web service can run helper containers alongside the main container through `sideContainers`. Each side container has a `containerType` of either `run-on-init` or `always-running`. Use `run-on-init` for setup work such as database migrations — the helper must exit with code 0 before the main container starts. Use `always-running` for agents or companion processes that run for the entire task lifecycle; they can reach the main container via `localhost`, and if they crash, the whole task fails.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WebService,
  StacktapeImageBuildpackPackaging,
  CustomDockerfilePackaging
} from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    sideContainers: [
      {
        name: 'migrations',
        containerType: 'run-on-init',
        packaging: new CustomDockerfilePackaging({
          buildContextPath: './migrations',
          dockerfilePath: './Dockerfile'
        })
      }
    ]
  });

  return { resources: { api } };
});
```


The example above shows a `run-on-init` side container for migrations. For an `always-running` side container such as a log forwarder or monitoring agent, set `containerType: 'always-running'` instead — the container runs for the entire task lifetime and shares the network namespace (`localhost`) with the main container. Choose `run-on-init` when the helper is a one-time setup step; choose `always-running` when the helper must stay up alongside the main process.

Use the built-in web service side-container model when one main public container owns the endpoint and helpers are secondary. Use a [multi-container-workload](/resources/compute/multi-container-workload) instead when you need a workload model centered on multiple containers with their own integrations and lifecycle configuration.

## EFS storage

A Stacktape web service can mount an [EFS filesystem](/resources/storage/efs-filesystem) when data must survive container replacement. EFS is useful for shared uploads, generated files, or model artifacts that are too large or slow to fetch repeatedly; skip EFS when data can live in S3, a database, memory, or the container filesystem.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WebService,
  EfsFilesystem,
  StacktapeImageBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const uploads = new EfsFilesystem({});

  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    volumeMounts: [
      {
        type: 'efs',
        properties: {
          efsFilesystemName: 'uploads',
          mountPath: '/data/uploads',
          rootDirectory: '/uploads'
        }
      }
    ]
  });

  return { resources: { uploads, api } };
});
```


`mountPath` is the absolute path where the EFS volume appears inside the container. `rootDirectory` limits the mounted view to a subdirectory of the filesystem. EFS adds network storage cost and latency, so prefer object storage for files that do not need a mounted filesystem interface.

## Gradual deployments

A Stacktape web service can shift traffic gradually during deployment with the `deployment` property, but only when `loadBalancing.type` is `application-load-balancer`. Use gradual deployments for production services where a bad release should reach only a small portion of traffic before full rollout; skip them for low-risk stages where faster deployment matters more.

The deployment configuration supports canary, linear, or all-at-once gradual traffic shifting strategies. Configure a strategy through the `deployment` property to control how traffic shifts between the old and new version during a deploy. See [gradual deployments](/deployment-and-lifecycle/gradual-deployments) for the full list of strategies and their behavior.


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    loadBalancing: { type: 'application-load-balancer' },
    deployment: { strategy: 'Linear10PercentEvery3Minutes' }
  });

  return { resources: { api } };
});
```


The `deployment` property enables gradual traffic shifting when `loadBalancing.type` is `application-load-balancer`. Configure specific strategy fields (canary, linear, or all-at-once) as documented in [gradual deployments](/deployment-and-lifecycle/gradual-deployments).

## Private subnets

A Stacktape web service runs in the default networking mode unless you set `usePrivateSubnetsWithNAT: true`. Private subnets with NAT remove the container's public IP and route outbound traffic through NAT Gateways, which is useful when external APIs require fixed allowlisted IP addresses.


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    usePrivateSubnetsWithNAT: true
  });

  return {
    resources: { api },
    stackConfig: {
      vpc: {
        nat: { availabilityZones: 2 }
      }
    }
  };
});
```


`stackConfig.vpc.nat.availabilityZones` controls whether one, two, or three availability zones get NAT Gateways; the default is `2`. NAT Gateways add approximately ~$32/month each plus data processing fees, so keep the default networking mode unless static outbound IPs or private subnet placement are real requirements.

## Logging

Container output (`stdout` and `stderr`) is automatically sent to CloudWatch Logs and retained for 90 days by default. The `logging` property controls the logging configuration. Use [log forwarding](/observability/log-forwarding) when logs need to reach external observability tools.

Logs are a core operating path for always-on containers. Keep application logs structured enough to debug request failures, startup errors, and health-check failures, then view them through the Stacktape Console or the [`stacktape logs`](/cli/logs) CLI command.

## Remote sessions

A Stacktape web service can enable interactive container access by setting `enableRemoteSessions` to `true` (defaults to `false`). Remote sessions provide interactive shell access through the [`stacktape container:session`](/cli/container-session) CLI command. Enabling this feature adds a small SSM agent that uses minimal CPU and memory.


Example (TypeScript):

```typescript
import { defineConfig, WebService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    enableRemoteSessions: true
  });

  return { resources: { api } };
});
```


Keep remote sessions disabled by default for routine services and enable them deliberately when production debugging requires shell access. Prefer logs, metrics, and repeatable diagnostic scripts first; an interactive session is strongest for inspecting a live process, filesystem state, or network reachability that cannot be reproduced locally.

## FAQ

### Does a Stacktape web service scale to zero?

No. A Stacktape web service is always-on container compute, and Fargate bills while tasks are running, so `minInstances` is your baseline cost even during idle periods. Use a [Lambda function](/resources/compute/lambda-function) when scale-to-zero billing is more important than keeping a container warm.

### Which load balancing mode should I choose?

Use the default `http-api-gateway` mode for most HTTP APIs and web apps. Choose `application-load-balancer` for WebSockets, gradual deployments, top-level `useFirewall`, or high steady request volume. Choose `network-load-balancer` only for TCP/TLS protocols that are not ordinary HTTP; see [Application Load Balancer](/resources/networking/application-load-balancer) and [Network Load Balancer](/resources/networking/network-load-balancer).

### Why isn't my custom domain working?

The most common cause is missing DNS setup: `customDomains` only auto-creates the DNS record and TLS certificate when the domain is already a Route53 hosted zone in your AWS account, with the registrar's nameservers pointing at that zone. If you manage DNS elsewhere, set `disableDnsRecordCreation: true` and point the record yourself, or supply your own ACM certificate via `customCertificateArn`. See [custom domains](/resources/networking/custom-domains).

### Why are my `cors` settings being ignored?

The `cors` property only takes effect with the default `http-api-gateway` load balancing mode; it does nothing under `application-load-balancer` or `network-load-balancer`. It also overrides CORS headers your application returns, so for route-specific behavior prefer handling CORS in your application code instead.

### How much does an ECS Fargate web service cost?

Fargate bills by allocated vCPU and memory for each running task, so idle web service instances still cost money. The provided Stacktape pricing source lists approximate us-east-1 monthly components starting around ~$7.29 per 0.25 vCPU plus ~$1.60 per 512 MB memory, with ARM tasks about 20% cheaper. For cost monitoring, see [Managing Costs](/managing-costs/overview).

### Web service vs Lambda function: which should I use?

Use a web service when your application is already a long-running container, needs stable always-on latency, uses protocols or libraries better suited to servers, or needs container-level control. Use a [Lambda function](/resources/compute/lambda-function) for event-driven work, sporadic traffic, or workloads where scale-to-zero billing is the main goal. If the container should not be reachable from the internet at all, use a [private-service](/resources/compute/private-service) instead.

### How do I run database migrations for a web service?

Use a `sideContainers` entry with `containerType: 'run-on-init'` when the migration must complete before the main container starts. For more complex multi-container lifecycle and traffic routing, use a [multi-container-workload](/resources/compute/multi-container-workload). For broader deployment automation, see [deployment scripts and hooks](/deployment-and-lifecycle/deployment-scripts-and-hooks).

### Can I protect a web service with AWS WAF?

Yes, but the attachment path matters. Top-level `useFirewall` attaches a regional firewall directly to the web service's Application Load Balancer and requires `loadBalancing.type: 'application-load-balancer'`; CDN protection is configured separately through `cdn.useFirewall` with a CDN-scoped firewall. See [web application firewall](/resources/security/web-application-firewall).

## API Reference


## API Reference: `WebServiceProps`
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

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `packaging` | yes | `stacktape-image-buildpack \| external-buildpack \| prebuilt-image \| custom-dockerfile \| nixpacks` | Configures the container image for the service. | - |
| `resources` | yes | `ContainerWorkloadResourcesConfig` | CPU, memory, and compute engine for the container. Two compute engines:

**Fargate** (default): Serverless — just specify `cpu` and `memory`.
**EC2**: Specify `instanceTypes` for more control and potentially lower cost. | - |
| `alarms` | no | `Array<ApplicationLoadBalancerAlarm \| HttpApiGatewayAlarm>` | Alarms for this service (merged with global alarms from the Stacktape Console). | - |
| `cdn` | no | `CdnConfiguration` | Put a CDN (CloudFront) in front of this service for caching and lower latency worldwide. | - |
| `connectTo` | no | `Array<string>` | Give this resource access to other resources in your stack. List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc. | - |
| `cors` | no | `HttpApiCorsConfig` | CORS settings. Overrides any CORS headers from your application. Only works with `http-api-gateway` load balancing (the default). | - |
| `customDomains` | no | `Array<DomainConfiguration>` | Custom domains (e.g., `api.example.com`). Stacktape auto-creates DNS records and TLS certificates. Your domain must be added as a Route53 hosted zone in your AWS account first. | - |
| `deployment` | no | `ContainerWorkloadDeploymentConfig` | Gradual traffic shifting for safe deployments (canary, linear, or all-at-once). Requires `loadBalancing` type `application-load-balancer`. | - |
| `disabledGlobalAlarms` | no | `Array<string>` | Global alarm names to exclude from this service. | - |
| `enableRemoteSessions` | no | `boolean` | Allow SSH-like access to running containers for debugging. Enables `stacktape container:session` to open an interactive shell inside the container.
Adds a small SSM agent that uses minimal CPU/memory. | `false` |
| `environment` | no | `Array<EnvironmentVar>` | Environment variables injected into the container at runtime. Use for configuration like API keys, feature flags, or secrets.
Variables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically. | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Raw IAM policy statements for permissions not covered by `connectTo`. Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock). | - |
| `internalHealthCheck` | no | `ContainerHealthCheck` | Health check that auto-replaces unhealthy containers. If a container fails the health check, it&#39;s terminated and replaced automatically. | - |
| `loadBalancing` | no | `http-api-gateway \| application-load-balancer \| network-load-balancer` | How traffic reaches your containers. Affects pricing, features, and protocol support. **`http-api-gateway`** (default): Pay-per-request (~$1/million requests). Best for most apps.
Cheapest at low traffic, but costs grow with volume.

**`application-load-balancer`**: Flat ~$18/month + usage. Required for gradual deployments
(`deployment`), top-level firewalls (`useFirewall`), and WebSocket support.
More cost-effective above ~500k requests/day. AWS Free Tier eligible.

**`network-load-balancer`**: For non-HTTP traffic (TCP/TLS) like MQTT, game servers, or custom protocols.
Requires explicit `ports` configuration. Does not support CDN, top-level firewall, or gradual deployments. | - |
| `logging` | no | `ContainerWorkloadContainerLogging` | Logging configuration. Container output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.
View logs with `stacktape logs` or in the Stacktape Console. | - |
| `scaling` | no | `ContainerWorkloadScaling` | Auto-scaling: add/remove container instances based on demand. Traffic is automatically distributed across all running containers. | - |
| `sideContainers` | no | `Array<ServiceHelperContainer>` | Helper containers that run alongside the main container. **`run-on-init`**: Runs to completion before the main container starts (e.g., database migrations).
**`always-running`**: Runs for the entire lifecycle (e.g., log forwarders, monitoring agents).
Can reach the main container via `localhost`. | - |
| `stopTimeout` | no | `number` | Seconds to wait for graceful shutdown before force-killing the container. The container receives `SIGTERM` first, then `SIGKILL` after this timeout. Must be 2-120. | `2` |
| `useFirewall` | no | `string` | Name of a `web-app-firewall` resource to protect this service from common web exploits. Attaches a regional firewall directly to the service&#39;s application load balancer.
Requires `loadBalancing` type `application-load-balancer`.

To protect a CDN-enabled service at CloudFront instead, use `cdn.useFirewall`
with a `web-app-firewall` resource whose `scope` is `cdn`. | - |
| `usePrivateSubnetsWithNAT` | no | `boolean` | Deploy in private subnets with a static outbound IP via NAT Gateway. The container won&#39;t have a public IP. All outbound traffic routes through a NAT Gateway,
giving you a static IP you can whitelist in external services (APIs, payment gateways, etc.).

Configure the number of NAT Gateways in `stackConfig.vpc.nat`.

**Adds cost:** NAT Gateway ~$32/month + data processing fees. | `false` |
| `volumeMounts` | no | `Array<ContainerEfsMount>` | Persistent EFS volumes shared across containers and restarts. Data stored in EFS volumes persists even when containers are replaced.
Multiple containers can mount the same volume. All data is encrypted in transit. | - |


## Referenceable parameters


## Referenceable Parameters: `web-service`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domain` | Web service default domain name | `$ResourceParam("<<resource-name>>", "domain")` |
| `url` | Web service default URL | `$ResourceParam("<<resource-name>>", "url")` |
| `customDomains` | Comma-separated list of custom domain names assigned to the Web Service (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomains")` |
| `customDomainUrls` | Comma-separated list of custom domain name URLs (only available if you use [custom domain names](#custom-domain-names)) | `$ResourceParam("<<resource-name>>", "customDomainUrls")` |
| `cdnDomain` | Default domain of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnDomain")` |
| `cdnUrl` | Default url of the [CDN distribution](#cdn) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnUrl")` |
| `cdnCustomDomains` | Comma-separated list of custom domain names assigned to the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomains")` |
| `cdnCustomDomainUrls` | Comma-separated list of custom domain name URLs of the [CDN](#cdn)
(only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomainUrls")` |
