# Self-Hosted GitHub Actions Runners

Stacktape can manage self-hosted GitHub Actions runners on EC2 instances in your connected AWS account. You keep full GitHub Actions flexibility — custom steps, matrix builds, reusable workflows — while running jobs on persistent infrastructure with more compute, pre-installed tools, and automatic hibernation to reduce idle costs.

## When to use

Self-hosted runners make sense in two main scenarios:

- **Slow builds on hosted runners.** Large `node_modules`, Docker image builds, or compiled-language builds are bottlenecked by GitHub-hosted runner CPU and network. An EC2 `c7a.2xlarge` (8 vCPU, 16 GB RAM) or larger instance finishes these builds significantly faster, and the instance persists between jobs so caches survive across runs.
- **Cost optimization for high-volume workflows.** GitHub-hosted runner minutes add up at scale. With Stacktape-managed runners, you pay EC2 per-second pricing and the instance hibernates after 15 minutes of idle — you are not paying for a running instance between pushes.

Self-hosted runners also share an EC2 instance with Stacktape deployments, so your workflow and deploy steps run on the same infrastructure. The runner launches in your connected AWS account and the AWS region you select.

## When NOT to use

For most teams, GitHub-hosted runners or [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) are simpler starting points. Skip self-hosted runners if:

- Your workflows complete in under 5 minutes on hosted runners — the overhead of managing an EC2 instance is not worth the marginal speedup.
- You do not need larger compute — GitHub-hosted `ubuntu-latest` handles standard test-and-deploy workflows well.
- You want zero infrastructure — [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) triggers deployments directly from git events without any pipeline file or runner management.

## How it works

The Stacktape GitHub App listens for `workflow_job` webhook events from your repository. When a job is queued with the `stacktape` label, the handler:

1. **Identifies the project** — matches the repository URL to a Stacktape project in your organization. If multiple projects point to the same repo, a project with an explicit runner configuration takes priority.
2. **Ensures the EC2 runner is available** — resumes a hibernated instance (~15 seconds) or provisions a fresh one (~30 seconds cold start).
3. **Registers a JIT (Just-In-Time) ephemeral runner** — requests a single-use runner configuration from the GitHub API, scoped to this job. The runner is registered with labels `self-hosted`, `linux`, `x64`, and `stacktape`.
4. **Dispatches the job via SSM** — sends the runner agent startup command to the EC2 instance using AWS Systems Manager. The GitHub Actions runner agent picks up the job, executes your workflow steps, and exits when done.

After 15 minutes of idle, the instance automatically hibernates. Hibernation preserves the instance's memory state, so the next resume is fast. The handler also guards against duplicate webhook deliveries — if GitHub retries a webhook (e.g. on a 504 timeout), the duplicate is detected and skipped.


## Flow
1. **Workflow queued**: GitHub sends a workflow_job webhook with the 'stacktape' label to the Stacktape GitHub App.
2. **Runner ensured**: The handler resumes a hibernated EC2 instance (~15s) or provisions a new one (~30s cold start).
3. **JIT runner registered**: A single-use runner is registered with GitHub via the JIT config API. Labels: self-hosted, linux, x64, stacktape.
4. **Job dispatched**: SSM sends the runner agent script to the EC2 instance. Your workflow steps execute.
5. **Auto-hibernate**: After 15 minutes with no new jobs, the instance hibernates to stop compute billing.


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
| **AWS region** | The region for the runner instance | Auto-detected from project deployments or account's primary region |
| **Instance type** | EC2 instance size for the runner | `c7a.2xlarge` (8 vCPU, 16 GB RAM) |

If you do not explicitly set a region, Stacktape auto-detects it from your project's existing deployments. If no deployments exist yet, it falls back to the project's default region or the connected account's primary region. Similarly, if you do not select an AWS account, the first active connected account is used.

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
        run: npx stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
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
| `c7a.2xlarge` | 8 | 16 GB | **Default.** Good balance for most teams — fast Docker builds, large Node.js projects |
| `c7a.4xlarge` | 16 | 32 GB | Large monorepos, parallel test suites, heavy Docker multi-stage builds |
| `c7a.8xlarge` | 32 | 64 GB | Extreme workloads — ML model packaging, very large compilations |

The `c7a` instances are compute-optimized (higher CPU-to-memory ratio), while `m6a` instances are general-purpose (balanced). For most CI workloads — building containers, running tests, packaging Lambda functions — `c7a.2xlarge` is the right starting point.


> **Tip:** Start with the default `c7a.2xlarge`. If your workflows consistently finish quickly and don't use much memory, downsize to `c7a.xlarge` or `m6a.large`. If Docker builds or test suites are the bottleneck, try `c7a.4xlarge`.


## Pre-installed tools

The runner comes with a development environment ready to use. Your workflow steps can use these tools without additional setup:

| Tool | Notes |
|------|-------|
| **Node.js** | With npm bundled |
| **Bun** | JavaScript/TypeScript runtime and package manager |
| **Go** | Go compiler and toolchain |
| **Java** | JDK runtime |
| **Python 3** | System Python |
| **Docker** | Available for container builds |
| **AWS CLI** | Pre-configured with instance profile credentials |
| **Git** | For repository operations |

If your workflow needs a tool not on this list, install it as a workflow step. The instance persists between jobs (until hibernation), so caches and installed packages survive across runs within the same active session.

## Hibernation and lifecycle

Stacktape manages the runner lifecycle automatically to balance cost and responsiveness:

- **Active** — the instance runs your workflow steps.
- **Idle** — after the last job completes, a 15-minute countdown starts.
- **Hibernated** — after 15 minutes with no new jobs, the instance hibernates. Hibernation preserves the instance's memory to disk, so resume is fast (~15 seconds). You pay only for EBS storage while hibernated, not for compute.
- **Resumed** — when a new `workflow_job` event arrives with the `stacktape` label, the handler resumes the hibernated instance. The runner agent is ready in ~15 seconds.
- **Cold provisioned** — if no instance exists yet (first job ever, or the previous instance was terminated), a new EC2 instance is provisioned. Cold start takes approximately 30 seconds.

The idle timeout is enforced automatically by a scheduled Lambda. An instance with in-progress work is not hibernated.


> **Warning:** Hibernation preserves filesystem state (caches, installed tools, build artifacts). If you need a clean environment for every job, add cleanup steps to your workflow. For most teams, the warm cache is a benefit — subsequent builds are faster because `node_modules`, Docker layers, and compiled artifacts persist.


## Cost

You pay standard AWS EC2 pricing for the time the instance is running, plus EBS storage costs while hibernated. Check current EC2 pricing on the AWS pricing page for the exact rate for your region and instance type.

| State | What you pay |
|-------|-------------|
| Running | EC2 per-second pricing for the instance type + EBS storage |
| Hibernated | EBS storage only |
| No instance | Nothing |

Self-hosted runners can save money compared to GitHub-hosted runners when your builds are long (faster hardware finishes sooner) or when you run many builds per day (the hibernated instance resumes quickly and avoids re-provisioning). For short, infrequent builds, hosted runners may be simpler.

## Self-hosted runners vs other CI/CD options


## Feature Comparison

| Feature | Self-hosted runners | GitOps with Console | Custom CI/CD (hosted runners) |
| --- | --- | --- | --- |
| Pipeline customization | Full GitHub Actions | None — git event triggers deploy | Full — any CI system |
| Pre-deploy testing | yes | no | yes |
| Runs in your AWS account | yes | yes | no |
| Setup effort | Enable in Console + modify workflow YAML | Configure in Console only | Write workflow file |
| Runner maintenance | Managed by Stacktape (hibernation, provisioning) | Managed by Stacktape | Managed by CI provider |
| Build speed | Up to 32 vCPU, warm cache | Depends on build runner type | 2 vCPU on GitHub free tier |
| Cost model | EC2 per-second + EBS | CodeBuild or EC2 runner | CI provider minutes |


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
      - run: npx stacktape deploy --stage prod --region us-east-1 --autoConfirmOperation
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
      - run: npx stacktape deploy --stage "pr-${{ github.event.pull_request.number }}" --region us-east-1 --autoConfirmOperation
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
      - run: npx stacktape delete --stage "pr-${{ github.event.pull_request.number }}" --region us-east-1 --autoConfirmOperation
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
      - run: npx stacktape deploy --stage prod --region us-east-1 --autoConfirmOperation
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
      - run: npx stacktape deploy --stage prod --region us-east-1 --autoConfirmOperation
```

Run lightweight checks (lint, type-check) on free hosted runners and reserve the self-hosted runner for the resource-intensive deploy step. Since Stacktape only handles jobs whose `runs-on` labels include `stacktape`, the other jobs route to GitHub-hosted infrastructure normally.

## Disabling the runner

To stop using the self-hosted runner for a project, set the status to **Disabled** in the Console runner configuration, or remove the configuration entirely. When disabled, `workflow_job` events with the `stacktape` label are ignored — your workflows will stall with "no matching runner" unless you update `runs-on` to use a hosted runner instead.


> **Warning:** Disabling the runner configuration does not terminate the EC2 instance immediately. The instance hibernates after the idle timeout as usual. If you want to stop the instance right away, terminate it from the AWS EC2 console or wait for the idle timeout to trigger hibernation.


## FAQ

### How do I set up a self-hosted GitHub Actions runner with Stacktape?

Install the Stacktape GitHub App on your repository, connect an AWS account in the Stacktape Console, then enable the GitHub Actions runner configuration for your project. In your GitHub Actions workflow, set `runs-on: [self-hosted, stacktape]`. The runner infrastructure is provisioned automatically on the first job — no manual EC2 setup required.

### Do I need to store AWS credentials or API keys in GitHub Secrets?

No. `STACKTAPE_API_KEY` is automatically injected into the runner environment by the Stacktape handler when dispatching the job. The EC2 instance uses an IAM instance profile for AWS access, so you do not need IAM access keys as GitHub Secrets either.

### How fast does the runner start?

If the instance is hibernated (the common case after 15+ minutes of idle), it resumes in approximately 15 seconds. A cold start — provisioning a brand-new instance — takes approximately 30 seconds. Once the instance is running, it picks up new jobs without additional startup delay until the idle timeout triggers hibernation again.

### When should I use self-hosted runners vs GitHub-hosted runners?

Self-hosted runners are better when you need more compute (up to 32 vCPU), want warm caches between builds, or run enough CI minutes that EC2 per-second pricing is cheaper than GitHub's per-minute billing. GitHub-hosted runners are simpler for teams with short, infrequent workflows — no EC2 instance to manage and no idle cost. Most teams start on hosted runners and switch to self-hosted when build speed or cost becomes a bottleneck.

### Can I use self-hosted runners together with GitOps?

These are separate features. [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) triggers deployments directly from git events without a pipeline file. Self-hosted runners execute GitHub Actions workflows that you write. If you want both automatic deployment and custom pipeline logic, use self-hosted runners with a GitHub Actions workflow — you get full control over pre-deploy steps while running on managed infrastructure.

### Can I use self-hosted runners for non-Stacktape workflows?

Yes. The runner is a standard GitHub Actions self-hosted runner with pre-installed development tools. Any workflow step that runs on a Linux x64 runner works — you can use it for tests, builds, deployments to other platforms, or any other automation. `STACKTAPE_API_KEY` is injected automatically, but you are not required to use it.

### What operating system and architecture does the runner use?

The runner uses Linux on x86_64 (amd64) architecture. It registers with GitHub using the labels `self-hosted`, `linux`, `x64`, and `stacktape`. ARM/Graviton-based runners are not currently available.

### How does Stacktape decide which AWS region to use?

If you set a region in the runner configuration, that region is used. Otherwise, Stacktape auto-detects the region from your project's existing deployments — it checks which regions have active stages and picks the first match. If no deployments exist, it falls back to the project's default region or the connected account's primary region. You can always override this by explicitly selecting a region in the configuration.

### What happens if the Stacktape GitHub App receives duplicate webhooks?

GitHub may retry webhook deliveries on timeout or 504 responses. The handler guards against duplicates — if a job record already exists for a given GitHub job ID, the duplicate event is skipped. This prevents double runs or conflicting SSM commands on the same instance.

### How do I troubleshoot a failed runner job?

Check the GitHub Actions job log first — it shows the workflow step output including any errors. If the runner itself failed to start, check the Stacktape Console for the project's runner status. Common issues: the connected AWS account was disconnected, no region could be determined (configure one explicitly or deploy a stage first), or the runner was disabled in the configuration.
