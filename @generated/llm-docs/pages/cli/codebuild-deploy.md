# codebuild:deploy

The `codebuild:deploy` command prepares your deployment locally — validating configuration, resolving resources, and creating secrets — then archives your project, uploads it to S3, and runs the deploy step in AWS CodeBuild. Use it when local builds are slow, resource-constrained, or when you need a clean, reproducible build environment inside your AWS account.

AWS CodeBuild charges per build-minute based on the configured compute type. Check [AWS CodeBuild pricing](https://aws.amazon.com/codebuild/pricing/) for your region.

## How it works


## Flow
1. **Validate & resolve**: Configuration is validated, resources are resolved, and secrets are created — all locally on your machine.
2. **Archive & upload**: Your project is archived using git and uploaded to an S3 bucket in your AWS account.
3. **Deploy in CodeBuild**: A CodeBuild environment is provisioned in your AWS account. The deployment runs inside it while logs stream to your terminal.


Configuration errors, missing secrets, and guardrail violations surface immediately during the local phase — before any CodeBuild resources are provisioned. After the CodeBuild build starts, the local CLI polls the build status and streams CloudWatch logs to your terminal until the build succeeds or fails.


> **Warning:** The `--showSensitiveValues` flag is forced to `false` inside the CodeBuild environment to prevent credentials from appearing in streamed build logs.


## When to use

Use `codebuild:deploy` instead of [`deploy`](/cli/deploy) when:

- **Your machine is resource-constrained** — Docker builds for large container workloads can exhaust local RAM or CPU.
- **You need faster image pushes** — CodeBuild runs inside AWS, so pushing container images to ECR is significantly faster than from a local machine on a slow connection.
- **You want a clean build environment** — eliminates "works on my machine" issues caused by local Docker cache, OS differences, or toolchain versions.
- **CI/CD pipelines** — when your CI runner lacks Docker or has insufficient resources. See [build runners](/ci-cd-and-gitops/build-runners) for the full comparison.

## When NOT to use

For most development workflows where builds are fast and your internet connection is decent, the standard [`deploy`](/cli/deploy) command is simpler. It avoids the overhead of provisioning a CodeBuild environment, archiving and uploading your project, and the per-build-minute cost. If your project has no Docker builds or only small Lambda functions, `deploy` finishes faster.

## Usage

```bash
stacktape codebuild:deploy --stage production --region eu-west-1
```

With a custom config path:

```bash
stacktape codebuild:deploy --stage staging --region us-east-1 --configPath ./infra/stacktape.ts
```

Skip the confirmation prompt (required for non-interactive environments like CI):

```bash
stacktape codebuild:deploy --stage production --region eu-west-1 --autoConfirmOperation
```

The most commonly used flags are `--stage` and `--region` (both required), `--configPath` for non-default config file locations, and `--autoConfirmOperation` for CI/CD pipelines. The `--noCache`, `--disableAutoRollback`, and `--disableDockerRemoteCache` flags are useful for troubleshooting. See the full arguments reference below for all available options.

## Arguments reference


## CLI Options: `stacktape codebuild:deploy`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--autoConfirmOperation (-aco)` | no | `boolean` | Auto-Confirm Operation If `true`, automatically confirms prompts during `deploy` or `delete` operations, skipping the manual confirmation step. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--disableAutoRollback (-dar)` | no | `boolean` | Disable Auto-Rollback If `true`, disables automatic rollback on deployment failure.

**With auto-rollback (default):** If a deployment fails, the stack is automatically rolled back to the last known good state.
**Without auto-rollback:** If a deployment fails, the stack remains in the `UPDATE_FAILED` state. You can then either fix the issues and redeploy or manually roll back using the `stacktape rollback` command. | - |
| `--disableDockerRemoteCache (-drc)` | no | `boolean` | Disable Docker Remote Cache Disables Docker layer caching using ECR as remote cache storage. By default, remote caching is enabled to speed up Docker builds by reusing layers. Set to `true` to disable remote caching. | - |
| `--disableDriftDetection (-ddd)` | no | `boolean` | Disable Drift Detection Disables detection of manual changes (drift) made to the stack outside of CloudFormation (e.g., via the AWS console or CLI). By default, Stacktape blocks updates to a stack that has drifted. | - |
| `--disableLayerOptimization (-dlo)` | no | `boolean` | Disable Layer Optimization If `true`, disables the shared Lambda layer optimization. By default, Stacktape extracts shared code into Lambda layers to reduce deployment size. Use this flag to bundle all code directly into each Lambda function. | - |
| `--dockerArgs (-da)` | no | `array` | Docker Arguments Additional arguments to pass to the `docker run` or `docker build` commands. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--hotSwap (-hs)` | no | `boolean` | Hotswap If `true`, attempts a faster deployment for code-only changes by updating `functions` and `multi-container-workloads` directly, without using CloudFormation. This is recommended only for development stacks. Hotswap will only be used if all stack changes are hot-swappable. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--noCache (-nc)` | no | `boolean` | No Cache If `true`, disables the use of cached artifacts and forces a fresh build of compute resources. | - |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--preserveTempFiles (-ptf)` | no | `boolean` | Preserve Temporary Files If `true`, preserves the temporary files generated by the operation, such as the CloudFormation template and packaged resources. These files are saved to `.stacktape/[invocation-id]`. | - |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--showSensitiveValues (-ssv)` | no | `boolean` | Show Sensitive Values If `true`, includes sensitive values in the output of the `info:stack` and `deploy` commands. Be cautious when using this flag, as mishandling sensitive data can create security risks. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Examples

Deploy a production stage to EU West:

```bash
stacktape codebuild:deploy --stage production --region eu-west-1
```

Deploy with a fresh build (no cache) for troubleshooting packaging or dependency issues:

```bash
stacktape codebuild:deploy --stage staging --region us-east-1 --noCache
```

Deploy without auto-rollback to inspect the stack state after a failure:

```bash
stacktape codebuild:deploy --stage dev --region eu-west-1 --disableAutoRollback
```

Use machine-readable output in a CI pipeline:

```bash
stacktape codebuild:deploy --stage production --region eu-west-1 --agent
```

## Related commands

- [`deploy`](/cli/deploy) — Deploy from your local machine. Simpler when builds are fast and bandwidth is sufficient.
- [`preview-changes`](/cli/preview-changes) — Preview what a deployment would change before running it.
- [`delete`](/cli/delete) — Remove a deployed stack.

## FAQ

### When should I use codebuild:deploy instead of deploy?

Use `codebuild:deploy` when your local machine is slow to build Docker images, has limited RAM, or has a slow upload connection to ECR. The CodeBuild environment runs inside AWS, so container image pushes are fast. For quick iterations on small projects with no Docker builds, the standard [`deploy`](/cli/deploy) is simpler and avoids the overhead of provisioning a CodeBuild environment and archiving your project.

### Does codebuild:deploy cost extra?

Yes. AWS CodeBuild charges per build-minute based on the compute type provisioned for the build environment. Builds that complete in under 1 minute are rounded up to 1 minute. CodeBuild adds AWS build-minute charges on top of the standard AWS resource costs, so it is usually worth using when remote builds save meaningful local time or CI complexity. Check [AWS CodeBuild pricing](https://aws.amazon.com/codebuild/pricing/) for current rates in your region.

### What happens if the CodeBuild deployment fails?

By default, the stack automatically rolls back to the last known good state. If you pass `--disableAutoRollback`, the stack stays in `UPDATE_FAILED` state so you can inspect what went wrong. Use [`cf:rollback`](/cli/cf-rollback) to recover manually, or fix the issue and redeploy. The CLI streams the CodeBuild logs so you can see the failure reason directly in your terminal.

### How does the project get uploaded to CodeBuild?

Stacktape creates a git archive (zip) of your project and uploads it to an S3 bucket in your AWS account. If S3 Transfer Acceleration is available in your deployment region, it uses accelerated uploads for faster transfer. The CodeBuild environment then downloads and extracts this archive before running the deployment.

### Can I use codebuild:deploy in CI/CD pipelines?

Yes. Pass `--autoConfirmOperation` to skip the interactive confirmation prompt. You can also use `--agent` for machine-readable JSONL output that's suitable for programmatic consumption. See [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) for pipeline integration patterns and [build runners](/ci-cd-and-gitops/build-runners) for comparing CodeBuild with other runner options.

### Can I stop a running CodeBuild build?

The CodeBuild build runs in your AWS account independently from the local CLI process. After the build starts, the CLI polls the build status and streams CloudWatch logs. To stop a running build, use the AWS Console or AWS CLI to stop the CodeBuild build directly. The stack will remain in whatever state it was in when the build was stopped.

### What gets validated before the CodeBuild build starts?

Stacktape validates your configuration, resolves all resources, checks guardrails, and ensures required secrets and SSM parameters exist — all locally before starting the CodeBuild build. This means configuration errors, missing secrets, and guardrail violations surface immediately rather than after waiting for the remote environment to provision.

### How does codebuild:deploy compare to using a full CI/CD pipeline?

The `codebuild:deploy` command is a single-command way to run your deployment remotely. For automated deployments on every push, consider [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) or a [custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) pipeline. `codebuild:deploy` is a good fit when you want the benefits of a remote build environment without setting up a full CI pipeline — for example, during manual production deploys from a developer's machine.

### Does codebuild:deploy accept the same flags as deploy?

The `codebuild:deploy` command accepts the same deployment-oriented flags as [`deploy`](/cli/deploy), including `--hotSwap`, `--noCache`, `--disableAutoRollback`, `--disableDockerRemoteCache`, and `--disableLayerOptimization`. These flags are forwarded to the remote deploy command running inside CodeBuild. See the arguments reference above for the complete list.
