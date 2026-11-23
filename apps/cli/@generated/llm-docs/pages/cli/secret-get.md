# secret get

`stacktape secret get` shows a secret stored in AWS Secrets Manager: its name, creation date and ARN. Use it to check that a secret exists before you reference it with [`$Secret()`](/configuration/directives).

The value is hidden by default and shows as `<<OMITTED>>`. Add `--show-secrets` to print it, but only where the output stays private: never in a shared CI log or an AI assistant's conversation. The [MCP server](/using-with-ai/mcp-server-setup) never returns the value.

## Usage

```bash
stacktape secret get --region eu-west-1
```

In a terminal, the command asks for the secret name. With `--agent`, it can't ask, so pass the name as an argument:

```bash
stacktape secret get my-api-key --region eu-west-1 --agent
```

## Output

The terminal box and the `--agent` result carry the same fields. With `--agent`, the final result event has `name`, `arn`, `created` (an ISO 8601 timestamp) and `value` at `data.result`.

With `--show-secrets`, a value that is valid JSON is pretty-printed in the box and returned as an object in the `--agent` result.

## Examples

Retrieve a secret interactively (you'll be prompted for the name):

```bash
stacktape secret get --region us-east-1
```

Check that a secret exists, without printing its value:

```bash
stacktape secret get DATABASE_PASSWORD --region eu-west-1 --agent
```

Print the value in your own terminal:

```bash
stacktape secret get DATABASE_PASSWORD --region eu-west-1 --show-secrets
```

Use a named AWS profile:

```bash
stacktape secret get --region eu-west-1 --profile production
```

## Options


## CLI Options: `stacktape secret get`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--secret-name (positional 1)` | no | `string` | Secret Name — The name of the secret in AWS Secrets Manager. | - |
| `--show-secrets` | no | `boolean` | Show Secrets — If `true`, the command includes secret values in its output: database passwords, connection strings with credentials and other stack parameters Stacktape stores as sensitive, and the value a `secret get` reads. Without it, each of them is `>` in the terminal, in JSON output and in the stack-info file. Use it only where the output stays private, never in shared CI logs. | - |


## Related commands

- [`secret set`](/cli/secret-set) — create a new secret in AWS Secrets Manager.
- [`secret delete`](/cli/secret-delete) — delete a secret from AWS Secrets Manager.
- [Secrets configuration](/configuration/secrets) — how to reference secrets in your Stacktape config using `$Secret()`.
