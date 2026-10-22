# stack list

The `stack list` command lists CloudFormation stacks deployed in a specified AWS region and identifies which ones are Stacktape-managed. It shows each stack's name, status, timestamps, and actual or forecasted spend when budget data is available — giving you a quick inventory of what's running in your account.

## Usage

```bash
stacktape stack list --region eu-west-1
```

## API reference


## CLI Options: `stacktape stack list`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. The maximum length is 12 characters. | - |


## What it does

When you run `stack list`, Stacktape queries CloudFormation for all stacks in the specified region (excluding stacks in `DELETE_COMPLETE` state) and enriches the results with spend data when available. Each stack entry includes:

- **Stack name** and stack ID
- **Status** (e.g. `CREATE_COMPLETE`, `UPDATE_COMPLETE`, `UPDATE_ROLLBACK_COMPLETE`)
- **Creation time** and **last update time**
- **Whether it's a Stacktape-managed stack** — the `isStacktapeStack` field is derived from the CloudFormation `TemplateDescription` using Stacktape's `isStacktapeStackDescription` helper, which recognizes descriptions set by Stacktape during deployment
- **Actual and forecasted spend** (when budget data is available)

This is useful for auditing what's deployed, finding forgotten stacks that are still incurring cost, or verifying a deployment landed in the correct region.

## Important flags

The only required flag is `--region`, which determines which AWS region to query.

Use `--profile` to specify which AWS credentials profile to use, or `--aws-account` to target a specific AWS account connected in the Stacktape Console.

Use `--agent` to get JSON output for programmatic consumption. For `stack list`, agent mode prints the full result as a single pretty-printed JSON array (via `JSON.stringify` with indentation) and disables the interactive terminal UI. This differs from the generic `--agent` flag description in the API reference above, which describes JSONL output — `stack list` uses a JSON array instead.


> **Info:** The `--stage` and `--project` flags are accepted by the CLI parser but are not used in the stack-listing logic. The command lists all non-deleted stacks returned for the selected AWS region and account.


## Examples

List all stacks in `us-east-1`:

```bash
stacktape stack list --region us-east-1
```

List stacks using a specific AWS profile:

```bash
stacktape stack list --region eu-west-1 --profile my-aws-profile
```

Get JSON output for scripting or AI agent consumption:

```bash
stacktape stack list --region eu-west-1 --agent
```

Use a specific AWS account connected in the Stacktape Console:

```bash
stacktape stack list --region eu-west-1 --aws-account my-production-account
```

## Related commands

- [`status`](/cli/info-stack) — get detailed information about a single deployed stack, including outputs and resource list.
- [`stack history`](/cli/info-operations) — view recent deployment operations and their success/failure status.
- [`delete`](/cli/delete) — remove a deployed stack from AWS.
