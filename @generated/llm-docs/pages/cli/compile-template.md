# compile-template

The `compile-template` command compiles your Stacktape configuration into a raw AWS CloudFormation template without deploying anything. Use it to inspect the infrastructure Stacktape will create, audit resources before a deploy, or feed the template into external tools that consume CloudFormation JSON/YAML.

## Usage

```bash
stacktape compile-template --stage dev --region eu-west-1
```

This reads your Stacktape configuration, resolves all resources, and writes the compiled CloudFormation template to `compiled-template.yaml` in the current directory.

## When to use

Compile-template is useful when you need to see the exact CloudFormation resources Stacktape generates from your configuration — before any deployment happens. The command does not require an existing deployed stack and does not modify any AWS resources.

Common scenarios:

- **Auditing infrastructure** — review what AWS resources a config will create before deploying to a shared or production stage.
- **Debugging configuration issues** — if a deploy fails, compile the template locally to inspect the generated CloudFormation and spot misconfigurations.
- **Feeding external tools** — pass the compiled template to CloudFormation linters (cfn-lint), policy-as-code tools (OPA, Checkov), or cost estimators.
- **Comparing stages** — compile templates for two different stages and diff the output to understand what changes between them.

## Important flags

**`--outFile`** controls where the compiled template is written. It defaults to `compiled-template.yaml` in the current working directory. Override it when you want to write to a specific path or filename.

To write the template to a custom path:

```bash
stacktape compile-template --stage dev --region eu-west-1 --outFile ./infra/template-dev.yaml
```

**`--preserveTempFiles`** keeps the intermediate files Stacktape generates during compilation (packaged resources, intermediate templates) in `.stacktape/[invocation-id]`. This is helpful for deep debugging of the compilation pipeline.

```bash
stacktape compile-template --stage dev --region eu-west-1 --preserveTempFiles
```

**`--configPath`** points to a non-default config file location. By default Stacktape looks for `stacktape.ts` (or `stacktape.yml`) in the current directory.

```bash
stacktape compile-template --stage dev --region eu-west-1 --configPath ./config/stacktape.ts
```

## Examples

### Compare templates across stages

Compile templates for two stages and diff them to see what changes between environments.

```bash
stacktape compile-template --stage dev --region eu-west-1 --outFile template-dev.yaml
```

```bash
stacktape compile-template --stage production --region eu-west-1 --outFile template-prod.yaml
```

Then diff the two files with your preferred tool:

```bash
diff template-dev.yaml template-prod.yaml
```

### Lint before deploying

Compile the template and run it through cfn-lint to catch CloudFormation issues before they surface during deployment.

```bash
stacktape compile-template --stage staging --region us-east-1 --outFile compiled.yaml
```

```bash
cfn-lint compiled.yaml
```

## Flags reference


## CLI Options: `stacktape compile-template`

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
| `--outFile (-out)` | no | `string` | Output File The path to the file where the operation output will be saved. | - |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--preserveTempFiles (-ptf)` | no | `boolean` | Preserve Temporary Files If `true`, preserves the temporary files generated by the operation, such as the CloudFormation template and packaged resources. These files are saved to `.stacktape/[invocation-id]`. | - |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Related commands

- [`deploy`](/cli/deploy) — deploy the stack to AWS. Uses the same compilation step internally, then creates or updates the CloudFormation stack.
- [`preview-changes`](/cli/preview-changes) — shows a diff of what would change in your stack without actually deploying. Useful as a next step after inspecting the compiled template.
- [`package-workloads`](/cli/package-workloads) — packages compute resources (Lambda zips, container images) without deploying. Pairs well with `compile-template` when you want to inspect both the template and the build artifacts.

## FAQ

### What format is the compiled template?

The compiled template is written as YAML by default. It is a standard AWS CloudFormation template that can be read by any tool that understands CloudFormation — including the AWS Console, cfn-lint, Checkov, or cost estimation tools.

### Does compile-template deploy anything?

No. The `compile-template` command is strictly local. It reads your Stacktape configuration, resolves all resources, and writes the resulting CloudFormation template to a file. It does not create, update, or delete any AWS resources, and it does not require an already-deployed stack.

### Why do I need to specify --stage and --region if nothing is deployed?

Stacktape uses the stage and region to resolve stage-specific configuration values (like [`$Secret()`](/configuration/directives) references and conditional logic) and to determine region-specific resource settings. The compiled template reflects exactly what would be deployed to that stage and region combination.

### Can I use the compiled template with the AWS CLI or Console?

The output is a valid CloudFormation template, but it may reference Stacktape-managed artifacts (Lambda zips in S3, container images in ECR) that only exist after a full [`deploy`](/cli/deploy). The template is most useful for auditing, linting, and diffing — not for standalone CloudFormation deployments outside of Stacktape.

### How do I diff configuration changes between stages?

Compile templates for each stage into separate files using `--outFile`, then use any diff tool (`diff`, VS Code, or a dedicated CloudFormation diff tool) to compare the outputs. This is the most reliable way to see exactly how two stages diverge at the infrastructure level.

### Can I run compile-template in CI?

Yes. The command works in non-interactive environments and exits with a zero status code on success. Use `--outputFormat plain` or `--agent` for CI-friendly output. This is useful for policy checks — compile the template, then run cfn-lint or OPA against the output as a gate before deploying.
