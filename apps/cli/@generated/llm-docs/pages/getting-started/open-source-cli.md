# Use the CLI Without an Account

The Stacktape CLI is open source under the MIT license and works without a Stacktape account. It deploys with your own AWS credentials, straight to AWS. It also sends anonymous usage telemetry, which you can turn off (see [Telemetry](#telemetry)). You can deploy, update, roll back and delete stacks, run dev mode, and read logs and secrets without signing up for anything.

The [Stacktape Console](/stacktape-console/console-overview) adds what a team shares: deploy history, costs, alerts, error tracking and access control. It is free while your organization's managed AWS spend is up to $200 a month. You can connect it later with one command, and your existing stacks appear in it without a redeploy.

## How the CLI chooses its mode

- **Signed in.** When the CLI has a Stacktape API key, from [`stacktape login`](/cli/login) or the `STACKTAPE_API_KEY` environment variable, it works with the Console.
- **Without an account.** Otherwise, stack commands run on your local AWS credentials and the CLI does not call the Stacktape API. No command asks you to sign in first.

A stack is the same in both modes. The same configuration gives the same stack name, the same deployment bucket and the same resources. The only differences are additions that Console features need, such as organization-wide alarms.

## Deploy without an account

The CLI uses the AWS credentials it finds the same way the AWS CLI does: environment variables such as `AWS_ACCESS_KEY_ID` or `AWS_PROFILE`, the default profile in `~/.aws`, or an AWS IAM Identity Center (SSO) session. Pass `--profile` to pick a profile.

```bash
aws sso login --profile my-dev-account
stacktape deploy --project my-app --stage dev --region eu-west-1 --profile my-dev-account
```

The stack goes to the AWS account those credentials belong to. Resources get AWS URLs or the [custom domains](/resources/networking/custom-domains) you configure.

## What works without an account

| Feature | Without an account | Why |
|---|---|---|
| Deploy, update, roll back and delete stacks | Works | Runs against AWS with your credentials |
| Dev mode, scripts, bastion tunnels and container sessions | Works | Runs on your machine and in your AWS account |
| Logs, metrics, secrets and parameters | Works | Read from your AWS account |
| Alarms in your configuration, with `slack`, `ms-teams`, `discord`, `email` or `webhook` channels | Works | CloudWatch alarms live in your AWS account, and the stack delivers these notifications itself |
| Synthetic tests | Works | CloudWatch Synthetics runs them in your AWS account |
| Deploys and pull request previews from your own CI pipeline | Works | Your pipeline runs `stacktape deploy` and `stacktape delete` with AWS credentials; see [CI/CD without an account](#cicd-without-an-account) |
| Deploy history, costs and team access | Needs the Console | Stored by Stacktape and shared by your team |
| Alarm channels of type `console-channel` and `slack-app`, and deploy notifications | Needs the Console | The Console delivers these alerts |
| Uptime checks | Needs the Console | The probes run in your AWS account, but the Console decides when a check is down and alerts you |
| Error tracking, incidents and incident AI | Needs the Console | Stacktape stores and groups the events |
| Default `*.stacktape-app.com` domains, including the one a load balancer, a CDN in front of a load balancer, or a Convex backend without its own domain needs for HTTPS | Needs the Console | Stacktape owns that domain |
| Git deployments: push to deploy, Console-managed pull request previews and Stacktape-managed runners | Needs the Console | The Console receives the Git events and runs the jobs |
| Organization-wide guardrails, security reports and the audit log | Needs the Console | They apply to, and are shared by, the whole organization |

Commands that are Console features by nature, such as `stacktape org list`, `stacktape project create`, `stacktape error list`, `stacktape incident list`, `stacktape whoami` and `stacktape deploy --runner ec2`, ask you to sign in and say why.

### When the configuration uses a Console feature

When a configuration uses something only the Console provides, validation stops before anything is deployed. The error names the property and how to fix it, for example:

```
Uptime checks (`apiHealth`) need the Stacktape Console (free up to $200/month of AWS spend). Run: stacktape connect — your stacks are added as they are, no redeploy. Or remove the uptime-check resources.
```

## Connect the Console later

Run `stacktape connect` from a terminal where your AWS credentials are set:

```bash
stacktape connect
```

1. If you are not signed in, it starts the browser sign-in that [`stacktape login`](/cli/login) uses. You can create an account there.
2. It connects the AWS account of your current credentials to your organization. This is the same connection as [Connecting your AWS account](/stacktape-console/connecting-your-aws-account).
3. It prints the Console address. The Stacktape stacks already in that AWS account appear there as projects and stages.

`stacktape connect` never redeploys, renames or replaces anything. From then on, the CLI works with the Console: deploys are recorded, and Console features in your configuration can be used.

The Console is free while the organization's managed AWS spend is up to $200 a month. See [Billing and subscription](/stacktape-console/billing-and-subscription) for the plans.

### Go back to working without an account

Run [`stacktape logout`](/cli/logout). The CLI returns to working without an account. Nothing you deployed changes. In CI, remove `STACKTAPE_API_KEY` from the pipeline.

A stage that serves on a default `*.stacktape-app.com` domain keeps it, but the CLI refuses to deploy that stage without an account, because the deploy would remove the domain. Add your own domain first, or deploy it signed in.

## CI/CD without an account

Give the pipeline AWS credentials and run the CLI. No Stacktape API key is needed. With GitHub Actions, use an IAM role that trusts GitHub's OIDC provider:

```yaml
name: Deploy
on:
  push:
    branches: [main]
permissions:
  id-token: write
  contents: read
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-deploy
          aws-region: eu-west-1
      - run: npx stacktape deploy --project my-app --stage production --region eu-west-1 --yes
```

Other CI providers work the same way: set AWS credentials in the job, then run `stacktape deploy`. See [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) for more providers.

## Hints about the Console

Without an account, the CLI sometimes prints one dim line that mentions the Console, for example after the first successful deploy of a project:

```
Deploy history, costs and alerts for this stage, shared with your team: stacktape connect (free)
```

The CLI also prints a hint when a deploy waits because someone else is deploying the same stage. It first says who holds the lock.

A hint never opens a browser or asks a question. It appears only in an interactive terminal, after the command's result, and at most once per project. It never appears in CI, in JSON output or after a failure. Set `STP_NO_HINTS=1` to turn hints off.

## Telemetry

Without an account, the CLI sends anonymous usage data, so we can see which commands fail and fix them. The first time you run the CLI, it tells you what it sends and how to turn it off, before it sends anything.

It sends only these fields:

- the command name
- whether the command succeeded, and the error code or class if it failed
- the CLI version, operating system and CPU architecture
- whether it runs in CI
- a random installation ID

It never sends project, stack, stage or AWS account names or IDs, file paths, configuration contents, or error messages.

Telemetry is off when `STP_DISABLE_TELEMETRY=1` or `DO_NOT_TRACK=1` is set, and always off in CI.

When you are signed in, the CLI sends more, such as crash reports linked to your user. See [What does the CLI send to Stacktape?](/getting-started/deploy-your-first-stage#what-does-the-cli-send-to-stacktape)

## License

The CLI is open source under the [MIT license](https://github.com/stacktape/stacktape/blob/main/LICENSE). Its source is on [GitHub](https://github.com/stacktape/stacktape). The Stacktape Console is a proprietary hosted service.

## FAQ

### Do I need a Stacktape account to deploy?

No. The CLI deploys with your own AWS credentials. You need an account only for Console features such as deploy history, alerts, error tracking and Git deployments.

### Will connecting the Console change my stacks?

No. `stacktape connect` finds the stacks already in your AWS account and shows them in the Console without deploying. Later deploys add only what the Console features you use need.

### Does the CLI contact Stacktape when I'm not signed in?

It does not call the Stacktape API, and a deploy never depends on a Stacktape service. It still makes these requests:

- the anonymous telemetry described above, unless you turn it off
- a check for a newer CLI version, and short notices such as planned maintenance
- downloads of Stacktape's public CloudFormation resource types from a public S3 bucket, when a stack uses them. No sign-in is involved.

The first two never stop or slow down a command.
