# Worker Service

A Stacktape worker service runs an always-on container inside your VPC with no public URL. Use it for background workers, queue consumers, polling loops, and internal tasks that need persistent access to databases, queues, or other stack resources. Under the hood, it runs as an ECS Fargate (or EC2) service.

**Pricing context:** Fargate vCPU billing ranges from ~$7.29/month per 0.25 vCPU to ~$466/month per 16 vCPU, plus memory from ~$1.60/month per 512 MB to ~$384/month per 120 GB. Idle tasks still bill — Fargate cannot scale to zero. ARM (`arm64`) tasks cost ~20% less than x86.

## When to use

A worker service fits when a process must stay alive continuously and does not need an inbound public endpoint. Typical use cases include SQS queue consumers, Kinesis stream processors, database sync loops, background job runners, and containers that poll an external API on an interval. The always-on model keeps clients warm, connections open, and processing latency low — work starts the moment it arrives rather than waiting for a cold start.

The tradeoff is cost: at least one running container task bills continuously. If work arrives in unpredictable bursts with long idle gaps, a [Lambda function](/resources/compute/lambda-function) gives you per-invocation billing with scale-to-zero. If your process has a clear start and finish, a [batch job](/resources/compute/batch-job) is a better fit.

## When NOT to use

A Stacktape worker service is not the right fit when the workload needs inbound traffic routing, has a finite execution lifecycle, or benefits from scale-to-zero billing. Choose a more targeted resource type in those cases.

| Scenario | Use instead |
|----------|-------------|
| Container needs a public HTTPS URL, TLS, custom domain, or CDN | [Web service](/resources/compute/web-service) |
| Container is addressed by name from other stack resources (request/response) | [Private service](/resources/compute/private-service) |
| Work runs to completion (finite jobs, data pipelines) | [Batch job](/resources/compute/batch-job) |
| Event-driven code that benefits from scale-to-zero billing | [Lambda function](/resources/compute/lambda-function) |
| Multiple peer containers with separate traffic routing or explicit startup ordering | [Multi-container workload](/resources/compute/multi-container-workload) |

## Basic example

A minimal worker service needs `packaging` (how to build the container image) and `resources` (CPU and memory). No traffic configuration is needed because a worker service has no public endpoint.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, StacktapeImageBuildpackPackaging } from 'stacktape';
export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({
      entryfilePath: './src/worker.ts'
    }),
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });

  return {
    resources: { worker }
  };
});
```


`cpu: 0.5` allocates 0.5 vCPU and `memory: 1024` allocates 1024 MB of memory for the Fargate task. Supported `cpu` values are `0.25`, `0.5`, `1`, `2`, `4`, `8`, and `16`, and the `memory` value must be compatible with the chosen CPU tier (for example, 0.5 vCPU supports 1024–4096 MB). The `StacktapeImageBuildpackPackaging` builds a container image from your source code automatically.

## Compute resources

A worker service supports two compute engines through the `resources` property: **Fargate** (serverless) and **EC2** (self-managed instances). Most teams should start with Fargate because there are no instances to manage — you specify CPU, memory, and optionally architecture, and AWS handles the underlying capacity.

### Fargate

Fargate is the default compute engine. Set `cpu` and `memory` to size the task. Optionally set `architecture` to `'arm64'` to run on Graviton processors, which cost ~20% less than x86 and work well when your image and native dependencies support ARM. The default architecture is `'x86_64'`.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    resources: {
      cpu: 1,
      memory: 2048,
      architecture: 'arm64'
    }
  });

  return { resources: { worker } };
});
```


Valid Fargate CPU/memory combinations:

| vCPU | Memory range |
|------|-------------|
| 0.25 | 512–2048 MB |
| 0.5 | 1024–4096 MB |
| 1 | 2048–8192 MB |
| 2 | 4096–16384 MB |
| 4 | 8192–30720 MB |
| 8 | 16384–61440 MB |
| 16 | 32768–122880 MB |

Start with Fargate for most workers and adjust the task size after observing real CPU and memory utilization in the [Stacktape Console](/stacktape-console/console-overview) or through [`stacktape metrics`](/cli/metrics).

### EC2

EC2 mode uses `instanceTypes` instead of `cpu`/`memory`. The first instance type in the list is preferred and instances are auto-managed. Set `enableWarmPool: true` to keep pre-initialized instances ready for faster scaling.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    resources: {
      instanceTypes: ['c6g.large'],
      enableWarmPool: true
    }
  });

  return { resources: { worker } };
});
```


Use EC2 when you need a specific instance family (for example, compute-optimized `c6g` for CPU-bound processing), GPU instances, or when sustained high utilization makes EC2 pricing more favorable than Fargate per-second billing. For most background workers, Fargate is simpler and the cost difference is small.


## Feature Comparison

| Feature | Fargate | EC2 |
| --- | --- | --- |
| Configuration | Set cpu + memory | Set instanceTypes |
| Server management | None (serverless) | Auto-managed instances |
| ARM support | architecture: 'arm64' | Use ARM instance type (e.g. c6g) |
| Warm pool | no | yes |
| Best for | Most workers | Sustained compute, GPUs, specific instance needs |


## Scaling

A worker service scales horizontally by running multiple parallel container instances for background processing. By default, both `minInstances` and `maxInstances` are `1`, meaning a single container runs at all times. Set `maxInstances` higher and configure a `scalingPolicy` to auto-scale based on CPU or memory utilization.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    scaling: {
      minInstances: 2,
      maxInstances: 8,
      scalingPolicy: {
        keepAvgCpuUtilizationUnder: 70,
        keepAvgMemoryUtilizationUnder: 80
      }
    }
  });

  return { resources: { worker } };
});
```


`keepAvgCpuUtilizationUnder` (default `80`) and `keepAvgMemoryUtilizationUnder` (default `80`) are target-tracking policies — ECS adds instances when average utilization exceeds the target and removes them when it drops. For queue-processing workers, CPU utilization typically correlates well with queue depth. Lower the CPU target (for example, `60`) when you need more headroom for bursty workloads; raise it when the worker is I/O-bound and CPU stays low even under load.


> **Warning:** A high `minInstances` keeps containers running and billing at all times. Start with a conservative minimum and increase only after confirming that your downstream systems (databases, APIs, queues) can handle the extra concurrency from multiple parallel consumers.


## Packaging

A worker service uses container packaging to build or reference its image. Stacktape supports five container packaging modes. Most teams should start with the Stacktape image buildpack for zero-config builds; switch to a different mode when you need tighter control over the base image, system packages, or build process.

| Mode | When to use | Learn more |
|------|-------------|------------|
| Stacktape image buildpack | Zero-config builds from JS, TS, Python, Java, or Go source | [Docs](/packaging/containers/stacktape-buildpack) |
| Custom Dockerfile | Full control over base image, system packages, and startup | [Docs](/packaging/containers/custom-dockerfile) |
| Prebuilt image | Image already exists in Docker Hub or a private registry | [Docs](/packaging/containers/prebuilt-image) |
| Nixpacks | Auto-detected builds using Nixpacks conventions | [Docs](/packaging/containers/nixpacks) |
| External buildpack | Cloud Native Buildpacks with a custom builder | [Docs](/packaging/containers/external-buildpack) |

The buildpack mode is the shortest path for teams that own source code and want Stacktape to handle image creation. Custom Dockerfile gives the most control and is the right choice when the worker needs specific system-level dependencies (for example, `ffmpeg`, `puppeteer`, or CUDA libraries). Prebuilt image skips the build step entirely, useful when a platform team publishes hardened images that application teams consume.

## Connecting resources

Use `connectTo` to give a worker service access to other resources in your stack. Stacktape automatically grants IAM permissions, opens security-group rules for databases and Redis, and injects environment variables with connection details. Variable names follow the `STP_[RESOURCE_NAME]_[PARAM]` pattern.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WorkerService,
  StacktapeImageBuildpackPackaging,
  SqsQueue,
  RelationalDatabase,
  RdsEnginePostgres
} from 'stacktape';

export default defineConfig(() => {
  const jobsQueue = new SqsQueue({});
  const mainDatabase = new RelationalDatabase({
    credentials: { masterUserPassword: "$Secret('my-db-password')" },
    engine: new RdsEnginePostgres({
      version: '16',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    })
  });

  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    connectTo: [jobsQueue, mainDatabase]
  });

  return { resources: { jobsQueue, mainDatabase, worker } };
});
```


With the config above, the worker container receives these environment variables at runtime:

- `STP_JOBS_QUEUE_ARN`, `STP_JOBS_QUEUE_NAME`, `STP_JOBS_QUEUE_URL` — from the SQS queue
- `STP_MAIN_DATABASE_CONNECTION_STRING`, `STP_MAIN_DATABASE_HOST`, `STP_MAIN_DATABASE_PORT` — from the relational database

Your application code reads these values from `process.env` (or your language's equivalent) without managing credentials or network rules manually. See [connecting resources](/configuration/connecting-resources) for the full list of injected variables by resource type.

Use `iamRoleStatements` only for permissions not covered by `connectTo`, such as calling an AWS service that is not modeled as a Stacktape resource (for example, Amazon Bedrock or Rekognition).

## Health checks

An internal health check auto-replaces containers that are still running but no longer healthy. ECS periodically runs the configured command inside the container; if the check fails for the configured number of `retries`, the container is terminated and replaced.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    internalHealthCheck: {
      healthCheckCommand: ['CMD-SHELL', 'node ./healthcheck.js'],
      intervalSeconds: 30,
      timeoutSeconds: 5,
      retries: 3,
      startPeriodSeconds: 60
    }
  });

  return { resources: { worker } };
});
```


`healthCheckCommand` is the command ECS runs inside the container — exit code `0` means healthy, anything else means unhealthy. `intervalSeconds` (default `30`, range 5–300) controls how often the check runs. `retries` (default `3`, range 1–10) sets how many consecutive failures trigger replacement. `startPeriodSeconds` (range 0–300) is a grace period after container start during which failures are not counted — set this to at least the time your worker needs to initialize connections and warm up.

**When to enable:** Add a health check when the worker process can hang without exiting — for example, a polling loop that loses its queue connection but keeps the event loop alive, or a worker with a deadlocked thread pool.

**When the default is fine:** Skip health checks for simple workers where process exit already signals failure clearly. ECS automatically replaces crashed containers regardless of health check configuration.

## Graceful shutdown

The `stopTimeout` property controls how long ECS waits between sending `SIGTERM` and `SIGKILL` during container shutdown. The value must be 2–120 seconds. The default is 2 seconds.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    stopTimeout: 30
  });

  return { resources: { worker } };
});
```


Increase `stopTimeout` for queue consumers that need time to finish processing the current message, flush telemetry, or release distributed locks after receiving `SIGTERM`. A 30-second timeout is a common choice for workers that process messages in under 20 seconds. Keep the timeout low (the default 2 seconds) for fast-failing workers where quick replacement is more important than graceful cleanup. Long shutdown windows slow container replacement and can delay deployments.

## Side containers

A worker service can run helper containers alongside the main worker container using `sideContainers`. Two types are available:

- **`run-on-init`** — must exit with code 0 before the main container starts. Use for database migrations, schema validation, or one-time setup steps.
- **`always-running`** — runs for the entire worker service lifecycle alongside the main container. Use for log forwarders, monitoring agents, or helper processes that communicate with the main container over `localhost`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WorkerService,
  StacktapeImageBuildpackPackaging,
  CustomDockerfilePackaging
} from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 1, memory: 2048 },
    sideContainers: [
      {
        name: 'migrate',
        containerType: 'run-on-init',
        packaging: new CustomDockerfilePackaging({
          buildContextPath: './migrations'
        })
      },
      {
        name: 'log-forwarder',
        containerType: 'always-running',
        packaging: new CustomDockerfilePackaging({
          buildContextPath: './log-forwarder'
        })
      }
    ]
  });

  return { resources: { worker } };
});
```


Each side container must have a unique `name` within the workload and its own `packaging` configuration. Side containers share the CPU and memory allocated by `resources` with the main container. If your use case needs multiple peer containers with independent traffic routing or per-container configuration at the top level, use [multi-container workload](/resources/compute/multi-container-workload) instead.

## EFS storage

A worker service can mount an [EFS filesystem](/resources/storage/efs-filesystem) for persistent, shared file storage. Data in EFS survives container replacement, and multiple container instances can mount the same volume concurrently. This is useful when a worker needs to read or write files that must persist across task restarts — for example, ML model files, shared configuration, or intermediate processing results.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WorkerService,
  EfsFilesystem,
  StacktapeImageBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const sharedData = new EfsFilesystem({});

  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    connectTo: [sharedData],
    volumeMounts: [
      {
        type: 'efs',
        properties: {
          efsFilesystemName: 'sharedData',
          mountPath: '/mnt/shared',
          rootDirectory: '/workers'
        }
      }
    ]
  });

  return { resources: { sharedData, worker } };
});
```


`mountPath` is the absolute path inside the container where the volume appears. `rootDirectory` (default `'/'`) restricts the mount to a subdirectory within the EFS filesystem. Skip EFS when the worker's state belongs in a database, queue, or S3 bucket — EFS adds network I/O latency and its own storage cost model.

## Private subnets with NAT

Set `usePrivateSubnetsWithNAT: true` to deploy the worker service in private subnets and route all outbound internet traffic through a NAT Gateway. The NAT Gateway provides a static Elastic IP per availability zone — useful when an external service requires IP whitelisting. When `usePrivateSubnetsWithNAT` is `false` (the default), the container has direct outbound internet access without NAT.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    usePrivateSubnetsWithNAT: true
  });

  return { resources: { worker } };
});
```


**Cost:** NAT Gateway costs ~$32/month per availability zone plus data processing fees. Configure the number of NAT Gateway availability zones (1–3) in `stackConfig.vpc.nat.availabilityZones`.

**When to enable:** Only when you need fixed outbound IPs for allowlisting with external APIs or payment providers, or when your security policy requires that containers never have public IPs.

**When the default is fine:** Most workers communicate only with AWS services and other stack resources, which don't require NAT. The default (`usePrivateSubnetsWithNAT: false`) handles outbound traffic without the extra NAT Gateway cost.

## Logging

Container output (`stdout`/`stderr`) is automatically sent to CloudWatch Logs and retained for 90 days by default. View logs with [`stacktape logs`](/cli/logs) or in the [Stacktape Console](/stacktape-console/console-overview). Adjust retention with `logging.retentionDays` — supported values range from 1 day to 3653 days (10 years). Set `logging.disabled: true` only when CloudWatch logging is intentionally not needed.

For most worker services, keep logging enabled and make log output structured enough to identify the job ID, queue message, or resource the worker was processing. Forward logs to external services (Datadog, Splunk) using [log forwarding](/observability/log-forwarding).

## Remote sessions

Set `enableRemoteSessions: true` to allow interactive shell access to running worker containers through [`stacktape container:session`](/cli/container-session). Stacktape adds a small SSM agent sidecar that uses minimal CPU and memory. Remote sessions are disabled by default.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    enableRemoteSessions: true
  });

  return { resources: { worker } };
});
```


**When to enable:** Useful for debugging stuck workers, inspecting environment variables, or validating mounted EFS files in a deployed stage. Consider enabling on development and staging stages where the debugging value outweighs the small resource overhead.

**When to skip:** Production stages where you rely on logs and metrics for observability. Remote shell access is best treated as a temporary debugging tool, not a standard operational workflow.

## FAQ

### Can a worker service scale to zero?

No. A worker service is an always-on resource and Fargate cannot scale to zero — at least one task bills continuously. The minimum `minInstances` is 1. If you need scale-to-zero billing, use a [Lambda function](/resources/compute/lambda-function) for event-driven workloads.

### How much does an ECS Fargate worker service cost?

Fargate bills per vCPU-second and per GB-second for each running task. Costs range from ~$7.29/month for 0.25 vCPU to ~$466/month for 16 vCPU, plus memory from ~$1.60/month per 512 MB. Idle containers still bill because Fargate cannot scale to zero. ARM (`arm64`) architecture reduces costs by ~20%. See [managing costs](/managing-costs/overview) for tracking and optimization.

### Worker service vs Lambda function — when should I use each?

Use a worker service for long-running processes, polling loops, or consumers that need warm connections and continuous availability. Use a [Lambda function](/resources/compute/lambda-function) for event-driven work with variable load where per-invocation billing and scale-to-zero matter more than connection warmth. Workers excel at steady throughput; Lambda excels at bursty, unpredictable workloads.

### How do I run database migrations before my worker starts?

Use a `run-on-init` side container. This container must exit with code 0 before the main worker container starts. Point its packaging at your migration scripts or Dockerfile. See the [side containers](#side-containers) section for a working example.

### How do I debug a running worker service?

Start with [`stacktape logs`](/cli/logs) or the [Stacktape Console](/stacktape-console/console-overview) to inspect container output. For interactive debugging, enable `enableRemoteSessions` and use [`stacktape container:session`](/cli/container-session) to open a shell inside the running container. Use [`stacktape metrics`](/cli/metrics) to check CPU and memory utilization.

### What happens when a worker service container crashes?

ECS automatically replaces crashed containers (containers that exit unexpectedly). If you configure an `internalHealthCheck`, ECS also replaces containers that are still running but fail health checks — useful for detecting deadlocked processes that don't exit on their own. The replacement container starts fresh with the same configuration.

### Why is my worker killed mid-task during a deploy or scale-in?

The default `stopTimeout` is only 2 seconds — ECS sends `SIGTERM`, waits that long, then forces `SIGKILL`. A queue consumer still processing a message can be killed before it finishes. Raise `stopTimeout` (max 120 seconds) to give the worker time to finish the current message, flush telemetry, and release distributed locks after receiving `SIGTERM`. See [graceful shutdown](#graceful-shutdown).

## API Reference


## API Reference: `WorkerServiceProps`
```typescript
import type { ContainerEfsMount, ContainerHealthCheck, ContainerWorkloadContainerLogging, ContainerWorkloadResourcesConfig, ContainerWorkloadScaling, CustomDockerfileCwImagePackaging, EnvironmentVar, ExternalBuildpackCwImagePackaging, NixpacksCwImagePackaging, PrebuiltCwImagePackaging, ServiceHelperContainer, StpBuildpackCwImagePackaging, StpIamRoleStatement } from 'stacktape';

type WorkerServiceProps = {
  /** Configures the container image for the service. */
  packaging: WorkerServicePackaging;
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
  /** Logging configuration. */
  logging?: ContainerWorkloadContainerLogging;
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
type WorkerServicePackaging =
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
| `logging` | no | `ContainerWorkloadContainerLogging` | Logging configuration. Container output (`stdout`/`stderr`) is automatically sent to CloudWatch and retained for 90 days.
View logs with `stacktape logs` or in the Stacktape Console. | - |
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


## Referenceable Parameters: `worker-service`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
