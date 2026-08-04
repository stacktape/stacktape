# Self-Hosted GitHub Actions Runners

Stacktape can manage self-hosted GitHub Actions runners on EC2 instances in your connected AWS account. You keep full GitHub Actions flexibility — custom steps, matrix builds, reusable workflows — while running jobs on a managed EC2 instance with more compute, pre-installed tools, and automatic hibernation to reduce idle costs.

This page covers the EC2-based GitHub Actions runner configured through the Stacktape Console. For CodeBuild-based build runners used with GitOps deployments, see [Build runners](/ci-cd-and-gitops/build-runners).

## When to use

Self-hosted runners make sense in two main scenarios:

- **Slow builds on hosted runners.** Large `node_modules`, Docker image builds, or compiled-language builds are bottlenecked by GitHub-hosted runner CPU and network. An EC2 `c7a.2xlarge` gives the runner 8 vCPU and 16 GB RAM, and larger supported instance types are available for CPU-heavy builds. The instance can hibernate after idle time and resume for later jobs, avoiding full cold-start provisioning on each run.
- **Cost optimization for high-volume workflows.** GitHub-hosted runner minutes add up at scale. With Stacktape-managed runners, you pay EC2 per-second pricing for the time the instance is running. The Console describes the runner as hibernating after 15 minutes of idle.

The Console describes the runner as using the same EC2 instance as Stacktape deployments. The runner launches in your connected AWS account and the AWS region you select.

## When NOT to use

For most teams, GitHub-hosted runners or [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) are simpler starting points. Skip self-hosted runners if:

- Your workflows complete in under 5 minutes on hosted runners — the overhead of managing an EC2 instance is not worth the marginal speedup.
- You do not need larger compute — GitHub-hosted `ubuntu-latest` handles standard test-and-deploy workflows well.
- You want zero infrastructure — [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) triggers deployments directly from git events without any pipeline file or runner management.

## How it works

The Stacktape GitHub App listens for `workflow_job` webhook events from your repository. When a job is queued with the `stacktape` label, the handler:

1. **Identifies the project** — matches the repository URL to a Stacktape project in your organization. If multiple projects point to the same repo, a project with an explicit runner configuration takes priority.
2. **Ensures the EC2 runner is available** — calls `ensureRunner` for the project, AWS account, region, and instance type. The Console tooltip describes resume as ~15s and cold start as ~30s.
3. **Registers a JIT runner configuration** — requests a JIT (Just-In-Time) runner configuration from the GitHub API with labels `self-hosted`, `linux`, `x64`, and `stacktape`, then starts that runner on the EC2 instance for the queued event.
4. **Dispatches the job via SSM** — sends the runner agent startup command to the EC2 instance using AWS Systems Manager. The runner agent is started on the EC2 instance with the JIT config so GitHub can assign the queued job to it.

The Console describes the runner as hibernating after 15 minutes of idle, resuming in approximately 15 seconds, and cold-starting in approximately 30 seconds. The handler also guards against duplicate webhook deliveries — if GitHub retries a webhook (e.g. on a 504 timeout), the duplicate is detected and skipped.


## Flow
1. **Workflow queued**: GitHub sends a workflow_job webhook with the 'stacktape' label to the Stacktape GitHub App.
2. **Runner ensured**: The handler calls ensureRunner for the project, AWS account, region, and instance type.
3. **JIT runner registered**: A single-use runner is registered with GitHub via the JIT config API. Labels: self-hosted, linux, x64, stacktape.
4. **Job dispatched**: SSM sends the runner agent script to the EC2 instance. Your workflow steps execute.
5. **Hibernation**: After 15 minutes of idle, the instance hibernates per the Console tooltip.


## Setting up

### Prerequisites

Before enabling self-hosted runners, you need:

1. **The Stacktape GitHub App installed** on your repository. If you already use [GitOps with Console](/ci-cd-and-gitops/gitops-with-console), the app is already connected.
2. **A connected AWS account** in the Stacktape Console. The runner EC2 instance launches in this account. See [Connecting your AWS account](/stacktape-console/connecting-your-aws-account).
3. **A Stacktape project** linked to the GitHub repository.

### Configuring the runner

Open your project in the Stacktape Console and open the GitHub Actions runner configuration modal. The configuration includes:

| Setting | Description | Default |
|---------|-------------|---------|
| **Status** | Enable or disable the runner for this project | Enabled |
| **AWS account** | Which connected AWS account to launch the EC2 instance in | First active connected account |
| **AWS region** | The region for the runner instance | Console form preselects the first active account's primary region |
| **Instance type** | EC2 instance size for the runner | Console form preselects `c7a.2xlarge` (8 vCPU, 16 GB RAM) |

The Console form requires both an AWS account and region when the runner is enabled. The AWS region default applies in two distinct contexts. In the Console form, opening the modal for a new configuration preselects the first active account's primary region. At runtime, if no region is saved on the runner configuration, the handler checks the project's deployment-region flags (the regions where this project has active stages) and picks the first match, then falls back to the project's default region. If no region can be determined at runtime, the handler logs an error and does not dispatch the job. Configure a region explicitly or deploy a stage first to avoid this. At runtime, if no `connectedAwsAccountId` is saved in the runner config (e.g. when no explicit runner config exists for the project), the handler falls back to the first active connected AWS account.

### Using the runner in a workflow

Add the `self-hosted` and `stacktape` labels to your workflow's `runs-on` key:

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: [self-hosted, stacktape]
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: npx stacktape deploy --stage production --region us-east-1
```

The `stacktape` label is what makes Stacktape handle the job. Stacktape only processes jobs whose labels include `stacktape`. Jobs without that label are ignored by the Stacktape GitHub App and are scheduled according to the rest of your GitHub Actions `runs-on` configuration.


> **Info:** `STACKTAPE_API_KEY` is automatically injected into the runner environment — you do not need to configure it as a GitHub Actions secret. The handler passes a Stacktape API key when dispatching the job to the EC2 instance.


## Instance types

Choose an instance type based on your workflow's compute needs. Stacktape supports six EC2 instance types for runners:

| Instance | vCPU | RAM | Best for |
|----------|------|-----|----------|
| `m6a.large` | 2 | 8 GB | Light workflows, simple deploys |
| `m6a.xlarge` | 4 | 16 GB | Medium builds with moderate dependencies |
| `c7a.xlarge` | 4 | 8 GB | CPU-bound builds (Go, Rust compilation) |
| `c7a.2xlarge` | 8 | 16 GB | **Console default.** Good balance for most teams — fast Docker builds, large Node.js projects |
| `c7a.4xlarge` | 16 | 32 GB | Large monorepos, parallel test suites, heavy Docker multi-stage builds |
| `c7a.8xlarge` | 32 | 64 GB | Extreme workloads — ML model packaging, very large compilations |

The `c7a` instances are compute-optimized (higher CPU-to-memory ratio), while `m6a` instances are general-purpose (balanced). For most CI workloads — building containers, running tests, packaging Lambda functions — `c7a.2xlarge` is the right starting point.


> **Tip:** Start with `c7a.2xlarge`. If your workflows consistently finish quickly and don't use much memory, downsize to `c7a.xlarge` or `m6a.large`. If Docker builds or test suites are the bottleneck, try `c7a.4xlarge`.


## Pre-installed tools

The runner comes with a development environment ready to use. Your workflow steps can use these tools without additional setup:

| Tool | Notes |
|------|-------|
| **Node.js** | Pre-installed with npm |
| **Bun** | Pre-installed |
| **Go** | Pre-installed |
| **Java** | Pre-installed |
| **Python 3** | Pre-installed |
| **Docker** | Available on the runner |
| **AWS CLI** | Pre-installed |
| **Git** | Pre-installed |

If your workflow needs a tool not on this list, install it as a workflow step.

## Hibernation and lifecycle

Stacktape manages the runner lifecycle automatically to balance cost and responsiveness. The states described by the Console tooltip are:

- **Active** — the instance runs your workflow steps.
- **Hibernated** — the Console describes the runner as hibernating after 15 minutes of idle.
- **Resumed** — when a new `workflow_job` event arrives with the `stacktape` label, the handler calls `ensureRunner`. The Console tooltip describes resume as approximately 15 seconds.
- **Cold provisioned** — the Console tooltip describes cold start as approximately 30 seconds when no existing instance is available.

## Cost

You pay standard AWS EC2 pricing for the time the instance is running, plus the usual EBS storage costs for the instance's volumes. AWS EC2 hibernation is a documented AWS feature that suspends the instance and preserves state on EBS — refer to the AWS EC2 hibernation pricing page for the current rates in your region.

Self-hosted runners are worth evaluating for long or frequent builds — EC2 runtime costs, EBS storage, and your current GitHub-hosted runner spend all factor into the comparison. For short, infrequent builds, hosted runners may be simpler.

## Self-hosted runners vs other CI/CD options

For full details on the other options, see [GitOps with Console](/ci-cd-and-gitops/gitops-with-console), [Build runners](/ci-cd-and-gitops/build-runners), and [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd).


## Feature Comparison

| Feature | Self-hosted runners | GitOps with Console | Custom CI/CD |
| --- | --- | --- | --- |
| Pipeline customization | Full GitHub Actions | None — git event triggers deploy | Full — any CI system |
| Pre-deploy testing | yes | no | yes |
| Setup effort | Enable in Console + modify workflow YAML | Configure in Console only | Write workflow file |
| Compute options | Up to 32 vCPU | See Build runners page | Varies by CI provider |
| Cost model | EC2 per-second + EBS | See Build runners page | CI provider minutes |


## Example workflows

### Deploy on push to main

```yaml
name: Deploy production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: [self-hosted, stacktape]
    steps:
      - uses: actions/checkout@v4
      - run: bun install
      - run: bun run test
      - run: npx stacktape deploy --stage prod --region us-east-1
```

### PR preview stages

```yaml
name: PR Preview
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  preview:
    runs-on: [self-hosted, stacktape]
    steps:
      - uses: actions/checkout@v4
      - run: bun install
      - run: bun run test
      - run: npx stacktape deploy --stage "pr-${{ github.event.pull_request.number }}" --region us-east-1
```

Pair this with a cleanup workflow that runs on PR close:

```yaml
name: Cleanup PR Preview
on:
  pull_request:
    types: [closed]
jobs:
  cleanup:
    runs-on: [self-hosted, stacktape]
    steps:
      - uses: actions/checkout@v4
      - run: npx stacktape delete --stage "pr-${{ github.event.pull_request.number }}" --region us-east-1
```

See [Stacks per Git branch pattern](/ci-cd-and-gitops/stacks-per-git-branch-pattern) for naming conventions and cleanup strategies.

### Running tests before deploy

A key advantage of self-hosted runners over [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) is the ability to run tests, lint, and other checks before deploying:

```yaml
name: Test and Deploy
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: [self-hosted, stacktape]
    steps:
      - uses: actions/checkout@v4
      - run: bun install
      - run: bun run typecheck
      - run: bun run lint
      - run: bun run test
  deploy:
    needs: test
    runs-on: [self-hosted, stacktape]
    steps:
      - uses: actions/checkout@v4
      - run: npx stacktape deploy --stage prod --region us-east-1
```

## Mixing with hosted runners

You do not have to run every job on the self-hosted runner. Within a single workflow, some jobs can use hosted runners and others can target your Stacktape-managed runner:

```yaml
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm run lint

  deploy:
    needs: lint
    runs-on: [self-hosted, stacktape]
    steps:
      - uses: actions/checkout@v4
      - run: npx stacktape deploy --stage prod --region us-east-1
```

Run lightweight checks (lint, type-check) on free hosted runners and reserve the self-hosted runner for the resource-intensive deploy step. Since Stacktape only handles jobs whose `runs-on` labels include `stacktape`, the other jobs route to GitHub-hosted infrastructure normally.

## Disabling the runner

To stop the self-hosted runner from processing jobs, set the status to **Disabled** in the Console runner configuration. When disabled, the handler returns early for `workflow_job` events with the `stacktape` label, so Stacktape will not dispatch those jobs to an EC2 runner. Change `runs-on` from `[self-hosted, stacktape]` to a GitHub-hosted label such as `ubuntu-latest` before disabling if those jobs should run elsewhere.

The Console also offers a **Remove config** option, which deletes the saved runner settings (AWS account, region, and instance type). Removing the config is not the same as disabling: without a saved config, the handler still processes `stacktape`-labeled jobs using fallback resolution — first active connected AWS account for the account, and the project's deployment regions or default region for the region. At dispatch time, the handler passes the saved runner instance type when present, then the project-level instance type, then no explicit instance type. Use **Disabled** to explicitly stop processing `stacktape`-labeled jobs for a project.

## FAQ

### When should I use self-hosted runners vs GitHub-hosted runners?

Self-hosted runners are better when you need more compute (up to 32 vCPU) or run enough CI minutes that EC2 per-second pricing is cheaper than GitHub's per-minute billing. GitHub-hosted runners are simpler for teams with short, infrequent workflows — no EC2 instance to manage and no idle cost. Most teams start on hosted runners and switch to self-hosted when build speed or cost becomes a bottleneck.

### Do I need to store AWS credentials or a Stacktape API key in GitHub Secrets?

You do not need to store `STACKTAPE_API_KEY` as a GitHub secret — the handler automatically injects it into the runner environment when dispatching the job to the EC2 instance. The runner also already runs in your connected AWS account, so Stacktape commands have account access without configuring AWS credentials in the workflow. If a workflow step needs other third-party credentials, configure them according to your team's GitHub Actions credential policy.

### How fast does the runner start, and why does my job still wait?

The Console tooltip describes resume from hibernation as ~15s and a cold start (no existing instance) as ~30s. Even when the instance is already running, each queued job still requires Stacktape to register a JIT runner configuration with GitHub and dispatch the agent over SSM before your steps begin, so expect a short delay on every run, not just the first.

### How does Stacktape decide which AWS region the runner uses, and why might it fail?

If you set a region in the runner configuration, that region is used. Otherwise, at runtime the handler checks the project's deployment-region flags — the regions where the project has active stages — picks the first match, then falls back to the project's default region. If no region can be determined, the handler logs an error and does not dispatch the job, so a `stacktape`-labeled job can silently never run. Configure a region explicitly or deploy a stage first to avoid this.

### Should I use self-hosted runners or GitOps with Console?

They solve different problems. [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) triggers deployments directly from git events with no pipeline file or runner to manage — simplest if you only need deploy-on-push. Self-hosted runners execute full GitHub Actions workflows you write, so they're the choice when you need pre-deploy testing, matrix builds, or other custom steps while still running on managed infrastructure in your own AWS account.

### How do I troubleshoot a failed runner job?

Check the GitHub Actions job log first — it shows the workflow step output including any errors. If the runner itself failed to start, verify the runner configuration in the Stacktape Console: confirm the connected AWS account is active, a region is set (or a stage is deployed so the region can be auto-detected), and the runner status is not set to Disabled. Common issues: the connected AWS account was disconnected, no region could be determined, or the runner was disabled.
