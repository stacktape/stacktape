# incident resolve

The `incident resolve` command resolves an incident manually. Use it after you deployed and verified a fix for signals that cannot observe their own recovery, such as production error groups: no new error is not proof that the defect is gone, so Stacktape leaves that judgement to you. A recurring signal reopens the incident automatically, so a wrong resolution is caught rather than hidden.

Stateful signals (uptime checks, synthetic tests, alarms) resolve on their own once their recovery criteria are met, and the incident resolves automatically when all of its stateful signals have recovered. Prefer that path; use manual resolution only when a signal cannot recover by itself.

## Usage

```bash
stacktape incident resolve <incident-id>
```

You need the incident ID. Use [`incident list`](/cli/incidents) to find it. Resolving an incident that is already resolved changes nothing and reports so.

## Flags reference

The only required argument is the incident ID.


## CLI Options: `stacktape incident resolve`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--incident-id (positional 1)` | yes | `string` | Incident ID — The ID of the incident to act on. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

Resolve an incident after a verified fix, then watch for an immediate recurrence:

```bash
stacktape incident resolve inc_abc123def456
stacktape incident watch inc_abc123def456
```

## Related commands

- [`incident list`](/cli/incidents) — list incidents and find their IDs
- [`incident show`](/cli/incidents-show) — print the incident's handoff bundle
- [`incident watch`](/cli/incidents-watch) — wait until the incident stays resolved
- [`incident ack`](/cli/incidents-ack) — record that someone is working on the incident
