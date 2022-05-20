# NuxtJs SSR website container

- This project deploys a simple Server-side rendered [NuxtJS v3](https://v3.nuxtjs.org/) application.
- The project uses a [Container workload](https://docs.stacktape.com/resources/container-workloads/) to run the Nuxt app
  and a [S3 storage bucket](https://docs.stacktape.com/resources/buckets/) with
  [CDN](https://docs.stacktape.com/resources/cdns/) to host the static content.

## Pricing

- Fixed price resources:

  - **Container workload** (~$0.012/hour, ~$9/month)

- There are also other resources that might incur costs (with pay-per-use pricing). If your load won't get high, the costs will be close to $0.
- You can also control your cloud spend using [budget control](https://docs.stacktape.com/configuration/budget-control/).

## Prerequisites

If you're deploying from your local machine (not from a CI/CD pipeline), you need the following prerequisites:

- Stacktape installed. To install it, you can follow the [installation instructions](https://docs.stacktape.com/getting-started/setup-stacktape/).
- Docker. To install Docker on your system, you can follow [this guide](https://docs.docker.com/get-docker/).

- Node.js installed.
- **(optional) install [Stacktape VSCode extension](https://marketplace.visualstudio.com/items?itemName=stacktape.vscode-stacktape) with
  validation, autocompletion and on-hover documentation.**

## 1. Generate your project

The command below will bootstrap the project with pre-built application code and pre-configured `stacktape.yml` config file.

```bash
stp init --projectId nuxtjs-ssr-website-container
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

1. Explore your application at **mainApiGateway -> url**. The URL was printed to the console after the deploy.

## 4. Run the application in development mode

To run a container in the development mode (locally on your machine), you can use the
[cw:run-local command](https://docs.stacktape.com/cli/commands/cw-run-local/).

```bash
stp cw:run-local --region <<your-region>> --stage <<stage>> --resourceName nuxtApp --container nuxt-container
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

### 2.1 HTTP API Gateway

API Gateway receives requests and routes them to the container.

For convenience, it has [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) allowed.

```yml
resources:
  mainApiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 2.2 Bucket

The bucket is used to store our static assets. By putting CDN in front of the bucket, its content can be distributed
across the globe and served with minimal latencies.

New/modified static assets are automatically uploaded during deployment process.

We are also enabling cors on our bucket, to allow clients(browsers) access to the resources.

```yml
webBucket:
  type: bucket
  properties:
    cors:
      enabled: true
    directoryUpload:
      directoryPath: ./.output/public
      headersPreset: static-website
    cdn:
      enabled: true
      invalidateAfterDeploy: true
```

### 2.3 Container workload

Application code runs inside a container workload with a single container. The workload is configured as follows:

- [Container](https://docs.stacktape.com/resources/container-workloads/#containers). This container workload uses only a
  single container: `nuxt-container`. The container is configured as follows:
  - **Packaging** - determines how the Docker container image is built. The easiest and most optimized way to build the
    image for a Typescript application is using `stacktape-image-buildpack`. We only need to configure `entryfilePath`.
    Stacktape automatically transpiles and builds the application code with all of its dependencies, builds the Docker
    image, and pushes it to a pre-created image repository on AWS. You can also use
    [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-container-workloads).
  - **Environment variables** - We are passing URL of the **static assets CDN** to the container as an environment
    variable. URL can be easily referenced using a
    [$ResourceParam() directive](https://docs.stacktape.com/configuration/directives/#resource-param). This directive
    accepts a resource name (`webBucket` in this case) and the name of the
    [bucket referenceable parameter](https://docs.stacktape.com/resources/buckets/#referenceable-parameters) (`cdnUrl`
    in this case). If you want to learn more, refer to
    [referencing parameters](https://docs.stacktape.com/configuration/referencing-parameters/) guide and
    [directives](https://docs.stacktape.com/configuration/directives) guide.
  - We are configuring **events**(requests) that can reach the container. By configuring the path to `/{proxy+}`, the
    method to `'*'` and the containerPort to `3000`, the event integration routes all requests (no matter the method or
    path) coming to the HTTP API Gateway to port `3000` of the container.
- [Resources](https://docs.stacktape.com/resources/container-workloads#resources). Resources are shared between
  containers of container workload (in this case, we only have one container). The cheapest available resource
  configuration is `0.25` of virtual CPU and `512` MB of RAM.

You can also configure [scaling](https://docs.stacktape.com/resources/container-workloads#scaling). New (parallel)
container workload instance can be added when (for example) the utilization of your CPU or RAM gets larger than 80%. The
HTTP API Gateway will evenly distribute the traffic to all container workloads.

```yml
nuxtApp:
  type: container-workload
  properties:
    resources:
      cpu: 0.25
      memory: 512
    containers:
      - name: nuxt-container
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: ./server.ts
        environment:
          - name: PORT
            value: 3000
          - name: NUXT_APP_CDN_URL
            value: $ResourceParam('webBucket', 'cdnUrl')
        events:
          - type: http-api-gateway
            properties:
              containerPort: 3000
              httpApiGatewayName: mainApiGateway
              method: '*'
              path: /{proxy+}
```

## 3. Application build hook

To automatically build the application before each deployment, the stacktape configuration contains a
[script](https://docs.stacktape.com/configuration/scripts/) and a
[hook](https://docs.stacktape.com/configuration/hooks/).

[Script](https://docs.stacktape.com/configuration/scripts/) specifies the command to be executed. To execute it
automatically every time before the stack is deployed, we reference it inside a
[hook](https://docs.stacktape.com/configuration/hooks/).

```yml
scripts:
  nuxtBuild:
    executeCommand: npm run build

hooks:
  - triggers: ['before:deploy']
    scriptName: nuxtBuild
```

You can also execute the script manually anytime using `stp script:run`
[command](https://docs.stacktape.com/cli/commands/script-run/).
