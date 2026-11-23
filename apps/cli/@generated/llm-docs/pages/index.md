# From scratch to production-grade AWS infra in a day. No DevOps knowledge required.

Stacktape turns one config file into infrastructure in your own AWS account, and the CLI builds and deploys your code to it. The CLI is open source and works without a Stacktape account.


`stacktape deploy` creates these resources with your AWS credentials, and AWS bills you for them directly. `stacktape delete` removes all of them.


## Start with your own project

Run this in your project's folder. A wizard opens in your browser, proposes a config from your code and deploys it
after you review it. You don't need a Stacktape account; the wizard offers the Console after the first deploy.


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


## Why teams use Stacktape


- **Containers & serverless:** Deploy Lambda functions and containers side by side — Fargate for steady workloads, Lambda for spiky ones, EC2 when you need raw control.
- **Full power of AWS:** SQL and NoSQL databases, load balancers, API gateways, Redis, MongoDB Atlas, queues, buckets and more — all first-class building blocks.
- **Risk-free:** Extend, override or eject anytime. Everything compiles to plain CloudFormation you can inspect and take with you.
- **Built-in CI/CD:** Push-to-deploy and isolated preview deployments for every pull request, straight out of the box.
- **Security built in:** Secret management, least-privilege permissions and private networking — configured by default.
- **Cost optimization:** A detailed cost breakdown across all your stacks and accounts. Billed by AWS, with no markup.


## Loved by teams shipping on AWS


## Open-source CLI, optional Console

The CLI is open source (MIT) and works without an account. Add the hosted Console when your team wants deploy history, costs, alerts and Git deployments; it is free up to $200 a month of managed AWS spend. See [Billing and subscription](/stacktape-console/billing-and-subscription).


See current pricing at https://stacktape.com/pricing.
