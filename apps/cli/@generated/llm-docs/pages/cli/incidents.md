# incident list

The `incident list` command lists incidents: everything that needs (or needed) a reaction, such as downtime, failing synthetic tests, firing alarms, production errors, unhealthy stacks, and expiring certificates. It shows each incident's ID, status, severity, title, project, stage, open time, and contributing signals. The default `ACTIVE` view includes both open and acknowledged incidents.

## Usage

List active incidents (returns up to 25 incidents when no limit is provided):

```bash
stacktape incident list
```

List active incidents for a specific project and stage:

```bash
stacktape incident list --project my-app --stage production
```

## Flags reference


## CLI Options: `stacktape incident list`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--status` | no | `string` | Incident Status Filter — Filter incidents by status. ACTIVE (the default) means OPEN + ACKNOWLEDGED. | `ACTIVE`, `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `ALL` |
| `--limit` | no | `number` | Limit — Maximum number of items to return. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. The maximum length is 12 characters. | - |


## Examples

List resolved incidents, up to 50:

```bash
stacktape incident list --status RESOLVED --limit 50
```

Get JSON output for scripting or AI coding assistants. In agent mode, the command prints the returned incidents as a pretty-printed JSON array instead of a table.

```bash
stacktape incident list --agent --project my-app --stage production
```

## Output

In interactive mode, the command prints a table with the following columns:

| Column   | Description                                                                          |
| -------- | ------------------------------------------------------------------------------------ |
| ID       | Unique incident identifier (used with the other incident commands)                   |
| Status   | `OPEN`, `ACKNOWLEDGED`, or `RESOLVED`                                                |
| Severity | `INFO`, `WARNING`, `ERROR`, or `CRITICAL`                                            |
| Title    | Truncated incident title (up to 50 characters)                                       |
| Project  | Project name                                                                         |
| Stage    | Stage name                                                                           |
| Opened   | When the incident opened                                                             |
| Signals  | Each contributing signal, prefixed with ✗ while it is active and ✓ once it recovered |

Accepted `--status` values are `ACTIVE` (the default: open and acknowledged), `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, and `ALL`.

## Related commands

- [`incident show`](/cli/incidents-show) — print an incident's self-contained handoff bundle for a developer or coding agent
- [`incident ack`](/cli/incidents-ack) — record that someone is working on the incident
- [`incident watch`](/cli/incidents-watch) — wait until the incident stays resolved after a fix
- [`incident resolve`](/cli/incidents-resolve) — resolve an incident manually after verifying a fix

See [Incidents](/observability/incidents) for what opens an incident, its lifecycle, and how signals recover.
