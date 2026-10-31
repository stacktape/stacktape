# script run

The `script run` command executes a script defined in the `scripts` section of your Stacktape configuration. It takes the script name as a positional argument (`script run <script-name>`), requires `--stage`, accepts additional environment variables via `--env`, and can optionally assume a deployed resource's IAM role with `--assume-role-of-resource`. Use `script run` when you need to execute a named script from the `scripts` section without deploying the full stack.

## Usage

```bash
stacktape script run myMigration --stage production
```

`script run` requires the script name and `--stage`. Pass `--region` when you do not rely on a configured default (set via [`defaults set`](/cli/defaults-configure)).


## CLI Options: `stacktape script run`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--script-name (positional 1)` | yes | `string` | Script Name — The name of the script to run, which must be defined in the `scripts` section of your configuration. | - |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `--assume-role-of-resource` | no | `string` | Assume Role of Resource — The name of the deployed resource whose IAM role should be assumed during script execution. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--env` | no | `array` | Environment Variables — A list of environment variables for the script, in the format `name=value`. To add multiple variables, use this option multiple times. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `-r, --region` | no | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |


## Examples

Add `--region` when you want to override or avoid relying on a configured default region:

```bash
stacktape script run migrate --stage staging --region eu-west-1
```

Pass extra environment variables to a seed script:

```bash
stacktape script run seed --stage dev --env SEED_FILE=./data/seed.json --env VERBOSE=true
```

Run a script while assuming the IAM role of a deployed resource (so the script operates with that resource's AWS permissions):

```bash
stacktape script run exportData --stage production --assume-role-of-resource dataProcessor
```

Use a custom config path when the configuration is not at the default location:

```bash
stacktape script run cleanup --stage dev --config ./infra/stacktape.ts
```


> **Info:** If `assumeRoleOfResource` is also defined in the script's configuration properties, the CLI flag takes precedence.


## Errors

If the script name does not match any key in the `scripts` section of your configuration, the command throws `stpErrors.e20({ scriptName })`. The command looks up the script by key in `scripts`, so the script name must exactly match a key defined in your configuration.

## Related commands

- [`deployment-script run`](/cli/deployment-script-run) — runs a [deployment script](/resources/advanced/deployment-scripts) resource (only updates the script's source code; use [`deploy`](/cli/deploy) to update environment variables or other configuration).
- [`deploy`](/cli/deploy) — deploys the full stack, including any changes to script configuration.
