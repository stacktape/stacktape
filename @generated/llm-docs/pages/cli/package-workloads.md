# package-workloads

The `package-workloads` command packages compute resources defined in your Stacktape configuration and prepares them for deployment — without running a deploy. Use it to inspect packaged artifacts before committing to a full [`deploy`](/cli/deploy), or to isolate packaging behavior when troubleshooting build failures.

## Usage

```bash
stacktape package-workloads --stage dev --region eu-west-1
```

The command loads credentials and target stack information, initializes the Stacktape configuration, and packages compute resources through Stacktape's packaging manager. No deploy operation is performed.

Both `--stage` and `--region` are required. Stacktape needs them to identify the target stack context before packaging.

## CLI reference


## CLI Options: `stacktape package-workloads`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
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
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Examples

Package compute resources for a staging stage.

```bash
stacktape package-workloads --stage staging --region eu-west-1
```

Point to a non-default config file with `--configPath`.

```bash
stacktape package-workloads --stage prod --region us-east-1 --configPath ./infra/stacktape.ts
```

Use `--profile` to authenticate with a specific AWS profile.

```bash
stacktape package-workloads --stage dev --region eu-west-1 --profile my-aws-profile
```

Use `--logLevel debug` for detailed CLI debugging output.

```bash
stacktape package-workloads --stage dev --region eu-west-1 --logLevel debug
```

Use machine-readable JSONL output for CI integration.

```bash
stacktape package-workloads --stage dev --region eu-west-1 --outputFormat jsonl
```


> **Info:** The `package-workloads` command passes `commandCanUseCache: false` to the packaging manager, so the command-level packaging cache is not used.


## When to use

Run `package-workloads` when you want to inspect packaged artifacts before deploying. Common scenarios:

- **Debugging packaging issues.** If a [`deploy`](/cli/deploy) fails during the build phase, isolate the packaging step to troubleshoot without waiting for the rest of the deploy flow.
- **CI artifact inspection.** Package first, run checks on the artifacts, then deploy in a separate step.
- **Verifying packaging configuration.** Confirm that your packaging settings produce the expected output before triggering a full deployment.

## Related commands

- [`deploy`](/cli/deploy) — package and deploy your stack to AWS in one step.
- [`compile-template`](/cli/compile-template) — compile your Stacktape configuration into a CloudFormation template without deploying.
- [`preview-changes`](/cli/preview-changes) — preview what a deployment would change in your stack.

## FAQ

### What does package-workloads actually do?

The command loads your AWS credentials and target stack information, initializes the Stacktape configuration, and runs the packaging manager against compute resources in your config. It does not perform a deploy operation — it stops after packaging is complete.

### When should I use package-workloads instead of just running deploy?

Use `package-workloads` when you want to verify the packaging step in isolation. This is helpful when debugging build failures, when you want to inspect artifacts in a CI pipeline before deploying, or when you want faster iteration on packaging configuration without waiting for the full deploy cycle.

### Does package-workloads require a deployed stack?

The command requires `--stage` and `--region` to identify the target stack context, but it does not create or update any deployed infrastructure. It only runs the packaging step.

### Can I package only specific workloads?

The command's implementation supports selecting specific workloads for packaging. By default, all compute resources in your configuration are packaged.

### What's the difference between package-workloads and compile-template?

[`package-workloads`](/cli/package-workloads) runs the packaging manager to build compute resource artifacts. [`compile-template`](/cli/compile-template) compiles your Stacktape configuration into a CloudFormation template. They serve different verification purposes — one checks your build output, the other checks your infrastructure template.

### Can I use package-workloads in a CI pipeline?

Yes. Use `--outputFormat jsonl` for machine-readable output and `--profile` or `--awsAccount` to control authentication. This lets you run packaging as a discrete CI step, inspect results, and then deploy separately.
