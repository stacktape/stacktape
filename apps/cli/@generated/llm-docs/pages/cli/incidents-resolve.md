# incidents:resolve

The `incidents:resolve` command resolves an incident manually. Use it after you deployed and verified a fix for signals that cannot observe their own recovery, such as production error groups: no new error is not proof that the defect is gone, so Stacktape leaves that judgement to you. A recurring signal reopens the incident automatically, so a wrong resolution is caught rather than hidden.

Stateful signals (uptime checks, synthetic tests, alarms) resolve on their own once their recovery criteria are met, and the incident resolves automatically when all of its stateful signals have recovered. Prefer that path; use manual resolution only when a signal cannot recover by itself.

## Usage

```bash
stacktape incidents:resolve --incidentId <incident-id>
```

You need the incident ID. Use [`incidents`](/cli/incidents) to find it. Resolving an incident that is already resolved changes nothing and reports so.

## Flags reference

The only required flag is `--incidentId`.


## CLI Options: `stacktape incidents:resolve`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--incidentId (-incid)` | yes | `string` | Incident ID — The ID of the incident to act on. | - |
| `--agent (-ag)` | no | `boolean` | Agent Mode — Optimizes CLI output for programmatic/LLM consumption: • Uses strict JSONL/NDJSON output (one JSON object per line) • Disables interactive terminal UI • Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--logLevel (-ll)` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format — Controls the CLI output format: • `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. • `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. • `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Examples

Resolve an incident after a verified fix, then watch for an immediate recurrence:

```bash
stacktape incidents:resolve --incidentId inc_abc123def456
stacktape incidents:watch --incidentId inc_abc123def456
```

## Related commands

- [`incidents`](/cli/incidents) — list incidents and find their IDs
- [`incidents:show`](/cli/incidents-show) — print the incident's handoff bundle
- [`incidents:watch`](/cli/incidents-watch) — wait until the incident stays resolved
- [`incidents:ack`](/cli/incidents-ack) — record that someone is working on the incident
