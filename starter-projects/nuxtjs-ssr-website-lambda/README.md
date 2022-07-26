# NuxtJs SSR website lambda

- This project deploys a simple Server-side rendered [NuxtJS v3](https://v3.nuxtjs.org/) application.
- The project uses a [Lambda function](https://docs.stacktape.com/resources/lambda-functions/) to run the Nuxt app and a
  [S3 storage bucket](https://docs.stacktape.com/resources/buckets/) with
  [CDN](https://docs.stacktape.com/resources/cdns/) to host the static content.

## Pricing

- The infrastructure required for this application uses exclusively "serverless", pay-per-use infrastructure. If your load won't get high, these costs will be close to $0.

## Prerequisites

If you're deploying from your local machine (not from a CI/CD pipeline), you need the following prerequisites:

- Stacktape installed. To install it, you can follow the [installation instructions](https://docs.stacktape.com/getting-started/setup-stacktape/).

- Node.js installed.
- **(optional) install [Stacktape VSCode extension](https://marketplace.visualstudio.com/items?itemName=stacktape.vscode-stacktape) with
  validation, autocompletion and on-hover documentation.**

## 1. Generate your project

The command below will bootstrap the project with pre-built application code and pre-configured `stacktape.yml` config file.

```bash
stp init --projectId nuxtjs-ssr-website-lambda
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

- Explore your application at **mainApiGateway -> url**. The URL was printed to the console.

## 4. Run the application in development mode

To run functions in the development mode (remotely on AWS), you can use the
[dev command](https://docs.stacktape.com/cli/commands/dev/). For example, to develop and debug lambda function `nuxtLambda`, you can use

```bash
stp dev --region <<your-region>> --stage <<stage>> --resourceName nuxtLambda
```

The command will:

- quickly re-build and re-deploy your new function code
- watch for the function logs and pretty-print them to the terminal

The function is rebuilt and redeployed, when you either:

- type `rs + enter` to the terminal
- use the `--watch` option and one of your source code files changes

## 5. Hotswap deploys

- Stacktape deployments use [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html) under the hood. It
  brings a lot of guarantees and convenience, but can be slow for certain use-cases.

- To speed up the deployment, you can use the --hotSwap flag that avoids Cloudformation.
- Hotswap deployments work only for source code changes (for lambda function, containers and batch jobs) and for content uploads to buckets.
- If the update deployment is not hot-swappable, Stacktape will automatically fall back to using a Cloudformation deployment.

```bash
stacktape deploy --hotSwap --stage <<stage>> --region <<region>>
```

## 6. Delete your stack

- If you no longer want to use your stack, you can delete it.
- Stacktape will automatically delete every infrastructure resource and deployment artifact associated with your stack.

```bash
stp delete --stage <<stage>> --region <<region>>
```

# Stack description

Stacktape uses a simple `stacktape.yml` configuration file to describe infrastructure resources, packaging, deployment
pipeline and other aspects of your services.

You can deploy your services to multiple environments (stages) - for
example `production`, `staging` or `dev-john`. A stack is a running instance of a service. It consists of your application
code (if any) and the infrastructure resources required to run it.

The configuration for this service is described below.

## 1. Service name

You can choose an arbitrary name for your service. The name of the stack will be constructed as
`{service-name}-{stage}`.

```yml
serviceName: nuxtjs-ssr-website-lambda
```

## 2. Resources

- Every resource must have an arbitrary, alphanumeric name (A-z0-9).
- Stacktape resources consist of multiple (sometimes more than 15) underlying AWS or 3rd party resources.

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

### 2.3 Function

Application is run in a lambda function.

The function is configured as follows:

- **Packaging** - determines how the lambda artifact is built. The easiest and most optimized way to build the lambda
  from Typescript/Javascript is using `stacktape-lambda-buildpack`. We only need to configure `entryfilePath`. Stacktape
  automatically transpiles and builds the application code with all of its dependencies, creates the lambda zip
  artifact, and uploads it to a pre-created S3 bucket on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-lambda-functions).
- **Environment variables** - We are passing URL of the **static assets CDN** to the function as an environment
  variable. URL can be easily referenced using a
  [$ResourceParam() directive](https://docs.stacktape.com/configuration/directives/#resource-param). This directive
  accepts a resource name (`webBucket` in this case) and the name of the
  [bucket referenceable parameter](https://docs.stacktape.com/resources/buckets/#referenceable-parameters) (`cdnUrl` in
  this case). If you want to learn more, refer to
  [referencing parameters](https://docs.stacktape.com/configuration/referencing-parameters/) guide and
  [directives](https://docs.stacktape.com/configuration/directives) guide.
- **Events** - Events determine how is function triggered. In this case, we are triggering the function when an event
  (HTTP request) is delivered to the HTTP API gateway. By configuring the path to `/{proxy+}` and the method to `'*'`,
  the event integration routes all requests (no matter the method or path) coming to the HTTP API Gateway to the
  function.

```yml
nuxtLambda:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./handler.ts
    environment:
      - name: NUXT_APP_CDN_URL
        value: $ResourceParam('webBucket', 'cdnUrl')
    events:
      - type: http-api-gateway
        properties:
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
