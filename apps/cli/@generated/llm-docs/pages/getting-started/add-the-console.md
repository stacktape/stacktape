# Add the Console

The Stacktape Console is the hosted part of Stacktape. It adds what a team shares: deploy history, costs, alerts,
error tracking, team access and deploys from Git. You add it to stacks you already deployed. Connecting doesn't
redeploy, rename or replace anything.

You don't need it to deploy. The CLI works without an account; see [Use the CLI without an account](/getting-started/open-source-cli).

## What you get

- **Deploy history** of every stage: who deployed what and when.
- **Costs** per project, stage and resource, and [budgets](/managing-costs/budgets) with alerts.
- **Alerts** in Slack or by email, [uptime checks](/observability/uptime-checks) and
  [error tracking](/observability/error-tracking) with incidents.
- **Team access**: members with roles, limited to the projects and AWS accounts you choose, and organization keys for
  CI.
- **Deploys from Git**: push to deploy, pull request previews and Stacktape-managed build runners. See
  [GitOps with Console](/ci-cd-and-gitops/gitops-with-console).
- **Organization rules**: [guardrails](/guardrails/overview), security reports and the audit log.

## What it costs

- **Free**: $0, no card, the whole Console. It applies while the AWS spend Stacktape manages for your organization is
  at or under $200 in a calendar month (UTC). Managed spend is what the stacks Stacktape manages cost in AWS, across
  all connected accounts.
- **Over the limit**: from $150, a successful deploy prints what the Flexible plan would cost. The first time the
  organization goes over $200, Owners and Admins get an email and deploys keep working for up to 7 more days, within
  that calendar month. After that, new deploys and dev sessions pause until the next month starts or someone upgrades. Running apps, deletes and
  rollbacks keep working.
- **Flexible**: no limit. One rate on the month's managed AWS spend, from 25% down to 19%.

AWS bills your AWS account for the resources, as before. See [Billing and subscription](/stacktape-console/billing-and-subscription)
for the rates and examples.

## Connect from the init wizard

After a successful deploy, the wizard shows **Add dev to the Stacktape Console** below the live address.


> Screenshot: Add dev to the Stacktape Console, free up to $200 a month of AWS spend, with Connect to the Console and Not now, and a note that the stack is not redeployed Caption: The Console offer in the init wizard after a successful deploy.


1. Click **Connect to the Console**. A new tab opens the Stacktape sign-in.
2. Sign in, or create an account. Check that the tab shows the same code as the wizard, and approve.
3. If your account belongs to more than one organization, pick one.
4. The wizard connects the AWS account it deployed to. This usually takes a minute or two.
5. When it says **Connected to the Stacktape Console**, click **Open dev in the Console**.

Your app keeps running the whole time. **Not now** skips the offer; you can connect later from the terminal.

## Connect from the terminal

Run this with the AWS credentials of the account your stacks are in:

```bash
stacktape connect
```

Add `--profile my-dev-account` to use a profile other than the default one. The command:

1. **Signs you in**, if this machine isn't signed in yet. Choose **Sign in with the browser**. The CLI prints an
   address and a code and opens the address. Sign in or create an account, check the code and approve.
2. **Connects the AWS account** of your credentials to your organization. It creates a small CloudFormation stack in
   your account with an IAM role that the Console uses. If it can't create the stack with your credentials, it opens
   AWS CloudFormation in your browser instead: check the box that allows creating IAM resources and choose **Create
   stack**.
3. **Finds the Stacktape stacks** already in the account and adds them to the Console as projects and stages.

It ends with `Nothing was redeployed or changed.` and the link to your projects. Open the link to see your stages.

If a region couldn't be read, the CLI says which one. An Owner or Admin can run **Find existing stacks** on the **AWS
accounts** page of the Console later.

### Who can connect an AWS account

An Owner or Admin of the organization. When you create an account, you're the Owner of its new organization. A
Developer or Viewer gets `Your role in <organization> cannot connect AWS accounts` and needs an Owner or Admin to run
`stacktape connect` with credentials for that account.

### What the connection can do in your AWS account

The connection's IAM role has administrator access, so the Console can deploy from Git, read logs and metrics and
manage your stacks. It's the standard AWS way to give a service access to an account, with short-lived credentials
and no access keys stored by Stacktape. To remove it, delete the connection in the Console or delete its
CloudFormation stack in AWS. See [AWS permissions](/stacktape-console/aws-permissions) and
[Connecting your AWS account](/stacktape-console/connecting-your-aws-account).
[What leaves your AWS account](/observability/overview#what-leaves-your-aws-account) lists the data each Console
feature sends to Stacktape.

## What changes after connecting

- The CLI on this machine is signed in. Your deploys are recorded in the Console, and Console features in your config
  work.
- A deploy prints the Console link of the stage when it finishes.
- Error tracking for a stage starts with its next deploy, because the deploy adds the log subscription it needs.
  Deploy each stage once more to turn it on.
- Some features send data from your AWS account to Stacktape. Error tracking, for example, sends each error with its
  log line, after masking secrets and tokens. Your logs and secrets themselves stay in your account. Each feature's
  page says what leaves it.

## CI with the Console

A pipeline uses an API key instead of a browser sign-in. Owners and Admins create an
[organization key](/stacktape-console/api-keys#create-an-organization-key) on the API keys page and store
it as the `STACKTAPE_API_KEY` secret of the pipeline. Unlike a personal key, it keeps working when people leave. If
the organization has more than one connected AWS account, pass `--aws-account <name>` to the deploy. See
[Deploy from your CI](/ci-cd-and-gitops/custom-ci-cd).

## Work without the Console again

Run [`stacktape logout`](/cli/logout). The CLI goes back to working without an account. Nothing you deployed changes.
In CI, remove `STACKTAPE_API_KEY` from the pipeline.

A stage served on a default `*.stacktape-app.com` domain keeps it, but the CLI won't deploy that stage without an
account, because the deploy would remove the domain. Add your own domain first, or deploy it signed in.
