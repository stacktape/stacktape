# secret delete

`stacktape secret delete` deletes a secret from AWS Secrets Manager in one region. Use it for secrets your config no longer references, such as retired API keys or secrets of a deleted stage. It needs AWS credentials and works without a Stacktape account.

AWS doesn't remove the secret right away. It schedules the deletion with a 30-day recovery window, and the name stays taken until then. During that window:

- you can [restore the secret](https://docs.aws.amazon.com/secretsmanager/latest/userguide/manage_restore-secret.html) with its value;
- [`secret set`](/cli/secret-set) with the same name fails, because AWS still holds it;
- a `deploy` or `diff` whose config still references the secret with [`$Secret`](/configuration/secrets) restores it, with its old value.

## Usage

In a terminal, the command asks for the secret name:

```bash
stacktape secret delete --region eu-west-1
```

In a script or a coding agent, pass the name as an argument:

```bash
stacktape secret delete stripe-webhook-secret --region eu-west-1 --agent
```

On success the CLI prints `Secret "stripe-webhook-secret" deleted.`, which means the deletion is scheduled.

## Options


## CLI Options: `stacktape secret delete`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--secret-name (positional 1)` | no | `string` | Secret Name — The name of the secret in AWS Secrets Manager. | - |


## Related commands

- [`secret set`](/cli/secret-set) creates a secret or changes its value.
- [`secret get`](/cli/secret-get) shows a secret's details.
- [`deploy`](/cli/deploy) deploys a stack that reads secrets with `$Secret`.
