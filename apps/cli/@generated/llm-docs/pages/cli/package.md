# package

The `package` command packages your compute resources and prepares them for deployment without actually deploying. Use it to run the same packaging step that [`deploy`](/cli/deploy) uses — useful for catching packaging or build failures early, before committing to a full deployment.

## Usage

```bash
stacktape package --stage dev --region eu-west-1
```

The command loads your Stacktape configuration, initializes packaging, and packages all compute resources for the target stack. A valid Stacktape configuration file is required — by default Stacktape looks for one in the current directory.

To use a configuration file in a different location, pass `--configPath`.

```bash
stacktape package --stage dev --region eu-west-1 --configPath ./infra/stacktape.ts
```


> **Info:** The `package` command runs packaging with caching disabled, so every invocation produces a fresh build from the current state of your source code.


## Examples

Package all compute resources for a staging stage in `us-east-1`:

```bash
stacktape package --stage staging --region us-east-1
```

Package with debug logging to see detailed build output:

```bash
stacktape package --stage dev --region eu-west-1 --logLevel debug
```

Package using a specific AWS profile:

```bash
stacktape package --stage prod --region eu-west-1 --profile my-aws-profile
```

Package using a configuration file in a subdirectory:

```bash
stacktape package --stage dev --region eu-west-1 --configPath ./infra/stacktape.ts
```

## Command reference


## CLI Options: `stacktape package`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. The maximum length is 12 characters. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--only-workloads` | no | `array` | Only Workloads — Package only the specified workloads. Provide a comma-separated list of workload names to package. Other workloads will be skipped. Example: `--only-workloads myFunction,myContainer`. | - |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. | - |


## Related commands

- [`deploy`](/cli/deploy) — creates or updates your stack on AWS. Use `deploy` when you want to deploy; `package` runs the packaging step independently.
- [`synth`](/cli/synth) — compiles your configuration into a CloudFormation template without packaging compute resources. Use `synth` when you only need to inspect the infrastructure template.
- [`validate`](/cli/validate) — validates your configuration and optionally includes workload packaging checks with `--withPackage`.
- [`diff`](/cli/diff) — previews what would change in your stack if you deployed. Useful alongside `package` for a full pre-deploy review.

## FAQ

### When should I use `package` instead of just running `deploy`?

Use `package` when you want to verify that your compute resources package correctly before committing to a deployment — for example, catching build errors, confirming dependencies resolve, or validating that container images build successfully. In normal workflows, [`deploy`](/cli/deploy) handles packaging as part of its pipeline, so `package` is primarily a pre-deploy verification tool.

### How is `package` different from `validate --withPackage`?

[`validate`](/cli/validate) validates your configuration, resolves resources, and synthesizes the CloudFormation template in memory. Adding `--withPackage` also validates workload packaging. Use `validate --withPackage` when you want configuration validation combined with packaging checks. Use `package` when you specifically want to run the packaging step on its own.

### Does `package` use caching?

No. The `package` command runs packaging with caching disabled, so every invocation produces a fresh build from the current state of your source code. This ensures the output accurately reflects your code at the time of the run.

### Does `package` require AWS credentials?

Only when your configuration reads something from AWS. `package` builds on your machine, so a typical project packages without AWS credentials and without any request to AWS. Credentials are loaded when packaging needs them: for a directive such as [`$Secret`](/configuration/directives), `$StackOutput` or `$AwsAccountId`, or for a web framework build whose environment references deployed resources. Stacktape then uses the profile selected with `--profile` or `AWS_PROFILE`, or the standard AWS credential chain.

### Can I package only specific workloads?

By default, the `package` command packages all compute resources in your configuration. To target a subset, pass `--onlyWorkloads` with a comma-separated list of workload names (for example, `--onlyWorkloads myFunction,myContainer`). Other workloads are skipped.

### What is the difference between `package` and `synth`?

[`synth`](/cli/synth) compiles your Stacktape configuration into a CloudFormation template — it produces the infrastructure definition but does not build any application code. `package` is the inverse: it builds your compute resources (according to each resource's [packaging mode](/packaging/overview)) but does not produce the infrastructure template. Run both before a deploy when you want a complete pre-deploy review.
