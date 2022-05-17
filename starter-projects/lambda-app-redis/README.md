# Lambda app with Redis

- This project deploys a simple Lambda-based HTTP endpoint that stores the data in
  [Upstash Redis](https://docs.stacktape.com/resources/upstash-redis-databases/).

## Pricing

- The infrastructure required for this application uses exclusively "serverless", pay-per-use infrastructure. If your load won't get high, the costs will be close to $0.
- You can also control your cloud spend using [budget control](https://docs.stacktape.com/configuration/budget-control/).

## Prerequisites

If you're deploying from your local machine (not from a CI/CD pipeline), you need the following dependencies:

- Stacktape installed. To install it, you can follow the [installation instructions](https://docs.stacktape.com/getting-started/setup-stacktape/).
- Node.js installed.
- **(optional) install [Stacktape VSCode extension](https://marketplace.visualstudio.com/items?itemName=stacktape.vscode-stacktape) with
  validation, autocompletion and on-hover documentation.**

## 1. Generate your project

- The command below will bootstrap the project with pre-built application code and pre-configured `stacktape.yml` config file.

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

- Navigate to the URL <<main-api-gateway-url>>/{<<key>>}/{<<key>>} to store the key-value pair in Redis. The URL of your
  mainApiGateway is printed to the terminal as **mainApiGateway->url**.

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
