# org:delete

The `stacktape org:delete` command removes your access to a Stacktape organization. Use it when you need to permanently leave an organization you own. The command enforces two safety constraints before proceeding: all other non-service users must already be removed, and all AWS accounts must be disconnected from the organization. In interactive mode you select the target organization and confirm; in agent mode, pass `--organizationId` directly.

## Usage

Run `org:delete` without flags for the interactive flow, or pass `--agent` and `--organizationId` for non-interactive use in CI and agent workflows.

```bash
stacktape org:delete
```

In interactive mode, you select from a list of your organizations and confirm removing your access. In agent mode, pass `--organizationId` directly.

```bash
stacktape org:delete --agent --organizationId "org_abc123"
```

## Prerequisites

Before you can remove your access to an organization:

1. Remove all non-service users (other team members must be removed first).
2. Disconnect all AWS accounts from the organization.
3. You must be the organization OWNER.

If any of these conditions are not met, the operation will fail.


> **Warning:** This operation removes your access to the organization. Make sure you have another way to access anything you still need before continuing.


## Flags reference

The `org:delete` command accepts the following flags. None are required in interactive mode; agent mode requires `--organizationId`.


## CLI Options: `stacktape org delete`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--organization-id (positional 1)` | no | `string` | Organization ID — The ID of the Stacktape organization. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

List your organizations first, then remove access to one by ID. Without `--agent`, passing `--organizationId` skips the organization picker but still asks for confirmation.

```bash
stacktape org:list
```

```bash
stacktape org:delete --organizationId "org_abc123"
```

Non-interactive removal in CI or agent workflows:

```bash
stacktape org:delete --agent --organizationId "org_abc123"
```

## Related commands

Other organization management commands and the whoami command for verifying your current context.

- [`org:create`](/cli/org-create) — create a new organization
- [`org:list`](/cli/org-list) — list all organizations accessible to your user
- [`info:whoami`](/cli/info-whoami) — verify your current user, organization, and access
