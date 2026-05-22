# dev:stop

The `dev:stop` command gracefully stops a running dev agent that was started with [`stacktape dev --agent`](/cli/dev). Dev agents run as background HTTP servers on your machine, and this command sends them a shutdown signal. It can also clean up orphaned Docker containers left behind by crashed dev sessions.

## Usage

```bash
stacktape dev:stop
```

This stops the running dev agent. If only one agent is running, it stops automatically. If no agents are found via lock files, Stacktape tries the default agent port (7331) as a fallback.

## Important flags

### --agentPort

When multiple dev agents are running simultaneously, `dev:stop` lists them and asks you to specify which one to stop. Pass `--agentPort` with the port number to target a specific agent.

```bash
stacktape dev:stop --agentPort 7332
```

### --cleanupContainers

Crashed or improperly terminated dev sessions can leave orphaned Docker containers running. The `--cleanupContainers` flag finds and removes any Stacktape dev containers whose agent process is no longer running.

```bash
stacktape dev:stop --cleanupContainers
```

You can combine it with `--agentPort` to both clean up containers and stop a specific agent in one command.

```bash
stacktape dev:stop --cleanupContainers --agentPort 7332
```

## Examples

Stop the only running dev agent:

```bash
stacktape dev:stop
```

Stop a specific agent when multiple are running:

```bash
stacktape dev:stop --agentPort 7332
```

Clean up orphaned Docker containers without stopping any agent:

```bash
stacktape dev:stop --cleanupContainers
```

## How agent discovery works

When you run `dev:stop` without `--agentPort`, Stacktape checks for running agents using lock files. If one agent is found, it stops immediately. If multiple agents are found, the command lists all running agents with their project name, stage, and port — then asks you to re-run with `--agentPort` to pick one. If no lock files exist, Stacktape falls back to probing the default port 7331 before reporting that no agents are running.

## Flags reference


## CLI Options: `stacktape dev:stop`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--agentPort (-ap)` | no | `number` | Agent Port The port for the agent HTTP server. Providing this option enables agent mode. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--cleanupContainers` | no | `boolean` | Cleanup Containers Finds and removes orphaned Stacktape dev containers (containers whose dev agent is no longer running). Use this to clean up containers left behind after a crash or improper shutdown. | - |
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


## Related commands

- [`dev`](/cli/dev) — Start a dev agent for local development and debugging.
- [`delete`](/cli/delete) — Delete a deployed stack from AWS.
- [`deploy`](/cli/deploy) — Deploy your stack to AWS.
