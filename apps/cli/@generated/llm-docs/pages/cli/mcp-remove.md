# mcp:remove

`stacktape mcp:remove` undoes [`mcp:add`](/cli/mcp-add): it removes the user-level Stacktape MCP server entry from your coding agents.

## Usage

```bash
stacktape mcp:remove
```

In a terminal, it lists the agents that have Stacktape set up and removes it from the ones you keep selected. With `--codingAgents`, `--autoConfirmOperation` or `--agent`, it removes Stacktape from the named agents, or from every agent that has it, without asking.

## Behavior details

- Claude Code and Codex entries are removed with `claude mcp remove` and `codex mcp remove`. In the other agents' config files only the `stacktape` entry is deleted, and the previous file is kept as `<file>.bak.<timestamp>`.
- Project-level entries, such as a committed `.mcp.json`, are shared with your team. `mcp:remove` lists them and leaves them as they are.

## Examples

Remove Stacktape from Cursor only:

```bash
stacktape mcp:remove --codingAgents cursor
```

## Flags reference


## CLI Options: `stacktape mcp:remove`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent (-ag)` | no | `boolean` | Agent Mode — Optimizes CLI output for programmatic/LLM consumption: • Uses strict JSONL/NDJSON output (one JSON object per line) • Disables interactive terminal UI • Automatically confirms operations (equivalent to --autoConfirmOperation) For dev command: also enables HTTP server for programmatic control. | - |
| `--autoConfirmOperation (-aco, yes, y)` | no | `boolean` | Auto-Confirm Operation — If `true`, automatically confirms prompts during `deploy` or `delete` operations, skipping the manual confirmation step. | - |
| `--codingAgents` | no | `array` | Coding Agents — The coding agents to set up (or remove), for example `--codingAgents claude-code,cursor`. Without it, an interactive terminal asks with the agents found on this machine preselected; a non-interactive run uses every agent it finds. | - |
| `--logLevel (-ll)` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--outputFormat (-ofmt)` | no | `string` | Output Format — Controls the CLI output format: • `jsonl`: Machine-readable NDJSON (one JSON object per line). Disables interactive UI. • `plain`: Simple text output without colors or animations. Used automatically in CI or non-TTY environments. • `tty`: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected. If not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl. | `jsonl`, `plain`, `tty` |


## Related commands

- [`mcp:add`](/cli/mcp-add) — Connects coding agents to Stacktape.
- [`mcp`](/cli/mcp) — The MCP server process.
