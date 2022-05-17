# Ruby on Rails API with Postgres

- This project deploys a simple HTTP API built using [Ruby on Rails](https://rubyonrails.org/).
- The application runs in a [container workload](https://docs.stacktape.com/resources/container-workloads/) and uses a
  Postgres [relational database](https://docs.stacktape.com/resources/relational-databases/) to store the data.

## Pricing

- Fixed price resources:

  - **Container workload** (~$0.012/hour, ~$9/month)
  - **Relational (SQL) database** ($0.017/hour, ~$12.5/month, [free-tier eligible](https://aws.amazon.com/free/?all-free-tier.sort-by=item.additionalFields.SortRank&all-free-tier.sort-order=asc&awsf.Free%20Tier%20Types=*all&awsf.Free%20Tier%20Categories=*all))

- There are also other resources that might incur costs (with pay-per-use pricing). If your load won't get high, the costs will be close to $0.
- You can also control your cloud spend using [budget control](https://docs.stacktape.com/configuration/budget-control/).

## Prerequisites

If you're deploying from your local machine (not from a CI/CD pipeline), you need the following dependencies:

- Stacktape installed. To install it, you can follow the [installation instructions](https://docs.stacktape.com/getting-started/setup-stacktape/).
- Ruby installed.
- Docker. To install Docker on your system, you can follow [this guide](https://docs.docker.com/get-docker/).
- **(optional) install [Stacktape VSCode extension](https://marketplace.visualstudio.com/items?itemName=stacktape.vscode-stacktape) with
  validation, autocompletion and on-hover documentation.**

## 1. Generate your project

- The command below will bootstrap the project with pre-built application code and pre-configured `stacktape.yml` config file.

```bash
stp init --projectId ruby-on-rails-api-postgres
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

## 4. Run the application in development mode

To run a container in the development mode (locally on your machine), you can use the
[cw:run-local command](https://docs.stacktape.com/cli/commands/cw-run-local/).

```bash
stp cw:run-local --region <<your-region>> --stage <<stage>> --resourceName apiServer --container api-container
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

## 5. Deploying only the application code

- The deployment using the [deploy](/cli/commands/deploy/) command uses
  [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html) under the hood. It
  brings a lot of guarantees and convenience, but can be slow for certain use-cases.If you only want to deploy your source code (not any configuration changes), you can use
  [cw:deploy-fast](https://docs.stacktape.com/cli/commands/cw-deploy-fast/). The deployment will be significantly faster (~60-120 seconds).

```bash
stacktape cw:deploy-fast --stage <<stage>> --region <<region>> --resourceName nextJsApp --container
```

## 6. Delete your stack

- If you no longer want to use your stack, you can delete it.
- Stacktape will automatically delete every infrastructure resource and deployment artifact associated with your stack.

```bash
stp delete --stage <<stage>> --region <<region>>
```
