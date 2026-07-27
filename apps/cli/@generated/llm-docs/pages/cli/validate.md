# validate

The `stacktape validate` command loads your Stacktape configuration, resolves resources, and synthesizes the CloudFormation template in memory — without writing deployment artifacts or modifying AWS resources. With `--thorough`, it also submits the synthesized template to AWS CloudFormation for server-side validation. Use it to catch config errors before deploying.

## Usage

The `validate` command requires a stage and region. It checks your configuration file, resolves all resource definitions, validates configured [guardrails](/guardrails/overview), and synthesizes the CloudFormation template in memory.

```bash
stacktape validate --stage dev --region eu-west-1
```

The command does not create, update, or delete any AWS resources and does not require a deployed stack.

## Validation levels

The `validate` command supports three levels of thoroughness, each building on the previous one. Choose the level that matches how much confidence you need before proceeding.

### Default — config, resources, and template

Stacktape loads the configuration, resolves all resources, validates [guardrails](/guardrails/overview), and synthesizes the CloudFormation template in memory. This is the fastest option and catches most configuration-level mistakes — broken resource references, invalid property values, and guardrail violations.

```bash
stacktape validate --stage dev --region eu-west-1
```

### With packaging — add `--withPackage`

The `--withPackage` flag runs workload packaging as part of validation. Stacktape packages all Lambda functions and container workloads, which catches packaging errors surfaced by the normal packaging step — such as missing entry files or misconfigured build settings. Use this when you have changed packaging settings or entry file paths.

```bash
stacktape validate --stage dev --region eu-west-1 --withPackage
```

### Thorough — add `--thorough`

The `--thorough` flag runs the most complete validation path. It includes everything from `--withPackage` and additionally submits the synthesized CloudFormation template to AWS for server-side validation. CloudFormation validates the template and returns any template validation errors before any stack is created or updated. This requires AWS credentials for the CloudFormation `ValidateTemplate` API call but does not create or modify any stack.

```bash
stacktape validate --stage dev --region eu-west-1 --thorough
```


> **Info:** The `--thorough` flag implies `--withPackage`. You do not need to pass both.


## When to use validate

The `validate` command is a fast pre-deploy check that confirms your configuration synthesizes correctly. Use it when you want a validation gate instead of a written template file.

- **Before deploying.** Run `stacktape validate` to catch configuration errors in seconds without waiting for a full CloudFormation deployment to fail.
- **In CI pipelines.** Add `validate` (or `validate --thorough`) as a CI step on pull requests. This prevents broken configs from reaching [`deploy`](/cli/deploy).
- **After config refactors.** When you reorganize resources, rename stages, or change packaging modes, `validate` confirms the config still synthesizes correctly.

## When NOT to use validate

The `validate` command produces only a pass/fail result. If you need to inspect the generated CloudFormation template, use [`synth`](/cli/synth) instead — it writes the compiled template to a file. If you need to see what a deploy would change against a live stack, use [`diff`](/cli/diff).

## Important flags

| Flag | What it does |
|------|-------------|
| `--withPackage` | Runs workload packaging as part of validation, catching packaging errors for Lambda functions and container workloads. |
| `--thorough` | Validates packaging and submits the template to AWS CloudFormation for server-side validation. Implies `--withPackage`. Requires AWS credentials. |
| `--stage` | Required. The stage name used for template synthesis (e.g., `dev`, `staging`, `production`). |
| `--region` | Required. The AWS region used for template synthesis. |
| `--configPath` | Path to your Stacktape configuration file if it is not in the default location. |
| `--agent` | Optimizes CLI output for programmatic/LLM consumption. Uses JSONL/NDJSON output and disables the interactive terminal UI. |

## Examples

Validate config for a production stage in `us-east-1`.

```bash
stacktape validate --stage production --region us-east-1
```

Validate with a specific config file path.

```bash
stacktape validate --stage dev --region eu-west-1 --configPath ./infra/stacktape.ts
```

Run the most thorough validation, including packaging and CloudFormation template validation, before merging a pull request.

```bash
stacktape validate --stage ci --region eu-west-1 --thorough
```

Use JSONL output for CI or AI-agent consumption.

```bash
stacktape validate --stage dev --region eu-west-1 --agent
```

## Flags reference


## CLI Options: `stacktape validate`

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
| `--thorough` | no | `boolean` | Thorough If `true`, runs the most complete validation path: validates workload packaging and asks AWS CloudFormation to validate the synthesized template. | - |
| `--withPackage` | no | `boolean` | With Package If `true`, validates workload packaging in addition to resolving the configuration and template. | - |


## Related commands

- [`synth`](/cli/synth) — compiles the configuration into a CloudFormation template and writes it to a file. Use `synth` when you need to inspect the generated template; use `validate` when you want a validation gate instead of a written template file.
- [`diff`](/cli/diff) — shows a preview of changes that would be applied to a deployed stack. Requires a deployed stack, unlike `validate`.
- [`deploy`](/cli/deploy) — deploys or updates a stack. Running `validate` before `deploy` catches errors before they reach CloudFormation.
- [`package`](/cli/package) — packages workloads and writes artifacts to disk. The `--withPackage` flag on `validate` runs workload packaging as part of validation, while `package` is the dedicated command for preparing packaged outputs for inspection or deployment.

## FAQ

### Does validate create or modify any AWS resources?

No. The `validate` command does not create, update, or delete any AWS resources and does not require a deployed stack. The only AWS API call it makes is when `--thorough` is used — CloudFormation's `ValidateTemplate` API checks the template structure without creating a stack.

### How is validate different from synth?

Both commands synthesize a CloudFormation template from your configuration. The difference is that [`synth`](/cli/synth) writes the compiled template to a file (default `compiled-template.yaml`), while `validate` does not write deployment artifacts and produces only a pass/fail result. Use `validate` in CI gates; use `synth` when you need to inspect or store the template.

### Do I need AWS credentials to run validate in CI?

Only for `--thorough`. The default and `--withPackage` levels run entirely locally — they synthesize the template in memory and never call AWS, so they work in CI without credentials and make a good lightweight pre-merge gate. `--thorough` calls the CloudFormation `ValidateTemplate` API and therefore requires valid AWS credentials in the CI environment.

### What errors does --thorough catch that the default level misses?

The default validation catches configuration-level problems: broken references, invalid property values, guardrail violations, and template synthesis errors. The `--thorough` flag submits the synthesized template to CloudFormation for server-side validation, which can catch template-level structural problems that only CloudFormation's validator surfaces. The tradeoff is an AWS API call and the need for credentials. Note that even `--thorough` only validates the template — it cannot catch errors that surface during actual provisioning, which is what [`diff`](/cli/diff) and [`deploy`](/cli/deploy) reveal against a live stack.

### Can I use validate with AI agents or in scripts?

Yes. Pass `--agent` to optimize CLI output for programmatic or LLM consumption. This flag uses JSONL/NDJSON output (one JSON object per line) and disables the interactive terminal UI. You can also use `--outputFormat jsonl` for machine-readable output without the other `--agent` behaviors.
