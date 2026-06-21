# Private Service

A Stacktape private service runs always-on containers with no public endpoint, reachable only from other resources in your stack or VPC. Use it for internal microservices, gRPC backends, or any service that should never be exposed to the internet. Stacktape handles service discovery, health checks, and horizontal scaling.

**Pricing context:** A minimal Fargate task (0.25 vCPU, 512 MB) costs approximately **~$9/month** for compute. The default `service-connect` networking adds approximately **~$0.50/month**. Switching to an Application Load Balancer adds approximately **~$18/month** in base fees.

## When to use

A Stacktape private service is the right choice when your stack has internal components that other workloads call but that should never be reachable from the public internet:

- **Internal microservices** — payment processors, auth validators, or email senders called only by your own services
- **gRPC backends** — low-latency RPC services consumed by other containers in the same stack
- **Data pipelines** — aggregation or transformation services invoked by other workloads
- **Background APIs** — services triggered by other stack resources, not by end users

## When NOT to use

- **Public-facing APIs** — use a [web service](/resources/compute/web-service) for containers that need a public HTTPS endpoint
- **Background workers without inbound calls** — use a [worker service](/resources/compute/worker-service) (no load balancing overhead)
- **Sporadic or event-driven workloads** — use a [Lambda function](/resources/compute/lambda-function) for pay-per-request pricing and scale-to-zero behavior
- **One-off or batch workloads** — use a [batch job](/resources/compute/batch-job) for tasks that run to completion and stop

## Basic example

This example deploys an internal API using the [Stacktape image buildpack](/packaging/containers/stacktape-buildpack), which builds a container image from your source code automatically. The service listens on port `3000` by default (injected as the `PORT` environment variable). Other resources that need to call this service add it to their `connectTo` array — see [Connecting to other resources](#connecting-to-other-resources) for a complete wiring example.


Example (TypeScript):

```typescript
import { defineConfig, PrivateService, StacktapeImageBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const internalApi = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/internal-api.ts'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  return {
    resources: { internalApi }
  };
});
```


## Compute resources

Every private service task runs with a fixed CPU and memory allocation. Stacktape supports two compute engines: Fargate (default) and EC2.

### Fargate

**Fargate** is the default — serverless containers where you specify `cpu` and `memory` and AWS manages the underlying instances. AWS Fargate supports `cpu` values from `0.25` to `16` vCPU, with memory ranges that depend on the CPU tier (see the [API reference](#api-reference) for allowed combinations). Set `architecture` to `arm64` to use AWS Graviton processors at ~20% lower cost than the default `x86_64`. The `architecture` option applies only to Fargate — it has no effect when `instanceTypes` is set.


Example (TypeScript):

```typescript
import { defineConfig, PrivateService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const internalApi = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/internal-api.ts'
    }),
    resources: {
      cpu: 1,
      memory: 2048,
      architecture: 'arm64'
    }
  });

  return { resources: { internalApi } };
});
```


Fargate bills per vCPU-hour and per GB-hour of memory. As a rough reference, compute costs approximately ~$7.29/month per 0.25 vCPU and ~$1.60/month per 512 MB of memory in us-east-1. A minimal task at 0.25 vCPU + 512 MB runs at approximately ~$9/month. ARM (Graviton) tasks are ~20% less.


> **Info:** Fargate bills for every running task — it cannot scale to zero. You pay for the full `minInstances` floor at all times.


### EC2

**EC2** gives you more control over instance type and can lower cost at sustained scale. Specify `instanceTypes` (e.g., `t3.medium` for a general-purpose burstable instance, or `c6g.large` for a compute-optimized Graviton instance) instead of `cpu`/`memory`. For most internal services, Fargate is the simpler and recommended starting point. Switch to EC2 only when you have concrete cost or capability requirements that Fargate can't meet.


Example (TypeScript):

```typescript
import { defineConfig, PrivateService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const internalApi = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/internal-api.ts'
    }),
    resources: {
      instanceTypes: ['t3.medium']
    }
  });

  return { resources: { internalApi } };
});
```


## Scaling

Stacktape private service scaling adds or removes container instances horizontally based on CPU and memory utilization. Traffic is automatically distributed across all running instances.


Example (TypeScript):

```typescript
import { defineConfig, PrivateService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const internalApi = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/internal-api.ts'
    }),
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

  return { resources: { internalApi } };
});
```


`minInstances` sets the always-running floor — because Fargate cannot scale to zero, you pay for at least this many tasks at all times. `maxInstances` caps burst capacity. `keepAvgCpuUtilizationUnder` and `keepAvgMemoryUtilizationUnder` set the average utilization percentage targets that trigger scale-out events — 70% CPU and 80% memory are common starting thresholds that leave headroom for traffic spikes. Adjust these based on your service's actual utilization patterns.


> **Warning:** Setting `minInstances` and `maxInstances` to the same value disables auto-scaling. You pay for all running instances even during low traffic.


## Load balancing

Private service load balancing controls how other resources in your stack reach the service. Two modes are available — `service-connect` (default) and `application-load-balancer` — with different cost and reachability tradeoffs.


## Feature Comparison

| Feature | Service Connect | Application Load Balancer |
| --- | --- | --- |
| Monthly cost | ~$0.50/month | ~$18/month base + usage |
| Default | yes | no |
| Reachable from container workloads | yes | yes |
| Reachable from any VPC resource | no | yes |
| Direct container-to-container | yes | no |


**Service Connect (default)** is the right choice for most teams. At ~$0.50/month it provides direct container-to-container connectivity with built-in load balancing and service discovery. Only container-based workloads in the same stack — web services, private services, worker services, and multi-container workloads — can reach the service.

**Application Load Balancer** is needed when non-container VPC resources must also reach the private service — for example, a Lambda function running inside the VPC, a [bastion host](/resources/security/bastion-host), or EC2 instances. It adds a ~$18/month base fee plus usage charges. For most internal service-to-service calls between containers, paying that base fee is unnecessary.

### Using Service Connect


Example (TypeScript):

```typescript
import { defineConfig, PrivateService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const internalApi = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/internal-api.ts'
    }),
    resources: { cpu: 0.25, memory: 512 },
    loadBalancing: {
      type: 'service-connect'
    }
  });

  return { resources: { internalApi } };
});
```


With Service Connect, other containers in the stack can reach this service via built-in service discovery. Use `connectTo` on the calling resource to have Stacktape inject the service address as an environment variable — this is the recommended approach rather than hard-coding addresses or hostnames.

### Using an Application Load Balancer


Example (TypeScript):

```typescript
import { defineConfig, PrivateService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const internalApi = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/internal-api.ts'
    }),
    resources: { cpu: 0.5, memory: 1024 },
    loadBalancing: {
      type: 'application-load-balancer'
    }
  });

  return { resources: { internalApi } };
});
```


With an ALB, the private service gets a stable internal DNS hostname reachable from any resource in the same VPC. Any workload or script that `connectTo`s this service receives the `ADDRESS` parameter injected as `STP_[RESOURCE_NAME]_ADDRESS`. See [connecting resources](/configuration/connecting-resources) for the full list of resource types that support `connectTo`.

## Packaging

Stacktape supports five container packaging modes. Choose the one that fits your workflow. For detailed configuration, see the [packaging overview](/packaging/overview).

| Mode | When to use |
|------|-------------|
| [Stacktape image buildpack](/packaging/containers/stacktape-buildpack) | Zero-config, works with JS/TS, Python, Java, Go, PHP, Ruby, and .NET |
| [Custom Dockerfile](/packaging/containers/custom-dockerfile) | Full control over the container environment |
| [Prebuilt image](/packaging/containers/prebuilt-image) | Use an existing image from Docker Hub or a private registry |
| [Nixpacks](/packaging/containers/nixpacks) | Auto-detects language and builds an optimized image |
| [External buildpack](/packaging/containers/external-buildpack) | Use Cloud Native Buildpacks (buildpacks.io) |

### Using a custom Dockerfile


Example (TypeScript):

```typescript
import { defineConfig, PrivateService, CustomDockerfilePackaging } from 'stacktape';

export default defineConfig(() => {
  const internalApi = new PrivateService({
    packaging: new CustomDockerfilePackaging({
      buildContextPath: '.',
      dockerfilePath: './Dockerfile'
    }),
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { internalApi } };
});
```


The `dockerfilePath` is relative to `buildContextPath`. Set it when the Dockerfile is not at the root of the build context directory.

## Connecting to other resources

Use `connectTo` to give your private service access to other resources in your stack. Stacktape automatically grants IAM permissions, opens network access (security groups for databases and Redis), and injects environment variables with connection details. For the full list of injected variables per resource type, see [connecting resources](/configuration/connecting-resources).

The following example shows a complete wiring pattern: the private service connects to a bucket, and a public-facing [web service](/resources/compute/web-service) connects to the private service.


Example (TypeScript):

```typescript
import {
  defineConfig,
  PrivateService,
  WebService,
  StacktapeImageBuildpackPackaging,
  Bucket
} from 'stacktape';
export default defineConfig(() => {
  const dataBucket = new Bucket({});

  const internalApi = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/internal-api.ts'
    }),
    resources: { cpu: 0.25, memory: 512 },
    connectTo: ['dataBucket']
  });

  const publicApi = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/public-api.ts'
    }),
    resources: { cpu: 0.25, memory: 512 },
    connectTo: ['internalApi']
  });

  return { resources: { dataBucket, internalApi, publicApi } };
});
```


In this example, `internalApi` receives `STP_DATA_BUCKET_NAME` and `STP_DATA_BUCKET_ARN` as environment variables from connecting to `dataBucket`. The `publicApi` web service receives `STP_INTERNAL_API_ADDRESS` from connecting to `internalApi`, which it can use as the base URL for HTTP or gRPC calls. For permissions not covered by `connectTo` (e.g., accessing AWS Bedrock), add raw IAM statements via `iamRoleStatements`.

## Health checks

A Stacktape private service supports an internal container health check configured via `internalHealthCheck`. ECS runs a command inside the container on a regular interval and replaces the container if it fails repeatedly — catching cases where the process is alive but not functioning correctly.


Example (TypeScript):

```typescript
import { defineConfig, PrivateService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const internalApi = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/internal-api.ts'
    }),
    resources: { cpu: 0.25, memory: 512 },
    internalHealthCheck: {
      healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
      intervalSeconds: 30,
      timeoutSeconds: 5,
      retries: 3,
      startPeriodSeconds: 60
    }
  });

  return { resources: { internalApi } };
});
```


`intervalSeconds` controls how often the check runs (30 seconds here), `timeoutSeconds` is how long to wait for a response before marking the check as failed, and `retries` is the number of consecutive failures before ECS replaces the container. `startPeriodSeconds` gives the container a grace period before health check failures start counting against the retry limit — set it long enough for your service's initialization (60 seconds in this example). See the [API reference](#api-reference) for the full set of supported properties and their defaults.

When `loadBalancing.type` is `application-load-balancer`, the ALB also performs its own HTTP health checks against the container targets — separate from the ECS-level `internalHealthCheck` above. ALB health check path, interval, and timeout can be customized via [overrides](/configuration/overrides-and-escape-hatches) on the target group's CloudFormation resource.

## Side containers

A Stacktape private service can include side containers that run alongside the main container within the same ECS task. Two modes are available, each with distinct lifecycle behavior.

### Using run-on-init sidecars

A `run-on-init` sidecar runs to completion before the main container starts. Use this for database migrations, cache warming, or any setup that must succeed before your service handles traffic. The container must exit with code 0; a non-zero exit aborts the entire task.


Example (TypeScript):

```typescript
import { defineConfig, PrivateService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const internalApi = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/internal-api.ts'
    }),
    resources: { cpu: 0.5, memory: 1024 },
    sideContainers: [
      {
        name: 'migrate',
        containerType: 'run-on-init',
        packaging: new StacktapeImageBuildpackPackaging({
          entryfilePath: './src/migrate.ts'
        })
      }
    ]
  });

  return { resources: { internalApi } };
});
```


### Using always-running sidecars

An `always-running` sidecar runs for the entire lifetime of the task alongside the main container. Use this for log forwarders, monitoring agents, or sidecar proxies. The sidecar can communicate with the main container via `localhost`. The example below uses the OpenTelemetry Collector (`otel/opentelemetry-collector`) as a prebuilt image — a common choice for forwarding traces and metrics from your service to observability backends.


> **Warning:** If an always-running sidecar crashes, ECS terminates the entire task — including the main container. Ensure always-running sidecars are stable; use a resilient base image or process supervisor for anything that could exit unexpectedly.


Example (TypeScript):

```typescript
import {
  defineConfig,
  PrivateService,
  StacktapeImageBuildpackPackaging,
  PrebuiltImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const internalApi = new PrivateService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/internal-api.ts'
    }),
    resources: { cpu: 0.5, memory: 1024 },
    sideContainers: [
      {
        name: 'otel-collector',
        containerType: 'always-running',
        packaging: new PrebuiltImagePackaging({
          image: 'otel/opentelemetry-collector:latest'
        })
      }
    ]
  });

  return { resources: { internalApi } };
});
```


## Private subnets

By default, private service containers run in public subnets with direct internet access for outbound calls. Set `usePrivateSubnetsWithNAT: true` to deploy in private subnets where all outbound traffic routes through a NAT Gateway. This gives you a static outbound IP that external services can whitelist.


> **Warning:** NAT Gateways add approximately ~$32/month per availability zone plus data processing fees. Configure the number of NAT Gateways (1–3 AZs) in `stackConfig.vpc.nat`.


Leave `usePrivateSubnetsWithNAT` unset for ordinary services that only need outbound internet access. Enable it when an external API, partner, or compliance rule requires a fixed egress IP for whitelisting.

## Logging

Container output (`stdout`/`stderr`) is automatically sent to CloudWatch Logs and retained for 90 days by default. View logs with [`stacktape debug:logs`](/cli/debug-logs) or in the [Stacktape Console](/stacktape-console/console-overview). You can also set up [log forwarding](/observability/log-forwarding) to external services like Datadog.

Set the top-level `protocol` property on the private service (not nested inside `logging`) to `http`, `http2`, or `grpc` to enable protocol-specific CloudWatch metrics — for example, HTTP 5xx error rate tracking for HTTP services.

## Remote sessions

Set `enableRemoteSessions: true` to allow interactive shell access to running containers via [`stacktape container:session`](/cli/container-session). This adds a small SSM agent sidecar that uses minimal CPU and memory. Useful for debugging production issues without needing a public endpoint, but disabled by default to minimize attack surface.

## FAQ

### How do I connect to a private service from a web service?

Add the private service name to the web service's `connectTo` array. Stacktape injects the service's `ADDRESS` parameter as `STP_[RESOURCE_NAME]_ADDRESS` and automatically opens network access. Use that environment variable as the base URL for HTTP or gRPC calls. No manual DNS configuration is needed. See [connecting resources](/configuration/connecting-resources).

### When should I use `application-load-balancer` vs `service-connect`?

Use `service-connect` (the default, ~$0.50/month) when only container-based workloads in the same stack need to reach the service. Switch to `application-load-balancer` (~$18/month base fee) when non-container VPC resources also need access — such as a Lambda function running inside the VPC, a [bastion host](/resources/security/bastion-host), or EC2 instances. The cost difference makes `service-connect` the right default for most teams.

### Does a private service scale to zero?

No. Like all Fargate-based Stacktape workloads, a private service requires at least one running task. Fargate cannot scale to zero — you pay for compute at all times. If the service is called infrequently, a [Lambda function](/resources/compute/lambda-function) scales to zero and charges only on invocation.

### How much does a private service cost to run?

The main costs are Fargate compute and networking. Compute runs approximately ~$7.29/month per 0.25 vCPU and ~$1.60/month per 512 MB of memory (us-east-1 list prices). A minimal 0.25 vCPU / 512 MB task costs ~$9/month total. The default `service-connect` networking adds ~$0.50/month. Switching to an Application Load Balancer adds ~$18/month in base fees. ARM (Graviton) tasks cut Fargate compute costs by ~20%.

### Can I run a gRPC server as a private service?

Yes. Set `port` to your gRPC server's listening port (e.g., `50051`) and set `protocol: 'grpc'` to enable protocol-specific CloudWatch metrics. Other containers in the stack connect using `connectTo` to receive the injected `ADDRESS` environment variable. The Stacktape image buildpack supports Node.js, Python, Java, Go, PHP, Ruby, and .NET.

### How fast does a Fargate private service cold-start?

AWS Fargate cold-start — the time from a scaling event to a task becoming healthy — is primarily determined by container image size and ECR pull time. To minimize cold-start impact, keep `minInstances` at 1 or higher so a warm instance is always available. New instances launched during scale-out incur the same startup time, so set auto-scaling thresholds conservatively for latency-sensitive internal services.

### Private service vs worker service — which should I use?

Use a **private service** when other parts of your stack need to actively call it over HTTP, gRPC, or TCP — it accepts and routes inbound connections. Use a [worker service](/resources/compute/worker-service) when the workload only consumes messages from a queue, stream, or event source and never needs to respond to inbound requests. Worker services have no load balancing cost at all.

### Private service vs Lambda function for internal APIs — which is cheaper?

It depends on call volume. A Lambda function charges only when invoked and scales to zero — typically cheaper for infrequent calls. A private service charges for Fargate compute 24/7 regardless of traffic. For high-throughput, consistent internal traffic, the flat Fargate cost beats per-invocation Lambda pricing. The break-even point varies by request duration, but sustained high-frequency services (thousands of requests per minute continuously) generally favor a private service.

### How do I run database migrations before the main container starts?

Use a `sideContainers` entry with `containerType: 'run-on-init'`. The init container runs to completion (exit code 0) before the main container starts, making it safe to run schema migrations, seed scripts, or cache warming without the main application processing requests simultaneously.

### Can I expose a private service to the public internet later?

Not directly — there is no property on a private service that adds a public endpoint. To give a service a public URL, use a [web service](/resources/compute/web-service) instead, which is the same container model with public load balancing added. If you are unsure whether a service will eventually need a public endpoint, start with a web service and restrict access at the application layer.

## API Reference


## API Reference: `PrivateServiceProps`
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

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `packaging` | yes | `stacktape-image-buildpack \| external-buildpack \| prebuilt-image \| custom-dockerfile \| nixpacks` | Configures the container image for the service. | - |
| `resources` | yes | `ContainerWorkloadResourcesConfig` | CPU, memory, and compute engine for the container. Two compute engines:

**Fargate** (default): Serverless — just specify `cpu` and `memory`.
**EC2**: Specify `instanceTypes` for more control and potentially lower cost. | - |
| `connectTo` | no | `Array<string>` | Give this resource access to other resources in your stack. List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc. | - |
| `enableRemoteSessions` | no | `boolean` | Allow SSH-like access to running containers for debugging. Enables `stacktape container:session` to open an interactive shell inside the container.
Adds a small SSM agent that uses minimal CPU/memory. | `false` |
| `environment` | no | `Array<EnvironmentVar>` | Environment variables injected into the container at runtime. Use for configuration like API keys, feature flags, or secrets.
Variables from `connectTo` (e.g., `STP_MY_DATABASE_CONNECTION_STRING`) are added automatically. | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Raw IAM policy statements for permissions not covered by `connectTo`. Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock). | - |
| `internalHealthCheck` | no | `ContainerHealthCheck` | Health check that auto-replaces unhealthy containers. If a container fails the health check, it&#39;s terminated and replaced automatically. | - |
| `loadBalancing` | no | `PrivateServiceLoadBalancing` | How traffic reaches this service from other resources. **`service-connect`** (default, ~$0.50/mo): Direct container-to-container. Cheapest option.
Only reachable from other container-based resources in the stack.
**`application-load-balancer`** (~$18/mo): HTTP load balancer. Reachable from any VPC resource. | `service-connect` |
| `logging` | no | `ContainerWorkloadContainerLogging` | Logging configuration. Container output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.
View logs with `stacktape logs` or in the Stacktape Console. | - |
| `port` | no | `number` | Port this service listens on. Injected as the `PORT` env var. | `3000` |
| `protocol` | no | `string: "grpc" \| "http" \| "http2"` | Protocol for metrics collection. Set to enable protocol-specific metrics (e.g., HTTP 5xx tracking). | - |
| `scaling` | no | `ContainerWorkloadScaling` | Auto-scaling: add/remove container instances based on demand. Traffic is automatically distributed across all running containers. | - |
| `sideContainers` | no | `Array<ServiceHelperContainer>` | Helper containers that run alongside the main container. **`run-on-init`**: Runs to completion before the main container starts (e.g., database migrations).
**`always-running`**: Runs for the entire lifecycle (e.g., log forwarders, monitoring agents).
Can reach the main container via `localhost`. | - |
| `stopTimeout` | no | `number` | Seconds to wait for graceful shutdown before force-killing the container. The container receives `SIGTERM` first, then `SIGKILL` after this timeout. Must be 2-120. | `2` |
| `usePrivateSubnetsWithNAT` | no | `boolean` | Deploy in private subnets with a static outbound IP via NAT Gateway. The container won&#39;t have a public IP. All outbound traffic routes through a NAT Gateway,
giving you a static IP you can whitelist in external services (APIs, payment gateways, etc.).

Configure the number of NAT Gateways in `stackConfig.vpc.nat`.

**Adds cost:** NAT Gateway ~$32/month + data processing fees. | `false` |
| `volumeMounts` | no | `Array<ContainerEfsMount>` | Persistent EFS volumes shared across containers and restarts. Data stored in EFS volumes persists even when containers are replaced.
Multiple containers can mount the same volume. All data is encrypted in transit. | - |


## Referenceable parameters


## Referenceable Parameters: `private-service`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `address` | service `host:port` pair accessible only to other resources of stack([web-services](/compute-resources/web-services/), [multi-container-workloads](/compute-resources/multi-container-workloads/)) | `$ResourceParam("<<resource-name>>", "address")` |
