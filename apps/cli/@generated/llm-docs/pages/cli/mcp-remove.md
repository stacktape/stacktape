# mcp remove

`stacktape mcp remove` undoes [`mcp add`](/cli/mcp-add): it removes the user-level Stacktape MCP server entry from your coding agents.

## Usage

```bash
stacktape mcp remove
```

In a terminal, it lists the agents that have Stacktape set up and removes it from the ones you keep selected. With `--coding-agents`, `--yes` or `--agent`, it removes Stacktape from the named agents, or from every agent that has it, without asking.

## Behavior details

- Claude Code and Codex entries are removed with `claude mcp remove` and `codex mcp remove`. In the other agents' config files only the `stacktape` entry is deleted, and the previous file is kept as `<file>.bak.<timestamp>`.
- Project-level entries, such as a committed `.mcp.json`, are shared with your team. `mcp remove` lists them and leaves them as they are.

## Examples

Remove Stacktape from Cursor only:

```bash
stacktape mcp remove --coding-agents cursor
```

## Flags reference


## CLI Options: `stacktape mcp remove`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-y, --yes` | no | `boolean` | Auto-Confirm Operation — If `true`, automatically confirms prompts during `deploy` or `delete` operations, skipping the manual confirmation step. | - |
| `--coding-agents` | no | `array` | Coding Agents — The coding agents to set up (or remove), for example `--coding-agents claude-code,cursor`. Without it, an interactive terminal asks with the agents found on this machine preselected; a non-interactive run uses every agent it finds. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`mcp add`](/cli/mcp-add) — Connects coding agents to Stacktape.
- [`mcp`](/cli/mcp) — The MCP server process.
