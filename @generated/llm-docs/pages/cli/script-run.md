# script:run

The `script:run` command executes a script defined in the `scripts` section of your Stacktape configuration. It requires `--scriptName` and `--stage`, accepts additional environment variables via `--env`, and can optionally assume a deployed resource's IAM role with `--assumeRoleOfResource`. Use `script:run` when you need to execute a named script from the `scripts` section without deploying the full stack.

## Usage

```bash
stacktape script:run --scriptName myMigration --stage production
```

`script:run` requires `--scriptName` and `--stage`. Pass `--region` when you do not rely on a configured default (set via [`defaults:configure`](/cli/defaults-configure)).


## CLI Options: `stacktape script:run`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--scriptName (-scn)` | yes | `string` | Script Name The name of the script to run, which must be defined in the `scripts` section of your configuration. | - |
| `--stage (-s)` | yes | `string` | Stage The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults:configure` command. The maximum length is 12 characters. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--assumeRoleOfResource (-aror)` | no | `string` | Assume Role of Resource The name of the deployed resource whose IAM role should be assumed during script execution. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--configPath (-cp)` | no | `string` | Config File Path The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--currentWorkingDirectory (-cwd)` | no | `string` | Current Working Directory The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `--env (-env)` | no | `array` | Environment Variables A list of environment variables for the script, in the format `name=value`. To add multiple variables, use this option multiple times. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |
| `--projectName (-prj)` | no | `string` | Project Name The name of the Stacktape project for this operation. | - |
| `--region (-r)` | no | `string` | AWS Region The AWS region for the operation. For a list of available regions, see the [AWS documentation](https://docs.aws.amazon.com/general/latest/gr/rande.html). | `us-east-2`, `us-east-1`, `us-west-1`, `us-west-2`, `ap-east-1`, `ap-south-1`, `ap-northeast-3`, `ap-northeast-2`, `ap-southeast-1`, `ap-southeast-2`, `ap-northeast-1`, `ca-central-1`, `eu-central-1`, `eu-west-1`, `eu-west-2`, `eu-west-3`, `eu-north-1`, `me-south-1`, `sa-east-1`, `af-south-1`, `eu-south-1` |
| `--templateId (-ti)` | no | `string` | Template ID The ID of the template to download. You can find a list of available templates on the [Config Builder page](https://console.stacktape.com/templates). | - |


## Examples

Add `--region` when you want to override or avoid relying on a configured default region:

```bash
stacktape script:run --scriptName migrate --stage staging --region eu-west-1
```

Pass extra environment variables to a seed script:

```bash
stacktape script:run --scriptName seed --stage dev --env SEED_FILE=./data/seed.json --env VERBOSE=true
```

Run a script while assuming the IAM role of a deployed resource (so the script operates with that resource's AWS permissions):

```bash
stacktape script:run --scriptName exportData --stage production --assumeRoleOfResource dataProcessor
```

Use a custom config path when the configuration is not at the default location:

```bash
stacktape script:run --scriptName cleanup --stage dev --configPath ./infra/stacktape.ts
```


> **Info:** If `assumeRoleOfResource` is also defined in the script's configuration properties, the CLI flag takes precedence.


## Errors

If the `--scriptName` value does not match any key in the `scripts` section of your configuration, the command throws `stpErrors.e20({ scriptName })`. The command looks up the script by key in `scripts`, so the `--scriptName` value must exactly match a key defined in your configuration.

## Related commands

- [`deployment-script:run`](/cli/deployment-script-run) — runs a [deployment script](/resources/advanced/deployment-scripts) resource (only updates the script's source code; use [`deploy`](/cli/deploy) to update environment variables or other configuration).
- [`deploy`](/cli/deploy) — deploys the full stack, including any changes to script configuration.
