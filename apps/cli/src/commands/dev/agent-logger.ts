import { appendFileSync, existsSync, mkdirSync, renameSync, rmSync, statSync } from 'fs-extra';
import { dirname } from 'node:path';
import stripAnsi from 'strip-ansi';

export type LogLevel = 'info' | 'warn' | 'error';

/**
 * JSONL log entry format.
 * LLMs can easily grep/filter these with standard tools:
 *   grep '"source":"myFunc"' logs.jsonl
 *   grep '"level":"error"' logs.jsonl
 *   tail -n 50 logs.jsonl | jq .
 *
 * `source` is a workload or database name, `dev` for dev mode's own lifecycle (rebuilds, file changes, dev stack
 * updates, dev box state), or `system`. `ts` is when the line was produced: for a deployed function, the CloudWatch
 * event time, not the time the CLI fetched it.
 */
type JsonlLogEntry = {
  ts: string; // ISO 8601 timestamp
  source: string;
  level: LogLevel;
  msg: string;
  /** Present on the first line of every session, which marks where the session's lines start. */
  session?: Record<string, unknown>;
};

/** A file larger than this is moved to `<file>.1` when the next session starts, replacing the older copy. */
export const AGENT_LOG_ROTATE_BYTES = 10 * 1024 * 1024;

let logFilePath: string | null = null;

/**
 * Initialize the agent logger with a file path. Sessions on the same port append to the same file, so a restart keeps
 * the previous session's lines; each session starts with a marker line. A file over the size limit is rotated first.
 */
export const initAgentLogger = (filePath: string, session: Record<string, unknown> = {}) => {
  logFilePath = filePath;

  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  try {
    if (statSync(filePath).size > AGENT_LOG_ROTATE_BYTES) {
      rmSync(`${filePath}.1`, { force: true });
      renameSync(filePath, `${filePath}.1`);
    }
  } catch {
    // No earlier file.
  }

  writeEntry({ ts: new Date().toISOString(), source: 'dev', level: 'info', msg: 'Dev session started', session });
};

const writeEntry = (entry: JsonlLogEntry) => {
  if (!logFilePath) return;
  try {
    appendFileSync(logFilePath, `${JSON.stringify(entry)}\n`);
  } catch {
    // Ignore write errors
  }
};

/**
 * Log a message to the agent log file in JSONL format.
 * Each line is a valid JSON object for easy parsing. Terminal colors are removed.
 */
export const agentLog = (source: string, message: string, level: LogLevel = 'info', timestamp?: number) => {
  if (!logFilePath) return;
  writeEntry({
    ts: new Date(timestamp ?? Date.now()).toISOString(),
    source,
    level,
    msg: stripAnsi(message)
  });
};

/**
 * Get the current log file path.
 */
export const getAgentLogFilePath = (): string | null => {
  return logFilePath;
};

/**
 * Stop the agent logger.
 */
export const stopAgentLogger = () => {
  writeEntry({ ts: new Date().toISOString(), source: 'dev', level: 'info', msg: 'Dev session stopped' });
  logFilePath = null;
};
