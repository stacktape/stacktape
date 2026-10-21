# delete

The `stacktape delete` command permanently removes a deployed stack and all its AWS resources. It deletes deployment artifacts recorded for the stack, then deletes the CloudFormation stack. Back up any data you need before running this command — the operation is irreversible.

## Usage

```bash
stacktape delete --stage production --region eu-west-1
```

`--region` is the only required flag. To avoid deleting the wrong stack, pass the identifying flags you normally use, such as `--stage`, `--projectName`, and `--configPath` when applicable.


> **Warning:** The delete command removes all resources managed by the stack according to CloudFormation's deletion behavior. Back up or export anything you need before deletion — this operation cannot be undone.


## Important flags

**`--autoConfirmOperation`** — Skips the interactive confirmation prompt. Required for CI/CD and non-interactive scripts.

**`--configPath`** — When provided, Stacktape loads the configuration file and runs any `beforeDelete` [lifecycle hooks](/configuration/hooks-and-scripts) before deletion. Without it, hooks are skipped.


## CLI Options: `stacktape delete`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-y, --yes` | no | `boolean` | Auto-Confirm Operation — If `true`, automatically confirms prompts during `deploy` or `delete` operations, skipping the manual confirmation step. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. The maximum length is 12 characters. | - |


## Lifecycle hooks

When a configuration file is loaded, Stacktape registers configured hooks before artifact and stack deletion. The command description documents these as `beforeDelete` hooks. This is useful for exporting data, cleaning up external resources, or notifying other systems before the stack is torn down.

Without a configuration file, `beforeDelete` hooks are not executed.

## Termination protection

Deletion fails when the CloudFormation stack has `EnableTerminationProtection` set. To proceed, first [deploy](/cli/deploy) an update with the `terminationProtection` property set to `false`, then run the delete command again.

## Examples

Delete a staging stack.

```bash
stacktape delete --stage staging --region eu-west-1
```

Delete with automatic confirmation, suitable for CI/CD pipelines.

```bash
stacktape delete --stage staging --region eu-west-1 --autoConfirmOperation
```

Delete with hooks enabled by providing the config file.

```bash
stacktape delete --stage production --region eu-west-1 --configPath ./stacktape.ts
```

Delete from the connected AWS account that an AWS profile belongs to.

```bash
stacktape delete --stage dev-john --region us-east-1 --profile my-aws-profile
```

Enable debug-level logging for troubleshooting.

```bash
stacktape delete --stage staging --region eu-west-1 --logLevel debug
```

## Related commands

- [`deploy`](/cli/deploy) — Create or update a stack.
- [`rollback`](/cli/rollback) — Roll back to a previous deployment version instead of deleting.
- [`info:stacks`](/cli/info-stacks) — List all deployed stacks in a region to find what to delete.

## FAQ

### What happens to my data when I delete a stack?

The delete command deletes deployment artifacts and then deletes the CloudFormation stack, so resources and data managed by that stack are removed according to CloudFormation's deletion behavior. There is no undo. Export or back up anything you need before running the delete command.

### Can I delete a stack without a configuration file?

Yes. The config file is optional — you can identify the stack with `--projectName`, `--stage`, and `--region` directly. The trade-off is that `beforeDelete` [lifecycle hooks](/configuration/hooks-and-scripts) only run when you pass `--configPath`, so without it any data export or cleanup hooks are skipped.

### How do I delete a stack in a CI/CD pipeline?

Use `--autoConfirmOperation` to skip the interactive confirmation prompt in CI/CD or other non-interactive scripts. Example: `stacktape delete --stage staging --region eu-west-1 --autoConfirmOperation`. You can also use `--agent` which implies auto-confirm and switches output to JSONL format.

### How do I delete a stack with termination protection?

Deletion fails when the CloudFormation stack has `EnableTerminationProtection` set. First [deploy](/cli/deploy) an update with the `terminationProtection` property set to `false`, then run the delete command again.

### What is the difference between delete and rollback?

The [`rollback`](/cli/rollback) command reverts your stack to a previous deployment version while keeping the stack alive. The `delete` command permanently removes the entire stack and all its resources. Use rollback when you want to undo a bad deploy; use delete when you want to completely remove the stack from AWS.
