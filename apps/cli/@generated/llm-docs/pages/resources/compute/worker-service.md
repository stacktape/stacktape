# Worker service

A worker service runs an always-on container with no URL: a queue consumer, a polling loop or a background job
runner. It runs on ECS (Fargate by default, or EC2) in your stack's VPC and can reach your databases, queues and the
internet.

At least one container runs and bills all the time. A task with 0.5 vCPU and 1 GB costs about $18 a month on x86
Fargate in us-east-1, and Graviton (`arm64`) about 20% less ([Fargate pricing](https://aws.amazon.com/fargate/pricing/)).
For work that arrives in bursts with long quiet gaps, a [Lambda function](/resources/compute/lambda-function) with an
[SQS trigger](/resources/triggers/sqs-events) costs nothing while idle. For a container other services call, use a
[private service](/resources/compute/private-service); for one with a public URL, a
[web service](/resources/compute/web-service); for work that finishes, a [batch job](/resources/compute/batch-job).

## Basic example

A worker needs `packaging`, which builds the container image, and `resources`, which sizes it.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, JsBundleImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({
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


`JsBundleImagePackaging` bundles `./src/worker.ts` into a small image. `cpu: 0.5` and `memory: 1024` size the Fargate
task. The deploy starts one container; read its output with `stacktape logs worker --stage dev`.

## Compute resources

Fargate runs the container without servers to manage: you set `cpu` and `memory`. EC2 runs it on instances
Stacktape manages: you set `instanceTypes`. Start with Fargate.

### Fargate

`architecture: 'arm64'` runs the task on Graviton, about 20% cheaper than the default `x86_64`, if your image and
native dependencies support ARM.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
    resources: {
      cpu: 1,
      memory: 2048,
      architecture: 'arm64'
    }
  });

  return { resources: { worker } };
});
```


`cpu` and `memory` must be one of the Fargate combinations:

| vCPU | Memory |
|---|---|
| 0.25 | 512–2048 MB |
| 0.5 | 1024–4096 MB |
| 1 | 2048–8192 MB |
| 2 | 4096–16384 MB |
| 4 | 8192–30720 MB |
| 8 | 16384–61440 MB |
| 16 | 32768–122880 MB |

Check real CPU and memory use with [`stacktape metrics`](/cli/metrics) and resize from there.

### EC2

`instanceTypes` lists the instance types to use; the first one is preferred. `enableWarmPool: true` keeps a
pre-initialized instance ready so scaling is faster (one instance type only).


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
    resources: {
      instanceTypes: ['c6g.large'],
      enableWarmPool: true
    }
  });

  return { resources: { worker } };
});
```


EC2 pays off for sustained heavy CPU use, GPUs or a specific instance family. For most workers, Fargate is simpler and
the price difference is small.

## Scaling

One container runs by default (`minInstances` and `maxInstances` are 1). To scale, raise `maxInstances` and set a
target for average CPU or memory use; ECS adds containers above the target and removes them below it.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
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


Both targets are 80% by default. For queue consumers, CPU usually follows the queue depth. Lower the target for more
headroom, or raise it for I/O-bound workers whose CPU stays low under load.

Each extra container runs and bills all the time, and each one is another consumer for your database or API. Raise
`minInstances` only after checking that they can take it.

## Packaging

Pick how the image is built:

| Type | Use it for |
|---|---|
| [`js-bundle`](/packaging/containers/js-bundle) | JavaScript or TypeScript with one entry file. Stacktape bundles it into a small image. |
| [`buildpack`](/packaging/containers/buildpack) | Other languages without a Dockerfile: Python, Go, Rust, Java, PHP, Ruby, .NET and more |
| [`dockerfile`](/packaging/containers/dockerfile) | Your own Dockerfile, for system packages such as `ffmpeg` or Chromium |
| [`prebuilt-image`](/packaging/containers/prebuilt-image) | An image another pipeline already built |

## Connecting resources

`connectTo` grants IAM permissions, opens the network path to databases and Redis, and injects
`STP_<RESOURCE>_<PARAM>` environment variables.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WorkerService,
  SqsQueue,
  RelationalDatabase,
  RdsEnginePostgres,
  JsBundleImagePackaging
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
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    connectTo: [jobsQueue, mainDatabase]
  });

  return { resources: { jobsQueue, mainDatabase, worker } };
});
```


This worker gets `STP_JOBS_QUEUE_URL`, `STP_JOBS_QUEUE_ARN` and `STP_JOBS_QUEUE_NAME` for the queue, and
`STP_MAIN_DATABASE_CONNECTION_STRING`, `STP_MAIN_DATABASE_HOST`, `STP_MAIN_DATABASE_PORT` and the other database
variables. [Connecting resources](/configuration/connecting-resources) lists them per resource type. For AWS services
that `connectTo` doesn't cover, such as Bedrock, add `iamRoleStatements`.

### Consuming an SQS queue

A container reads the queue itself: it asks for messages, processes them and deletes each one it finished. A message it
doesn't delete comes back after the queue's visibility timeout and is processed again, so make the processing safe to
repeat.

```ts
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});
const queueUrl = process.env.STP_JOBS_QUEUE_URL!;
let running = true;
process.on('SIGTERM', () => (running = false));

while (running) {
  const { Messages = [] } = await sqs.send(
    new ReceiveMessageCommand({ QueueUrl: queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20 })
  );
  for (const message of Messages) {
    await handleJob(JSON.parse(message.Body!));
    await sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle! }));
  }
}
```

`WaitTimeSeconds: 20` makes each request wait for messages instead of polling an empty queue. To test it, send one
message from the SQS console and watch `stacktape logs worker --stage dev`. If you'd rather not run a loop, a
[Lambda function with an SQS trigger](/resources/triggers/sqs-events) receives and deletes messages for you.

## Health checks

ECS replaces a container that exits. A health check also replaces one that keeps running but stopped working, for
example a polling loop that lost its connection. ECS runs the command inside the container; exit code 0 means healthy.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
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


`intervalSeconds` (default 30) is how often the check runs, `retries` (default 3) how many failures in a row replace the
container, and `startPeriodSeconds` how long after start failures don't count. Set it to at least your worker's start
time.

## Graceful shutdown

On a deploy or scale-in, ECS sends `SIGTERM`, waits `stopTimeout` seconds (default 30, 2 to 120) and then kills the
container. Handle `SIGTERM`: stop taking new messages, finish the current one and exit.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    stopTimeout: 60
  });

  return { resources: { worker } };
});
```


Raise `stopTimeout` when one message can take longer than about 20 seconds. A full deployment waits until the old
workers have stopped. A [fast deployment](/deployment-and-lifecycle/deploying-stacks#fast-deployments), when only code
changed, finishes once the new workers pass their `internalHealthCheck` (or, without one, 40 seconds after they start)
and lets the old ones shut down in the background.

## Side containers

`sideContainers` runs helper containers in the same task:

- **`run-on-init`** must exit with code 0 before the worker starts. Use it for migrations or one-time setup.
- **`always-running`** runs next to the worker for its whole life, for example a log or monitoring agent the worker
  reaches on `localhost`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WorkerService,
  JsBundleImagePackaging,
  DockerfilePackaging
} from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 1, memory: 2048 },
    sideContainers: [
      {
        name: 'migrate',
        containerType: 'run-on-init',
        packaging: new DockerfilePackaging({
          buildContextPath: './migrations'
        })
      },
      {
        name: 'log-forwarder',
        containerType: 'always-running',
        packaging: new DockerfilePackaging({
          buildContextPath: './log-forwarder'
        })
      }
    ]
  });

  return { resources: { worker } };
});
```


Side containers share the task's CPU and memory. For several containers with their own traffic and settings, use a
[multi-container workload](/resources/compute/multi-container-workload).

## EFS storage

Mount an [EFS file system](/resources/storage/efs-filesystem) for files that must survive container replacement or be
shared between containers, such as model files.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WorkerService,
  EfsFilesystem,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const sharedData = new EfsFilesystem({});

  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
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


`rootDirectory` (default `/`) mounts a directory of the file system. For state, a database, queue or bucket is usually
the better place.

## Private subnets and NAT

By default the container runs in a public subnet with a public IP address and reaches the internet directly.
`usePrivateSubnetsWithNAT: true` moves it to private subnets, with no public address, and sends its outbound traffic
through NAT. Use it when an external API allowlists your IP addresses or your security policy forbids public IPs.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    usePrivateSubnetsWithNAT: true
  });

  return { resources: { worker } };
});
```


The flag requires `stackConfig.nat`, which decides the NAT device, its cost and its outbound IP addresses: one
Stacktape-managed instance (`ec2`, about $7 a month), one per availability zone with failover (`ha-ec2`), or AWS NAT
Gateways (`gateway`, about $32 a month per zone plus $0.045 per GB). The deploy fails without it. See
[VPC and networking](/configuration/connecting-resources#vpc-and-networking).

## Logging

The container's stdout and stderr go to CloudWatch Logs, kept for 90 days by default (`logging.retentionDays`). Read
them with [`stacktape logs`](/cli/logs). Log the job or message ID with each line so you can follow one job.
[Log forwarding](/observability/log-forwarding) sends logs to Datadog, Splunk and other services.

## Remote sessions

`enableRemoteSessions: true` lets you open a shell in a running container with
[`stacktape container shell`](/cli/container-session), for example to inspect a stuck worker. It adds a small Systems
Manager agent container. Turn it on for stages where you debug, not as a routine production tool.


Example (TypeScript):

```typescript
import { defineConfig, WorkerService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    enableRemoteSessions: true
  });

  return { resources: { worker } };
});
```


## Configuration reference


### Definition: `WorkerServiceProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/worker-service` with definition name `WorkerServiceProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `packaging` | yes | `js-bundle \| prebuilt-image \| dockerfile \| buildpack` | - |
| `resources` | yes | `ContainerWorkloadResourcesConfig` | - |
| `connectTo` | no | `Array<string>` | - |
| `enableRemoteSessions` | no | `boolean` | `false` |
| `environment` | no | `Array<EnvironmentVar>` | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | - |
| `internalHealthCheck` | no | `ContainerHealthCheck` | - |
| `logging` | no | `ContainerWorkloadContainerLogging` | - |
| `releaseCommand` | no | `ReleaseCommand \| option-2` | - |
| `scaling` | no | `ContainerWorkloadScaling` | - |
| `secrets` | no | `Array<SecretEnvironmentVar>` | - |
| `sideContainers` | no | `Array<ServiceHelperContainer>` | - |
| `stopTimeout` | no | `number` | `30` |
| `tracing` | no | `TracingOptions \| option-2` | - |
| `usePrivateSubnetsWithNAT` | no | `boolean` | `false` |
| `volumeMounts` | no | `Array<ContainerEfsMount>` | - |


## Referenceable parameters


## Referenceable Parameters: `worker-service`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
