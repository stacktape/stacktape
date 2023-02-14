[![DevOps-free cloud development](https://stacktape.com/cover-images/github-zoomed.png)](https://stacktape.com)

[Website](https://stacktape.com) • [Docs](https://docs.stacktape.com/) • [Slack](https://stacktape-community.slack.com)
• [Twitter](https://twitter.com/stacktape) • [Facebook](https://www.facebook.com/stacktape) •
[Linked In](https://www.linkedin.com/company/stacktape/)

#### Get production grade infrastructure in minutes. <br/> With 98% less configuration and developer-friendly experience.

### [Start deploying now](https://docs.stacktape.com/getting-started/setup-stacktape/)

## Full power of AWS with Heroku-like experience

- **Made for developers -** Usable by junior developers, yet powerful enough for enterprise use-cases.
- **Production-grade & fully-managed -** Auto-scalable, reliable, secure and performant infrastructure from day 1.
- **Focused on developer productivity -** Well-documented, fast, and free from repetitive, error-prone and
  time-consuming tasks.
- **Cost-effective -** Infrastructure bills as low as possible - without the pricing loopholes.

## Contents

- [How it works](#how-it-works)
- [Supported infrastructure components](#all-the-infrastructure-components-youll-need)
- [Comparison](#comparison)
  - [Serverless](#serverless)
  - [Heroku](#heroku)
  - [Firebase](#firebase)
  - [Kubernetes](#kubernetes)
  - [AWS SAM](#aws-sam)
  - [CloudFormation](#cloudformation)
  - [Terraform](#terraform)
  - [Vercel](#vercel)
- [FAQ](#faq)
- [Contact us](#contact-us)
- [Other](#other)

## How it works

### 1. Configure your stack

Stacktape is an **IaC** (Infrastructure as a code) tool.

The configuration is simple, declarative and can be written using **YAML**, **JSON**, **Javascript**, **Typescript** or
**Python**.

> _Example **stacktape.yml** configuration file_

```yml
serviceName: my-application
resources:
  mainGateway:
    type: http-api-gateway
  apiServer:
    type: multi-container-workload
    properties:
      resources:
        cpu: 2
        memory: 2048
      scaling:
        minInstances: 1
        maxInstances: 5
      containers:
        - name: api-container
          imageConfig:
            filePath: src/main.ts
          environment:
            - name: DB_ENDPOINT
              value: $ResourceParam('mainDatabase', 'endpoint')
          events:
            - type: http-api-gateway
              properties:
                method: GET
                path: /{proxy+}
                containerPort: 3000
                httpApiGatewayName: mainGateway
  mainDatabase:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql-serverless
      credentials:
        masterUserName: $Secret('dbSecret.username')
        masterUserPassword: $Secret('dbSecret.password')
```

### 2. Deploy your application

Deployment is done using a **single command**.

Stacktape handles the rest:

- Packages your source code
- Scans and resolves dependencies
- Configures and provisions infrastructure resources
- Deploys your application to AWS

> \*Using **CLI\***

```bash
$ stacktape deploy --stage production --region eu-west-1
[SUCCESS] Loading configuration done in 0.03 sec.
[SUCCESS] Fetching stack data done in 0.63 sec.
[SUCCESS] Packaging workloads
 └ apiserver-apicontainer: done in 18.57 sec. Image size: 85 MB.
[SUCCESS] Uploading deployment artifacts done in 6.53 sec.
[SUCCESS] Validating template done in 0.42 sec.
[INFO] Deploying stack my-application-production...
[INFO] Deploying infrastructure resources. Finished: 9/35.
```

> \*Using **SDK\***

```js
import { Stacktape } from 'stacktape';
const stacktape = new Stacktape({
  region: 'eu-west-1',
  stage: 'production'
});
stacktape.deploy({
  config: {
    serviceName: 'my-application',
    resources: [...your resources...]
  }
});
```

### 3. Iterate on your application

Stacktape offers an easy and efficient way to develop your apps.

When developing containers, Stacktape will:

- Build and run your container locally with the same permissions it has when running in the cloud
- Resolve and inject referenced environment variables (for example database connection strings)
- Expose configured ports

```bash
$ stacktape cw:run-local --resourceName apiServer
[SUCCESS] Loading configuration done in 0.03 sec.
[SUCCESS] Fetching stack data done in 0.63 sec.
[SUCCESS] Packaging workloads
 └ apiServer-apicontainer: done in 3.3 sec. Image size: 85 MB.
[SUCCESS] Container started successfully. (type 'rs' + enter to rebuild and restart)
[INFO] Exposed ports: http://localhost:3000

Api container started successfully. Listening on PORT 3000.
```

## All the infrastructure components you'll need

One tool for all your apps. From simple websites to data processing pipelines.

#### Lambda functions

Short-lived serverless functions able to quickly scale up to 1000s of parallel executions with pay-per-use pricing.

#### Container workloads

Fully managed, auto-scalable and easy-to-use runtime for your Docker containers.

#### Batch jobs

Fully managed, on-demand runtime for your container jobs with pay-per-use pricing. Supports GPU compute resources.

#### SQL databases

Fully managed relational databases (Postgres, MySQL, MariaDb, etc.) with support for clustering, failover & more.

#### MongoDb clusters

Fully managed MongoDb Atlas clusters. Automatically deployed to your AWS account and managed within your stack.

#### DynamoDB

Fully managed, serverless, highly-available and massively scalable key-value datastore.

#### Api Gateways

Fully managed, serverless HTTP Api Gateway with pay-per-request pricing.

#### Load balancers

Fully managed, Application (L7) Load balancer.

#### Storage buckets

Durable and highly-available object storage with pay-per-use pricing.

#### Authentication

Fully managed sign-ups, logins and authorization for your users with pay-per-use pricing.

#### Redis clusters

Fully managed, redis-compatible in-memory data store with sub-millisecond latency.

#### Upstash Redis

Fully managed, serverless Redis with pay-as-you-go billing.

#### Upstash Kafka

Fully managed, serverless Kafka with pay-as-you-go billing for event-streaming solutions.

#### CDN

Globally distributed (edge) cache for your Buckets, Load balancers and API Gateways.

#### Domains & certificates

Auto-provisioned certificates and domain management for your Buckets, Load balancers and API Gateways.

#### Secrets

Fully managed secret store for your credentials, API keys and other sensitive data.

## Comparison

### Serverless

<details>
<summary>Read more</summary>
Serverless framework is a great tool that simplifies deployment of function-based (FaaS) applications.

Sadly, the simplicity disappears when your application needs more than just functions, and you're left with the
responsibility for configuring, managing and integrating other infrastructure components.

#### Stacktape's advantages

- **More power** - Besides lambda functions, Stacktape allows you to deploy container workloads, batch jobs, SQL and
  NoSQL databases, API Gateways, Load balancers and much more.
- **Optimized build process** - Stacktape supports zero-config, heavily optimized parallel builds with advanced caching.
- **Programmatic SDK** - Stacktape includes both CLI and SDK (currently supported for Javascript and Typescript). It
  allows you to easily build complicated deployment pipelines.
- **Better developer experience** - Stacktape is simple, well-documented and easily customizable. Everything is properly
  validated. Error messages are descriptive and include hints.
- **Editor extension** - Stacktape comes with a VS code editor extension to further improve developer experience with
  validation, autocompletion and built-in documentation.
- **Development studio (coming soon)** - Stacktape development studio is a graphical user interface. It's a convenient
  way to manage and test your applications and infrastructure.
- **Client SDKs (coming soon)** - Client SDKs (for web, mobile and more) can be used within your application to help
  with most common tasks (authenticating users, uploading files, etc.).

#### Stacktape's disadvantages

- **Not open-source** - Stacktape is a SaaS product. But it comes with a free tier.
- **Smaller community** - Being a new product, Stacktape doesn't have a large community yet.
- **AWS only** - Stacktape works on top of AWS. Support for MS Azure and Google Cloud is planned. Besides AWS services,
Stacktape also supports 3rd party providers (such as MongoDb Atlas).
</details>

### Heroku

<details>
<summary>Read more</summary>
Heroku is an easy-to-use platform for hosting applications.

Sadly, it's also very costly and lacks a lot of features compared to larger cloud platforms (such as AWS).

#### Stacktape's advantages

- **Full power of AWS** - Stacktape allows you to deploy almost any infrastructure components, including containers,
  batch jobs, SQL and NoSQL databases, API Gateways, Load balancers, file storage, CDN & more.
- **Lower costs** - With Heroku, you get simplicity for a significantly higher infrastructure costs. Stacktape gives you
  the simplicity without the absurd infrastructure bills.
- **Optimized build process** - Stacktape supports zero-config, heavily optimized parallel builds with advanced caching.
- **Programmatic SDK** - Stacktape includes both CLI and SDK (currently supported for Javascript and Typescript). It
  allows you to easily build complicated deployment pipelines.
- **Editor extension** - Stacktape comes with a VS code editor extension to further improve developer experience with
  validation, autocompletion and built-in documentation.
- **Infrastructure as Code** - Stacktape allows you to manage infrastructure using simple and declarative configuration
  file. You can easily deploy as many environments (stages) as you want.
- **Development studio (coming soon)** - Stacktape development studio is a graphical user interface. It's a convenient
  way to manage and test your applications and infrastructure.
- **Client SDKs (coming soon)** - Client SDKs (for web, mobile and more) can be used within your application to help
  with most common tasks (authenticating users, uploading files, etc.).

#### Stacktape's disadvantages

- **Smaller community** - Being a new product, Stacktape doesn't have a large community yet.
- **Less buildpacks** - Stacktape currently supports zero-config builds for less languages and frameworks.
</details>

### Firebase

<details>
<summary>Read more</summary>
Firebase is an easy-to-use BaaS (backend as a service) platform for mobile and web applications.

Sadly, Firebase isn't sufficient for larger applications that require continuously running jobs, containers, batch jobs,
SQL databases or anything else not supported by Firebase.

#### Stacktape's advantages

- **Full power of AWS** - Stacktape allows you to deploy almost any infrastructure components, including containers,
  batch jobs, SQL and NoSQL databases, API Gateways, Load balancers, file storage, CDN & more.
- **Infrastructure as Code** - Stacktape allows you to manage infrastructure using simple and declarative configuration
  file. You can easily deploy as many environments (stages) as you want.
- **Optimized build process** - Stacktape supports zero-config, heavily optimized parallel builds with advanced caching.
- **Editor extension** - Stacktape comes with a VS code editor extension to further improve developer experience with
  validation, autocompletion and built-in documentation.
- **Cost at scale** - Firebase can get very costly very fast when you go out of the free tier.

#### Stacktape's disadvantages

- **Smaller community** - Being a new product, Stacktape doesn't have a large community yet.
- **Less pre-built capabilities for mobile apps** - Stacktape doesn't come with purpose-built features for mobile apps.
</details>

### Kubernetes

<details>
<summary>Read more</summary>
Kubernetes is a popular and widely adopted tool for orchestrating containers.

However, it comes with great architectural, configuration, operational and financial overhead.

#### Stacktape's advantages

- **Developer friendly** - Stacktape is usable by every developer. No DevOps, Cloud or infrastructure expertise is
  required.
- **Fully managed** - All resources supported by Stacktape are fully managed. They remove a lot of responsibility from
  your shoulders.
- **Fully featured development framework** - Stacktape handles all of the common tasks required to develop and run cloud
  applications, including application deployments, testing, debugging & much more.
- **Optimized build process** - Stacktape supports zero-config, heavily optimized parallel builds with advanced caching.
- **Programmatic SDK** - Stacktape includes both CLI and SDK (currently supported for Javascript and Typescript). It
  allows you to easily build complicated deployment pipelines.
- **Better developer experience** - Stacktape is simple, well-documented and easily customizable. Everything is properly
  validated. Error messages are descriptive and include hints.
- **Editor extension** - Stacktape comes with a VS code editor extension to further improve developer experience with
  validation, autocompletion and built-in documentation.
- **Development studio (coming soon)** - Stacktape development studio is a graphical user interface. It's a convenient
  way to manage and test your applications and infrastructure.
- **Client SDKs (coming soon)** - Client SDKs (for web, mobile and more) can be used within your application to help
  with most common tasks (authenticating users, uploading files, etc.).

#### Stacktape's disadvantages

- **Not open-source** - Stacktape is a SaaS product. But it comes with a free tier.
- **Smaller community** - Being a new product, Stacktape doesn't have a large community yet.
- **Public cloud only** - Stacktape is not usable with on-premise infrastructure.
</details>

### AWS SAM

<details>
<summary>Read more</summary>
Serverless Application Model is a simple and handy framework for building lambda function-based application on AWS.

Similarly to Serverless Framework, the simplicity disappears if you need more than just lambda functions.

#### Stacktape's advantages

- **More power** - Besides lambda functions, Stacktape allows you to deploy container workloads, batch jobs, SQL and
  NoSQL databases, API Gateways, Load balancers and much more.
- **Optimized build process** - Stacktape supports zero-config, heavily optimized parallel builds with advanced caching.
- **Programmatic SDK** - Stacktape includes both CLI and SDK (currently supported for Javascript and Typescript). It
  allows you to easily build complicated deployment pipelines.
- **Better developer experience** - Stacktape is simple, well-documented and easily customizable. Everything is properly
  validated. Error messages are descriptive and include hints.
- **Editor extension** - Stacktape comes with a VS code editor extension to further improve developer experience with
  validation, autocompletion and built-in documentation.
- **Development studio (coming soon)** - Stacktape development studio is a graphical user interface. It's a convenient
  way to manage and test your applications and infrastructure.
- **Client SDKs (coming soon)** - Client SDKs (for web, mobile and more) can be used within your application to help
  with most common tasks (authenticating users, uploading files, etc.).

#### Stacktape's disadvantages

- **Not open-source** - Stacktape is a SaaS product. But it comes with a free tier.
- **Smaller community** - Being a new product, Stacktape doesn't have a large community yet.
</details>

### CloudFormation

<details>
<summary>Read more</summary>
AWS Cloudformation is a powerful tool for provisioning and configuring AWS resources.

Unfortunately, using Cloudformation is complex, time-consuming and requires a lot of Cloud and infrastructure knowledge.

#### Stacktape's advantages

- **Developer friendly** - Stacktape is usable by every developer. No DevOps, Cloud or infrastructure expertise is
  required.
- **Optimized build process** - Stacktape supports zero-config, heavily optimized parallel builds with advanced caching.
- **Programmatic SDK** - Stacktape includes both CLI and SDK (currently supported for Javascript and Typescript). It
  allows you to easily build complicated deployment pipelines.
- **Better developer experience** - Stacktape is simple, well-documented and easily customizable. Everything is properly
  validated. Error messages are descriptive and include hints.
- **Editor extension** - Stacktape comes with a VS code editor extension to further improve developer experience with
  validation, autocompletion and built-in documentation.
- **Development studio (coming soon)** - Stacktape development studio is a graphical user interface. It's a convenient
  way to manage and test your applications and infrastructure.
- **Client SDKs (coming soon)** - Client SDKs (for web, mobile and more) can be used within your application to help
  with most common tasks (authenticating users, uploading files, etc.).

#### Stacktape's disadvantages

- **None** - Stacktape is customizable and can be easily extended using native AWS Cloudformation resources.
</details>

### Terraform

<details>
<summary>Read more</summary>
Terraform is a tool for provisioning infrastructure across multiple cloud providers.

However, it requires a lot of Cloud, DevOps and infrastructure knowledge. It doesn't handle packaging, applications
deployments and many other tasks required to run your applications.

#### Stacktape's advantages

- **Developer friendly** - Stacktape is usable by every developer. No DevOps, Cloud or infrastructure expertise is
  required.
- **Fully featured development framework** - Stacktape handles all of the common tasks required to develop and run cloud
  applications, including application deployments, testing, debugging & much more.
- **Optimized build process** - Stacktape supports zero-config, heavily optimized parallel builds with advanced caching.
- **Programmatic SDK** - Stacktape includes both CLI and SDK (currently supported for Javascript and Typescript). It
  allows you to easily build complicated deployment pipelines.
- **Better developer experience** - Stacktape is simple, well-documented and easily customizable. Everything is properly
  validated. Error messages are descriptive and include hints.
- **Editor extension** - Stacktape comes with a VS code editor extension to further improve developer experience with
  validation, autocompletion and built-in documentation.
- **Development studio (coming soon)** - Stacktape development studio is a graphical user interface. It's a convenient
  way to manage and test your applications and infrastructure.
- **Client SDKs (coming soon)** - Client SDKs (for web, mobile and more) can be used within your application to help
  with most common tasks (authenticating users, uploading files, etc.).

#### Stacktape's disadvantages

- **Not open-source** - Stacktape is a SaaS product. But it comes with a free tier.
- **Smaller community** - Being a new product, Stacktape doesn't have a large community yet.
- **AWS only** - Stacktape works on top of AWS. Support for MS Azure and Google Cloud is planned. Besides AWS services,
Stacktape also supports 3rd party providers (such as MongoDb Atlas).
</details>

### Vercel

<details>
<summary>Read more</summary>
Vercel is a platform for building and hosting application frontends.

However, it has very limited support for building application backends (servers).

#### Stacktape's advantages

- **Full power of AWS** - Stacktape allows you to deploy almost any infrastructure components, including containers,
  batch jobs, SQL and NoSQL databases, API Gateways, Load balancers, file storage, CDN & more.
- **Infrastructure as Code** - Stacktape allows you to manage infrastructure using simple and declarative configuration
  file. You can easily deploy as many environments (stages) as you want.
- **Optimized build process** - Stacktape supports zero-config, heavily optimized parallel builds with advanced caching.
- **Programmatic SDK** - Stacktape includes both CLI and SDK (currently supported for Javascript and Typescript). It
  allows you to easily build complicated deployment pipelines.
- **Editor extension** - Stacktape comes with a VS code editor extension to further improve developer experience with
  validation, autocompletion and built-in documentation.
- **Development studio (coming soon)** - Stacktape development studio is a graphical user interface. It's a convenient
  way to manage and test your applications and infrastructure.
- **Client SDKs (coming soon)** - Client SDKs (for web, mobile and more) can be used within your application to help
  with most common tasks (authenticating users, uploading files, etc.).

#### Stacktape's disadvantages

- **Smaller community** - Being a new product, Stacktape doesn't have a large community yet.
</details>

## FAQ

<details>
<summary>"Can I use Stacktape for free?"</summary>
Yes. Stacktape is forever free for small and medium size projects.

For open-source maintainers, we also offer a premium plan for free. Feel free to
[contact us](https://stacktape.com/#contact).

</details>

<details>
<summary>"What do I need to pay for?"</summary>
For larger projects that require more infrastructure resources or advanced features, you can choose a  [premium plan](https://stacktape.com/#pricing).

Premium plans cost only a fraction of the cost you'd pay for an alternative solution or for DevOps/Cloud specialists.

</details>

<details>
<summary>"Is Stacktape secure?"</summary>
Yes.

Stacktape works on the developer’s machine (or on your CI/CD server). Your deployments don't go through any
Stacktape-managed infrastructure.

Furthermore, Stacktape does everything it can to help you secure your applications (least privilege permissions, secret
management, database access management, etc.).

</details>

<details>
<summary>"Which cloud providers are supported?"</summary>
Stacktape is built around AWS. AWS is the biggest and most advanced cloud computing provider.

Besides numerous AWS services, Stacktape integrates popular 3rd party service providers (such as MongoDb Atlas).

Support for MS Azure is planned for late 2022.

If you need anything else currently not supported by Stacktape, feel free to
[contact us](https://stacktape.com/#contact).

</details>

<details>
<summary>"Can Stacktape really cover all of my cloud infrastructure needs?"</summary>
Yes. Stacktape supports all of the most commonly used infrastructure components.

Furthermore, if your use-case is very specific and not natively supported by Stacktape, you can easily extend Stacktape
applications with any AWS service.

</details>

<details>
<summary>"Which programming languages are supported?"</summary>
You can deploy applications written in any language, if you supply your own Dockerfile.

Zero-config, heavily optimized builds are currently supported for Javascript and Typescript applications. Zero-config
Python, Go and Java builds are coming soon.

To write Stacktape configuration, you can use YAML, JSON, Javascript, Typescript or Python.

</details>

<details>
<summary>"Do I lose control or flexibility with Stacktape?"</summary>
No.

Unlike other solutions on the market, Stacktape is designed to be easily customizable and extensible.

</details>

<details>
<summary>"Can you help us migrate to the cloud?"</summary>
Yes.

Migrating your applications to the cloud using Stacktape is in most cases very straightforward.

If you need more assistance, our team of cloud specialists can help you architect, design and run your cloud
applications.

Feel free to [contact us](https://stacktape.com/#contact).

</details>

## Contact us

- [Slack](https://join.slack.com/t/stacktape-community/shared_invite/zt-16st4nmgl-B8adf0YnZWSMEbuz9Ih6vg)
- [Gitter](https://gitter.im/stacktape/community)
- [Sign up](https://stacktape.com/sign-up)
- [Contact us](mailto:info@stacktape.com)
- [Twitter](https://twitter.com/stacktape)
- [Linked In](https://www.linkedin.com/company/stacktape/)

## Other

- [Terms of Use](https://stacktape.com/terms-of-use/)
- [Privacy Policy](https://stacktape.com/privacy-policy/)
