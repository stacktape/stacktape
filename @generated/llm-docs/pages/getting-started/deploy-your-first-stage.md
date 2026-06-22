# Deploy Your First Stage

Deploying a Stacktape stage takes your `stacktape.ts` configuration and provisions real AWS infrastructure — a CloudFormation stack containing every resource you declared. This page walks you through authentication, AWS account connection, and running your first deploy command.


> **Info:** Already deployed before? Skip to [CI/CD](/getting-started/ci-cd) or [Going to production](/getting-started/going-to-production).


## Prerequisites

Before deploying, you need:

- A `stacktape.ts` configuration file (created in [Configure your stack](/getting-started/configure-your-stack))
- A Stacktape account (free — created during login)
- An AWS account to deploy into

If you followed [Use the dev mode](/getting-started/use-the-dev-mode), your config is already tested locally and ready for a real deployment.

## Step 1: Log in to Stacktape

The [`stacktape login`](/cli/login) command authenticates your CLI with the Stacktape platform. The command verifies your credentials, saves the API key locally, and shows the authenticated user and organization.

```bash
stacktape login
```

The CLI opens an interactive auth flow. You can authenticate with Google, sign up with email, or enter an existing API key. After successful authentication, the CLI stores your credentials locally and displays your user and organization name.

For CI environments or headless servers where a browser is not available, pass an API key directly.

```bash
stacktape login --apiKey YOUR_API_KEY
```

You can create API keys in the [Stacktape Console](/stacktape-console/api-keys).

## Step 2: Connect your AWS account

Stacktape deploys resources into your own AWS account. Before your first deploy, you need to connect an AWS account to your Stacktape organization. This creates a cross-account IAM role that Stacktape assumes to perform deployments, read logs, and manage resources on your behalf.

Open the connected AWS accounts page in the [Stacktape Console](/stacktape-console/connecting-your-aws-account) and click **Connect AWS account**. Enter an **Account name** (an arbitrary name like `dev-account`), then click **Connect account in AWS console**. This opens a CloudFormation Quick Create link in your AWS console. After the stack finishes creating, the connection activates automatically and the account status changes to `ACTIVE` in the Console.


> **Tip:** Connecting an AWS account is free. AWS resources created by your stacks are billed by AWS in your AWS account.


### What the connection creates

The connection CloudFormation stack must be created in the `eu-west-1` region and creates an IAM role with cross-account trust. Stacktape assumes this role to deploy and manage resources in your account. Your actual project stacks can deploy to any AWS region — the connection stack location does not restrict where your infrastructure runs.

You can revoke access at any time by deleting the connection in the Console or deleting the CloudFormation stack directly in AWS. For details on the exact permissions granted, see [AWS permissions](/stacktape-console/aws-permissions).

## Step 3: Deploy

With authentication and AWS connection in place, deploy your stack with the [`stacktape deploy`](/cli/deploy) command.

```bash
stacktape deploy --stage dev --region eu-west-1
```

Stages let you run multiple independent copies of your infrastructure — `dev`, `staging`, `production` — from the same configuration. See the [`stacktape deploy`](/cli/deploy) CLI reference for the full list of flags and their accepted values.

If your configuration file is not named `stacktape.ts` or is in a different directory, point the CLI at it explicitly.

```bash
stacktape deploy --stage dev --region eu-west-1 --configPath ./infra/stacktape.ts
```

### What happens during deploy

Stacktape processes your configuration in four phases:


## Flow
1. **Build & Package**: Bundles your application code (Lambda zips, container images), resolves resource configuration, evaluates directives and secrets, and generates the CloudFormation template.
2. **Upload**: Packaged artifacts are uploaded to an S3 deployment bucket in your AWS account.
3. **Deploy**: A CloudFormation stack is created (first deploy) or updated with the generated template. CloudFormation provisions, updates, or removes AWS resources as needed.
4. **Post-deploy**: For stacks that include hosting buckets or CDNs, Stacktape syncs static files and invalidates CDN caches. Then it prepares deployed stack information and resource links.


On the first deploy, CloudFormation creates the stack and all resources from scratch. On subsequent deploys, Stacktape prepares the CloudFormation template, computes a diff, uploads artifacts, and submits the template to CloudFormation to update the stack. When `--hotSwap` is enabled and eligible, Stacktape updates Lambda function code or container workload services directly instead of running a full CloudFormation stack update.

### Deploy output

After a successful CLI deploy, Stacktape includes resource links and a Console URL in the completion output. The Console URL follows the pattern:

```
https://console.stacktape.com/projects/{project}/{stage}/overview
```

The Console URL includes the project name. The project name is set via `--projectName`, a configured default (see [`stacktape defaults:configure`](/cli/defaults-configure)), or an interactive prompt on your first deploy. See the [`stacktape deploy`](/cli/deploy) CLI reference for the full list of flags. Open this URL to manage the deployed stack in the Console.

## What gets created in AWS

A standard Stacktape deploy creates or updates a CloudFormation stack in the connected AWS account. When `--hotSwap` is enabled and eligible, Stacktape can update Lambda function code or container workload services directly without a CloudFormation stack update. The CloudFormation stack is the unit Stacktape manages for the stage. Inside the stack, CloudFormation provisions whatever your configuration declares:

| What | Example |
|---|---|
| Your declared resources | Lambda functions, container services, databases, buckets, queues — everything in your `stacktape.ts` |
| Deployment artifacts | Uploaded before the stack is deployed; Stacktape passes the CloudFormation template URL to CloudFormation |
| IAM roles and policies | Resource access configured through [`connectTo`](/configuration/connecting-resources); see [Connecting resources](/configuration/connecting-resources) for details |
| Log groups | CloudWatch log groups for each compute resource that produces logs |

Because Stacktape deploys through CloudFormation, the resulting AWS resources also appear in the AWS console for direct inspection.

## Verifying the deploy

After the deploy completes, verify your stack is running.

Open the resource URL printed by the CLI. For a [web service](/resources/compute/web-service) or [Lambda function](/resources/compute/lambda-function) with an HTTP trigger, this is a live HTTPS endpoint you can hit immediately.

The deploy output also includes a Console URL for the deployed stack. See [Manage your app in the Console](/getting-started/using-console-ui) for what you can do there.

To view logs from the CLI, use [`stacktape logs`](/cli/logs).

```bash
stacktape logs
```

## Redeploying after changes

After making code or configuration changes, run the same deploy command again.

```bash
stacktape deploy --stage dev --region eu-west-1
```

Stacktape prepares the CloudFormation template, computes a diff, uploads artifacts, and submits the template to CloudFormation to update the stack.

### Hot-swap for faster code iteration

When you pass `--hotSwap`, Stacktape attempts a direct code update for eligible Lambda functions and container workloads — bypassing CloudFormation entirely. If Stacktape determines hot-swap is not possible (because the infrastructure template changed), it falls back to a full CloudFormation deploy automatically.

```bash
stacktape deploy --stage dev --region eu-west-1 --hotSwap
```

Hot-swap is useful during development when you're iterating on application code without changing infrastructure. It completes significantly faster than a full deploy since no CloudFormation stack update is needed.

## Deploying multiple stages

Stages are independent copies of your infrastructure. Deploy a staging environment alongside dev by choosing a different stage name.

```bash
stacktape deploy --stage staging --region eu-west-1
```

Each stage is deployed as its own CloudFormation stack with its own resources and URLs. Use different stage names to run separate copies of the resources declared by your configuration. This lets you test changes in staging without affecting production users. For automated stage-per-branch workflows, see [Stacks per git branch](/ci-cd-and-gitops/stacks-per-git-branch-pattern).

## Troubleshooting

### "No connected AWS accounts"

You need to connect an AWS account before deploying. Open the connected AWS accounts page in the [Stacktape Console](/stacktape-console/connecting-your-aws-account) and follow the connection flow described in Step 2.

### Deploy takes longer than expected

First deploys take longer because every resource must be created from scratch. Databases and container services take longer to provision than Lambda functions. Subsequent deploys that only change code complete faster, especially with `--hotSwap`.

### CloudFormation rollback

If a resource fails to create, CloudFormation automatically rolls back all changes — your stack returns to its previous working state. The CLI displays the specific error. Common causes include IAM permission issues, resource limit quotas, or invalid configuration values. For rollback options, see [`stacktape rollback`](/cli/rollback) for version-based rollback and [`stacktape cf:rollback`](/cli/cf-rollback) for CloudFormation-level rollback.

### Deploy fails during dev mode

You cannot deploy to a stage that currently has an active [dev mode](/getting-started/use-the-dev-mode) session. Stop dev mode first with [`stacktape dev:stop`](/cli/dev-stop), or deploy to a different stage name.

## FAQ

### How long does a first deploy take?

First deploys depend on the resources being provisioned. Lambda-only stacks are the fastest. Stacks with databases, container services, or custom domains take longer because AWS provisions those resources sequentially. Subsequent deploys that only change application code are faster since CloudFormation only updates the diff — and `--hotSwap` deploys bypass CloudFormation entirely for eligible code changes.

### Does Stacktape cost money to use with AWS?

Connecting an AWS account is free. AWS resources created by your stacks are billed by AWS in your AWS account. See [Billing and subscription](/stacktape-console/billing-and-subscription) for Stacktape plan details.

### Can I deploy to any AWS region?

Yes. The AWS account connection stack is created in `eu-west-1`, but your project stacks can deploy to any AWS region. Specify the region with `--region` on each deploy command, or set a default with [`stacktape defaults:configure`](/cli/defaults-configure).

### Is the connection between Stacktape and my AWS account secure?

The connection uses a CloudFormation stack that grants Stacktape cross-account AssumeRole access — the standard AWS approach for third-party integrations. You can revoke access instantly by deleting the connection stack in AWS or removing the account from the Console.

### What happens if I lose internet during a deploy?

CloudFormation continues the deployment on AWS's side regardless of your local connection. If the CLI disconnects, check the stack status with [`stacktape info:stack`](/cli/info-stack) before running another deploy.

### What's the difference between stages and AWS accounts?

Stages are logical environments (dev, staging, production) within a single AWS account — each stage gets its own CloudFormation stack with fully isolated resources. You can also connect multiple AWS accounts in the Console and deploy different stages to different accounts (e.g., production in a separate account). See [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) for details.

### Can I preview what a deploy will change before running it?

Yes. Use [`stacktape diff`](/cli/diff) to see the CloudFormation change set without actually deploying. This shows which resources would be created, updated, replaced, or deleted.

---
