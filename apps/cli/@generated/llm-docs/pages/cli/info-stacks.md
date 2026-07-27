# info:stacks

The `info:stacks` command lists CloudFormation stacks deployed in a specified AWS region and identifies which ones are Stacktape-managed. It shows each stack's name, status, timestamps, and actual or forecasted spend when budget data is available — giving you a quick inventory of what's running in your account.

## Usage

```bash
stacktape info:stacks --region eu-west-1
```

## API reference


## CLI Options: `stacktape info:stacks`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--stage (-s)` | no | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |


## What it does

When you run `info:stacks`, Stacktape queries CloudFormation for all stacks in the specified region (excluding stacks in `DELETE_COMPLETE` state) and enriches the results with spend data when available. Each stack entry includes:

- **Stack name** and stack ID
- **Status** (e.g. `CREATE_COMPLETE`, `UPDATE_COMPLETE`, `UPDATE_ROLLBACK_COMPLETE`)
- **Creation time** and **last update time**
- **Whether it's a Stacktape-managed stack** — the `isStacktapeStack` field is derived from the CloudFormation `TemplateDescription` using Stacktape's `isStacktapeStackDescription` helper, which recognizes descriptions set by Stacktape during deployment
- **Actual and forecasted spend** (when budget data is available)

This is useful for auditing what's deployed, finding forgotten stacks that are still incurring cost, or verifying a deployment landed in the correct region.

## Important flags

The only required flag is `--region`, which determines which AWS region to query.

Use `--profile` to specify which AWS credentials profile to use, or `--awsAccount` to target a specific AWS account connected in the Stacktape Console.

Use `--agent` to get JSON output for programmatic consumption. For `info:stacks`, agent mode prints the full result as a single pretty-printed JSON array (via `JSON.stringify` with indentation) and disables the interactive terminal UI. This differs from the generic `--agent` flag description in the API reference above, which describes JSONL output — `info:stacks` uses a JSON array instead.


> **Info:** The `--stage` and `--projectName` flags are accepted by the CLI parser but are not used in the stack-listing logic. The command lists all non-deleted stacks returned for the selected AWS region and account.


## Examples

List all stacks in `us-east-1`:

```bash
stacktape info:stacks --region us-east-1
```

List stacks using a specific AWS profile:

```bash
stacktape info:stacks --region eu-west-1 --profile my-aws-profile
```

Get JSON output for scripting or AI agent consumption:

```bash
stacktape info:stacks --region eu-west-1 --agent
```

Use a specific AWS account connected in the Stacktape Console:

```bash
stacktape info:stacks --region eu-west-1 --awsAccount my-production-account
```

## Related commands

- [`info:stack`](/cli/info-stack) — get detailed information about a single deployed stack, including outputs and resource list.
- [`info:operations`](/cli/info-operations) — view recent deployment operations and their success/failure status.
- [`delete`](/cli/delete) — remove a deployed stack from AWS.
