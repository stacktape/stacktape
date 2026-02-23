# Stacktape JSONL Output Protocol (`--agent`)

This document describes the machine output protocol emitted by Stacktape CLI in `--agent` mode.

## Transport

- Output is newline-delimited JSON (`JSONL` / `NDJSON`).
- Each line is one independent JSON object.
- Event stream ends with exactly one `result` event.
- Phase transitions and command headers are NOT emitted — the `phase` field on each event conveys the current phase.

## Event union

`JsonlEvent = JsonlEventEvent | JsonlLogEvent | JsonlOutputEvent | JsonlResultEvent`

TypeScript source of truth: `src/app/tui-manager/jsonl-types.ts`.

## Common fields

- `type`
  - Event discriminator.
  - One of: `"event" | "log" | "output" | "result"`.
- `ts: string` (event/log/output only)
  - ISO timestamp when the event was emitted.

## `event` — tracked operation lifecycle

Every `event` represents a step in a tracked operation's lifecycle (start → update → finish).
Related messages share the same `eventType` (and `instanceId` when there are parallel instances).

```json
{"type":"event", "ts":"2026-02-18T12:34:56.789Z", "phase":"INITIALIZE", "eventType":"LOAD_AWS_CREDENTIALS", "status":"started", "message":"Loading AWS credentials"}
{"type":"event", "ts":"2026-02-18T12:34:57.295Z", "phase":"INITIALIZE", "eventType":"LOAD_AWS_CREDENTIALS", "status":"completed", "message":"Loaded from Stacktape API."}
```

With parallel instances:

```json
{"type":"event", "ts":"...", "phase":"INITIALIZE", "eventType":"FETCH_STACK_DATA", "status":"started", "instanceId":"Stack data", "message":"Fetching stack data"}
{"type":"event", "ts":"...", "phase":"INITIALIZE", "eventType":"FETCH_BUDGET_INFO", "status":"started", "instanceId":"Cost budgets", "message":"Fetching budget info"}
{"type":"event", "ts":"...", "phase":"INITIALIZE", "eventType":"FETCH_STACK_DATA", "status":"completed", "instanceId":"Stack data", "message":"Fetching stack data completed"}
```

CloudFormation deployment progress (as an update on `UPDATE_STACK`):

```json
{
  "type": "event",
  "ts": "2026-02-18T12:35:10.000Z",
  "phase": "DEPLOY",
  "eventType": "UPDATE_STACK",
  "status": "running",
  "message": "3/6 resources (50%) | updating: MyBucket",
  "detail": {
    "kind": "cloudformation-progress",
    "stackAction": "update",
    "completedCount": 3,
    "totalPlanned": 6,
    "percent": 50,
    "inProgressResources": ["MyBucket"],
    "changeCounts": { "created": 0, "updated": 6, "deleted": 0 }
  }
}
```

Fields:

- `phase: string`
  - Current high-level command phase (`INITIALIZE`, `BUILD_AND_PACKAGE`, `UPLOAD`, `DEPLOY`, `SUMMARY`, etc.).
- `eventType: string`
  - Identifies which tracked operation this belongs to (e.g. `LOAD_AWS_CREDENTIALS`, `BUILD_CODE`, `UPDATE_STACK`, `RUN_SCRIPT`).
- `status: "started" | "running" | "completed"`
  - Lifecycle position. `started` = operation began, `running` = intermediate update, `completed` = operation finished.
- `message: string`
  - Human-readable text. ANSI color codes are removed.
- `instanceId?: string`
  - Disambiguates parallel instances of the same `eventType`.
  - Not always a workload name — can be a hook name (`beforeDeploy-generatePrismaClient`), metadata task (`Stack data`), container (`apiserver-api-container`), etc.
- `parentEventType?: string`
  - Parent tracked operation when this event is nested (e.g. `FETCH_STACK_DATA` under `LOAD_METADATA_FROM_AWS`).
- `parentInstanceId?: string`
  - Parent instance identifier for deeply nested hierarchies.
- `detail?: JsonlEventDetail`
  - Structured metadata. Currently only used for CloudFormation progress (`kind: "cloudformation-progress"`). See below.

## `log` — informational/warning/error message

```json
{
  "type": "log",
  "ts": "2026-02-18T12:34:56.789Z",
  "level": "info",
  "source": "cli",
  "message": "Deploy started"
}
```

Fields:

- `level: "info" | "warn" | "error"`
  - Log severity.
- `source: string`
  - Logical source category (`cli`, `console`, command-specific source names, etc.).
- `message: string`
  - Log message text. ANSI color codes are removed.
- `data?: JsonlData`
  - Optional structured payload (e.g. `{ hints: string[] }` on error logs).

## `output` — batched child-process output

Batched child-process output from script hooks, builds, etc. Lines are buffered (~2 seconds)
and flushed as a single event to avoid flooding the stream.

When `eventType` (and optionally `instanceId`) is present, the output belongs to that
tracked operation — e.g. Prisma output from a `RUN_SCRIPT` hook.

```json
{
  "type": "output",
  "ts": "2026-02-18T12:34:58.000Z",
  "eventType": "RUN_SCRIPT",
  "instanceId": "beforeDeploy-generatePrismaClient",
  "lines": [
    "Prisma schema loaded from prisma/schema.prisma",
    "Generated Prisma Client (7.1.0) to ./@generated/prisma in 118ms"
  ]
}
```

Fields:

- `eventType?: string`
  - The tracked operation that produced this output, if known.
- `instanceId?: string`
  - Disambiguates parallel instances (same as on the parent `event`).
- `parentEventType?: string`
  - Parent tracked operation when this output is nested.
- `parentInstanceId?: string`
  - Parent instance identifier for deeply nested hierarchies.
- `lines: string[]`
  - Output lines since the last flush. ANSI color codes are removed.

Consumers that don't need build output can ignore events where `type === "output"`.

## `result` — final command outcome

Exactly one per CLI invocation — the final command outcome.

```json
{
  "type": "result",
  "ok": true,
  "code": "OK",
  "message": "Command completed",
  "data": { "result": { "stackInfo": "..." } }
}
```

Fields:

- `ok: boolean`
  - Final command outcome.
- `code: string`
  - Stable result code suitable for branching in clients (`OK`, `CONFIG_ERROR`, `STACK_ERROR`, etc.).
- `message: string`
  - Final human-readable outcome summary.
- `data?: JsonlData`
  - Command return value on success (`{ result: ... }`), or error details on failure (`{ errorId?, hints? }`).

## `JsonlData`

`JsonlData` is either:

- a regular JSON object payload (`Record<string, unknown>`), or
- a truncation marker:

```json
{
  "truncated": true,
  "reason": "data_too_large",
  "keys": ["..."],
  "size": 12345
}
```

`reason` values:

- `data_too_large`: payload exceeded size guard.
- `data_unserializable`: payload could not be serialized.

## `detail` — event metadata

`detail` is a discriminated union by `kind`, present only on `event` events.
Currently only one kind exists:

### `kind: "cloudformation-progress"`

CloudFormation stack operation progress. Appears on `UPDATE_STACK`, `DELETE_STACK`, and `ROLLBACK_STACK` events with `status: "running"`.

```json
{
  "kind": "cloudformation-progress",
  "stackAction": "update",
  "status": "active",
  "completedCount": 3,
  "totalPlanned": 6,
  "percent": 50,
  "inProgressCount": 2,
  "inProgressResources": ["MyBucket", "MyFunction"],
  "waitingResources": ["MyApi"],
  "changeCounts": { "created": 1, "updated": 4, "deleted": 1 }
}
```

Fields:

- `stackAction: "create" | "update" | "delete" | "rollback"`
- `status?: "active" | "cleanup"`
- `completedCount?: number`
- `totalPlanned?: number`
- `percent?: number` — Estimated completion percentage (0-100).
- `inProgressCount?: number`
- `inProgressResources?: string[]`
- `waitingResources?: string[]`
- `changeCounts?: { created: number; updated: number; deleted: number }`

### Forward-compatibility

- Unknown `kind` values should be accepted by clients.
- Clients should ignore unknown fields.
