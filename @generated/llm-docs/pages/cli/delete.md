# delete

The `stacktape delete` command permanently removes a deployed stack and all its AWS resources. It deletes deployment artifacts recorded for the stack, then tears down the CloudFormation stack and cleans up associated infrastructure. Back up any data you need before running this command — the operation is irreversible.

## Usage

```bash
stacktape delete --stage production --region eu-west-1
```

The only required flag is `--region`. In practice, you also need to identify the stack — either by providing `--stage` (and optionally `--projectName`), or by pointing to a configuration file with `--configPath` so Stacktape can resolve the stack name automatically.


> **Warning:** This command permanently deletes all resources in the stack, including databases, buckets, and any data they contain. Make sure you have backups of anything you want to keep.


## Important flags

**`--autoConfirmOperation`** — Stacktape prompts for confirmation before deleting a stack. Use this flag in CI/CD or other non-interactive scripts to skip the confirmation prompt.

```bash
stacktape delete --stage staging --region eu-west-1 --autoConfirmOperation
```

**`--configPath`** — Path to your Stacktape configuration file. The config is optional for deletion, but providing it enables `beforeDelete` [lifecycle hooks](/configuration/hooks-and-scripts). Without it, hooks are skipped.

```bash
stacktape delete --stage production --region eu-west-1 --configPath ./stacktape.ts
```

**`--projectName`** — Explicitly set the project name to identify which stack to delete. If omitted, Stacktape resolves it from the configuration file.

**`--stage`** — The stage to delete (e.g., `production`, `staging`, `dev-john`). Combined with the project name and region, this uniquely identifies the target stack.

**`--profile`** — AWS profile to use for authentication. Manage profiles with [`aws-profile:create`](/cli/aws-profile-create) or set a default with [`defaults:configure`](/cli/defaults-configure).


## CLI Options: `stacktape delete`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--autoConfirmOperation (-aco)` | no | `boolean` | Auto-Confirm Operation If `true`, automatically confirms prompts during `deploy` or `delete` operations, skipping the manual confirmation step. | - |
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
| `--stage (-s)` | no | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Lifecycle hooks

When a configuration file is provided via `--configPath`, Stacktape registers hooks and runs the `beforeDelete` hook phase before deleting artifacts and the stack. This is useful for exporting data, cleaning up external resources, or notifying other systems before the stack is torn down.

Without a configuration file, hooks are silently skipped and the stack is deleted directly.

## Termination protection

If a stack has `terminationProtection` enabled in its configuration, the delete command fails with an error. To delete such a stack, first [deploy](/cli/deploy) an update that sets `terminationProtection` to `false`, then run the delete command again.

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

Use a specific AWS profile.

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

All AWS resources in the stack are permanently deleted, including databases, S3 buckets, and any data they contain. There is no undo. Export or back up any data you need before running the delete command. CloudFormation handles the teardown, so resource deletion follows AWS dependency ordering.

### Can I delete a stack without a configuration file?

Yes. The configuration file is optional for the delete command. You can identify the stack using `--projectName`, `--stage`, and `--region` flags directly. The trade-off is that `beforeDelete` lifecycle hooks will not run without a config file.

### How do I delete a stack in a CI/CD pipeline?

Use `--autoConfirmOperation` to skip the interactive confirmation prompt in CI/CD or other non-interactive scripts. Example: `stacktape delete --stage staging --region eu-west-1 --autoConfirmOperation`. You can also use `--agent` which implies auto-confirm and switches output to JSONL format.

### How do I delete a stack with termination protection?

You cannot delete a stack that has `terminationProtection` enabled. First [deploy](/cli/deploy) an update that sets `terminationProtection` to `false`, then run the delete command. This two-step process is intentional — it prevents accidental deletion of production stacks.

### Does deleting a stack affect other stages?

No. Each stage is an independent CloudFormation stack. Deleting `staging` has no effect on `production` or any other stage. Resources are scoped to the specific stack being deleted.

### How long does a stack deletion take?

Deletion time depends on the number and type of resources in the stack. Stacks with databases, VPCs, or large container clusters take longer because AWS must drain connections and clean up dependencies sequentially. Simple stacks with only Lambda functions and an API Gateway complete faster.

### What if a delete operation fails partway through?

If CloudFormation encounters an error during deletion (e.g., a resource cannot be deleted due to dependencies or manual modifications), the stack enters a `DELETE_FAILED` state. Resolve the blocking issue — typically a manually modified resource or a dependency that AWS cannot automatically remove — then retry `stacktape delete`. In some cases, you may need to manually remove the blocking resource in the AWS Console before retrying.

### Can I recover a deleted stack?

No. Once a stack is deleted, all resources and data are permanently removed. If you need to recreate the stack, run [`deploy`](/cli/deploy) again with the same configuration. The new deployment creates fresh resources — previous data is not restored.

### What is the difference between delete and rollback?

The [`rollback`](/cli/rollback) command reverts your stack to a previous deployment version while keeping the stack alive. The `delete` command permanently removes the entire stack and all its resources. Use rollback when you want to undo a bad deploy; use delete when you want to completely remove the stack from AWS.

### Do beforeDelete hooks have access to deployed resources?

Yes. The `beforeDelete` hook phase runs before any artifacts or resources are deleted, so hooks can still interact with the running stack. This makes hooks useful for exporting data from databases or notifying dependent services before teardown begins.
