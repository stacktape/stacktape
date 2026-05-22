# cf-module:update

The `cf-module:update` command updates CloudFormation infrastructure module private types in your AWS account to the latest compatible version. Stacktape uses these modules to integrate third-party services — MongoDB Atlas, Upstash Redis, and ECS Blue/Green deployments — into your stack. Run this command when a third-party API changes and your modules need a newer version.

## Usage

```bash
stacktape cf-module:update --region eu-west-1
```

The command is interactive. After running it, you select which module to update from a prompt. The three available modules are:

- **atlasMongo** — the CloudFormation type backing [MongoDB Atlas clusters](/resources/databases/mongodb-atlas)
- **upstashRedis** — the CloudFormation type backing [Upstash Redis](/resources/databases/upstash-redis) resources
- **ecsBlueGreen** — the CloudFormation type supporting ECS Blue/Green deployments

Once you select a module, Stacktape initializes the CloudFormation registry, loads the current private types, and registers the newest available version.

## When to use

Run `cf-module:update` when:

- A [deploy](/cli/deploy) fails because a third-party module type is outdated or incompatible with an upstream API change.
- You receive errors related to CloudFormation private type registration during deployment of MongoDB Atlas, Upstash Redis, or ECS Blue/Green resources.
- You want to proactively update module types before deploying, for example after Stacktape announces a new module version.

You do not need to run this command regularly. Module types only need updating when the upstream provider's API changes in a way that requires a new CloudFormation type version.


> **Info:** This command updates the CloudFormation private type registration in your AWS account for a specific region. If you use the same module in multiple regions, run the command once per region.


## Examples

Update modules in `us-east-1`.

```bash
stacktape cf-module:update --region us-east-1
```

Use a specific AWS profile for credentials.

```bash
stacktape cf-module:update --region eu-west-1 --profile my-aws-profile
```

Enable debug logging to troubleshoot registration failures.

```bash
stacktape cf-module:update --region eu-west-1 --logLevel debug
```

## Arguments reference


## CLI Options: `stacktape cf-module:update`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |


## Related commands

- [`deploy`](/cli/deploy) — deploy your stack, which uses the module types registered in your account
- [`cf:rollback`](/cli/cf-rollback) — roll back a CloudFormation stack to the last known good state if an update fails
- [`compile-template`](/cli/compile-template) — compile your Stacktape config into a CloudFormation template to inspect which module types are referenced
