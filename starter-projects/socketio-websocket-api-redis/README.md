# Websocket API with Socket.io

- This project deploys a simple Websocket API built using [Socket.io](https://socket.io/).
- The application runs in a
  [container workload](https://docs.stacktape.com/compute-resources/multi-container-workloads/) and uses
  [Upstash redis](https://docs.stacktape.com/resources/upstash-redis-databases/) to store the session data. The requests
  are routed using [Application Load Balancer](https://docs.stacktape.com/resources/application-load-balancers/).
- The Websocket API is work as expected even if horizontally scaled (multiple parallel instances can be added).
- This project includes a pre-configured [stacktape.yml configuration](stacktape.yml).
  The configured infrastructure is described in the [stack description section](#stack-description)

## Pricing

- Fixed price resources:

  - **Container workload** (~$0.012/hour, ~$9/month)

- There are also other resources that might incur costs (with pay-per-use pricing). If your load won't get high, these costs will be close to $0.

## Prerequisites

1. **AWS account**. If you don't have one, [create new account here](https://portal.aws.amazon.com/billing/signup).

2. **Stacktape account**. If you don't have one, [create new account here](https://console.stacktape.com/sign-up).

3. **Stacktape installed**.

  <details>
  <summary>Install on Windows (Powershell)</summary>

```bash
iwr https://installs.stacktape.com/windows.ps1 -useb | iex
```

  </details>
  <details>
  <summary>Install on Linux</summary>

```bash
curl -L https://installs.stacktape.com/linux.sh | sh
```

  </details>
  <details>
  <summary>Install on MacOS</summary>

```bash
curl -L https://installs.stacktape.com/macos.sh | sh
```

  </details>
  <details>
  <summary>Install on MacOS ARM (Apple silicon)</summary>

```bash
curl -L https://installs.stacktape.com/macos-arm.sh | sh
```

  </details>

4. **Upstash account**. If you don't have one, [create new account here](https://console.upstash.com/login).

## 1. Generate your project

To initialize the project, use

```bash
stacktape init --projectId socketio-websocket-api-redis
```

To deploy your application inside [AWS CodeBuild](https://aws.amazon.com/codebuild/) pipeline, also use the `--deployFrom codebuild` flag.

To deploy your application inside [Github actions](https://github.com/features/actions) pipeline, also use the `--deployFrom github` flag.

To deploy your application inside [Gitlab CI](https://docs.gitlab.com/ee/ci/) pipeline, also use the `--deployFrom gitlab` flag.

## 2. Before deploy

- Fill in your Upstash credentials in the `providerConfig.upstash` section of the stacktape.yml config file. You can get your API key in the [Upstash console](https://console.upstash.com/account/api).

## 3. Deploy your stack

The deployment will take ~5-15 minutes. Subsequent deploys will be significantly faster.

<details>
<summary>Deploy from local machine</summary>

<br />

The deployment from local machine will build and deploy the application from your system. This means you also need to have:

- Docker. To install Docker on your system, you can follow [this guide](https://docs.docker.com/get-docker/).- Node.js installed.

<br />

To perform the deployment, use the following command:

```bash
stacktape deploy --stage <<stage>> --region <<region>>
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

</details>
<details>
<summary>Deploy using AWS CodeBuild pipeline</summary>

<br />

Deployment using AWS CodeBuild will build and deploy your application inside [AWS CodeBuild pipeline](https://aws.amazon.com/codebuild/). To perform the deployment, use

```bash
stacktape codebuild:deploy --stage <<stage>> --region <<region>>
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

</details>
<details>
<summary>Deploy using Github actions CI/CD pipeline</summary>

<br />

1. If you don't have one, create a new repository at https://github.com/new
2. Create Github repository secrets: https://docs.stacktape.com/user-guides/ci-cd/#2-create-github-repository-secrets
3. Replace `<<stage>>` and `<<region>>` in the .github/workflows/deploy.yml file.
4. `git init --initial-branch=main`
5. `git add .`
6. `git commit -m "setup stacktape project"`
7. `git remote add origin git@github.com:<<namespace-name>>/<<repo-name>>.git`
8. `git push -u origin main`
9. To monitor the deployment progress, navigate to your github project and select the Actions tab

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

</details>
<details>
<summary>Deploy using Gitlab CI pipeline</summary>

<br />

1. If you don't have one, create a new repository at https://gitlab.com/projects/new
2. Create Gitlab repository secrets: https://docs.stacktape.com/user-guides/ci-cd/#2-create-gitlab-repository-secrets
3. replace `<<stage>>` and `<<region>>` in the .gitlab-ci.yml file.
4. `git init --initial-branch=main`
5. `git add .`
6. `git commit -m "setup stacktape project"`
7. `git remote add origin git@gitlab.com:<<namespace-name>>/<<repo-name>>.git`
8. `git push -u origin main`
9. `To monitor the deployment progress, navigate to your gitlab project and select CI/CD->jobs`

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

</details>

## 4. Test your application

After a successful deployment, some information about the stack will be printed to the terminal (**URLs** of the deployed services, links to **logs**, **metrics**, etc.).

- This project includes a pre-made test script that creates 100 websocket connections and emits a message to all of
  them. To run it, use

```bash
stacktape script:run --scriptName broadcastTest --stage <<your-previously-deployed-stage>> --region <<your-previously-used-region>>
```

## 5. Run the application in development mode

To run a container in the development mode (locally on your machine), you can use the
[dev command](https://docs.stacktape.com/cli/commands/dev/).

```bash
stacktape dev --region <<your-region>> --stage <<stage>> --resourceName websocketServer --container socketio-server
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

## 6. Hotswap deploys

- Stacktape deployments use [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html) under the hood. It
  brings a lot of guarantees and convenience, but can be slow for certain use-cases.

- To speed up the deployment, you can use the `--hotSwap` flag that avoids Cloudformation.
- Hotswap deployments work only for source code changes (for lambda function, containers and batch jobs) and for content uploads to buckets.
- If the update deployment is not hot-swappable, Stacktape will automatically fall back to using a Cloudformation deployment.

```bash
stacktape deploy --hotSwap --stage <<stage>> --region <<region>>
```

## 7. Delete your stack

- If you no longer want to use your stack, you can delete it.
- Stacktape will automatically delete every infrastructure resource and deployment artifact associated with your stack.

```bash
stacktape delete --stage <<stage>> --region <<region>>
```

# Stack description

Stacktape uses a simple `stacktape.yml` configuration file to describe infrastructure resources, packaging, deployment
pipeline and other aspects of your stacks.

You can deploy your services to multiple environments (stages) - for
example `production`, `staging` or `dev-john`. A stack is a running instance of a service. It consists of your application
code (if any) and the infrastructure resources required to run it.

The configuration for this service is described below.

## 1. Service name

You can choose an arbitrary name for your service. The name of the stack will be constructed as
`{service-name}-{stage}`.

```yml
serviceName: socketio-websocket-api-redis
```

## 2. Resources

- Every resource must have an arbitrary, alphanumeric name (A-z0-9).
- Stacktape resources consist of multiple (sometimes more than 15) underlying AWS or 3rd party resources.

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

- [Container](https://docs.stacktape.com/compute-resources/multi-container-workloads/#containers). This container
  workload uses only a single container: `socketio-server`. The container is configured as follows:
  - **Packaging** - determines how the Docker container image is built. The easiest and most optimized way to build the
    image for a Typescript application is using `stacktape-image-buildpack`. We only need to configure `entryfilePath`.
    Stacktape automatically transpiles and builds the application code with all of its dependencies, builds the Docker
    image, and pushes it to a pre-created image repository on AWS. You can also use
    [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-multi-container-workloads).
  - **ConnectTo list** - we are adding redis database `redis` into `connectTo` list. By doing this, Stacktape will
    automatically inject relevant environment variables into the compute resource's runtime (such as redis connection
    url required for connecting to database)
  - Events that reach the container. Load balancer event is configured to forward all incoming connections with path
    `/`(used for load balancer healthcheck) or `/websockets*`(used for websocket connection) to the container's port
    `3000`.
- [Resources](https://docs.stacktape.com/compute-resources/multi-container-workloads#resources). Resources are shared
  between containers of container workload (in this case, we only have one container). The cheapest available resource
  configuration is `0.25` of virtual CPU and `512` MB of RAM.
- [Scaling](https://docs.stacktape.com/compute-resources/multi-container-workloads#scaling). For the purposes of this
  tutorial we are scaling the workload to two (parallel) instances, to showcase the "synchronization" through redis. I.e
  that all websocket clients receive messages even if they are connected to different containers.

```yml
websocketServer:
  type: multi-container-workload
  properties:
    resources:
      cpu: 0.25
      memory: 512
    connectTo:
      - redis
    containers:
      - name: socketio-server
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: src/server/index.ts
        environment:
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
