# secret:set

The `secret:set` command creates or updates a secret stored in AWS Secrets Manager. Once stored, you can reference the secret in your Stacktape configuration using the [`$Secret('secret-name')`](/configuration/directives) directive — keeping sensitive values like API keys, database passwords, and third-party tokens out of your config files and version control.

## Usage

In interactive mode (the default), the command walks you through a guided flow — prompting for the secret name, input method, and value:

```bash
stacktape secret:set --region eu-west-1
```

In agent mode (for CI/CD pipelines or AI coding assistants), provide all values as flags:

```bash
stacktape secret:set --region eu-west-1 --secretName my-api-key --secretValue sk-abc123 --agent
```

To store the contents of a file as a secret (stored as JSON in Secrets Manager):

```bash
stacktape secret:set --region eu-west-1 --secretName firebase-creds --secretFile ./firebase-service-account.json --agent
```

## Interactive vs agent mode

The command operates in two modes depending on whether `--agent` is set.

**Interactive mode** (default) prompts you for:

1. The secret name.
2. How to provide the value — either by typing it directly (masked input) or by specifying a file path.
3. If a secret with the same name already exists, confirmation before overwriting.

**Agent mode** (`--agent`) is designed for non-interactive environments. It requires `--secretName` and either `--secretValue` or `--secretFile`. If the secret already exists, the command fails unless you pass `--forceUpdate`. Agent mode outputs structured JSONL and skips all prompts.

## Updating existing secrets

When a secret with the given name already exists in the target region:

- **Interactive mode** — you are prompted to confirm the update.
- **Agent mode** — the command fails with an error unless `--forceUpdate` is passed.

To update an existing secret without prompts:

```bash
stacktape secret:set --region eu-west-1 --secretName my-api-key --secretValue new-value --forceUpdate --agent
```

## Important flags

| Flag | Description |
|---|---|
| `--region` | **(required)** AWS region where the secret is stored. |
| `--secretName` | Name of the secret in AWS Secrets Manager. Required in agent mode; prompted in interactive mode. |
| `--secretValue` | The value to store. Mutually exclusive with `--secretFile`. |
| `--secretFile` | Path to a file whose contents are stored as JSON. Mutually exclusive with `--secretValue`. |
| `--forceUpdate` | Overwrite an existing secret without confirmation. Only relevant in agent mode. |
| `--agent` | Run in non-interactive mode with JSONL output. Requires `--secretName` and one of `--secretValue` or `--secretFile`. |

## Examples

### Store a database password

```bash
stacktape secret:set --region eu-west-1 --secretName db-password --secretValue "S3cur3P@ss!" --agent
```

Then reference it in your configuration with `$Secret('db-password')`.

### Store credentials from a JSON file

```bash
stacktape secret:set --region eu-west-1 --secretName stripe-keys --secretFile ./stripe-credentials.json --agent
```

The file contents are read and stored as a JSON string in Secrets Manager.

### Rotate a secret in CI/CD

```bash
stacktape secret:set --region eu-west-1 --secretName my-api-key --secretValue "$NEW_API_KEY" --forceUpdate --agent
```

The `--forceUpdate` flag ensures the pipeline does not fail when the secret already exists.

## Flags reference


## CLI Options: `stacktape secret:set`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--forceUpdate (-fu)` | no | `boolean` | Force Update If the secret already exists, update it without prompting for confirmation. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--secretFile (-secf)` | no | `string` | Secret File Path to a file whose contents will be stored as the secret value. | - |
| `--secretName (-secn)` | no | `string` | Secret Name The name of the secret in AWS Secrets Manager. | - |
| `--secretValue (-secv)` | no | `string` | Secret Value The value to store in the secret. For sensitive values, consider using --secretFile instead. | - |


## Related commands

- [`secret:get`](/cli/secret-get) — retrieve and display the details of an existing secret.
- [`secret:delete`](/cli/secret-delete) — delete a secret from AWS Secrets Manager.
- [`deploy`](/cli/deploy) — deploy your stack. Secrets referenced via `$Secret()` are resolved at deploy time.

For a broader overview of how secrets fit into Stacktape configuration, see [Secrets](/configuration/secrets) and [Directives](/configuration/directives).
