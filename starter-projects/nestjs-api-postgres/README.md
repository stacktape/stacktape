# Nest.js API with Postgres

- This project deploys a simple HTTP API built using [Nest.js](https://nestjs.com/).
- The application runs in a [web service](https://docs.stacktape.com/compute-resources/web-services/) resource and uses
  a Postgres [relational database](https://docs.stacktape.com/resources/relational-databases/) to store the data. To
  simplify the database access, this project uses [Prisma](https://www.prisma.io/).
- This project includes a pre-configured [stacktape.yml configuration](stacktape.yml).
  The configured infrastructure is described in the [stack description section](#stack-description)

## Pricing

- Fixed price resources:

  - **Relational (SQL) database** ($0.017/hour, ~$12.5/month, [free-tier eligible](https://aws.amazon.com/free/?all-free-tier.sort-by=item.additionalFields.SortRank&all-free-tier.sort-order=asc&awsf.Free%20Tier%20Types=*all&awsf.Free%20Tier%20Categories=*all))
  - **Web service** (~$0.012/hour, ~$9/month)

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

## 1. Generate your project

To initialize the project, use

```bash
stacktape init --projectId nestjs-api-postgres
```

To deploy your application inside [AWS CodeBuild](https://aws.amazon.com/codebuild/) pipeline, also use the `--deployFrom codebuild` flag.

To deploy your application inside [Github actions](https://github.com/features/actions) pipeline, also use the `--deployFrom github` flag.

To deploy your application inside [Gitlab CI](https://docs.gitlab.com/ee/ci/) pipeline, also use the `--deployFrom gitlab` flag.

## 2. Deploy your stack

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

## 3. Test your application

After a successful deployment, some information about the stack will be printed to the terminal (**URLs** of the deployed services, links to **logs**, **metrics**, etc.).

To test the application, you will need the web service URL. It's printed to the terminal.

### Create a post

Make a `POST` request to `<<web_service_url>>/post` with the JSON data in its body to save the post. Use your preferred HTTP client or
the following cURL command:

```bash
curl -X POST <<web_service_url>>/posts -H 'content-type: application/json' -d '{ "title": "MyPost", "content": "Hello!", "authorEmail": "info@stacktape.com"}'
```

If the above cURL command did not work, try escaping the JSON content:

```bash
curl -X POST <<web_service_url>>/posts -H 'content-type: application/json' -d '{ \"title\":\"MyPost\",\"content\":\"Hello!\",\"authorEmail\":\"info@stacktape.com\"}'
```

### Get all posts

Make a `GET` request to `<<web_service_url>>/posts` to get all posts.

```bash
curl <<web_service_url>>/posts
```

## 4. Hotswap deploys

- Stacktape deployments use [AWS CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html) under the hood. It
  brings a lot of guarantees and convenience, but can be slow for certain use-cases.

- To speed up the deployment, you can use the `--hotSwap` flag that avoids Cloudformation.
- Hotswap deployments work only for source code changes (for lambda function, containers and batch jobs) and for content uploads to buckets.
- If the update deployment is not hot-swappable, Stacktape will automatically fall back to using a Cloudformation deployment.

```bash
stacktape deploy --hotSwap --stage <<stage>> --region <<region>>
```

## 5. Delete your stack

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
serviceName: nestjs-api-postgres
```

## 2. Resources

- Every resource must have an arbitrary, alphanumeric name (A-z0-9).
- Stacktape resources consist of multiple (sometimes more than 15) underlying AWS or 3rd party resources.

### 2.1 Web Service

Application runs in web-service resource and is configured as follows:

- **Packaging** - determines how the Docker container image is built. The easiest and most optimized way to build the
  image for a Typescript application is using `stacktape-image-buildpack`. We only need to configure `entryfilePath`. In
  this case, we are also excluding dependencies that nestjs includes by default, but are not needed in this case (it
  will make the image smaller and deployment faster). Stacktape automatically transpiles and builds the application code
  with all of its dependencies, builds the Docker image, and pushes it to a pre-created image repository on AWS. You can
  also use [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-web-services).
- **ConnectTo list** - we are adding database `mainDatabase` into `connectTo` list. By doing this, Stacktape will
  automatically inject relevant environment variables into the container runtime (such as the connection string required
  to connect to the database)
- [Resources](https://docs.stacktape.com/compute-resources/web-services#resources). The cheapest available resource
  configuration is `0.25` of virtual CPU and `512` MB of RAM.
- For convenience, automatic CORS is enabled.

You can also configure [scaling](https://docs.stacktape.com/compute-resources/web-services#scaling). New (parallel)
container can be added when (for example) the utilization of your CPU or RAM gets larger than 80%. The traffic is evenly
distributed to all the containers.

```yml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts
          excludeDependencies:
            - '@nestjs/websockets'
            - 'cache-manager'
            - 'class-validator'
            - 'class-transformer'
            - '@nestjs/microservices'
          languageSpecificConfig:
            emitTsDecoratorMetadata: true
      resources:
        cpu: 0.25
        memory: 512
      connectTo:
        - mainDatabase
      cors:
        enabled: true
```

### 2.2 Postgres relational database

The application data is stored in a Postgres database. The database is configured as follows:

- **Database credentials**. In this example, we input them directly. For production workloads, you should use
  [secrets](https://docs.stacktape.com/resources/secrets/) to store them securely.

- **Engine type**. We are using `postgres` engine. It uses a single-node database server - the simplest and cheapest
  option.

- **Instance size**. We are using the `db.t2.micro` instance. It has 1 vCPU, 1GB of memory, and is free-tier eligible
  (~$12.5/month without a free tier). To see the full list of available options, refer to
  [AWS instance type list](https://aws.amazon.com/rds/instance-types/).

By default, the version used for the database is the latest AWS-supported stable version (currently `13.4`). Minor
version upgrades are done automatically.

You can also configure many other aspects of your database, such as
[storage](https://docs.stacktape.com/resources/relational-databases/#storage),
[logging](https://docs.stacktape.com/resources/relational-databases/#logging),
[read replicas](https://docs.stacktape.com/resources/relational-databases/#read-replicas), or
[failover instances](https://docs.stacktape.com/resources/relational-databases/#multi-az-mode).

```yml
mainDatabase:
  type: relational-database
  properties:
    credentials:
      masterUserName: admin_user
      masterUserPassword: my_secret_password
    engine:
      type: postgres
      properties:
        primaryInstance:
          instanceSize: db.t2.micro
```

## 3. Database migration hooks

To simplify database access and migrations, this project uses [Prisma](https://www.prisma.io/). If you're not familiar
with it, don't worry - it's very simple. [Prisma schema](https://www.prisma.io/docs/concepts/components/prisma-schema)
for this application is already configured at `prisma/schema.prisma` in the project directory.

### 3.1 Generate Prisma client

Prisma offers a database client that we can import into our code. To generate it, we use the `npx prisma generate`
command. To do it automatically every time before the stack is deployed, the command is saved as a
[script](https://docs.stacktape.com/configuration/scripts/) and then used inside a `before:deploy`
[hook](https://docs.stacktape.com/configuration/hooks/).

```yml
serviceName: posts-api-pg

scripts:
  generatePrismaClient:
    executeCommand: npx prisma generate

hooks:
  - triggers: ['before:deploy']
    scriptName: generatePrismaClient
```

### 3.2 Prisma database migration

To sync our Prisma schema with the database, we need to use `npx prisma db push` command. We can't do this before the
database is created, so we use the `after:deploy` hook.

We also need to pass the `STP_MAIN_DATABASE_CONNECTION_STRING` environment variable to the script. We do it using the
[$ResourceParam()](https://docs.stacktape.com/configuration/directives/#resource-param) directive that will
automatically download the connection string value and pass it to the script.

```yml
scripts:
  generatePrismaClient:
    executeCommand: npx prisma generate
    migrateDb:
    executeCommand: npx prisma db push --skip-generate
    environment:
      - name: STP_MAIN_DATABASE_CONNECTION_STRING
        value: $ResourceParam('mainDatabase', 'connectionString')

hooks:
  - triggers: ["before:deploy"]
    scriptName: generatePrismaClient
    - triggers: ["after:deploy"]
    scriptName: migrateDb
```

You can also execute the migration script anytime using

```bash
stp script:run --scriptName migrateDb --stage <<previously-used-stage>> --region <<previously-used-region>>
```
