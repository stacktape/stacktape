# Build Runners

Console-managed project deployments run on a configured build runner. Stacktape offers two runner types: **EC2 runners** (recommended for most teams) and **CodeBuild runners**. EC2 runners are dedicated instances that stay warm between deploys and cache dependencies on disk — typically 2–5× faster than CodeBuild. CodeBuild runners provision a fresh container for each deploy with no idle costs.

EC2 runners cost ~$3/month in storage plus ~$0.005/min compute while deploying. CodeBuild runners cost ~$0.02/min with no idle charges.

## EC2 runners vs CodeBuild


## Feature Comparison

| Feature | EC2 runner | CodeBuild |
| --- | --- | --- |
| Recommended for | Most teams — regular deploys, fast iteration | Infrequent deploys, minimal infrastructure |
| Caching | Dependencies cached on disk between deploys | Fresh container each deploy — re-downloads everything |
| Deploy speed | 2–5× faster (cached dependencies + warm instance) | Slower — full dependency install on every build |
| Idle behavior | Auto-hibernates after 15 min idle, wakes in ~10 seconds | No idle state — container destroyed after each build |
| Cost model | ~$3/month storage + ~$0.005/min compute while deploying | ~$0.02/min build time, no idle charges |
| Configuration | Per-project instance type in the runner configuration modal | Global settings on the Projects page in the Console |


## When to use EC2 runners

EC2 runners are the right choice for teams that deploy more than a few times per week. The instance stays warm between deploys and caches dependencies on disk, so repeated deploys usually spend less time downloading and installing dependencies. In the Git-backed project creation flow, EC2 runner is preselected and marked as recommended.

The ~$3/month baseline cost for storage is negligible compared to the time saved. If your team deploys daily — or multiple times per day during active development — the faster builds add up quickly. A 5-minute CodeBuild deploy finishing in 1–2 minutes on an EC2 runner means less waiting and faster feedback loops for the entire team.

EC2 runners are also a good default if you're not sure which type to pick. You can switch between EC2 and CodeBuild runners from the project's runner configuration modal; changes take effect on the next deployment.

## When to use CodeBuild

CodeBuild runners are a good fit when you deploy rarely — perhaps a few times per month or less. With no persistent infrastructure, you pay nothing between deploys. Each build provisions a fresh container, runs the deployment, and tears down. There is no persistent state to manage or pay for.

CodeBuild is also a reasonable starting point if you want to evaluate Stacktape before committing to any persistent runner infrastructure. You can switch to an EC2 runner from the project's runner configuration modal; changes take effect on the next deployment.

The trade-off is speed. CodeBuild has no caching between builds, so every deploy re-downloads dependencies, which adds time to each build. For active development, this overhead compounds quickly across the team.

## EC2 runner configuration

EC2 runner settings are configured **per project** in the Stacktape Console. Git-backed project creation lets you choose the runner type and a region. The runner configuration modal lets you change the runner type and, for EC2 runners, the instance type.

### Instance types

The instance type controls how much CPU and memory the runner has during builds. Larger instances build faster but cost more per minute of compute.

| Instance type | vCPU | Memory | Approx. cost |
|---------------|------|--------|--------------|
| `m6a.large` | 2 | 8 GB | ~$0.001/min |
| `m6a.xlarge` | 4 | 16 GB | ~$0.003/min |
| `c7a.xlarge` | 4 | 8 GB | ~$0.003/min |
| `c7a.2xlarge` | 8 | 16 GB | ~$0.006/min |
| `c7a.4xlarge` | 16 | 32 GB | ~$0.011/min |
| `c7a.8xlarge` | 32 | 64 GB | ~$0.023/min |

The default is `c7a.2xlarge` (8 vCPU, 16 GB). This balances build speed and cost for most projects. The available instances span two AWS instance families:

- **`c7a`** — an AWS compute-optimized instance family with a higher CPU-to-memory ratio. AWS compute-optimized instances are designed for CPU-bound workloads.
- **`m6a`** — an AWS general-purpose instance family with more memory per vCPU. AWS general-purpose instances offer a balance of compute, memory, and networking.

For small projects with simple builds, `m6a.large` keeps costs minimal. For projects with longer build times, `c7a.4xlarge` or `c7a.8xlarge` offer more CPU and memory. You can change the instance type at any time from the runner configuration modal — changes take effect on the next deployment.

### Hibernation

EC2 runners auto-hibernate after 15 minutes of inactivity. When the next deployment triggers, the runner wakes up in approximately 10 seconds — far faster than provisioning a new instance from scratch.

While hibernated, you pay only for storage (~$3/month for 50 GB). Compute charges stop during hibernation. This means a team that deploys a few times per day pays for a few minutes of compute plus the flat storage cost, while still getting near-instant runner availability for every deploy.


> **Tip:** Hibernation makes EC2 runners practical even for teams with gaps between deploys. You get the speed of a warm instance without paying for compute during quiet periods.


### Runner region

The runner region is selected when creating a Git-backed project. The Console describes the selected region as where the runner is created and warmed, and where the runner instance and its EBS volume live. EC2 and CodeBuild build minutes are billed at the selected region's AWS rates.


> **Tip:** Choose a runner region close to where your stacks are deployed. Cross-region data transfer between the runner and your deployment target can add latency and incur additional AWS transfer costs.


## CodeBuild configuration

CodeBuild settings are configured **globally** for every project on the Projects page in the Stacktape Console.

Unlike EC2 runners, CodeBuild provisions a fresh container for each deploy with no caching between builds. This makes CodeBuild simpler to manage (no persistent infrastructure) but slower for repeated deployments.

## Switching runner types

You can switch between EC2 and CodeBuild runners from the project's runner configuration modal in the Stacktape Console. The modal notes that changes take effect on the next deployment.

## Build runners and CI/CD

Build runners execute deployments for Git-backed projects managed in the Stacktape Console — see [GitOps deployments](/ci-cd-and-gitops/gitops-with-console). Console runner settings apply to Git-backed projects managed in the Stacktape Console; [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) and CLI workflows like [`deploy --runner codebuild`](/cli/deploy) are configured separately.

## FAQ

### Should I use an EC2 runner or CodeBuild?

Use an EC2 runner unless you deploy very infrequently. EC2 runners cache dependencies between deploys, making repeat deployments typically 2–5× faster than CodeBuild. The ~$3/month storage cost is negligible for active projects. CodeBuild is a better fit for projects with rare deployments where you want zero idle costs. In the project creation flow, EC2 runner is preselected and marked as recommended.

### How much does an EC2 runner cost?

An EC2 runner has two cost components: a fixed ~$3/month for storage (billed even when hibernated) and per-minute compute charges only while the instance is running. With the default `c7a.2xlarge` instance, compute costs approximately $0.006/min. Smaller instances like `m6a.large` cost ~$0.001/min, while the largest `c7a.8xlarge` costs ~$0.023/min.

### How does EC2 runner hibernation affect speed and cost?

An EC2 runner auto-hibernates after 15 minutes of inactivity, saving its memory state to its storage volume. While hibernated you pay only for storage (~$3/month) with no compute charges. When the next deployment triggers, the instance resumes from its saved state in about 10 seconds — far faster than booting a new instance from scratch — with cached dependencies immediately available. This gives you warm-instance speed without paying for compute during idle periods.

### Can I switch runner types after creating a project?

Yes. Open the runner configuration modal for your project in the Stacktape Console and select a different runner type. Changes take effect on the next deployment. EC2 runner settings (including the instance type) are configured per project, while CodeBuild settings are configured globally for every project on the Projects page.

### Do I need a build runner if I use custom CI/CD?

No. Build runners are specific to Git-backed projects deployed through the Stacktape Console (see [GitOps](/ci-cd-and-gitops/gitops-with-console)). When you use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) — GitHub Actions, GitLab CI, or any other pipeline — your CI system's own runners execute the Stacktape CLI. The Console's runner configuration does not apply. The [`deploy --runner codebuild`](/cli/deploy) CLI command is also separate from Console-managed runners — see its [CLI reference](/cli/deploy) for details.

### What instance type should I choose for my EC2 runner?

Start with the default `c7a.2xlarge` (8 vCPU, 16 GB) — it handles most build workloads well. To minimize cost on simple builds, drop to `m6a.large` (2 vCPU, 8 GB, ~$0.001/min); for projects with longer build times, scale up to `c7a.4xlarge` or `c7a.8xlarge` for more CPU and memory. You can change the instance type at any time from the runner configuration modal, and changes take effect on the next deployment.
