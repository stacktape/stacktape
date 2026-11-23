# From scratch to production-grade AWS infra in a day. No DevOps knowledge required.

Stacktape deploys your app into your own AWS account. You describe its services, databases and domains in one config file, and the CLI builds your code and creates the AWS resources. The CLI is open source and works without a Stacktape account.


## Quick start


### Run stacktape init in your project


    Use npm, or the standalone installer, which needs no Node.js and starts `stacktape init` right after it installs.


Example (npm):

```bash
npx stacktape init
```


Example (macOS):

```bash
curl -fsSL https://installs.stacktape.com/macos.sh | sh -s -- init
```


Example (Linux):

```bash
curl -fsSL https://installs.stacktape.com/linux.sh | sh -s -- init
```


Example (Windows):

```powershell
iex "& { $(irm https://installs.stacktape.com/windows.ps1) } init"
```


### Review the config and deploy


    A wizard opens in your browser. It reads your project, proposes a config and writes it once you have reviewed it.
    Then it shows the AWS account and stack it will deploy to, and deploys with the AWS credentials on your machine. You
    don't need a Stacktape account.


### Keep going from the terminal


    After the first deploy, the wizard offers the [Stacktape Console](/stacktape-console/console-overview) and a CI/CD
    pipeline. From then on you develop against real AWS resources and redeploy from the terminal or CI.


Example (dev mode):

```bash
stacktape dev --stage dev --region eu-west-1
```


Example (deploy):

```bash
stacktape deploy --stage production --region eu-west-1
```


## Pick your path


### Deploy an app you already have

Run `stacktape init` in the repository. The wizard proposes a config from your code and deploys it after you review it.

- [Configure your stack](/getting-started/configure-your-stack)
- [Deploy your first stage](/getting-started/deploy-your-first-stage)


### Start a new project

Start from one of 60+ starter projects, from REST APIs to full-stack apps and AI agents. Scaffold one with `stacktape init --starter-id <id>`.

- [Browse starter projects](/getting-started/starter-projects)


### Evaluate it for your team

Everything runs in your AWS account and AWS bills you directly. The config compiles to CloudFormation that you can override, or extend with raw CloudFormation and AWS CDK.

- [What you can deploy](/resources/compute/web-service)
- [Overrides and escape hatches](/configuration/overrides-and-escape-hatches)
- [CLI without an account](/getting-started/open-source-cli)
- [Console pricing](/stacktape-console/billing-and-subscription)


## Map of the docs


- [Getting Started](/getting-started/configure-your-stack): From the first config to production, in order.
- [Configuration](/configuration/configuration-files): Config files, stages, connecting resources, secrets and overrides.
- [Resources](/resources/compute/web-service): Every resource you can deploy, with all its properties.
- [Packaging](/packaging/overview): How your code becomes a Lambda package or a container image.
- [Deploying & Lifecycle](/deployment-and-lifecycle/deploying-stacks): Deploys, change previews, rollbacks and deleting stacks.
- [Local Development](/local-development/dev-mode-overview): Run your services locally without redeploying.
- [CI/CD & GitOps](/ci-cd-and-gitops/overview): Push-to-deploy, custom pipelines and build runners.
- [Observability](/observability/overview): Logs, metrics, alarms, error tracking and uptime checks.
- [Managing Costs](/managing-costs/overview): Cost dashboards, budgets and per-resource breakdowns.
- [Guardrails](/guardrails/overview): Organization-wide rules for stages, regions and resource settings.
- [Using with AI](/using-with-ai/overview): The MCP server and agent mode for coding assistants.
- [Stacktape Console](/stacktape-console/console-overview): Deploy history, incidents, costs, team access and billing.
- [CLI Reference](/cli/deploy): Every command and flag.


## Everything you need, in one framework


- **Containers & serverless:** Deploy Lambda functions and containers side by side — Fargate for steady workloads, Lambda for spiky ones, EC2 when you need raw control.
- **Full power of AWS:** SQL and NoSQL databases, load balancers, API gateways, Redis, MongoDB Atlas, queues, buckets and more — all first-class building blocks.
- **Risk-free:** Extend, override or eject anytime. Everything compiles to plain CloudFormation you can inspect and take with you.
- **Infrastructure as code:** TypeScript, YAML or JSON — about 97% shorter than writing the equivalent CloudFormation by hand.
- **Built-in CI/CD:** Push-to-deploy and isolated preview deployments for every pull request, straight out of the box.
- **Development mode:** Run services locally while connected to real cloud resources — test changes without redeploying every time.
- **Smart builds:** Zero-config, optimized parallel builds with advanced caching for every function and container.
- **Security built in:** Secret management, least-privilege permissions and private networking — configured by default.
- **Cost optimization:** A detailed cost breakdown across all your stacks and accounts. Billed by AWS, with no markup.


## A real Stacktape config

A complete HTTP API backed by DynamoDB, with CORS, a custom domain per stage, auto-generated IAM and environment variables:


Example (stacktape.ts):

```typescript
import {
  defineConfig,
  DynamoDbTable,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  JsBundleLambdaPackaging
} from 'stacktape';

export default defineConfig(({ stage }) => {
  const database = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'id', type: 'string' } }
  });

  const api = new HttpApiGateway({
    cors: { enabled: true },
    customDomains: [{ domainName: stage === 'production' ? 'acme.com' : stage + '-acme.com' }]
  });

  const myFunction = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/index.ts' }),
    events: [new HttpApiIntegration({ httpApiGatewayName: api, method: 'GET', path: '/' })],
    connectTo: [database],
    environment: { TABLE_NAME: database.name }
  });

  return { resources: { api, myFunction, database } };
});
```


Run `stacktape deploy` and you get a live API Gateway endpoint with your custom domain, a DynamoDB table, and a Lambda with the table name injected and IAM scoped to exactly what it needs — no console clicking, no IAM JSON.

## Override & extend

Need more control? Override or transform any AWS resource:


Example (stacktape.ts):

```typescript
import { LambdaFunction, JsBundleLambdaPackaging } from 'stacktape';

const myFunction = new LambdaFunction({
    // ... standard config
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/index.ts' }),
    overrides: {
      lambda: { Description: 'Overridden description' }
    },
    transforms: {
      lambda: (props: any) => ({ ...props, MemorySize: (props.MemorySize ?? 128) * 2 })
    }
});
```


You can also add [raw CloudFormation resources](/resources/advanced/raw-cloudformation-resources) and [AWS CDK constructs](/resources/advanced/aws-cdk-constructs) next to your Stacktape resources.

## Open-source CLI, optional Console

The CLI is open source (MIT) and works without an account. Add the hosted Console when your team wants deploy history, costs, alerts and Git deployments; it is free up to $200 a month of managed AWS spend. See [Billing and subscription](/stacktape-console/billing-and-subscription).


See current pricing at https://stacktape.com/pricing.


## Loved by teams shipping on AWS


## Ready to simplify your AWS deployments?

From scratch to production-grade AWS infra in a day — no DevOps knowledge required.

- [Get started](/getting-started/configure-your-stack/)
- [Browse examples](/getting-started/starter-projects/)
