# Phase 4: MCP Server — `stacktape_ops`, `stacktape_dev`, `stacktape_diagnose`

Add the remaining 3 MCP tools. These consume the `--agent` NDJSON output from Phase 3.

## Tool implementations

### `stacktape_ops`

For each operation:

1. Validate required args (per operation).
2. For destructive ops (`delete`), require `confirm: true` or return `CONFIRMATION_REQUIRED` error.
3. Spawn `stacktape <command> --agent [args...]`.
4. Read NDJSON stream from child process stdout.
5. Collect progress events (optionally forward to MCP streaming if supported).
6. Return final `result` event as tool output.

Operation → CLI command mapping:

| Operation          | CLI Command                                       |
| ------------------ | ------------------------------------------------- |
| `preview_changes`  | `stacktape preview-changes --agent`               |
| `deploy`           | `stacktape deploy --agent --autoConfirmOperation` |
| `delete`           | `stacktape delete --agent --autoConfirmOperation` |
| `rollback`         | `stacktape rollback --agent`                      |
| `script_run`       | `stacktape script:run --agent`                    |
| `compile_template` | `stacktape compile-template --agent`              |
| `secret_create`    | `stacktape secret:create --agent`                 |
| `secret_get`       | `stacktape secret:get --agent`                    |
| `secret_delete`    | `stacktape secret:delete --agent`                 |

Secret masking: `secret_get` masks values in MCP response by default (show first 4 + last 4 chars only). Full value
stays in CLI output.

### `stacktape_dev`

Dev mode is stateful — MCP server tracks active dev session(s).

- `start`:
  1. Spawn `stacktape dev --agent --agentPort <port> --resources <list> [args...]`.
  2. Read NDJSON startup event from child stdout.
  3. Store process handle + `agentPort` in MCP server state.
  4. Return startup info.

- `status`, `logs`, `rebuild`, `rebuild_all`, `stop`:
  1. Use stored `agentPort` to call dev agent HTTP API.
  2. Normalize response to tool output shape.

If no active session, return helpful error with `nextActions: ['start dev mode first']`.

### `stacktape_diagnose`

Read-only inspection commands.

Operation → CLI command mapping:

| Operation         | CLI Command                              |
| ----------------- | ---------------------------------------- |
| `info_stack`      | `stacktape info:stack --agent`           |
| `info_stacks`     | `stacktape info:stacks --agent`          |
| `info_operations` | `stacktape info:operations --agent`      |
| `info_whoami`     | `stacktape info:whoami --agent`          |
| `logs`            | `stacktape debug:logs --agent`           |
| `metrics`         | `stacktape debug:metrics --agent`        |
| `alarms`          | `stacktape debug:alarms --agent`         |
| `container_exec`  | `stacktape debug:container-exec --agent` |
| `sql`             | `stacktape debug:sql --agent`            |
| `dynamodb`        | `stacktape debug:dynamodb --agent`       |
| `redis`           | `stacktape debug:redis --agent`          |
| `opensearch`      | `stacktape debug:opensearch --agent`     |
| `aws_sdk`         | `stacktape debug:aws-sdk --agent`        |

Safety: all operations here are read-only by design (enforced by CLI).

## Implementation steps

1. Add CLI spawning utility (shared by all tools): spawn + NDJSON reader + timeout.
2. Implement `stacktape_ops` tool with validation + command mapping.
3. Implement `stacktape_dev` tool with session state management.
4. Implement `stacktape_diagnose` tool with command mapping.
5. Add secret masking utility for `secret_get`.

## Exit criteria

- All 4 MCP tools registered and functional.
- `stacktape_ops` can deploy/delete/preview with structured results.
- `stacktape_dev` can manage full dev lifecycle.
- `stacktape_diagnose` can fetch logs/metrics/stack info.
- Destructive ops require confirmation.
- Secret values are masked in MCP responses.
