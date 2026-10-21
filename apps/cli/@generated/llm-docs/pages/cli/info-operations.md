# info:operations

The `info:operations` command lists recent recorded Stacktape operations with their status. Each entry shows success or failure status, timestamps, and error descriptions for failed operations. Use filters to narrow results by project, stage, or the current API-key user.

## Usage

```bash
stacktape info:operations
```

`info:operations` returns the 25 most recent operations across all projects and stages in your organization. You must be logged in with a valid API key — run [`stacktape login`](/cli/login) first if you haven't already.

## Filtering results

Filter by project name to see operations for a single project.

```bash
stacktape info:operations --projectName my-api
```

Filter by stage to see operations for a specific stage across all projects.

```bash
stacktape info:operations --stage production
```

Combine `--projectName` and `--stage` to narrow results to a single project and stage.

```bash
stacktape info:operations --projectName my-api --stage production
```

Show only operations triggered by your own API key.

```bash
stacktape info:operations --currentUserOnly
```

## Controlling output size

By default, `info:operations` returns the 25 most recent operations. Use `--limit` to change this.

```bash
stacktape info:operations --limit 50
```

## Machine-readable output

Use `--agent` or `--outputFormat jsonl` to get machine-readable output suitable for scripts or AI coding agents. See the flags reference below for details on each output format.

```bash
stacktape info:operations --agent
```

## Flags reference


## CLI Options: `stacktape stack history`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--current-user-only` | no | `boolean` | Current User Only — If `true`, only returns records created by the user that owns the active API key. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--limit` | no | `number` | Limit — Maximum number of items to return. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--project` | no | `string` | Project Name — The name of the Stacktape project for this operation. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. The maximum length is 12 characters. | - |


## Related commands

- [`info:stacks`](/cli/info-stacks) — list all deployed stacks in a region with their status and estimated spend.
- [`info:stack`](/cli/info-stack) — show detailed outputs and resources for a specific deployed stack.
- [`info:whoami`](/cli/info-whoami) — verify your API key and see which organization, AWS accounts, and projects you have access to.
