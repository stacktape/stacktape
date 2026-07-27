# dev:stop

The `dev:stop` command gracefully stops a running dev agent that was started with [`stacktape dev --agent`](/cli/dev). Dev agents expose a local HTTP status endpoint, and `dev:stop` uses the selected port to stop the matching agent. It can also clean up orphaned Docker containers left behind by crashed dev sessions.

## Usage

```bash
stacktape dev:stop
```

Running `stacktape dev:stop` without flags stops the running dev agent. If only one agent is running, it stops automatically. If no agents are found via lock files, Stacktape tries the default agent port (7331) as a fallback.

## Important flags

The `dev:stop` command accepts two flags that control which agent to stop and whether to clean up leftover containers.

### --agentPort

When multiple dev agents are running, `dev:stop` lists their project, stage, and port, then tells you to re-run the command with `--agentPort <port>`. Pass `--agentPort` with the port number to target a specific agent.

```bash
stacktape dev:stop --agentPort 7332
```

### --cleanupContainers

Crashed or improperly terminated dev sessions can leave orphaned Docker containers running. The `--cleanupContainers` flag finds and removes any Stacktape dev containers whose agent process is no longer running. After cleanup, the command checks for running agents via lock files — if none are found, it exits; if agents are found, normal agent-stop behavior continues (auto-stopping a single agent, or listing agents and asking you to re-run with `--agentPort` when multiple are running).

```bash
stacktape dev:stop --cleanupContainers
```

You can combine `--cleanupContainers` with `--agentPort` to both clean up containers and stop a specific agent in one command.

```bash
stacktape dev:stop --cleanupContainers --agentPort 7332
```

## Flags reference

All flags accepted by `stacktape dev:stop`. None are required — the command discovers and stops agents automatically when possible.


## CLI Options: `stacktape dev:stop`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption: Uses strict JSONL/NDJSON output (one JSON object per line) Disables interactive terminal UI Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--agentPort (-ap)` | no | `number` | Agent Port The port for the agent HTTP server. Providing this option enables agent mode. | - |
| `--awsAccount (-aa)` | no | `string` | AWS Account The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape console](https://console.stacktape.com/aws-accounts). | - |
| `--cleanupContainers` | no | `boolean` | Cleanup Containers Finds and removes orphaned Stacktape dev containers (containers whose dev agent is no longer running). Use this to clean up containers left behind after a crash or improper shutdown. | - |
| `--help (-h)` | no | `string` | Show Help If provided, the command will not execute and will instead print help information. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console. `info`: Basic information about the operation. `error`: Only errors. `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format: `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |
| `--profile (-p)` | no | `string` | AWS Profile The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults:configure`. | - |


## Related commands

- [`dev`](/cli/dev) — Start a dev agent for local development and debugging.
- [`deploy`](/cli/deploy) — Deploy your stack to AWS when you're done iterating locally.
