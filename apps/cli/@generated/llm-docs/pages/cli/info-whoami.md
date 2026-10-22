# info:whoami

The `stacktape info:whoami` command shows the current user, organization, connected AWS accounts, and accessible projects for your configured API key. Use it to verify your authentication is set up correctly and confirm which organization and projects you can access.

## Usage

```bash
stacktape info:whoami
```

This command requires a valid API key. If you haven't logged in yet, run [`stacktape login`](/cli/login) first.

The output includes:

- **User** — your name, email, and user ID.
- **Organization** — the organization tied to your API key, including your displayed role, such as Owner, Admin, Developer, or Viewer.
- **Connected AWS accounts** — each account's name, AWS account ID, and connection state.
- **Projects** — all projects you can access in the current organization.
- **Permissions** — the result can include project-scoped API key metadata, including `isProjectScoped` and `permissions`, when the API returns those fields.

## Examples

Verify your identity and check which organization you're operating in.

```bash
stacktape info:whoami
```

Get machine-readable JSON output (one JSON object per line) for scripting or CI pipelines.

```bash
stacktape info:whoami --outputFormat jsonl
```

Enable debug-level logging to troubleshoot API key issues.

```bash
stacktape info:whoami --logLevel debug
```

## Flags


## CLI Options: `stacktape whoami`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`login`](/cli/login) — configure your Stacktape API key.
- [`org:list`](/cli/org-list) — list all organizations you can access.
- [`project:list`](/cli/project-list) — list all projects and their deployed stages in your organization.
