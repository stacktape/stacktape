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

EC2 runners are also a good default if you're not sure which type to pick. You can always switch to CodeBuild later from the project's runner configuration modal, and the change takes effect on the next deployment.

## When to use CodeBuild

CodeBuild runners are a good fit when you deploy rarely — perhaps a few times per month or less. With no persistent infrastructure, you pay nothing between deploys. Each build provisions a fresh container, runs the deployment, and tears down. There is no persistent state to manage or pay for.

CodeBuild is also a reasonable starting point if you want to evaluate Stacktape before committing to any persistent runner infrastructure. You can switch to an EC2 runner later without affecting your deployed stacks — the change takes effect on the next deployment.

The trade-off is speed. Every CodeBuild deploy re-downloads dependencies from scratch, which adds time to each build. For active development, this overhead compounds quickly across the team.

## EC2 runner configuration

EC2 runner settings are configured **per project** in the Stacktape Console. You choose the runner type and runner region when creating a Git-backed project. The EC2 instance type is configured separately in the project's runner configuration modal, where you can also change it at any time.

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

The default is `c7a.2xlarge` (8 vCPU, 16 GB). This balances build speed and cost for most projects. Choose between two instance families depending on your workload:

- **`c7a` (compute-optimized)** — higher CPU-to-memory ratio. Good for compute-bound builds with parallel tasks, TypeScript type-checking, or large compilations.
- **`m6a` (general-purpose)** — more memory per vCPU. Better if your build process is memory-heavy, such as Docker image builds or large monorepo bundling.

For small projects with simple builds, `m6a.large` keeps costs minimal. For monorepos or projects with heavy Docker builds, `c7a.4xlarge` or `c7a.8xlarge` can cut build times significantly. You can change the instance type at any time from the runner configuration modal — the change takes effect on the next deployment.

### Hibernation

EC2 runners auto-hibernate after 15 minutes of inactivity. When the next deployment triggers, the runner wakes up in approximately 10 seconds — far faster than provisioning a new instance from scratch.

While hibernated, you pay only for storage (~$3/month for 50 GB). Compute charges stop during hibernation. This means a team that deploys a few times per day pays for a few minutes of compute plus the flat storage cost, while still getting near-instant runner availability for every deploy.


> **Tip:** Hibernation makes EC2 runners practical even for teams with gaps between deploys. You get the speed of a warm instance without paying for compute during quiet periods.


### Runner region

Each EC2 runner is provisioned in a specific AWS region, selected when creating the project. The runner instance and its storage volume live in that region, and AWS pricing is billed at that region's rates.


> **Tip:** Choose a runner region close to where your stacks are deployed. Cross-region data transfer between the runner and your deployment target can add latency and incur additional AWS transfer costs.


The runner region is per project, but you can change the default region later if needed.

## CodeBuild configuration

CodeBuild settings are configured **globally** — they apply to all projects in the organization that use CodeBuild runners. You configure them from the Projects page in the Stacktape Console.

Unlike EC2 runners, CodeBuild provisions a fresh container for each deploy with no caching between builds. This makes CodeBuild simpler to manage (no persistent infrastructure) but slower for repeated deployments.

## Switching runner types

You can switch between EC2 and CodeBuild runners at any time from the project's runner configuration modal in the Stacktape Console. Changes take effect on the next deployment. No redeployment of your existing stacks is needed — the runner type only affects how the deployment process runs, not the deployed infrastructure.

## Build runners and CI/CD

Build runners are used by [GitOps deployments](/ci-cd-and-gitops/gitops-with-console) and Console-triggered deployments. When you use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd), your CI system's own runners execute the Stacktape CLI directly — the Console's build runner configuration does not apply.

The [`codebuild:deploy`](/cli/codebuild-deploy) CLI command is a separate mechanism that offloads a CLI-initiated deployment to AWS CodeBuild. It uses its own CodeBuild project and is independent of the Console's runner configuration.

| Deployment method | Uses Console build runners? | Runner configured in |
|-------------------|-----------------------------|---------------------|
| GitOps (Console) | Yes | Project settings in Console |
| Console-triggered deploy | Yes | Project settings in Console |
| `stacktape deploy` (CLI) | No — runs locally | N/A |
| `stacktape codebuild:deploy` | No — uses its own CodeBuild project | CLI flags |
| Custom CI/CD pipeline | No — runs on CI provider's infrastructure | CI provider settings |

## FAQ

### Should I use an EC2 runner or CodeBuild?

Use an EC2 runner unless you deploy very infrequently. EC2 runners cache dependencies between deploys, making repeat deployments typically 2–5× faster than CodeBuild. The ~$3/month storage cost is negligible for active projects. CodeBuild is a better fit for projects with rare deployments where you want zero idle costs. In the project creation flow, EC2 runner is preselected and marked as recommended.

### How much does an EC2 runner cost?

An EC2 runner has two cost components: a fixed ~$3/month for storage (billed even when hibernated) and per-minute compute charges only while the instance is running. With the default `c7a.2xlarge` instance, compute costs approximately $0.006/min. Smaller instances like `m6a.large` cost ~$0.001/min, while the largest `c7a.8xlarge` costs ~$0.023/min.

### How fast does an EC2 runner wake from hibernation?

An EC2 runner auto-hibernates after 15 minutes of inactivity and wakes up in approximately 10 seconds when the next deployment triggers. This is significantly faster than provisioning a new instance, which would take minutes. Hibernation preserves the instance's state, so cached dependencies are immediately available.

### Can I use different runner types for different stages?

Runner type is configured per project, not per stage. All stages within a project use the same runner type and instance configuration. If you need different runner configurations for different environments, create separate projects in the Stacktape Console.

### Do build runners affect my deployed infrastructure?

No. Build runners only affect how the deployment process runs. The resulting deployed infrastructure — [Lambda functions](/resources/compute/lambda-function), [container workloads](/resources/compute/web-service), [databases](/resources/databases/relational-database), and other resources — is identical regardless of which runner type you use. Switching runner types does not require redeploying your stacks.

### Can I switch runner types after creating a project?

Yes. Open the runner configuration modal for your project in the Stacktape Console and select a different runner type. The change takes effect on the next deployment. Switching does not affect your deployed stacks — only the machine that runs future deployments changes.

### What is AWS CodeBuild?

AWS CodeBuild is a managed build service that provisions a fresh container for each build, runs your commands, and tears down the container when done. You pay per minute of build time with no idle charges. In the Stacktape context, CodeBuild runners use this service to execute deployments. Because each build starts clean, there is no dependency caching between deploys — every deployment re-downloads and installs dependencies from scratch.

### How does EC2 hibernation reduce runner costs?

EC2 hibernation saves the instance's memory state to its storage volume and stops the instance. While hibernated, you pay only for storage (~$3/month) — no compute charges. When a deployment triggers, the instance resumes from its saved state in about 10 seconds instead of booting from scratch. This gives you warm-instance speed without paying for compute during idle periods between deploys.

### Do I need a build runner if I use custom CI/CD?

No. Build runners are specific to Console-managed deployments ([GitOps](/ci-cd-and-gitops/gitops-with-console) and Console-triggered deploys). When you use [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) — GitHub Actions, GitLab CI, or any other pipeline — your CI system's own runners execute the Stacktape CLI. The Console's runner configuration does not apply. The [`codebuild:deploy`](/cli/codebuild-deploy) CLI command is also independent — it provisions its own CodeBuild project.

### What instance type should I choose for my EC2 runner?

Start with the default `c7a.2xlarge` (8 vCPU, 16 GB). It handles most build workloads well. If your builds are simple and you want to minimize cost, drop to `m6a.large` (2 vCPU, 8 GB, ~$0.001/min). If your builds involve heavy Docker image creation or large monorepo compilations, scale up to `c7a.4xlarge` or `c7a.8xlarge` for faster builds. The `m6a` family offers more memory per vCPU — useful for memory-bound builds. You can change the instance type at any time from the runner configuration modal.
