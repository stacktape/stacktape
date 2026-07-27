# Deploying Stacks

The [`stacktape deploy`](/cli/deploy) command prepares your application artifacts, generates a CloudFormation template from your configuration, uploads artifacts, and asks CloudFormation to create or update the stack. Each stage of a project maps to one CloudFormation stack in your AWS account. When auto-rollback is enabled (the default), CloudFormation reverts failed updates and Stacktape cleans up rolled-back deployment artifacts.

## How deployment works

A Stacktape deployment runs through several phases: configuration validation, workload packaging, artifact upload, CloudFormation stack creation or update, and post-deploy tasks like hosting bucket syncs and CDN cache invalidations. Understanding these phases helps you interpret the deploy output, diagnose slow deployments, and know where to look when something fails.


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

For new stacks, Stacktape creates the CloudFormation stack. For existing stacks, Stacktape submits the updated template and CloudFormation determines which resources need to be created, updated, or deleted. CloudFormation handles dependency ordering and parallelizes independent resource operations. When the `--hotSwap` flag is used and the template diff is eligible, Stacktape bypasses CloudFormation and updates eligible Lambda functions and container workloads directly via the AWS APIs.

### Post-deploy

After the stack is stable, Stacktape completes several post-deployment tasks: syncing [hosting buckets](/resources/frontend/static-hosting) with your local build output, invalidating [CDN](/resources/networking/cdn) caches if needed, running any user-defined `afterDeploy` [hooks](/deployment-and-lifecycle/deployment-scripts-and-hooks) (commonly used for database migrations), saving stack info to disk if configured, and sending deployment notifications to any configured [alert channels](/observability/alert-channels). On the first deploy of a new stack, the CLI also prompts you to set up [CI/CD](/ci-cd-and-gitops/overview).

## Running a deployment

Every Stacktape deployment targets a specific stage and AWS region. The stage name identifies an isolated copy of your infrastructure — each stage maps to one CloudFormation stack — while the region determines where AWS provisions your resources. Both flags are required unless you have configured defaults with [`stacktape defaults:configure`](/cli/defaults-configure).

```bash
stacktape deploy --stage dev --region eu-west-1
```

A **stage** is an isolated copy of your infrastructure — typically one per environment (`dev`, `staging`, `production`) or per developer (`dev-john`). Stage names are limited to 12 characters. See [Stages and environments](/configuration/stages-and-environments) for details. A **region** determines the AWS data center where your resources are created.

Stacktape looks for `stacktape.ts` (or `stacktape.yml`) in the current directory by default. Use `--configPath` to point to a different file.


> **Tip:** Use [`stacktape defaults:configure`](/cli/defaults-configure) to set a default stage, region, and AWS profile. After that, you can run `stacktape deploy` without flags during development.


### Key options

| Flag | Description |
| --- | --- |
| `--stage` (`-s`) | **(required)** Stage name — `dev`, `staging`, `production`, etc. Max 12 characters. |
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

Stacktape supports three deployment modes: full deployment through CloudFormation, hot-swap for rapid code iteration, and CodeBuild deployment for offloading builds to AWS. Most teams use full deployment for production and staging where infrastructure consistency matters, and hot-swap during development for faster code iterations.


## Feature Comparison

| Feature | Full deploy | Hot-swap | CodeBuild deploy |
| --- | --- | --- | --- |
| Can update all resource types | yes | no | yes |
| Adds or removes resources | yes | no | yes |
| Changes IAM, networking, config | yes | no | yes |
| Automatic rollback on failure | yes | no | yes |
| Typical duration | Minutes (varies with stack complexity) | Seconds | Minutes (includes upload and build overhead) |
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

Hot-swap is only available for **updates to existing stacks**. The first deployment of a new stage always runs a full deploy regardless of the flag. Eligibility is determined by the overall CloudFormation template diff — if any non-hot-swappable changes are detected (new resources, permission changes, configuration changes beyond container definitions), the entire deployment falls back to a full CloudFormation deploy.

For Lambda functions, hot-swap updates the deployed function code. Eligible Lambda types include user-defined functions, deployment script functions, custom resource definition functions, and SSR server functions (Next.js, Astro, Nuxt, SvelteKit, SolidStart, TanStack, Remix). [Edge Lambda functions](/resources/compute/edge-function) are not eligible for hot-swap. For container workloads, hot-swap updates the container definitions — including images, environment variables, health checks, secrets, and port mappings — but only when no other task-definition properties (memory, CPU, volumes) have changed. Changes to infrastructure, IAM permissions, API routes, and resource-level configuration always require a full deployment.


> **Warning:** Hot-swap updates resources outside of CloudFormation, which creates drift between the CloudFormation template and actual infrastructure. Use hot-swap only for development stages. Always use full deployment for production.


### CodeBuild deployment

For large container builds, monorepos, or machines with limited resources, offload the entire build and deploy process to [AWS CodeBuild](/ci-cd-and-gitops/build-runners):

```bash
stacktape deploy --runner codebuild --stage production --region eu-west-1
```

CodeBuild deployment uploads your project to S3 and starts a CodeBuild build that runs the full deployment inside your AWS account. This is useful when local Docker builds are slow or your CI runner is underpowered.

For simple Lambda-based stacks, local deploy is usually faster because it avoids the overhead of uploading your project and starting a CodeBuild environment. CodeBuild deployment shines for container-heavy stacks and monorepos with multiple images to build.

See the [`deploy --runner codebuild` CLI reference](/cli/deploy) for available options.

## Automatic rollback

By default, Stacktape enables CloudFormation auto-rollback. If any resource fails during a full deployment, CloudFormation reverts the entire stack to its previous state. When auto-rollback is enabled, Stacktape also cleans up deployment artifacts from the rolled-back deployment so you don't accumulate orphaned build artifacts. The exception is stack-monitoring failures — when monitoring loses track of the deployment outcome, artifacts are preserved because the deployment may have actually succeeded.

For new stacks that fail on first creation, CloudFormation rolls back and deletes provisioned resources, leaving the stack in a `ROLLBACK_COMPLETE` state. You must delete this empty stack before deploying again — see the [troubleshooting section](#stack-is-in-rollback_complete-state) below.

### Debugging failed deployments

To inspect a failed deployment before it rolls back, disable auto-rollback:

```bash
stacktape deploy --stage dev --region eu-west-1 --disableAutoRollback
```

If a stack is left in `UPDATE_FAILED` state after a failed update, Stacktape includes cleanup logic that runs when you successfully deploy over that state. Inspect CloudFormation events in the AWS console to diagnose the issue, fix the problem in your config, then deploy again. You can also recover the stack with [`stacktape cf:rollback`](/cli/cf-rollback).


> **Warning:** Don't leave production stacks in a failed state. Fix the issue and redeploy promptly, or recover the stack with [`stacktape cf:rollback`](/cli/cf-rollback).


## Deployment confirmation

Before modifying an existing stack, Stacktape computes the CloudFormation template diff and prompts you to confirm before proceeding. The confirmation shows which resources will be created, updated, replaced, or deleted, helping you catch potentially destructive changes before they reach your AWS account. Skip the prompt in non-interactive environments with `--autoConfirmOperation`:

```bash
stacktape deploy --stage production --region eu-west-1 --autoConfirmOperation
```


> **Tip:** Always pass `--autoConfirmOperation` in CI/CD pipelines. Without it, the deploy command hangs waiting for input.


## Previewing changes

The [`stacktape diff`](/cli/diff) command generates the CloudFormation template and computes the diff against the currently deployed stack without modifying anything. Use it to verify that your config changes produce the expected infrastructure changes before committing to a deploy.

```bash
stacktape diff --stage dev --region eu-west-1
```

See [Previewing changes](/deployment-and-lifecycle/previewing-changes) for details.

## CloudFormation stack states

Every Stacktape stage maps to one AWS CloudFormation stack, and each stack has a state that determines what operations are available. States like `CREATE_COMPLETE` and `UPDATE_COMPLETE` indicate a healthy stack ready for updates or deletion, while states like `ROLLBACK_COMPLETE` or `UPDATE_FAILED` require specific recovery steps before you can deploy again.

| State | Meaning | What you can do |
| --- | --- | --- |
| `CREATE_COMPLETE` | Stack created and healthy | Deploy updates, delete |
| `UPDATE_COMPLETE` | Last update succeeded | Deploy updates, delete |
| `UPDATE_ROLLBACK_COMPLETE` | Last update failed and rolled back | Deploy again (fix the issue first), delete |
| `UPDATE_FAILED` | Update failed, auto-rollback was disabled | Fix and redeploy, or [recover with `cf:rollback`](/cli/cf-rollback) |
| `ROLLBACK_COMPLETE` | Initial creation failed and rolled back | Delete the stack and try again |
| `*_IN_PROGRESS` | Operation running | Wait for it to finish |
| `DELETE_COMPLETE` | Stack deleted | Deploy to create a new stack |

## Deploying from the Stacktape Console

The [Stacktape Console](/stacktape-console/console-overview) provides a GitOps workflow for automated deployments — connect your Git repository, map branches to stages, and deployments trigger on push. The Console also supports preview environments for pull requests. See [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) for supported Git providers, setup instructions, and configuration details.

For teams that already have their own CI/CD system, you can run `stacktape deploy` directly inside your pipeline. See [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) for authentication setup and integration examples.

## Dev mode and deployment

Dev mode ([`stacktape dev`](/cli/dev)) creates a special stack type for rapid local iteration. Stacktape prevents `stacktape deploy` from targeting a stage that already has a dev-mode stack, since the two modes manage infrastructure differently. Use separate stage names for dev mode and deployed stacks.

Run dev mode on its own stage:

```bash
stacktape dev --stage dev-local --region eu-west-1
```

Then deploy to a separate stage:

```bash
stacktape deploy --stage dev --region eu-west-1
```

## Troubleshooting

### Stack is in ROLLBACK_COMPLETE state

A `ROLLBACK_COMPLETE` state means the initial stack creation failed and CloudFormation rolled back all provisioned resources. The stack itself is an empty shell that blocks the name. Delete it first:

```bash
stacktape delete --stage dev --region eu-west-1
```

Once the delete completes, deploy again:

```bash
stacktape deploy --stage dev --region eu-west-1
```

### Stack name too long

The CloudFormation stack name is derived from your project name and stage. If the project+stage stack name is too long, Stacktape warns that some resource names will be obfuscated. This doesn't affect functionality, but resource names in the AWS console become less readable. Keep project and stage names short when readable AWS resource names matter.

### No changes to deploy

CloudFormation detected that your template matches the currently deployed stack. Verify that you saved your config file, that you're deploying the right stage, and that your changes affect Stacktape-managed resources. Changes to raw [CloudFormation overrides](/configuration/overrides-and-escape-hatches) follow the same template-based diff logic.

### Deployment is slow

Common causes of slow Stacktape deployments:

- **Large container images** — Use multi-stage Docker builds or [Stacktape buildpack packaging](/packaging/containers/stacktape-buildpack) to reduce image size.
- **Many resources** — CloudFormation serializes dependent resources. This is expected for complex stacks.
- **Slow local builds** — Consider [`deploy --runner codebuild`](/cli/deploy) to offload builds to AWS.
- **First deploy to a new region** — Initial infrastructure setup (S3 deployment bucket, ECR repositories) adds one-time overhead.

Run with `--logLevel debug` to see detailed timing for each phase.

### Secrets prompt blocking CI/CD

If your config references `$Secret()` values that don't exist, the CLI prompts you to create them interactively. In CI/CD, this causes the deploy to hang. Create secrets before deploying using [`secret:set`](/cli/secret-set) or the [Stacktape Console](/configuration/secrets):

```bash
stacktape secret:set --name mySecret --stage production --region eu-west-1
```

## FAQ

### How long does a Stacktape deployment take?

Deployment duration depends on the number and type of resources in your stack, the size of your build artifacts, and how many container images need to be built and pushed. Simple stacks deploy faster than stacks with databases, container workloads, and networking. Hot-swap deployments for code-only changes complete in seconds. The packaging and upload phases scale with your codebase size and number of container images.

### What happens if a CloudFormation deployment fails midway?

When auto-rollback is enabled (the default), CloudFormation reverts the entire stack to its previous working state. Resources that were partially created are deleted, and modified resources are reverted. Stacktape also cleans up deployment artifacts from the rolled-back attempt. You can disable auto-rollback with `--disableAutoRollback` to keep the failed state for inspection. See [Rollbacks](/deployment-and-lifecycle/rollbacks) for manual rollback options.

### Can I deploy multiple stages from the same config?

Yes. The same `stacktape.ts` config produces independent stacks per stage. Deploy with `--stage dev` and `--stage production` from the same config, and they create separate AWS resources with no shared state. Use [directives](/configuration/directives) like `$Stage()` inside your config to vary behavior per stage — for example, smaller instances in dev and larger ones in production.

### Should I use hot-swap or full deployment?

Use hot-swap (`--hotSwap`) when iterating on Lambda or container code during development. It bypasses CloudFormation and pushes changes directly, completing in seconds instead of minutes. Use full deployment for any infrastructure changes (new resources, permission updates, config changes) and always for production. Hot-swap creates drift between your CloudFormation state and actual resources, which is acceptable in dev but risky in production.

### When should I use CodeBuild deployment?

Use [`deploy --runner codebuild`](/cli/deploy) when your local machine is slow for Docker builds, when building large container images, or when your CI runner has limited CPU/memory. CodeBuild runs the entire deployment in an AWS-hosted build environment, which can be useful when local or CI resources are constrained. For simple Lambda-based stacks, local deploy is usually faster because it avoids the overhead of uploading your project and starting a CodeBuild environment.

### Does hot-swap cause CloudFormation drift, and should I worry about it?

Yes. Because hot-swap updates Lambda code and container definitions directly through the AWS APIs instead of CloudFormation, the deployed resources no longer match what the template expects — this is drift. It's harmless in development, but the next full deploy reconciles the difference and may produce unexpected changes. That's why hot-swap is for dev stages only; always use full deployment for production.
