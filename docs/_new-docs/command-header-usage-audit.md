# Command Header Usage Audit

## Canonical API

- Use `tuiManager.showCommandHeader(...)` for command-level headers.
- It updates shared TUI state and emits machine/plain progress data.
- In standalone TTY flows (without active Ink app), call
  `tuiManager.showCommandHeader(..., { renderStandalone: true })`.
- Legacy header fallback was removed (`printCommandHeader` no longer exists).
- Direct external `setHeader(...)` usage was removed (method is internal only).
- Plain section banners are standardized with `formatSectionHeaderLine(...)`.
- Command header box width is centralized via `COMMAND_HEADER_BOX_MIN_WIDTH`.

## Updated command entry points

- `src/commands/_utils/initialization.ts`
  - `initializeAllStackServices(...)`
  - `initializeStackServicesForLocalResolve(...)`
- `src/commands/delete/index.ts`
  - initial delete header
  - post-initialization delete header refresh
- `src/commands/dev/index.ts`
  - dev-mode header in both interactive and agent flows

## Places that should remain plain text for now

- `src/commands/dev/agent-server.ts` (`buildStartupMessage`)
  - returns plain text startup docs for HTTP/daemon workflows.

## Box outputs that are not command headers

These should keep `tuiManager.printBox(...)` (content summaries, not command headers):

- `src/commands/init/wizard/index.ts` (`Configuration` summary)
- `src/commands/init/using-starter-project/index.ts` (starter summary)
- `src/app/tui-manager/dev-tui/index.ts` (`Dev mode ready` summary)
