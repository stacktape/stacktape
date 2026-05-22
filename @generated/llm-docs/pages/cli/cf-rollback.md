# cf:rollback

The `cf:rollback` command recovers a CloudFormation stack stuck in `UPDATE_FAILED` or `UPDATE_ROLLBACK_FAILED` state by triggering CloudFormation's native rollback mechanism. Use it when a failed deployment leaves your stack unable to accept new updates.

## Usage

```bash
stacktape cf:rollback --region eu-west-1
```

Only `--region` is required. Pass `--stage`, `--projectName`, or `--configPath` when you need to target a specific stack instead of relying on configured defaults or config file discovery.

A typical invocation targeting a specific stack:

```bash
stacktape cf:rollback --region eu-west-1 --stage production --projectName my-api
```

## What it does

When a Stacktape deployment fails, CloudFormation may leave the stack in one of two broken states that prevent further updates:

- **`UPDATE_FAILED`** — a stack update failed partway through. `cf:rollback` uses CloudFormation's native rollback mechanism to return the stack to the last known good state.
- **`UPDATE_ROLLBACK_FAILED`** — a previous rollback itself failed. `cf:rollback` retries CloudFormation's native rollback path and can pass logical resource IDs through `--resourcesToSkip` for resources that cannot be restored.

After the rollback succeeds, Stacktape cleans up rolled-back deployment artifacts.


> **Info:** This command does NOT roll back to a previous deployment version. It rolls back the CloudFormation stack to the last known good state. To revert to an earlier version of your configuration, use [`rollback`](/cli/rollback) instead.


## When to use cf:rollback vs rollback

| Scenario | Command |
|----------|---------|
| Stack stuck in `UPDATE_FAILED` or `UPDATE_ROLLBACK_FAILED` | `cf:rollback` |
| Want to revert to a specific previous deployment version | [`rollback`](/cli/rollback) |
| Stack is healthy but you want to undo the last deploy | [`rollback`](/cli/rollback) |

Use `cf:rollback` as a recovery tool when your stack is broken. Use [`rollback`](/cli/rollback) as a deliberate version revert when your stack is healthy but you want to go back to an earlier configuration.

## Important flags

### --resourcesToSkip

When a rollback itself fails (`UPDATE_ROLLBACK_FAILED`), specific resources may be preventing the rollback from completing — for example, a resource that was manually deleted outside of CloudFormation or depends on an external service that changed state. Pass their logical resource IDs to skip them during the retry:

```bash
stacktape cf:rollback --region eu-west-1 --stage production --resourcesToSkip MyCustomResource AnotherBrokenResource
```


> **Warning:** Use `--resourcesToSkip` only for logical resource IDs that prevent rollback from completing. After rollback, inspect the skipped resources before deploying again.


### --stage

Identifies which stage's stack to roll back. Not technically required (can be resolved from defaults or config), but needed in practice to target a specific stack.

### --profile

Selects the AWS profile for authentication. Useful when managing stacks across multiple AWS accounts.

## Examples

Recover a stuck stack in eu-west-1:

```bash
stacktape cf:rollback --region eu-west-1 --stage production --projectName my-api
```

Retry a failed rollback, skipping a resource that cannot be restored:

```bash
stacktape cf:rollback --region us-east-1 --stage staging --resourcesToSkip BrokenLambdaPermission
```

Use debug logging to see detailed rollback progress:

```bash
stacktape cf:rollback --region eu-west-1 --stage production --logLevel debug
```

## Arguments reference


## CLI Options: `stacktape cf:rollback`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--resourcesToSkip (-rts)` | no | `array` | Resources to Skip A list of logical resource IDs to skip during rollback. Use this when a rollback fails because certain resources cannot be restored to their previous state. | - |
| `--stage (-s)` | no | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Related commands

- [`rollback`](/cli/rollback) — revert to a specific previous deployment version (requires the stack to be in a healthy state).
- [`deploy`](/cli/deploy) — deploy your stack. After a successful `cf:rollback`, redeploy to bring resources to your desired configuration.
- [`preview-changes`](/cli/preview-changes) — preview what a deployment would change before running it.

## FAQ

### When should I use cf:rollback instead of rollback?

Use `cf:rollback` when your stack is stuck in `UPDATE_FAILED` or `UPDATE_ROLLBACK_FAILED` and cannot accept any new updates. The [`rollback`](/cli/rollback) command requires a healthy stack — it downloads a previous deployment's template and redeploys it. If your stack is broken, `cf:rollback` is the only option to unblock it.

### What does UPDATE_FAILED mean?

`UPDATE_FAILED` means a CloudFormation stack update started but failed before completion. The stack is left in a state where it cannot accept further updates until the failed change is rolled back. Running `cf:rollback` triggers CloudFormation's native mechanism to return the stack to its last known good state.

### What does UPDATE_ROLLBACK_FAILED mean?

`UPDATE_ROLLBACK_FAILED` means that CloudFormation attempted to roll back a failed update, but the rollback itself failed. This typically happens when a resource was manually deleted, an external dependency changed, or a custom resource's delete handler failed. Use `cf:rollback` with `--resourcesToSkip` to bypass the problematic resources.

### Can I use cf:rollback to undo a successful deployment?

No. `cf:rollback` only works on stacks that are stuck in a failed state. If your last deployment succeeded but you want to revert the changes, use [`rollback`](/cli/rollback) to deploy a previous version's template instead.

### What are logical resource IDs in --resourcesToSkip?

Logical resource IDs are the names CloudFormation uses internally for each resource in your stack template. You can find them in the CloudFormation console's "Resources" tab or in the error messages that appear when a rollback fails. They look like `MyLambdaFunction`, `ApiGatewayRestApi`, or `VpcSubnet1`.

### Does cf:rollback require a Stacktape config file?

No. The command does not require a configuration file — it operates directly on the CloudFormation stack. You identify the target stack through `--stage` and `--projectName`, or through defaults configured via [`defaults:configure`](/cli/defaults-configure).

### What happens to deployment artifacts after cf:rollback?

After the rollback succeeds, Stacktape cleans up rolled-back deployment artifacts (Lambda zips, container images) that were uploaded for the failed deployment. Previous deployment artifacts remain intact.

### How long does cf:rollback take?

The duration depends on how many resources need to be rolled back and their types. Simple rollbacks (a Lambda function update that failed) complete in under a minute. Rollbacks involving database changes, VPC modifications, or many resources can take several minutes. Use `--logLevel debug` to monitor progress.
