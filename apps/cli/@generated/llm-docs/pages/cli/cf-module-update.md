# cf-module:update

The `cf-module:update` command updates CloudFormation infrastructure module private types in your AWS account to the latest compatible version. Stacktape currently offers updates for `atlasMongo`, `upstashRedis`, and `ecsBlueGreen` CloudFormation private types. Run this command when an upstream API change for one of these modules requires the registration in your account to be updated, or when an error message or Stacktape support explicitly tells you to update a module.

## Usage

```bash
stacktape cf-module:update --region eu-west-1
```

The command is interactive — after running it, you select which module to update from a prompt. There is no CLI flag to specify the module directly, so the command requires interactive terminal input. The three available modules are:

- `atlasMongo`
- `upstashRedis`
- `ecsBlueGreen`

Once you select a module, Stacktape initializes the CloudFormation registry, loads private types and packages for the selected module, and registers the newest available private type version.


> **Info:** This command updates the CloudFormation private type registration in your AWS account for a specific region. If you use the same module in multiple regions, run the command once per region.


## Arguments reference


## CLI Options: `stacktape stack update-modules`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |


## Examples

Update modules in `us-east-1`.

```bash
stacktape cf-module:update --region us-east-1
```

Specify an AWS profile with the `--profile` argument.

```bash
stacktape cf-module:update --region eu-west-1 --profile my-aws-profile
```

Enable debug logging to troubleshoot registration failures.

```bash
stacktape cf-module:update --region eu-west-1 --logLevel debug
```

## Related commands

- [`deploy`](/cli/deploy) — deploy your stack, which uses the module types registered in your account
- [`cf:rollback`](/cli/cf-rollback) — roll back a CloudFormation stack to the last known good state if an update fails
- [`synth`](/cli/synth) — compile your Stacktape config into a CloudFormation template before deployment
