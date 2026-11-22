# After the first deploy

Your app runs in your AWS account as one CloudFormation stack. This page covers the commands you use from here on:
check the app, read its logs, ship a change, add stages and remove what you don't need.

The commands below run in the project directory. The config written by `stacktape init` declares the project name and
region, so a stage is all they need. For a starter, add the `--project` and `--region` values from the commands init
printed, for example `--project hono-api --region eu-west-1`.

## Check that it works

Open the URL from the end of the deploy. The wizard lists it under **It's live**, and the terminal prints it after the
deploy. HTTP APIs, web services and websites get an HTTPS address from AWS, or your own domain once you
[add one](/resources/networking/custom-domains).

## Read the logs

```bash
stacktape logs api --stage dev
```

`api` is the resource name: its key under `resources` in your config. The command prints the last 100 log lines from
the past hour and keeps printing new ones until you press Ctrl+C. Use `--since 6h` to look further back and
`--filter ERROR` to show only matching lines. See [`stacktape logs`](/cli/logs) and [Logs](/observability/logs).

## Ship a change

Edit your code, then run the same deploy:

```bash
stacktape deploy --stage dev
```

When only the code of functions or container services changed, Stacktape updates them directly instead of through
CloudFormation. A function update takes seconds. Changes to the configuration, such as a new resource or an
environment variable, go through CloudFormation and take longer. To see what a deploy would change first, run
`stacktape diff --stage dev`.

To change the infrastructure, edit `stacktape.yml` (or `stacktape.ts`). [Resources](/configuration/resources),
[Connecting resources](/configuration/connecting-resources) and [Secrets](/configuration/secrets) cover the common
changes.

## Add another stage

A stage is another copy of the app from the same config, for example `staging` next to `dev`:

```bash
stacktape deploy --stage staging
```

Each stage is its own stack, named `<project>-<stage>`, with its own resources, URLs and data. Non-production stages
in one AWS account and region share one network (VPC), but each keeps its own security groups. Production stages get a
network of their own. To vary sizes or settings by stage, see
[Stages and environments](/configuration/stages-and-environments).

To keep production in a separate AWS account, deploy it with that account's credentials, for example
`--profile my-prod-account`.

## Find the stack in AWS

Everything Stacktape deploys is a regular AWS resource in your account. Open **CloudFormation** in the AWS console,
pick the region and open the stack `<project>-<stage>`. The **Resources** tab lists everything in it, with links to
each service. The stack keeps working if you stop using Stacktape.

## Delete the stage

When you're done with a stage, delete it:

```bash
stacktape delete --stage dev
```

This removes the stack and everything in it, including databases and the data in them, and the stage's deployment
bucket. Your code and config file stay. Back up any data you want to keep first: a delete can't be undone. See
[`stacktape delete`](/cli/delete).

A database that `stacktape init` added has `deletionProtection: true`, so the delete stops before it removes anything
and names the database. To delete it anyway, set `deletionProtection: false` on the database in your config, run
`stacktape deploy --stage dev`, then run the delete again.

## If a deploy fails

The CLI prints the error from AWS. Common causes are a missing IAM permission, an AWS quota and an invalid value in
the config.

By default, a failed deploy keeps what it already created or updated. Fix the error and deploy again to continue from
where it stopped. To remove a failed first deploy instead, run `stacktape delete`. With `--auto-rollback`,
CloudFormation undoes a failed deploy by itself. See [When a deployment fails](/deployment-and-lifecycle/deploying-stacks#when-a-deployment-fails).

If you lose your connection during a deploy, CloudFormation keeps going in AWS. Check the stack in the CloudFormation
console before you deploy again.

A stage created by [dev mode](/local-development/dev-mode-overview) can't be deployed with `stacktape deploy`. Use
another stage name for the deploy.

## Where to go next

- **[Add the Console](/getting-started/add-the-console).** Deploy history, costs, alerts and team access for your
  stages. Free while the AWS spend it manages stays at or under $200 a month.
- **[Deploy from CI/CD](/ci-cd-and-gitops/overview).** Deploy on every push from GitHub Actions, GitLab or another CI,
  or let the Console deploy from Git.
- **[Run it locally with dev mode](/local-development/dev-mode-overview).** Run your code on your machine against a
  small stack in AWS, and see changes without a deploy.
- **[Prepare for production](/getting-started/going-to-production).** Domains, alarms, rollouts and budgets before
  real users arrive.
