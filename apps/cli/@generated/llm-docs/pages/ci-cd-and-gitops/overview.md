# CI/CD and GitOps Overview

Stacktape supports three approaches to automated deployments: push-to-deploy **GitOps through the Stacktape Console**, integration with **any CI/CD system** via Stacktape CLI commands, and [**self-hosted GitHub Actions runners**](/ci-cd-and-gitops/self-hosted-github-actions-runners). The main practical difference is whether Stacktape owns the deployment trigger and runner, or your pipeline owns the workflow and executes the CLI.

## Automation options at a glance


## Feature Comparison

| Feature | GitOps (Console) | Custom CI/CD | Self-hosted GitHub Actions runners |
| --- | --- | --- | --- |
| Setup effort | Configure in Console — no pipeline files | Write a workflow or pipeline file | Enable in Console + write a GitHub Actions workflow |
| Where the build runs | Dedicated EC2 runner in your AWS account | Your CI provider's runners | EC2 runner in your AWS account |
| Pipeline customization | Maps git events directly to deployments | Full control — tests, lint, approval gates, multi-step builds | Full GitHub Actions flexibility |
| Maintenance | Managed by Stacktape | You own the pipeline definition | You own the workflow |
| PR previews | Built in: one stage per pull request (pr-42), redeployed on new commits, optional delete on close | Manual setup with dynamic stage names | Manual setup with dynamic stage names |


## GitOps with Console

[GitOps with Console](/ci-cd-and-gitops/gitops-with-console) is the fastest path to automated deployments. It works with repositories on GitHub, GitLab and Bitbucket. You connect your Git provider in the Stacktape Console, link the project to its repository and create one or more **Git deployments**. Each Git deployment has:

- **Deployment trigger** — **Push to branch** deploys a fixed stage on every push; **Pull request opened** deploys a `pr-<number>` preview for each pull request (merge request on GitLab)
- **Branch** — the branch that is pushed to, or that pull requests merge into
- **Stage** — the Stacktape stage to deploy (previews always use `pr-<number>`)
- **AWS account and region** — where the stage deploys

A common setup uses several Git deployments per project: one for `main` → `production`, one for `develop` → `staging`, and a pull request trigger for preview environments. See [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) for connecting each provider and what each Git event does.

## When to use GitOps

GitOps is the right choice when you want automated deployments with minimal setup and no pipeline maintenance. It covers the most common deployment triggers — branch pushes and pull request previews — without requiring you to write or debug CI/CD pipeline files. Start here unless you have a specific reason not to.

## When NOT to use GitOps

A Git deployment maps a Git event to a deployment: trigger type, branch, stage, region, and AWS account. If your workflow requires test suites, linting, approval gates, or multi-step build pipelines before deploying, use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) where you control every step. You can also combine both — GitOps for staging environments and custom CI/CD for production.

## Custom CI/CD

[Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) means running Stacktape CLI commands such as [`deploy`](/cli/deploy) and [`delete`](/cli/delete) as steps inside your own pipeline. This works with GitHub Actions, GitLab CI, CircleCI, Jenkins, or any system that can run shell commands.

See the [custom CI/CD guide](/ci-cd-and-gitops/custom-ci-cd) for authentication setup, full pipeline examples, multi-stage workflows, and provider-specific guidance. A minimal GitHub Actions workflow looks like this:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Deploy to production
        env:
          STACKTAPE_API_KEY: ${{ secrets.STACKTAPE_API_KEY }}
        run: npx stacktape deploy --stage production --region us-east-1 --yes
```

This example uses the Console: the CLI authenticates via the `STACKTAPE_API_KEY` environment variable — create an API key in the Stacktape Console under [API keys](/stacktape-console/api-keys) and store it as a secret in your CI provider. Without a Stacktape account, give the job AWS credentials instead and leave out the API key. The `--yes` flag skips the interactive confirmation prompt that would block a CI runner. See the [custom CI/CD guide](/ci-cd-and-gitops/custom-ci-cd) for full authentication details.

## When to use custom CI/CD

Choose custom CI/CD when you need pre-deploy validation (tests, type checks, lint), approval gates, notifications, deployment to multiple providers in one workflow, or any multi-step logic around the deployment. Custom CI gives you complete control over every step before and after the Stacktape deploy.

## When NOT to use custom CI/CD

If you don't have an existing CI pipeline and just want push-to-deploy, [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) is faster to set up and requires no maintenance. Writing a CI workflow purely to call `stacktape deploy` adds overhead for no benefit.

## Self-hosted GitHub Actions runners

[Self-hosted GitHub Actions runners](/ci-cd-and-gitops/self-hosted-github-actions-runners) let you run GitHub Actions workflows on runner infrastructure in your AWS account instead of on GitHub's hosted runners. This combines the flexibility of GitHub Actions (custom steps, matrix builds, reusable workflows) with running close to your AWS resources.

Self-hosted runners are useful when your workflows are slow on hosted runners due to large dependencies or Docker image builds, when you need VPC access to private resources during CI, or when you want more powerful hardware. For most teams, GitOps or standard hosted runners are simpler starting points. See the [dedicated self-hosted runners page](/ci-cd-and-gitops/self-hosted-github-actions-runners) for setup and configuration.

## Build runners

Stacktape's GitOps deployments execute on a dedicated EC2 runner in your AWS account. The runner persists build caches between deployments and stops after idle time to reduce compute costs.

See [Build runners](/ci-cd-and-gitops/build-runners) for lifecycle, compute sizing, caching, and cost details.

## Stacks per git branch

The [stacks-per-branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern) maps git branches or pull requests to Stacktape stages. Each stage gets completely independent infrastructure — its own databases, functions, containers, and endpoints.

| Pattern | Stage naming | Example |
|---------|-------------|---------|
| **Long-lived branches** | Branch name as stage | `main` → `prod`, `develop` → `staging` |
| **PR previews** | PR number as stage | PR #42 → `pr-42` |
| **Feature branches** | Branch name (shortened) | `feat/auth` → `auth` |

Git deployments in the Console name PR preview stages `pr-<number>` automatically. For custom CI/CD, derive the stage name from your CI environment variables.

Deploy a PR stage:

```bash
npx stacktape deploy --stage "pr-${PR_NUMBER}" --region us-east-1 --yes
```

Clean up when the PR closes:

```bash
npx stacktape delete --stage "pr-${PR_NUMBER}" --region us-east-1 --yes
```

Stage names must be lowercase alphanumeric with dashes only (regex `[a-z0-9-]+`), and at least 2 characters long. Branch names containing uppercase letters, underscores, or slashes must be sanitized before use as stage names. Use short, stable names because stage names are reused in generated stack and resource names, and downstream AWS resources have their own length limits.


> **Warning:** Each stage is a complete independent stack. PR preview environments incur the same AWS costs as any other stage. Configure cleanup (via GitOps or a CI pipeline step) to avoid accumulating unused infrastructure.


## Choosing the right approach

For most teams, start with **GitOps via the Console**. Each Git deployment is a single row — deployment trigger, branch, stage, region, and AWS account — with no pipeline files to write or maintain. PR preview environments are created by adding a **Pull request opened** Git deployment. If you later need test gates, approvals, or multi-step builds, add **custom CI/CD** — the two approaches work independently on the same project.

A common combined pattern:

| Environment | Automation | Why |
|-------------|------------|-----|
| Staging | GitOps | Every push to `develop` deploys automatically, no pipeline to maintain |
| PR previews | GitOps | Isolated stage for every PR, named `pr-{#number}` |
| Production | Custom CI (GitHub Actions) | Run tests and require approval before deploying `main` |

There is no conflict between the approaches. GitOps and custom CI/CD operate independently and can target different stages or regions within the same project.

## FAQ

### Do I need AWS credentials in my CI pipeline?

Only without a Stacktape account: then the CLI deploys with the AWS credentials the job has. With the Console, no. The CLI authenticates with a `STACKTAPE_API_KEY` environment variable — create an API key in the Stacktape Console under [API keys](/stacktape-console/api-keys) and store it as a secret in your CI provider. See the [custom CI/CD guide](/ci-cd-and-gitops/custom-ci-cd) for full authentication details.

### What stage does a GitOps PR preview deploy to?

A **Pull request opened** Git deployment deploys pull request #42 to the stage `pr-42`. Each pull request gets its own isolated stack with independent infrastructure. See [Stacks per Git branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern) for the full pattern.

### Can I run tests before deploying with GitOps?

No — a Git deployment maps a Git event directly to a deployment (trigger type, branch, stage, region, and AWS account) with no place to insert test suites, linting, or approval gates. If you need pre-deploy validation, use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) where you control every step. The two approaches operate independently on the same project, so a common pattern is custom CI for production (with test gates) and GitOps for staging or PR previews.

### What stage names should I use for branch-derived stages?

Stage names must be lowercase alphanumeric with dashes only, and at least 2 characters long. Use short, predictable values (e.g. `prod`, `staging`, `pr-42`). Branch names with uppercase letters, underscores, or slashes need sanitization. Stage names appear in generated stack and AWS resource names, so shorter names give you more headroom for downstream length limits.

### How much do automated deployments cost?

Console-managed deployments use an EC2 runner in your AWS account. You pay for compute while it runs, persistent EBS storage, and ordinary data transfer and logging. The instance stops after idle time while its volume and caches remain. See [Build runners](/ci-cd-and-gitops/build-runners) for lifecycle and sizing details.

### How do I roll back a failed automated deployment?

For GitOps deployments, pushing a revert commit to the branch triggers a new deployment with the reverted code. For a direct rollback without a code change, use the [`rollback`](/cli/rollback) CLI command. Both approaches work regardless of how the original deployment was triggered.
