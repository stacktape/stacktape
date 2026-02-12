# Phase 3: CLI `--agent` NDJSON Machine Output

Redesign `--agent` mode to emit strict NDJSON events instead of semi-structured terminal text.

## Background

Stacktape CLI currently has 3 output paths:

- **TTY renderer**: rich interactive terminal (spinners, colors, layout).
- **Plain renderer**: nonTTY/CI readable text (auto-selected when not TTY, and when `--agent`).
- **Agent mode** (`--agent`): currently just forces plain output + auto-confirm + enables dev HTTP server. No structured
  machine contract.

Nobody depends on current `--agent` output format, so this is a clean break.

## Design

### Renderer selection

- `--agent` flag → `agent` renderer (NDJSON on stdout)
- `process.stdout.isTTY` → `tty` renderer (unchanged)
- else → `plain` renderer (unchanged)

### Agent renderer behavior

- Emits one JSON object per line to stdout.
- Event types: `progress`, `log`, `result` (see Phase 0 for schema).
- Final event is always `type: 'result'`.
- Exit code: 0 on success, non-zero on failure.
- No spinners, no colors, no interactive elements.
- Stderr can still carry debug/error text for humans if needed.

### Commands to support in v1

Priority commands for MCP integration:

1. `deploy` — progress events for packaging, uploading, deploying; result with stack outputs.
2. `delete` — progress events; result with confirmation.
3. `preview-changes` — result with changeset summary.
4. `dev` — startup event with `agentPort`, `pid`, workloads; then ongoing log events.
5. `info:stack` — result with stack outputs and resources.
6. `info:operations` — result with operation history.
7. `info:whoami` — result with user/org info.
8. `debug:logs` — result with log entries.
9. `debug:metrics` — result with metric data points.
10. `secret:create`, `secret:get`, `secret:delete` — result with confirmation/value.

### Dev agent HTTP API

- Keep existing endpoints (`/status`, `/logs`, `/rebuild/...`, `/stop`, `/health`, etc.).
- Normalize all response bodies to the standard envelope (`v`, `ok`, `code`, `message`, `data`).
- This is incremental — update response shapes, don't restructure routes.

## Implementation approach

The key question is how to hook into Stacktape's internal logging/progress system. This depends on how the existing TUI
manager and event system work internally (to be discussed with the team before coding).

High-level approach:

1. Add `agent` renderer alongside existing `tty` and `plain`.
2. Hook into the same internal event/progress emitters.
3. Format events as NDJSON lines to stdout.
4. Ensure final `result` event is always emitted (even on error/crash).

## Exit criteria

- `stacktape deploy --agent` emits valid NDJSON with progress + result events.
- `stacktape dev --agent` emits startup event + log events.
- MCP server can spawn CLI and parse output without text scraping.
- `tty` and `plain` renderers are unaffected.
