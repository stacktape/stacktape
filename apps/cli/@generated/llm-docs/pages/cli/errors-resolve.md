# errors:resolve

The `errors:resolve` command marks a runtime issue as resolved. Stacktape marks the issue as resolved, and if the same error occurs again in your deployed functions or containers, Stacktape reopens it automatically — acting as a regression detector. Resolve an issue after deploying a fix to keep your issues list focused on unresolved problems. If you want new occurrences to stay ignored and stop generating alerts, use [`errors:ignore`](/cli/errors-ignore) instead.

## Usage

```bash
stacktape errors:resolve --issueId iss_abc123def456
```

You need the issue ID. Use [`errors:list`](/cli/errors-list) to list detected runtime issues before resolving one.

## Flags reference

The only required flag is `--issueId`. Use [`errors:list`](/cli/errors-list) to find the ID of the issue you want to resolve.


## CLI Options: `stacktape error resolve`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--issue-id (positional 1)` | yes | `string` | Issue ID — The ID of the issue to act on. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

Resolve an issue in agent mode for use in scripts or AI coding assistants:

```bash
stacktape errors:resolve --issueId iss_abc123def456 --agent
```

## Related commands

- [`errors:list`](/cli/errors-list) — list all detected runtime issues with their status and occurrence count
- [`errors:ignore`](/cli/errors-ignore) — mark an issue as ignored so new occurrences do not reopen it or generate alerts
- [`errors:reopen`](/cli/errors-reopen) — reopen a resolved or ignored issue, setting its status back to open
