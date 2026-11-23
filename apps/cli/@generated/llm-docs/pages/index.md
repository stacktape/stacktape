# Deploy your app to your own AWS account

Stacktape is an open-source CLI. It reads your project, writes the infrastructure config with you and deploys it with your own AWS credentials. A Console for teams is optional.

Run it in your project directory:

- macOS: `curl -fsSL https://installs.stacktape.com/macos.sh | sh -s -- init`
- Linux: `curl -fsSL https://installs.stacktape.com/linux.sh | sh -s -- init`
- Windows: `iex "& { $(irm https://installs.stacktape.com/windows.ps1) } init"`
- npm: `npx stacktape@latest init`

It opens a wizard in your browser. You review the setup and its monthly price, then deploy. No Stacktape account needed.

- [Quickstart](/getting-started)
- [Starting a new project?](/getting-started/start-a-new-project)


## Where to start

### Deploy an existing app

Run init in your app directory. The wizard proposes the AWS setup, shows its monthly price and deploys when you confirm.

Steps: Start, Analyze, Review, Deploy.

- [Deploy an existing app](/getting-started/deploy-an-existing-app)

### Start a new project

Start from a working starter, such as Express with Postgres, Next.js or FastAPI.

```bash
npx stacktape@latest init --starter-project
```

- [Start a new project](/getting-started/start-a-new-project)

### Evaluate Stacktape for your team

What a team lead or CTO wants to know before a pilot: what runs where, who owns production and how you would leave.

Covers: Where it runs, data, access, stages, costs, support, lock-in.

- [Evaluate Stacktape for your team](/getting-started/evaluate)


## A config and what it creates

An API container and a Postgres database that only the API can reach. Init writes a file like this for you, and you can change it by hand. TypeScript configs get type checking and autocomplete.


Example (TypeScript):

```typescript
import {
  defineConfig,
  WebService,
  JsBundleImagePackaging,
  RelationalDatabase,
  RdsEnginePostgres,
  $Secret
} from 'stacktape';

export default defineConfig(() => {
  const database = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      version: '18',
      primaryInstance: { instanceSize: 'db.t4g.micro' }
    }),
    credentials: {
      masterUserPassword: $Secret('db-password')
    },
    accessibility: {
      accessibilityMode: 'scoping-workloads-in-vpc'
    }
  });

  const api = new WebService({
    packaging: new JsBundleImagePackaging({
      entryfilePath: './src/server.ts'
    }),
    resources: { cpu: 0.25, memory: 512 },
    connectTo: [database]
  });

  return { resources: { api, database } };
});
```


Example (YAML):

```yaml
resources:
  database:
    type: relational-database
    properties:
      engine:
        type: postgres
        properties:
          version: '18'
          primaryInstance:
            instanceSize: db.t4g.micro
      credentials:
        masterUserPassword: $Secret('db-password')
      accessibility:
        accessibilityMode: scoping-workloads-in-vpc
  api:
    type: web-service
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: ./src/server.ts
      resources:
        cpu: 0.25
        memory: 512
      connectTo:
        - database
```


What it creates in your AWS account, in the stack `my-api-dev`:

- `api` (WebService), connected by HTTPS requests:
  - HTTP API Gateway: The public URL
  - ECS on Fargate: Your container, 0.25 vCPU and 512 MB, in the VPC
- `database` (RelationalDatabase), connected by `connectTo`: private, inside the VPC:
  - RDS Postgres 18: db.t4g.micro, reachable only from `api`
- `STP_DATABASE_CONNECTION_STRING` in the container environment
- Security groups, an IAM role and CloudWatch logs
- A generated database password, kept in AWS Secrets Manager

Deploy it:

1. Create the stack. The first deploy generates the database password.: `stacktape deploy --project my-api --stage dev --region eu-west-1`


## The open-source CLI and the optional Console

### Stacktape CLI

Free and open source (MIT)

- Deploy, update, roll back and delete stacks
- Dev mode, scripts, bastion tunnels and container sessions
- Logs, metrics, secrets and alarms in your AWS account
- Runs on your AWS credentials, without a Stacktape account

### Stacktape Console

Free up to $200 a month of managed AWS spend

- Deploy history and costs for every stage
- Error tracking, incidents and uptime checks
- Git deployments and pull request previews
- Team access and an audit log
- Adds your existing stacks with `stacktape connect`, without a redeploy

Above $200 a month, the Flexible plan costs 19–25% of the managed AWS spend. AWS bills you for the resources directly. [Plans and billing](/stacktape-console/billing-and-subscription)


## Evaluating Stacktape for a team

### Where it runs

AWS resources are created in your account, one CloudFormation stack per stage. MongoDB Atlas and Upstash resources, if you use them, live with those providers. Stacktape gets access to your AWS account only if you connect the Console. [Using the CLI without an account](/getting-started/open-source-cli)

### What leaves your account

Without the Console: anonymous CLI telemetry, which you can turn off, and the config init sends for its price estimate. With the Console: alarm state changes, uptime results, monthly cost breakdowns, security findings and errors. Application logs stay in CloudWatch; each recorded error sends a masked copy of its log line. AI features send data to the provider of your own key, and only when you use them. [What each feature sends](/observability/overview#what-leaves-your-aws-account)

### How you would leave

Your stacks are plain CloudFormation in your account and keep running without Stacktape. `stacktape synth` writes the template to a file. To leave, you take over the stacks and replace the few parts the CLI did for you. [Stop using Stacktape](/getting-started/evaluate/stop-using-stacktape)

### Networking

Non-production stages in one account and region share a VPC, each with its own security groups. Production stages get their own. The first deploy decides, so choose before it. Databases accept internet connections with credentials by default: `accessibilityMode` limits who can connect, and `forceDisablePublicIp` removes the public IP. [Shared network](/configuration/shared-network)

### CI/CD

Your pipeline runs `stacktape deploy` with AWS credentials, no Stacktape account needed. Init can write a GitHub Actions, GitLab CI or Bitbucket pipeline. With the Console, a push deploys and each pull request can get its own preview stage. [CI/CD options](/ci-cd-and-gitops/overview)

### Observability

Logs, metrics and alarms stay in CloudWatch and work from the CLI. The Console adds error tracking, incidents and uptime checks. [Observability](/observability/overview)

### Costs

Init estimates the monthly price from AWS list prices before the first deploy. The Console shows what each stage costs and alerts you on budgets. [Managing costs](/managing-costs/overview)

### Access

The Console has roles per organization and project, two-factor sign-in and an audit log on every plan. SSO and SCIM come with the Flexible plan. AWS access covers a whole account: whoever can deploy to it can reach every stack in it, so keep production and each client in their own account. [Team and access](/stacktape-console/team-and-access-control)


## Find your way around

### Configure

- [Configuration files](/configuration/configuration-files)
- [Resource catalog](/resources)
- [Connecting resources](/configuration/connecting-resources)
- [Secrets](/configuration/secrets)
- [Stages and environments](/configuration/stages-and-environments)
- [Packaging](/packaging/overview)

### Deploy

- [Deploying stacks](/deployment-and-lifecycle/deploying-stacks)
- [Previewing changes](/deployment-and-lifecycle/previewing-changes)
- [Rollbacks](/deployment-and-lifecycle/rollbacks)
- [CI/CD](/ci-cd-and-gitops/overview)
- [Custom domains](/resources/networking/custom-domains)
- [Going to production](/getting-started/going-to-production)

### Operate

- [Logs](/observability/logs)
- [Alarms](/observability/alarms)
- [Error tracking](/observability/error-tracking)
- [Costs](/managing-costs/overview)
- [Dev mode](/local-development/dev-mode-overview)
- [Stacktape Console](/stacktape-console/console-overview)

### Reference

- [CLI commands](/cli)
- [Web service](/resources/compute/web-service)
- [Lambda function](/resources/compute/lambda-function)
- [Relational database](/resources/databases/relational-database)
- [Next.js](/resources/frontend/nextjs)
- [Using with AI agents](/using-with-ai/overview)
