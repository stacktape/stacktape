# Lambda app with Redis

- This project deploys a simple Lambda-based HTTP endpoint that stores the data in
  [Upstash Redis](https://docs.stacktape.com/resources/upstash-redis-databases/).

## Pricing

- The infrastructure required for this application uses exclusively "serverless", pay-per-use infrastructure. If your load won't get high, the costs will be close to $0.
- You can also control your cloud spend using [budget control](https://docs.stacktape.com/configuration/budget-control/).

## Prerequisites

If you're deploying from your local machine (not from a CI/CD pipeline), you need the following prerequisites:

- Upstash account. To create one, navigate to [Upstash console](https://console.upstash.com/login).
- Stacktape installed. To install it, you can follow the [installation instructions](https://docs.stacktape.com/getting-started/setup-stacktape/).

- Node.js installed.
- **(optional) install [Stacktape VSCode extension](https://marketplace.visualstudio.com/items?itemName=stacktape.vscode-stacktape) with
  validation, autocompletion and on-hover documentation.**

## 1. Generate your project

The command below will bootstrap the project with pre-built application code and pre-configured `stacktape.yml` config file.

```bash
stp init --projectId lambda-app-redis
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

- Navigate to the URL `<<main-api-gateway-url>>/{<<key>>}/{<<key>>}` to store the key-value pair in Redis. The URL of
  your mainApiGateway is printed to the terminal as **mainApiGateway -> url**.

## 4. Run the application in development mode

To run functions in the development mode (remotely on AWS), you can use the
[fn:develop command](https://docs.stacktape.com/cli/commands/fn-develop/). For example, to develop and debug lambda function `storeKeyValuePair`, you can use

```bash
stp fn:develop --region <<your-region>> --stage <<stage>> --resourceName storeKeyValuePair
```

The command will:

- quickly re-build and re-deploy your new function code
- watch for the function logs and pretty-print them to the terminal

The function is rebuilt and redeployed, when you either:

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

### 2.2 Upstash Redis database

The application uses Upstash serverless Redis database.

In this example, we are configuring database to use `tls`. You can also configure
[other properties](https://docs.stacktape.com/resources/upstash-redis-databases/) if desired.

```yml
redis:
  type: upstash-redis
  properties:
    enableTls: true
```

### 2.3 Function

The application itself is fairly simple. It consists of a single lambda function `storeKeyValuePair` that stores a value
inside our Redis database.

The function is configured as follows:

- **Packaging** - determines how the lambda artifact is built. The easiest and most optimized way to build the lambda
  from Typescript/Javascript is using `stacktape-lambda-buildpack`. We only need to configure `entryfilePath`. Stacktape
  automatically transpiles and builds the application code with all of its dependencies, creates the lambda zip
  artifact, and uploads it to the pre-created S3 bucket on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-lambda-functions).
- **Environment variables** - We are passing Redis URL connection string to the function using an environment variable.
  Redis parameters can be easily referenced using a
  [$ResourceParam() directive](https://docs.stacktape.com/configuration/directives/#resource-param). This directive
  accepts a resource name (`redis` in this case) and the name of the
  [Upstash Redis referenceable parameter](https://docs.stacktape.com/resources/upstash-redis-databases/#referenceable-parameters)(in
  this case `redisUrl`). If you want to learn more, refer to
  [referencing parameters](https://docs.stacktape.com/configuration/referencing-parameters/) guide and
  [directives](https://docs.stacktape.com/configuration/directives) guide.
- **Events** - Events determine how is function triggered. In this case, we are triggering the function when an event
  (HTTP request) is delivered to the HTTP API gateway to URL path `/save/{key}/{value}`, where `{key}` and `${value}`
  are path parameters(key and value can be arbitrary values). The event(request) including the path parameters is passed
  to the function handler as an argument.

```yml
storeKeyValuePair:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/store-key-value-pair.ts
    environment:
      - name: REDIS_URL
        value: $ResourceParam('redis', 'redisUrl')
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: gateway
          method: GET
          path: /save/{key}/{value}
```
