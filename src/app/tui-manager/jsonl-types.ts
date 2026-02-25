/**
 * Stacktape JSONL Output Protocol
 *
 * Machine-readable event stream emitted in `--agent` mode (NDJSON).
 * Each stdout line is one `JsonlEvent`. The stream ends with exactly one `result` event.
 *
 * Copy these types into any consumer that needs to parse the output.
 */

export type JsonlLevel = 'info' | 'warn' | 'error';

export type JsonlStackAction = 'create' | 'update' | 'delete' | 'rollback';

/** Lifecycle status of a tracked operation. */
export type JsonlEventStatus = 'started' | 'running' | 'completed';

// ---------------------------------------------------------------------------
// Event detail — discriminated union by `kind`
// ---------------------------------------------------------------------------

/**
 * Structured metadata attached to an event.
 * Currently only used for CloudFormation progress updates.
 * Discriminated by the `kind` field — consumers should ignore unknown kinds.
 */
export type JsonlEventDetail = JsonlCloudFormationDetail;

/** CloudFormation stack operation progress. */
export type JsonlCloudFormationDetail = {
  kind: 'cloudformation-progress';
  stackAction: JsonlStackAction;
  status?: 'active' | 'cleanup';
  completedCount?: number;
  totalPlanned?: number;
  /** Estimated completion percentage (0-100). */
  percent?: number;
  inProgressCount?: number;
  inProgressResources?: string[];
  waitingResources?: string[];
  changeCounts?: {
    created: number;
    updated: number;
    deleted: number;
  };
};

// ---------------------------------------------------------------------------
// Data payload (shared by log and result events)
// ---------------------------------------------------------------------------

/**
 * When a payload exceeds the size guard or is unserializable, the emitter
 * replaces it with a truncation marker so consumers know data was present.
 */
export type JsonlTruncatedData = {
  truncated: true;
  reason: 'data_too_large' | 'data_unserializable';
  keys?: string[];
  size?: number;
};

export type JsonlData = Record<string, unknown> | JsonlTruncatedData;

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

/**
 * Tracked operation lifecycle event (start → update → finish).
 *
 * Every event belongs to a named operation (`eventType`) and carries a `status`
 * indicating where in the lifecycle it is. Related messages share the same
 * `eventType` (and `instanceId` when there are parallel instances).
 *
 * `detail` carries structured metadata when available (e.g. CloudFormation
 * resource counts during a DEPLOY phase update).
 */
export type JsonlEventEvent = {
  type: 'event';
  /** ISO-8601 timestamp of emission. */
  ts: string;
  /** High-level command phase: INITIALIZE, BUILD_AND_PACKAGE, UPLOAD, DEPLOY, SUMMARY, etc. */
  phase: string;
  /** Identifies which tracked operation this belongs to (e.g. LOAD_AWS_CREDENTIALS, BUILD_CODE, UPDATE_STACK). */
  eventType: string;
  /**
   * Lifecycle position:
   * - `started`: operation just began
   * - `running`: intermediate update (additional info, progress tick)
   * - `completed`: operation finished (success or failure)
   */
  status: JsonlEventStatus;
  /** Human-readable progress text (ANSI stripped). */
  message: string;
  /**
   * Disambiguates parallel instances of the same `eventType`.
   * Not always a workload name — can be a hook name, metadata task, container, etc.
   */
  instanceId?: string;
  /** Parent tracked operation (for nested events), if known. */
  parentEventType?: string;
  /** Parent instance identifier for nested hierarchies, if known. */
  parentInstanceId?: string;
  /** Structured metadata — discriminated by `kind`. */
  detail?: JsonlEventDetail;
};

/**
 * Informational, warning, or error log line.
 *
 * `data` is only populated for error logs (carries `{ hints: string[] }`).
 */
export type JsonlLogEvent = {
  type: 'log';
  /** ISO-8601 timestamp of emission. */
  ts: string;
  /** Log severity. */
  level: JsonlLevel;
  /** Logical source: "cli", "console", or a command-specific identifier. */
  source: string;
  /** Log message text (ANSI stripped). */
  message: string;
  /** Optional structured payload (e.g. error hints). */
  data?: JsonlData;
};

/**
 * Child-process output (script hooks, builds, etc.).
 *
 * Consumers that don't care about build output can ignore events where `type === 'output'`.
 * When `eventType` is present, the output belongs to that tracked operation.
 */
export type JsonlOutputEvent = {
  type: 'output';
  /** ISO-8601 timestamp. */
  ts: string;
  /** The tracked operation that produced this output, if known. */
  eventType?: string;
  /** Disambiguates parallel instances (same as on the parent event). */
  instanceId?: string;
  /** Parent tracked operation (for nested outputs), if known. */
  parentEventType?: string;
  /** Parent instance identifier for nested hierarchies, if known. */
  parentInstanceId?: string;
  /** Output lines (ANSI stripped). */
  lines: string[];
};

/**
 * Exactly one per CLI invocation — the final command outcome.
 *
 * `data` carries the command return value on success, or `{ errorId?, hints? }` on failure.
 */
export type JsonlResultEvent = {
  /** ISO-8601 timestamp. */
  ts: string;
  type: 'result';
  /** Whether the command succeeded. */
  ok: boolean;
  /** Stable result code for programmatic branching (e.g. "OK", "CONFIG_ERROR"). */
  code: string;
  /** Human-readable outcome summary. */
  message: string;
  /** Command result payload (success) or error details (failure). */
  data?: JsonlData;
};

/** Union of all JSONL event types. Discriminate on the `type` field. */
export type JsonlEvent = JsonlEventEvent | JsonlLogEvent | JsonlOutputEvent | JsonlResultEvent;
