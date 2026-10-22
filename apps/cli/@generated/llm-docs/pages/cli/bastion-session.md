# bastion shell

The `bastion shell` command starts an interactive shell on a deployed [bastion host](/resources/security/bastion-host). The session is established over SSM, so no SSH keys or open inbound ports are required.

## Usage

```bash
stacktape bastion shell --stage production --region eu-west-1
```

Your stack must contain at least one `bastion` resource. The `--bastion-resource` flag is optional — use it when the deployed stack has multiple bastions and you need to choose which one to connect to.

```bash
stacktape bastion shell --stage production --region eu-west-1 --bastion-resource myBastion
```

The command does not modify your stack and does not require a Stacktape configuration file.

## How it works

When you run `bastion shell`, Stacktape initializes stack services, resolves the bastion EC2 instance ID from the deployed stack overview, and starts an SSM shell session in the selected region. Your terminal becomes an interactive shell on the bastion host.


> **Info:** The `bastion shell` command resolves the bastion EC2 instance ID from the deployed stack overview and starts an SSM shell session in the target region. If Stacktape cannot resolve the instance ID, verify that the target stack includes the selected bastion resource.


## CLI reference


## CLI Options: `stacktape bastion shell`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. The maximum length is 12 characters. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `--bastion-resource` | no | `string` | Bastion Resource Name — The name of the bastion resource as defined in your Stacktape configuration. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

### Connect to the only bastion in a stack

When your stack has a single bastion resource, you can omit `--bastion-resource`.

```bash
stacktape bastion shell --stage dev --region us-east-1
```

### Connect to a specific bastion by name

When your configuration defines more than one bastion, specify which one to connect to.

```bash
stacktape bastion shell --stage production --region eu-west-1 --bastion-resource vpnBastion
```

### Use a specific AWS profile

```bash
stacktape bastion shell --stage staging --region eu-central-1 --profile my-aws-profile
```

## Troubleshooting

The command requires a deployed `bastion` resource in the target stack. If Stacktape cannot resolve a bastion resource from the deployed stack, the command fails. Ensure you have deployed a stack that includes at least one bastion before running this command.

When using `--bastion-resource`, the value must match the name of a bastion resource in your configuration. If the name does not match any bastion in the deployed stack, the command reports an error.

## Related commands

- [`bastion tunnel`](/cli/bastion-tunnel) — create a secure tunnel through a bastion to reach a private resource (database, Redis, OpenSearch) from your local machine.
- [`query sql`](/cli/query-sql) — run read-only SQL queries against a deployed database. Supports `--bastion-resource` to tunnel through a bastion when the database is VPC-only.
- [`query redis`](/cli/query-redis) — query a deployed Redis cluster. Also supports `--bastion-resource` for VPC-only clusters.
