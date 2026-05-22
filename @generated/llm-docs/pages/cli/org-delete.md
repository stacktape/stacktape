# org:delete

Removes your access to a Stacktape organization. This command is restricted to organization owners and only succeeds when no other non-service users remain and no AWS accounts are connected to the organization.

## Usage

```bash
stacktape org:delete
```

In interactive mode, you select from a list of your organizations and confirm the deletion. In agent mode, pass `--organizationId` directly.

```bash
stacktape org:delete --agent --organizationId "org_abc123"
```

## Prerequisites

Before you can delete an organization:

1. Remove all non-service users (other team members must be removed first).
2. Disconnect all AWS accounts from the organization.
3. You must be the organization OWNER.

If any of these conditions are not met, the operation will fail.


> **Warning:** This operation removes your access to the organization. Ensure you have backed up or migrated any projects and configurations you need before proceeding.


## Important flags

| Flag | Purpose |
|------|---------|
| `--organizationId` | Required in agent mode. The ID of the organization to delete. Use [`org:list`](/cli/org-list) to find available IDs. |
| `--agent` | Disables interactive prompts and outputs structured JSONL. Requires `--organizationId`. |
| `--outputFormat` | Controls output format: `jsonl`, `plain`, or `tty`. Auto-detected when omitted. |

## Examples

List your organizations first, then delete one by ID:

```bash
stacktape org:list
```

```bash
stacktape org:delete --organizationId "org_abc123"
```

Non-interactive deletion in CI or agent workflows:

```bash
stacktape org:delete --agent --organizationId "org_abc123"
```

## Flags reference


## CLI Options: `stacktape org:delete`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode Optimizes CLI output for programmatic/LLM consumption:

Uses strict JSONL/NDJSON output (one JSON object per line)
Disables interactive terminal UI
Automatically confirms operations (equivalent to --autoConfirmOperation)
For dev command: also enables HTTP server for programmatic control. | - |
| `--logLevel (-ll)` | no | `string` | Log Level The level of logs to print to the console.

`info`: Basic information about the operation.
`error`: Only errors.
`debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--organizationId (-oid)` | no | `string` | Organization ID The ID of the Stacktape organization. | - |
| `--outputFormat (-ofmt)` | no | `string` | Output Format Controls the CLI output format:

`jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.
`plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.
`tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.
If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Related commands

- [`org:create`](/cli/org-create) — create a new organization
- [`org:list`](/cli/org-list) — list all organizations accessible to your user
- [`info:whoami`](/cli/info-whoami) — verify your current user, organization, and access
