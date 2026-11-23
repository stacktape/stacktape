# package

`stacktape package` builds your Lambda packages and container images without deploying. It runs the same packaging step as [`deploy`](/cli/deploy), so build errors show up before you deploy.

## Usage

```bash
stacktape package --stage dev --region eu-west-1
```

The command packages every compute resource of the stack. It never uses the packaging cache, so each run builds from the current source. It reads the Stacktape config in the current directory; for one elsewhere, pass `--config`:

```bash
stacktape package --stage dev --region eu-west-1 --config ./infra/stacktape.ts
```

## Examples

Package all compute resources for a staging stage in `us-east-1`:

```bash
stacktape package --stage staging --region us-east-1
```

Package with debug logging to see detailed build output:

```bash
stacktape package --stage dev --region eu-west-1 --debug
```

Package using a specific AWS profile:

```bash
stacktape package --stage prod --region eu-west-1 --profile my-aws-profile
```

## FAQ

### How is `package` different from `validate --with-package`?

[`validate`](/cli/validate) validates your configuration, resolves resources, and synthesizes the CloudFormation template in memory. Adding `--with-package` also validates workload packaging. Use `validate --with-package` when you want configuration validation combined with packaging checks. Use `package` when you specifically want to run the packaging step on its own.

### Does `package` require AWS credentials?

Only when your configuration reads something from AWS. `package` builds on your machine, so a typical project packages without AWS credentials and without any request to AWS. Credentials are loaded when packaging needs them: for a directive such as [`$Secret`](/configuration/directives), `$StackOutput` or `$AwsAccountId`, or for a web framework build whose environment references deployed resources. Stacktape then uses the profile selected with `--profile` or `AWS_PROFILE`, or the standard AWS credential chain.

### Can I package only specific workloads?

By default, the `package` command packages all compute resources in your configuration. To target a subset, pass `--only-workloads` with a comma-separated list of workload names (for example, `--only-workloads myFunction,myContainer`). Other workloads are skipped.

### What is the difference between `package` and `synth`?

[`synth`](/cli/synth) writes the CloudFormation template and builds no application code. `package` builds your code, according to each resource's [packaging mode](/packaging/overview), and writes no template. [`validate --with-package`](/cli/validate#validation-levels) does both checks in one run.

## Options


## CLI Options: `stacktape package`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-r, --region` | yes | `string` | AWS Region — The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). Inside a project whose config declares `region`, the flag is optional and overrides the config. | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `-s, --stage` | yes | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters. The project name, a dash and the stage form the CloudFormation stack name, which can have at most 128 characters. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. Without it, Stacktape uses the one `stacktape.ts`, `stacktape.yml`, `stacktape.yaml` or `stacktape.js` in the working directory. When there are several, the command stops and asks you to choose one with this option. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--only-workloads` | no | `array` | Only Workloads — Package only the specified workloads. Provide a comma-separated list of workload names to package. Other workloads will be skipped. Example: `--only-workloads myFunction,myContainer`. | - |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. Commands that target a stack take it from `projectName` in the project's config when the flag is absent. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`deploy`](/cli/deploy) — creates or updates your stack on AWS. Use `deploy` when you want to deploy; `package` runs the packaging step independently.
- [`synth`](/cli/synth) — compiles your configuration into a CloudFormation template without packaging compute resources. Use `synth` when you only need to inspect the infrastructure template.
- [`validate`](/cli/validate) — validates your configuration and optionally includes workload packaging checks with `--with-package`.
- [`diff`](/cli/diff) — previews what would change in your stack if you deployed. Useful alongside `package` for a full pre-deploy review.
