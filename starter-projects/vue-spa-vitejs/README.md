# Vue SPA with Vite.js

- This project deploys a simple Single Page Application built using [Vue.js](https://vuejs.org/) and
  [Vite.js](https://vitejs.dev/).
- The project uses a [S3 storage bucket](https://docs.stacktape.com/resources/buckets/) to store the application assets
  and a [CDN](https://docs.stacktape.com/resources/cdns/) to cache the content at the edge.

## Pricing

- The infrastructure required for this application uses exclusively "serverless", pay-per-use infrastructure. If your load won't get high, the costs will be close to $0.
- You can also control your cloud spend using [budget control](/configuration/budget-control/).

## Prerequisites

- Stacktape installed. To install it, you can follow the [installation instructions](https://docs.stacktape.com/getting-started/setup-stacktape/).
- Node.js installed.
- **If you're using VSCode, you can use the [Stacktape extension](https://marketplace.visualstudio.com/items?itemName=stacktape.vscode-stacktape).
  It provides validation, on-hover documentation, autocompletion and useful links.**

## 1. Generate your project

- The command below will bootstrap the project with pre-built application code and some configuration files required
  for the given language/framework.
- Optionally, you can also choose to include a pre-configured `stacktape.yml` config file. It includes everything needed
  to deploy the application (infrastructure resources and deployment pipeline).

```bash
stp init --projectId vue-spa-vitejs
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

After a successful deployment, some useful information about the stack will be printed to the console (**URLs** of the deployed services, links to **logs**, **metrics**, etc.).

- To see the application, visit the url of the CDN. It's printed to the console as **webBucket->cdnUrl**

undefined
undefined

## 4. Deploying only the application code

- The deployment using the [deploy](/cli/commands/deploy/) command uses
  [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html) under the hood. It
  brings a lot of guarantees and convenience, but can be slow for certain use-cases.- If you only want to deploy your source code (not any configuration changes), you can use
  [bucket:sync command](/cli/commands/bucket-sync/). The deployment will be significantly faster (only a few seconds).

```bash
stacktape bucket:sync --stage <<stage>> --region <<region>> --resourceName webBucket --invalidateCdnCache
```

## 5. Delete your stack

- If you no longer want to use your stack, you can easily delete it.
- Stacktape will automatically delete every infrastructure resource and deployment artifact associated with your stack.

```bash
stp delete --stage <<stage>> --region <<region>>
```
