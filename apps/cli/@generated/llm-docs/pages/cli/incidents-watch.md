# incidents:watch

The `incidents:watch` command waits for an incident to recover and stay recovered. It exits successfully only after the incident has remained `RESOLVED` for the stability window; if a signal recurs and reopens the incident, the window resets. Use it after deploying a fix to prove the fix worked, in CI scripts, or at the end of a coding-agent workflow.

## Usage

```bash
stacktape incidents:watch --incidentId <incident-id>
```

By default the command waits up to 900 seconds for the incident to stay resolved for 30 continuous seconds. Recovery time the Console already recorded before the command started counts toward the window.

## Flags reference

The only required flag is `--incidentId`. Raise the timeout and the stability window when the affected monitor evaluates slowly, for example an alarm with a five-minute period.


## CLI Options: `stacktape incidents:watch`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--incidentId (-incid)` | yes | `string` | Incident ID — The ID of the incident to act on. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode — Optimizes CLI output for programmatic/LLM consumption: • Uses strict JSONL/NDJSON output (one JSON object per line) • Disables interactive terminal UI • Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--incidentWatchStabilitySeconds` | no | `number` | Incident Watch Stability Window — Number of continuous seconds the incident must remain resolved before the command succeeds. A recurring signal resets the window. Defaults to 30 seconds. | - |
| `--incidentWatchTimeoutSeconds` | no | `number` | Incident Watch Timeout — Maximum number of seconds to wait for the incident to recover. Defaults to 900 seconds. | - |
| `--logLevel (-ll)` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format — Controls the CLI output format: • `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. • `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. • `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Examples

Wait up to 30 minutes and require two minutes of stability:

```bash
stacktape incidents:watch \
  --incidentId inc_abc123def456 \
  --incidentWatchTimeoutSeconds 1800 \
  --incidentWatchStabilitySeconds 120
```

Emit status events and the final result as JSON for scripts or AI coding assistants:

```bash
stacktape incidents:watch --incidentId inc_abc123def456 --agent
```

## Exit behavior

The command exits with the error code `INCIDENT_WATCH_TIMEOUT` if sustained recovery is not observed before the timeout. The message includes the last observed status and the number of signals that were still active, so a script can decide whether to retry after another fix.

## Related commands

- [`incidents:show`](/cli/incidents-show) — inspect the current evidence when the watch times out
- [`incidents:resolve`](/cli/incidents-resolve) — resolve error-only incidents manually before watching for a recurrence
- [`incidents`](/cli/incidents) — list incidents and find their IDs

See [Incidents](/observability/incidents) for the recommended triage and verification workflow.
