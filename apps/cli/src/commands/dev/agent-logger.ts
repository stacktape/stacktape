import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'fs-extra';
import { basename, dirname } from 'node:path';
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
  /**
   * On the first line of a file after a rotation: how many lines the log had before it, in this file's earlier copies.
   * A reader's cursor counts lines across rotations (see `readDevLogs` in the MCP dev tool).
   */
  lineOffset?: number;
};

/**
 * A file larger than this is moved to `<file>.1`, replacing the older copy: when the next session starts, and during a
 * session once its lines reach it. A noisy session that runs for days stays within twice this on disk, and a reader of
 * the log never loads more.
 */
export const AGENT_LOG_ROTATE_BYTES = 10 * 1024 * 1024;

let logFilePath: string | null = null;
let maskMessage: (text: string) => string = (text) => text;

/** Masks every message before it is written; dev mode masks its workloads' secret values with it. */
export const setAgentLogMasker = (mask: (text: string) => string) => {
  maskMessage = mask;
};

let fileBytes = 0;
let fileLines = 0;
let fileLineOffset = 0;

/** The `lineOffset` the first line of a log file carries; 0 for a file that was never rotated into. */
export const readLineOffset = (firstLine: string | undefined): number => {
  try {
    const { lineOffset } = JSON.parse(firstLine ?? '') as { lineOffset?: unknown };
    return typeof lineOffset === 'number' && lineOffset >= 0 ? lineOffset : 0;
  } catch {
    return 0;
  }
};

const rotate = (filePath: string) => {
  rmSync(`${filePath}.1`, { force: true });
  renameSync(filePath, `${filePath}.1`);
};

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

  fileBytes = 0;
  fileLines = 0;
  fileLineOffset = 0;
  try {
    const lines = readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim());
    fileBytes = statSync(filePath).size;
    fileLines = lines.length;
    fileLineOffset = readLineOffset(lines[0]);
    if (fileBytes > AGENT_LOG_ROTATE_BYTES) {
      rotate(filePath);
      fileLineOffset += fileLines;
      fileBytes = 0;
      fileLines = 0;
    }
  } catch {
    // No earlier file.
  }

  writeEntry({ ts: new Date().toISOString(), source: 'dev', level: 'info', msg: 'Dev session started', session });
};

const writeEntry = (entry: JsonlLogEntry) => {
  if (!logFilePath) return;
  try {
    const entries: JsonlLogEntry[] = [entry];
    if (fileBytes > 0 && fileBytes + JSON.stringify(entry).length + 1 > AGENT_LOG_ROTATE_BYTES) {
      rotate(logFilePath);
      fileLineOffset += fileLines;
      fileBytes = 0;
      fileLines = 0;
      const msg = `Earlier lines of this session are in ${basename(logFilePath)}.1`;
      entries.unshift({ ts: entry.ts, source: 'dev', level: 'info', msg });
    }
    // The first line of a file after a rotation carries the lines before it.
    if (fileLines === 0 && fileLineOffset > 0) entries[0] = { ...entries[0], lineOffset: fileLineOffset };
    const text = entries.map((item) => `${JSON.stringify(item)}\n`).join('');
    appendFileSync(logFilePath, text);
    fileBytes += Buffer.byteLength(text);
    fileLines += entries.length;
  } catch {
    // Ignore write errors
  }
};

/**
 * Log a message to the agent log file in JSONL format.
 * Each line is a valid JSON object for easy parsing. Terminal colors are removed and secret values masked.
 */
export const agentLog = (source: string, message: string, level: LogLevel = 'info', timestamp?: number) => {
  if (!logFilePath) return;
  writeEntry({
    ts: new Date(timestamp ?? Date.now()).toISOString(),
    source,
    level,
    msg: maskMessage(stripAnsi(message))
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
