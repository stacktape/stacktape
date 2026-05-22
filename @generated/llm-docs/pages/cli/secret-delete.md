# secret:delete

The `secret:delete` command deletes a specified AWS Secrets Manager secret managed by Stacktape. Use it to clean up secrets that are no longer referenced in your Stacktape configuration — for example, retired API keys, rotated credentials, or secrets from deleted stages.


> **Warning:** Before deleting a secret, verify that no active Stacktape configuration references it via `$Secret('secret-name')`. If a configuration still references a deleted secret, future operations that need to resolve that secret may fail.


## Usage

In non-agent mode, Stacktape prompts for the secret name regardless of other flags.

```bash
stacktape secret:delete --region eu-west-1
```

In agent mode (CI pipelines or AI coding agents), pass `--secretName` explicitly — it becomes required.

```bash
stacktape secret:delete --region eu-west-1 --secretName my-api-key --agent
```

On success, the CLI reports `Secret "my-api-key" deleted.`

## Arguments reference


## CLI Options: `stacktape secret:delete`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
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
| `--secretName (-secn)` | no | `string` | Secret Name The name of the secret in AWS Secrets Manager. | - |


## Examples

Delete a secret interactively — you will be prompted for the name.

```bash
stacktape secret:delete --region us-east-1
```

Delete a secret by name in agent mode (no prompt, JSONL output).

```bash
stacktape secret:delete --region us-east-1 --secretName stripe-webhook-secret --agent
```

Use a specific AWS profile in agent mode.

```bash
stacktape secret:delete --region eu-west-1 --secretName old-db-password --profile production --agent
```

## Related commands

- [`secret:create`](/cli/secret-create) — create a new secret or update an existing one in AWS Secrets Manager.
- [`secret:get`](/cli/secret-get) — retrieve and display details about a stored secret.
- [`deploy`](/cli/deploy) — deploy a stack that references secrets via the `$Secret()` [directive](/configuration/directives).
