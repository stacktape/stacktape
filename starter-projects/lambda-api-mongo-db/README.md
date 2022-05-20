# Lambda API with MongoDb

- This project deploys a simple Lambda-based HTTP API.
- The application runs in a [Lambda function](https://docs.stacktape.com/resources/lambda-functions/) and uses
  [MongoDb Atlas cluster](https://docs.stacktape.com/resources/mongo-db-atlas-clusters/) to store the data. To simplify
  the database access, this project uses [Mongoose ORM](https://mongoosejs.com/).

## Pricing

- Fixed price resources:

  - **MongoDb Atlas cluster** ($0.012/hour, ~$9/month)

- There are also other resources that might incur costs (with pay-per-use pricing). If your load won't get high, the costs will be close to $0.
- You can also control your cloud spend using [budget control](https://docs.stacktape.com/configuration/budget-control/).

## Prerequisites

If you're deploying from your local machine (not from a CI/CD pipeline), you need the following prerequisites:

- MongoDb Atlas account. To create one, refer to our [step-by-step guide](https://docs.stacktape.com/user-guides/mongo-db-atlas-credentials/).

- Stacktape installed. To install it, you can follow the [installation instructions](https://docs.stacktape.com/getting-started/setup-stacktape/).

- Node.js installed.
- **(optional) install [Stacktape VSCode extension](https://marketplace.visualstudio.com/items?itemName=stacktape.vscode-stacktape) with
  validation, autocompletion and on-hover documentation.**

## 1. Generate your project

The command below will bootstrap the project with pre-built application code and pre-configured `stacktape.yml` config file.

```bash
stp init --projectId lambda-api-mongo-db
```

## 2. Before deploy

- Fill in your MongoDb Atlas credentials in the `providerConfig.mongoDbAtlas` section of the stacktape.yml config file. To learn how to get your API keys and organization ID, refer to [MongoDB Atlas tutorial](https://docs.atlas.mongodb.com/configure-api-access/#std-label-atlas-prog-api-key).- Fill in your Upstash Atlas credentials in the `providerConfig.upstash` section of the stacktape.yml config file. You can get your API key in the [Upstash console](https://console.upstash.com/account/api).

## 3. Deploy your stack

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

## 4. Test your application

After a successful deployment, some information about the stack will be printed to the console (**URLs** of the deployed services, links to **logs**, **metrics**, etc.).

To test the application, you will need the URL of the API Gateway.

It's printed to the console as **mainApiGateway->url**.

### Create a post

Make a `POST` request to `<<your_http_api_gateway_url>>/post` with the JSON data in its body to save the post. Use your preferred HTTP client or
the following cURL command:

```bash
curl -X POST <<your_http_api_gateway_url>>/post -H 'content-type: application/json' -d '{ "title": "MyPost", "content": "Hello!", "authorEmail": "info@stacktape.com"}'
```

If the above cURL command did not work, try escaping the JSON content:

```bash
curl -X POST <<your_http_api_gateway_url>>/post -H 'content-type: application/json' -d '{ \"title\":\"MyPost\",\"content\":\"Hello!\",\"authorEmail\":\"info@stacktape.com\"}'
```

### Get all posts

Make a `GET` request to `<<your_http_api_gateway_url>>/posts` to get all posts.

```bash
curl <<your_http_api_gateway_url>>/posts
```

## 5. Run the application in development mode

To run functions in the development mode (remotely on AWS), you can use the
[fn:develop command](https://docs.stacktape.com/cli/commands/fn-develop/). For example, to develop and debug lambda function `savePost`, you can use

```bash
stp fn:develop --region <<your-region>> --stage <<stage>> --resourceName savePost
```

The command will:

- quickly re-build and re-deploy your new function code
- watch for the function logs and pretty-print them to the terminal

The function is rebuilt and redeployed, when you either:

- type `rs + enter` to the terminal
- use the `--watch` option and one of your source code files changes

## 6. Deploying only the application code

- The deployment using the [deploy](/cli/commands/deploy/) command uses
  [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html) under the hood. It
  brings a lot of guarantees and convenience, but can be slow for certain use-cases.If you only want to deploy your source code (not any configuration changes), you can use
  [fn:deploy-fast](https://docs.stacktape.com/cli/commands/fn-deploy-fast/). The deployment will be significantly faster (only a few seconds).

```bash
stacktape fn:deploy-fast --stage <<stage>> --region <<region>> --resourceName <<name-of-the-lambda-to-deploy>>
```

## 7. Delete your stack

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

### 2.2 MongoDB Atlas cluster

The application data is stored in an Atlas MongoDB cluster.

Only the cluster tier needs to be configured in a minimal setup. You can also configure
[other properties](https://docs.stacktape.com/resources/mongo-db-atlas-clusters/) if desired.

```yml
mongoDbCluster:
  type: mongo-db-atlas-cluster
  properties:
    clusterTier: M2
```

### 2.3 Functions

The core of our application consists of two serverless functions:

- **savePost function** - saves post into database(MongoDB)
- **getPosts function** - get all posts from the database(MongoDB)

Functions are configured as follows:

- **Packaging** - determines how the lambda artifact is built. The easiest and most optimized way to build the lambda
  from Typescript/Javascript is using `stacktape-lambda-buildpack`. We only need to configure `entryfilePath`. Stacktape
  automatically transpiles and builds the application code with all of its dependencies, creates the lambda zip
  artifact, and uploads it to the pre-created S3 bucket on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-lambda-functions).
- **Environment variables** - We are passing MongoDB cluster connection string to the function using an environment
  variable. Cluster's parameters can be easily referenced using a
  [$ResourceParam() directive](https://docs.stacktape.com/configuration/directives/#resource-param). This directive
  accepts a resource name (`mognoDbCluster` in this case) and the name of the
  [MongoDB cluster referenceable parameter](https://docs.stacktape.com/resources/mongo-db-atlas-clusters/#referenceable-parameters)(in
  this case `connectionString`). If you want to learn more, refer to
  [referencing parameters](https://docs.stacktape.com/configuration/referencing-parameters/) guide and
  [directives](https://docs.stacktape.com/configuration/directives) guide.
- **Events** - Events determine how is function triggered. In this case, we are triggering the function when an event
  (HTTP request) is delivered to the HTTP API gateway:

  - if URL path is `/post` and HTTP method is `POST`, request is delivered to `savePost` function.
  - if URL path is `/posts` and HTTP method is `GET`, request is delivered to `getPosts` function.

  The event(request) including the request body is passed to the function handler as an argument.

- **Access control** - Functions must be allowed to access the MongoDB cluster, to be able to read from and write to the
  database. We are doing this by listing the cluster in `allowAccessTo` list. To see other ways of controlling access to
  resources refer to [the docs](https://docs.stacktape.com/resources/lambda-functions/#accessing-other-resources)

```yml
savePost:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/lambdas/save-post.ts
    memory: 512
    environment:
      - name: MONGODB_CONNECTION_STRING
        value: $ResourceParam('mongoDbCluster', 'connectionString')
    accessControl:
      allowAccessTo:
        - mongoDbCluster
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: mainApiGateway
          path: /post
          method: POST

getPosts:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/lambdas/get-posts.ts
    memory: 512
    environment:
      - name: MONGODB_CONNECTION_STRING
        value: $ResourceParam('mongoDbCluster', 'connectionString')
    accessControl:
      allowAccessTo:
        - mongoDbCluster
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: mainApiGateway
          path: /posts
          method: GET
```
