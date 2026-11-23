# Deploying stacks

[`stacktape deploy`](/cli/deploy) builds your code, turns your config into a CloudFormation template and creates or updates the stack in your AWS account. Each stage of a project is one CloudFormation stack. When only code changed, the deploy updates the changed functions and containers directly, which takes seconds instead of minutes.

A deploy that fails keeps what it already created. Fix the error and deploy again; it continues from where it stopped. See [When a deployment fails](#when-a-deployment-fails).

## Run a deploy

```bash
stacktape deploy --stage dev --region eu-west-1
```

The CLI reads the config file in the current directory: `stacktape.ts`, `stacktape.yml`, `stacktape.yaml` or `stacktape.js`. If there is more than one, or the file is elsewhere, pass `--config`. When the config declares `projectName` and `region`, as the one [`stacktape init`](/cli/init) writes does, `--stage` is enough:

```bash
stacktape deploy --stage dev
```

Flags override the config. The region can also come from `AWS_DEFAULT_REGION`, from a default saved with [`stacktape defaults set`](/cli/defaults-set), or from your AWS profile. A stage name has at least two characters: lowercase letters, numbers and hyphens. See [Stages and environments](/configuration/stages-and-environments).

| Flag | What it does |
| --- | --- |
| `--stage`, `-s` | The stage to deploy. Each stage is its own stack. |
| `--region`, `-r` | The AWS region. |
| `--config`, `-c` | Path to the config file. |
| `--full` | Deploy through CloudFormation even when only code changed. |
| `--yes`, `-y` | Confirm deleting or replacing a database or another data store without asking. |
| `--auto-rollback` | Roll the stack back if this deploy fails, instead of keeping what it created. |
| `--no-cache` | Build everything again, ignoring cached artifacts. |
| `--skip-release-command` | Do not run [release commands](/deployment-and-lifecycle/release-commands) in this deploy. |
| `--profile`, `-p` | The AWS profile to use. |

The [`deploy` reference](/cli/deploy) lists every option.

## What a deploy does


## Flow
1. **Validate**: Read the config, check guardrails, ask for missing secrets and SSM parameters.
2. **Package**: Bundle functions and build container images, in parallel.
3. **Upload**: Upload artifacts to the stage’s S3 bucket and images to ECR.
4. **Release command**: Run due release commands, such as database migrations.
5. **Deploy**: Update changed code directly, or create or update the stack through CloudFormation.
6. **Post-deploy**: Sync hosting buckets, invalidate CDN caches, run afterDeploy hooks, print URLs.


**Validate.** The CLI checks the config and any [guardrails](/guardrails/overview) of your organization. When the config references a [secret](/configuration/secrets) or SSM parameter that does not exist in the region, an interactive terminal asks for its value. A pipeline or a coding agent fails instead and names the missing values. Database passwords referenced with `$Secret()` can be generated for you.

**Package and upload.** [Lambda functions](/resources/compute/lambda-function) are bundled and [container workloads](/resources/compute/web-service) build images from your source or Dockerfile. Unchanged artifacts come from the cache. See [Packaging](/packaging/overview).

**Release command.** A [release command](/deployment-and-lifecycle/release-commands) runs before services get the new code, on fast and full deploys, when its inputs changed. A failed command stops the deploy.

**Deploy.** For a new stage, CloudFormation creates the stack. For an existing one, it works out what to create, update or delete and runs independent changes in parallel. An update is finished once the new resources are in place. Resources the update removed or replaced, such as a CDN distribution, are then deleted in the background, which can take several minutes. The next deploy, delete or rollback of the stage waits for that. If AWS could not delete an old resource, the next operation reports it once, because the resource then stays in your account.

**Post-deploy.** Stacktape syncs [hosting buckets](/resources/frontend/static-hosting), invalidates [CDN](/resources/networking/cdn) caches, runs your `afterDeploy` [hooks](/configuration/hooks-and-scripts), sends notifications to [alert channels](/observability/alert-channels) and prints the URLs of your resources. After the first deploy of a stage, a signed-in terminal inside a Git repository offers to set up [Git deployments](/ci-cd-and-gitops/gitops-with-console).

Before a CloudFormation deploy, the CLI prints how many resources it will create, update, replace and delete. It asks for confirmation only when the deploy would delete or replace a database, DynamoDB table, S3 bucket, user pool, OpenSearch domain or EFS file system. A run that cannot ask (a pipeline, a coding agent) stops there unless you pass `--yes`. Use `--yes` only where someone already approves deploys outside Stacktape. To see AWS's property-level view before you deploy, run [`stacktape diff`](/deployment-and-lifecycle/previewing-changes).

## Fast deployments

Every `stacktape deploy` picks the mode itself and prints why when it uses CloudFormation.

- **Fast deploy.** Only the code of functions or container services changed. A function update takes seconds. A container service runs a normal rolling deployment and the CLI finishes a few seconds after the new containers are healthy and registered with the load balancer or API Gateway. The old containers drain in the background ([how containers are replaced](/resources/compute/web-service#how-deploys-replace-containers)).
- **Full deploy.** Everything else goes through CloudFormation: new or removed resources, configuration, environment variables, permissions, routes.

A deploy uses CloudFormation when:

- the stack is new, or the template changes anything other than function code or container images built by Stacktape,
- stack settings changed, such as tags or termination protection,
- a changed function uses an alias (`deployment` or provisioned concurrency), or a changed container service uses blue/green deployment,
- the stack has an `after:deploy` [deployment script](/resources/advanced/deployment-scripts), which runs through CloudFormation on every deploy,
- the last deploy failed and left the stack in `CREATE_FAILED` or `UPDATE_FAILED`,
- you pass `--full`.

A web service behind an HTTP API Gateway without an `internalHealthCheck` gives the fast deploy no health signal. The CLI then finishes once the new containers run and API Gateway can find them, and says that application health is unchecked. Add an [`internalHealthCheck`](/resources/compute/web-service) if you want the deploy to wait for a healthy app.

Both modes create a release that [`stacktape rollback`](/deployment-and-lifecycle/rollbacks) can return to. A deploy that changes nothing creates no release, even with `--full`. If some fast updates fail, Stacktape still finishes the others and lists which workloads run the new code; deploying again updates the rest. After a fast deploy, the CloudFormation template still references the previous code until the next full deploy. Rollback restores the exact code of a release either way.

## When a deployment fails

By default, a failed deploy keeps everything it created or updated, and the next deploy continues from the failure. The CLI prints the stack state and what you can do.

| What failed | State | What to do |
| --- | --- | --- |
| The first deploy of a stage | `CREATE_FAILED` | Fix the error and deploy again. It creates what is missing and retries what failed; resources that already exist, such as a database, stay. To remove everything instead, run [`stacktape delete`](/cli/delete). |
| An update | `UPDATE_FAILED` | Fix the error and deploy again. Or return the whole stack to the last successful deploy with [`stacktape stack recover`](/cli/stack-recover). |
| The deploy succeeded but the app is broken | `UPDATE_COMPLETE` | Return to an earlier release with [`stacktape rollback`](/deployment-and-lifecycle/rollbacks), or deploy a fix. |

After a failed update, the resources that updated keep their new configuration and the ones that failed return to their previous state. The stack can run a mix of old and new configuration, so fix a failed production deploy promptly or recover it. When the next deploy succeeds, Stacktape removes the artifacts the failed attempts left behind.

### Resources that must be replaced

CloudFormation can replace a resource (for example a container's task definition, which every container change replaces) only in a deploy that it may roll back. Stacktape handles this for you:

- An update of a healthy stack that replaces resources rolls back if it fails. The CLI says so before it deploys.
- When the fix for a failed deploy replaces resources that the failed deploy created, such as the task definition of a new service that never started, Stacktape removes them and what depends on them, then deploys the full config, which creates them again. They never served traffic, so nothing is interrupted. It stops instead if this would remove a database or another data store.
- When the fix would replace resources of the last successful deploy, Stacktape stops before changing anything. Run [`stacktape stack recover`](/cli/stack-recover) (or [`stacktape delete`](/cli/delete) for a stage that never deployed successfully), then deploy again.

### Automatic rollback

Set `deploymentConfig.autoRollback: true`, or pass `--auto-rollback` for one deploy, to have CloudFormation undo a failed deploy instead. A failed update then returns the whole stack to its previous state. A failed first deploy deletes the new stack together with the deployment bucket and image repository Stacktape created for it, so the next attempt starts from nothing. Automatic rollback is always on when `deploymentConfig.triggerRollbackOnAlarms` or `monitoringTimeAfterDeploymentInMinutes` is set, because rollback alarms need it. [`stacktape dev`](/local-development/dev-mode-overview) rolls back by default.

A stack already in `CREATE_FAILED` or `UPDATE_FAILED` can only be continued without rollback, so the deploy that continues it never rolls back.

## Dev mode and deploy

[`stacktape dev`](/local-development/dev-mode-overview) creates its own kind of stack, and `stacktape deploy` refuses a stage that has one. Use separate stage names:

```bash
stacktape dev --stage local
```

```bash
stacktape deploy --stage dev
```

## Deploy from Git

To deploy on every push without writing a pipeline, use [Git deployments](/ci-cd-and-gitops/gitops-with-console) in the Stacktape Console. To run `stacktape deploy` in your own pipeline, see [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd). The [CI/CD overview](/ci-cd-and-gitops/overview) compares the two.

## Stack states

| State | Meaning | What you can do |
| --- | --- | --- |
| `CREATE_COMPLETE`, `UPDATE_COMPLETE` | The last deploy succeeded | Deploy, delete |
| `CREATE_FAILED` | The first deploy failed and kept what it created | Fix and deploy again, or delete |
| `UPDATE_FAILED` | An update failed and kept what it updated | Fix and deploy again, or [`stack recover`](/cli/stack-recover) |
| `UPDATE_ROLLBACK_COMPLETE` | An update failed and rolled back | Fix and deploy again, delete |
| `ROLLBACK_COMPLETE` | The first deploy failed and rolled back | Delete, then deploy again |
| `*_IN_PROGRESS` | An operation is running | Wait for it to finish |

## Troubleshooting

### Stack is in ROLLBACK_COMPLETE

The first deploy failed with automatic rollback on, and CloudFormation removed everything it created. The empty stack still holds the name. Delete it, then deploy again:

```bash
stacktape delete --stage dev
```

```bash
stacktape deploy --stage dev
```

### Stack name too long

The stack name is the project name, a dash and the stage. CloudFormation allows at most 128 characters, and the CLI refuses a longer name before it deploys; the error says how long the stage can be. Shorten generated stage names in CI, for example by trimming the branch name. A name under that limit can still be too long for some AWS resource names. Stacktape then shortens those names with a hash and prints a warning. Everything works the same; only the names in the AWS console are harder to read.

### Missing secrets fail the deploy in CI

A pipeline cannot answer the prompt for a missing secret, so the deploy fails and lists the secrets it needs. Create each one once in the region you deploy to, then run the pipeline again:

```bash
stacktape secret set my-api-key --region eu-west-1
```

The command asks for the value without echoing it. For a script, pass `--value` or `--file`; see [`secret set`](/cli/secret-set).

### No changes to deploy

The template and code match what is deployed. Check that you saved the config, that you deploy the right stage and region, and that your change touches something Stacktape deploys.

### Deploys are slow

- **Large container images.** Use a multi-stage [Dockerfile](/packaging/containers/dockerfile) or [`js-bundle`](/packaging/containers/js-bundle) packaging for Node.js services.
- **Many resources.** CloudFormation creates dependent resources one after another. A new database or CDN takes several minutes.
- **Slow local builds.** Use a machine with more CPU and memory, or deploy from the Console's [build runner](/ci-cd-and-gitops/build-runners).

Run the deploy with `--log-level debug` to see how long each phase takes.
