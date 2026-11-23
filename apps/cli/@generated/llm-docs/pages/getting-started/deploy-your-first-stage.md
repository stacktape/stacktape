# Deploy Your First Stage

Deploying a Stacktape stage takes your `stacktape.ts` configuration and provisions real AWS infrastructure — a CloudFormation stack containing every resource you declared. This page walks you through AWS credentials and your first deploy command. You don't need a Stacktape account: the open-source CLI deploys with your own AWS credentials. See [Use the CLI without an account](/getting-started/open-source-cli) for what that covers.


> **Info:** Already deployed before? Skip to [CI/CD](/getting-started/ci-cd) or [Going to production](/getting-started/going-to-production).


## Prerequisites

Before deploying, you need:

- A `stacktape.ts` configuration file (created in [Configure your stack](/getting-started/configure-your-stack))
- An AWS account to deploy into, and credentials for it on your machine

If you followed [Use the dev mode](/getting-started/use-the-dev-mode), your config is already tested locally and ready for a real deployment.

## Step 1: Set up AWS credentials

Stacktape deploys into your own AWS account with the AWS credentials on your machine. It finds them the same way the AWS CLI does: environment variables such as `AWS_ACCESS_KEY_ID` or `AWS_PROFILE`, the default profile in `~/.aws`, or an AWS IAM Identity Center (SSO) session.

If you already use the AWS CLI, you are set. Otherwise, create a profile with [`stacktape aws-profile create`](/cli/aws-profile-create) or sign in with the AWS CLI:

```bash
aws sso login --profile my-dev-account
```

Pass `--profile <name>` to Stacktape commands to use a profile other than the default one.


> **Tip:** Stacktape itself costs nothing here. AWS bills the resources your stacks create in your AWS account.


## Step 2: Deploy

With credentials in place, deploy your stack with the [`stacktape deploy`](/cli/deploy) command.

```bash
stacktape deploy --project my-app --stage dev --region eu-west-1
```

The project name and stage name together name the stack. Stages let you run multiple independent copies of your infrastructure — `dev`, `staging`, `production` — from the same configuration. See the [`stacktape deploy`](/cli/deploy) CLI reference for the full list of flags and their accepted values.

If your configuration file is not named `stacktape.ts` or is in a different directory, point the CLI at it explicitly.

```bash
stacktape deploy --project my-app --stage dev --region eu-west-1 --config ./infra/stacktape.ts
```

### What happens during deploy

Stacktape processes your configuration in four phases:


## Flow
1. **Build & Package**: Bundles your application code (Lambda zips, container images), resolves resource configuration, evaluates directives and secrets, and generates the CloudFormation template.
2. **Upload**: Packaged artifacts are uploaded to an S3 deployment bucket in your AWS account.
3. **Deploy**: A CloudFormation stack is created (first deploy) or updated with the generated template. CloudFormation provisions, updates, or removes AWS resources as needed.
4. **Post-deploy**: For stacks that include hosting buckets or CDNs, Stacktape syncs static files and invalidates CDN caches. Then it prepares deployed stack information and resource links.


On the first deploy, CloudFormation creates the stack and all resources from scratch. On subsequent deploys, Stacktape prepares the CloudFormation template, computes a diff, uploads artifacts, and submits the template to CloudFormation to update the stack. When only code changed, Stacktape updates the changed Lambda functions or container services directly instead of running a CloudFormation stack update.

### Deploy output

After a successful deploy, the CLI prints the URLs of your resources, such as API endpoints and website addresses.

If the CLI is signed in to the [Stacktape Console](/stacktape-console/console-overview), the output also includes a Console URL for the stage:

```
https://console.stacktape.com/projects/{project}/{stage}/overview
```

## Add the Console (optional)

The Console adds deploy history, costs, alerts, error tracking and team access. It is free while your organization's managed AWS spend is up to $200 a month. To add it, run:

```bash
stacktape connect
```

It signs you in, connects the AWS account of your current credentials to your organization and opens the Console, where the stacks you already deployed appear. Nothing is redeployed. See [Use the CLI without an account](/getting-started/open-source-cli#connect-the-console-later).

## What gets created in AWS

A standard Stacktape deploy creates or updates a CloudFormation stack in your AWS account. When only code changed, Stacktape updates Lambda function code or container services directly without a CloudFormation stack update. The CloudFormation stack is the unit Stacktape manages for the stage. Inside the stack, CloudFormation provisions whatever your configuration declares:

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

If you use the Console, the deploy output also includes a Console URL for the deployed stack. See [Manage your app in the Console](/getting-started/using-console-ui) for what you can do there.

To view logs from the CLI, use [`stacktape logs`](/cli/logs).

```bash
stacktape logs
```

## Redeploying after changes

After making code or configuration changes, run the same deploy command again.

```bash
stacktape deploy --project my-app --stage dev --region eu-west-1
```

Stacktape prepares the CloudFormation template, computes a diff, uploads artifacts, and submits the template to CloudFormation to update the stack.

### Code-only changes deploy in seconds

When a deployment changes only the code of functions or container services, Stacktape updates them directly instead of through CloudFormation. You don't need a flag for this. Changes to infrastructure or configuration always go through CloudFormation, and `--full` forces it. See [Fast deployments](/cli/deploy#fast-deployments).

## Deploying multiple stages

Stages are independent copies of your infrastructure. Deploy a staging environment alongside dev by choosing a different stage name.

```bash
stacktape deploy --project my-app --stage staging --region eu-west-1
```

Each stage is deployed as its own CloudFormation stack with its own resources and URLs. Use different stage names to run separate copies of the resources declared by your configuration. This lets you test changes in staging without affecting production users. For automated stage-per-branch workflows, see [Stacks per git branch](/ci-cd-and-gitops/stacks-per-git-branch-pattern).

## Troubleshooting

### No AWS credentials found

The CLI found no AWS credentials. Set them up as described in [Step 1](#step-1-set-up-aws-credentials), or pass `--profile <name>`. If you use AWS IAM Identity Center, run `aws sso login` again when the session expires.

### "No connected AWS accounts"

This applies only when the CLI is signed in to the Console. Open the connected AWS accounts page in the [Stacktape Console](/stacktape-console/connecting-your-aws-account) and connect an account, or run `stacktape connect` with your AWS credentials set.

### "belongs to AWS account …, which is not connected"

This applies only when the CLI is signed in to the Console. `--profile`, `AWS_PROFILE` or AWS keys in your environment point to an AWS account that is not connected to your organization. Stacktape deploys to the account your local AWS credentials belong to. Unset them, pass `--aws-account <name>`, or connect that account. See [Choosing the account for a CLI command](/stacktape-console/connecting-your-aws-account#choosing-the-account-for-a-cli-command).

### Deploy takes longer than expected

First deploys take longer because every resource must be created from scratch. Databases and container services take longer to provision than Lambda functions. Subsequent deploys that only change code take seconds, because Stacktape updates the code directly.

### A resource fails to create

If a resource fails to create, the resources that were already created stay, and the stack is left in `CREATE_FAILED`. Fix the error and deploy again to continue from there, or run `stacktape delete` to remove everything. The CLI displays the specific error. Common causes include IAM permission issues, resource limit quotas, or invalid configuration values. For rollback options, see [`stacktape rollback`](/cli/rollback) for version-based rollback and [`stacktape stack recover`](/cli/cf-rollback) for CloudFormation-level rollback.

### Deploy fails during dev mode

You cannot deploy to a stage that currently has an active [dev mode](/getting-started/use-the-dev-mode) session. Stop dev mode first with [`stacktape dev stop`](/cli/dev-stop), or deploy to a different stage name.

## FAQ

### How long does a first deploy take?

First deploys depend on the resources being provisioned. Lambda-only stacks are the fastest. Stacks with databases, container services, or custom domains take longer because AWS provisions those resources sequentially. Subsequent deploys that only change application code are faster since CloudFormation only updates the diff — and code-only changes skip CloudFormation entirely.

### Does Stacktape cost money to use with AWS?

The CLI is free and open source. AWS bills the resources your stacks create in your AWS account. The Console is free while your organization's managed AWS spend is up to $200 a month; see [Billing and subscription](/stacktape-console/billing-and-subscription) for the plans.

### Can I deploy to any AWS region?

Yes. Your stacks can deploy to any AWS region. If you use the Console, its AWS account connection stack is created in `eu-west-1`, which does not limit where your stacks run. Specify the region with `--region` on each deploy command, or set a default with [`stacktape defaults set`](/cli/defaults-configure).

### Is the connection between the Stacktape Console and my AWS account secure?

Without the Console there is no connection: the CLI uses your own AWS credentials. When you connect the Console, the connection uses a CloudFormation stack that grants Stacktape cross-account AssumeRole access — the standard AWS approach for third-party integrations. You can revoke access instantly by deleting the connection stack in AWS or removing the account from the Console.

### What happens if I lose internet during a deploy?

CloudFormation continues the deployment on AWS's side regardless of your local connection. If the CLI disconnects, check the stack status with [`stacktape status`](/cli/info-stack) before running another deploy.

### What's the difference between stages and AWS accounts?

Stages are logical environments (dev, staging, production) within a single AWS account — each stage gets its own CloudFormation stack with fully isolated resources. You can also deploy different stages to different AWS accounts by using different AWS credentials, or by connecting several AWS accounts in the Console (e.g., production in a separate account). See [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) for details.

### Can I preview what a deploy will change before running it?

Yes. Use [`stacktape diff`](/cli/diff) to see the CloudFormation change set without actually deploying. This shows which resources would be created, updated, replaced, or deleted.

---

### What does the CLI send to Stacktape?

Without an account, the CLI sends only anonymous usage data: the command name, whether it succeeded and the error code, the CLI version, operating system, CPU architecture, whether it runs in CI and a random installation ID. [Use the CLI without an account](/getting-started/open-source-cli#telemetry) lists it in full.

When you are signed in, the CLI sends usage statistics and reports of its own crashes, so we can see which commands fail and fix them. Set `STP_DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` to turn both off.

- **After every command:** the command name, the names of the options you used (not their values), how long it took, whether it succeeded, the error code if it failed, your operating system, locale, time zone and the CLI version.
- **When the CLI crashes:** the error type, message and stack trace, the command, your operating system, CPU architecture and whether it ran in CI. The CLI prints an error ID you can give our support. Errors in your configuration, code or AWS account are not reported this way; only failures of the CLI itself are.
- **Identity:** a random ID of your machine. After `stacktape login`, events are linked to your Stacktape user and organization, and your account's email and name are attached to your user.

Before a crash report leaves your machine, the CLI masks tokens and other credentials, email and IP addresses, AWS account IDs and the user name in home-directory paths. Error messages can still contain other text, such as file or resource names. The CLI never sends configuration values, source code, environment variables or AWS credentials. Stacktape processes this data in [PostHog](https://posthog.com) in the EU.
