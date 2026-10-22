# secret set

The `secret set` command creates or updates a secret stored in AWS Secrets Manager. Once stored, you can reference the secret in your Stacktape configuration using the [`$Secret('secret-name')`](/configuration/directives) directive — keeping sensitive values like API keys, database passwords, and third-party tokens out of your config files and version control.

## Usage

In interactive mode (the default), the command walks you through a guided flow — prompting for the secret name, input method, and value:

```bash
stacktape secret set --region eu-west-1
```

In agent mode (for CI/CD pipelines or AI coding assistants), provide all values as flags:

```bash
stacktape secret set my-api-key --region eu-west-1 --value sk-abc123 --agent
```

To store the contents of a file as the secret value, exactly as they are in the file:

```bash
stacktape secret set firebase-creds --region eu-west-1 --file ./firebase-service-account.json --agent
```

## Interactive vs agent mode

The command operates in two modes depending on whether `--agent` is set.

**Interactive mode** (default) prompts you for:

1. The secret name.
2. How to provide the value — either by typing it directly (masked input) or by specifying a file path.
3. If a secret with the same name already exists, confirmation before overwriting.

**Agent mode** (`--agent`) is designed for non-interactive environments. It requires the secret name and either `--value` or `--file`. If the secret already exists, the command fails unless you pass `--force-update`. Agent mode outputs structured JSONL and skips all prompts.

## Updating existing secrets

When a secret with the given name already exists in the target region:

- **Interactive mode** — you are prompted to confirm the update.
- **Agent mode** — the command fails with an error unless `--force-update` is passed.

To update an existing secret without prompts:

```bash
stacktape secret set my-api-key --region eu-west-1 --value new-value --force-update --agent
```

## Important flags

| Flag | Description |
|---|---|
| `--region` | **(required)** AWS region where the secret is stored. |
| `<secret-name>` | Positional argument. Name of the secret in AWS Secrets Manager. Required in agent mode; prompted in interactive mode. |
| `--value` | The value to store. Mutually exclusive with `--file`. |
| `--file` | Path to a file whose contents are stored as the secret value. Mutually exclusive with `--value`. |
| `--force-update` | Overwrite an existing secret without confirmation. Only relevant in agent mode. |
| `--agent` | Run in non-interactive mode with JSONL output. Requires the secret name and one of `--value` or `--file`. |

## Examples

### Store a database password

```bash
stacktape secret set db-password --region eu-west-1 --value "S3cur3P@ss!" --agent
```

Then reference it in your configuration with `$Secret('db-password')`.

### Store credentials from a JSON file

```bash
stacktape secret set stripe-keys --region eu-west-1 --file ./stripe-credentials.json --agent
```

The file contents are read and stored as a JSON string in Secrets Manager.

### Rotate a secret in CI/CD

```bash
stacktape secret set my-api-key --region eu-west-1 --value "$NEW_API_KEY" --force-update --agent
```

The `--force-update` flag ensures the pipeline does not fail when the secret already exists.

## Flags reference


## CLI Options: `stacktape secret set`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `--force-update` | no | `boolean` | Force Update — If the secret already exists, update it without prompting for confirmation. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--file` | no | `string` | Secret File — Path to a file whose contents will be stored as the secret value. | - |
| `--secret-name (positional 1)` | no | `string` | Secret Name — The name of the secret in AWS Secrets Manager. | - |
| `--value` | no | `string` | Secret Value — The value to store in the secret. For sensitive values, consider using --file instead. | - |


## Related commands

- [`secret get`](/cli/secret-get) — retrieve and display the details of an existing secret.
- [`secret delete`](/cli/secret-delete) — delete a secret from AWS Secrets Manager.
- [`deploy`](/cli/deploy) — deploy your stack. Secrets referenced via `$Secret()` are resolved at deploy time.

For a broader overview of how secrets fit into Stacktape configuration, see [Secrets](/configuration/secrets) and [Directives](/configuration/directives).
