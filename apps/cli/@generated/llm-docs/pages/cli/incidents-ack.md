# incident ack

The `incident ack` command acknowledges an open incident: "someone is on it". The same signal getting worse no longer re-pages the team, while a new signal joining the incident still notifies. Acknowledging does not resolve anything; the incident stays in the active queue until its signals recover or you resolve it.

## Usage

```bash
stacktape incident ack <incident-id>
```

You need the incident ID. Use [`incident list`](/cli/incidents) to find it. Acknowledging an incident that is not `OPEN` changes nothing and reports so.

## Flags reference

The only required argument is the incident ID.


## CLI Options: `stacktape incident ack`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--incident-id (positional 1)` | yes | `string` | Incident ID — The ID of the incident to act on. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

Acknowledge an incident in agent mode for use in scripts or AI coding assistants:

```bash
stacktape incident ack inc_abc123def456 --agent
```

## Related commands

- [`incident list`](/cli/incidents) — list incidents and find their IDs
- [`incident show`](/cli/incidents-show) — print the incident's handoff bundle
- [`incident resolve`](/cli/incidents-resolve) — resolve an incident manually after verifying a fix
