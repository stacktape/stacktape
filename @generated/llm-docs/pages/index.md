# Introduction

Stacktape deploys and manages production-grade AWS infrastructure from a single TypeScript or YAML config file. It supports 30+ resource types — Lambda functions, containers, databases, queues, CDNs, and more — with opinionated defaults that follow AWS well-architected practices. Everything deploys to your own AWS account, so you keep full control of your infrastructure.

## Who Stacktape is for

Stacktape is built for developers and teams who want to run on AWS without becoming AWS experts. If you know what a database, an API, and a deployment are, you have enough background to use Stacktape. No DevOps or CloudFormation knowledge required.

Stacktape fits best when you want the control and cost structure of your own AWS account but don't want to maintain Terraform modules, CDK stacks, or CloudFormation templates yourself.

## How Stacktape compares

| | Raw AWS (CloudFormation, CDK, Terraform) | Traditional PaaS (Heroku, Render, Railway) | **Stacktape** |
|---|---|---|---|
| **Infrastructure ownership** | Your AWS account | Vendor-managed | Your AWS account |
| **Config verbosity** | High — hundreds of lines per resource | Minimal — platform decides | Minimal — with full override access |
| **Vendor lock-in** | Low | High | Low — eject to raw CloudFormation anytime |
| **Operational visibility** | You build it | Limited | Built-in logs, metrics, alarms, cost tracking |
| **Scaling control** | Full | Limited | Full — same AWS scaling primitives |

Stacktape gives you PaaS-level simplicity with IaC-level control. You define resources in TypeScript using `defineConfig` and typed classes, deploy with one command, and override or extend any underlying AWS resource when you need to.

## What you get

- **Containers and serverless** in the same config — [Lambda functions](/resources/compute/lambda-function), [web services](/resources/compute/web-service), [batch jobs](/resources/compute/batch-job), and more.
- **Managed databases** — [PostgreSQL, MySQL](/resources/databases/relational-database), [DynamoDB](/resources/databases/dynamodb), [Redis](/resources/databases/redis), [MongoDB Atlas](/resources/databases/mongodb-atlas).
- **Zero-config builds** — Stacktape packages your code automatically. Point to a source file or Dockerfile and deploy.
- **Built-in CI/CD** — [push-to-deploy and PR preview environments](/ci-cd-and-gitops/overview) through the Stacktape Console.
- **Dev mode** — run your code locally while connected to real cloud resources with [`stacktape dev`](/local-development/dev-mode-overview).
- **Security defaults** — least-privilege IAM, [secret management](/configuration/secrets), private networking.
- **Cost visibility** — per-resource [cost breakdown](/managing-costs/per-resource-breakdown) across all your stacks and accounts.
- **Override anything** — use [overrides, transforms](/configuration/overrides-and-escape-hatches), raw CloudFormation, or [CDK constructs](/resources/advanced/aws-cdk-constructs) when Stacktape's abstractions aren't enough.

## Open source

Stacktape core is open source under the MIT license and free to use from the CLI. The [Stacktape Console](/stacktape-console/console-overview) adds CI/CD, log browsing, cost dashboards, guardrails, and team management as a paid service.

## Next step

Ready to start? Head to [Configure your stack](/getting-started/configure-your-stack) to create your first Stacktape project.
