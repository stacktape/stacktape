# Websocket API with Socket.io and Redis

- This project deploys a simple Websocket API built using [Socket.io](https://socket.io/).
- The application runs in a [container workload](https://docs.stacktape.com/resources/container-workloads/) and uses
  [Upstash redis](https://docs.stacktape.com/resources/upstash-redis-databases/) to store the session data. The requests
  are routed using [Application Load Balancer](https://docs.stacktape.com/resources/application-load-balancers/).
- The Websocket API is work as expected even if horizontally scaled (multiple parallel instances can be added).

## Pricing

- Fixed price resources:

  - **Container workload** (~$0.012/hour, ~$9/month)

- There are also other resources that might incur costs (with pay-per-use pricing). If your load won't get high, the costs will be close to $0.
- You can also control your cloud spend using [budget control](https://docs.stacktape.com/configuration/budget-control/).

## Prerequisites

If you're deploying from your local machine (not from a CI/CD pipeline), you need the following prerequisites:

- Upstash account. To create one, navigate to [Upstash console](https://console.upstash.com/login).
- Stacktape installed. To install it, you can follow the [installation instructions](https://docs.stacktape.com/getting-started/setup-stacktape/).
- Docker. To install Docker on your system, you can follow [this guide](https://docs.docker.com/get-docker/).

- Node.js installed.
- **(optional) install [Stacktape VSCode extension](https://marketplace.visualstudio.com/items?itemName=stacktape.vscode-stacktape) with
  validation, autocompletion and on-hover documentation.**

## 1. Generate your project

The command below will bootstrap the project with pre-built application code and pre-configured `stacktape.yml` config file.

```bash
stp init --projectId socketio-websocket-api-redis
```

## 2. Deploy your stack

- To provision all the required infrastructure and to deploy your application to the cloud, all you need is a single
  command.
- The deployment will take ~5-15 minutes. Subsequent deploys will be significantly faster.

```bash
stp deploy --stage <<stage>> --region <<region>>
```

`stage` is an arbitrary name of your environment (for example **staging**, **production** or **dev-john**)

`region` is the AWS region, where your stack will be deployed to. All the available regions are listed below.

<br />

| Region name & Location     | code           |
| -------------------------- | -------------- |
| Europe (Ireland)           | eu-west-1      |
| Europe (London)            | eu-west-2      |
| Europe (Frankfurt)         | eu-central-1   |
| Europe (Milan)             | eu-south-1     |
| Europe (Paris)             | eu-west-3      |
| Europe (Stockholm)         | eu-north-1     |
| US East (Ohio)             | us-east-2      |
| US East (N. Virginia)      | us-east-1      |
| US West (N. California)    | us-west-1      |
| US West (Oregon)           | us-west-2      |
| Canada (Central)           | ca-central-1   |
| Africa (Cape Town)         | af-south-1     |
| Asia Pacific (Hong Kong)   | ap-east-1      |
| Asia Pacific (Mumbai)      | ap-south-1     |
| Asia Pacific (Osaka-Local) | ap-northeast-3 |
| Asia Pacific (Seoul)       | ap-northeast-2 |
| Asia Pacific (Singapore)   | ap-southeast-1 |
| Asia Pacific (Sydney)      | ap-southeast-2 |
| Asia Pacific (Tokyo)       | ap-northeast-1 |
| China (Beijing)            | cn-north-1     |
| China (Ningxia)            | cn-northwest-1 |
| Middle East (Bahrain)      | me-south-1     |
| South America (São Paulo)  | sa-east-1      |

## 3. Test your application

After a successful deployment, some information about the stack will be printed to the console (**URLs** of the deployed services, links to **logs**, **metrics**, etc.).

- This project includes a pre-made test script that creates 100 websocket connections and emits a message to all of
  them. To run it, use

```bash
stacktape script:run --scriptName broadcastTest --stage <<your-previously-deployed-stage>> --region <<your-previously-used-region>>
```

## 4. Run the application in development mode

To run a container in the development mode (locally on your machine), you can use the
[cw:run-local command](https://docs.stacktape.com/cli/commands/cw-run-local/).

```bash
stp cw:run-local --region <<your-region>> --stage <<stage>> --resourceName websocketServer --container socketio-server
```

Stacktape runs the container as closely to the deployed version as possible:

- Maps all of the container ports specified in the `events` section to the host machine.
- Injects parameters referenced in the environment variables by `$ResourceParam` and `$Secret` directives to the
  running container.
- Injects credentials of the [assumed role](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) to
  the container. This means that your locally running container will have the exact same IAM permissions as the deployed
  version.
- Pretty-prints logs (stdout/stderr) produced by the container to the terminal.

<br />

The container is rebuilt and restarted, when you either:

- type `rs + enter` to the terminal
- use the `--watch` option and one of your source code files changes

## 5. Delete your stack

- If you no longer want to use your stack, you can delete it.
- Stacktape will automatically delete every infrastructure resource and deployment artifact associated with your stack.

```bash
stp delete --stage <<stage>> --region <<region>>
```

# Stack description

Stacktape uses a simple `stacktape.yml` configuration file to describe infrastructure resources, packaging, deployment
pipeline and other aspects of your services. You can deploy your services to multiple environments (stages) - for
example `production`, `staging` or `dev-john`.

Stack is a running instance of a service. It consists of your application code (if any) and the infrastructure resources
required to run it.

The configuration for this service is described below.

## 1. Service name

You can choose an arbitrary name for your service. The name of the stack will be constructed as
`{service-name}-{stage}`.

```yml
serviceName: posts-api-pg
```

## 2. Resources

- Every resources must have an arbitrary, alphanumeric name (A-z0-9).
- Stacktape resources are "high-level". They consist of multiple underlying AWS (or 3rd party) resources.

### 2.1 Application load balancer

The application load balancer is responsible for maintaining and balancing websocket connections established between
clients and the containers.

If there are multiple containers(i.e your workload scales) load balancer distributes connections evenly among these
containers.

You can configure [more properties](https://docs.stacktape.com/resources/application-load-balancers/) on your load
balancer, including using custom domain names or enabling TLS. In this example, we are using the default setup.

```yml
resources:
  mainLoadBalancer:
    type: application-load-balancer
```

### 2.2 Upstash Redis database

The application uses Upstash serverless Redis database. It is used by
[Socket.IO adapter](https://socket.io/docs/v4/redis-adapter/) to synchronize when scaling to multiple Socket.IO
container instances.

In this example, we are configuring redis to use `tls`. You can also configure
[other properties](https://docs.stacktape.com/resources/upstash-redis-databases/) if desired.

```yml
redis:
  type: upstash-redis
  properties:
    enableTls: true
```

### 2.3 Container workload

Socket.IO server runs inside a container workload with a single container. The workload is configured as follows:

- [Container](https://docs.stacktape.com/resources/container-workloads/#containers). This container workload uses only a
  single container: `socketio-server`. The container is configured as follows:
  - **Packaging** - determines how the Docker container image is built. The easiest and most optimized way to build the
    image for a Typescript application is using `stacktape-image-buildpack`. We only need to configure `entryfilePath`.
    Stacktape automatically transpiles and builds the application code with all of its dependencies, builds the Docker
    image, and pushes it to a pre-created image repository on AWS. You can also use
    [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-container-workloads).
  - **Redis URL** - we are passing it to the container as an environment variable. Redis URL connection string can be
    easily referenced using a
    [$ResourceParam() directive](https://docs.stacktape.com/configuration/directives/#resource-param). This directive
    accepts a resource name (`redis` in this case) and the name of the
    [upstash redis referenceable parameter](https://docs.stacktape.com/resources/upstash-redis-databases/#referenceable-parameters)
    (`redisUrl` in this case). If you want to learn more, refer to
    [referencing parameters](https://docs.stacktape.com/configuration/referencing-parameters/) guide and
    [directives](https://docs.stacktape.com/configuration/directives) guide.
  - Events that reach the container. Load balancer event is configured to forward all incoming connections with path
    `/`(used for load balancer healthcheck) or `/websockets*`(used for websocket connection) to the container's port
    `3000`.
- [Resources](https://docs.stacktape.com/resources/container-workloads#resources). Resources are shared between
  containers of container workload (in this case, we only have one container). The cheapest available resource
  configuration is `0.25` of virtual CPU and `512` MB of RAM.
- [Scaling](https://docs.stacktape.com/resources/container-workloads#scaling). For the purposes of this tutorial we are
  scaling the workload to two (parallel) instances, to showcase the "synchronization" through redis. I.e that all
  websocket clients receive messages even if they are connected to different containers.

```yml
websocketServer:
  type: container-workload
  properties:
    resources:
      cpu: 0.25
      memory: 512
    containers:
      - name: socketio-server
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/server/index.ts
        environment:
          - name: REDIS_URL
            value: $ResourceParam('redis', 'redisUrl')
          - name: PORT
            value: 3000
        events:
          - type: application-load-balancer
            properties:
              containerPort: 3000
              loadBalancerName: mainLoadBalancer
              priority: 2
              paths:
                - '/'
                - '/websockets*'
    scaling:
      minInstances: 2
      maxInstances: 2
```

## 3. Test script

To simplify testing of the websocket app, the stacktape config also contains `broadcastTest`
[script](https://docs.stacktape.com/configuration/scripts/).

The purpose of this script is to create multiple websocket client connections (connections are balanced between the 2
socket.io containers):

- One of the clients sends a message.
- After rest of the websockets receive the message, they gracefully disconnect and script exits.

```yml
scripts:
  broadcastTest:
    executeScript: scripts/broadcast-test.ts
    environment:
      - name: LOAD_BALANCER_DOMAIN
        value: $ResourceParam('loadBalancer', 'domain')
```

You can execute the test script after the deploy using

```bash
stp script:run --scriptName broadcastTet --stage <<previously-used-stage>> --region <<previously-used-region>>
```
