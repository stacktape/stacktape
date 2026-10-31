# deployment-script run

The `deployment-script run` command re-packages and invokes a single [deployment script](/resources/advanced/deployment-scripts) without running a full [deploy](/cli/deploy). Use it to iterate on script logic — fix a migration, adjust a seed routine, or re-run a post-deploy step — without waiting for a complete stack update. The command rebuilds the script's Lambda function code from your local source, updates the existing Lambda with it, resolves the script's `parameters` from your current local configuration, invokes the function, and prints the response payload or error to your terminal.


> **Warning:** This command updates the script's **source code** and resolves `parameters` from your local configuration. Changes to environment variables, memory, timeout, VPC settings, or other Lambda configuration require a full [`deploy`](/cli/deploy).


## Usage

```bash
stacktape deployment-script run runMigrations --stage production --region eu-west-1
```

The three required flags identify which deployed script to target:

- **`--stage`** — the stage where the script is deployed (e.g. `production`, `staging`, `dev`).
- **`--region`** — the AWS region of the stack.
- **`<resource-name>`** (positional argument) — the name of the deployment script resource in your Stacktape configuration.

The deployment script must already exist in your configuration **and** be deployed to the target stack. If the resource is not defined in your configuration file or not present in the deployed stack, the command fails. Add the resource and run [`deploy`](/cli/deploy) first.

## Arguments reference


## CLI Options: `stacktape deployment-script run`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resource-name (positional 1)` | yes | `string` | Resource Name — The name of the resource as defined in your Stacktape configuration. | - |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

Re-run a database migration script against a staging stack:

```bash
stacktape deployment-script run runMigrations --stage staging --region us-east-1
```

Re-run a seed script with debug-level logging for more detailed CLI logs:

```bash
stacktape deployment-script run seedData --stage dev --region eu-west-1 --debug
```

Point to a non-default config file location:

```bash
stacktape deployment-script run postDeployHook --stage production --region us-west-2 --config ./infra/stacktape.ts
```

## When to use this vs deploy

Use `deployment-script run` when you are iterating on the script's handler code and want fast feedback. The command rebuilds and updates only the script's function code, then invokes the Lambda — skipping a full stack update. The script's `parameters` are resolved from your current local configuration and sent as the invocation payload, so parameter changes take effect immediately without redeploying. Switch to a full [`deploy`](/cli/deploy) when you change Lambda configuration such as environment variables, memory, timeout, packaging settings, or VPC settings.

## Related commands

- [`deploy`](/cli/deploy) — full stack deployment. Required to provision a new deployment script or update its configuration (environment, memory, timeout).
- [`script run`](/cli/script-run) — runs a local script defined in your configuration. Unlike `deployment-script run`, local scripts execute on your machine rather than as a Lambda function in AWS.
- [`delete`](/cli/delete) — tears down the entire stack, including any deployment scripts.
