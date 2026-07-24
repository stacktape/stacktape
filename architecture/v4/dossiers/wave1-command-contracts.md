# Wave 1 slice dossier — command contracts and machine protocol

Goal:

Replace the placeholder CLI contract with real typed command inputs and a deliberately specified, versioned v4
machine-event protocol suitable for subprocess and agent consumers.

User-visible/end-to-end behavior:

Humans and agents can discover valid command inputs, execute the CLI, parse ordered JSONL events, distinguish progress
from one terminal result, handle cancellation/errors, and trust redaction semantics.

Why this slice exists:

The CLI remains the public automation boundary after the SDK was dropped. v3's byte-level JSONL is not frozen, but
semantic command behavior and subprocess practicality need explicit contracts.

Prerequisite integration commit(s):

- Public `ba8c0961`.
- Legacy reference `17aef681` in `C:\Projects\stacktape`.
- No private source is required.

Current implementation and known constraints:

- Legacy command option definitions are in `src/config/cli/options.ts`, `commands.ts`, command modules, and npm/server
  surfaces.
- Existing MCP subprocess behavior and characterization tests live under `src/commands/mcp`.
- The v4 CLI currently emits only a backbone `workspace.ready` event.

Target package/app ownership:

- `packages/command-contracts` owns Zod-backed command inputs and machine-event/result/error schemas.
- `apps/cli` owns parsing, process composition, and JSONL serialization adapters needed to prove the contract.

Provisional interfaces:

- A discriminated, explicitly versioned event envelope.
- Exactly one terminal result or terminal error per invocation.
- Surface-specific command schemas without importing config implementation or core runtime globals.
- A small subprocess test helper may live with CLI tests, not in the published contract package.

Must-preserve behaviors:

- Supported command names/options/aliases that remain part of v4.
- Correct separation of stdout machine data from stderr diagnostics.
- Secret redaction and nonzero exit behavior.
- Events remain parseable line-by-line and ordered.

Intentional v4 changes allowed:

- Redesign the JSONL envelope, event names, and internal progress granularity.
- Remove obsolete/internal commands only when explicitly listed in the slice handoff.
- Improve invalid-input diagnostics.

Owned paths:

- `packages/command-contracts/**`.
- `apps/cli/src/**`, `apps/cli/scripts/**`, and CLI-focused tests only.

Shared/frozen paths:

- `packages/core`, `packages/config`, root tooling, other packages/apps, architecture documents, and `apps/console`.

Required deterministic tests:

- Schema/type tests for representative command families and invalid options.
- JSONL ordering, one-terminal-event, cancellation, structured error, redaction, stdout/stderr, and exit-code tests.
- Real packed CLI subprocess characterization, preserving the existing package gate.
- Negative compile-time tests preventing contract/config/core coupling.

Required artifact/emulator/AWS checks:

- No AWS or emulator call.
- `pnpm check:pack` must continue installing and executing the actual packed binary.

Public-only implications:

- Entire slice is public and must work without `apps/console`.

Private-submodule implications:

- None. Do not encode private router types or private command implementation details.

Generated artifacts:

- If command metadata is generated, declare canonical inputs and a freshness task; otherwise keep it hand-authored.

Acceptance commands:

- `pnpm --dir packages/command-contracts typecheck`
- `pnpm --dir packages/command-contracts test`
- `pnpm --dir apps/cli typecheck`
- `pnpm --dir apps/cli test`
- `pnpm check:pack`
- `pnpm fmt:check`
- `pnpm lint`
- `pnpm check:architecture`

Expected commits:

- One or more public commits on `v4/slice/command-protocol`.

Out of scope:

- Full command implementations, core operation lifecycle, MCP redesign, Console API, deployment, or preserving v3
  JSONL bytes.
