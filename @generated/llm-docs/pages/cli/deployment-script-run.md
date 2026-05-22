# deployment-script:run

The `deployment-script:run` command re-packages and invokes a single [deployment script](/resources/advanced/deployment-scripts) without running a full [deploy](/cli/deploy). Use it to iterate on script logic — fix a migration, adjust a seed routine, or re-run a post-deploy step — without waiting for a complete stack update.

## What it does

When you run `deployment-script:run`, Stacktape performs a targeted update:

1. Rebuilds the script's Lambda function code from your local source.
2. Uploads and hot-swaps the new code onto the existing Lambda.
3. Invokes the function with the `parameters` defined in your configuration (resolved locally).
4. Prints the function's response payload — or the error — to your terminal.


> **Warning:** This command only updates the script's **source code**. Changes to environment variables, memory, timeout, VPC settings, or any other configuration require a full [`deploy`](/cli/deploy).


## Usage

```bash
stacktape deployment-script:run --stage production --region eu-west-1 --resourceName runMigrations
```

The three required flags identify which deployed script to target:

- **`--stage`** — the stage where the script is deployed (e.g. `production`, `staging`, `dev`).
- **`--region`** — the AWS region of the stack.
- **`--resourceName`** — the name of the deployment script resource in your Stacktape configuration.

## Prerequisites

The deployment script must already exist in your configuration **and** be deployed to the target stack. If either condition is not met, the command fails:

- **Not in config** — Stacktape returns a `NON_EXISTING_RESOURCE` error indicating the resource is not defined in your configuration file. Add the resource and run [`deploy`](/cli/deploy) first.
- **Not deployed** — Stacktape returns a `NON_EXISTING_RESOURCE` error indicating the resource has not been deployed to the stack. Run [`deploy`](/cli/deploy) to provision it before using this command.

## Examples

Re-run a database migration script against a staging stack:

```bash
stacktape deployment-script:run --stage staging --region us-east-1 --resourceName runMigrations
```

Re-run a seed script with debug-level logging to inspect the full invocation flow:

```bash
stacktape deployment-script:run --stage dev --region eu-west-1 --resourceName seedData --logLevel debug
```

Point to a non-default config file location:

```bash
stacktape deployment-script:run --stage production --region us-west-2 --resourceName postDeployHook --configPath ./infra/stacktape.ts
```

## When to use this vs deploy

Use `deployment-script:run` when you are iterating on the script's handler code and want fast feedback — the command skips CloudFormation entirely, so turnaround is seconds rather than minutes. Switch to a full [`deploy`](/cli/deploy) when you change anything besides the script's source code (environment variables, memory, timeout, packaging settings, parameters, or VPC configuration).

## Arguments reference


## CLI Options: `stacktape deployment-script:run`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--region (-r)` | yes | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--resourceName (-rn)` | yes | `string` | Resource Name The name of the resource as defined in your Stacktape configuration. | - |
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


## Related commands

- [`deploy`](/cli/deploy) — full stack deployment. Required to provision a new deployment script or update its configuration (environment, memory, timeout).
- [`script:run`](/cli/script-run) — runs a local script defined in your configuration. Unlike `deployment-script:run`, local scripts execute on your machine rather than as a Lambda function in AWS.
- [`delete`](/cli/delete) — tears down the entire stack, including any deployment scripts.
