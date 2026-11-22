# Deploy your app to your own AWS account

Stacktape is an open-source CLI. It reads your project, writes the infrastructure config with you and deploys it with your own AWS credentials. A Console for teams is optional.

Run it in your project directory:

- macOS: `curl -fsSL https://installs.stacktape.com/macos.sh | sh -s -- init`
- Linux: `curl -fsSL https://installs.stacktape.com/linux.sh | sh -s -- init`
- Windows: `iex "& { $(irm https://installs.stacktape.com/windows.ps1) } init"`
- npm: `npx stacktape@latest init`

It opens a wizard in your browser. You review the setup and its monthly price, then deploy. No Stacktape account needed.


## Where to start

### Deploy an existing app

Run init in your app directory. The wizard proposes the AWS setup, shows its monthly price and deploys when you confirm.

Steps: Start, Analyze, Review, Deploy.

- [Quickstart](/getting-started)
- [The wizard, step by step](/getting-started/deploy-an-existing-app)

### Start a new project

Start from a working starter, such as Express with Postgres, Next.js or FastAPI.

```bash
npx stacktape@latest init --starter-project
```

- [Walkthrough](/getting-started/start-a-new-project)
- [Browse starters](/getting-started/starter-projects)

### Evaluate Stacktape for your team

Short answers on where it runs, what leaves your account, lock-in, networking, CI/CD, observability, costs and access.


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

- HTTP API Gateway (`api`): Public HTTPS URL for the service
- ECS on Fargate (`api`, in the VPC): Your container, 0.25 vCPU and 512 MB
- RDS Postgres 18 (`database`, in the VPC): db.t4g.micro, reachable only from `api`
- `STP_DATABASE_CONNECTION_STRING` in the container environment
- Security groups, an IAM role and CloudWatch logs
- The password read from AWS Secrets Manager

Deploy it:

1. Store the database password in your account: `stacktape secret set db-password --region eu-west-1`
2. Create the stack: `stacktape deploy --project my-api --stage dev --region eu-west-1`


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

With the Console: error events with log excerpts, metrics, check results and security findings. An incident AI run you start sends what the agent reads, code included, to its model provider. Logs, build artifacts and secrets stay in AWS. The CLI sends anonymous usage telemetry, which you can turn off. [What each feature sends](/observability/overview#what-leaves-your-aws-account)

### How you would leave

Stacktape deploys plain CloudFormation. `stacktape synth --out` writes the template to a file. You can override any AWS property or add raw CloudFormation and CDK constructs. [Escape hatches](/configuration/overrides-and-escape-hatches)

### Networking

Production stages get their own VPC, and other stages share one per account and region. Databases accept connections from the internet with credentials by default. One setting keeps them inside the VPC. [Connecting resources](/configuration/connecting-resources)

### CI/CD

Init can write a GitHub Actions, GitLab CI or Bitbucket pipeline. With the Console, a push deploys and each pull request can get its own preview stage. [CI/CD options](/ci-cd-and-gitops/overview)

### Observability

Logs, metrics and alarms stay in CloudWatch and work from the CLI. The Console adds error tracking, incidents and uptime checks. [Observability](/observability/overview)

### Costs

Init estimates the monthly price from AWS list prices before the first deploy. The Console shows what each stage costs and alerts you on budgets. [Managing costs](/managing-costs/overview)

### Access

The Console has roles per organization and project, two-factor sign-in and an audit log on every plan. SSO and SCIM come with the Flexible plan. [Team and access](/stacktape-console/team-and-access-control)


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
