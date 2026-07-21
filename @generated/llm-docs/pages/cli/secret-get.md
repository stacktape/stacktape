# secret:get

Retrieve details about a secret stored in AWS Secrets Manager. The command prints the secret's name, value, creation date, and ARN. Use this to verify secret contents before referencing them in your Stacktape configuration with the [`$Secret()` directive](/configuration/directives).

## Usage

```bash
stacktape secret:get --region eu-west-1
```

In interactive mode, you are prompted to enter the secret name. In agent mode, pass `--secretName` explicitly:

```bash
stacktape secret:get --region eu-west-1 --secretName my-api-key --agent
```

## API reference


## CLI Options: `stacktape secret:get`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--secretName (-secn)` | no | `string` | Secret Name The name of the secret in AWS Secrets Manager. | - |


## Output

In interactive mode, the command prints a formatted box containing the secret's name, creation date, ARN, and value. If the value is valid JSON, it is pretty-printed.

For `secret:get`, agent mode prints a JSON-formatted payload containing `name`, `value`, `created`, and `arn`. The shared CLI `--agent` flag also disables interactive prompts, so pass `--secretName` when using it.

## Examples

Retrieve a secret interactively (you'll be prompted for the name):

```bash
stacktape secret:get --region us-east-1
```

Retrieve a specific secret by name in a CI script:

```bash
stacktape secret:get --region eu-west-1 --secretName DATABASE_PASSWORD --agent
```

Use a named AWS profile:

```bash
stacktape secret:get --region eu-west-1 --profile production
```

## Related commands

- [`secret:set`](/cli/secret-set) — create a new secret in AWS Secrets Manager.
- [`secret:delete`](/cli/secret-delete) — delete a secret from AWS Secrets Manager.
- [Secrets configuration](/configuration/secrets) — how to reference secrets in your Stacktape config using `$Secret()`.
