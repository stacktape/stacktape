# Stacktape

**The fastest way to ship production AWS infrastructure. Define it in TypeScript, deploy it in one command, and own every byte — it runs in your AWS account.**

Stacktape gives you the speed of a PaaS (Heroku, Vercel, Render) with the control and cost structure of raw AWS. You write a TypeScript file, run `stacktape deploy`, and Stacktape provisions every resource — Lambda, ECS, RDS, DynamoDB, S3, CloudFront, ALB, EventBridge, Step Functions, and 30+ more — with sensible defaults, automatic IAM, and full override access when you need it. No CloudFormation YAML, no Terraform modules, no DevOps team required.

## A real Stacktape config

A complete HTTP API backed by DynamoDB, with auto-generated IAM and environment variables — 22 lines:


Example (stacktape.ts):

```typescript
import {
  defineConfig,
  DynamoDbTable,
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging
} from 'stacktape';

export default defineConfig(() => {
  const api = new HttpApiGateway({});

  const usersTable = new DynamoDbTable({
    primaryKey: { partitionKey: { name: 'id', type: 'string' } }
  });

  const createUser = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: 'src/create-user.ts' }),
    connectTo: [{ resource: usersTable, access: 'readWrite' }],
    events: [new HttpApiIntegration({ httpApiGatewayName: 'api', method: 'POST', path: '/users' })]
  });

  return { resources: { api, usersTable, createUser } };
});
```


Run `stacktape deploy --stage prod` and you get a live API Gateway endpoint, a DynamoDB table, a Lambda with the table's name injected as `STP_USERS_TABLE_NAME` and IAM that lets it `GetItem` / `PutItem` — nothing else. No console clicking, no IAM JSON.

## What you can build with Stacktape


## Related Pages
- [Fullstack web apps](/resources/frontend/nextjs): Next.js, Astro, Remix, SvelteKit, SolidStart, Nuxt, TanStack Start — deployed to AWS with global CDN and zero config.

- [Serverless APIs](/resources/compute/lambda-function): Lambda + API Gateway, with DynamoDB, RDS, Redis, or OpenSearch wired in via connectTo.

- [Long-running services](/resources/compute/web-service): Container workloads on Fargate or EC2 — web services, workers, multi-container stacks, batch jobs.

- [Event-driven pipelines](/configuration/triggers/overview): SQS, SNS, EventBridge, Kinesis, DynamoDB Streams, S3 events, schedules — declarative wiring, automatic IAM.

- [AI agents on AWS Bedrock](/resources/ai/agentcore-runtime): AgentCore runtimes, memory, gateways, browsers, and code interpreters — production agents in a few lines of config.

- [Workflows and orchestration](/resources/orchestration/state-machine): Step Functions state machines for multi-step workflows with retries, parallelism, and human-in-the-loop.


## Why Stacktape

- **Your AWS account, your costs.** Stacktape provisions everything inside the AWS account you own. No middleman markup, no per-seat pricing on compute. Pay AWS rates, see line-item costs in the Console.
- **Containers AND serverless, side by side.** Use Lambda for spiky workloads, Fargate for steady ones, EC2 when you need GPUs or raw control — all in the same `stacktape.ts`.
- **Sensible defaults, full overrides.** Stacktape picks production-ready settings (HTTPS, encrypted storage, least-privilege IAM, VPC isolation where appropriate). When you need to override something, you can: every resource accepts raw CloudFormation overrides, and you can drop CDK constructs or hand-written CloudFormation inline.
- **No redeploy loop.** Run `stacktape dev` once and your code runs locally against real cloud resources. Edit, save, hit your endpoint — no `deploy`, no `terraform apply`. Lambda, container, schedule, and queue handlers all hot-reload.
- **CI/CD and observability built in.** [Push-to-deploy](/ci-cd-and-gitops/gitops-with-console), PR preview stages, [live logs](/observability/logs), [metrics](/observability/metrics), [alarms](/observability/alarms), [issue tracking](/observability/issues), and [per-resource cost dashboards](/managing-costs/per-resource-breakdown) come with the Console. Free tier covers most teams.
- **Open source core.** The CLI, the resource library, and the deployment engine are MIT-licensed. [Paid Console plans](/stacktape-console/billing-and-subscription) add hosted CI/CD, GitOps, team management, and observability — but the CLI alone gets you production deploys.

## Get started


## Related Pages
- [Install and configure](/getting-started/configure-your-stack): Bootstrap your first stacktape.ts in 2 minutes.

- [Use dev mode](/getting-started/use-the-dev-mode): The local + cloud loop with no redeploys.

- [Deploy your first stage](/getting-started/deploy-your-first-stage): `stacktape deploy` and see a real stack come up.


## Related Pages
- [Browse resources](/resources/compute/lambda-function): Every supported AWS resource type.

- [Stacktape Console](/stacktape-console/console-overview): GitOps, logs, metrics, costs, secrets, guardrails.

- [Use with AI](/using-with-ai/overview): MCP server, agent mode, AI config generation.
