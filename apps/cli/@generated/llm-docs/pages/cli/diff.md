# diff

`stacktape diff` shows what a [`deploy`](/cli/deploy) with your current configuration would change in a deployed stage. It packages your workloads, builds the CloudFormation template and asks CloudFormation for a change set, then lists the resources that would be created, updated, replaced or removed. It never applies the change set, so your running resources stay as they are. It needs AWS credentials and a stage that was deployed at least once.

## Usage

```bash
stacktape diff --stage production --region eu-west-1
```

```text
Meaningful Stacktape resource changes

~ myApi (lambda-function) - updated
    Changes: Lambda: Code, Handler; IAM Role: Policy

+ analyticsDb (dynamo-db-table) - new

✓ PREVIEW COMPLETE: 1 new, 1 updated
```

Each resource gets a symbol:

| Symbol | Label | Meaning |
|--------|-------|---------|
| `+` | new | The resource will be created |
| `~` | updated | The resource will be updated in place |
| `!` | replaced | The resource will be deleted and created again |
| `-` | removed | The resource will be deleted |

When nothing changes, the output is `✓ NO CHANGES DETECTED`. CloudFormation sometimes reports changes to internal resources only, such as runtime details Stacktape manages. Stacktape filters those out and prints `✓ NO MEANINGFUL STACKTAPE RESOURCE CHANGES`.

## Replaced resources

A replaced resource is deleted and created again. For a database, bucket, table, queue, stream or user pool, that means its data is gone. Read every `replaced` line before you deploy to production.

A stateful resource is marked replaced only when the AWS resource that holds its data is replaced. When only a supporting resource is replaced, such as a security group, the resource stays `updated` and a **Will replace** line names the supporting resource.

**Will replace** means CloudFormation will replace the resource. **May replace** means it depends on the new values, so treat it as a replacement until you know otherwise.

## What diff changes in AWS

`diff` leaves your running resources alone, but it is not read-only. To build the preview, it does what a deploy does up to the point of applying it:

- **Secrets and SSM parameters.** It restores secrets referenced by the config that are scheduled for deletion. In a terminal, it asks for the values of missing secrets and parameters and creates them. With `--agent` or without a terminal, a missing secret or parameter stops the command instead. Missing database passwords are generated and stored as new secrets, after a confirmation in a terminal.
- **The template.** It uploads the template to the stage's deployment bucket and deletes it after the preview.
- **The change set.** It creates a CloudFormation change set on the stack, reads it and deletes it without executing it, also when the change set has no changes or fails. If the delete fails, the preview still succeeds.

That's why coding agents need your approval before they run `diff` through the [MCP server](/using-with-ai/mcp-server-setup#safety-model), the same as for a deploy. [`synth`](/cli/synth) builds the template without changing anything in AWS.

## Examples

Use a specific config file and AWS profile:

```bash
stacktape diff --stage production --region eu-west-1 --config ./infra/stacktape.ts --profile production
```

Keep the generated template and packaged artifacts in `.stacktape/<invocation-id>` to inspect them:

```bash
stacktape diff --stage dev --region us-west-2 --keep-temp-files
```

Print one line per changed resource for a script or a pull request comment. Each line has the symbol, name, type and action, followed by lines for highlights and will-replace or may-replace properties:

```bash
stacktape diff --stage production --region eu-west-1 --agent
```

## A first deployment has nothing to compare

`diff` needs a deployed stack for the stage and region. Before the first deploy, run [`deploy`](/cli/deploy) directly, or [`synth`](/cli/synth) to see the template.

## Options


## CLI Options: `stacktape diff`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. Without it, Stacktape uses the one `stacktape.ts`, `stacktape.yml`, `stacktape.yaml` or `stacktape.js` in the working directory. When there are several, the command stops and asks you to choose one with this option. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--keep-temp-files` | no | `boolean` | Preserve Temporary Files — If `true`, preserves the temporary files generated by the operation, such as the CloudFormation template and packaged resources. These files are saved to `.stacktape/[invocation-id]`. | - |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`deploy`](/cli/deploy) applies the changes that `diff` showed.
- [`synth`](/cli/synth) writes the CloudFormation template to disk without changing anything in AWS.
- [`validate`](/cli/validate) checks the configuration and, optionally, the template, without packaging.
