# stack recover

The `stack recover` command recovers a CloudFormation stack stuck in `UPDATE_FAILED` or `UPDATE_ROLLBACK_FAILED` state by triggering CloudFormation's native rollback mechanism. Only `--region` is required. Use it when a failed deployment leaves your stack unable to accept new updates — this is a recovery command, not a version rollback. To revert to a previous deployment version, use [`rollback`](/cli/rollback) instead.

## Usage

Run `stacktape stack recover` with the `--region` flag to trigger a CloudFormation rollback on a stuck stack.

```bash
stacktape stack recover --region eu-west-1
```

Only `--region` is required. Pass `--stage`, `--project`, or `--config` when you need to target a specific stack instead of relying on configured defaults or config file discovery.

A typical invocation targeting a specific stack:

```bash
stacktape stack recover --region eu-west-1 --stage production --project my-api
```

## Arguments reference

The `stack recover` command accepts the following arguments. Only `--region` is required; all other flags are optional.


## CLI Options: `stacktape stack recover`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--resources-to-skip` | no | `array` | Resources to Skip — A list of logical resource IDs to skip during rollback. Use this when a rollback fails because certain resources cannot be restored to their previous state. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |


## What it does

When a Stacktape deployment fails, CloudFormation can leave the stack in one of these states:

- **`UPDATE_FAILED`** — a stack update failed partway through and kept the resources that updated. Deploying again continues the update. `stack recover` instead uses CloudFormation's native rollback mechanism to return the stack to the last known good state.
- **`CREATE_FAILED`** — a first deployment failed and kept the resources it created. Deploying again continues it. There is no earlier state to return to, so use [`delete`](/cli/delete) to remove it: `stack recover` would delete its resources but leave an empty stack that still has to be deleted.
- **`UPDATE_ROLLBACK_FAILED`** — a previous rollback itself failed. `stack recover` retries CloudFormation's native rollback path and can pass logical resource IDs through `--resources-to-skip` for resources that cannot be restored.

After the rollback succeeds, Stacktape attempts to clean up rolled-back deployment artifacts.


> **Info:** This command does NOT roll back to a previous deployment version. It rolls back the CloudFormation stack to the last known good state. To revert to an earlier version of your configuration, use [`rollback`](/cli/rollback) instead.


## stack recover vs rollback

The Stacktape CLI provides two distinct rollback commands for different scenarios.

| Scenario | Command |
|----------|---------|
| Update failed (`UPDATE_FAILED`) and you want to undo it rather than continue it | `stack recover` |
| Stack stuck in `UPDATE_ROLLBACK_FAILED` | `stack recover` |
| Want to revert to a specific previous deployment version | [`rollback`](/cli/rollback) |
| Stack is healthy but you want to undo the last deploy | [`rollback`](/cli/rollback) |

Use `stack recover` as a recovery tool when your stack is in `UPDATE_FAILED` or `UPDATE_ROLLBACK_FAILED`. Use [`rollback`](/cli/rollback) when you want to deploy a previous deployment version.

## Important flags

### --resources-to-skip

When a rollback itself fails (`UPDATE_ROLLBACK_FAILED`), specific resources may be preventing the rollback from completing — for example, a resource that was manually deleted outside of CloudFormation or depends on an external service that changed state. Pass their logical resource IDs to skip them during the retry:

```bash
stacktape stack recover --region eu-west-1 --stage production --resources-to-skip MyCustomResource AnotherBrokenResource
```


> **Warning:** Use `--resources-to-skip` only for logical resource IDs that prevent rollback from completing. After rollback, inspect the skipped resources before deploying again.


### --stage

Identifies which stage's stack to roll back when provided. Can also be resolved from configured defaults or a config file.

### --profile

Selects the AWS profile for authentication. Useful when managing stacks across multiple AWS accounts.

## Examples

Recover a stuck stack in eu-west-1:

```bash
stacktape stack recover --region eu-west-1 --stage production --project my-api
```

Retry a failed rollback, skipping a resource that cannot be restored:

```bash
stacktape stack recover --region us-east-1 --stage staging --resources-to-skip BrokenLambdaPermission
```

Use debug logging to see detailed rollback progress:

```bash
stacktape stack recover --region eu-west-1 --stage production --debug
```

## Related commands

- [`rollback`](/cli/rollback) — revert to a specific previous deployment version.
- [`deploy`](/cli/deploy) — deploy your stack. After a successful `stack recover`, redeploy to bring resources to your desired configuration.
- [`diff`](/cli/diff) — preview what a deployment would change before running it.

## FAQ

### When should I use stack recover instead of rollback?

Use `stack recover` when a failed update left the stack in `UPDATE_FAILED` and you want to undo it instead of fixing and deploying again, or when the stack is stuck in `UPDATE_ROLLBACK_FAILED` and cannot accept any new updates. The [`rollback`](/cli/rollback) command downloads a previous deployment's template and deploys it, which also works over `UPDATE_FAILED`.

### What's the difference between UPDATE_FAILED and UPDATE_ROLLBACK_FAILED?

`UPDATE_FAILED` means a stack update failed partway through and kept what it had updated. The next deploy continues from there, or `stack recover` returns the stack to the last known good state. `UPDATE_ROLLBACK_FAILED` means CloudFormation already attempted that rollback and the rollback itself failed; in this case, retry with `--resources-to-skip` to bypass the resources blocking it.

### My rollback keeps failing on a specific resource. What do I do?

Pass that resource's logical ID to `--resources-to-skip` so CloudFormation skips it during the rollback retry. This is common when a resource was deleted outside of CloudFormation or depends on an external service whose state changed. After the rollback completes, inspect the skipped resources before deploying again, since they were left in their failed state.
