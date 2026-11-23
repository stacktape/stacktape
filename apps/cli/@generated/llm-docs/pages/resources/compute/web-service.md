# Web service

A web service runs your app in a container with a public HTTPS URL: an API, a backend web app or any HTTP server
that stays running. It runs on ECS (Fargate by default, or EC2), and Stacktape adds the load balancing, TLS, scaling,
health checks and logs.

At least one container runs and bills all the time: 0.5 vCPU and 1 GB cost about $18 a month on x86 Fargate in
us-east-1, plus $1 per million requests through the default HTTP API Gateway. For code that should cost nothing while
idle, use a [Lambda function](/resources/compute/lambda-function). For a container only your other services call, use
a [private service](/resources/compute/private-service).

## Basic example


Example (TypeScript):

```typescript
import { defineConfig, WebService, JsBundleImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({
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


`JsBundleImagePackaging` bundles `./src/server.ts` into a small image; your server listens on the port in the `PORT`
environment variable (3000). `cpu` and `memory` size the Fargate task. Traffic comes through an HTTP API Gateway, so
the service needs no load balancer.

The deploy prints the service URL (`https://<api-id>.execute-api.<region>.amazonaws.com`). Open it, and read the
container output with `stacktape logs api --stage dev`.

## Traffic

`loadBalancing.type` picks how traffic reaches the containers:

| Mode | Use it for | Cost |
|---|---|---|
| `http-api-gateway` (default) | Most HTTP APIs and web apps | $1 per million requests |
| `application-load-balancer` | WebSockets, gradual deployments, `useFirewall`, high steady traffic | About $16 a month plus capacity units |
| `network-load-balancer` | TCP or TLS protocols such as MQTT | About $16 a month plus capacity units |

The load balancer gets cheaper than the gateway from about 20 million requests a month; see
[the comparison](/resources/networking/http-api-gateway#choosing-between-http-api-gateway-and-a-load-balancer). The
gateway also limits each request to 30 seconds.

With `application-load-balancer`, the load balancer checks `/` every 5 seconds (4-second timeout); change that in
`loadBalancing.properties`. Without `customDomains`, a load balancer is served on a `*.stacktape-app.com` domain that
the [Stacktape Console](/getting-started/add-the-console) provides; without the Console connected, add a
[custom domain](#domains-and-cors) or the deploy stops and asks for one.


Example (TypeScript):

```typescript
import { defineConfig, WebService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
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


With `network-load-balancer`, list the `ports`: each sets the public port, the protocol (`TLS` by default, or `TCP`)
and, if it differs, the `containerPort`. Like the Application Load Balancer, a `TLS` port needs a custom domain when
the Console isn't connected.


Example (TypeScript):

```typescript
import { defineConfig, WebService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const broker = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/broker.ts' }),
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


`healthCheckProtocol: 'TCP'` checks that the port accepts connections; use `HTTP` only if the container serves a
health path.

## Domains and CORS

<span id="custom-domain-names" />

[Set up the domain](/resources/networking/custom-domains#set-up-the-domain) with `stacktape domain add` once, then
list it in `customDomains`. The deploy uses the issued certificate and creates the DNS record.


Example (TypeScript):

```typescript
import { defineConfig, WebService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
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


`disableDnsRecordCreation: true` skips the DNS record when you manage DNS elsewhere, and `customCertificateArn` uses a
certificate you manage; see [External DNS](/resources/networking/custom-domains#external-dns).

`cors` works only with the default `http-api-gateway` mode. It replaces the CORS headers your app returns, so keep
CORS in your app when it differs by route.

## CDN

`cdn` puts CloudFront in front of the service. It helps when responses are cacheable or users are far from your
region; for dynamic APIs, start without it. See [CDN](/resources/networking/cdn) for caching and routing.

`useFirewall` attaches a regional [firewall](/resources/security/web-application-firewall) to the service's Application
Load Balancer (only with `application-load-balancer`). `cdn.useFirewall` attaches a `cdn` firewall to CloudFront.

## Compute resources

Fargate (default) runs the container without servers to manage; you set `cpu` and `memory`. Graviton
(`architecture: 'arm64'`) costs about 20% less than x86.


Example (TypeScript):

```typescript
import { defineConfig, WebService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
    resources: {
      cpu: 1,
      memory: 2048
    }
  });

  return { resources: { api } };
});
```


EC2 runs it on instances Stacktape manages; you set `instanceTypes`, for specific instance families, GPUs or cheaper
sustained heavy use. List several types for capacity flexibility, and match the image architecture: `c6g.large` is
Graviton.


Example (TypeScript):

```typescript
import { defineConfig, WebService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
    resources: {
      instanceTypes: ['c6g.large']
    }
  });

  return { resources: { api } };
});
```


## Scaling

The service runs `minInstances` containers at all times and adds more, up to `maxInstances`, when average CPU or memory
passes its target. Requests are spread across healthy containers.


Example (TypeScript):

```typescript
import { defineConfig, WebService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
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


`minInstances` is your baseline cost. Keep it at 1 on non-production stages; the service never scales to zero.

## Packaging

Start with `js-bundle` for JavaScript or TypeScript with one entry file, and `buildpack` for everything else.

| Type | Use it for |
|---|---|
| [`js-bundle`](/packaging/containers/js-bundle) | JavaScript or TypeScript with one entry file. Stacktape bundles it into a small image. |
| [`buildpack`](/packaging/containers/buildpack) | Other languages and frameworks without a Dockerfile: Python, Go, Rust, Java, PHP, Ruby, .NET, Next.js and more |
| [`dockerfile`](/packaging/containers/dockerfile) | Your own Dockerfile |
| [`prebuilt-image`](/packaging/containers/prebuilt-image) | An image another pipeline already built |

`js-bundle` images are based on Alpine. Set `requiresGlibcBinaries` when native dependencies such as `sharp`, `canvas`,
`bcrypt` or `puppeteer` need glibc. A `buildpack` service must listen on `PORT`; set `startCommand` if the detected
start command doesn't.

### Port

Stacktape sends traffic to the port in the `PORT` variable, 3000 by default. If your app listens on a fixed port, such
as `app.listen(8080)` or Spring Boot's 8080, set `port` instead of changing the code. `stacktape init` sets it when it
finds a fixed port. With `network-load-balancer`, `ports[].containerPort` sets it instead.

Changing `port` on a deployed service replaces the resources that route to it, so requests can fail during that
deploy.


Example (TypeScript):

```typescript
import { defineConfig, WebService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({
      entryfilePath: './src/server.ts'
    }),
    port: 8080,
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


## Connecting to other resources

`connectTo` grants IAM permissions, opens the network path to databases and Redis, and injects
`STP_<RESOURCE>_<PARAM>` environment variables.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WebService,
  RelationalDatabase,
  RdsEnginePostgres,
  Bucket,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const myDatabase = new RelationalDatabase({
    credentials: { masterUserPassword: "$Secret('db', 'password')" },
    engine: new RdsEnginePostgres({ version: '16', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });

  const uploadsBucket = new Bucket({});

  const api = new WebService({
    connectTo: [myDatabase, uploadsBucket],
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 }
  });

  return { resources: { myDatabase, uploadsBucket, api } };
});
```


The service gets `STP_MY_DATABASE_CONNECTION_STRING`, `STP_MY_DATABASE_HOST`, `STP_MY_DATABASE_PORT` and the other
database variables, plus `STP_UPLOADS_BUCKET_NAME` and `STP_UPLOADS_BUCKET_ARN`.
[Connecting resources](/configuration/connecting-resources) lists them per resource type. Put your own settings in
`environment`, secrets in [`$Secret()`](/configuration/secrets), and use `iamRoleStatements` for AWS services
`connectTo` doesn't cover.

## Health checks

There are two kinds:

- **Load balancer health check** (`application-load-balancer` and `network-load-balancer`): decides whether a container
  gets traffic. Configure it under `loadBalancing.properties`. A Network Load Balancer checks TCP or HTTP;
  `healthcheckPath` applies only to HTTP.
- **`internalHealthCheck`**: ECS runs a command inside the container and replaces the container when it keeps failing.
  It catches a process that runs but is broken, for example with a dead database pool. Keep the command cheap and
  local; a check that depends on a slow external service replaces healthy containers.

The default `http-api-gateway` mode has no load balancer check. Stacktape can tell that a new container runs, not that
your app works. Add an `internalHealthCheck` and a failing release stops the deploy and rolls it back. For a Node.js
app on port 3000:
`internalHealthCheck: { healthCheckCommand: ['CMD', 'node', '-e', "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"] }`.
Use a command your image has and an endpoint that succeeds only when the app is ready.

## How deploys replace containers

A deploy starts the new containers next to the old ones. Once every new container passes its health check, the old
containers stop receiving new requests, get 30 seconds to finish the requests they are handling, and shut down: ECS
sends `SIGTERM` and, if the process is still running after `stopTimeout` (default 30 seconds), `SIGKILL`. Handle
`SIGTERM` in your app so an old container exits once its requests are done. An app that ignores the signal keeps a full
deploy waiting for the whole `stopTimeout`.

A full deployment finishes after the old containers have stopped, because CloudFormation waits for that. A
[fast deployment](/deployment-and-lifecycle/deploying-stacks#fast-deployments), which Stacktape uses when only your code
changed, lets the old containers drain and shut down in the background. When it finishes depends on your health checks
and load balancing:

- **Default `http-api-gateway`, no `internalHealthCheck`:** the deploy finishes once every new task is `RUNNING` and
  API Gateway can route to it, plus 4 seconds. Only tasks from the new deployment count; an old task still draining
  cannot satisfy this check. API Gateway sends requests to a new container within about 2 seconds of its start, even
  before your app listens. This confirms that the containers started, not that your app works: an app that stays
  running without listening, or returns errors, can still count as deployed.
- **Default `http-api-gateway` with `internalHealthCheck`:** the deploy finishes 4 seconds after every new container
  has passed its check and API Gateway can route to it. A failing check stops the deploy and rolls it back. In our
  measurements, the first request reached the new containers at most 2.2 seconds after they became routable, and ECS
  removed the old containers from Cloud Map 8 to 22 seconds after the new ones passed the check.
- **Behind an `application-load-balancer` or `network-load-balancer`:** the deploy finishes 4 seconds after the load
  balancer reports every new container healthy in each of its target groups. The load balancer starts sending
  requests a few seconds after that: 1 to 3 seconds for an application load balancer in our measurements; we have not
  measured network load balancers. Old containers keep receiving part of the requests until ECS removes them from the
  load balancer. Without an `internalHealthCheck`, that happens about 50 seconds after the deploy finishes, because ECS
  counts a new container healthy only after it has run for 40 seconds. With one, it happened 15 to 40 seconds after the
  new containers turned healthy.
- **First deploy with Stacktape v4 (`http-api-gateway`):** v4 protects old containers behind API Gateway while they
  shut down (see below). The first deployment that adds this protection still retires old containers without it. Keep
  an application shutdown delay for that one deployment, or deploy in a maintenance window.
- **With [gradual deployments](#gradual-deployments):** the deploy follows the CodeDeploy traffic-shifting strategy
  instead, and containers keep a 5-second drain and a 2-second default `stopTimeout`.

Stacktape does not check that requests already reach the new containers when a fast deployment finishes; no AWS API
shows that moment. The 4 seconds are an allowance for routing to catch up.

### Old containers behind API Gateway

With the default `http-api-gateway` load balancing, API Gateway finds containers through AWS Cloud Map and has no
health check of its own. It sends requests to the containers Cloud Map returns: the healthy ones or, while none is
healthy, all of them. Without an `internalHealthCheck`, ECS registers a new container as healthy as soon as it starts.
With one, ECS registers it as unhealthy and marks it healthy once the check passes, and Cloud Map applies that change
seconds to a minute later. Once ECS removes the old containers from Cloud Map, it returns only the new ones.

API Gateway can keep routing requests to an old container after ECS removes it from Cloud Map. To cover that, Stacktape
adds a small `stp-cloudmap-drain` container to tasks behind an HTTP API:

- ECS stops this container first. It waits 35 seconds before ECS signals your application containers, so your app can
  then close its server on `SIGTERM` and use its own `stopTimeout` to finish in-flight work.
- Code-only deploys keep their completion timing: this delay runs in the background and does not add a readiness check.
  Full CloudFormation deploys, scale-in and deletion take about 36 seconds longer per stopped task; tasks stopped in
  parallel wait in parallel.
- The delay is 35 seconds. To raise it, use task definition `overrides` to change the drain container's command and
  raise its `StopTimeout` above the new delay.
- The container is non-essential. If it exits unexpectedly, your app keeps running but loses this protection.
- It uses a digest-pinned BusyBox image that Stacktape copies once into the stack's private ECR repository, for both
  amd64 and arm64, without Docker. Later deploys reuse the cached images, and task starts pull only from private ECR.
- The privileged Console connection role already allows this copy. Restricted deployer roles need
  `ecr:BatchGetImage`, `ecr:BatchCheckLayerAvailability`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`,
  `ecr:CompleteLayerUpload` and `ecr:PutImage` on the stack's deployment repository, even when all application images
  are prebuilt.
- Upgrade the CLI for your whole team and on Console runners before you deploy with this helper. Older CLIs can delete
  its cached images during image retention.

## Side containers

`sideContainers` runs helper containers in the same task, sharing its CPU and memory:

- **`run-on-init`** must exit with code 0 before the service starts, for example migrations.
- **`always-running`** runs for the whole life of the task, for example a log or monitoring agent the service reaches
  on `localhost`. If it crashes, the task is replaced.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WebService,
  JsBundleImagePackaging,
  DockerfilePackaging
} from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    sideContainers: [
      {
        name: 'migrations',
        containerType: 'run-on-init',
        packaging: new DockerfilePackaging({
          buildContextPath: './migrations',
          dockerfilePath: './Dockerfile'
        })
      }
    ]
  });

  return { resources: { api } };
});
```


For several containers that each take their own traffic, use a
[multi-container workload](/resources/compute/multi-container-workload).

## EFS storage

Mount an [EFS file system](/resources/storage/efs-filesystem) for files that must survive container replacement or be
shared between containers, such as uploads or model files. For most files, S3 is cheaper and simpler.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WebService,
  EfsFilesystem,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const uploads = new EfsFilesystem({});

  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
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


`rootDirectory` mounts a directory of the file system and `readOnly` mounts it read-only. `stacktape dev` doesn't mount
EFS, so test persistence and read-only mounts on a deployed stage.

## Gradual deployments

With `loadBalancing.type: 'application-load-balancer'`, `deployment.strategy` shifts traffic to a new release step by
step (canary or linear) and rolls back on failure. Use it for production services where a bad release should reach
only part of the traffic. See [Gradual deployments](/deployment-and-lifecycle/gradual-deployments) for the strategies.


Example (TypeScript):

```typescript
import { defineConfig, WebService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    loadBalancing: { type: 'application-load-balancer' },
    deployment: { strategy: 'Linear10PercentEvery3Minutes' }
  });

  return { resources: { api } };
});
```


## Private subnets and NAT

Containers run in public subnets with a public IP address by default and reach the internet directly.
`usePrivateSubnetsWithNAT: true` removes the public address and sends outbound traffic through NAT, for example when
an external API allowlists your IP addresses.


Example (TypeScript):

```typescript
import { defineConfig, WebService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    usePrivateSubnetsWithNAT: true
  });

  return {
    resources: { api },
    stackConfig: { nat: 'ha-ec2' }
  };
});
```


The flag requires `stackConfig.nat`, which decides the NAT device, its cost and the outbound IP addresses: one
Stacktape-managed instance (`ec2`, about $7 a month), one per availability zone with failover (`ha-ec2`, two zones by
default), or AWS NAT Gateways (`gateway`, about $32 a month per zone plus $0.045 per GB). See
[VPC and networking](/configuration/connecting-resources#vpc-and-networking).

## Logging

Container output goes to CloudWatch Logs, kept for 90 days by default (`logging.retentionDays`). Read it with
[`stacktape logs`](/cli/logs), or send it elsewhere with [log forwarding](/observability/log-forwarding).

## Remote sessions

`enableRemoteSessions: true` lets you open a shell in a running container with
[`stacktape container shell`](/cli/container-shell), for example to check a live process or network reachability.
It adds a small Systems Manager agent container.


Example (TypeScript):

```typescript
import { defineConfig, WebService, JsBundleImagePackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/server.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    enableRemoteSessions: true
  });

  return { resources: { api } };
});
```


## In-place code swap

`codeSwap: true` opts into [in-place code swaps](/deployment-and-lifecycle/code-swap): a code-only deploy replaces the
code inside the running containers instead of starting new ones. It supports Node.js and Python on x86 Fargate behind an
HTTP API or an Application Load Balancer, up to ten tasks. Old and new processes share memory for a moment, so a sudden
jump in memory use can fail requests. Services it doesn't support deploy a new image as usual.

## Configuration reference


### Definition: `WebServiceProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/web-service` with definition name `WebServiceProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `packaging` | yes | `js-bundle \| prebuilt-image \| dockerfile \| buildpack` | - |
| `resources` | yes | `ContainerWorkloadResourcesConfig` | - |
| `alarms` | no | `Array<ApplicationLoadBalancerAlarm \| HttpApiGatewayAlarm>` | - |
| `cdn` | no | `CdnConfiguration` | - |
| `codeSwap` | no | `boolean` | `false` |
| `connectTo` | no | `Array<string>` | - |
| `cors` | no | `HttpApiCorsConfig` | - |
| `customDomains` | no | `Array<DomainConfiguration>` | - |
| `deployment` | no | `ContainerWorkloadDeploymentConfig` | - |
| `disabledGlobalAlarms` | no | `Array<string>` | - |
| `enableRemoteSessions` | no | `boolean` | `false` |
| `environment` | no | `Array<EnvironmentVar>` | - |
| `iamRoleStatements` | no | `Array<StpIamRoleStatement>` | - |
| `internalHealthCheck` | no | `ContainerHealthCheck` | - |
| `loadBalancing` | no | `http-api-gateway \| application-load-balancer \| network-load-balancer` | - |
| `logging` | no | `ContainerWorkloadContainerLogging` | - |
| `port` | no | `number` | `3000` |
| `releaseCommand` | no | `ReleaseCommand \| option-2` | - |
| `scaling` | no | `ContainerWorkloadScaling` | - |
| `secrets` | no | `Array<SecretEnvironmentVar>` | - |
| `sideContainers` | no | `Array<ServiceHelperContainer>` | - |
| `stopTimeout` | no | `number` | `30` |
| `tracing` | no | `TracingOptions \| option-2` | - |
| `useFirewall` | no | `string` | - |
| `usePrivateSubnetsWithNAT` | no | `boolean` | `false` |
| `volumeMounts` | no | `Array<ContainerEfsMount>` | - |


## Referenceable parameters


## Referenceable Parameters: `web-service`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `domain` | Web service default domain name | `$ResourceParam("<<resource-name>>", "domain")` |
| `url` | Web service default URL | `$ResourceParam("<<resource-name>>", "url")` |
| `customDomains` | Comma-separated list of custom domain names assigned to the Web Service (only available if you use [custom domain names](/resources/networking/custom-domains/)) | `$ResourceParam("<<resource-name>>", "customDomains")` |
| `customDomainUrls` | Comma-separated list of custom domain name URLs (only available if you use [custom domain names](/resources/networking/custom-domains/)) | `$ResourceParam("<<resource-name>>", "customDomainUrls")` |
| `cdnDomain` | Default domain of the [CDN distribution](/resources/networking/cdn/) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnDomain")` |
| `cdnUrl` | Default url of the [CDN distribution](/resources/networking/cdn/) (only available if you DO NOT configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnUrl")` |
| `cdnCustomDomains` | Comma-separated list of custom domain names assigned to the [CDN](/resources/networking/cdn/) (only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomains")` |
| `cdnCustomDomainUrls` | Comma-separated list of custom domain name URLs of the [CDN](/resources/networking/cdn/) (only available if you configure custom domain names for the CDN). | `$ResourceParam("<<resource-name>>", "cdnCustomDomainUrls")` |
