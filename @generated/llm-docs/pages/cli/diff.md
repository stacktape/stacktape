# diff

The `diff` command shows what would change in your deployed stack if you ran [`deploy`](/cli/deploy) with your current configuration. It packages workloads, uploads the synthesized CloudFormation template, and creates a change set against the live stack to print a summary of new, updated, replaced, and removed resources. The change set is not executed — no stack resources are modified.

## Usage

```bash
stacktape diff --stage production --region eu-west-1
```

The `diff` command requires a deployed stack for the target stage and region. Use it after at least one successful [`deploy`](/cli/deploy).

## How it works

Stacktape performs the full deployment preparation pipeline — packaging workloads, resolving resources, synthesizing the CloudFormation template — then creates a CloudFormation change set against the currently deployed stack. The change set reveals which resources AWS would create, update, replace, or delete.

Before showing results, Stacktape normalizes the diff to filter out internal runtime churn and dependency-only changes so the output reflects only changes you care about. If CloudFormation reports changes but all of them are internal noise, the output says "no meaningful Stacktape resource changes detected" rather than showing a misleading list.

Each changed resource is categorized:

| Symbol | Label | Meaning |
|--------|-------|---------|
| `+` | new | Resource will be created |
| `~` | updated | Resource will be updated in place |
| `!` | replaced | Resource will be destroyed and recreated |
| `-` | removed | Resource will be deleted |

For resources that will be replaced, the output distinguishes between **will replace** (CloudFormation guarantees replacement) and **may replace** (replacement depends on runtime conditions). Replacement means downtime for that resource — watch for these before deploying to a production stage.


> **Warning:** Replaced resources are destroyed and recreated. For databases or stateful resources, replacement can cause data loss. Always review `diff` output before deploying changes that touch database engines, instance classes, or storage configuration.


## Important flags

**`--stage`** (required) — the stage to diff against. Must match a previously deployed stack.

**`--region`** (required) — the AWS region where the stack is deployed.

**`--configPath`** — path to your Stacktape configuration file, relative to the current working directory.

**`--preserveTempFiles`** — keeps the synthesized CloudFormation template and packaged artifacts in `.stacktape/[invocation-id]` after the command finishes. Useful for inspecting exactly what Stacktape generated.

**`--agent`** — selects agent-oriented output (implies `--outputFormat jsonl`). Each resource change prints a primary line (symbol, name, type, action label) plus optional sub-lines for highlights, will-replace, and may-replace properties.

**`--profile`** — the AWS profile to use. Manage profiles with [`aws-profile:create`](/cli/aws-profile-create) and set a default with [`defaults:configure`](/cli/defaults-configure).

## Examples

Preview changes to a staging stack:

```bash
stacktape diff --stage staging --region us-east-1
```

Preview changes using a specific config file and AWS profile:

```bash
stacktape diff --stage production --region eu-west-1 --configPath ./infra/stacktape.ts --profile my-aws-profile
```

Preview changes and keep the generated template for inspection:

```bash
stacktape diff --stage dev --region us-west-2 --preserveTempFiles
```

Use agent mode for machine-readable output:

```bash
stacktape diff --stage production --region eu-west-1 --agent
```

## Reading the output

A typical diff output looks like this:

```
Meaningful Stacktape resource changes

~ myApi (lambda-function) - updated
    Changes: Lambda: Code, Handler; IAM Role: Policy

+ analyticsDb (dynamo-db-table) - new

✓ PREVIEW COMPLETE: 1 new, 1 updated
```

When no resources change, the output is:

```
✓ NO CHANGES DETECTED
```

When CloudFormation detects only internal changes that Stacktape filters out, the output includes an explanatory message before the final summary:

```
Meaningful Stacktape resource changes

· No meaningful Stacktape resource changes detected
  CloudFormation only reported internal runtime churn or dependency re-evaluation.

✓ NO MEANINGFUL STACKTAPE RESOURCE CHANGES
```


> **Tip:** Run `diff` before every production deployment. It takes a few seconds and can catch unintended changes — especially resource replacements — before they affect live traffic.


## Command reference


## CLI Options: `stacktape diff`

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
| `--preserveTempFiles (-ptf)` | no | `boolean` | Preserve Temporary Files If `true`, preserves the temporary files generated by the operation, such as the CloudFormation template and packaged resources. These files are saved to `.stacktape/[invocation-id]`. | - |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Related commands

- [`deploy`](/cli/deploy) — apply the changes that `diff` previewed.
- [`synth`](/cli/synth) — compile your configuration to a CloudFormation template without creating a change set. Useful for inspecting the raw template.
- [`validate`](/cli/validate) — validate your configuration and optionally the synthesized template, without packaging or diffing.
- [`rollback`](/cli/rollback) — revert to a previous deployment version if a deploy introduced problems.

## FAQ

### Does diff make any changes to my stack?

The `diff` command does not modify your deployed infrastructure. It is initialized as a non-stack-modifying command — it packages workloads, uploads the synthesized template, validates it, and asks CloudFormation for a change set preview. The change set is not executed and no stack updates are applied.

### What does "no meaningful Stacktape resource changes" mean?

CloudFormation sometimes reports changes to internal bookkeeping resources. Stacktape normalizes the diff to filter out internal runtime churn and dependency-only changes. When all reported changes are internal noise, you see this message instead of a misleading change list.

### How do I get machine-readable diff output for scripts or PR comments?

Use `--agent` (which implies `--outputFormat jsonl`) for NDJSON, or `--outputFormat plain` for plain text. In agent mode each resource change prints a primary line with a symbol (`+`, `~`, `!`, `-`), resource name, type, and action label, plus optional sub-lines for highlights, will-replace, and may-replace properties — straightforward to parse in scripts or surface in pull request comments.

### What is the difference between "will replace" and "may replace"?

"Will replace" means CloudFormation guarantees the resource will be destroyed and recreated — this is a breaking change. "May replace" means replacement depends on runtime conditions (such as whether the new property value differs from the current one in a way that requires replacement). Both deserve attention before deploying to production.

### How is diff different from synth?

[`synth`](/cli/synth) compiles your configuration into a CloudFormation template and saves it to disk. It does not compare against a deployed stack. `diff` goes further: it packages workloads, synthesizes the template, then creates a change set against the live stack to show exactly what would change. Use `synth` to inspect the template; use `diff` to understand the deployment impact.

### Does diff require an already deployed stack?

Yes. The command is initialized as requiring a deployed stack, so use it after at least one successful [`deploy`](/cli/deploy) for the target stage and region. For a first deployment, use `deploy` directly — there is nothing to diff against.
