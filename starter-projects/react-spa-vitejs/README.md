# React SPA with Vite.js

- This project deploys a simple Single Page Application built using [React.js](https://reactjs.org/) and
  [Vite.js](https://vitejs.dev/).
- The project uses a [S3 storage bucket](https://docs.stacktape.com/resources/buckets/) to store the application assets
  and a [CDN](https://docs.stacktape.com/resources/cdns/) to cache the content at the edge.

## Pricing

- The infrastructure required for this application uses exclusively "serverless", pay-per-use infrastructure. If your load won't get high, the costs will be close to $0.
- You can also control your cloud spend using [budget control](https://docs.stacktape.com/configuration/budget-control/).

## Prerequisites

If you're deploying from your local machine (not from a CI/CD pipeline), you need the following prerequisites:

- Stacktape installed. To install it, you can follow the [installation instructions](https://docs.stacktape.com/getting-started/setup-stacktape/).

- Node.js installed.
- **(optional) install [Stacktape VSCode extension](https://marketplace.visualstudio.com/items?itemName=stacktape.vscode-stacktape) with
  validation, autocompletion and on-hover documentation.**

## 1. Generate your project

The command below will bootstrap the project with pre-built application code and pre-configured `stacktape.yml` config file.

```bash
stp init --projectId react-spa-vitejs
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

1. Explore the app by visiting **webBucket -> cdnUrl**. URL was printed into console after the deploy.

## 4. Deploying only the application code

- The deployment using the [deploy](/cli/commands/deploy/) command uses
  [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html) under the hood. It
  brings a lot of guarantees and convenience, but can be slow for certain use-cases.- If you only want to deploy your source code (not any configuration changes), you can use
  [bucket:sync command](https://docs.stacktape.com/cli/commands/bucket-sync/). The deployment will be significantly faster (only a few seconds).

```bash
stacktape bucket:sync --stage <<stage>> --region <<region>> --resourceName webBucket --invalidateCdnCache
```

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

### 2.1 Bucket

Bucket contains the built React Single-page application (SPA):

- The built app is automatically uploaded into the bucket as a part of the deployment process.
- [CDN](https://docs.stacktape.com/resources/cdns/) is configured in front of the bucket to deliver your SPA across the
  world with minimal latency.
- To ensure that the CDN always serves the newest version of the app, CDN cache is automatically invalidated (flushed)
  after each deployment.

```yml
resources:
  webBucket:
    type: bucket
    properties:
      directoryUpload:
        directoryPath: ./dist
        headersPreset: single-page-app
      cdn:
        enabled: true
        rewriteRoutesForSinglePageApp: true
        invalidateAfterDeploy: true
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
  build:
    # or "yarn build"
    executeCommand: npm run build

hooks:
  - triggers: ['before:deploy', 'before:bucket:sync']
    scriptName: build
```

You can also execute the script manually anytime using `stp script:run`
[command](https://docs.stacktape.com/cli/commands/script-run/).
