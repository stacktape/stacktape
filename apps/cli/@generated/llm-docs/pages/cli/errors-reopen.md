# error reopen

The `error reopen` command sets a previously resolved or ignored issue back to OPEN status. It is most useful for ignored issues, which do not auto-reopen on new occurrences — manual reopening is required to restore them to active tracking. You can also reopen a resolved issue before waiting for the next automatic reopen on error recurrence, or when a teammate resolved an issue prematurely. Once reopened, the issue appears in [`error list`](/cli/errors-list) with OPEN status.

## Usage

The `error reopen` command takes one required argument, the issue ID, to identify the issue to reopen. It requires a valid Stacktape API key (configured via [`stacktape login`](/cli/login)).

```bash
stacktape error reopen iss_abc123def456
```

On success, the command calls the Stacktape API and prints `Issue <issueId> reopened.`

## Examples

Reopen an issue by its ID:

```bash
stacktape error reopen iss_abc123def456
```

Reopen using the short alias:

```bash
stacktape error reopen iss_abc123def456
```

Reopen in agent mode for programmatic consumption:

```bash
stacktape error reopen iss_abc123def456 --agent
```

## Arguments reference

The table below lists all accepted flags for `error reopen`.


## CLI Options: `stacktape error reopen`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--issue-id (positional 1)` | yes | `string` | Issue ID — The ID of the issue to act on. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

The issue lifecycle commands — list, resolve, ignore, and reopen — let you triage runtime issues from the CLI.

- [`error list`](/cli/errors-list) — List detected runtime issues with their error message, type, function name, project/stage, occurrence count, and status.
- [`error resolve`](/cli/errors-resolve) — Mark an issue as resolved. It will reopen automatically if the same error occurs again.
- [`error ignore`](/cli/errors-ignore) — Mark an issue as ignored. Ignored issues do not reopen on new occurrences.
