# Migrating from Heroku

This guide describes how to migrate an application from Heroku to AWS using Stacktape. With Stacktape, you can deploy your web services and databases in a similar way to Heroku, but with the benefits of AWS, such as:

*   Lower costs.
*   A dedicated _VPC_ (private network) out of the box.
*   A broader range of supported resources (containers, Lambda functions, batch jobs, DynamoDB tables, etc.).

You can continue to use other Heroku add-ons while your application is running on AWS by copying the appropriate environment variables. For example, if you use Heroku's SendGrid add-on, you can set `SENDGRID_USERNAME` and `SENDGRID_PASSWORD` in your service's [environment variables](#1-4-environment-variables-and-secrets).

## Prerequisites

1.  A Stacktape account. If you do not have one, you can [create one here](https://console.stacktape.com/sign-up).
2.  An AWS account connected to your Stacktape organization. For more information, see the [Connect AWS Account guide](../../user-guides/connect-aws-account.md).

## Concepts mapping

The following table explains how some Heroku concepts map to Stacktape concepts.

| Heroku             | Stacktape                                                                                                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web Process        | [Web service](../../compute-resources/web-services//index.md)                                                                                                                                                                                      |
| Worker Process     | [Worker service](../../compute-resources/worker-services//index.md)                                                                                                                                                                                |
| Dyno               | An instance of your service                                                                                                                                                                                                          |
| Heroku Postgres    | [Relational database](../../database-resources/relational-databases//index.md) (with the option of a [serverless database](../../database-resources/relational-databases//index.md))                                                     |
| Heroku Redis       | [Redis cluster](../../database-resources/redis-clusters//index.md) (with the option of [serverless Redis](../../3rd-party-resources/upstash-redises//index.md))                                                                                                    |
| Heroku Scheduler   | [_Lambda function_ with a schedule event](../../compute-resources/functions//index.md)                                                                                                                                                |

## 1. Writing stacktape.yml

The `stacktape.yml` file is an infrastructure-as-code (IaC) file that specifies your services, databases, and other infrastructure resources. It also defines how to package them and what resources they have available. Additionally, it can specify automated actions to execute as part of the deployment process, such as testing or database migrations.

### 1.1. Create stacktape.yml

Create a `stacktape.yml` file in your project's root directory.

### 1.2. Adding a web service

Since you are coming from Heroku, you will likely want to use a [web service](../../compute-resources/web-services//index.md) for your application. A web service is a simple container-based resource that runs your code with a public URL and a port exposed for HTTPS communication (with automatic SSL certificates), similar to a Heroku web dyno.

The web service definition contains everything Stacktape needs to know to build and package your application. You can use Heroku's buildpack builder (the same way Heroku builds and packages applications), which automatically detects the language and framework of your application and applies the correct buildpacks.

Alternatively, you can package your application by:

*   [Providing a Dockerfile](../../configuration/packaging.md)
*   Using our built-in, zero-config [Stacktape Image Buildpack](../../configuration/packaging.md)

For all packaging options, see the [container packaging documentation](../../configuration/packaging/.md).

```yaml
resources:
  appService:
    type: web-service
    properties:
      packaging:
        type: external-buildpack
        properties:
          sourceDirectoryPath: ./
          builder: heroku/builder:22
          # buildpacks:
          #   - heroku/nodejs
      resources:
        cpu: 1
        memory: 1024
```

### 1.3. Adding a database

To replace your relational database (Heroku Postgres), you can use a [relational database](../../database-resources/relational-databases/index.md) resource. Add it to your `stacktape.yml` file alongside your web service, and choose the engine version and instance size according to your needs.

Here is a short overview of Heroku Postgres plans mapped to AWS RDS instances. For a complete list of all AWS instances, see the [AWS documentation](https://aws.amazon.com/rds/instance-types/).

| Heroku Plan         | AWS Instance                            |
| ------------------- | --------------------------------------- |
| Essential-0         | db.t3.micro: 2 vCPUs, 1 GB RAM          |
| Essential-1         | db.t3.small: 2 vCPUs, 2 GB RAM          |
| Essential-2         | db.t3.medium: 2 vCPUs, 4 GB RAM         |
| Standard-0          | db.t3.medium: 2 vCPUs, 4 GB RAM         |
| Standard-2          | db.m5.large: 2 vCPUs, 8 GB RAM          |
| Standard-3          | db.m5.xlarge: 4 vCPUs, 16 GB RAM        |
| Standard-4          | db.m5.2xlarge: 8 vCPUs, 32 GB RAM       |
| Standard-5          | db.r5.2xlarge: 8 vCPUs, 64 GB RAM       |
| Standard-6          | db.r5.4xlarge: 16 vCPUs, 128 GB RAM     |
| Standard-7          | db.r5.8xlarge: 32 vCPUs, 256 GB RAM     |
| Standard-8          | db.r5.12xlarge: 48 vCPUs, 384 GB RAM    |
| Standard-9          | db.r5.24xlarge: 96 vCPUs, 768 GB RAM    |
| Standard-10         | db.x1e.32xlarge: 128 vCPUs, 3904 GB RAM |

```yaml
resources:
  appService:
    type: web-service
    properties:
      packaging:
        type: external-buildpack
        properties:
          sourceDirectoryPath: ./
          builder: heroku/builder:22
      resources:
        cpu: 1
        memory: 1024

  # {start-highlight}
  database:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: my-super-secret-password
      engine:
        type: postgres
        properties:
          version: "16.3"
          primaryInstance:
            instanceSize: db.t3.micro
  # {stop-highlight}
```

### 1.4. Environment variables and secrets

You can inject environment variables into your service by specifying them in the `environment` list. You can use the [`$ResourceParam()`](../../configuration/directives.md) directive to inject information about other resources (such as a database URL or connection string) into your service. For sensitive values, you should [create a secret](https://console.stacktape.com/secrets) and then reference it in your configuration using the [`$Secret()`](../../configuration/directives.md) directive. Stacktape will resolve these directives during deployment.

```yaml
resources:
  appService:
    type: web-service
    properties:
      packaging:
        type: external-buildpack
        properties:
          sourceDirectoryPath: ./
          builder: heroku/builder:22
      resources:
        cpu: 1
        memory: 1024
      # {start-highlight}
      environment:
        - name: DATABASE_URL
          value: $ResourceParam('database', 'connectionString')
        # - name: DATABASE_PASSWORD
        #   value: $Secret('my-database-password')
      # {stop-highlight}

  database:
    type: relational-database
    properties:
      credentials:
        # {start-highlight}
        masterUserPassword: $Secret('my-database-password')
        # {stop-highlight}
      engine:
        type: postgres
        properties:
          version: "16.3"
          primaryInstance:
            instanceSize: db.t3.micro
```

## 2. Deploy your app

Once you have your `stacktape.yml` file in your repository, you are ready to deploy your application. Stacktape offers multiple ways to do this:

1.  **Using the Stacktape CLI**: Similar to the Heroku CLI. Requires Docker to be installed on your system. For more information, see [Deploying with the CLI](../../getting-started/deploying-using-cli.md).
2.  **GitOps (push-to-deploy)**: Set up an integration with GitHub or GitLab to deploy your application when there is a push to a specified branch. For more information, see [Deploying with GitOps](../../getting-started/deploying-using-gitops.md).
3.  **Deploy from Git interactively**: Interactively deploy from your GitHub or GitLab repository using the Stacktape Console. For more information, see [Deploying from the Console](../../getting-started/deploying-using-console.md).
4.  **Deploy from any CI/CD**: Deploy using any CI/CD system. For more information, see [Deploying with a third-party CI/CD provider](../../getting-started/deploying-using-3rd-party-ci.md).

## 3. Migrating your data from PostgreSQL

If you have created a Stacktape PostgreSQL database, you may want to copy the data from your Heroku Postgres database.

Put your Heroku app into maintenance mode so that no new data is written to the database during the copy. `

## 4. Migrating a domain

If your Heroku app uses a custom domain, you have two options:

1.  **Manage your domain with your current DNS provider**: You can continue to use your current DNS provider with Stacktape. However, you will need to create or import a custom TLS certificate in [AWS Certificate Manager](https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html) and reference it using `customCertificateArn` in your web service's domain configuration. After that, you can manually point your DNS record to your application's URL. For more information, see [Using a third-party DNS provider](../../other-resources/domains-and-certificates//index.md).

2.  **Manage your domain with Route 53 and Stacktape**: You can use Stacktape to assign your custom domain to your application during deployment. This takes the burden of manually managing DNS records off of you and gives you broad options for managing domains, such as automatically assigning custom subdomains to your development and testing environments. For more information, see [Managing domains with Stacktape](../../other-resources/domains-and-certificates//index.md).

## FAQ

### How does auto-scaling work?

Web services auto-scale based on CPU and memory usage thresholds. For more information, see the [web service auto-scaling documentation](../../compute-resources/web-services//index.md).

### Can I monitor the health of my app?

Yes. Health is monitored out of the box. If a web service task (container) is deemed unhealthy (e.g., your app crashes due to a bug), it is automatically replaced with a healthy one.

You can also set up your own [internal health checks](../../compute-resources/web-services//index.md). If a task fails a health check, it is deemed unhealthy and replaced.

### Is my app available during updates?

Yes. When you deploy a new version of your application, Stacktape uses a [rolling update strategy](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html). This means that an old web service task is only removed when a new, healthy task has replaced it.

In addition to the rolling update strategy, you can also choose from multiple types of [blue/green deployment strategies](../../compute-resources/web-services//index.md).

### Can I use a CDN in front of my app?

Yes. Many applications can benefit from a CDN, which can offload your services by caching responses. This results in fewer requests to your application, which leads to less compute power being consumed and paid for. With Stacktape, you can [enable a CDN with a single line of configuration](../../compute-resources/web-services//index.md).

### Can I manage MongoDB Atlas clusters with Stacktape?

Yes. You can seamlessly manage [MongoDB Atlas clusters](../../3rd-party-resources/mongo-db-atlas-clusters/index.md) with Stacktape.

### Do you support other resources?

Yes. We support many resource types, including containers, Lambda functions, and batch jobs. See our [documentation](../../.md) for more information.

### Is Stacktape extensible?

Yes. In addition to the plethora of AWS and third-party resource types that Stacktape supports by default, you can also extend your infrastructure using the [AWS CDK](../../extending/aws-cdk-constructs/index.md) or [_Cloudformation_](../../extending/aws-cloudformation-resources/index.md).