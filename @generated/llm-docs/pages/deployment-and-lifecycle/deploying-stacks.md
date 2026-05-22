# Deploying Stacks

The [`stacktape deploy`](/cli/deploy) command prepares your application artifacts, generates a CloudFormation template from your configuration, uploads artifacts, and asks CloudFormation to create or update the stack. Each stage of a project maps to one CloudFormation stack in your AWS account. When auto-rollback is enabled (the default), CloudFormation reverts failed updates and Stacktape cleans up rolled-back deployment artifacts.

## How deployment works

A Stacktape deployment runs through several phases. Understanding them helps you interpret the deploy output and diagnose slow deployments.


## Flow
1. **Validate & prepare**: Parse config, check guardrails, create missing secrets and SSM parameters
2. **Package & prepare template**: Bundle Lambda code, build container images, resolve resources, prepare CloudFormation template
3. **Upload**: Upload packaged artifacts to S3, push container images to ECR
4. **Deploy**: Create or update the CloudFormation stack (or hot-swap eligible workloads directly)
5. **Post-deploy**: Run afterDeploy hooks, sync hosting buckets, invalidate CDN caches, send notifications


### Validate and prepare

Stacktape parses and validates your configuration, then checks any [guardrails](/guardrails/overview) configured for your organization. If your config references [secrets](/configuration/secrets) via `$Secret()` that don't exist yet, the CLI prompts you to create them. Missing SSM parameters are handled the same way.

### Package and prepare template

Stacktape packages your workloads in parallel. [Lambda functions](/resources/compute/lambda-function) are bundled, while [container workloads](/resources/compute/web-service) build OCI images from your source or Dockerfile. After packaging, Stacktape resolves configured resources and prepares the CloudFormation template used for the deployment.

### Upload

Stacktape uploads packaged artifacts to an S3 deployment bucket and pushes container images to ECR repositories.

### Deploy

For new stacks, Stacktape creates the CloudFormation stack. For existing stacks, it applies only the changed resources. CloudFormation handles dependency ordering and parallelizes independent resource creation. When the `--hotSwap` flag is used and the template diff is eligible, Stacktape bypasses CloudFormation and updates eligible Lambda functions and container workloads directly via the AWS APIs.

### Post-deploy

After the stack is stable, Stacktape runs any user-defined `afterDeploy` [hooks](/deployment-and-lifecycle/deployment-scripts-and-hooks) — the most common use case is running database migrations after infrastructure is ready. Stacktape then syncs [hosting buckets](/resources/frontend/static-hosting) with your local build output, invalidates [CDN](/resources/networking/cdn) caches if needed, saves stack info to disk if configured, and sends deployment notifications to any configured [alert channels](/observability/alert-channels). On the first deploy of a new stack, the CLI also prompts you to set up [CI/CD](/ci-cd-and-gitops/overview).

## Running a deployment

The minimum deploy command requires a stage name and an AWS region:

```bash
stacktape deploy --stage dev --region eu-west-1
```

A **stage** is an isolated copy of your infrastructure — typically one per environment (`dev`, `staging`, `production`) or per developer (`dev-john`). See [Stages and environments](/configuration/stages-and-environments) for details. A **region** determines the AWS data center where your resources are created. Choose a region close to your users for lower latency.

Stacktape looks for `stacktape.ts` (or `stacktape.yml`) in the current directory by default. Use `--configPath` to point to a different file.


> **Tip:** Use [`stacktape defaults:configure`](/cli/defaults-configure) to set a default stage, region, and AWS profile. After that, you can run `stacktape deploy` without flags during development.


### Key options

| Flag | Description |
| --- | --- |
| `--stage` (`-s`) | **(required)** Stage name — `dev`, `staging`, `production`, etc. |
| `--region` (`-r`) | **(required)** AWS region — `eu-west-1`, `us-east-1`, etc. |
| `--configPath` | Path to config file. Defaults to `stacktape.ts` or `stacktape.yml`. |
| `--hotSwap` | Fast deploy for code-only changes. Falls back to full deploy if infrastructure changed. |
| `--autoConfirmOperation` | Skip the confirmation prompt. Required for CI/CD pipelines. |
| `--disableAutoRollback` | Keep failed CloudFormation state for debugging instead of rolling back. |
| `--noCache` | Force fresh builds, ignoring cached artifacts. |
| `--preserveTempFiles` | Keep generated CloudFormation templates for inspection. |
| `--logLevel` | Set to `debug` for verbose output. |
| `--awsProfile` | AWS profile to use instead of the default. |
| `--projectName` | Stacktape project name. |

For the full flag reference with all available options and short aliases, see the [`deploy` CLI reference](/cli/deploy).

## Deployment modes

Stacktape supports three deployment modes. Most teams use **full deployment** for production and **hot-swap** during development.


## Feature Comparison

| Feature | Full deploy | Hot-swap | CodeBuild deploy |
| --- | --- | --- | --- |
| Can update all resource types | yes | no | yes |
| Adds or removes resources | yes | no | yes |
| Changes IAM, networking, config | yes | no | yes |
| Automatic rollback on failure | yes | no | yes |
| Typical duration | 1-10 min | Seconds | 3-15 min |
| Build environment | Local machine | Local machine | AWS CodeBuild |


### Full deployment

Full deployment is the default mode. Stacktape generates a CloudFormation template and lets CloudFormation create, update, or delete resources as needed. CloudFormation handles dependency ordering, parallelizes independent resource operations, and can roll back the entire stack if any resource fails.

```bash
stacktape deploy --stage production --region eu-west-1
```

Use full deployment for production, staging, and any environment where infrastructure consistency matters. Full deploys are the only mode that can add or remove resources, change IAM permissions, update API routes, or modify resource configuration like memory and timeouts.

### Hot-swap deployment

Hot-swap deployment bypasses CloudFormation and updates eligible [Lambda functions](/resources/compute/lambda-function) and [container workloads](/resources/compute/web-service) directly through the AWS APIs. This makes code iterations significantly faster during development — typically completing in seconds instead of minutes.

```bash
stacktape deploy --stage dev --region eu-west-1 --hotSwap
```

When you pass `--hotSwap`, Stacktape analyzes the CloudFormation template diff to determine whether a hot-swap is possible. If Stacktape detects infrastructure changes — new resources, deleted resources, permission changes, configuration changes — it falls back to a full CloudFormation deployment automatically and warns you.

Hot-swap is only available for **updates to existing stacks**. The first deployment of a new stage always runs a full deploy regardless of the flag. Not all Lambda functions in your stack are eligible for hot-swap. Stacktape determines eligibility automatically — if a function is ineligible, the deployment falls back to a full CloudFormation deploy.

For Lambda functions, hot-swap updates the deployed function code. For container workloads, hot-swap updates the task definition — including container images and environment variables — and the service configuration. Changes to infrastructure, IAM permissions, API routes, and resource-level configuration (memory, CPU, timeout) always require a full deployment.


> **Warning:** Hot-swap updates resources outside of CloudFormation, which creates drift between the CloudFormation template and actual infrastructure. Use hot-swap only for development stages. Always use full deployment for production.


### CodeBuild deployment

For large container builds, monorepos, or machines with limited resources, offload the entire build and deploy process to [AWS CodeBuild](/ci-cd-and-gitops/build-runners):

```bash
stacktape codebuild:deploy --stage production --region eu-west-1
```

CodeBuild deployment uploads your project to S3 and starts a CodeBuild build that runs the full deployment inside your AWS account. This is useful when local Docker builds are slow, your CI runner is underpowered, or you want to keep large image layers close to ECR for faster pushes.

For simple Lambda-based stacks, local deploy is usually faster because it avoids the overhead of uploading your project and starting a CodeBuild environment. CodeBuild deployment shines for container-heavy stacks and monorepos with multiple images to build.

See the [`codebuild:deploy` CLI reference](/cli/codebuild-deploy) for available options.

## Automatic rollback

By default, Stacktape enables CloudFormation auto-rollback. If any resource fails during a full deployment, CloudFormation reverts the entire stack to its previous state. When auto-rollback is enabled, Stacktape also cleans up deployment artifacts from the rolled-back deployment so you don't accumulate orphaned build artifacts. The exception is stack-monitoring failures — when monitoring loses track of the deployment outcome, artifacts are preserved because the deployment may have actually succeeded.

For new stacks that fail on first creation, CloudFormation rolls back and deletes provisioned resources, leaving the stack in a `ROLLBACK_COMPLETE` state. You must delete this empty stack before deploying again — see the [troubleshooting section](#stack-is-in-rollback_complete-state) below.

### Debugging failed deployments

To inspect a failed deployment before it rolls back, disable auto-rollback:

```bash
stacktape deploy --stage dev --region eu-west-1 --disableAutoRollback
```

If a stack is left in `UPDATE_FAILED` state after a failed update, Stacktape includes cleanup logic that runs when you successfully deploy over that state. Inspect CloudFormation events in the AWS console to diagnose the issue, fix the problem in your config, then deploy again. You can also roll back manually with [`stacktape rollback`](/cli/rollback).


> **Warning:** Don't leave production stacks in a failed state. Fix the issue and redeploy promptly, or roll back manually with [`stacktape rollback`](/cli/rollback).


## Deployment confirmation

Before modifying an existing stack, Stacktape computes the CloudFormation template diff and may prompt you to confirm before proceeding. This helps catch potentially destructive changes — such as resource replacements or deletions — before they happen.

Skip the prompt in non-interactive environments with `--autoConfirmOperation`:

```bash
stacktape deploy --stage production --region eu-west-1 --autoConfirmOperation
```


> **Tip:** Always pass `--autoConfirmOperation` in CI/CD pipelines. Without it, the deploy command hangs waiting for input.


## Previewing changes

Before deploying, see what would change with [`stacktape preview-changes`](/cli/preview-changes):

```bash
stacktape preview-changes --stage dev --region eu-west-1
```

Stacktape generates the CloudFormation template and computes the diff against the currently deployed stack without modifying anything. Use it to verify your config changes produce the expected infrastructure changes before committing to a deploy. See [Previewing changes](/deployment-and-lifecycle/previewing-changes) for details.

## CloudFormation stack states

Every Stacktape stage maps to a CloudFormation stack. The stack's state determines what operations are available. Understanding these states helps when troubleshooting stuck or failed deployments.

| State | Meaning | What you can do |
| --- | --- | --- |
| `CREATE_COMPLETE` | Stack created and healthy | Deploy updates, delete |
| `UPDATE_COMPLETE` | Last update succeeded | Deploy updates, delete |
| `UPDATE_ROLLBACK_COMPLETE` | Last update failed and rolled back | Deploy again (fix the issue first), delete |
| `UPDATE_FAILED` | Update failed, auto-rollback was disabled | Fix and redeploy, or [rollback manually](/cli/rollback) |
| `ROLLBACK_COMPLETE` | Initial creation failed and rolled back | Delete the stack and try again |
| `*_IN_PROGRESS` | Operation running | Wait for it to finish |
| `DELETE_COMPLETE` | Stack deleted | Deploy to create a new stack |

## Deploying from the Stacktape Console

The [Stacktape Console](/stacktape-console/console-overview) supports GitOps-based deployments and preview environments — connect your Git repository, map branches to stages, and have deployments triggered automatically on push. See [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) for setup and configuration.

For teams that already have a CI/CD system (GitHub Actions, GitLab CI, etc.), you can run `stacktape deploy` directly inside your pipeline with a Stacktape API key. See [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) for integration examples.

## Dev mode and deployment

Stacks created with [`stacktape dev`](/cli/dev) (dev mode) cannot be updated with `stacktape deploy`. Dev mode uses a lightweight infrastructure configuration optimized for local development, and deploying a full production config on top would create conflicts. Use a different stage name when moving from dev mode to a deployed stage:

```bash
# Dev mode — runs workloads locally
stacktape dev --stage dev-local --region eu-west-1

# Full deployment — separate stage
stacktape deploy --stage dev --region eu-west-1
```

## Troubleshooting

### Stack is in ROLLBACK_COMPLETE state

A `ROLLBACK_COMPLETE` state means the initial stack creation failed and CloudFormation rolled back all provisioned resources. The stack itself is an empty shell that blocks the name. Delete it and deploy again:

```bash
stacktape delete --stage dev --region eu-west-1
stacktape deploy --stage dev --region eu-west-1
```

### Stack name too long

The CloudFormation stack name is derived from your project name and stage. If the combined name is too long, Stacktape automatically shortens individual resource names to stay within AWS naming limits. You'll see a warning during deploy. This doesn't affect functionality, but resource names in the AWS console become less readable. Keep project names and stage names short to avoid this.

### No changes to deploy

CloudFormation detected that your template matches the currently deployed stack. Verify that you saved your config file, that you're deploying the right stage, and that your changes affect Stacktape-managed resources. Changes to raw [CloudFormation overrides](/configuration/overrides-and-escape-hatches) follow the same template-based diff logic.

### Deployment is slow

Common causes of slow Stacktape deployments:

- **Large container images** — Use multi-stage Docker builds or [Stacktape buildpack packaging](/packaging/containers/stacktape-buildpack) to reduce image size.
- **Many resources** — CloudFormation serializes dependent resources. This is expected for complex stacks.
- **Slow local builds** — Consider [`codebuild:deploy`](/cli/codebuild-deploy) to offload builds to AWS.
- **First deploy to a new region** — Initial infrastructure setup (S3 deployment bucket, ECR repositories) adds one-time overhead.

Run with `--logLevel debug` to see detailed timing for each phase.

### Secrets prompt blocking CI/CD

If your config references `$Secret()` values that don't exist, the CLI prompts you to create them interactively. In CI/CD, this causes the deploy to hang. Create secrets before deploying using [`secret:create`](/cli/secret-create) or the [Stacktape Console](/configuration/secrets):

```bash
stacktape secret:create --name mySecret --stage production --region eu-west-1
```

## FAQ

### How long does a Stacktape deployment take?

Deployment duration depends on the number and type of resources in your stack. A simple Lambda function deploys in under 2 minutes. Stacks with databases, container workloads, and networking typically take 3–10 minutes. Hot-swap deployments for code-only changes complete in seconds. The packaging and upload phases scale with your codebase size and number of container images.

### What happens if a CloudFormation deployment fails midway?

When auto-rollback is enabled (the default), CloudFormation reverts the entire stack to its previous working state. Resources that were partially created are deleted, and modified resources are reverted. Stacktape also cleans up deployment artifacts from the rolled-back attempt. You can disable auto-rollback with `--disableAutoRollback` to keep the failed state for inspection. See [Rollbacks](/deployment-and-lifecycle/rollbacks) for manual rollback options.

### Can I deploy multiple stages from the same config?

Yes. The same `stacktape.ts` config produces independent stacks per stage. Deploy with `--stage dev` and `--stage production` from the same config, and they create separate AWS resources with no shared state. Use [directives](/configuration/directives) like `$Stage()` inside your config to vary behavior per stage — for example, smaller instances in dev and larger ones in production.

### What is the difference between first deploy and subsequent deploys?

The first deployment creates the CloudFormation stack and all resources defined in your configuration, along with internal resources Stacktape needs for artifact management. Subsequent deployments only update what changed — CloudFormation computes the diff and applies the minimum set of changes. Unchanged resources are left untouched. First deploys are typically slower than updates.

### Should I use hot-swap or full deployment?

Use hot-swap (`--hotSwap`) when iterating on Lambda or container code during development. It bypasses CloudFormation and pushes changes directly, completing in seconds instead of minutes. Use full deployment for any infrastructure changes (new resources, permission updates, config changes) and always for production. Hot-swap creates drift between your CloudFormation state and actual resources, which is acceptable in dev but risky in production.

### When should I use CodeBuild deployment?

Use [`codebuild:deploy`](/cli/codebuild-deploy) when your local machine is slow for Docker builds, when building large container images, or when your CI runner has limited CPU/memory. CodeBuild runs the entire deployment in an AWS-hosted environment with more compute resources available. For simple Lambda-based stacks, local deploy is usually faster because it avoids the overhead of uploading your project and starting a CodeBuild environment.

### What is CloudFormation drift and should I worry about it?

CloudFormation drift occurs when the actual state of AWS resources differs from what the CloudFormation template expects. Hot-swap deployments intentionally create drift by updating resources directly. Manual changes in the AWS console also cause drift. Drift doesn't break anything immediately, but the next full deploy may produce unexpected changes as CloudFormation reconciles the difference. Avoid drift in production by using only full deployments.

### Stacktape deploy vs raw CloudFormation — what's the difference?

Stacktape generates a CloudFormation template from your config but adds a complete deployment pipeline around it: code packaging, artifact management, container builds, secret management, automatic CDN invalidation, and hosting bucket syncing. With raw CloudFormation, you manage all of these yourself. Stacktape also provides hot-swap for fast code iteration and [CodeBuild offloading](/cli/codebuild-deploy) for remote builds.

### How do I deploy from a CI/CD pipeline?

Set the `STACKTAPE_API_KEY` environment variable in your CI runner and pass `--autoConfirmOperation` to skip interactive prompts. Install Stacktape in your pipeline, then run `stacktape deploy`. See [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) for GitHub Actions, GitLab CI, and other integration examples. For push-to-deploy without maintaining your own pipeline, use [GitOps with Console](/ci-cd-and-gitops/gitops-with-console).

### Does AWS CloudFormation charge for deployments?

AWS CloudFormation itself has no additional charge for managing standard AWS resources — you pay only for the underlying resources your stack creates (Lambda invocations, ECS tasks, RDS instances, etc.). CloudFormation charges apply only when using third-party resource types or certain advanced features like Hook operations. For most Stacktape deployments, the CloudFormation management layer adds no extra cost.
