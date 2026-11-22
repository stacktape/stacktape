# Multi-container workload

A multi-container workload runs several containers as one ECS task. They start and stop together, share the task's
CPU and memory and reach each other on `localhost`, and each container can take traffic from its own load balancer or
API gateway. It runs on Fargate by default, or on EC2.

Use it when containers must run as one unit, for example an API with a metrics exporter, or a broker and its admin UI.
For a single container, a [web service](/resources/compute/web-service), [private service](/resources/compute/private-service)
or [worker service](/resources/compute/worker-service) takes less configuration; they also run helper containers with
`sideContainers`. The task bills while it runs, shared by all its containers: 0.5 vCPU and 1 GB cost about $18 a month
on x86 Fargate in us-east-1.

## Basic example

An API server that takes HTTP traffic through an HTTP API Gateway, and a metrics exporter only the API can reach.
Both share 0.5 vCPU and 1024 MB, so size the task for their combined peak use.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  HttpApiGateway,
  JsBundleImagePackaging
} from 'stacktape';
export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new JsBundleImagePackaging({
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
        packaging: new JsBundleImagePackaging({
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


The deploy prints the gateway URL, which reaches the `server` container. The `workload-internal` event opens the
`metrics` container's port to the other containers of the workload only.

## Containers

Every entry in `containers` has its own packaging, environment, health check and traffic. Two properties set the
lifecycle:

- **`essential`** (default `true`): when an essential container exits, ECS replaces the whole task. Set `false` for a
  container that is meant to exit, such as a migration.
- **`dependsOn`**: a container starts only when another reaches a condition: `START`, `COMPLETE` (exited),
  `SUCCESS` (exited with code 0) or `HEALTHY` (passed its health check).

Run migrations before the API starts:


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  HttpApiGateway,
  JsBundleImagePackaging,
  DockerfilePackaging
} from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'migrate',
        essential: false,
        packaging: new DockerfilePackaging({
          buildContextPath: './migrations',
          dockerfilePath: './Dockerfile'
        })
      },
      {
        name: 'server',
        dependsOn: [{ containerName: 'migrate', condition: 'SUCCESS' }],
        packaging: new JsBundleImagePackaging({
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


If the migration exits with a non-zero code, the API doesn't start, the task fails and ECS starts a new one. On
shutdown, each container gets `stopTimeout` seconds (default 30, at most 120) after `SIGTERM` before it is killed.

## Traffic

A multi-container workload creates no load balancer of its own. Each container lists `events` that point at a gateway
or load balancer defined elsewhere in the config, so different containers can take different traffic:

| Type | Traffic |
|---|---|
| `http-api-gateway` | HTTP from an [HTTP API Gateway](/resources/networking/http-api-gateway) |
| `application-load-balancer` | HTTP and WebSockets from an [Application Load Balancer](/resources/networking/application-load-balancer) |
| `network-load-balancer` | TCP or TLS from a [Network Load Balancer](/resources/networking/network-load-balancer) |
| `workload-internal` | Other containers of the same workload |
| `service-connect` | Other container workloads in the stack, by name |

### HTTP API Gateway

`method` and `path` are required; `'*'` and `'/{proxy+}'` send everything to the container.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  HttpApiGateway,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
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

Use a load balancer for WebSockets, routing by header, query string or source IP, a
[firewall](/resources/security/web-application-firewall) or [gradual deployments](#gradual-deployments). Rules run
from the lowest `priority` up.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  ApplicationLoadBalancer,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const alb = new ApplicationLoadBalancer({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
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


`loadBalancerHealthCheck` sets the load balancer's check for this container: by default it requests `/` every 5
seconds and waits 4 seconds for an answer. Rules also take `methods`, `hosts`, `headers`, `queryParams` and
`sourceIps`.

### Network Load Balancer

For TCP or TLS protocols such as MQTT or game servers. `listenerPort` is the load balancer's port (here `8883`),
`containerPort` the port the container listens on.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  NetworkLoadBalancer,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const nlb = new NetworkLoadBalancer({
    listeners: [{ protocol: 'TCP', port: 8883 }]
  });

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'broker',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/broker.ts' }),
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

`workload-internal` opens a port to the other containers of the workload, as the basic example shows.

`service-connect` lets other container workloads in the stack call this container by name, at
`protocol://alias:containerPort`. `alias` defaults to `<workloadName>-<containerName>`. `protocol` (`http`, `http2` or
`grpc`) adds protocol metrics such as the 5xx count.


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'api',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/api.ts' }),
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


Other services in the stack now reach it at `http://internal-api:3000`.

## Compute resources

CPU and memory belong to the task and all containers share them; you can't give one container its own limit.

**Fargate** (default): set `cpu` (0.25 to 16 vCPU) and a matching `memory`, as on the
[worker service](/resources/compute/worker-service#fargate). `architecture: 'arm64'` costs about 20% less.


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' })
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


**EC2**: set `instanceTypes`; the first listed is preferred. Stacktape replaces the instances every Sunday to apply OS
patches. EC2 suits GPU work (`g4dn`, `p3`) and sustained heavy use. `enableWarmPool: true` keeps a pre-initialized
instance ready for sudden bursts; it bills at the full instance rate while it waits.


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' })
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


x86 Fargate in us-east-1, one task running all month ([Fargate pricing](https://aws.amazon.com/fargate/pricing/)):

| vCPU | Memory | Per month |
|---|---|---|
| 0.25 | 512–2048 MB | $9–$14 |
| 0.5 | 1024–4096 MB | $18–$27 |
| 1 | 2048–8192 MB | $36–$55 |
| 2 | 4096–16384 MB | $71–$110 |
| 4 | 8192–30720 MB | $142–$213 |

## Scaling

The workload scales by whole tasks: a new task starts all its containers. It runs `minInstances` tasks (default 1)
and adds more, up to `maxInstances` (default 1), when average CPU or memory passes its target (80% by default).


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' })
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


## Packaging

Each container picks its own packaging, so a migration container can use a `dockerfile` while the API uses
`js-bundle`:

| Type | Use it for |
|---|---|
| [`js-bundle`](/packaging/containers/js-bundle) | JavaScript or TypeScript with one entry file |
| [`buildpack`](/packaging/containers/buildpack) | Other languages without a Dockerfile |
| [`dockerfile`](/packaging/containers/dockerfile) | Your own Dockerfile |
| [`prebuilt-image`](/packaging/containers/prebuilt-image) | An existing image from Docker Hub or a private registry |

## Connecting to other resources

`connectTo` applies to every container in the workload: each gets the IAM permissions, the network path and the
`STP_<RESOURCE>_<PARAM>` variables. See [Connecting resources](/configuration/connecting-resources).


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  RelationalDatabase,
  RdsEnginePostgres,
  Bucket,
  $Secret,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const myDatabase = new RelationalDatabase({
    engine: new RdsEnginePostgres({ version: '16', primaryInstance: { instanceSize: 'db.t4g.micro' } }),
    credentials: { masterUserPassword: $Secret('database', 'password') }
  });
  const myBucket = new Bucket({});

  const workload = new MultiContainerWorkload({
    connectTo: [myDatabase, myBucket],
    containers: [
      {
        name: 'server',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' })
      }
    ],
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { myDatabase, myBucket, workload } };
});
```


Here every container gets `STP_MY_DATABASE_CONNECTION_STRING` and the other database and bucket variables.

## Health checks

Each container can have two checks:

- **`loadBalancerHealthCheck`**, for containers behind a load balancer: the load balancer stops sending traffic to
  unhealthy tasks. A Network Load Balancer checks the TCP port by default; `healthCheckProtocol: 'HTTP'` checks a path.
- **`internalHealthCheck`**: ECS runs a command inside the container and replaces the task when an essential container
  fails it `retries` times in a row.


Example (TypeScript):

```typescript
import { defineConfig, MultiContainerWorkload, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
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


Defaults: `intervalSeconds` 30, `timeoutSeconds` 5, `retries` 3. `startPeriodSeconds` ignores failures while the
container starts.

## EFS storage

Containers mount an [EFS file system](/resources/storage/efs-filesystem) for files that outlive the task or that
containers share, such as model weights. EFS bills for storage and for reads and writes on top of the task.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  EfsFilesystem,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const uploads = new EfsFilesystem({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
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


`rootDirectory` (default `/`) mounts a directory of the file system.

## Gradual deployments

A gradual deployment shifts traffic to the new version step by step and rolls back on failure. It needs a container
with an `application-load-balancer` event. Strategies: `Canary10Percent5Minutes`, `Canary10Percent15Minutes`,
`Linear10PercentEvery1Minutes`, `Linear10PercentEvery3Minutes` and `AllAtOnce`. Each one except `AllAtOnce` makes the
deploy take longer by its wait time.


Example (TypeScript):

```typescript
import {
  defineConfig,
  MultiContainerWorkload,
  ApplicationLoadBalancer,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const alb = new ApplicationLoadBalancer({});

  const workload = new MultiContainerWorkload({
    containers: [
      {
        name: 'server',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
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


`beforeAllowTrafficFunction` and `afterTrafficShiftFunction` run checks before and after the shift. See
[Gradual deployments](/deployment-and-lifecycle/gradual-deployments).

## Private subnets and NAT

Containers run in public subnets with a public IP address by default and reach the internet directly.
`usePrivateSubnetsWithNAT: true` moves the task to private subnets and sends outbound traffic through NAT, for example
when a partner API allowlists your IP addresses.

The flag requires `stackConfig.nat`, which decides the NAT device, its cost and the outbound IP addresses: one
Stacktape-managed instance (`ec2`, about $7 a month), one per availability zone with failover (`ha-ec2`), or AWS NAT
Gateways (`gateway`, about $32 a month per zone plus $0.045 per GB). See
[VPC and networking](/configuration/connecting-resources#vpc-and-networking).

## Logging

Each container's output goes to CloudWatch Logs, kept for 90 days by default. `logging` on a container changes its
retention, turns it off or sets up [log forwarding](/observability/log-forwarding). Read logs with
[`stacktape logs`](/cli/logs).

## Remote sessions

`enableRemoteSessions: true` lets you open a shell in a running container with
[`stacktape container shell`](/cli/container-session). It adds a small Systems Manager agent container.

## Configuration reference


### Definition: `ContainerWorkloadProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/multi-container-workload` with definition name `ContainerWorkloadProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `containers` | yes | `Array<ContainerWorkloadContainer>` | - |
| `resources` | yes | `ContainerWorkloadResourcesConfig` | - |
| `connectTo` | no | `Array<string>` | - |
| `deployment` | no | `ContainerWorkloadDeploymentConfig` | - |
| `enableRemoteSessions` | no | `boolean` | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | - |
| `releaseCommand` | no | `ReleaseCommand \| option-2` | - |
| `scaling` | no | `ContainerWorkloadScaling` | - |
| `tracing` | no | `TracingOptions \| option-2` | - |
| `usePrivateSubnetsWithNAT` | no | `boolean` | `false` |


## Referenceable parameters


## Referenceable Parameters: `multi-container-workload`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
