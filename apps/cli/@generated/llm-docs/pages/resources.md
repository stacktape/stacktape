# Resource catalog

A resource is one part of your stack: a service, a database, a bucket, a queue. You declare it in the `resources` of your configuration, and Stacktape creates the AWS services it needs in your AWS account. [Declaring resources](/configuration/resources) explains the syntax. This page helps you pick the right resource.

## Pick by what you are building

| You want to | Use |
|---|---|
| Run an API or a web app in a container, with a public HTTPS URL | [Web service](/resources/compute/web-service) |
| Run code on demand: an API handler, a webhook, a queue or schedule consumer | [Lambda function](/resources/compute/lambda-function) |
| Run a background worker or queue consumer that stays on | [Worker service](/resources/compute/worker-service) |
| Run an internal service that only your other resources can call | [Private service](/resources/compute/private-service) |
| Run a job to completion, with GPUs or a long run time | [Batch job](/resources/compute/batch-job) |
| Deploy a Next.js, Astro, Nuxt, SvelteKit, SolidStart, TanStack Start or Remix app | The framework page under [Frontend](#frontend) |
| Host a static site or a single-page app | [Static hosting](/resources/frontend/static-hosting) |
| Store relational data in PostgreSQL or MySQL | [Relational database](/resources/databases/relational-database) |
| Store key-value data without managing servers | [DynamoDB](/resources/databases/dynamodb) |
| Cache data or keep sessions | [Redis](/resources/databases/redis), or [Upstash Redis](/resources/databases/upstash-redis) for Lambda-heavy apps |
| Store files and uploads | [S3 bucket](/resources/storage/s3-bucket) |
| Queue work between services | [SQS queue](/resources/messaging/sqs-queue) |
| Run code on a schedule, a file upload or a queue message | A [trigger](/resources/triggers/overview) on a Lambda function |
| Send email from your app | [Email sender](/resources/messaging/email-sender) |
| Sign users up and in | [User authentication pool](/resources/security/user-auth-pool) |
| Use an AWS service that has no resource here | [Raw CloudFormation](/resources/advanced/raw-cloudformation-resources) or an [AWS CDK construct](/resources/advanced/aws-cdk-constructs) |

## Choose a compute resource

Compute resources run your code. Pick by how the code is called and how long it runs.

| Resource | Called by | Runs | Public URL | Bills while idle |
|---|---|---|---|---|
| [Web service](/resources/compute/web-service) | HTTP requests from the internet | Always on, in containers | Yes | Yes |
| [Private service](/resources/compute/private-service) | Other resources in the stack | Always on, in containers | No | Yes |
| [Worker service](/resources/compute/worker-service) | Nothing; it polls queues or runs loops | Always on, in containers | No | Yes |
| [Multi-container workload](/resources/compute/multi-container-workload) | HTTP, load balancers or nothing | Always on, several containers in one task | Optional | Yes |
| [Lambda function](/resources/compute/lambda-function) | [Triggers](/resources/triggers/overview): HTTP, queues, schedules, files, streams | Per event, up to 15 minutes | Optional | No |
| [Batch job](/resources/compute/batch-job) | Triggers: schedules, HTTP, files, queues, streams | Until the job finishes | No | No |
| [Edge function](/resources/compute/edge-function) | CloudFront requests and responses | Per request, at the edge | Through a CDN | No |
| [Convex](/resources/compute/convex) | Your Convex clients | A self-hosted Convex backend | Yes | Yes |

Containers are packaged with [container packaging](/packaging/overview#container-packaging) and Lambda functions with [function packaging](/packaging/overview#function-packaging).

## All resources

### Compute

| Resource | AWS service | Use it for |
|---|---|---|
| [Web service](/resources/compute/web-service) | ECS on Fargate or EC2 | Public APIs and web apps in a container |
| [Lambda function](/resources/compute/lambda-function) | Lambda | Code that runs per event and scales to zero |
| [Private service](/resources/compute/private-service) | ECS on Fargate or EC2 | Internal services reachable only inside the stack |
| [Worker service](/resources/compute/worker-service) | ECS on Fargate or EC2 | Background workers and queue consumers |
| [Batch job](/resources/compute/batch-job) | AWS Batch | Jobs that run to completion, with CPU, memory or GPU needs |
| [Multi-container workload](/resources/compute/multi-container-workload) | ECS on Fargate or EC2 | Containers that start together and share a network |
| [Edge function](/resources/compute/edge-function) | Lambda@Edge | Small request and response changes at the CDN |
| [Convex](/resources/compute/convex) | ECS, RDS, S3 and a load balancer | A self-hosted Convex backend |

### Frontend

| Resource | AWS service | Use it for |
|---|---|---|
| [Static hosting](/resources/frontend/static-hosting) | S3 and CloudFront | Static sites, single-page apps and pre-rendered builds |
| [Next.js](/resources/frontend/nextjs) | Lambda, S3 and CloudFront | Next.js with server rendering |
| [Astro](/resources/frontend/astro) | Lambda, S3 and CloudFront | Astro with server-rendered routes |
| [Nuxt](/resources/frontend/nuxt) | Lambda, S3 and CloudFront | Nuxt with server rendering |
| [SvelteKit](/resources/frontend/sveltekit) | Lambda, S3 and CloudFront | SvelteKit with server rendering |
| [SolidStart](/resources/frontend/solidstart) | Lambda, S3 and CloudFront | SolidStart with server rendering |
| [TanStack Start](/resources/frontend/tanstack-start) | Lambda, S3 and CloudFront | TanStack Start with server rendering |
| [Remix](/resources/frontend/remix) | Lambda, S3 and CloudFront | Remix with server rendering |

### Databases

| Resource | AWS service | Use it for |
|---|---|---|
| [Relational database](/resources/databases/relational-database) | RDS or Aurora | PostgreSQL, MySQL, MariaDB and other SQL engines |
| [Aurora DSQL](/resources/databases/dsql) | Aurora DSQL | Serverless PostgreSQL-compatible SQL with IAM sign-in |
| [DynamoDB](/resources/databases/dynamodb) | DynamoDB | Key-value and document data at any scale |
| [Redis](/resources/databases/redis) | ElastiCache | Caching, sessions, rate limits and pub/sub inside your VPC |
| [Upstash Redis](/resources/databases/upstash-redis) | Upstash (outside AWS) | Pay-per-request Redis for serverless apps |
| [MongoDB Atlas](/resources/databases/mongodb-atlas) | MongoDB Atlas (outside AWS) | Document data with a flexible schema |
| [OpenSearch](/resources/databases/opensearch) | OpenSearch Service | Full-text search and log analytics |

### Storage

| Resource | AWS service | Use it for |
|---|---|---|
| [S3 bucket](/resources/storage/s3-bucket) | S3 | Files, uploads, backups and other objects |
| [EFS file system](/resources/storage/efs-filesystem) | EFS | A shared file system that containers mount |

### Networking

| Resource | AWS service | Use it for |
|---|---|---|
| [HTTP API Gateway](/resources/networking/http-api-gateway) | API Gateway (HTTP API) | Pay-per-request HTTP routing to functions and containers |
| [WebSocket API Gateway](/resources/networking/websocket-api-gateway) | API Gateway (WebSocket API) | Persistent client connections handled by functions |
| [AppSync API](/resources/networking/appsync-api) | AppSync | A GraphQL API with Lambda resolvers |
| [Application Load Balancer](/resources/networking/application-load-balancer) | Elastic Load Balancing (ALB) | HTTP routing by path, host or header, at a flat monthly price |
| [Network Load Balancer](/resources/networking/network-load-balancer) | Elastic Load Balancing (NLB) | TCP and TLS traffic, such as gRPC or MQTT |
| [CDN](/resources/networking/cdn) | CloudFront | Caching in front of a bucket, API, load balancer or function |
| [Custom domains](/resources/networking/custom-domains) | Route 53 and ACM | Serving a resource at your own domain |

### Messaging

| Resource | AWS service | Use it for |
|---|---|---|
| [SQS queue](/resources/messaging/sqs-queue) | SQS | Queuing work between services |
| [SNS topic](/resources/messaging/sns-topic) | SNS | Sending one message to many subscribers |
| [Event bus](/resources/messaging/event-bus) | EventBridge | Routing events to targets by pattern |
| [Kinesis stream](/resources/messaging/kinesis-stream) | Kinesis Data Streams | Ordered, replayable streams of records |
| [Kafka cluster](/resources/messaging/kafka-cluster) | MSK Serverless | Kafka topics for producers and consumers |
| [Email sender](/resources/messaging/email-sender) | SES | Sending email from a verified domain or address |

### Triggers

Triggers are not resources of their own. You add them to a Lambda function, and some also to a batch job or a container, so it runs when something happens. [Triggers overview](/resources/triggers/overview) compares them.

| Trigger | Runs your code when |
|---|---|
| [HTTP triggers](/resources/triggers/http-triggers) | A request reaches an HTTP API Gateway or a load balancer |
| [Schedule triggers](/resources/triggers/schedule-triggers) | A rate or cron schedule fires |
| [SQS events](/resources/triggers/sqs-events) | Messages arrive in a queue |
| [SNS events](/resources/triggers/sns-events) | A message is published to a topic |
| [S3 events](/resources/triggers/s3-events) | Objects are created, deleted or restored in a bucket |
| [DynamoDB streams](/resources/triggers/dynamodb-streams) | Items change in a table |
| [Kinesis events](/resources/triggers/kinesis-events) | Records arrive in a stream |
| [Kafka topic events](/resources/triggers/kafka-topics) | Records arrive in a Kafka topic |
| [Event bus events](/resources/triggers/event-bus-events) | An event on a bus matches a pattern |
| [CloudWatch Logs](/resources/triggers/cloudwatch-logs) | New records appear in a log group |
| [Alarms as triggers](/resources/triggers/alarms-as-triggers) | An alarm goes into the `ALARM` state |

### Orchestration

| Resource | AWS service | Use it for |
|---|---|---|
| [State machine](/resources/orchestration/state-machine) | Step Functions | Multi-step workflows with branches, retries and parallel steps |

### Security

| Resource | AWS service | Use it for |
|---|---|---|
| [User authentication pool](/resources/security/user-auth-pool) | Cognito | Sign-up, sign-in, MFA and social or enterprise login |
| [Web application firewall](/resources/security/web-application-firewall) | WAF | Blocking common attacks before they reach APIs and load balancers |
| [Bastion host](/resources/security/bastion-host) | EC2 with Systems Manager | Reaching private databases and caches from your machine |

### AgentCore

| Resource | AWS service | Use it for |
|---|---|---|
| [AgentCore Runtime](/resources/ai/agentcore-runtime) | Bedrock AgentCore | Running an AI agent packaged as a container |
| [AgentCore Memory](/resources/ai/agentcore-memory) | Bedrock AgentCore | Memory an agent keeps across sessions |
| [AgentCore Gateway](/resources/ai/agentcore-gateway) | Bedrock AgentCore | Lambda-backed tools behind one MCP endpoint |
| [AgentCore Browser](/resources/ai/agentcore-browser) | Bedrock AgentCore | A browser an agent can drive |
| [AgentCore Code Interpreter](/resources/ai/agentcore-code-interpreter) | Bedrock AgentCore | A sandbox where an agent runs code |

### Advanced

| Resource | AWS service | Use it for |
|---|---|---|
| [Deployment scripts](/resources/advanced/deployment-scripts) | Lambda | Migrations, seeding and cleanup run inside AWS during a deploy or delete |
| [Custom resources](/resources/advanced/custom-resources) | Lambda and CloudFormation | Provisioning something CloudFormation does not support, with your own code |
| [AWS CDK constructs](/resources/advanced/aws-cdk-constructs) | Any | Adding an existing CDK construct to the stack |
| [Raw CloudFormation resources](/resources/advanced/raw-cloudformation-resources) | Any | Declaring any AWS resource directly |

## What else goes in a stack

[Uptime checks](/observability/uptime-checks) and [synthetic tests](/observability/synthetic-tests) are configured in the stack too, and [alarms](/observability/alarms) are set on the resource they watch. Their pages are under Observability.

## What resources cost

Always-on resources bill by the hour even with no traffic. These include web, private and worker services, multi-container workloads, relational databases, Redis, OpenSearch, load balancers, Kafka clusters, bastion hosts and Convex. Most other resources bill per request, per message or per GB stored. Each resource page has a pricing note, and [Managing costs](/managing-costs/overview) explains how to track the bill.
