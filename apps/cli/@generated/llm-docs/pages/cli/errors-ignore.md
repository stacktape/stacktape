# errors:ignore

The `errors:ignore` command marks a runtime issue as ignored. Ignored issues will not reopen on new occurrences and will not generate alerts. You can reopen an ignored issue at any time with [`errors:reopen`](/cli/errors-reopen). Use this for errors you've reviewed and decided are not actionable, rather than [`errors:resolve`](/cli/errors-resolve) which will automatically reopen if the same error recurs.

## Usage

```bash
stacktape errors:ignore --issueId <issue-id>
```

You can find issue IDs by running [`errors:list`](/cli/errors-list). This command requires a Stacktape API key — run [`login`](/cli/login) first if this machine is not yet authenticated.

## Flags Reference


## CLI Options: `stacktape error ignore`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--issue-id (positional 1)` | yes | `string` | Issue ID — The ID of the issue to act on. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

Ignore a specific issue by its ID:

```bash
stacktape errors:ignore --issueId iss_abc123def456
```

Use agent mode for scripted or CI workflows where you need structured JSON output:

```bash
stacktape errors:ignore --issueId iss_abc123def456 --agent
```

## When to Ignore vs Resolve

Use `errors:ignore` for errors you've reviewed and determined are not actionable — for example, recurring runtime errors that you've investigated and confirmed don't require a code fix. Ignored issues stay silent until you explicitly reopen them with [`errors:reopen`](/cli/errors-reopen).

Use [`errors:resolve`](/cli/errors-resolve) when you've fixed the root cause. A resolved issue will automatically reopen if the same error recurs, keeping you informed of regressions.

## Related Commands

- [`errors:list`](/cli/errors-list) — list detected runtime issues with filtering by status, project, or stage
- [`errors:resolve`](/cli/errors-resolve) — mark an issue as resolved (will reopen on recurrence)
- [`errors:reopen`](/cli/errors-reopen) — reopen a previously resolved or ignored issue
