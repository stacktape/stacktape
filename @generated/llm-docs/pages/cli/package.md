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
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


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

### Does `package` require AWS credentials even though it doesn't deploy?

Yes. Even though `package` never touches your stack, it loads user credentials and target stack information during initialization, so valid credentials are required. Use `--profile` to specify an AWS profile or `--awsAccount` to use a connected AWS account. Use [`aws-profile:create`](/cli/aws-profile-create) to set up a profile if you haven't already.

### Can I package only specific workloads?

By default, the `package` command packages all compute resources in your configuration. To target a subset, pass `--onlyWorkloads` with a comma-separated list of workload names (for example, `--onlyWorkloads myFunction,myContainer`). Other workloads are skipped.

### What is the difference between `package` and `synth`?

[`synth`](/cli/synth) compiles your Stacktape configuration into a CloudFormation template — it produces the infrastructure definition but does not build any application code. `package` is the inverse: it builds your compute resources (according to each resource's [packaging mode](/packaging/overview)) but does not produce the infrastructure template. Run both before a deploy when you want a complete pre-deploy review.
