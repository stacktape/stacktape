# incidents:ack

The `incidents:ack` command acknowledges an open incident: "someone is on it". The same signal getting worse no longer re-pages the team, while a new signal joining the incident still notifies. Acknowledging does not resolve anything; the incident stays in the active queue until its signals recover or you resolve it.

## Usage

```bash
stacktape incidents:ack --incidentId <incident-id>
```

You need the incident ID. Use [`incidents`](/cli/incidents) to find it. Acknowledging an incident that is not `OPEN` changes nothing and reports so.

## Flags reference

The only required flag is `--incidentId`.


## CLI Options: `stacktape incidents:ack`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--incidentId (-incid)` | yes | `string` | Incident ID — The ID of the incident to act on. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode — Optimizes CLI output for programmatic/LLM consumption: • Uses strict JSONL/NDJSON output (one JSON object per line) • Disables interactive terminal UI • Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--logLevel (-ll)` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format — Controls the CLI output format: • `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. • `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. • `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Examples

Acknowledge an incident in agent mode for use in scripts or AI coding assistants:

```bash
stacktape incidents:ack --incidentId inc_abc123def456 --agent
```

## Related commands

- [`incidents`](/cli/incidents) — list incidents and find their IDs
- [`incidents:show`](/cli/incidents-show) — print the incident's handoff bundle
- [`incidents:resolve`](/cli/incidents-resolve) — resolve an incident manually after verifying a fix
