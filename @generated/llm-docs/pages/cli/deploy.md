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
4. **Deploy** — Creates or updates a CloudFormation stack. Resources are provisioned, updated, or removed.
5. **Post-deploy** — Syncs hosting buckets, invalidates CDN caches, and prints resource URLs.

After a successful deploy, Stacktape prints short stack information and completion links, including a Stacktape Console URL for the deployed stack.

## Common flags

### `--hotSwap`

Hot-swap attempts a faster code-only deploy by updating eligible Lambda functions and container workloads (web services, private services, and worker services) directly, without CloudFormation.

```bash
stacktape deploy --stage dev --region eu-west-1 --hotSwap
```

Hot-swap is attempted for code-only changes and is used only if Stacktape determines all stack changes are hot-swappable. If not, Stacktape runs a full CloudFormation deploy.


> **Warning:** Use `--hotSwap` only on development stages. It bypasses CloudFormation's state tracking, so your stack's recorded state may drift from reality. For production, always use a full deploy.


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

### `--disableDriftDetection`

By default, Stacktape blocks updates to a stack that has drifted because resources were changed outside CloudFormation. Use `--disableDriftDetection` to skip this check and deploy anyway.

```bash
stacktape deploy --stage production --region eu-west-1 --disableDriftDetection
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
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--autoConfirmOperation (-aco)` | no | `boolean` | Auto-Confirm Operation If `true`, automatically confirms prompts during `deploy` or `delete` operations, skipping the manual confirmation step. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--disableAutoRollback (-dar)` | no | `boolean` | Disable Auto-Rollback If `true`, disables automatic rollback on deployment failure. **With auto-rollback (default):** If a deployment fails, the stack is automatically rolled back to the last known good state. **Without auto-rollback:** If a deployment fails, the stack remains in the `UPDATE_FAILED` state. You can then either fix the issues and redeploy or manually roll back using the `stacktape rollback` command. | - |
| `--disableDockerRemoteCache (-drc)` | no | `boolean` | Disable Docker Remote Cache Disables Docker layer caching using ECR as remote cache storage. By default, remote caching is enabled to speed up Docker builds by reusing layers. Set to `true` to disable remote caching. | - |
| `--disableDriftDetection (-ddd)` | no | `boolean` | Disable Drift Detection Disables detection of manual changes (drift) made to the stack outside of CloudFormation (e.g., via the AWS console or CLI). By default, Stacktape blocks updates to a stack that has drifted. | - |
| `--disableLayerOptimization (-dlo)` | no | `boolean` | Disable Layer Optimization If `true`, disables the shared Lambda layer optimization. By default, Stacktape extracts shared code into Lambda layers to reduce deployment size. Use this flag to bundle all code directly into each Lambda function. | - |
| `--dockerArgs (-da)` | no | `array` | Docker Arguments Additional arguments to pass to the `docker run` or `docker build` commands. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--hotSwap (-hs)` | no | `boolean` | Hotswap If `true`, attempts a faster deployment for code-only changes by updating `functions` and `multi-container-workloads` directly, without using CloudFormation. This is recommended only for development stacks. Hotswap will only be used if all stack changes are hot-swappable. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--noCache (-nc)` | no | `boolean` | No Cache If `true`, disables the use of cached artifacts and forces a fresh build of compute resources. | - |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--preserveTempFiles (-ptf)` | no | `boolean` | Preserve Temporary Files If `true`, preserves the temporary files generated by the operation, such as the CloudFormation template and packaged resources. These files are saved to `.stacktape/[invocation-id]`. | - |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--showSensitiveValues (-ssv)` | no | `boolean` | Show Sensitive Values If `true`, includes sensitive values in the output of the `info:stack` and `deploy` commands. Be cautious when using this flag, as mishandling sensitive data can create security risks. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Examples

### Deploy a new production stage

```bash
stacktape deploy --stage production --region us-east-1
```

### Deploy with a specific AWS profile and project

```bash
stacktape deploy --stage staging --region eu-west-1 --profile my-aws-profile --projectName my-app
```

### Fast deploy for development

```bash
stacktape deploy --stage dev --region eu-west-1 --hotSwap
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

### Deploy with a remote build environment

For resource-intensive projects, use [`deploy --runner codebuild`](/cli/deploy) to offload the deployment process to AWS CodeBuild in your AWS account:

```bash
stacktape deploy --runner codebuild --stage production --region us-east-1
```

## Dev stacks cannot be deployed

Stages created by [`stacktape dev`](/cli/dev) (dev stacks) cannot be updated with `deploy`. If you attempt this, Stacktape rejects the deploy with an error. To deploy a production stack, use a different stage name (e.g., `--stage production`). To remove a dev stack, use [`stacktape delete`](/cli/delete).

## Related commands

| Command | Description |
|---|---|
| [`diff`](/cli/diff) | Shows what a deploy would change without applying anything. |
| [`deploy --runner codebuild`](/cli/deploy) | Deploys using AWS CodeBuild — offloads the deployment process to a dedicated environment in your AWS account. |
| [`rollback`](/cli/rollback) | Rolls back to a previous Stacktape deployment version. |
| [`cf:rollback`](/cli/cf-rollback) | Recovers a CloudFormation stack stuck in `UPDATE_FAILED` or `UPDATE_ROLLBACK_FAILED` state. |
