# Deploying Stacks

The [`stacktape deploy`](/cli/deploy) command prepares your application artifacts, generates a CloudFormation template from your configuration, uploads artifacts, and asks CloudFormation to create or update the stack. Each stage of a project maps to one CloudFormation stack in your AWS account. When auto-rollback is enabled (the default), CloudFormation reverts failed updates and Stacktape cleans up rolled-back deployment artifacts.

## How deployment works

A Stacktape deployment runs through several phases: configuration validation, workload packaging, artifact upload, CloudFormation stack creation or update, and post-deploy tasks like hosting bucket syncs and CDN cache invalidations. Understanding these phases helps you interpret the deploy output, diagnose slow deployments, and know where to look when something fails.


## Flow
1. **Validate & prepare**: Parse config, check guardrails, create missing secrets and SSM parameters
2. **Package & prepare template**: Bundle Lambda code, build container images, resolve resources, prepare CloudFormation template
3. **Plan & protect**: Fingerprint the final target, template, workload builds, and protected-resource risks
4. **Upload**: Upload packaged artifacts to S3, push container images to ECR
5. **Deploy**: Create or update the CloudFormation stack, or update changed code directly
6. **Post-deploy**: Run afterDeploy hooks, sync hosting buckets, invalidate CDN caches, send notifications


### Validate and prepare

Stacktape parses and validates your configuration, then checks any [guardrails](/guardrails/overview) configured for your organization. If your config references [secrets](/configuration/secrets) via `$Secret()` that don't exist yet, the CLI prompts you to create them. Missing SSM parameters are handled the same way.

### Package and prepare template

Stacktape packages your workloads in parallel. [Lambda functions](/resources/compute/lambda-function) are bundled, while [container workloads](/resources/compute/web-service) build OCI images from your source or Dockerfile. After packaging, Stacktape resolves configured resources and prepares the CloudFormation template used for the deployment.

### Upload

Stacktape uploads packaged artifacts to an S3 deployment bucket and pushes container images to ECR repositories.

### Deploy

For new stacks, Stacktape creates the CloudFormation stack. For existing stacks, Stacktape submits the updated template and CloudFormation determines which resources need to be created, updated, or deleted. CloudFormation handles dependency ordering and parallelizes independent resource operations. When only code changed, Stacktape updates the changed Lambda functions and container workloads directly through the AWS APIs instead (see [Fast deployments](#fast-deployments)).

An update is finished once the new resources are in place. Resources the update removed or replaced, such as a CDN distribution or a database you took out of the config, are then deleted by CloudFormation in the background, which can take several minutes. The CLI says when this happens. The next deploy, delete or rollback of the stage waits until the deletion has finished. The first of them to see an old resource AWS could not delete reports it once, because that resource then stays in your account.

### Post-deploy

After the stack is stable, Stacktape completes several post-deployment tasks: syncing [hosting buckets](/resources/frontend/static-hosting) with your local build output, invalidating [CDN](/resources/networking/cdn) caches if needed, running any user-defined `afterDeploy` [hooks](/deployment-and-lifecycle/deployment-scripts-and-hooks) (commonly used for database migrations), saving stack info to disk if configured, and sending deployment notifications to any configured [alert channels](/observability/alert-channels). On the first deploy of a new stack, the CLI also prompts you to set up [CI/CD](/ci-cd-and-gitops/overview).

## Running a deployment

Every Stacktape deployment targets a specific stage and AWS region. The stage name identifies an isolated copy of your infrastructure — each stage maps to one CloudFormation stack — while the region determines where AWS provisions your resources. Both flags are required unless you have configured defaults with [`stacktape defaults set`](/cli/defaults-configure).

```bash
stacktape deploy --stage dev --region eu-west-1
```

A **stage** is an isolated copy of your infrastructure — typically one per environment (`dev`, `staging`, `production`) or per developer (`dev-john`). Stage names use lowercase letters, numbers and hyphens. See [Stages and environments](/configuration/stages-and-environments) for details. A **region** determines the AWS data center where your resources are created.

Stacktape looks for `stacktape.ts` (or `stacktape.yml`) in the current directory by default. Use `--config` to point to a different file.


> **Tip:** Use [`stacktape defaults set`](/cli/defaults-configure) to set a default stage, region, and AWS profile. After that, you can run `stacktape deploy` without flags during development.


### Key options

| Flag | Description |
| --- | --- |
| `--stage` (`-s`) | **(required)** Stage name — `dev`, `staging`, `production`, etc. Lowercase letters, numbers and hyphens. |
| `--region` (`-r`) | **(required)** AWS region — `eu-west-1`, `us-east-1`, etc. |
| `--config` | Path to config file. Defaults to `stacktape.ts` or `stacktape.yml`. |
| `--full` | Deploy every change through CloudFormation, even when only code changed. |
| `--yes` | Skip the confirmation prompt. Required for CI/CD pipelines. |
| `--auto-rollback` | Roll the stack back if this deployment fails, instead of keeping what it created. |
| `--no-cache` | Force fresh builds, ignoring cached artifacts. |
| `--keep-temp-files` | Keep generated CloudFormation templates for inspection. |
| `--log-level` | Set to `debug` for verbose output. |
| `--aws-account` | Connected AWS account to deploy to. |
| `--profile` (`-p`) | AWS profile. Without `--aws-account`, the deploy goes to the connected account this profile belongs to. |
| `--project` | Stacktape project name. |

For the full flag reference with all available options and short aliases, see the [`deploy` CLI reference](/cli/deploy).

## Deployment modes

Every `stacktape deploy` picks one of two modes on its own: a full deployment through CloudFormation, or a fast deployment that updates only the changed code directly. Both create a release that [`rollback`](/cli/rollback) can return to.


## Feature Comparison

| Feature | Full deploy | Fast deploy |
| --- | --- | --- |
| Can update all resource types | yes | no |
| Adds or removes resources | yes | no |
| Changes IAM, networking, config | yes | no |
| Optional automatic rollback on failure | yes | no |
| Typical duration | Minutes (varies with stack complexity) | Seconds for functions, one rolling deployment for services |
| Execution environment | Invoking CLI or Console EC2 runner | Invoking CLI or Console EC2 runner |


### Full deployment

Stacktape generates a CloudFormation template and lets CloudFormation create, update, or delete resources as needed. CloudFormation handles dependency ordering, parallelizes independent resource operations, and can roll back the entire stack if any resource fails.

```bash
stacktape deploy --stage production --region eu-west-1 --full
```

Full deploys are the only mode that can add or remove resources, change IAM permissions, update API routes, or modify resource configuration like memory and timeouts.

### Fast deployments

When only the code of functions or container services changed, `stacktape deploy` updates them directly instead of through CloudFormation. A function update takes seconds. A container service runs a normal rolling deployment, and Stacktape finishes a few seconds after the new containers are healthy and registered with the load balancer or API Gateway, while the old ones drain and shut down in the background ([details](/resources/compute/web-service#how-deploys-replace-containers)). Behind an HTTP API, give the service an `internalHealthCheck`: without one, nothing shows when the new containers are ready, so the deploy waits about 3 more minutes for the old containers to stop. Stacktape decides this on its own for every deployment, using CloudFormation whenever anything else changed. It prints the reason when it does.

A deployment uses CloudFormation when:

- the stack is new, or the template changes anything other than function code or container images built by Stacktape (configuration, environment variables, permissions, resources, external images),
- stack settings changed, such as tags or termination protection,
- a changed function uses an alias (`deployment` or provisioned concurrency) or a changed container service uses blue/green deployment,
- the stack has an `after:deploy` [deployment script](/resources/advanced/deployment-scripts), which runs through CloudFormation on every deployment,
- you pass `--full`.

A fast deployment is a release like any other: it gets the next version number, and [`rollback`](/cli/rollback) can return to it or from it. A deployment that changes nothing creates no release, even with `--full`. If some updates fail, Stacktape still finishes the others and lists which workloads run the new code. Deploying again updates the rest. The CloudFormation template is updated by the next full deployment.

## When a deployment fails

By default, a failed full deployment keeps everything it created or updated, and the next deployment continues from the failure:

- A failed **first deployment** leaves the stack in `CREATE_FAILED`. Resources that were created stay, for example a database that took several minutes. Fix the error and run `stacktape deploy` again: it updates the stack, creates only what is missing and retries what failed. To remove everything instead, run [`stacktape delete`](/cli/delete).
- A failed **update** leaves the stack in `UPDATE_FAILED`. Resources that updated successfully keep their new configuration, and the ones that failed return to their previous state. Fix the error and deploy again, or return the whole stack to the last successful deployment with [`stacktape stack recover`](/cli/cf-rollback).

The CLI prints which state the stack is in and these options when a deployment fails. A deployment over a failed stack always goes through CloudFormation, even when only code changed. When it succeeds, Stacktape removes the deployment artifacts that the failed attempts left behind.

CloudFormation can replace a resource (for example a container's task definition, which every container change replaces) only in a deployment it may roll back. Stacktape therefore handles replacements this way:

- An update of a healthy stack that replaces resources rolls back if it fails. The CLI says so before it deploys.
- When the fix for a failed deployment replaces resources that the failed deployment created (for example the task definition of a new container service that did not start), Stacktape first removes those resources and everything that depends on them, then deploys the full configuration, which creates them again. They have not served traffic yet, so this interrupts nothing. It stops instead if this would remove a database or another data store.
- When the fix would replace resources of the last successful deployment, Stacktape stops before changing anything. Run [`stacktape stack recover`](/cli/cf-rollback) (or [`stacktape delete`](/cli/delete) for a stack that was never deployed successfully), then deploy again.


> **Warning:** A failed stack can run a mix of old and new configuration. On production stacks, fix the issue and redeploy promptly, or recover the stack with [`stacktape stack recover`](/cli/cf-rollback).


### Automatic rollback

Set `deploymentConfig.autoRollback: true`, or pass `--auto-rollback` for one deployment, to have CloudFormation undo a failed deployment instead. A failed update then returns the whole stack to its previous state, and a failed first deployment deletes the new stack and the deployment bucket and image repository Stacktape created for it. Automatic rollback is on whenever `deploymentConfig.triggerRollbackOnAlarms` or `monitoringTimeAfterDeploymentInMinutes` is set, because rollback alarms need it.

When a rollback happens, Stacktape also removes the deployment artifacts of the rolled-back attempt. The exception is stack-monitoring failures: when monitoring loses track of the deployment outcome, artifacts are kept because the deployment may have succeeded.

A stack already left in `CREATE_FAILED` or `UPDATE_FAILED` can only be continued without rollback, so the next deployment over it never rolls back, even with automatic rollback turned on.

## Deployment confirmation

Every local, full CloudFormation deploy computes a versioned change plan after the final template is ready and before deployment artifacts are uploaded. The plan binds the resolved AWS account, region, project, stage, stack identity, previous and candidate semantic template digests, workload build digests, Stacktape resource-change counts, and protected stateful resources at risk. Stacktape prints a short plan ID; a successful JSONL/agent result also includes the complete `stacktape.change-plan.v1` object at `data.result.changePlan`. The plan contains target identifiers, but omits templates, resolved property values, credentials, and local paths.

Ordinary creates and updates continue without an extra confirmation. Stacktape asks you to confirm only when the final local diff shows that a protected stateful resource—such as a database, DynamoDB table, S3 bucket, user pool, OpenSearch domain, or EFS file system—will be destroyed or replaced.

The default deploy path still submits the template directly to CloudFormation; creating the local plan adds no AWS change-set request and no second packaging pass. Use [`stacktape diff`](/cli/diff) when you want AWS's property-level replacement assessment before deploying. Its plan records `aws-change-set` as its evidence source; the faster deploy plan records `local-template-diff`.

In non-interactive CI/CD, explicitly skip the protected-resource confirmation with `--yes`:

```bash
stacktape deploy --stage production --region eu-west-1 --yes
```


> **Tip:** Pass `--yes` only in a pipeline where deployment approval is handled outside Stacktape. Without it, a risky non-interactive deployment fails closed instead of waiting for input.


> **Info:** The plan ID is a same-invocation audit fingerprint of semantic templates, workload build inputs, target identity, and the displayed Stacktape resource changes. It is not a checksum of uploaded bytes, a signature, or a reusable cross-job approval token. Portable approvals, signed plans, and immutable cross-account artifact promotion are separate workflows.


Fast deployments do not emit a CloudFormation change plan because they update selected Lambda or ECS targets directly. EC2 runner deployments still use their existing launcher-level confirmation in this version; their remote execution is not yet bound to a returned plan ID.

## Previewing changes

The [`stacktape diff`](/cli/diff) command generates the CloudFormation template and computes the diff against the currently deployed stack without updating your application resources. It can create missing secret/parameter inputs, upload a preview template, and create a temporary CloudFormation change set. Use it to verify that your config changes produce the expected infrastructure changes before committing to a deploy.

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
| `CREATE_FAILED` | First deployment failed; created resources were kept | Fix and redeploy, or delete |
| `UPDATE_FAILED` | Update failed; updated resources were kept | Fix and redeploy, or [recover with `stack recover`](/cli/cf-rollback) |
| `ROLLBACK_COMPLETE` | First deployment failed and was rolled back | Delete the stack and try again |
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

- **Large container images** — Use multi-stage Docker builds or [`js-bundle` packaging](/packaging/containers/js-bundle) for Node.js services to reduce image size.
- **Many resources** — CloudFormation serializes dependent resources. This is expected for complex stacks.
- **Slow local builds** — Use a machine with more CPU and memory, improve package and Docker caching, or use Console GitOps with its [dedicated EC2 runner](/ci-cd-and-gitops/build-runners).
- **First deploy of a stage** — Stacktape creates the stage's deployment bucket and ECR repository directly while your workloads build (a few seconds), then creates the whole stack in one CloudFormation operation after the upload. For a new CDN, it also looks up the default domain certificate and creates the version of Stacktape's edge functions (URL normalization, single-page-app rewrites) in us-east-1 during the build, so CloudFormation starts the distribution without waiting for them.

Run with `--debug` to see detailed timing for each phase.

### Secrets prompt blocking CI/CD

If your config references `$Secret()` values that don't exist, the CLI prompts you to create them interactively. In CI/CD, this causes the deploy to hang. Create secrets before deploying using [`secret set`](/cli/secret-set) or the [Stacktape Console](/configuration/secrets):

```bash
stacktape secret set --name mySecret --stage production --region eu-west-1
```

## FAQ

### How long does a Stacktape deployment take?

Deployment duration depends on the number and type of resources in your stack, the size of your build artifacts, and how many container images need to be built and pushed. Simple stacks deploy faster than stacks with databases, container workloads, and networking. Fast deployments of code-only function changes complete in seconds. The packaging and upload phases scale with your codebase size and number of container images.

### What happens if a CloudFormation deployment fails midway?

By default, the stack keeps what the deployment created or updated and stays in `CREATE_FAILED` or `UPDATE_FAILED`. Fix the error and deploy again to continue from the failure. With [automatic rollback](#automatic-rollback), CloudFormation instead reverts the entire stack to its previous working state, and Stacktape cleans up the deployment artifacts of the rolled-back attempt. See [Rollbacks](/deployment-and-lifecycle/rollbacks) for manual rollback options.

### Can I deploy multiple stages from the same config?

Yes. The same `stacktape.ts` config produces independent stacks per stage. Deploy with `--stage dev` and `--stage production` from the same config, and they create separate AWS resources with no shared state. Use [directives](/configuration/directives) like `$Stage()` inside your config to vary behavior per stage — for example, smaller instances in dev and larger ones in production.

### Do I have to choose between a fast and a full deployment?

No. `stacktape deploy` updates code directly when only code changed and uses CloudFormation for everything else. Pass `--full` to always use CloudFormation.

### Do fast deployments cause CloudFormation drift?

Briefly. After a fast deployment, the functions and services it updated run code the CloudFormation template does not reference yet. The next full deployment brings the template up to date. [`rollback`](/cli/rollback) restores a release's exact code either way.
