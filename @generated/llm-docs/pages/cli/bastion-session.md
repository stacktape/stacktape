# bastion:session

The `bastion:session` command opens an interactive shell on a deployed [bastion host](/resources/security/bastion-host). Use it to inspect private resources, run ad-hoc commands, or troubleshoot networking inside your VPC. The session is established over a secure AWS SSM connection.

## Usage

```bash
stacktape bastion:session --stage production --region eu-west-1
```

Your stack must contain at least one `bastion` resource. The `--bastionResource` flag is optional — use it when the deployed stack has multiple bastions and you need to choose which one to connect to.

```bash
stacktape bastion:session --stage production --region eu-west-1 --bastionResource myBastion
```

The command does not modify your stack and does not require a Stacktape configuration file — it reads the deployed stack state directly from AWS.

## How it works

When you run `bastion:session`, Stacktape resolves the bastion's EC2 instance ID from the deployed stack metadata, then starts an SSM shell session for that instance in the selected region. Your terminal becomes an interactive shell on the bastion host.


> **Info:** The AWS Session Manager plugin must be installed on your local machine for the session to work. If the session fails to start, verify the plugin is installed — see the [AWS Session Manager plugin install guide](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html).


## CLI reference


## CLI Options: `stacktape bastion:session`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--bastionResource (-br)` | no | `string` | Bastion Resource Name The name of the bastion resource as defined in your Stacktape configuration. | - |
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
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Examples

### Connect to the only bastion in a stack

When your stack has a single bastion resource, you can omit `--bastionResource`.

```bash
stacktape bastion:session --stage dev --region us-east-1
```

### Connect to a specific bastion by name

When your configuration defines more than one bastion, specify which one to connect to.

```bash
stacktape bastion:session --stage production --region eu-west-1 --bastionResource vpnBastion
```

### Use a specific AWS profile

```bash
stacktape bastion:session --stage staging --region eu-central-1 --profile my-aws-profile
```

## Troubleshooting

The command requires a deployed `bastion` resource in the target stack. If Stacktape cannot resolve a bastion resource from the deployed stack, the command fails. Ensure you have deployed a stack that includes at least one bastion before running this command.

When using `--bastionResource`, the value must match the name of a bastion resource in your configuration. If the name does not match any bastion in the deployed stack, the command reports an error.

## Related commands

- [`bastion:tunnel`](/cli/bastion-tunnel) — create a secure tunnel through a bastion to reach a private resource (database, Redis, OpenSearch) from your local machine.
- [`debug:sql`](/cli/debug-sql) — run read-only SQL queries against a deployed database. Supports `--bastionResource` to tunnel through a bastion when the database is VPC-only.
- [`debug:redis`](/cli/debug-redis) — query a deployed Redis cluster. Also supports `--bastionResource` for VPC-only clusters.
