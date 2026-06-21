# Multi-Container Workload

A Stacktape multi-container-workload runs multiple containers together as a single ECS task, sharing CPU, memory, and network namespace. Fargate (serverless) is the default; specify `instanceTypes` for EC2-based compute. Use it when containers must start and stop together, communicate via `localhost`, or route different types of traffic to different processes within the same task.

**Pricing context:** Fargate billing applies to the shared task — approximately ~$9/month for 0.25 vCPU + 512 MB, shared across all containers. ARM (`arm64`) tasks are ~20% cheaper than x86.

## When to use

A multi-container-workload is the right choice when containers must run together as a unit — sharing compute, the same localhost network, and the same lifecycle. Common use cases:

- **Multiple cooperating processes** — an API server and a metrics collector communicating via `localhost:9090` without any load balancer in between
- **Init/migration containers** — a container that runs database migrations to completion before the main API container starts, using `dependsOn` ordering
- **Multiple traffic paths** — different containers receiving traffic from different load balancers or API gateways through separate ports in the same task
- **Independent traffic routing per container** — when each container needs its own load balancer or API gateway integration, something the built-in `sideContainers` on [web-service](/resources/compute/web-service), [worker-service](/resources/compute/worker-service), and [private-service](/resources/compute/private-service) cannot do

## When NOT to use

- **Single-container HTTP services** — use [web-service](/resources/compute/web-service), which manages a load balancer, TLS, custom domains, CDN, and CORS with far less configuration.
- **Internal-only single-container services** — use [private-service](/resources/compute/private-service) for VPC-only containers.
- **Event-driven background workers** — use [worker-service](/resources/compute/worker-service) for queue and event-driven containers.
- **Short-lived compute** — use a [batch job](/resources/compute/batch-job) for workloads that run to completion.
- **Independent services** — containers that don't share compute or communicate via localhost are better deployed as separate Stacktape resources. Shared tasks amplify blast radius: one crashing essential container brings down the whole task.

## Basic example

This example runs two containers together: an API server receiving HTTP traffic through an HTTP API Gateway, and a metrics exporter reachable only on localhost. Both containers share the task-level allocation of `0.5` vCPU and `1024` MB memory — size this for the peak combined usage of all containers.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  HttpApiGateway,
  StacktapeImageBuildpackPackaging
} from 'stacktape';
export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new StacktapeImageBuildpackPackaging({
          entryfilePath: './src/server.ts'
        }),
        events: [
          {
            type: 'http-api-gateway',
            properties: {
              httpApiGatewayName: 'apiGateway',
              containerPort: 3000,
              method: '*',
              path: '/{proxy+}'
            }
          }
        ]
      },
      {
        name: 'metrics',
        packaging: new StacktapeImageBuildpackPackaging({
          entryfilePath: './src/metrics.ts'
        }),
        events: [
          {
            type: 'workload-internal',
            properties: { containerPort: 9090 }
          }
        ]
      }
    ],
    resources: {
      cpu: 0.5,
      memory: 1024
    }
  });

  return {
    resources: { apiGateway, workload }
  };
});
```


After deploying, the `apiGateway` resource produces a URL you can use to send HTTP requests to the `server` container. The `metrics` container is never publicly exposed — the `workload-internal` event type opens a container port for connections from other containers within the same workload, without exposing it externally.

## Containers

A Stacktape multi-container-workload defines its containers in the `containers` array. Unlike other workload types that have a single main container with optional `sideContainers`, a multi-container-workload treats all containers as peers — each with its own packaging, environment variables, health check, and traffic routing. Two properties shape the workload's lifecycle:

**`essential`** (default `true`) — when an essential container exits unexpectedly, ECS stops and replaces the entire task. Set `essential: false` for containers expected to exit once, like an init container.

**`dependsOn`** — controls startup ordering. A container waits for a listed container to reach a specific state before starting. Available conditions are `START` (dependency has started), `COMPLETE` (finished with any exit code), `SUCCESS` (finished with exit code 0), and `HEALTHY` (passed its first health check).

The example below uses `dependsOn` to run database migrations before the API server starts. The migration container is marked non-essential so ECS does not restart the task when it exits.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  HttpApiGateway,
  StacktapeImageBuildpackPackaging,
  CustomDockerfilePackaging
} from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'migrate',
        essential: false,
        packaging: new CustomDockerfilePackaging({
          buildContextPath: './migrations',
          dockerfilePath: './Dockerfile'
        })
      },
      {
        name: 'server',
        dependsOn: [{ containerName: 'migrate', condition: 'SUCCESS' }],
        packaging: new StacktapeImageBuildpackPackaging({
          entryfilePath: './src/server.ts'
        }),
        events: [
          {
            type: 'http-api-gateway',
            properties: {
              httpApiGatewayName: 'apiGateway',
              containerPort: 3000,
              method: '*',
              path: '/{proxy+}'
            }
          }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { apiGateway, workload } };
});
```


`essential: false` on the migration container means ECS will not restart the task when it exits. `condition: 'SUCCESS'` means the API container only starts if the migration exits with code 0 — otherwise the task fails and ECS retries from scratch.


> **Info:** Use `stopTimeout` (default `2` seconds, max `120`) on containers that need extra time to flush connections or finish in-flight work before ECS sends SIGKILL after SIGTERM.


## Traffic

Stacktape multi-container-workload containers specify how they receive traffic through their `events` array. Unlike [web-service](/resources/compute/web-service), a multi-container-workload does not provision a load balancer on your behalf — each container references a load balancer or API Gateway resource defined elsewhere in your Stacktape config. This lets you attach multiple containers to different load balancers or gateways within the same task.

Five event types are available:

| Type | Description |
|------|-------------|
| `http-api-gateway` | HTTP traffic from an [HTTP API Gateway](/resources/networking/http-api-gateway) resource |
| `application-load-balancer` | HTTP/HTTPS traffic from an [Application Load Balancer](/resources/networking/application-load-balancer) with content-based routing |
| `network-load-balancer` | TCP/TLS traffic from a [Network Load Balancer](/resources/networking/network-load-balancer) |
| `workload-internal` | Opens a container port for connections from other containers within the same workload |
| `service-connect` | Exposes a port for service discovery from other compute resources in the stack |

### HTTP API Gateway

Use `http-api-gateway` for standard HTTP/HTTPS traffic. Both `method` and `path` are required. `httpApiGatewayName` references an `HttpApiGateway` resource defined in your stack. Use `method: '*'` to match any method and `path: '/{proxy+}'` as a catch-all route.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  HttpApiGateway,
  StacktapeImageBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
        events: [
          {
            type: 'http-api-gateway',
            properties: {
              httpApiGatewayName: 'apiGateway',
              containerPort: 3000,
              method: '*',
              path: '/{proxy+}'
            }
          }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { apiGateway, workload } };
});
```


### Application Load Balancer

Use `application-load-balancer` when you need WebSocket support, content-based routing (by path, header, query string, or source IP), or a [web application firewall](/resources/security/web-application-firewall). `loadBalancerName` references an `ApplicationLoadBalancer` resource. Rules are evaluated in ascending `priority` order — lower numbers take priority.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  ApplicationLoadBalancer,
  StacktapeImageBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const alb = new ApplicationLoadBalancer({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
        events: [
          {
            type: 'application-load-balancer',
            properties: {
              loadBalancerName: 'alb',
              containerPort: 3000,
              priority: 10,
              paths: ['/*']
            }
          }
        ],
        loadBalancerHealthCheck: {
          healthcheckPath: '/health',
          healthcheckInterval: 10,
          healthcheckTimeout: 5
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { alb, workload } };
});
```


`priority: 10` sets the evaluation order for this ALB routing rule — lower numbers are evaluated first. Use different priorities when multiple containers or services share the same ALB (e.g., `priority: 10` for the API, `priority: 20` for a dashboard). `loadBalancerHealthCheck` configures the ALB's health check for this specific container — `healthcheckInterval: 10` checks every 10 seconds (default `5`), and `healthcheckTimeout: 5` waits up to 5 seconds for a response (default `4`). ALB routing rules also support `methods`, `hosts`, `headers`, `queryParams`, and `sourceIps` filters.

### Network Load Balancer

Use `network-load-balancer` for non-HTTP protocols (TCP/TLS): MQTT brokers, custom database proxies, game servers, or binary protocols. `listenerPort` specifies which NLB listener forwards traffic (e.g., `8883` for MQTTS); `containerPort` is the port the container actually listens on (e.g., `1883` for plain MQTT). The NLB handles TLS termination between the two ports when configured with a certificate.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  NetworkLoadBalancer,
  StacktapeImageBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const nlb = new NetworkLoadBalancer({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'broker',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/broker.ts' }),
        events: [
          {
            type: 'network-load-balancer',
            properties: {
              loadBalancerName: 'nlb',
              listenerPort: 8883,
              containerPort: 1883
            }
          }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { nlb, workload } };
});
```


### Internal and service-connect

**`workload-internal`** opens a container port for connections from other containers within the same workload, without exposing it externally. No load balancer reference is needed. The basic example at the top of this page shows the `workload-internal` pattern for a metrics exporter.

**`service-connect`** exposes a container port for other compute resources in the same stack to discover via DNS. Other services reach this container at `protocol://alias:containerPort` (e.g., `http://internal-api:3000`). The `alias` defaults to `{workloadName}-{containerName}` when omitted. Setting `protocol` (`http`, `http2`, or `grpc`) enables AWS protocol-level metrics — such as HTTP 5xx counts — for this service endpoint.


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/api.ts' }),
        events: [
          {
            type: 'service-connect',
            properties: {
              containerPort: 3000,
              alias: 'internal-api',
              protocol: 'http'
            }
          }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { workload } };
});
```


With this configuration, other workloads and services in the same stack can reach this container at `http://internal-api:3000`. Service-connect is the preferred mechanism for inter-service communication when you don't want to expose a port publicly via a load balancer.

## Compute resources

A Stacktape multi-container-workload allocates CPU and memory at the task level, shared across all containers. Two compute engines are available: **Fargate** (serverless, default) and **EC2** (custom instances).

**Fargate** — specify `cpu` and `memory`. Valid CPU values are `0.25`, `0.5`, `1`, `2`, `4`, `8`, and `16` vCPU. Memory must be compatible with the vCPU tier: 0.25 → 512–2048 MB, 0.5 → 1024–4096 MB, 1 → 2048–8192 MB, 2 → 4096–16384 MB, 4 → 8192–30720 MB, 8 → 16384–61440 MB, 16 → 32768–122880 MB. Set `architecture: 'arm64'` for Graviton at ~20% lower cost; the default is `x86_64`. Fargate is right for most workloads — no servers to manage, and you pay only for what runs.


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' })
      }
    ],
    resources: {
      cpu: 1,
      memory: 2048,
      architecture: 'arm64'
    }
  });

  return { resources: { workload } };
});
```


**EC2** — specify `instanceTypes` (e.g., `['t3.medium']`) for more control and potentially lower cost at scale. Instances are preferred in the order listed and are refreshed weekly for OS patching. EC2 mode is most useful for GPU workloads (`p3`, `g4dn`) or when Reserved Instance pricing applies at sustained high utilization.

Use `enableWarmPool: true` (single instance type only) to keep pre-initialized EC2 instances ready before they are needed. Enable a warm pool when your workload experiences sudden, unpredictable traffic bursts and the 3–5 minute EC2 cold-start time would cause SLA violations. Skip it when Fargate handles your workload (Fargate doesn't support warm pools), when traffic ramps predictably and gradually, or when idle cost isn't justified — warm pool instances run and bill at the full on-demand rate for the instance type even while they are waiting for traffic.


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' })
      }
    ],
    resources: {
      instanceTypes: ['c6g.large'],
      enableWarmPool: true
    }
  });

  return { resources: { workload } };
});
```


The following table shows approximate monthly costs for a single Fargate task (x86_64) in us-east-1. All containers share the total allocation — plan for peak combined usage across all containers.

| vCPU | Memory range | Approximate monthly cost |
|------|-------------|------------------------|
| 0.25 | 512–2048 MB | ~$9–$14 |
| 0.5 | 1024–4096 MB | ~$18–$27 |
| 1 | 2048–8192 MB | ~$36–$55 |
| 2 | 4096–16384 MB | ~$71–$110 |
| 4 | 8192–30720 MB | ~$142–$213 |
| 8 | 16384–61440 MB | ~$284–$425 |
| 16 | 32768–122880 MB | ~$569–$851 |


> **Info:** Prices are approximate us-east-1 list prices for a single running task. ARM tasks cost ~20% less. All containers share the total allocation — plan for peak combined usage, not per-container averages.


## Scaling

Multi-container-workloads auto-scale horizontally by adding or removing whole task instances. When a new task starts, all containers in that task start together. Traffic is distributed across all healthy task instances. The example below keeps at least 2 instances running for availability and allows scaling up to 10 during traffic spikes. The `keepAvgCpuUtilizationUnder: 70` threshold is set below the default of 80 to leave headroom for burst traffic — adjust this based on your workload's traffic patterns.


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' })
      }
    ],
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

  return { resources: { workload } };
});
```


| Property | Default | Description |
|----------|---------|-------------|
| `minInstances` | 1 | Minimum running instances. Cannot be 0 — Fargate does not scale to zero. |
| `maxInstances` | 1 | Maximum running instances. |
| `scalingPolicy.keepAvgCpuUtilizationUnder` | 80 | Scale out when avg CPU across the task exceeds this %. |
| `scalingPolicy.keepAvgMemoryUtilizationUnder` | 80 | Scale out when avg memory across the task exceeds this %. |


> **Warning:** Setting `minInstances` and `maxInstances` to the same value disables auto-scaling. You pay for all running instances even during low traffic.


## Packaging

Stacktape multi-container-workload containers independently specify their packaging mode. Containers in the same workload can use different modes — for example, an init container using a custom Dockerfile while the API container uses the Stacktape buildpack. For detailed configuration, see the [packaging overview](/packaging/overview).

| Mode | When to use |
|------|-------------|
| [Stacktape image buildpack](/packaging/containers/stacktape-buildpack) | Zero-config for JS/TS, Python, Java, Go |
| [Custom Dockerfile](/packaging/containers/custom-dockerfile) | Full control over the container environment |
| [Prebuilt image](/packaging/containers/prebuilt-image) | Use an existing image from Docker Hub or a private registry |
| [Nixpacks](/packaging/containers/nixpacks) | Auto-detects language and builds an optimized image |
| [External buildpack](/packaging/containers/external-buildpack) | Use Cloud Native Buildpacks (buildpacks.io) |

## Connecting to other resources

Stacktape multi-container-workloads use `connectTo` to give all containers access to other stack resources. Stacktape automatically grants IAM permissions, opens security group rules (for databases and Redis), and injects environment variables with connection details into every container. For the full list of injected variables per resource type, see [connecting resources](/configuration/connecting-resources).


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    connectTo: ['myDatabase', 'myBucket'],
    containers: [
      {
        name: 'server',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' })
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { workload } };
});
```


When you connect to a relational database, every container in the workload receives `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_DATABASE_HOST`, and `STP_MY_DATABASE_PORT` automatically. For permissions not covered by `connectTo` (e.g., Bedrock, Rekognition), use `iamRoleStatements`.

## Health checks

Stacktape multi-container-workload containers independently support two health check types.

**Load balancer health check** — configured via `loadBalancerHealthCheck` on the container. Only active when the container has an ALB or NLB event. The load balancer pings the container and stops routing traffic to tasks with unhealthy containers. Defaults: path `/`, interval `5s`, timeout `4s`. For NLB containers, the default protocol is `TCP` (port check); set `healthCheckProtocol: 'HTTP'` for path-based checking.

**Internal container health check** — configured via `internalHealthCheck` on the container. ECS runs a command inside the container and replaces the entire task if an essential container fails the check repeatedly.


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, StacktapeImageBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
        internalHealthCheck: {
          healthCheckCommand: ['CMD-SHELL', 'curl -f http://localhost:3000/health || exit 1'],
          intervalSeconds: 30,
          timeoutSeconds: 5,
          retries: 3,
          startPeriodSeconds: 60
        }
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { workload } };
});
```


Internal health check defaults: `intervalSeconds` `30` (range 5–300), `timeoutSeconds` `5` (range 2–60), `retries` `3` (range 1–10). The `startPeriodSeconds` grace period (0–300) prevents failures from counting during container startup.

## EFS storage

Stacktape multi-container-workload containers can mount an [EFS filesystem](/resources/storage/efs-filesystem) for persistent storage that survives task replacement. Multiple containers in the same workload can mount the same EFS filesystem — useful when one container writes files that another container reads.

**When to enable EFS:** Mount an EFS volume when data must outlive individual container instances — for example, user-uploaded files that need to persist across deployments, or large model weights shared between an inference container and a preprocessing sidecar that would be slow to re-download on every task start.

**When to skip EFS:** If data is ephemeral (only needed for the duration of one request), fits in container memory, or can be stored in S3 and pulled on demand, EFS adds cost and network latency without benefit.

**Cost signal:** Enabling EFS adds separate storage and throughput charges on top of the Fargate task cost. Small files are cheap, but a multi-container workload with gigabytes of shared model weights will see meaningful EFS costs beyond the Fargate bill.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  EfsFilesystem,
  StacktapeImageBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const uploads = new EfsFilesystem({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
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
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { uploads, workload } };
});
```


`mountPath` is the absolute path inside the container where the volume appears. `rootDirectory` restricts the mount to a subdirectory of the EFS filesystem (default `/`). Data stored in EFS volumes persists even when containers are replaced. Multiple containers can mount the same filesystem to share files across processes within the task.

## Gradual deployments

Gradual deployment strategies shift traffic from the old workload version to the new version incrementally, limiting the blast radius of a bad deployment. This requires at least one container with an `application-load-balancer` event.

Enable gradual deployments for production services where a bad deploy could affect revenue or user experience — the `Canary10Percent5Minutes` strategy routes 10% of traffic to the new version for 5 minutes before shifting everything, giving you time to catch errors. Skip gradual deployments for dev and staging stages or low-traffic services where rolling back quickly is straightforward and the added deployment time isn't justified. All gradual strategies extend deploy time: `Canary10Percent15Minutes` adds up to 15 minutes of monitoring before completing; `Linear10PercentEvery1Minutes` shifts 10% more every minute (~10 minutes total); `Linear10PercentEvery3Minutes` shifts 10% more every 3 minutes (~30 minutes total). An Application Load Balancer must already be provisioned since gradual deployments require an ALB integration.

For detailed configuration, see [gradual deployments](/deployment-and-lifecycle/gradual-deployments).


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  ApplicationLoadBalancer,
  StacktapeImageBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const alb = new ApplicationLoadBalancer({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: './src/server.ts' }),
        events: [
          {
            type: 'application-load-balancer',
            properties: {
              loadBalancerName: 'alb',
              containerPort: 3000,
              priority: 10,
              paths: ['/*']
            }
          }
        ]
      }
    ],
    resources: { cpu: 0.5, memory: 1024 },
    deployment: {
      strategy: 'Canary10Percent5Minutes'
    }
  });

  return { resources: { alb, workload } };
});
```


Available strategies: `Canary10Percent5Minutes`, `Canary10Percent15Minutes`, `Linear10PercentEvery1Minutes`, `Linear10PercentEvery3Minutes`, and `AllAtOnce`. Use `AllAtOnce` for non-production stages or services that need to deploy as fast as possible. Optionally set `beforeAllowTrafficFunction` and `afterTrafficShiftFunction` to run Lambda-based validation hooks before and after the traffic shift.

## Private subnets

By default, workload containers run in public subnets with direct internet access. If your workload calls S3, public APIs, or services that do not restrict access by IP address, keep the default — private subnets add ~$32+/month per availability zone and increase networking complexity without a security benefit for most use cases.

Set `usePrivateSubnetsWithNAT: true` to deploy in private subnets where all outbound traffic routes through a NAT Gateway, giving you a static outbound IP that external services can whitelist. This is useful when third-party payment gateways, data providers, or partner APIs require you to send traffic from a fixed IP address.


> **Warning:** NAT Gateways add approximately ~$32/month per availability zone plus data processing fees. Configure the number of NAT Gateways (1–3 AZs) in `stackConfig.vpc.nat`.


## Logging

Stacktape multi-container-workload container output (`stdout`/`stderr`) is automatically sent to CloudWatch Logs and retained for 90 days by default. Each container has independent logging configuration via its `logging` property — you can disable logging per container or set a different retention period. View logs with [`stacktape debug:logs`](/cli/debug-logs) or in the [Stacktape Console](/stacktape-console/console-overview).

Set `logging.disabled: true` on a container to stop sending its output to CloudWatch. You can also configure [log forwarding](/observability/log-forwarding) to external services like Datadog on a per-container basis.

## Remote sessions

Stacktape multi-container-workloads support interactive shell access to running containers when `enableRemoteSessions` is set to `true`. This enables [`stacktape container:session`](/cli/container-session), which adds a small SSM agent that uses minimal CPU and memory. Leave `enableRemoteSessions` unset unless you need shell access for debugging.

## FAQ

### What's the difference between multi-container-workload and web-service?

A [web-service](/resources/compute/web-service) is purpose-built for a single HTTP-facing container — it manages a load balancer, TLS, custom domains, CDN, and CORS for you. A multi-container-workload gives you multiple peer containers with independent traffic routing, each referencing external load balancer resources you define separately. Use multi-container-workload when your architecture genuinely needs multiple containers receiving different types of traffic, or when the web-service's built-in abstractions don't fit.

### Can I use a custom domain with a multi-container-workload?

Not directly on the workload itself. Custom domains are configured on the load balancer or API Gateway resource that the container connects to via its `events` array. See the [custom domains](/resources/networking/custom-domains) page for setup details on each resource type.

### Does a multi-container-workload scale to zero?

No. Like all ECS Fargate workloads, `minInstances` cannot be set below 1 — at least one task is always running and billing. If you need scale-to-zero, use a [Lambda function](/resources/compute/lambda-function), which charges only when invoked and scales to zero automatically.

### How do containers in the same workload communicate?

All containers in an ECS task share a network namespace, so they communicate via `localhost` on any port the target container is listening on. No load balancer or service discovery is needed for intra-task traffic. Use the `workload-internal` event type to explicitly open those ports in your config for connections from other containers in the workload.

### How much does a Fargate multi-container task cost?

Fargate bills per vCPU-hour and GB-hour of memory for the task as a whole, not per container. All containers share the allocation. A `0.5 vCPU / 1 GB` task in us-east-1 costs roughly ~$18/month running 24/7. Adding more containers to a workload doesn't add per-task compute cost, but each container consumes part of the shared budget — plan sizing for peak combined load.

### How do I run database migrations before the main container starts?

Add a migration container to the `containers` array with `essential: false`. Add a `dependsOn` entry on your API container with `condition: 'SUCCESS'` pointing to the migration container. ECS runs the migration container first, waits for it to exit with code 0, then starts the API container. If the migration exits with a non-zero code, the entire task fails and ECS retries.

### Can I give each container different CPU/memory limits?

No. CPU and memory are allocated at the task level and shared across all containers — individual containers cannot be assigned hard compute limits separately from the task total. Plan the total `cpu` and `memory` to cover peak combined usage across all containers in the workload.

### How fast does a Fargate task with multiple containers start?

Fargate task startup time depends on the number and total size of container images being pulled. `dependsOn` chains add sequencing time — an init container's runtime is added to the total startup before the main container is healthy. Smaller, optimized images reduce startup time.

### When should I use multi-container-workload vs separate services?

Use a multi-container-workload when containers are tightly coupled — they communicate via localhost, share a volume, or must start and stop together. Use separate Stacktape resources ([web-service](/resources/compute/web-service), [worker-service](/resources/compute/worker-service), etc.) when containers scale independently, are owned by different teams, or a failure in one should not affect the other. Sharing a task amplifies blast radius.

### What happens when one container in the workload crashes?

If the container has `essential: true` (the default), ECS stops the entire task and starts a replacement — all containers restart together. If the container has `essential: false`, ECS allows it to exit without restarting the task. Use `internalHealthCheck` to detect containers that are running but not functioning correctly; failed checks on an essential container trigger the same full task replacement.

## API Reference


## API Reference: `ContainerWorkloadProps`
```typescript
import type { ContainerWorkloadContainer, ContainerWorkloadDeploymentConfig, ContainerWorkloadResourcesConfig, ContainerWorkloadScaling, StpIamRoleStatement } from 'stacktape';

type ContainerWorkloadProps = {
  /** Containers in this workload. They share compute resources and scale together. */
  containers: Array<ContainerWorkloadContainer>;
  /** CPU, memory, and compute engine (Fargate or EC2). */
  resources: ContainerWorkloadResourcesConfig;
  /** Give this resource access to other resources in your stack. */
  connectTo?: Array<string>;
  /** Gradual traffic shifting (canary/linear) for safe deployments. Requires an ALB integration. */
  deployment?: ContainerWorkloadDeploymentConfig;
  /** Enable stacktape container:session for interactive shell access to running containers. */
  enableRemoteSessions?: boolean;
  /** Raw IAM policy statements for permissions not covered by connectTo. */
  iamRoleStatements?: Array<StpIamRoleStatement>;
  /** Auto-scaling: how many instances and when to add/remove them. */
  scaling?: ContainerWorkloadScaling;
  /** Run in private subnets with a NAT Gateway for outbound internet. Gives you a static public IP. */
  usePrivateSubnetsWithNAT?: boolean;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `containers` | yes | `Array<ContainerWorkloadContainer>` | Containers in this workload. They share compute resources and scale together. | - |
| `resources` | yes | `ContainerWorkloadResourcesConfig` | CPU, memory, and compute engine (Fargate or EC2). **Fargate** (set `cpu` + `memory`): Serverless, no servers to manage.
**EC2** (set `instanceTypes`): Choose specific instance types for more control or GPU access. | - |
| `connectTo` | no | `Array<string>` | Give this resource access to other resources in your stack. List the names of resources this workload needs to communicate with. Stacktape automatically:

**Grants IAM permissions** (e.g., S3 read/write, SQS send/receive)
**Opens network access** (security group rules for databases, Redis)
**Injects environment variables** with connection details: `STP_[RESOURCE_NAME]_[PARAM]`

Example: `connectTo: ["myDatabase", "myBucket"]` gives this workload full access to both
resources and injects `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_BUCKET_NAME`, etc. | - |
| `deployment` | no | `ContainerWorkloadDeploymentConfig` | Gradual traffic shifting (canary/linear) for safe deployments. Requires an ALB integration. | - |
| `enableRemoteSessions` | no | `boolean` | Enable `stacktape container:session` for interactive shell access to running containers. | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | Raw IAM policy statements for permissions not covered by `connectTo`. Added as a separate policy alongside auto-generated permissions. Use this for
accessing AWS services directly (e.g., Rekognition, Textract, Bedrock). | - |
| `scaling` | no | `ContainerWorkloadScaling` | Auto-scaling: how many instances and when to add/remove them. | - |
| `usePrivateSubnetsWithNAT` | no | `boolean` | Run in private subnets with a NAT Gateway for outbound internet. Gives you a static public IP. Useful for IP whitelisting with third-party APIs. NAT Gateway costs ~$32/month per AZ + data processing fees. | `false` |


## Referenceable parameters


## Referenceable Parameters: `multi-container-workload`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
