# dev network delete

`stacktape dev network delete` deletes the [dev network](/cli/dev-network) of an AWS account and region: the VPC and the small EC2 instance, the dev box, that connect deployed dev functions to the databases on your machine. Delete it when nobody in the account uses [`stacktape dev`](/cli/dev) in that region anymore, or when a failed network blocks dev mode.

## Usage

```bash
stacktape dev network delete --region eu-west-1
```

Delete the dev stages that use the network first, with [`stacktape delete --stage <stage>`](/cli/delete). While dev functions still run in the network, the command refuses and lists them, because their network interfaces keep the subnets in use. The deletion takes about 2 minutes and also removes the relay port leases. When dev functions were deleted shortly before, it can take up to about 20 minutes: AWS releases their network interfaces with a delay, and CloudFormation waits for that before it deletes the subnets. The command reports its progress once a minute meanwhile. The next `stacktape dev` that needs a dev network creates it again.

The command asks for confirmation first. With `--json`, or outside a terminal, it cannot ask: pass `--yes`.

The command also refuses while someone else depends on the network:

- While a `stacktape dev` session uses it. The command asks the running dev box for its sessions and lists them. A box that has just started may not answer for about a minute; the command then refuses too. `--force` deletes the network anyway, and those sessions lose their connection.
- While a `stacktape dev` session creates or updates the network. Run the command again when CloudFormation has finished.

A `stacktape dev` that starts while the network is being deleted waits for the deletion to finish and then creates a new network.

## When creating the network failed

The first `stacktape dev` deploys its dev stage into the network while CloudFormation still creates the network's last parts. When one of them fails, CloudFormation cannot delete the network again while the stage's functions use its subnets, and the network stays behind in `DELETE_FAILED`. `stacktape dev` and `stacktape dev network` then report the failure and the steps that remove it:

1. Delete the dev stages that use the network, with [`stacktape delete --stage <stage>`](/cli/delete).
2. Wait a few minutes: Lambda releases the network interfaces of deleted functions only after a while.
3. Run `stacktape dev network delete`. It deletes the failed network by its stack name and refuses while dev functions still use it.
4. Run `stacktape dev` again; it creates a new network.

## Options


## CLI Options: `stacktape dev network delete`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-y, --yes` | no | `boolean` | Auto-Confirm Operation — Confirms an operation that would otherwise ask first: deleting a stack, an update that may delete stateful resources, creating a project that does not exist yet, and the other deletions that ask. Without a terminal to ask in (CI, `--agent`, machine-readable output), such an operation fails with `CONFIRMATION_REQUIRED` unless this flag is set. `--agent` does not confirm anything. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `--force` | no | `boolean` | Force — Deletes the dev network even while `stacktape dev` sessions use it, or when the command cannot check for them. Those sessions lose their connection to deployed functions. Dev functions still in the network block the deletion even with this flag. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |


## Related commands

- [`dev network`](/cli/dev-network) — See the dev network, its dev box and the sessions that use it.
- [`delete`](/cli/delete) — Delete a dev stage before deleting the network.
- [`dev`](/cli/dev) — Start dev mode, which creates the dev network again when it needs one.
