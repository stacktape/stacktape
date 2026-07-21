# logout

The `stacktape logout` command removes the locally stored Stacktape API key from your system. The command takes no required flags — run `stacktape logout` and the stored key is cleared immediately. After logging out, commands that require a Stacktape API key will need credentials configured again via [`stacktape login`](/cli/login). Use `logout` when switching accounts, removing credentials from a shared machine, or before storing a different API key.

## Usage

```bash
stacktape logout
```

`stacktape logout` clears the stored API key from Stacktape's global state and prints a confirmation.

## When to use

Run `logout` when switching between Stacktape accounts or organizations, when removing local credentials from a shared machine, or before storing a different API key with `login`. If you need to verify which account is currently configured, use [`stacktape info:whoami`](/cli/info-whoami) before logging out.

## Command reference


## CLI Options: `stacktape logout`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--apiKey (-ak)` | no | `string` | API Key Your Stacktape API key. You can get your key from the [Stacktape console](https://console.stacktape.com/api-keys). | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |


## Related commands

- [`login`](/cli/login) — configure your Stacktape API key
- [`info:whoami`](/cli/info-whoami) — verify which user and organization your current API key belongs to
