[![Stacktape cloud native framework](https://stacktape.com/github_title.png)](http://stacktape.com)
[Website](https://stacktape.com) • [Get Started](https://docs.stacktape.com/getting-started) • [Docs](https://docs.stacktape.com/) • [Examples](https://github.com/stacktape/stacktape) • [Blog](https://teespring.com/stores/serverless) • [Slack](https://stacktape-community.slack.com) • [Twitter](https://twitter.com/stacktape) • [Facebook](https://www.facebook.com/stacktape) • [Linked In](https://www.linkedin.com/company/stacktape/)
​

# Stacktape is a cloud-native framework that makes full power of AWS accessible to common developers.

​

- **Made for developers -** By abstracting away all the complexity, we make cloud development accessible to every developer.
- **Full power of AWS -** Deploy anything. From simple web apps to complicated data-processing pipelines.
- **Production-ready from day 1 -** Reliability, scalability, security & performance. With no extra effort.
- **Optimized for productivity -** Includes developer tooling that makes cloud-native development seamless and developers happy.
- **Fully serverless -** Scale from 0 to 1000s of concurrent workloads automatically. Pay only for what you use.
- **Cost-effective -** We do our best to keep your AWS bills as low as possible. Without compromising quality.
  ​

## Contents

- [How it works](#how-it-works)
- [Comparison](#comparison)
  - [Serverless](#serverless)
  - [Heroku](#heroku)
  - [Firebase](#firebase)
  - [Kubernetes](#kubernetes)
  - [AWS SAM](#aws-sam)
  - [CloudFormation](#cloudformation)
  - [Terraform](#terraform)
- [FAQ](#faq)
- [Community and Socials](#community-and-socials)
- [Other](#other)
  ​

## How it works

### 1. Configure your infrastructure

Every aspect of your application is configured using a **simple configuration file**.\
​
Configuration can be written in multiple languages, from **YAML** & **JSON** to **Typescript** & **Python**.\
​
Built-in directives help with common tasks and **custom directives can be used to build custom, reusable constructs using real languages**.\
​
You can extend Stacktape templates using **AWS Cloudformation** or override any aspect of the framework using **custom plugins**..
​

> _Example **stacktape.yml** configuration file_

```yml
stackConfig:
 name: my-stack
resources:
  functions:
    generateWeeklyReport:
      sourcePath: src/reports/generate-weekly-report.ts
      environment:
        DB_URL: @GetParam('userDatabase', 'Address')
      events:
        - schedule:
            rate: cron(0 7 * * 1)
  databases:
    userDatabase:
      dbInstanceSize: db.t3.micro
      engine:
        type: postgres
        version: 12.4
```

### 2. Develop your application

Stacktape is based on experience from many cloud-native projects, making your development process as seamless and productive as possible.\
​
You can **emulate cloud environment**, **interact with live cloud services**, **preview & inspect changes**, **rollback to previous versions**, **enforce policies** & much more.\
​
Stacktape isn’t opinionated about your development workflow, making it easy to **fit into any pipeline**.
​

> _Example **lambda function** code_

```ts
import { WebClient } from '@slack/web-api';
import { getDbAdapter } from './db-adapter';
const dbAdapter = getDbAdapter({ URL: process.env.DB_URL });
const slackClient = new WebClient('MY-SLACK-TOKEN');

export default async (event, context) => {
  const activeUsers = dbAdapter.getAllActiveUsers();
  await slackClientchat.postMessage({
    text: activeUsers.join('\n'),
    channel: 'CHANNEL-ID'
  });

  return { message: 'Generated user report.' };
};
```

### 3. Deploy everything using one command

Stacktape handles the rest:
​

1. **Configures infrastructure resources**
   Figures out an optimal way to run your workloads. You don’t need to understand how networking, VPCs or ECS clusters or autoscaling groups work.
   ​
2. **Packages and deployes your source code:**
   Creates perfectly optimized Lambda packages or Docker containers. Everything is done as efficently as possible, leveraging advanced caching and parallel builds.
   ​
   > _Console output of **stacktape deploy** command_

```
> stacktape deploy --stage production
[INFO] Using config file at ./stacktape.yml
[SUCCESS] Packaging function generateWeeklyReport done in 0.15 sec. Size: 15kB. Zipped size: 4kB.
[SUCCESS] Uploading deployment artifacts done in 0.3 sec.
[INFO] Deploying stack to stage production…
[████████████--------------] 45%
```

## Comparison

### Serverless

Serverless framework makes deploying (FaaS) functions to multiple cloud providers easy.
​
Stacktape is focused only on AWS, which allows us to do much more.
​

#### Stacktape's advantages

- **More power** - Stacktape unlocks full power of AWS. Enabling you to do more and cover more use-cases.
- **Plug-and-play** - Everything is built-in. No need to configure a plugin for everything.
- **Perfectly optimized** - Everything from packaging to deployment happens up to 50 times faster.
- **Streamlined development process** - No need for excessive configuration or figuring out how to solve common problems.
  ​

#### Stacktape's disadvantages

- **Not open-source** - Stacktape is not open-source. But we do have a generous free tier.
- **AWS only** - Stacktape currently supports only AWS.
  ​

### Heroku

Heroku is an easy to use platform for hosting applications.
​
With Stacktape, you retain the simplicity of Heroku, while gaining more control, power & lower bills.
​

#### Stacktape's advantages

- **More power** - Stacktape unlocks full power of AWS. Enabling you to do more and cover more use-cases.
- **Lower bills** - AWS is significantly cheaper than Heroku. And Stacktape makes it even more cost-effective.
- **More control & scaling** - AWS gives you more control, extensibility & customizability.
  ​

#### Stacktape's disadvantages

- **Less supported languages** - Zero config code builds are currently supported for less languages. But you can use any language, if you supply your own Dockerfile.
  ​

### Firebase

Firebase is an easy-to-use platform for mobile and web apps.
​
With firebase, you trade simplicity for control & power. With Stacktape, you don't.
​

#### Stacktape's advantages

- **Support for containers and long-running jobs** - Firebase supports only (FaaS) functions.
- **SQL** - Firebase supports only key-value datastore.
- **Lower bills** - AWS is significantly cheaper than Heroku. And Stacktape makes it even more cost-effective.
  ​

#### Stacktape's disadvantages

- **Less pre-made features for mobile apps** - While you can do anything you want using Stacktape and AWS, it's a bit more work for mobile app use-cases.
  ​

### Kubernetes

Kubernetes is a bit over-used tool for orchestrating containers.
​
It comes with a great architectural, operational, configural and conceptual complexity.
​

#### Stacktape's advantages

- **Usable by common developers** - No need for infrastructure and DevOps experts.
- **Instant value** - You just deploy your app and it works. No need for months of configuration.
- **Easy testing and debugging** - Includes developer tooling that makes developers productive.
  ​

#### Stacktape's disadvantages

- **AWS only** - Stacktape currently supports only AWS.
- **Cloud only** - Not usable with on-premise infastructure.
  ​

### AWS SAM

AWS Serverless Application Model is a framework for building FaaS-based application on AWS.
​
Stacktape is designed to enable much more than just FaaS-based applications, while being easier to use.
​

#### Stacktape's advantages

- **More power** - Stacktape unlocks full power of AWS. Enabling you to do more and cover more use-cases.
- **Zero-config code builds** - Stacktape builds your code and creates optimized deployment packages for you.
- **Perfectly optimized** - Parallel builds and advanced caching make your development process significantly faster.
  ​

#### Stacktape's disadvantages

- **Not open-source** - Stacktape is not open-source. But we do have a generous free tier.
  ​

### CloudFormation

AWS Cloudformation provisions AWS resources defined as code. Stacktape is built on top of it.
​
Stacktape provides a higher level abstraction. 1 Stacktape resource can consist of more than 15 Cloudformation resources.
​

#### Stacktape's advantages

- **Usable by common developers** - No need for infrastructure and DevOps experts.
- **Zero-config code builds** - Stacktape builds your code and creates optimized deployment packages for you.
- **Easy testing and debugging** - Includes developer tooling that makes developers productive.
  ​

#### Stacktape's disadvantages

- **None** - Stacktape can be easily extended using native AWS Cloudformation resources.
  ​

### Terraform

Terraform provisions resources across multiple cloud providers. It comes with it's own declarative langague.
​
Stacktape comes with a higher level of abstraction over cloud infrastructure and handles more tasks for the developer.
​

#### Stacktape's advantages

- **Usable by common developers** - No need for infrastructure and DevOps experts.
- **Zero-config code builds** - Stacktape builds your code and creates optimized deployment packages for you.
- **Easy testing and debugging** - Includes developer tooling that makes developers productive.
- **No state management** - Infrastructure state management is reliably handled for you by AWS cloudformation.
  ​

#### Stacktape's disadvantages

- **Not open-source** - Stacktape is not open-source. But we do have a generous free tier.
- **AWS only** - Stacktape currently supports only AWS.
  ​

## FAQ

- **"I have an issue. Where can I get help?"**
  You can get help on our community slack channel https://stacktape-community.slack.com. But we prefer if you submit an issue at https://github.com/stacktape/stacktape/issues
  ​
- **"Is Stacktape open-source?"**
  No. But we do have a generous free tier. And you can participate on Stacktape's development by submitting issues and feature requests. We value your feedback.
  ​
- **"Why isn't Stacktape open-source?"**
  Being able to monetize core features allows us to focus more on the product itself. We don't have to focus on premium addons or complementary services.
  ​
- **"Which languages are supported?"**
  To write configuration, you can use anything, from javascript, typescript and python to JSON and YAML. Zero-config bundling (e.g. building source code, resolving dependencies, packaging lambda packages or Docker images) is supported for Javascript and Typescript, with Python and Java coming very soon. Furthermore, you can deploy containers written in any language, if you supply your own Dockerfile.
  ​
- **"Are you going to support more cloud providers?"**
  Yes. We will start with MS Azure and continue with Google Cloud. You can expect first MS Azure support during second half of 2021.
  ​
- **"I have no previous cloud experience. Can I still use Stacktape?"**
  Yes. Our mission is to simplify cloud computing as much as possible. If you have a basic back-end development understanding, you will be able to deploy production-ready cloud applications to AWS in no time.
  ​

## Community and Socials

- [Email updates](https://stacktape.com/#subscribe)
- [Facebook](https://www.facebook.com/stacktape)
- [Twitter](https://twitter.com/stacktape)
- [Linked In](https://www.linkedin.com/company/stacktape/)
- [Instagram](https://www.instagram.com/stacktape_com/)
- [Slack](https://stacktape-community.slack.com)
- [Contact us](mailto:info@stacktape.com)
  ​

## Other

- [Terms of Use](https://stacktape.com/terms-of-use/)
- [Privacy Policy](https://stacktape.com/privacy-policy/)
