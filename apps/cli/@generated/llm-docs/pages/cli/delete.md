# delete

`stacktape delete` removes a deployed stage: the CloudFormation stack with all its resources, then the stage's deployment bucket and container image repository. Data in the stack's databases, buckets and tables is deleted with it, and there is no undo. Back up what you need first. The command asks for confirmation before it deletes anything.

## Usage

```bash
stacktape delete --stage staging --region eu-west-1
```

The CLI shows the stack it found and asks you to confirm. Pass the flags you deploy with, such as `--stage`, `--project` and `--aws-account`, so it finds the right stack.

In CI or another run that can't ask, add `--yes`. Without it, the command fails with `CONFIRMATION_REQUIRED` and deletes nothing. `--agent` changes only the output; it doesn't confirm.

```bash
stacktape delete --stage staging --region eu-west-1 --yes
```

## beforeDelete hooks

When the CLI loads a config, it runs the config's `beforeDelete` [hooks](/configuration/hooks-and-scripts) before it deletes anything, for example to export data or clean up something outside the stack. It loads a config when you pass `--config`, and also when it finds one in the working directory. To delete without running the hooks, run the command from a directory without a config.

## Protected stacks and resources

**Termination protection.** A stack with `terminationProtection: true` can't be deleted. [Deploy](/cli/deploy) with `terminationProtection: false`, then delete.

**Deletion protection.** When a resource has deletion protection on, such as a [relational database](/resources/databases/relational-database) or an [Aurora DSQL database](/resources/databases/dsql) with `deletionProtection: true`, the command stops before it deletes anything and lists the protected resources. Deploy with `deletionProtection: false`, then delete. `stacktape init` turns deletion protection on for every database it adds.

When an earlier delete ended in `DELETE_FAILED`, the stack can't be deployed anymore. Turn the protection off in the AWS console for that resource, then delete again.

## Examples

Delete from the AWS account of a specific profile. When the CLI is signed in to the Console, that account must be connected to your organization.

```bash
stacktape delete --stage dev-john --region us-east-1 --profile my-aws-profile
```

Print debug logs while you troubleshoot a failed delete:

```bash
stacktape delete --stage staging --region eu-west-1 --log-level debug
```

## Options


## CLI Options: `stacktape delete`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-y, --yes` | no | `boolean` | Auto-Confirm Operation — Confirms an operation that would otherwise ask first: deleting a stack, an update that may delete stateful resources, creating a project that does not exist yet, and the other deletions that ask. Without a terminal to ask in (CI, `--agent`, machine-readable output), such an operation fails with `CONFIRMATION_REQUIRED` unless this flag is set. `--agent` does not confirm anything. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. Without it, Stacktape uses the one `stacktape.ts`, `stacktape.yml`, `stacktape.yaml` or `stacktape.js` in the working directory. When there are several, the command stops and asks you to choose one with this option. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |


## Related commands

- [`rollback`](/cli/rollback) returns a stage to an earlier release and keeps it running.
- [`stack list`](/cli/stack-list) lists the stacks in a region.
- [`deploy`](/cli/deploy) creates or updates a stage.
