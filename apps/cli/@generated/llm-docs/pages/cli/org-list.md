# org list

The `org list` command displays all organizations accessible with your current Stacktape API key. Use it to see which organizations you belong to, your role in each, and which one is currently active for CLI operations.

## Usage

```bash
stacktape org list
```

When organizations are found, the command prints a table with the following columns. If you have no organizations, it prints "No organizations found for this user."

| Column | Description |
|--------|-------------|
| Organization | The organization name |
| Role | Your organization role, such as Owner, Admin, Developer, or Viewer. Unrecognized roles are displayed as returned by Stacktape |
| Connected AWS | Number of AWS accounts connected to the organization |
| Current | Whether this organization is the active one for your API key |
| ID | The organization's unique identifier |

No flags are required. The command uses the API key configured via [`stacktape login`](/cli/login) to authenticate and fetch your organization list.

## Output formats

When Stacktape detects an interactive terminal (TTY), `org list` renders a table. In CI or other non-TTY contexts, the output format is auto-detected. Use `--json` or `--agent` for machine-readable output.

Machine-readable JSONL output:

```bash
stacktape org list --json
```

Agent mode (JSONL output with no interactive UI):

```bash
stacktape org list --agent
```

## Flags reference


## CLI Options: `stacktape org list`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

List all organizations with debug-level logging:

```bash
stacktape org list --debug
```

Pipe organization data into another tool:

```bash
stacktape org list --json
```

## Related commands

- [`org create`](/cli/org-create) — create a new organization
- [`org delete`](/cli/org-delete) — delete the organization of your API key (owner-only, requires no other users or connected AWS accounts)
- [`whoami`](/cli/info-whoami) — verify your current user, organization, and connected accounts
- [`login`](/cli/login) — configure your Stacktape API key
