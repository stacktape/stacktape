# deploy

The `stacktape deploy` command deploys your stack to AWS. If the stack does not exist yet, it creates a new one. If it already exists, it updates it with the current configuration. This is the primary command for shipping changes to any stage — development, staging, or production.

## Usage

```bash
stacktape deploy --stage <stage> --region <region>
```

Both `--stage` and `--region` are required. The command requires a valid Stacktape configuration file (usually `stacktape.ts`, with `stacktape.yml` still supported) in the current directory, or a path passed with `--configPath`.

```bash
stacktape deploy --stage production --region eu-west-1 --configPath ./infra/stacktape.ts
```

## What happens during deploy

1. **Validate** — Reads your config, validates guardrails, and ensures referenced secrets exist.
2. **Build & package** — Packages workloads for deployment. Cached artifacts are reused when possible.
3. **Upload** — Uploads deployment artifacts for the stack.
4. **Deploy** — Creates or updates a CloudFormation stack. When only code changed, updates the changed functions and container services directly instead (see [Fast deployments](#fast-deployments)).
5. **Post-deploy** — Syncs hosting buckets, invalidates CDN caches, and prints resource URLs.

After a successful deploy, Stacktape prints short stack information and completion links, including a Stacktape Console URL for the deployed stack.

## Fast deployments

When only the code of functions or container services changed, `stacktape deploy` updates them directly instead of through CloudFormation. A function update takes seconds; a container service runs a normal rolling deployment. Stacktape decides this on its own for every deployment, using CloudFormation whenever anything else changed. It prints the reason when it does.

Code that several functions share is packaged into a Lambda layer. A change to it is a code change too: Stacktape publishes the new layer version itself and gives every function that uses it the new version together with its own code, so a change to shared code deploys as fast as a change to one function.

When both a handler and its shared code change, Stacktape attaches the new layer before switching the handler if the old handler can use it. This includes adding a helper and using it in the new handler. When compatibility cannot be proved, Stacktape temporarily keeps both generations available. A failed code update can leave the old handler on the new layer; deploying again completes the update.

The compatibility check protects the forward deployment. CloudFormation updates code and layers separately during a rollback, so rolling back across an edit that added a used export can briefly fail invocations if the old layer is restored before the new handler is replaced. Stacktape prints a note during the fast deployment when it detects this risk. See [rollback safety](/cli/rollback#safety-warnings).

A deployment uses CloudFormation when:

- the stack is new, or the template changes anything other than function code or container images built by Stacktape (configuration, environment variables, permissions, resources, external images),
- stack settings changed, such as tags or termination protection,
- a changed function uses an alias (`deployment` or provisioned concurrency) or a changed container service uses blue/green deployment,
- the stack has an `after:deploy` [deployment script](/resources/advanced/deployment-scripts), which runs through CloudFormation on every deployment,
- you pass `--fullDeploy`.

A fast deployment is a release like any other: it gets the next version number, and [`rollback`](/cli/rollback) can return to it or from it. A deployment that changes nothing creates no release, even with `--fullDeploy`. If some updates fail, Stacktape still finishes the others and lists which workloads run the new code. Deploying again updates the rest. The CloudFormation template is updated by the next full deployment.

## Common flags

### `--fullDeploy`

Deploys every change through CloudFormation, even when only code changed.

```bash
stacktape deploy --stage production --region eu-west-1 --fullDeploy
```

### `--autoConfirmOperation`

Skips the interactive confirmation prompt before deploying. Use `--autoConfirmOperation` in CI/CD pipelines or other non-interactive environments to avoid blocking on confirmation. The `--agent` flag also confirms operations automatically (along with switching to JSONL output).

```bash
stacktape deploy --stage production --region eu-west-1 --autoConfirmOperation
```

### `--disableAutoRollback`

By default, if a deployment fails, CloudFormation automatically rolls the stack back to its last known good state. Without auto-rollback, a failed deployment can leave the stack in `UPDATE_FAILED` state. This is useful for debugging — you can inspect the partial state, fix the issue, and redeploy without waiting for a rollback first.

```bash
stacktape deploy --stage dev --region eu-west-1 --disableAutoRollback
```

After fixing the issue, redeploy normally. To roll back to a previous deployment version after disabling auto-rollback, use [`rollback`](/cli/rollback). To recover a CloudFormation stack stuck in `UPDATE_FAILED` or `UPDATE_ROLLBACK_FAILED` state, use [`cf:rollback`](/cli/cf-rollback).

### `--noCache`

Forces a fresh build of all compute resources, ignoring cached artifacts from previous deploys. Use this when you suspect a stale cache is causing issues.

```bash
stacktape deploy --stage dev --region eu-west-1 --noCache
```

### `--configPath`

Points to a Stacktape configuration file when it is not in the default location (current directory).

```bash
stacktape deploy --stage production --region eu-west-1 --configPath ./infra/stacktape.ts
```

### `--disableLayerOptimization`

By default, Stacktape extracts shared code into Lambda layers to reduce per-function deployment size. Disable this to bundle all code directly into each Lambda function — useful if you need to inspect the full function package or if layer extraction causes issues.

### `--showSensitiveValues`

Includes sensitive values in deploy output. Handle with care.

## All flags


## CLI Options: `stacktape deploy`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. The maximum length is 12 characters. | - |
| `-y, --yes` | no | `boolean` | Auto-Confirm Operation — If `true`, automatically confirms prompts during `deploy` or `delete` operations, skipping the manual confirmation step. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--no-auto-rollback` | no | `boolean` | Disable Auto-Rollback — If `true`, disables automatic rollback on deployment failure. • **With auto-rollback (default):** If a deployment fails, the stack is automatically rolled back to the last known good state. • **Without auto-rollback:** If a deployment fails, the stack remains in the `UPDATE_FAILED` state. You can then either fix the issues and redeploy or manually roll back using the `stacktape rollback` command. | - |
| `--no-remote-cache` | no | `boolean` | Disable Docker Remote Cache — In CI, image builds for an existing stack import and export Docker's layer cache in the stack's ECR repository, so a runner without a local build cache still reuses unchanged layers. Outside CI, Docker's local build cache is used and nothing is cached in ECR. Set to `true` to build without the ECR cache in CI as well. | - |
| `--no-layer-optimization` | no | `boolean` | Disable Layer Optimization — If `true`, disables the shared Lambda layer optimization. By default, Stacktape extracts shared code into Lambda layers to reduce deployment size. Use this flag to bundle all code directly into each Lambda function. | - |
| `--docker-args` | no | `array` | Docker Arguments — Additional arguments to pass to the `docker run` or `docker build` commands. | - |
| `--full` | no | `boolean` | Full Deploy — If `true`, deploys every change through CloudFormation. By default, when only the code of `functions` and container workloads changed, Stacktape updates them directly, which takes seconds instead of minutes. Changes to infrastructure always use CloudFormation. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--no-cache` | no | `boolean` | No Cache — If `true`, disables the use of cached artifacts and forces a fresh build of compute resources. | - |
| `--keep-temp-files` | no | `boolean` | Preserve Temporary Files — If `true`, preserves the temporary files generated by the operation, such as the CloudFormation template and packaged resources. These files are saved to `.stacktape/[invocation-id]`. | - |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--runner` | no | `string` | Deploy Runner — Controls where deployment build and packaging work runs. • `local`: Run deployment locally. • `ec2`: Run deployment on a configured EC2 runner in your AWS account. | `local`, `ec2` |
| `--show-secrets` | no | `boolean` | Show Sensitive Values — If `true`, includes sensitive values in the output of commands such as `status`, `deploy`, and `param get`. Be cautious when using this flag, as mishandling sensitive data can create security risks. | - |


## Examples

### Deploy a new production stage

```bash
stacktape deploy --stage production --region us-east-1
```

### Deploy to the account of an AWS profile

The deploy goes to the connected AWS account that `my-aws-profile` belongs to. It fails if that account is not connected to your organization.

```bash
stacktape deploy --stage staging --region eu-west-1 --profile my-aws-profile --projectName my-app
```

### Deploy to a named connected account

```bash
stacktape deploy --stage production --region eu-west-1 --awsAccount production
```

### Deploy everything through CloudFormation

```bash
stacktape deploy --stage production --region eu-west-1 --fullDeploy
```

### Non-interactive deploy in CI/CD

```bash
stacktape deploy --stage production --region us-east-1 --autoConfirmOperation
```

### Preview changes before deploying

Use [`diff`](/cli/diff) to see what a deploy would modify without actually applying changes:

```bash
stacktape diff --stage production --region us-east-1
```

## Free plan cost limit

A Free organization cannot deploy once its managed AWS costs for the current calendar month (UTC) are above $100. The
deploy stops before it touches AWS with a `Free Plan Limit Reached` error that shows this month's costs, the limit and
the link to upgrade:

```text
[x] Free Plan Limit Reached

Deploys are paused. This organization is on the Free plan, and the AWS costs Stacktape manages for it are
$142.17 in October 2026 (UTC), above the plan's limit of $100 a month.
```

Upgrading to the Flexible plan lifts the limit immediately; otherwise deploys resume when the next month starts.
[`delete`](/cli/delete) and [`rollback`](/cli/rollback) keep working, and running infrastructure is not affected. See
[Free plan cost limit](/stacktape-console/billing-and-subscription#free-plan-cost-limit) for what counts.

## Dev stacks cannot be deployed

Stages created by [`stacktape dev`](/cli/dev) (dev stacks) cannot be updated with `deploy`. If you attempt this, Stacktape rejects the deploy with an error. To deploy a production stack, use a different stage name (e.g., `--stage production`). To remove a dev stack, use [`stacktape delete`](/cli/delete).

Stacktape does not currently check CloudFormation resource drift before deploying. Manual changes to stack resources can affect an update; review the proposed changes with [`diff`](/cli/diff).

## Related commands

| Command | Description |
|---|---|
| [`diff`](/cli/diff) | Shows what a deploy would change without applying anything. |
| [`rollback`](/cli/rollback) | Rolls back to a previous Stacktape deployment version. |
| [`cf:rollback`](/cli/cf-rollback) | Recovers a CloudFormation stack stuck in `UPDATE_FAILED` or `UPDATE_ROLLBACK_FAILED` state. |

For eligible Node.js Fargate web services, `properties.codeSwap: true` enables [in-place code swaps](/deployment-and-lifecycle/code-swap) with the same deploy command. The opt-in applies in every stage, including production, within the task cap. Failed memory screening or an unsupported change uses an image deploy, with the reason in CLI output. Old and new processes share memory during a swap; a sudden memory increase can fail in-flight requests.
